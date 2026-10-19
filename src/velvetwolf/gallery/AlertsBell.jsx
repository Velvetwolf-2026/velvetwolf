// The alerts bell in the header (signed in only). It opens a drawer with what's worth knowing,
// from real data only: a size you waited on is back, an order is on its way or out for delivery,
// a delivered tee hasn't had its fit rated. The count is what you haven't opened yet.
import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { AppContext } from "../pages/AppContext";
import { useAccountStore, resetAccount, loadOrders, loadExtras, alertsFor, readSeen, markSeen } from "../account/store";
import { TabIcon } from "../account/icons";
import "./alerts.css";

export default function AlertsBell() {
  const { user } = useContext(AppContext);
  const store = useAccountStore();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => new Set());
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const userId = user?.id || null;

  // load after the page itself has settled; the account page shares the same data
  useEffect(() => {
    resetAccount(userId);
    if (!userId) return undefined;
    setSeen(readSeen(userId));
    const t = setTimeout(() => { loadOrders(); loadExtras(); }, 2500);
    return () => clearTimeout(t);
  }, [userId]);

  const items = alertsFor(store);
  const fresh = items.filter((a) => !seen.has(a.id)).length;

  const show = () => {
    setOpen(true);
    loadOrders(true); loadExtras(true);
  };
  const close = () => {
    setOpen(false);
    if (userId && items.length) { markSeen(userId, items.map((a) => a.id)); setSeen(readSeen(userId)); }
    btnRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!userId) return null;
  const loading = !store.ready || store.orders === null;

  return (
    <>
      <button ref={btnRef} className="vwg-bell" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={show}
        aria-label={fresh ? `Alerts, ${fresh} new` : "Alerts"}>
        <TabIcon name="bell" className="vwg-bell-icon" />
        {fresh > 0 && <span className="vwg-bell-dot" aria-hidden="true">{fresh > 9 ? "9+" : fresh}</span>}
      </button>
      {open && createPortal(
        <div className="vwg-alerts" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <section className="vwg-alerts-panel" role="dialog" aria-modal="true" aria-labelledby="alerts-h" tabIndex={-1} ref={panelRef}>
            <header className="vwg-alerts-head">
              <h2 id="alerts-h">Alerts</h2>
              <button className="vwg-alerts-x" type="button" onClick={close} aria-label="Close alerts">×</button>
            </header>
            {loading && !items.length ? (
              <p className="vwg-alerts-empty" role="status">Checking…</p>
            ) : !items.length ? (
              <p className="vwg-alerts-empty">Nothing new. Orders on their way and sizes you're waiting for show up here.</p>
            ) : (
              <ul className="vwg-alerts-list">
                {items.map((a) => (
                  <li key={a.id} className={seen.has(a.id) ? "" : "is-new"}>
                    <Link to={a.href || `/account?tab=${a.tab || "den"}`} onClick={close}>
                      <b>{a.title}</b>
                      <span>{a.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <footer className="vwg-alerts-foot"><Link to="/account" onClick={close}>Your account</Link></footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
