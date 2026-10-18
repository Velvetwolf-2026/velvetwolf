// Settings, in groups: profile, addresses, how you sign in, emails, your data, and deleting the
// account (wording and behaviour unchanged from before).
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router";
import { AppContext } from "../pages/AppContext";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { updateProfile, sendEmailUpdateOtp, verifyEmailUpdateOtp } from "../utils/profile";
import { auth, isFirebaseAvailable } from "../utils/firebase";
import { isValidEmail, isValidMobile, cleanMobile, isValidName, cleanName, EMAIL_ERROR, MOBILE_ERROR, NAME_ERROR } from "../utils/validate";
import { request } from "./api";
import { patchState } from "./store";
import Addresses from "./Addresses";

const MOBILE_DOMAIN = "@mobile.velvetwolf.in";
const nameChars = (v) => v.replace(/[^\p{L}\p{M}\s.'-]/gu, "");

function displayNameOf(user) {
  const n = user?.full_name || user?.name || "";
  return /^mobile( |$)/i.test(n) ? "" : n;
}

// the number on the account: the saved one, or a mobile-only account's sign-in number
function phoneOf(user) {
  const email = String(user?.email || "");
  return user?.phone || (email.endsWith(MOBILE_DOMAIN) ? email.slice(0, -MOBILE_DOMAIN.length) : "");
}

function storeUser(setUser, nextUser) {
  setUser(nextUser);
  try { localStorage.setItem("user", JSON.stringify(nextUser)); } catch { /* storage unavailable */ }
}

function clearRecaptcha() {
  if (typeof window === "undefined" || !window.recaptchaVerifier) return;
  try { window.recaptchaVerifier.clear(); } catch { /* already gone */ }
  window.recaptchaVerifier = null;
}

function Profile() {
  const { user, setUser, showToast } = useContext(AppContext);
  const [name, setName] = useState(displayNameOf(user));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const mobileOnly = String(user?.email || "").endsWith(MOBILE_DOMAIN);

  const shownName = displayNameOf(user);
  useEffect(() => { setName(shownName); }, [shownName]);

  const save = async (e) => {
    e.preventDefault();
    const n = cleanName(name);
    const next = {};
    if (!n) next.name = "Enter your name.";
    else if (!isValidName(n)) next.name = NAME_ERROR;
    setErr(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      // the mobile number changes below, with a code
      const profile = await updateProfile(user.id, { fullName: n, gender: user?.gender ?? null, dob: user?.date_of_birth ?? null });
      storeUser(setUser, { ...user, full_name: profile?.full_name || n, name: profile?.full_name || n });
      showToast("Saved.");
    } catch (error) {
      showToast(error.message || "Couldn't save that.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="den-set" aria-labelledby="set-prof-h">
      <div className="den-set-head"><h3 className="info-h" id="set-prof-h">Profile</h3></div>
      <form className="den-grid-2" onSubmit={save} noValidate>
        <div className="form-row">
          <label htmlFor="pf-name">Full name</label>
          <input id="pf-name" autoComplete="name" maxLength={80} value={name} onChange={(e) => { setName(nameChars(e.target.value)); setErr((x) => ({ ...x, name: "" })); }}
            aria-invalid={err.name ? "true" : undefined} aria-describedby={err.name ? "pf-name-err" : undefined} />
          {err.name && <p className="field-error" id="pf-name-err">{err.name}</p>}
        </div>
        <div className="acct-actions den-span-2"><button className="btn btn-small btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save name"}</button></div>
      </form>
      <EmailBlock mobileOnly={mobileOnly} />
      <PhoneBlock mobileOnly={mobileOnly} />
    </section>
  );
}

// Changing email: a code to the new address first.
function EmailBlock({ mobileOnly }) {
  const { user, setUser, showToast } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async () => {
    const email = newEmail.trim();
    if (!isValidEmail(email)) { setError(EMAIL_ERROR); return; }
    setBusy(true); setError("");
    try { await sendEmailUpdateOtp(email); setSent(true); } catch (e) { setError(e.message || "Couldn't send the code."); } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { setError("The code is 6 digits."); return; }
    setBusy(true); setError("");
    try {
      const result = await verifyEmailUpdateOtp(newEmail.trim(), code);
      storeUser(setUser, { ...user, ...result.user });
      showToast("Email updated.");
      setOpen(false); setSent(false); setNewEmail(""); setCode("");
    } catch (e) {
      setError(e.message || "That code didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="den-email">
      <p className="eyebrow">Email</p>
      <p>{mobileOnly ? "No email linked yet. Link one to get receipts and delivery updates by email." : user?.email}</p>
      {!open ? (
        <button className="text-btn" type="button" onClick={() => { setOpen(true); setSent(false); setError(""); }}>{mobileOnly ? "Link an email" : "Change email"}</button>
      ) : (
        <div className="den-email-form">
          {!sent ? (
            <div className="form-row">
              <label htmlFor="pf-email">New email</label>
              <input id="pf-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={newEmail} disabled={busy}
                onChange={(e) => { setNewEmail(e.target.value); setError(""); }} aria-invalid={error ? "true" : undefined} />
              <p className="field-hint">We'll send a 6-digit code there to check it's yours.</p>
            </div>
          ) : (
            <div className="form-row">
              <label htmlFor="pf-code">Code sent to {newEmail}</label>
              <input id="pf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} />
            </div>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="acct-actions">
            {!sent
              ? <button className="btn btn-small btn-primary" type="button" disabled={busy} onClick={sendCode}>{busy ? "Sending…" : "Send code"}</button>
              : <button className="btn btn-small btn-primary" type="button" disabled={busy} onClick={verify}>{busy ? "Checking…" : "Confirm"}</button>}
            <button className="btn btn-small" type="button" disabled={busy} onClick={() => (sent ? setSent(false) : setOpen(false))}>{sent ? "Back" : "Cancel"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Changing the mobile number: a code texted to the new number first. The
// confirmed number is the one a phone sign-in opens this account with, and on
// a mobile-only account it replaces the old sign-in number.
function PhoneBlock({ mobileOnly }) {
  const { user, setUser, showToast } = useContext(AppContext);
  const current = phoneOf(user);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => clearRecaptcha(), []);

  const reset = () => { setOpen(false); setPhone(""); setCode(""); setConfirmation(null); setError(""); clearRecaptcha(); };

  const sendCode = async () => {
    const n = cleanMobile(phone);
    if (!isValidMobile(n)) { setError(MOBILE_ERROR); return; }
    if (n === current) { setError("That's already your number."); return; }
    if (!isFirebaseAvailable || !auth) { setError("We can't text codes right now, so the number can't be changed. Try again later."); return; }
    setBusy(true); setError("");
    try {
      clearRecaptcha();
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "pf-recaptcha", { size: "invisible" });
      setConfirmation(await signInWithPhoneNumber(auth, `+91${n}`, window.recaptchaVerifier));
    } catch (e) {
      clearRecaptcha();
      setError(e?.code === "auth/too-many-requests" ? "Too many attempts. Try again in a few minutes." : "We couldn't text a code to that number. Check it and try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { setError("The code is 6 digits."); return; }
    setBusy(true); setError("");
    try {
      const cred = await confirmation.confirm(code);
      const token = await cred.user.getIdToken();
      const data = await request("/profile/phone/verify", { method: "POST", body: { token } });
      try { await auth.signOut(); } catch { /* the Firebase session was only for the code */ }
      storeUser(setUser, { ...user, ...data.user });
      showToast(mobileOnly ? `You now sign in with +91 ${cleanMobile(phone)}.` : "Mobile number updated.");
      reset();
    } catch (e) {
      setError(e?.code === "auth/invalid-verification-code" ? "That code doesn't match. Check it and try again."
        : e?.unavailable ? "Changing your number isn't available yet. Try again later."
          : e.message || "That code didn't work.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await updateProfile(user.id, { phone: "" });
      storeUser(setUser, { ...user, phone: null });
      showToast("Mobile number removed.");
    } catch (e) {
      showToast(e.message || "Couldn't remove the number.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="den-email">
      <p className="eyebrow">Mobile</p>
      <p>{current ? `+91 ${current}` : "No mobile number added."}{mobileOnly && current ? <span className="muted"> · you sign in with this number</span> : null}</p>
      {!open ? (
        <div className="acct-actions">
          <button className="text-btn" type="button" onClick={() => { setOpen(true); setError(""); }}>{current ? "Change number" : "Add a number"}</button>
          {current && !mobileOnly && <button className="text-btn" type="button" disabled={busy} onClick={remove}>Remove</button>}
        </div>
      ) : (
        <div className="den-email-form">
          {!confirmation ? (
            <div className="form-row">
              <label htmlFor="pf-phone">New mobile number</label>
              <input id="pf-phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} disabled={busy}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }} aria-invalid={error ? "true" : undefined} />
              <p className="field-hint">We'll text a 6-digit code to it to check it's yours.</p>
            </div>
          ) : (
            <div className="form-row">
              <label htmlFor="pf-phone-code">Code sent to +91 {cleanMobile(phone)}</label>
              <input id="pf-phone-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} />
            </div>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="acct-actions">
            {!confirmation
              ? <button className="btn btn-small btn-primary" type="button" disabled={busy} onClick={sendCode}>{busy ? "Sending…" : "Send code"}</button>
              : <button className="btn btn-small btn-primary" type="button" disabled={busy} onClick={verify}>{busy ? "Checking…" : "Confirm"}</button>}
            <button className="btn btn-small" type="button" disabled={busy} onClick={() => (confirmation ? setConfirmation(null) : reset())}>{confirmation ? "Back" : "Cancel"}</button>
          </div>
        </div>
      )}
      <div id="pf-recaptcha" />
    </div>
  );
}

function SignIn() {
  const { user, signOutUser } = useContext(AppContext);
  const mobileOnly = String(user?.email || "").endsWith(MOBILE_DOMAIN);
  return (
    <section className="den-set" aria-labelledby="set-sign-h">
      <div className="den-set-head"><h3 className="info-h" id="set-sign-h">Signing in</h3></div>
      <p className="muted">
        There's no password to remember. {mobileOnly
          ? <>You sign in with a code we text to {phoneOf(user) ? `+91 ${phoneOf(user)}` : "your mobile"}.</>
          : <>You sign in with a 6-digit code we email to {user?.email}, or with Google on the same address.</>}
      </p>
      <div className="acct-actions"><button className="btn btn-small" type="button" onClick={() => signOutUser()}>Sign out</button></div>
    </section>
  );
}

function Emails({ prefs, features }) {
  const { showToast } = useContext(AppContext);
  const [busy, setBusy] = useState(false);
  const toggle = async (key, value) => {
    setBusy(true);
    try {
      const d = await request("/profile/notifications", { method: "PUT", body: { [key]: value } });
      patchState({ prefs: d.prefs });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="den-set" aria-labelledby="set-mail-h">
      <div className="den-set-head"><h3 className="info-h" id="set-mail-h">Emails we send</h3></div>
      <ul className="den-prefs">
        <li>
          <span><b>Order updates</b><span className="muted">Receipts, dispatch and delivery. These always go out, because they're about something you bought.</span></span>
          <span className="den-pref-fixed">Always on</span>
        </li>
        {features.prefs && prefs && (
          <li>
            <label htmlFor="pref-restock"><b>Back in your size</b><span className="muted">One email when a size you asked about is back. Nothing else.</span></label>
            <input id="pref-restock" type="checkbox" className="den-switch" checked={prefs.restock !== false} disabled={busy} onChange={(e) => toggle("restock", e.target.checked)} />
          </li>
        )}
      </ul>
      <p className="muted">We don't send newsletters or offers.</p>
    </section>
  );
}

// everything we hold for the account, gathered from the same endpoints the site uses
async function gatherData(user, wishlist) {
  const safe = (p, pick) => request(p).then(pick).catch((e) => ({ error: e.message }));
  const [addresses, orders, styleProfile, alerts, prefs, membership] = await Promise.all([
    safe("/profile/addresses", (d) => d.addresses),
    safe("/profile/orders", (d) => d.orders),
    safe("/user/style-profile", (d) => d.profile),
    safe("/profile/restock-alerts", (d) => d.alerts),
    safe("/profile/notifications", (d) => d.prefs),
    safe("/profile/membership", (d) => d),
  ]);
  return {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, name: user.full_name || user.name || "", phone: user.phone || "", role: user.role, membership },
    addresses, orders, saved: wishlist, style_profile: styleProfile, restock_alerts: alerts, email_choices: prefs,
    note: "Payment card details are never stored by VelvetWolf; payments go through Cashfree.",
  };
}

function YourData() {
  const { user, wishlist, showToast } = useContext(AppContext);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const data = await gatherData(user, wishlist);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `velvetwolf-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      showToast("Couldn't put your data together. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="den-set" aria-labelledby="set-data-h">
      <div className="den-set-head"><h3 className="info-h" id="set-data-h">Your data</h3></div>
      <p className="muted">One file with everything we hold for this account: profile, addresses, orders, saved tees and your Wolf Type. <Link to="/privacy-policy">How we use it</Link>.</p>
      <div className="acct-actions"><button className="btn btn-small" type="button" disabled={busy} onClick={download}>{busy ? "Gathering it…" : "Download my data"}</button></div>
    </section>
  );
}

// Delete account: unchanged. The customer types DELETE to confirm. Past orders stay on record
// (unlinked from the account) so deliveries and refunds still work.
function DeleteAccount() {
  const { signOutUser, showToast } = useContext(AppContext);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeletingAccount(true);
    try {
      await request("/profile/delete", { method: "POST", body: { confirm: "DELETE" } });
      await signOutUser({ forget: true });
      showToast("Your account has been deleted.", "info");
    } catch (err) {
      showToast(err.message || "Could not delete your account.", "error");
      setDeletingAccount(false);
    }
  };
  return (
    <section className="den-set den-delete" aria-labelledby="set-del-h">
      <div className="den-set-head"><h3 className="info-h" id="set-del-h">Delete account</h3></div>
      <p className="muted">
        This permanently removes your profile, saved addresses, wishlist and style profile. Orders you've already placed are still delivered, and their records are kept for tax and refunds. This can't be undone.
      </p>
      <div className="form-row">
        <label htmlFor="del-confirm">Type DELETE to confirm</label>
        <div className="den-del-row">
          <input id="del-confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())} placeholder="DELETE" disabled={deletingAccount} autoComplete="off" spellCheck="false" />
          <button type="button" className="btn btn-small btn-danger" onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE" || deletingAccount}>
            {deletingAccount ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function SettingsTab({ prefs, features }) {
  const { user } = useContext(AppContext);
  return (
    <div className="den-settings">
      <Profile />
      <Addresses />
      <SignIn />
      <Emails prefs={prefs} features={features} />
      <YourData />
      {!user?.isAdmin && <DeleteAccount />}
    </div>
  );
}
