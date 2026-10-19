// Sign in and create an account, in the gallery style (prototype ui/auth.js).
// No passwords: email gets a 6-digit code (/auth/login or /auth/signup, then
// /auth/verify-otp), a mobile number gets a Firebase SMS code, and Google goes
// through Firebase. Every path ends with the backend's HttpOnly session cookie.
import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import { auth, isFirebaseAvailable } from "../utils/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { executeRecaptcha } from "../utils/recaptcha";
import { updateProfile } from "../utils/profile";
import { useGallery } from "../gallery/galleryContext";
import { isValidEmail, isValidMobile, cleanMobile, isValidName, cleanName, EMAIL_ERROR, NAME_ERROR } from "../utils/validate";

const MOBILE_DOMAIN = "@mobile.velvetwolf.in";
const RESEND_SECONDS = 60;

// True when the response created a session (the HttpOnly cookie is set).
// `user` alone is not enough: the mobile-login "OTP sent" response includes
// it too. `token` is the older backend's signal, kept so either deploy order works.
function isSignedInResponse(data) {
  return Boolean(data?.authenticated || data?.token);
}

const isEmail = isValidEmail;
const isMobile = isValidMobile;
// letters in any script, spaces, dots, apostrophes and hyphens
const nameChars = (v) => v.replace(/[^\p{L}\p{M}\s.'-]/gu, "");

function GoogleMark() {
  return (
    <svg className="g-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// Maps Firebase error codes to plain messages.
function formatAuthError(err) {
  const code = err?.code || "";
  if (code === "auth/invalid-phone-number") return "Enter a valid 10-digit mobile number.";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again in a few minutes.";
  if (code === "auth/invalid-app-credential" || code === "auth/captcha-check-failed") return "Phone sign-in is busy right now. Try again in a moment, or use your email.";
  if (code === "auth/quota-exceeded") return "We can't send SMS codes right now. Use your email instead.";
  if (code === "auth/invalid-verification-code") return "That code doesn't match. Check it and try again.";
  if (code === "auth/code-expired") return "That code has expired. Send a new one.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Google sign-in was cancelled. Try again, or use your email.";
  if (code === "auth/popup-blocked") return "Your browser blocked the Google window. Allow pop-ups for this site, or use your email.";
  return err?.message || "Something went wrong. Try again.";
}

export function Login() {
  const { user, setUser, showToast } = useContext(AppContext);
  const { engine } = useGallery();
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = new URLSearchParams(location.search).get("redirect");
  const [mode, setMode] = useState(location.pathname === "/signup" ? "signup" : "signin");
  const [step, setStep] = useState("email"); // email | code | name

  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(""); // form-level message (role=alert)
  const [note, setNote] = useState(""); // neutral information
  const [fieldErr, setFieldErr] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // who we're signing in
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);

  const [waitLeft, setWaitLeft] = useState(0);
  const timerRef = useRef(null);
  const titleRef = useRef(null);
  const codeRef = useRef(null);

  const mobileFlow = resolvedEmail.endsWith(MOBILE_DOMAIN);
  const mobileNumber = mobileFlow ? resolvedEmail.split("@")[0] : "";

  useEffect(() => {
    if (engine) engine.setView("auth", "auth");
  }, [engine]);

  useEffect(() => {
    setMode(location.pathname === "/signup" ? "signup" : "signin");
  }, [location.pathname]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch { /* already gone */ }
      window.recaptchaVerifier = null;
    }
  }, []);

  // Already signed in (or just signed in): go on.
  const userId = user ? (user.id || user.email || "authed") : null;
  const target = (u) => (redirect ? (redirect.startsWith("/") ? redirect : `/${redirect}`) : (u?.isAdmin ? "/admin" : "/account"));
  useEffect(() => {
    if (userId && step !== "name") navigate(target(user), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Move focus to the heading when the step changes, for screen readers.
  useEffect(() => {
    setTimeout(() => (step === "code" ? codeRef.current : titleRef.current)?.focus({ preventScroll: true }), 30);
  }, [step]);

  const startTimer = (sec = RESEND_SECONDS) => {
    clearInterval(timerRef.current);
    const until = Date.now() + sec * 1000;
    setWaitLeft(sec);
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setWaitLeft(left);
      if (left <= 0) clearInterval(timerRef.current);
    }, 1000);
  };

  const finish = (data, { isNew = false, displayName = "" } = {}) => {
    const u = data.user || {};
    const nextUser = {
      ...u,
      email: u.email || resolvedEmail,
      name: displayName || u.name || (resolvedEmail || "").split("@")[0],
      full_name: displayName || u.full_name || u.name,
      role: u.role || "customer",
      isAdmin: u.role === "admin",
      authSource: data.authSource || "backend",
    };
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
    const first = String(nextUser.full_name || nextUser.name || "").split(/\s+/)[0];
    showToast(isNew ? `Welcome to VelvetWolf${first ? `, ${first}` : ""}.` : `Signed in${nextUser.email && !mobileFlow ? ` as ${nextUser.email}` : ""}`);
    navigate(target(nextUser), { replace: true });
  };

  const initRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById("recaptcha-container");
    if (container) container.innerHTML = "";
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    return window.recaptchaVerifier;
  };

  const sendPhoneCode = async (number) => {
    if (!isFirebaseAvailable || !auth) throw new Error("Phone sign-in is unavailable right now. Use your email instead.");
    const confirmation = await signInWithPhoneNumber(auth, `+91${number}`, initRecaptcha());
    setConfirmationResult(confirmation);
  };

  const sendEmailLoginCode = async (email) => {
    const token = await executeRecaptcha("login");
    const res = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, recaptchaToken: token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "We couldn't send a code just now. Try again in a minute.");
  };

  const sendEmailSignupCode = async (email, fullName) => {
    const token = await executeRecaptcha("signup");
    const res = await fetch(apiUrl("/auth/signup"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName, email, recaptchaToken: token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "We couldn't create your account just now. Try again in a minute.");
  };

  // ---- step 1: email or mobile (and a name when creating an account) ----
  const onEmailSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setNote("");
    const raw = identifier.trim().toLowerCase();
    const mobile = cleanMobile(raw);
    const errs = {};
    if (!isEmail(raw) && !isMobile(mobile)) {
      errs.identifier = /^[\d\s+()-]+$/.test(raw)
        ? "Enter a valid 10-digit Indian mobile number."
        : raw.includes("@") ? EMAIL_ERROR : "Enter an email like name@example.com, or a 10-digit mobile number.";
    }
    if (mode === "signup" && !name.trim()) errs.name = "Enter your name.";
    else if (mode === "signup" && !isValidName(name)) errs.name = NAME_ERROR;
    setFieldErr(errs);
    if (Object.keys(errs).length) return;

    const email = isMobile(mobile) ? `${mobile}${MOBILE_DOMAIN}` : raw;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/discover"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We couldn't check that just now. Try again in a minute.");

      setResolvedEmail(email);
      setIsExistingUser(Boolean(data.exists));

      if (isMobile(mobile)) {
        await sendPhoneCode(mobile);
      } else if (data.exists) {
        if (mode === "signup") setNote("You already have an account with this email, so we sent you a sign-in code.");
        await sendEmailLoginCode(email);
      } else if (!name.trim()) {
        // New email on the sign-in form: say so plainly (it may be a typo), and
        // offer to create the account.
        setMode("signup");
        setNote(`No account uses ${email}. Check it for a typo, or add your name below to create one.`);
        setFieldErr({});
        setTimeout(() => document.getElementById("auth-name")?.focus(), 30);
        return;
      } else {
        await sendEmailSignupCode(email, cleanName(name));
      }
      setCode("");
      setStep("code");
      startTimer();
    } catch (err) {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
        window.recaptchaVerifier = null;
      }
      setMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ---- step 2: the code ----
  const verify = async (value) => {
    if (loading) return;
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 6) { setFieldErr({ code: "Enter all 6 digits." }); return; }
    setFieldErr({}); setMsg("");
    setLoading(true);
    try {
      let data;
      if (mobileFlow) {
        if (!confirmationResult) throw new Error("That code request has ended. Send a new code.");
        const cred = await confirmationResult.confirm(digits);
        const idToken = await cred.user.getIdToken();
        const res = await fetch(apiUrl("/auth/firebase-login"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: `+91${mobileNumber}`, token: idToken }),
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "We couldn't sign you in. Try again.");
      } else {
        const res = await fetch(apiUrl("/auth/verify-otp"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resolvedEmail, otp: digits, type: isExistingUser ? "login" : "signup" }),
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "That code doesn't match. Check it and try again.");
      }
      if (!isSignedInResponse(data)) throw new Error("We couldn't sign you in. Try again.");
      clearInterval(timerRef.current);

      if (mobileFlow && !isExistingUser) {
        // New mobile account: it needs a name (asked up front on "Create an account").
        if (isValidName(name)) {
          await saveName(data.user, cleanName(name));
          return;
        }
        setPendingUser(data.user);
        setStep("name");
        return;
      }
      finish(data, { isNew: !isExistingUser });
    } catch (err) {
      const text = formatAuthError(err);
      setFieldErr({ code: text });
      codeRef.current?.select();
    } finally {
      setLoading(false);
    }
  };

  const onCodeChange = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(v);
    if (fieldErr.code) setFieldErr({});
    if (v.length === 6) verify(v);
  };

  const resend = async () => {
    if (waitLeft > 0 || loading) return;
    setMsg(""); setFieldErr({}); setCode("");
    try {
      if (mobileFlow) {
        await sendPhoneCode(mobileNumber);
      } else {
        const res = await fetch(apiUrl("/auth/resend-otp"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resolvedEmail, kind: isExistingUser ? "login" : "signup" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "We couldn't send a new code. Try again in a minute.");
      }
      showToast("New code sent");
      startTimer();
    } catch (err) {
      setMsg(formatAuthError(err));
    }
  };

  // ---- step 3 (new mobile accounts): a name ----
  const saveName = async (signedInUser, fullName) => {
    const profile = await updateProfile(signedInUser.id, { fullName, phone: mobileNumber });
    finish({ user: { ...signedInUser, ...profile } }, { isNew: true, displayName: fullName });
  };

  const onNameSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setFieldErr({ name2: "Enter your name." }); return; }
    if (!isValidName(name)) { setFieldErr({ name2: NAME_ERROR }); return; }
    setLoading(true);
    try {
      await saveName(pendingUser, cleanName(name));
    } catch (err) {
      setMsg(err.message || "We couldn't save your name. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Google ----
  const onGoogle = async () => {
    if (!isFirebaseAvailable || !auth) { setMsg("Google sign-in is unavailable right now. Use your email instead."); return; }
    if (googleLoading || loading) return;
    setGoogleLoading(true);
    setMsg(""); setNote("");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const res = await fetch(apiUrl("/auth/firebase-login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken, identifier: result.user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Google sign-in failed. Try again, or use your email.");
      setResolvedEmail(result.user.email || "");
      finish({ ...data, authSource: "firebase" });
    } catch (err) {
      setMsg(formatAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const backToEmail = () => {
    clearInterval(timerRef.current);
    setStep("email"); setCode(""); setMsg(""); setNote(""); setFieldErr({});
  };

  const errorFor = (id) => fieldErr[id]
    ? <p className="field-error" id={`${id}-err`} role="alert">{fieldErr[id]}</p>
    : null;

  const signup = mode === "signup";

  return (
    <main className="vwg vwg-view-auth">
      <div className="vwg-auth-card">
        {step === "email" && (
          <>
            <p className="eyebrow">Account</p>
            <h1 className="auth-title" tabIndex={-1} ref={titleRef}>{signup ? "Create an account" : "Sign in"}</h1>
            <p className="auth-sub">
              {signup ? "Save addresses and see every order in one place." : "Welcome back."} We send you a 6-digit code, so there is no password to remember.
            </p>
            <button className="btn btn-google btn-block" type="button" onClick={onGoogle} disabled={googleLoading || loading}>
              <GoogleMark /><span>{googleLoading ? "Opening Google…" : "Continue with Google"}</span>
            </button>
            <div className="or-rule" role="separator"><span>or with email or mobile</span></div>
            <form className="auth-form" onSubmit={onEmailSubmit} noValidate>
              {signup && (
                <div className="form-row">
                  <label htmlFor="auth-name">Name</label>
                  <input
                    id="auth-name" type="text" autoComplete="name" value={name} disabled={loading}
                    onChange={(e) => { setName(nameChars(e.target.value)); setFieldErr((f) => ({ ...f, name: "" })); }}
                    aria-invalid={fieldErr.name ? "true" : undefined} aria-describedby={fieldErr.name ? "name-err" : undefined}
                  />
                  {errorFor("name")}
                </div>
              )}
              <div className="form-row">
                <label htmlFor="auth-id">Email or mobile number</label>
                <input
                  id="auth-id" type="email" inputMode="email" autoComplete="email" spellCheck="false" autoCapitalize="off" maxLength={254}
                  value={identifier} disabled={loading} placeholder="name@example.com or 98765 43210"
                  onChange={(e) => { setIdentifier(e.target.value); setFieldErr((f) => ({ ...f, identifier: "" })); }}
                  aria-invalid={fieldErr.identifier ? "true" : undefined} aria-describedby={fieldErr.identifier ? "identifier-err" : undefined}
                />
                {errorFor("identifier")}
              </div>
              {note && <p className="form-note" role="status">{note}</p>}
              {msg && <p className="form-msg" role="alert">{msg}</p>}
              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send me a code"}
              </button>
            </form>
            <p className="auth-switch">
              {signup
                ? <>Already have an account? <Link to={`/login${location.search}`}>Sign in</Link></>
                : <>New to VelvetWolf? <Link to={`/signup${location.search}`}>Create an account</Link></>}
            </p>
            <p className="fine">
              We use your email or number to sign you in and to send updates about your orders. By continuing you agree to our{" "}
              <Link to="/terms">Terms</Link> and <Link to="/privacy-policy">Privacy Policy</Link>.
            </p>
          </>
        )}

        {step === "code" && (
          <>
            <button className="text-btn back-link" type="button" onClick={backToEmail}>&larr; Use a different {mobileFlow ? "number" : "email"}</button>
            <h1 className="auth-title" tabIndex={-1} ref={titleRef}>{mobileFlow ? "Check your messages" : "Check your email"}</h1>
            <p className="auth-sub">
              We sent a 6-digit code to <b>{mobileFlow ? `+91 ${mobileNumber}` : resolvedEmail}</b>.{mobileFlow ? "" : " It works for 10 minutes."}
            </p>
            {note && <p className="form-note" role="status">{note}</p>}
            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); verify(code); }} noValidate>
              <div className="form-row">
                <label htmlFor="auth-code">6-digit code</label>
                <input
                  id="auth-code" ref={codeRef} type="text" className="otp" inputMode="numeric" autoComplete="one-time-code"
                  maxLength={6} spellCheck="false" value={code} onChange={onCodeChange} disabled={loading}
                  aria-invalid={fieldErr.code ? "true" : undefined} aria-describedby={fieldErr.code ? "code-err" : undefined}
                />
                {errorFor("code")}
              </div>
              {msg && <p className="form-msg" role="alert">{msg}</p>}
              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? "Checking…" : "Verify and continue"}
              </button>
            </form>
            <p className="auth-switch">
              Didn't get it? {mobileFlow ? "Check the number, " : "Check spam, "}or{" "}
              <button className="text-btn" type="button" onClick={resend} disabled={waitLeft > 0}>send a new code</button>{" "}
              <span className="resend-wait">{waitLeft > 0 ? `in ${waitLeft}s` : ""}</span>
            </p>
          </>
        )}

        {step === "name" && (
          <>
            <p className="eyebrow">Account created</p>
            <h1 className="auth-title" tabIndex={-1} ref={titleRef}>What should we call you?</h1>
            <p className="auth-sub">Signed in as <b>+91 {mobileNumber}</b>. We use your name on orders and delivery labels.</p>
            <form className="auth-form" onSubmit={onNameSubmit} noValidate>
              <div className="form-row">
                <label htmlFor="auth-name2">Name</label>
                <input
                  id="auth-name2" type="text" autoComplete="name" value={name} disabled={loading}
                  onChange={(e) => { setName(nameChars(e.target.value)); setFieldErr({}); }}
                  aria-invalid={fieldErr.name2 ? "true" : undefined} aria-describedby={fieldErr.name2 ? "name2-err" : undefined}
                />
                {errorFor("name2")}
              </div>
              {msg && <p className="form-msg" role="alert">{msg}</p>}
              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>{loading ? "Saving…" : "Continue"}</button>
            </form>
          </>
        )}
        <div id="recaptcha-container"></div>
      </div>
    </main>
  );
}

export default Login;
