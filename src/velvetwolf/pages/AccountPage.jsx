// The account page, "The Den": your private room in the Gallery hall. The band at the top is the
// room in 3D (the tees you own on a short rail, saved pieces framed on the wall, your member card
// on a plinth; bare hangers in a pool of light until you collect). Every task happens in plain
// panels below it, in five tabs: Den, Orders, Saved, Fit & style, Settings. On phones the tabs
// sit in a bar at the bottom, within reach of a thumb.
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AppContext } from "./AppContext";
import { useGallery } from "../gallery/galleryContext";
import { cartThumb, photoFor } from "../gallery/galleryProducts";
import { useAccountStore, resetAccount, loadOrders, loadExtras, isDelivered, stageOf } from "../account/store";
import DenTab from "../account/DenTab";
import OrdersTab from "../account/OrdersTab";
import SavedTab from "../account/SavedTab";
import FitTab from "../account/FitTab";
import SettingsTab from "../account/SettingsTab";
import { TabIcon } from "../account/icons";
import "../gallery/gallery-help.css";
import "../account/account.css";

export function meta() {
  return [{ title: "Your account · VelvetWolf" }, { name: "description", content: "Your VelvetWolf orders, saved tees, size and settings in one place." }, { name: "robots", content: "noindex" }];
}

const TABS = [
  ["den", "Den"],
  ["orders", "Orders"],
  ["saved", "Saved"],
  ["fit", "Fit & style"],
  ["settings", "Settings"],
];
// the old account page's tab names still land in the right place
const OLD = { overview: "den", wishlist: "saved", preferences: "fit", style: "fit", addresses: "settings", notifications: "den" };

function nameOf(user) {
  const n = String(user?.full_name || user?.name || "").trim();
  if (n && !/^mobile( |$)/i.test(n)) return n;
  return user?.phone ? `+91 ${user.phone}` : "Member";
}

function SignedOut({ checking }) {
  return (
    <main className="vwg view-den is-out">
      <div className="den-band" aria-hidden="true" />
      <section className="den-body">
        <div className="den-wrap den-out">
          {checking ? (
            <p className="den-loading" role="status">Opening your account…</p>
          ) : (
            <>
              <p className="eyebrow">Account</p>
              <h1 className="den-title">Your room in the hall</h1>
              <p className="muted">Sign in to see your orders, the tees you've saved and your size. No password: we send you a code.</p>
              <div className="acct-actions">
                <Link className="btn btn-primary" to="/login">Sign in</Link>
                <Link className="btn" to="/signup">Create an account</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function AccountPage() {
  const { user, wishlist = [], products = [], userPreferences } = useContext(AppContext);
  const { engine } = useGallery();
  const store = useAccountStore();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") || "den";
  const tab = TABS.some(([t]) => t === raw) ? raw : OLD[raw] || "den";
  const [hinted, setHinted] = useState(true); // a cached session: wait for it before saying "sign in"

  useEffect(() => {
    let cached = false;
    try { cached = Boolean(localStorage.getItem("user")); } catch { /* storage unavailable */ }
    if (!cached) { setHinted(false); return undefined; }
    const t = setTimeout(() => setHinted(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // this person's data, loaded once and shared with the alerts bell
  useEffect(() => {
    resetAccount(user?.id || null);
    if (user?.id) { loadOrders(); loadExtras(); }
  }, [user?.id]);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // the room: owned tees on the rail, saved pieces on the wall, the card on its plinth
  useEffect(() => {
    if (!engine) return undefined;
    engine.setView("den", tab === "fit" ? "denFit" : "den");
    return undefined;
  }, [engine, tab]);
  useEffect(() => {
    if (!engine?.den || !user) return;
    const owned = [];
    for (const o of store.orders || []) {
      if (stageOf(o.status) < 1) continue; // paid orders only
      for (const i of o.order_items || []) {
        const p = productsById.get(i.product_id);
        if (owned.some((x) => x.key === `${i.product_id}|${i.color}`)) continue;
        owned.push({ key: `${i.product_id}|${i.color}`, name: i.product_name, color: i.color, delivered: isDelivered(o), src: p ? cartThumb({ ...p, color: i.color }) : "" });
      }
    }
    engine.den.set({
      owned: owned.slice(0, 5),
      saved: wishlist.slice(0, 3).map((p) => ({ name: p.name, src: photoFor(p) })).filter((p) => p.src),
      card: { name: nameOf(user), no: store.membership?.memberNo || null },
    });
  }, [engine, user, store.orders, store.membership, wishlist, productsById]);

  if (!user) return <SignedOut checking={hinted} />;

  const go = (t) => setParams((p) => { const n = new URLSearchParams(p); if (t === "den") n.delete("tab"); else n.set("tab", t); return n; }, { replace: false });
  const name = nameOf(user);

  return (
    <main className="vwg view-den">
      <div className="den-band" aria-hidden="true" />
      <section className="den-body">
        <div className="den-wrap">
          <header className="den-head">
            <p className="eyebrow">Account</p>
            <h1 className="den-title">The Den</h1>
          </header>
          <nav className="den-tabs" aria-label="Account">
            {TABS.map(([t, label]) => (
              <Link key={t} to={t === "den" ? "/account" : `/account?tab=${t}`} aria-current={tab === t ? "page" : undefined}
                onClick={(e) => { e.preventDefault(); go(t); }}>
                <TabIcon name={t} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="den-panel">
            <h2 className="sr-only">{TABS.find(([t]) => t === tab)[1]}</h2>
            {tab === "den" && <DenTab user={user} name={name} membership={store.membership} orders={store.orders} alerts={store.alerts} features={store.features} onTab={go} />}
            {tab === "orders" && <OrdersTab orders={store.orders} ordersError={store.ordersError} productsById={productsById} features={store.features} email={String(user.email || "").endsWith("@mobile.velvetwolf.in") ? "" : user.email} />}
            {tab === "saved" && <SavedTab wishlist={wishlist} alerts={store.alerts} features={store.features} defaultSize={userPreferences?.sizes?.[0] || "M"} />}
            {tab === "fit" && <FitTab orders={store.orders} personality={user.personality_type} memberNo={store.membership?.memberNo} />}
            {tab === "settings" && <SettingsTab prefs={store.prefs} features={store.features} />}
          </div>
        </div>
      </section>
    </main>
  );
}
