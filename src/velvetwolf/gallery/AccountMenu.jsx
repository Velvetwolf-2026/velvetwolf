// The Account item in the header. Signed out it links to sign in; signed in it
// opens a small menu: who you're signed in as (your email, or your number on a
// mobile account), the account tabs, and Sign out.
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { AppContext } from "../pages/AppContext";
import { TabIcon } from "../account/icons";
import "./alerts.css";

const MOBILE_DOMAIN = "@mobile.velvetwolf.in";

function signedInAs(user) {
  const email = String(user?.email || "");
  if (email && !email.endsWith(MOBILE_DOMAIN)) return email;
  const phone = user?.phone || (email.endsWith(MOBILE_DOMAIN) ? email.slice(0, -MOBILE_DOMAIN.length) : "");
  return phone ? `+91 ${phone}` : "";
}

const LINKS = [
  ["/account", "Your Den"],
  ["/account?tab=orders", "Orders"],
  ["/account?tab=saved", "Saved"],
  ["/account?tab=settings", "Settings"],
];

export default function AccountMenu() {
  const { user, signOutUser } = useContext(AppContext);
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => { setOpen(false); }, [pathname, search]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    addEventListener("mousedown", onDown);
    addEventListener("touchstart", onDown, { passive: true });
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("mousedown", onDown);
      removeEventListener("touchstart", onDown);
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link to="/login" aria-current={pathname === "/login" || pathname === "/signup" ? "page" : undefined} title="Sign in or create an account">
        {/* phones show the icon; the word stays for screen readers */}
        <span className="nav-label">Sign in</span>
        <TabIcon name="person" className="nav-icon" />
      </Link>
    );
  }

  const who = signedInAs(user);
  return (
    <div className="vwg-acct" ref={wrapRef}>
      <button ref={btnRef} type="button" className="vwg-acct-btn" aria-expanded={open} aria-controls="vwg-acct-menu"
        aria-current={pathname === "/account" ? "page" : undefined} onClick={() => setOpen((o) => !o)}>
        <span className="nav-label">Account</span>
        <TabIcon name="person" className="nav-icon" />
      </button>
      {open && (
        <div className="vwg-acct-menu" id="vwg-acct-menu">
          {who && <p className="vwg-acct-who"><span>Signed in as</span><b>{who}</b></p>}
          <ul>
            {LINKS.map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}
          </ul>
          <button type="button" className="vwg-acct-out" onClick={() => { setOpen(false); signOutUser(); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}
