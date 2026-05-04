import { useState, useContext, useEffect } from "react";
import { AppContext } from "./AppContext";
import { AuthOtpStep } from "../components/AuthOtpStep";
import Navbar from "../components/Navbar";
import { apiUrl, googleAuthUrl } from "../utils/api";

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

export function Login() {
  const { user, setPage, setUser, showToast } = useContext(AppContext);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [pendingUser, setPendingUser] = useState(null);

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError("");
  };

  const checks = {
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
    length: form.password.length >= 8,
  };

  const strengthScore = Object.values(checks).filter(Boolean).length;

  const getStrength = () => {
    if (strengthScore <= 2) return "Weak";
    if (strengthScore <= 4) return "Medium";
    return "Strong";
  };

  const getColor = () => {
    if (strengthScore <= 2) return "red";
    if (strengthScore <= 4) return "orange";
    return "green";
  };

  useEffect(() => {
    if (user) {
      setPage("account");
    }
  }, [user, setPage]);

  const validate = () => {
    if (!form.email.trim()) { setError("Please enter your email address."); return false; }
    if (!form.email.includes("@")) { setError("Please enter a valid email address."); return false; }
    if (!form.password) { setError("Please enter your password."); return false; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return false; }
    return true;
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer(current => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "";
        if (msg.includes("User not registered") || msg.includes("not registered")) {
          showToast("User is not registered, complete the registration", "error");
          setError("User not found. Please sign up first.");
        } else if (msg.includes("Incorrect email or password")) {
          setError("Incorrect email or password. Please try again.");
        } else {
          setError(msg || "Login failed. Please try again.");
        }
        return;
      }

      if (data.requiresOtp || data.message) {
        setPendingUser(data.user || null);
        setStep(2);
        setOtp(["", "", "", "", "", ""]);
        startResendTimer();
        showToast("OTP sent to your email");
        return;
      }

      if (data.token && !data.requiresOtp) {
        setError("OTP login is enabled in the frontend, but the backend is still returning the old login response. Please restart the backend server and try again.");
        return;
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = async (data) => {
    localStorage.setItem("token", data.token);
    const backendUser = data.user || pendingUser || {};
    const nextUser = {
      ...backendUser,
      email: backendUser.email || form.email.toLowerCase().trim(),
      name: backendUser.name || backendUser.full_name || form.email.split("@")[0],
      full_name: backendUser.full_name || backendUser.name,
      role: backendUser.role || "customer",
      isAdmin: (backendUser.role || "customer") === "admin",
      authSource: "backend",
    };

    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);

    const name = data.user?.name || pendingUser?.name;
    showToast(`Successfully logged in${name ? `, welcome back ${name}!` : ", welcome back wolf!"}`);
    setPage("account");
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          otp: code,
          type: "login",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      if (data.token) {
        await finalizeLogin(data);
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("invalid") || msg.includes("expired") || msg.includes("Invalid")) {
        setError("Invalid or expired code. Please request a new one.");
      } else {
        setError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setOtp(["", "", "", "", "", ""]);
    setError("");

    try {
      const res = await fetch(apiUrl("/auth/resend-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.toLowerCase().trim(), kind: "login" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Resend failed");
      }

      showToast("New code sent");
      startResendTimer();
    } catch (err) {
      setError(err.message || "Could not resend code. Please try again.");
    }
  };

  const handleOtpChange = (index, value) => {
    const nextDigit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = nextDigit;
    setOtp(nextOtp);

    if (nextDigit && index < 5) {
      document.getElementById(`otp-li-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-li-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
    }
    e.preventDefault();
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    window.location.replace(googleAuthUrl("login"));
  };

  return (
    <>
    <Navbar activePage="" onNavigate={setPage} />
    <div style={{
      minHeight: "100vh",
      background: "var(--obsidian)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "110px 20px 60px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 500,
        height: 300,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }}/>
      <div style={{ position: "absolute", top: "10%", right: "8%", width: 260, height: 260, border: "1px solid rgba(201,168,76,0.07)", transform: "rotate(45deg)", pointerEvents: "none", animation: "float 6s ease-in-out infinite" }}/>
      <div style={{ position: "absolute", bottom: "12%", left: "6%", width: 140, height: 140, border: "1px solid rgba(201,168,76,0.07)", transform: "rotate(20deg)", pointerEvents: "none", animation: "float 4s ease-in-out infinite reverse" }}/>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div onClick={() => setPage("home")} style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/vw-logo.png" alt="VelvetWolf logo" style={{ width: 30, height: 30, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 6, color: "var(--ivory)", lineHeight: 1 }}>VELVETWOLF</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", opacity: 0.7 }}>LUXURY STREETWEAR</div>
            </div>
          </div>
        </div>

        <div className="vw-auth-card" style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "36px 32px" }}>
          {step === 1 && (
            <>
              <div style={{ marginBottom: 26 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                  <div style={{ width: 16, height: 1, background: "var(--gold)" }}/>WELCOME BACK<div style={{ width: 16, height: 1, background: "var(--gold)" }}/>
                </div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, letterSpacing: 4, color: "var(--ivory)", margin: 0, lineHeight: 1 }}>SIGN IN</h1>
              </div>

              {error && (
                <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 18, letterSpacing: 0.5 }}>
                  ✕ {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                style={{ width: "100%", background: "transparent", border: "1px solid var(--smoke)", color: "var(--ash)", padding: "12px 16px", cursor: googleLoading ? "not-allowed" : "pointer", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18, transition: "all 0.25s", opacity: googleLoading ? 0.6 : 1 }}
                onMouseEnter={e => { if (!googleLoading) { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.color = "var(--ash)"; }}
              >
                <GoogleIcon />
                {googleLoading ? "REDIRECTING..." : "CONTINUE WITH GOOGLE"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: "var(--smoke)" }}/>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--silver)" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "var(--smoke)" }}/>
              </div>

              <form onSubmit={handleLogin} noValidate>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>EMAIL ADDRESS</label>
                  <input
                    className="input-dark"
                    type="email"
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={e => update("email", e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input-dark"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => update("password", e.target.value)}
                      autoComplete="current-password"
                      disabled={loading}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(prev => !prev)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--silver)", display: "flex", alignItems: "center" }}
                    >
                      <EyeIcon visible={showPw} />
                    </button>
                  </div>
                </div>

                <div style={{ height: 6, width: "100%", background: "#eee", borderRadius: 5, marginBottom: 5 }}>
                  <div style={{ height: "100%", width: `${(strengthScore / 5) * 100}%`, background: getColor(), borderRadius: 5, transition: "0.3s" }} />
                </div>

                <p style={{ textAlign: "left", marginTop: 18, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--silver)", opacity: 0.5 }}>
                  Strength: {getStrength()}
                </p>

                <ul style={{ textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--silver)", opacity: 0.5 }}>
                  <li style={{ color: checks.uppercase ? "green" : "gray" }}>Uppercase letter (A-Z)</li>
                  <li style={{ color: checks.lowercase ? "green" : "gray" }}>Lowercase letter (a-z)</li>
                  <li style={{ color: checks.number ? "green" : "gray" }}>Number (0-9)</li>
                  <li style={{ color: checks.special ? "green" : "gray" }}>Special character (!@#$)</li>
                  <li style={{ color: checks.length ? "green" : "gray" }}>Minimum 8 characters</li>
                </ul>

                <div style={{ textAlign: "right", marginBottom: 24 }}>
                  <button
                    type="button"
                    onClick={() => setPage("forgetpassword")}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)" }}
                  >
                    FORGOT PASSWORD?
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn-gold"
                  disabled={loading}
                  style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {loading ? "SENDING OTP..." : "SIGN IN →"}
                </button>
              </form>

              <div style={{ marginTop: 22, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)" }}>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setPage("signup")}
                  style={{ all: "unset", cursor: "pointer", color: "var(--gold)", letterSpacing: 1 }}
                >
                  CREATE ONE
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <AuthOtpStep
              title="VERIFY LOGIN"
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
              onBack={() => {
                setStep(1);
                setError("");
                setOtp(["", "", "", "", "", ""]);
                setPendingUser(null);
              }}
              submitLabel="VERIFY & SIGN IN →"
              loadingLabel="VERIFYING..."
              idPrefix="otp-li"
            />
          )}
        </div>
      </div>
    </div>
    </>
  );
}