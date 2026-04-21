import { useState, useContext, useEffect } from "react";
import { AppContext } from "./AppContext";
import { AuthOtpStep } from "../components/AuthOtpStep";
import Navbar from "../components/Navbar";
import { apiUrl } from "../utils/api";

function strengthScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH_LABEL = ["", "WEAK", "FAIR", "GOOD", "STRONG"];
const STRENGTH_COLOR = ["", "#c0504d", "#c87941", "#c9a84c", "#5db87a"];

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function StepBar({ step }) {
  const steps = ["EMAIL", "VERIFY", "RESET"];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", marginBottom: 24 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${step > i + 1 ? "var(--gold)" : step === i + 1 ? "var(--gold)" : "var(--smoke)"}`, background: step > i + 1 ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, color: step > i + 1 ? "var(--obsidian)" : step === i + 1 ? "var(--gold)" : "var(--silver)", transition: "all 0.3s" }}>
              {step > i + 1 ? "?" : i + 1}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: step === i + 1 ? "var(--gold)" : "var(--silver)", whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < 2 && <div style={{ width: 36, height: 1, background: step > i + 1 ? "var(--gold)" : "var(--smoke)", margin: "11px 6px 0", transition: "background 0.3s" }} />}
        </div>
      ))}
    </div>
  );
}

