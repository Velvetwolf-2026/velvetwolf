// Saved: the tees someone saved, each with their size picked. When that size is sold out they
// can ask to be told when it's back (one email, then it's done). The list can be shared as a
// link for gifting: the link shows their first name and the tees, nothing else.
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router";
import { AppContext } from "../pages/AppContext";
import { money, photoFor, colorwaysOf, productHref } from "../gallery/galleryProducts";
import { COLORWAYS } from "../gallery/data";
import { request, optional } from "./api";
import { FIT_SIZES } from "./fit";
import { patchState, refreshAlerts } from "./store";

function SavedItem({ product, stock, alerts, features, defaultSize }) {
  const { addToCart, toggleWishlist, showToast } = useContext(AppContext);
  const sizes = FIT_SIZES.filter((s) => !product.sizes?.length || product.sizes.includes(s));
  const [size, setSize] = useState(sizes.includes(defaultSize) ? defaultSize : sizes[0] || "M");
  const [busy, setBusy] = useState(false);
  const colorId = colorwaysOf(product)[0];
  const color = COLORWAYS[colorId]?.site || product.colors?.[0] || "";
  const units = stock ? stock[size] ?? 0 : null; // null: unknown, so we don't claim it's sold out
  const waiting = alerts.find((a) => a.productId === product.id && a.size === size && !a.notifiedAt);
  const src = photoFor(product, colorId);

  const wait = async () => {
    setBusy(true);
    try {
      const { alert } = await request("/profile/restock-alerts", { method: "POST", body: { productId: product.id, size } });
      patchState((s) => ({ alerts: [alert, ...(s.alerts || []).filter((a) => a.id !== alert.id)] }));
      showToast(`We'll email you when ${size} is back.`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const stopWaiting = async () => {
    setBusy(true);
    try {
      await request(`/profile/restock-alerts/${waiting.id}`, { method: "DELETE" });
      patchState((s) => ({ alerts: (s.alerts || []).filter((a) => a.id !== waiting.id) }));
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="den-saved">
      <Link className="den-saved-photo" to={productHref(product)} tabIndex={-1} aria-hidden="true">
        {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : null}
      </Link>
      <div className="den-saved-body">
        <div className="den-saved-head">
          <Link className="den-line-name" to={productHref(product)}>{product.name}</Link>
          <span className="den-line-price">{money(product.price)}</span>
        </div>
        <div className="den-sizes" role="radiogroup" aria-label={`Size for ${product.name}`}>
          {sizes.map((s) => {
            const out = stock && !(stock[s] > 0);
            return (
              <button key={s} type="button" role="radio" aria-checked={size === s} className={`den-size${out ? " is-out" : ""}`} onClick={() => setSize(s)}>
                {s}{out && <span className="sr-only"> (sold out)</span>}
              </button>
            );
          })}
        </div>
        <div className="acct-actions">
          {units === null || units > 0 ? (
            <button className="btn btn-small btn-primary" type="button" onClick={() => addToCart(product, size, color, 1)}>Add {size} to cart</button>
          ) : waiting ? (
            <>
              <span className="den-wait">We'll email you when {size} is back.</span>
              <button className="text-btn" type="button" disabled={busy} onClick={stopWaiting}>Stop waiting</button>
            </>
          ) : features.restock ? (
            <button className="btn btn-small" type="button" disabled={busy} onClick={wait}>Tell me when {size} is back</button>
          ) : (
            <span className="den-wait">{size} is sold out.</span>
          )}
          <button className="text-btn" type="button" onClick={() => toggleWishlist(product)}>Remove</button>
        </div>
      </div>
    </li>
  );
}

function ShareList({ count }) {
  const { showToast } = useContext(AppContext);
  const [token, setToken] = useState(undefined); // undefined: loading, null: not shared
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    optional("/wishlist/share", (d) => d.token || null).then((t) => live && setToken(t ?? null)).catch(() => live && setToken(null));
    return () => { live = false; };
  }, []);
  const url = token ? `${location.origin}/saved/${token}` : "";
  const set = async (enabled) => {
    setBusy(true);
    try {
      const d = await request("/wishlist/share", { method: "POST", body: { enabled } });
      setToken(d.token || null);
      showToast(enabled ? "Your list has a link now." : "That link no longer works.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); showToast("Link copied."); } catch { showToast("Select the link and copy it.", "info"); }
  };
  const share = async () => {
    try { await navigator.share({ title: "My VelvetWolf list", url }); } catch { /* closed */ }
  };
  if (token === undefined) return null;
  return (
    <section className="info-card den-share" aria-labelledby="den-share-h">
      <h3 className="info-h" id="den-share-h">Share your list</h3>
      <p className="muted">For gifting. Anyone with the link sees your first name and these {count === 1 ? "tee" : "tees"}, nothing else. Turn it off and the link stops working.</p>
      {token ? (
        <>
          <input className="den-share-url" readOnly value={url} aria-label="Your list's link" onFocus={(e) => e.target.select()} />
          <div className="acct-actions">
            <button className="btn btn-small btn-primary" type="button" onClick={copy}>Copy link</button>
            {typeof navigator !== "undefined" && navigator.share && <button className="btn btn-small" type="button" onClick={share}>Share</button>}
            <button className="text-btn" type="button" disabled={busy} onClick={() => set(false)}>Stop sharing</button>
          </div>
        </>
      ) : (
        <div className="acct-actions"><button className="btn btn-small" type="button" disabled={busy} onClick={() => set(true)}>Make a link</button></div>
      )}
    </section>
  );
}

export default function SavedTab({ wishlist, alerts, features, defaultSize }) {
  const [stock, setStock] = useState(null);
  const ids = wishlist.map((p) => p.id).join(",");
  useEffect(() => {
    if (!ids) return undefined;
    let live = true;
    optional(`/wishlist/stock?ids=${encodeURIComponent(ids)}`, (d) => d.stock).then((s) => live && setStock(s)).catch(() => {});
    return () => { live = false; };
  }, [ids]);
  useEffect(() => { refreshAlerts(); }, []);

  const backElsewhere = (alerts || []).filter((a) => a.back && a.product && !wishlist.some((p) => p.id === a.productId));

  if (!wishlist.length && !backElsewhere.length) {
    return (
      <div className="den-empty">
        <p className="den-empty-h">Nothing saved yet.</p>
        <p className="muted">Tap the heart on any tee to keep it here. If your size sells out, you can ask us to tell you when it's back.</p>
        <Link className="btn btn-primary" to="/shop">See the tees</Link>
      </div>
    );
  }
  return (
    <div className="den-saved-wrap">
      {backElsewhere.length > 0 && (
        <section className="info-card" aria-labelledby="den-back-h">
          <h3 className="info-h" id="den-back-h">Back in your size</h3>
          <ul className="den-back">
            {backElsewhere.map((a) => (
              <li key={a.id}><Link to={`/product/${a.product.slug || a.product.id}`}>{a.product.name}</Link> is back in {a.size}.</li>
            ))}
          </ul>
        </section>
      )}
      {wishlist.length > 0 && (
        <ul className="den-saved-list">
          {wishlist.map((p) => (
            <SavedItem key={p.id} product={p} stock={stock?.[p.id] || (stock ? {} : null)} alerts={alerts || []} features={features} defaultSize={defaultSize} />
          ))}
        </ul>
      )}
      {features.share && wishlist.length > 0 && <ShareList count={wishlist.length} />}
    </div>
  );
}
