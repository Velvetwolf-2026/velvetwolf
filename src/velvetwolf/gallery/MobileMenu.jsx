// The phone menu (GalleryHeader). On phones the header keeps only the brand, the
// account, alerts and cart icons; everything else, including the help pages
// that otherwise live only in the footer, is one tap away here.
import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router";
import { AppContext } from "../pages/AppContext";
import { BUSINESS } from "./help/content";
import "./alerts.css";

const GROUPS = [
  ["Shop", [
    ["/shop", "All tees"],
    ["/#drop", "Drop 01: Quiet Hours"],
    ["/custom", "Studio: design your own"],
    ["/quiz", "Find your Wolf Type"],
    ["/bulk", "Bulk and corporate orders"],
  ]],
  ["Help", [
    ["/size-guide", "Size guide"],
    ["/track-order", "Track an order"],
    ["/shipping-policy", "Shipping"],
    ["/returns", "Returns and exchanges"],
    ["/faq", "FAQ"],
    ["/contact", "Contact us"],
  ]],
];

export default function MobileMenu() {
  const { user, signOutUser } = useContext(AppContext);
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // a link was followed: close
  useEffect(() => { setOpen(false); }, [pathname, hash]);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
      // keep Tab inside the menu while it's open
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll("a, button");
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    addEventListener("keydown", onKey);
    return () => { removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [open]);

  const close = () => { setOpen(false); btnRef.current?.focus(); };
  const here = (to) => (to === pathname ? "page" : undefined);

  return (
    <>
      <button ref={btnRef} className="vwg-menu-btn" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <span className="sr-only">Menu</span>
      </button>
      {open && createPortal(
        <div className="vwg-alerts vwg-menu" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <nav className="vwg-alerts-panel vwg-menu-panel" role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1} ref={panelRef}>
            <header className="vwg-alerts-head">
              <Link to="/" className="vwg-menu-brand" onClick={close}>VELVETWOLF</Link>
              <button className="vwg-alerts-x" type="button" onClick={close} aria-label="Close menu">×</button>
            </header>
            <div className="vwg-menu-body">
              {GROUPS.map(([title, links]) => (
                <section key={title}>
                  <h2>{title}</h2>
                  <ul>{links.map(([to, label]) => <li key={to}><Link to={to} aria-current={here(to)}>{label}</Link></li>)}</ul>
                </section>
              ))}
              <section>
                <h2>Account</h2>
                <ul>
                  {user ? (
                    <>
                      <li><Link to="/account" aria-current={here("/account")}>Your account</Link></li>
                      <li><Link to="/account?tab=orders">Orders</Link></li>
                      <li><Link to="/account?tab=saved">Saved tees</Link></li>
                      <li><button type="button" onClick={() => { setOpen(false); signOutUser(); }}>Sign out</button></li>
                    </>
                  ) : (
                    <>
                      <li><Link to="/login" aria-current={here("/login")}>Sign in</Link></li>
                      <li><Link to="/signup" aria-current={here("/signup")}>Create an account</Link></li>
                    </>
                  )}
                </ul>
              </section>
            </div>
            <footer className="vwg-alerts-foot vwg-menu-foot">
              <a href={`mailto:${BUSINESS.emails.info}`}>{BUSINESS.emails.info}</a>
              <a href={BUSINESS.whatsapp.href} target="_blank" rel="noopener noreferrer">WhatsApp {BUSINESS.whatsapp.label}</a>
            </footer>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
