import { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "./AppContext";
import { AuthOtpStep } from "../components/AuthOtpStep";
import Navbar from "../components/Navbar";
import { apiUrl } from "../utils/api";
import { auth, isFirebaseAvailable } from "../utils/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { executeRecaptcha } from "../utils/recaptcha";
import { updateProfile } from "../utils/profile";
import { getSupabaseLogoUrl } from "../utils/supabase";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

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

export function Login() {
  const { user, setPage, setUser, showToast } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const redirect = query.get("redirect");

  const [step, setStep] = useState("identifier"); // identifier, password, register_email, otp, mobile_name
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [agree, setAgree] = useState(false);

  // Resolved discovery state
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [pendingToken, setPendingToken] = useState(null);
  const [pendingUserObject, setPendingUserObject] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  useEffect(() => {
    if (user) {
      if (redirect) {
        navigate(redirect.startsWith("/") ? redirect : `/${redirect}`);
      } else if (user.isAdmin) {
        navigate("/admin");
      } else {
        setPage("account");
      }
    }
  }, [user, setPage, navigate, redirect]);

  // Password strength helper
  const checks = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    length: password.length >= 8,
  };
  const strengthScore = Object.values(checks).filter(Boolean).length;
  const getStrength = () => {
    if (strengthScore <= 2) return "Weak";
    if (strengthScore <= 4) return "Medium";
    return "Strong";
  };
  const getStrengthColor = () => {
    if (strengthScore <= 2) return "#c0504d";
    if (strengthScore <= 4) return "#c87941";
    return "#5db87a";
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

  // Google OAuth via Firebase
  const handleGoogle = async () => {
    if (!isFirebaseAvailable || !auth) {
      setError("Google Login is not available at the moment.");
      return;
    }
    setGoogleLoading(true);
    setError("");
    setInfoMessage("");
    let result = null;
    try {
      const provider = new GoogleAuthProvider();
      result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const res = await fetch(apiUrl("/auth/firebase-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken, identifier: result.user.email })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google login failed.");
      
      // Cookie is handled automatically, no localStorage token required
      const nextUser = {
        ...data.user,
        role: data.user?.role || "customer",
        isAdmin: data.user?.role === "admin",
        authSource: "firebase",
      };
      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
      showToast(`Successfully logged in with Google!`);
      navigate("/");
    } catch (err) {
      if (err.message && err.message.includes("email and password")) {
        setInfoMessage("You signed up with email and password. Redirecting to password sign-in...");
        const googleEmail = result?.user?.email;
        if (googleEmail) {
          setResolvedEmail(googleEmail);
        }
        setTimeout(() => {
          setStep("password");
        }, 1500);
      } else {
        setError(err.message || "Google sign in failed.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Maps Firebase Phone Auth error codes to user-friendly messages
  const formatAuthError = (err) => {
    const code = err?.code || "";
    if (code === "auth/invalid-phone-number") return "Please enter a valid mobile number.";
    if (code === "auth/too-many-requests") return "Too many attempts. Please try again later.";
    if (code === "auth/invalid-app-credential" || code === "auth/captcha-check-failed") {
      return "Phone verification is temporarily unavailable. Please try again in a moment.";
    }
    if (code === "auth/quota-exceeded") return "SMS quota exceeded. Please try again later.";
    return err?.message || "An error occurred. Please try again.";
  };

  const resendEmailOtp = async () => {
    const res = await fetch(apiUrl("/auth/resend-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: resolvedEmail,
        kind: isExistingUser ? "login" : "signup",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to resend code.");
    }
    showToast("New OTP code sent ✓");
    startResendTimer();
  };

  // Discovery step: checks if email or mobile exists
  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const input = identifier.trim().toLowerCase();
    if (!input) {
      setError("Please enter your email address or mobile number.");
      return;
    }

    const isEmail = input.includes("@");
    const isMobile = /^[6-9]\d{9}$/.test(input);

    if (!isEmail && !isMobile) {
      setError("Please enter a valid email address or 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const emailQuery = isMobile ? `${input}@mobile.velvetwolf.in` : input;
      const res = await fetch(apiUrl("/auth/discover"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailQuery }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Discover request failed.");
      }

      setIsExistingUser(data.exists);
      setResolvedEmail(emailQuery);

      if (isMobile) {
        if (!isFirebaseAvailable || !auth) {
          throw new Error("Phone sign-in is currently unavailable. Please use your email to continue.");
        }

        // Firebase Phone Auth integration
        const phoneNumber = `+91${input}`;

        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (err) {
            console.error("Error clearing existing recaptcha verifier:", err);
          }
          window.recaptchaVerifier = null;
        }

        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => { },
          'expired-callback': () => { }
        });

        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
        setConfirmationResult(confirmation);

        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
        startResendTimer();
        showToast("OTP code has been sent!");
      } else {
        // Email Flow
        if (data.exists) {
          if (data.type === "Google") {
            setInfoMessage("You signed up with Google. Redirecting to Google sign-in...");
            setTimeout(() => {
              handleGoogle();
            }, 1500);
          } else {
            setStep("password");
          }
        } else {
          setStep("register_email");
        }
      }
    } catch (err) {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error(e);
        }
        window.recaptchaVerifier = null;
      }
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Password login (existing email user)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const token = await executeRecaptcha("login");
      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resolvedEmail,
          password: password,
          recaptchaToken: token,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect password. Please try again.");
      }

      // Email password login returns JWT directly (No OTP)
      if (data.token) {
        // Cookie is handled automatically, no localStorage token required
        const nextUser = {
          ...data.user,
          email: data.user.email || resolvedEmail,
          name: data.user.name || resolvedEmail.split("@")[0],
          full_name: data.user.full_name || data.user.name,
          role: data.user.role || "customer",
          isAdmin: data.user.role === "admin",
          authSource: "backend",
        };
        localStorage.setItem("user", JSON.stringify(nextUser));
        setUser(nextUser);
        showToast(`Successfully logged in, welcome back ${nextUser.name}!`);
        if (nextUser.isAdmin) {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      const msg = err.message || "Login failed. Please try again.";
      if (msg.includes("signed up with Google") || msg.includes("using Google")) {
        setInfoMessage("You signed up with Google. Redirecting to Google sign-in...");
        setTimeout(() => {
          handleGoogle();
        }, 1500);
      } else if (msg.toLowerCase().includes("not registered")) {
        showToast("Account not found — please sign up first.");
        setError("User not registered. Please complete registration.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Create password and trigger signup OTP (new email user)
  const handleEmailRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms & Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      const token = await executeRecaptcha("signup");
      const res = await fetch(apiUrl("/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: resolvedEmail,
          password: password,
          recaptchaToken: token,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please try again.");
      }

      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      startResendTimer();
      showToast("Verification code sent to your email!");
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP (email signup, mobile login, mobile signup)
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const isMobile = resolvedEmail.endsWith("@mobile.velvetwolf.in");
      let data;

      if (isMobile && isFirebaseAvailable && auth) {
        if (!confirmationResult) {
          throw new Error("No active phone verification session. Please go back and retry.");
        }
        // Verify with Firebase
        const userCredential = await confirmationResult.confirm(code);
        const firebaseUser = userCredential.user;
        const idToken = await firebaseUser.getIdToken();

        // Send token to backend
        const mobileNumber = resolvedEmail.split("@")[0];
        const res = await fetch(apiUrl("/auth/firebase-login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: `+91${mobileNumber}`,
            token: idToken,
          }),
        });

        data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Backend verification failed.");
        }
      } else {
        // Standard Email Flow OR Mobile Fallback Flow (using standard backend verify-otp)
        const res = await fetch(apiUrl("/auth/verify-otp"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: resolvedEmail,
            otp: code,
            type: isExistingUser ? "login" : "signup",
          }),
        });

        data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Verification failed. Please try again.");
        }
      }

      if (data.token) {
        if (isMobile && !isExistingUser) {
          // New mobile user: store token and ask for Name (Step 5)
          setPendingToken(data.token);
          setPendingUserObject(data.user);
          setStep("mobile_name");
        } else {
          // Complete login
          // Cookie is handled automatically, no localStorage token required
          const nextUser = {
            ...data.user,
            email: resolvedEmail,
            name: data.user?.name || resolvedEmail.split("@")[0],
            full_name: data.user?.full_name || data.user?.name,
            role: data.user?.role || "customer",
            isAdmin: data.user?.role === "admin",
            authSource: "backend",
          };
          localStorage.setItem("user", JSON.stringify(nextUser));
          setUser(nextUser);
          showToast(isExistingUser ? `Successfully logged in!` : `Account created! Welcome to the pack ◆`);
          navigate("/");
        }
      }
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setError("");

    try {
      const isMobile = resolvedEmail.endsWith("@mobile.velvetwolf.in");
      if (isMobile) {
        if (!isFirebaseAvailable || !auth) {
          throw new Error("Phone sign-in is currently unavailable. Please use your email to continue.");
        }

        const mobileNumber = resolvedEmail.split("@")[0];
        const phoneNumber = `+91${mobileNumber}`;

        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (e) {
            console.error("Error clearing recaptcha verifier:", e);
          }
          window.recaptchaVerifier = null;
        }

        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => { },
          'expired-callback': () => { }
        });

        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
        setConfirmationResult(confirmation);
        showToast("New OTP code sent ✓");
        startResendTimer();
      } else {
        await resendEmailOtp();
      }
    } catch (err) {
      setError(formatAuthError(err));
    }
  };

  // Complete profile name for mobile signup
  const handleMobileNameSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      const mobileNumber = resolvedEmail.split("@")[0];
      // Note: We bypass setting localStorage token here since it's HttpOnly. 
      // During registration completion, the browser cookie was already set in verifyOtp/firebaseLogin step!
      const profile = await updateProfile(pendingUserObject.id, {
        fullName: fullName.trim(),
        phone: mobileNumber,
      });
      const nextUser = {
        ...pendingUserObject,
        ...profile,
        email: resolvedEmail,
        name: fullName.trim(),
        full_name: fullName.trim(),
        role: pendingUserObject.role || "customer",
        isAdmin: pendingUserObject.role === "admin",
        authSource: "backend",
      };
      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
      showToast(`Account created! Welcome to the pack ◆`);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to save profile name.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const nextDigit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = nextDigit;
    setOtp(nextOtp);

    if (nextDigit && index < 5) {
      document.getElementById(`otp-val-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-val-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
    }
    e.preventDefault();
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
        }} />

        <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div onClick={() => setPage("home")} style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={getSupabaseLogoUrl("/vw-logo.png")} alt="VelvetWolf logo" style={{ width: 30, height: 30, objectFit: "contain" }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 6, color: "var(--ivory)", lineHeight: 1 }}>VELVETWOLF</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", opacity: 0.7 }}>LUXURY STREETWEAR</div>
              </div>
            </div>
          </div>

          <div className="auth-box" style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "36px 32px" }}>
            {error && (
              <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, marginBottom: 18, letterSpacing: 0.5 }}>
                ✕ {error}
              </div>
            )}

            {infoMessage && (
              <div style={{ background: "rgba(41,128,185,0.12)", border: "1px solid rgba(41,128,185,0.3)", color: "#70b0e0", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, marginBottom: 18, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: "8px" }}>
                <InfoIcon />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* STEP 1: IDENTIFIER */}
            {step === "identifier" && (
              <>
                <div style={{ marginBottom: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                    <div style={{ width: 16, height: 1, background: "var(--gold)" }} />WELCOME TO VELVETWOLF<div style={{ width: 16, height: 1, background: "var(--gold)" }} />
                  </div>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 4, color: "var(--ivory)", margin: 0, lineHeight: 1.1 }}>SIGN IN / SIGN UP</h1>
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading || loading}
                  style={{ width: "100%", background: "var(--ivory)", border: "none", color: "var(--obsidian)", padding: "14px 16px", cursor: googleLoading ? "not-allowed" : "pointer", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18, transition: "all 0.25s", fontWeight: "bold" }}
                >
                  <GoogleIcon />
                  {googleLoading ? "REDIRECTING..." : "CONTINUE WITH GOOGLE"}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--smoke)" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--silver)" }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: "var(--smoke)" }} />
                </div>

                <form onSubmit={handleIdentifierSubmit}>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>EMAIL OR MOBILE NUMBER</label>
                    <input
                      className="input-dark"
                      type="text"
                      placeholder="you@email.com or 9876543210"
                      value={identifier}
                      onChange={e => {
                        setIdentifier(e.target.value);
                        setError("");
                        setInfoMessage("");
                      }}
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-gold"
                    disabled={loading}
                    style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4 }}
                  >
                    {loading ? "CHECKING..." : "CONTINUE →"}
                  </button>
                </form>
              </>
            )}

            {/* STEP 2: PASSWORD */}
            {step === "password" && (
              <>
                <div style={{ marginBottom: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                    <div style={{ width: 16, height: 1, background: "var(--gold)" }} />WELCOME BACK<div style={{ width: 16, height: 1, background: "var(--gold)" }} />
                  </div>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, letterSpacing: 3, color: "var(--ivory)", margin: 0 }}>SIGN IN</h1>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginTop: 6 }}>Enter password for: {resolvedEmail}</p>
                </div>

                <form onSubmit={handlePasswordSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>PASSWORD</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-dark"
                        type={showPw ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value);
                          setError("");
                          setInfoMessage("");
                        }}
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
                    style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4 }}
                  >
                    {loading ? "SIGNING IN..." : "SIGN IN →"}
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => setStep("identifier")}
                    style={{ all: "unset", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}
                  >
                    ← BACK
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: REGISTER EMAIL */}
            {step === "register_email" && (
              <>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                    <div style={{ width: 16, height: 1, background: "var(--gold)" }} />CREATE YOUR ACCOUNT<div style={{ width: 16, height: 1, background: "var(--gold)" }} />
                  </div>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, letterSpacing: 3, color: "var(--ivory)", margin: 0 }}>SIGN UP</h1>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginTop: 6 }}>Signing up as: {resolvedEmail}</p>
                </div>

                <form onSubmit={handleEmailRegisterSubmit}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>FULL NAME</label>
                    <input
                      className="input-dark"
                      type="text"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                      disabled={loading}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>PASSWORD</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-dark"
                        type={showPw ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
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
                    {password && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", gap: 3, height: 3, background: "var(--smoke)", borderRadius: 2, overflow: "hidden" }}>
                          {[1, 2, 3, 4].map(n => (
                            <div key={n} style={{ flex: 1, height: "100%", background: n <= strengthScore ? getStrengthColor() : "transparent" }} />
                          ))}
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: getStrengthColor(), marginTop: 4, display: "block" }}>STRENGTH: {getStrength()}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
                    <div onClick={() => setAgree(!agree)} style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2, cursor: "pointer", border: `1px solid ${agree ? "var(--gold)" : "var(--smoke)"}`, background: agree ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                      {agree && <span style={{ color: "var(--obsidian)", fontSize: 9, fontWeight: "bold" }}>✓</span>}
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", margin: 0, lineHeight: 1.6 }}>
                      I agree to VelvetWolf's{" "}
                      <button type="button" onClick={() => setPage("termspage")} style={{ all: "unset", cursor: "pointer", color: "var(--gold)" }}>Terms</button>
                      {" & "}
                      <button type="button" onClick={() => setPage("privacypolicy")} style={{ all: "unset", cursor: "pointer", color: "var(--gold)" }}>Privacy Policy</button>
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn-gold"
                    disabled={loading}
                    style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4 }}
                  >
                    {loading ? "CREATING..." : "CREATE ACCOUNT →"}
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => setStep("identifier")}
                    style={{ all: "unset", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}
                  >
                    ← BACK
                  </button>
                </div>
              </>
            )}

            {/* STEP 4: OTP */}
            {step === "otp" && (
              <AuthOtpStep
                title={resolvedEmail.endsWith("@mobile.velvetwolf.in") ? "VERIFY OTP" : "VERIFY EMAIL"}
                email={resolvedEmail.endsWith("@mobile.velvetwolf.in") ? resolvedEmail.split("@")[0] : resolvedEmail}
                error={error}
                otp={otp}
                loading={loading}
                resendTimer={resendTimer}
                onSubmit={handleVerifyOtpSubmit}
                onOtpChange={handleOtpChange}
                onOtpKeyDown={handleOtpKeyDown}
                onOtpPaste={handleOtpPaste}
                onResend={handleResend}
                onBack={() => setStep("identifier")}
                submitLabel={isExistingUser ? "VERIFY & SIGN IN →" : "VERIFY & CONTINUE →"}
                loadingLabel="VERIFYING..."
                idPrefix="otp-val"
              />
            )}

            {/* STEP 5: MOBILE NAME */}
            {step === "mobile_name" && (
              <>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 5, color: "var(--gold)", marginBottom: 8 }}>
                    <div style={{ width: 16, height: 1, background: "var(--gold)" }} />WELCOME TO THE PACK ◆<div style={{ width: 16, height: 1, background: "var(--gold)" }} />
                  </div>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, letterSpacing: 3, color: "var(--ivory)", margin: 0 }}>ENTER NAME</h1>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginTop: 6 }}>Tell us your name to complete registration.</p>
                </div>

                <form onSubmit={handleMobileNameSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 7 }}>FULL NAME</label>
                    <input
                      className="input-dark"
                      type="text"
                      placeholder="Your name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-gold"
                    disabled={loading}
                    style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4 }}
                  >
                    {loading ? "SAVING..." : "COMPLETE SIGNUP →"}
                  </button>
                </form>
              </>
            )}
            <div id="recaptcha-container"></div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
