// Settings, in groups: profile, addresses, how you sign in, emails, your data, and deleting the
// account (wording and behaviour unchanged from before).
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router";
import { AppContext } from "../pages/AppContext";
import { updateProfile, sendEmailUpdateOtp, verifyEmailUpdateOtp } from "../utils/profile";
import { request } from "./api";
import { patchState } from "./store";
import Addresses from "./Addresses";

const MOBILE_DOMAIN = "@mobile.velvetwolf.in";
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v);

function displayNameOf(user) {
  const n = user?.full_name || user?.name || "";
  return /^mobile( |$)/i.test(n) ? "" : n;
}

function Profile() {
  const { user, setUser, showToast } = useContext(AppContext);
  const [name, setName] = useState(displayNameOf(user));
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const mobileOnly = String(user?.email || "").endsWith(MOBILE_DOMAIN);

  // changing email: a code to the new address first
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailErr, setEmailErr] = useState("");

  const shownName = displayNameOf(user);
  const shownPhone = user?.phone || "";
  useEffect(() => { setName(shownName); setPhone(shownPhone); }, [shownName, shownPhone]);

  const save = async (e) => {
    e.preventDefault();
    const n = name.trim();
    const next = {};
    if (!n) next.name = "Enter your name.";
    else if (!/^[a-zA-Z\s.'-]+$/.test(n)) next.name = "Use letters only.";
    if (phone && !/^[6-9]\d{9}$/.test(phone)) next.phone = "Enter a 10-digit Indian mobile number.";
    setErr(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const profile = await updateProfile(user.id, { fullName: n, phone: phone.trim(), gender: user?.gender ?? null, dob: user?.date_of_birth ?? null });
      const nextUser = { ...user, ...profile, full_name: profile?.full_name || n, name: profile?.full_name || n, phone: profile?.phone || phone.trim() };
      setUser(nextUser);
      try { localStorage.setItem("user", JSON.stringify(nextUser)); } catch { /* storage unavailable */ }
      showToast("Saved.");
    } catch (error) {
      showToast(error.message || "Couldn't save that.", "error");
    } finally {
      setSaving(false);
    }
  };

  const sendCode = async () => {
    if (!isEmail(newEmail.trim())) { setEmailErr("Enter an email address like name@example.com."); return; }
    setEmailBusy(true); setEmailErr("");
    try { await sendEmailUpdateOtp(newEmail.trim()); setSent(true); } catch (error) { setEmailErr(error.message || "Couldn't send the code."); } finally { setEmailBusy(false); }
  };
  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { setEmailErr("The code is 6 digits."); return; }
    setEmailBusy(true); setEmailErr("");
    try {
      const result = await verifyEmailUpdateOtp(newEmail.trim(), code);
      const nextUser = { ...user, ...result.user };
      setUser(nextUser);
      try { localStorage.setItem("user", JSON.stringify(nextUser)); } catch { /* storage unavailable */ }
      showToast("Email updated.");
      setEmailOpen(false); setSent(false); setNewEmail(""); setCode("");
    } catch (error) {
      setEmailErr(error.message || "That code didn't work.");
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <section className="den-set" aria-labelledby="set-prof-h">
      <div className="den-set-head"><h3 className="info-h" id="set-prof-h">Profile</h3></div>
      <form className="den-grid-2" onSubmit={save} noValidate>
        <div className="form-row">
          <label htmlFor="pf-name">Full name</label>
          <input id="pf-name" autoComplete="name" maxLength={80} value={name} onChange={(e) => { setName(e.target.value); setErr((x) => ({ ...x, name: "" })); }}
            aria-invalid={err.name ? "true" : undefined} aria-describedby={err.name ? "pf-name-err" : undefined} />
          {err.name && <p className="field-error" id="pf-name-err">{err.name}</p>}
        </div>
        <div className="form-row">
          <label htmlFor="pf-phone">Mobile <span className="opt">optional</span></label>
          <input id="pf-phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr((x) => ({ ...x, phone: "" })); }}
            aria-invalid={err.phone ? "true" : undefined} aria-describedby={err.phone ? "pf-phone-err" : undefined} />
          {err.phone && <p className="field-error" id="pf-phone-err">{err.phone}</p>}
        </div>
        <div className="acct-actions den-span-2"><button className="btn btn-small btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button></div>
      </form>

      <div className="den-email">
        <p className="eyebrow">Email</p>
        <p>{mobileOnly ? "No email linked yet. Link one to get receipts and delivery updates by email." : user?.email}</p>
        {!emailOpen ? (
          <button className="text-btn" type="button" onClick={() => { setEmailOpen(true); setSent(false); setEmailErr(""); }}>{mobileOnly ? "Link an email" : "Change email"}</button>
        ) : (
          <div className="den-email-form">
            {!sent ? (
              <div className="form-row">
                <label htmlFor="pf-email">New email</label>
                <input id="pf-email" type="email" inputMode="email" autoComplete="email" value={newEmail} disabled={emailBusy} onChange={(e) => { setNewEmail(e.target.value); setEmailErr(""); }} />
                <p className="field-hint">We'll send a 6-digit code there to check it's yours.</p>
              </div>
            ) : (
              <div className="form-row">
                <label htmlFor="pf-code">Code sent to {newEmail}</label>
                <input id="pf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={emailBusy} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setEmailErr(""); }} />
              </div>
            )}
            {emailErr && <p className="field-error" role="alert">{emailErr}</p>}
            <div className="acct-actions">
              {!sent
                ? <button className="btn btn-small btn-primary" type="button" disabled={emailBusy} onClick={sendCode}>{emailBusy ? "Sending…" : "Send code"}</button>
                : <button className="btn btn-small btn-primary" type="button" disabled={emailBusy} onClick={verify}>{emailBusy ? "Checking…" : "Confirm"}</button>}
              <button className="btn btn-small" type="button" disabled={emailBusy} onClick={() => (sent ? setSent(false) : setEmailOpen(false))}>{sent ? "Back" : "Cancel"}</button>
            </div>
          </div>
        )}
      </div>
    </section>
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
          ? <>You sign in with a code we text to {user?.phone ? `+91 ${user.phone}` : "your mobile"}.</>
          : <>You sign in with a 6-digit code we email to {user?.email}, or with Google on the same address.</>}
      </p>
      <div className="acct-actions"><button className="btn btn-small" type="button" onClick={signOutUser}>Sign out</button></div>
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
      await signOutUser();
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
