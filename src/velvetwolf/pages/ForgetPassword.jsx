// ForgetPassword.jsx
// ─── FIX: Import AppContext from shared file ──────────────────────────────────
import { useState, useContext } from "react";
import { AppContext } from "./AppContext";
import { supabase } from "../utils/supabase";
import { AuthOtpStep } from "../components/AuthOtpStep";
import { apiUrl } from "../utils/api";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
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
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: step === i + 1 ? "var(--gold)" : "var(--silver)", whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < 2 && <div style={{ width: 36, height: 1, background: step > i + 1 ? "var(--gold)" : "var(--smoke)", margin: "11px 6px 0", transition: "background 0.3s" }}/>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FORGET PASSWORD COMPONENT
// ═══════════════════════════════════════════════════════
export function ForgetPassword() {
  const { setPage, showToast } = useContext(AppContext);

  const [step, setStep]               = useState(1);
  const [email, setEmailVal]          = useState("");
  const [otp, setOtp]                 = useState(["", "", "", "", "", ""]);
  const [passwords, setPasswords]     = useState({ new: "", confirm: "" });
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const strength = strengthScore(passwords.new);
  const pwMatch   = passwords.confirm && passwords.confirm === passwords.new;
  const pwNoMatch = passwords.confirm && passwords.confirm !== passwords.new;

  // ── Step 1: Send OTP reset email via Supabase ─────────────────────────────
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
      
      if (!res.ok) {
        const data = await res.json();
        if (data.error && data.error.includes("not registered")) {
          // showToast("User is not registered, complete the registration", "error");
          setError("User is not registered, complete the registration");
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Request failed");
      }
      
      const data = await res.json();
      showToast(data.message || "Reset code sent ✓");
      setStep(2);
      startResendTimer();
    } catch (err) {
      setError(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify the OTP Supabase emailed ───────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the complete 6-digit code."); return; }
    setError("");
    setLoading(true);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: code,
        type:  "recovery",
      });
      if (verifyErr) throw verifyErr;
      // After OTP verification, Supabase issues a session for password update
      setStep(3);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("invalid") || msg.includes("expired") || msg.includes("Token has expired")) {
        setError("Invalid or expired code. Request a new one.");
      } else {
        setError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Set new password (user now has a recovery session) ────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (passwords.new.length < 8)               { setError("Password must be at least 8 characters."); return; }
    if (strength < 2)                            { setError("Password is too weak — add uppercase letters or numbers."); return; }
    if (passwords.new !== passwords.confirm)     { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: passwords.new,
      });
      if (updateErr) throw updateErr;
      showToast("Password reset successfully! ✓");
      setStep(4);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("same password") || msg.includes("should be different")) {
        setError("New password must be different from your current password.");
      } else if (msg.includes("session")) {
        setError("Your reset session expired. Please start over.");
        setTimeout(() => setStep(1), 2000);
      } else {
        setError(msg || "Password reset failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    // Clear previous OTP
    setOtp(["", "", "", "", "", ""]);
    
    try {
      const res = await fetch(apiUrl("/auth/resend-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), kind: "forgot" })
      });
      
      if (!res.ok) {
        const data = await res.json();
        if (data.error && data.error.includes("not registered")) {
          showToast("User is not registered, complete the registration", "error");
          return;
        }
        throw new Error(data.error || "Resend failed");
      }
      
      showToast("Reset code resent ✓");
      startResendTimer();
    } catch (err) {
      console.warn("Resend failed:", err.message);
      // Silent fail - timer already reset
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const t = setInterval(() => setResendTimer(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; }), 1000);
  };

  // ── OTP helpers ───────────────────────────────────────────────────────────
  const handleOtpChange = (i, v) => {
    const val = v.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) document.getElementById(`otp-fp-${i + 1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`otp-fp-${i - 1}`)?.focus();
  };
  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length === 6) setOtp(p.split(""));
    e.preventDefault();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--obsidian)", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 60px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 500, height: 300, background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)", pointerEvents: "none" }}/>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div onClick={() => setPage("home")} style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--obsidian)" }}>VW</span>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 6, color: "var(--ivory)", lineHeight: 1 }}>VELVETWOLF</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", opacity: 0.7 }}>LUXURY STREETWEAR</div>
            </div>
          </div>
        </div>

        {step < 4 && <StepBar step={step} />}

        <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "34px 32px" }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                  <div style={{ width: 14, height: 1, background: "var(--gold)" }}/>ACCOUNT RECOVERY<div style={{ width: 14, height: 1, background: "var(--gold)" }}/>
                </div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 4, color: "var(--ivory)", margin: "0 0 8px", lineHeight: 1 }}>FORGOT PASSWORD?</h1>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", lineHeight: 1.7 }}>Enter your registered email — we'll send a reset code.</p>
              </div>
              {error && <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 16, letterSpacing: 0.5 }}>✕ {error}</div>}
              <form onSubmit={handleRequestOtp}>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>EMAIL ADDRESS</label>
                  <input className="input-dark" type="email" placeholder="you@email.com" value={email} onChange={e => { setEmailVal(e.target.value); setError(""); }} autoComplete="email" disabled={loading}/>
                </div>
                <button type="submit" className="btn-gold" disabled={loading} style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "SENDING..." : "SEND RESET CODE →"}
                </button>
              </form>
              <div style={{ marginTop: 20, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)" }}>
                Remembered it?{" "}<button type="button" onClick={() => setPage("login")} style={{ all: "unset", cursor: "pointer", color: "var(--gold)" }}>SIGN IN</button>
              </div>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
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
                submitLabel="VERIFY CODE →"
                loadingLabel="VERIFYING..."
                idPrefix="otp-fp"
              />
              {false && (
                <>
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 4, color: "var(--ivory)", marginBottom: 8 }}>ENTER RESET CODE</h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", lineHeight: 1.7 }}>
                  Code sent to<br/><span style={{ color: "var(--ivory)" }}>{email}</span><br/><span style={{ fontSize: 9, opacity: 0.7 }}>Expires in 10 minutes</span>
                </p>
              </div>
              {error && <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 16, textAlign: "center", letterSpacing: 0.5 }}>✕ {error}</div>}
              <form onSubmit={handleVerifyOtp}>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }} onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} id={`otp-fp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      style={{ width: 44, height: 52, textAlign: "center", background: "var(--graphite)", border: `1px solid ${digit ? "var(--gold)" : "var(--smoke)"}`, color: "var(--ivory)", fontFamily: "var(--font-display)", fontSize: 24, outline: "none", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor = "var(--gold)"}
                      onBlur={e => e.target.style.borderColor = digit ? "var(--gold)" : "var(--smoke)"}
                    />
                  ))}
                </div>
                <button type="submit" className="btn-gold" disabled={loading || otp.join("").length < 6} style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4, opacity: otp.join("").length < 6 ? 0.45 : loading ? 0.7 : 1, cursor: otp.join("").length < 6 ? "not-allowed" : "pointer" }}>
                  {loading ? "VERIFYING..." : "VERIFY CODE →"}
                </button>
              </form>
              <div style={{ textAlign: "center", marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)" }}>
                <button type="button" onClick={handleResend} disabled={resendTimer > 0} style={{ all: "unset", cursor: resendTimer > 0 ? "default" : "pointer", color: resendTimer > 0 ? "var(--silver)" : "var(--gold)" }}>
                  {resendTimer > 0 ? `RESEND IN ${resendTimer}s` : "RESEND CODE"}
                </button>
              </div>
                </>
              )}
            </>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                  <div style={{ width: 14, height: 1, background: "var(--gold)" }}/>ALMOST DONE<div style={{ width: 14, height: 1, background: "var(--gold)" }}/>
                </div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: 4, color: "var(--ivory)", margin: "0 0 6px", lineHeight: 1 }}>NEW PASSWORD</h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)" }}>Choose a strong password you haven't used before.</p>
              </div>
              {error && <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 16, letterSpacing: 0.5 }}>✕ {error}</div>}
              <form onSubmit={handleReset}>
                <div style={{ marginBottom: 13 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>NEW PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input className="input-dark" type={showNew ? "text" : "password"} placeholder="Min. 8 characters" value={passwords.new} onChange={e => { setPasswords(p => ({ ...p, new: e.target.value })); setError(""); }} style={{ paddingRight: 44 }} autoComplete="new-password" disabled={loading}/>
                    <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--silver)", display: "flex", alignItems: "center" }}><EyeIcon visible={showNew}/></button>
                  </div>
                  {passwords.new && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                      <div style={{ display: "flex", gap: 3, flex: 1 }}>
                        {[1,2,3,4].map(n => <div key={n} style={{ flex: 1, height: 2, background: n <= strength ? STRENGTH_COLOR[strength] : "var(--smoke)", transition: "background 0.3s" }}/>)}
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</span>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>CONFIRM NEW PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input className="input-dark" type={showConfirm ? "text" : "password"} placeholder="Repeat new password" value={passwords.confirm} onChange={e => { setPasswords(p => ({ ...p, confirm: e.target.value })); setError(""); }} style={{ paddingRight: 44, borderColor: pwNoMatch ? "rgba(192,57,43,0.5)" : undefined }} autoComplete="new-password" disabled={loading}/>
                    <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--silver)", display: "flex", alignItems: "center" }}><EyeIcon visible={showConfirm}/></button>
                  </div>
                  {pwNoMatch && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#e07070", marginTop: 5 }}>Passwords do not match</p>}
                  {pwMatch   && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#5db87a", marginTop: 5 }}>✓ Passwords match</p>}
                </div>
                <button type="submit" className="btn-gold" disabled={loading} style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "RESETTING..." : "RESET PASSWORD →"}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 4 — Success ── */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 18px", background: "rgba(93,184,122,0.12)", border: "1px solid rgba(93,184,122,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#5db87a" }}>✓</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: 4, color: "var(--ivory)", marginBottom: 10 }}>PASSWORD RESET!</h2>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", lineHeight: 1.8, marginBottom: 28 }}>
                Your password has been updated.<br/>You can now sign in with your new password.
              </p>
              <button type="button" className="btn-gold" onClick={() => setPage("login")} style={{ padding: "14px 36px", fontSize: 14, letterSpacing: 4 }}>
                SIGN IN →
              </button>
            </div>
          )}

        </div>

        {/* {step < 4 && (
          <p style={{ textAlign: "center", marginTop: 18, fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", opacity: 0.5 }}>
            🔒 256-BIT SSL · POWERED BY SUPABASE
          </p>
        )} */}
      </div>
    </div>
  );
}