export function ForgetPassword() {
  const { setPage, showToast } = useContext(AppContext);

  const [step, setStep] = useState(1);
  const [email, setEmailVal] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [resetToken, setResetToken] = useState("");

  const strength = strengthScore(passwords.new);
  const pwMatch = passwords.confirm && passwords.confirm === passwords.new;
  const pwNoMatch = passwords.confirm && passwords.confirm !== passwords.new;

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get("reset_token");
    if (!token) return;

    setResetToken(token);
    setStep(3);
    setError("");

    query.delete("reset_token");
    const nextQuery = query.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data.error || "";
        if (message.includes("not registered")) {
          setError("User is not registered, complete the registration");
        } else if (res.status >= 500) {
          setError("The server is unavailable right now. Please try again in a moment.");
        } else {
          setError(message || "Failed to send reset code. Please try again.");
        }
        return;
      }

      showToast(data.message || "Reset code sent ?");
      setStep(2);
      startResendTimer();
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the complete 6-digit code."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: code,
          type: "forgot",
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      if (!data.resetToken) {
        throw new Error("Reset session could not be created. Please request a new code.");
      }

      setResetToken(data.resetToken);
      setStep(3);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("invalid") || msg.includes("expired") || msg.includes("Invalid")) {
        setError("Invalid or expired code. Request a new one.");
      } else {
        setError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (passwords.new.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (strength < 2) { setError("Password is too weak - add uppercase letters or numbers."); return; }
    if (passwords.new !== passwords.confirm) { setError("Passwords do not match."); return; }
    if (!resetToken) { setError("Your reset session expired. Please start over."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword: passwords.new })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed. Please try again.");
      }

      showToast(data.message || "Password reset successfully! ?");
      setStep(4);
      setResetToken("");
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("expired")) {
        setError("Your reset session expired. Please start over.");
        setTimeout(() => setStep(1), 2000);
      } else {
        setError(msg || "Password reset failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    try {
      const res = await fetch(apiUrl("/auth/resend-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), kind: "forgot" })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if ((data.error || "").includes("not registered")) {
          setError("User is not registered, complete the registration");
          return;
        }
        throw new Error(data.error || "Resend failed");
      }

      showToast("Reset code resent ?");
      startResendTimer();
    } catch (err) {
      setError(err.message || "Could not resend code. Please try again.");
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const t = setInterval(() => setResendTimer((s) => {
      if (s <= 1) {
        clearInterval(t);
        return 0;
      }
      return s - 1;
    }), 1000);
  };

  const handleOtpChange = (i, v) => {
    const val = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) document.getElementById(`otp-fp-${i + 1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`otp-fp-${i - 1}`)?.focus();
  };
  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) setOtp(pasted.split(""));
    e.preventDefault();
  };

  return (
    <>
      <Navbar activePage="" onNavigate={setPage} />
      <div style={{ minHeight: "100vh", background: "var(--obsidian)", display: "flex", alignItems: "center", justifyContent: "center", padding: "110px 20px 60px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 500, height: 300, background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div onClick={() => setPage("home")} style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src="/vw-logo.png" alt="VelvetWolf logo" style={{ width: 30, height: 30, objectFit: "contain" }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 6, color: "var(--ivory)", lineHeight: 1 }}>VELVETWOLF</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", opacity: 0.7 }}>LUXURY STREETWEAR</div>
              </div>
            </div>
          </div>

          {step < 4 && <StepBar step={step} />}

          <div className="vw-auth-card" style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "34px 32px" }}>
            {step === 1 && (
              <>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                    <div style={{ width: 14, height: 1, background: "var(--gold)" }} />ACCOUNT RECOVERY<div style={{ width: 14, height: 1, background: "var(--gold)" }} />
                  </div>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 3, color: "var(--ivory)", margin: "0 0 8px", lineHeight: 1 }}>FORGOT PASSWORD?</h1>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", lineHeight: 1.7 }}>Enter your registered email - we&apos;ll send a reset code.</p>
                </div>
                {error && <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 16, letterSpacing: 0.5 }}>� {error}</div>}
                <form onSubmit={handleRequestOtp}>
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>EMAIL ADDRESS</label>
                    <input className="input-dark" type="email" placeholder="you@email.com" value={email} onChange={(e) => { setEmailVal(e.target.value); setError(""); }} autoComplete="email" disabled={loading} />
                  </div>
                  <button type="submit" className="btn-gold" disabled={loading} style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "SENDING..." : "SEND RESET CODE ?"}
                  </button>
                </form>
                <div style={{ marginTop: 20, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)" }}>
                  Remembered it? <button type="button" onClick={() => setPage("login")} style={{ all: "unset", cursor: "pointer", color: "var(--gold)" }}>SIGN IN</button>
                </div>
              </>
            )}

            {step === 2 && (
              <AuthOtpStep
                title="ENTER RESET CODE"
                email={email}
                error={error}
                otp={otp}
                loading={loading}
                resendTimer={resendTimer}
                onSubmit={handleVerifyOtp}
                onOtpChange={handleOtpChange}
                onOtpKeyDown={handleOtpKeyDown}
                onOtpPaste={handleOtpPaste}
                onResend={handleResend}
                submitLabel="VERIFY CODE ?"
                loadingLabel="VERIFYING..."
                idPrefix="otp-fp"
              />
            )}

            {step === 3 && (
              <>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                    <div style={{ width: 14, height: 1, background: "var(--gold)" }} />ALMOST DONE<div style={{ width: 14, height: 1, background: "var(--gold)" }} />
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 4, color: "var(--ivory)", margin: "0 0 6px", lineHeight: 1 }}>NEW PASSWORD</h2>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)" }}>Choose a strong password you haven&apos;t used before.</p>
                </div>
                {error && <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 16, letterSpacing: 0.5 }}>� {error}</div>}
                <form onSubmit={handleReset}>
                  <div style={{ marginBottom: 13 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>NEW PASSWORD</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-dark" type={showNew ? "text" : "password"} placeholder="Min. 8 characters" value={passwords.new} onChange={(e) => { setPasswords((p) => ({ ...p, new: e.target.value })); setError(""); }} style={{ paddingRight: 44 }} autoComplete="new-password" disabled={loading} />
                      <button type="button" onClick={() => setShowNew((v) => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--silver)", display: "flex", alignItems: "center" }}><EyeIcon visible={showNew} /></button>
                    </div>
                    {passwords.new && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                        <div style={{ display: "flex", gap: 3, flex: 1 }}>
                          {[1, 2, 3, 4].map((n) => <div key={n} style={{ flex: 1, height: 2, background: n <= strength ? STRENGTH_COLOR[strength] : "var(--smoke)", transition: "background 0.3s" }} />)}
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>CONFIRM NEW PASSWORD</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-dark" type={showConfirm ? "text" : "password"} placeholder="Repeat new password" value={passwords.confirm} onChange={(e) => { setPasswords((p) => ({ ...p, confirm: e.target.value })); setError(""); }} style={{ paddingRight: 44, borderColor: pwNoMatch ? "rgba(192,57,43,0.5)" : undefined }} autoComplete="new-password" disabled={loading} />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--silver)", display: "flex", alignItems: "center" }}><EyeIcon visible={showConfirm} /></button>
                    </div>
                    {pwNoMatch && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#e07070", marginTop: 5 }}>Passwords do not match</p>}
                    {pwMatch && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#5db87a", marginTop: 5 }}>? Passwords match</p>}
                  </div>
                  <button type="submit" className="btn-gold" disabled={loading} style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "RESETTING..." : "RESET PASSWORD ?"}
                  </button>
                </form>
              </>
            )}

            {step === 4 && (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 18px", background: "rgba(93,184,122,0.12)", border: "1px solid rgba(93,184,122,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#5db87a" }}>?</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 4, color: "var(--ivory)", marginBottom: 10 }}>PASSWORD RESET!</h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", lineHeight: 1.8, marginBottom: 28 }}>
                  Your password has been updated.<br />You can now sign in with your new password.
                </p>
                <button type="button" className="btn-gold" onClick={() => setPage("login")} style={{ padding: "14px 36px", fontSize: 14, letterSpacing: 4 }}>
                  SIGN IN ?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
