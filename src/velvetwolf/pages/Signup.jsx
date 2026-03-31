// Signup.jsx
// ─── FIX: Import AppContext from shared file ──────────────────────────────────
import { useState, useContext, useEffect } from "react";
import { AppContext } from "./AppContext";
import { supabase } from "../utils/supabase";
import { AuthOtpStep } from "../components/AuthOtpStep";
import { apiUrl, googleAuthUrl } from "../utils/api";

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

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

// ═══════════════════════════════════════════════════════
// SIGNUP COMPONENT
// ═══════════════════════════════════════════════════════
export function Signup() {
  const { user, setPage, setUser, showToast } = useContext(AppContext);

  const [step, setStep]               = useState(1);  // 1 = details, 2 = OTP verify
  const [form, setForm]               = useState({ name: "", email: "", password: "", confirm: "" });
  const [otp, setOtp]                 = useState(["", "", "", "", "", ""]);
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [agree, setAgree]             = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const update   = (k, v) => { 
    if (k === "name") {
      v = v.replace(/[^a-zA-Z\s]/g, "");
    }
    setForm(p => ({ ...p, [k]: v })); 
    setError(""); 
  };
  const strength = strengthScore(form.password);
  const pwMatch  = form.confirm && form.confirm === form.password;
  const pwNoMatch = form.confirm && form.confirm !== form.password;

  useEffect(() => {
    if (user) {
      setPage("home");
    }
  }, [user, setPage]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validateDetails = () => {
    if (!form.name.trim())                     { setError("Please enter your full name."); return false; }
    if (!form.email.trim())                    { setError("Please enter your email address."); return false; }
    if (!form.email.includes("@"))             { setError("Please enter a valid email address."); return false; }
    if (form.password.length < 8)              { setError("Password must be at least 8 characters."); return false; }
    if (strength < 2)                          { setError("Password is too weak — add uppercase letters or numbers."); return false; }
    if (form.password !== form.confirm)        { setError("Passwords do not match."); return false; }
    if (!agree)                                { setError("Please accept the Terms & Privacy Policy to continue."); return false; }
    return true;
  };

  // ── Step 1: Sign up with backend → triggers OTP confirmation email ───────
  const handleSubmitDetails = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateDetails()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/signup"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password
        })
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error && data.error.includes("already exists")) {
          setError(data.error);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Request failed");
      }
      const data = await res.json();
      if (data.message) {
        setStep(2);
      }
      startResendTimer();
    } catch (err) {
      const data = err;  
      if (!data || typeof data !== 'object') {
        setError("Network error. Please try again.");
        return;
      }
      const msg = data.error || data.message || "";
      if (msg.includes("not registered") || msg.includes("not registered")) {
        setError("An account with this email already exists. Try signing in.");
      } else if (msg.includes("over_email_send_rate_limit") || msg.includes("Too many")) {
        setError("Too many requests. Please wait a few minutes and try again.");
      } else {
        setError(msg || "Failed to create account. Please try again.");
      }
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
      // const { error: verifyErr } = await supabase.auth.verifyOtp({
      //   email: form.email.toLowerCase().trim(),
      //   token: code,
      //   type:  "signup",
      // });
      const res = await fetch(apiUrl("/auth/verify-otp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: form.email,
          otp: code,
          type:  "signup"
        })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        
        // Sync with Supabase session for App.jsx context
        const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: form.email.toLowerCase().trim(),
          password: form.password
        });
        
        if (signInErr) {
          console.warn("Supabase sync failed, but backend auth succeeded:", signInErr.message);
          setUser({
            id: data.user?.id,
            email: form.email.toLowerCase().trim(),
            name: form.name,
            full_name: form.name,
          });
        } else if (authData?.user) {
          const backendUser = data.user || {};
          setUser({
            ...backendUser,
            ...authData.user,
            id: backendUser.id,
            auth_user_id: authData.user.id,
            name: form.name,
            full_name: authData.user.user_metadata?.full_name || form.name,
          });
        }
        
        showToast("Account created! Welcome to the pack ◆");
        setPage("account"); // SPA navigation
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("invalid") || msg.includes("expired") || msg.includes("Token has expired")) {
        setError("Invalid or expired code. Please request a new one.");
      } else {
        setError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    // Clear previous OTP
    setOtp(["", "", "", "", "", ""]);
    
    try {
      const res = await fetch(apiUrl("/auth/resend-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, kind: "signup" })
      });
      const data = await res.json();
      if (data.message) {
        showToast("New code sent ✓");
        startResendTimer();
      } else {
        throw new Error(data.error || "Resend failed");
      }
    } catch (err) {
      setError(err.message || "Could not resend code. Please try again.");
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const t = setInterval(() => setResendTimer(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; }), 1000);
  };

  // ── OTP input helpers ─────────────────────────────────────────────────────
  const handleOtpChange = (i, v) => {
    const val = v.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) document.getElementById(`otp-su-${i + 1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`otp-su-${i - 1}`)?.focus();
  };
  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length === 6) setOtp(p.split(""));
    e.preventDefault();
  };

  const handleGoogle = async () => {
    setError("");
    window.location.href = googleAuthUrl("signup");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--obsidian)", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 60px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 500, height: 300, background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)", pointerEvents: "none" }}/>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div onClick={() => setPage("home")} style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/vw-logo.png" alt="VelvetWolf logo" style={{ width: 60, height: 60, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 6, color: "var(--ivory)", lineHeight: 1 }}>VELVETWOLF</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: 4, color: "var(--gold)", opacity: 0.7 }}>LUXURY STREETWEAR</div>
            </div>
          </div>
        </div>

        {/* Step bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 24 }}>
          {["CREATE ACCOUNT", "VERIFY EMAIL"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${step > i + 1 ? "var(--gold)" : step === i + 1 ? "var(--gold)" : "var(--smoke)"}`, background: step > i + 1 ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, color: step > i + 1 ? "var(--obsidian)" : step === i + 1 ? "var(--gold)" : "var(--silver)", transition: "all 0.3s" }}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: 2, color: step === i + 1 ? "var(--gold)" : "var(--silver)", whiteSpace: "nowrap" }}>{label}</span>
              </div>
              {i === 0 && <div style={{ width: 40, height: 1, background: step > 1 ? "var(--gold)" : "var(--smoke)", margin: "0 8px 12px", transition: "background 0.3s" }}/>}
            </div>
          ))}
        </div>

        <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "34px 32px" }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 5, color: "var(--gold)", marginBottom: 6 }}>
                  <div style={{ width: 14, height: 1, background: "var(--gold)" }}/>JOIN THE PACK<div style={{ width: 14, height: 1, background: "var(--gold)" }}/>
                </div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 4, color: "var(--ivory)", margin: 0, lineHeight: 1 }}>CREATE ACCOUNT</h1>
              </div>

              {error && <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 16, letterSpacing: 0.5 }}>✕ {error}</div>}

              <button type="button" onClick={handleGoogle} style={{ width: "100%", background: "transparent", border: "1px solid var(--smoke)", color: "var(--ash)", padding: "12px", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, transition: "all 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.color = "var(--ash)"; }}>
                <GoogleIcon/> SIGN UP WITH GOOGLE
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "var(--smoke)" }}/><span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 3, color: "var(--silver)" }}>OR</span><div style={{ flex: 1, height: 1, background: "var(--smoke)" }}/>
              </div>

              <form onSubmit={handleSubmitDetails} noValidate>
                {[
                  { label: "FULL NAME",       key: "name",    type: "text",     placeholder: "Your full name",  ac: "name" },
                  { label: "EMAIL ADDRESS",   key: "email",   type: "email",    placeholder: "you@email.com",   ac: "email" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 13 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>{f.label}</label>
                    <input className="input-dark" type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => update(f.key, e.target.value)} autoComplete={f.ac} disabled={loading}/>
                  </div>
                ))}

                {/* Password + strength */}
                <div style={{ marginBottom: 13 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input className="input-dark" type={showPw ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={e => update("password", e.target.value)} style={{ paddingRight: 44 }} autoComplete="new-password" disabled={loading}/>
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--silver)", display: "flex", alignItems: "center" }}><EyeIcon visible={showPw}/></button>
                  </div>
                  {form.password && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                      <div style={{ display: "flex", gap: 3, flex: 1 }}>
                        {[1,2,3,4].map(n => <div key={n} style={{ flex: 1, height: 2, background: n <= strength ? STRENGTH_COLOR[strength] : "var(--smoke)", transition: "background 0.3s" }}/>)}
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>CONFIRM PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input className="input-dark" type={showConfirm ? "text" : "password"} placeholder="Repeat password" value={form.confirm} onChange={e => update("confirm", e.target.value)} style={{ paddingRight: 44, borderColor: pwNoMatch ? "rgba(192,57,43,0.5)" : undefined }} autoComplete="new-password" disabled={loading}/>
                    <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--silver)", display: "flex", alignItems: "center" }}><EyeIcon visible={showConfirm}/></button>
                  </div>
                  {pwNoMatch && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#e07070", marginTop: 5 }}>Passwords do not match</p>}
                  {pwMatch   && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#5db87a", marginTop: 5 }}>✓ Passwords match</p>}
                </div>

                {/* Terms */}
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
                  <div onClick={() => setAgree(v => !v)} style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2, cursor: "pointer", border: `1px solid ${agree ? "var(--gold)" : "var(--smoke)"}`, background: agree ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {agree && <span style={{ color: "var(--obsidian)", fontSize: 9, fontWeight: "bold" }}>✓</span>}
                  </div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", margin: 0, lineHeight: 1.6 }}>
                    I agree to VelvetWolf's{" "}
                    <button type="button" onClick={() => setPage("termspage")} style={{ all: "unset", cursor: "pointer", color: "var(--gold)" }}>Terms</button>
                    {" & "}
                    <button type="button" onClick={() => setPage("privacypolicy")} style={{ all: "unset", cursor: "pointer", color: "var(--gold)" }}>Privacy Policy</button>
                  </p>
                </div>

                <button type="submit" className="btn-gold" disabled={loading} style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "SENDING CODE..." : "CREATE ACCOUNT →"}
                </button>
              </form>

              <div style={{ marginTop: 20, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)" }}>
                Already have an account?{" "}
                <button type="button" onClick={() => setPage("login")} style={{ all: "unset", cursor: "pointer", color: "var(--gold)" }}>SIGN IN</button>
              </div>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              <AuthOtpStep
                title="CHECK YOUR EMAIL"
                email={form.email}
                error={error}
                otp={otp}
                loading={loading}
                resendTimer={resendTimer}
                onSubmit={handleVerifyOtp}
                onOtpChange={handleOtpChange}
                onOtpKeyDown={handleOtpKeyDown}
                onOtpPaste={handleOtpPaste}
                onResend={handleResend}
                onBack={() => { setStep(1); setError(""); setOtp(["","","","","",""]); }}
                submitLabel="VERIFY & CONTINUE →"
                loadingLabel="VERIFYING..."
                idPrefix="otp-su"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}




