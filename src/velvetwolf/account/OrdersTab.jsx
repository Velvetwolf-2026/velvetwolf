// Orders: one card per order with the tee photos and a small route showing its real stage
// (the same seven stages as Track order). Delivered tees ask "How's the fit?" once, and every
// line can be ordered again in the same size and colour.
import { useContext, useState } from "react";
import { Link } from "react-router";
import { AppContext } from "../pages/AppContext";
import { TRACK_STAGES, BUSINESS } from "../gallery/help/content";
import { money, cartThumb } from "../gallery/galleryProducts";
import { request } from "./api";
import { stageOf, orderRef, patchState, loadOrders } from "./store";

const FITS = [["tight", "Tight"], ["right", "Right"], ["roomy", "Roomy"]];
const day = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function OrderRoute({ stage, compact = false }) {
  if (stage < 0) return <p className="den-route-off">Cancelled</p>;
  const label = TRACK_STAGES[stage]?.label || "";
  return (
    <div className={`den-route${compact ? " is-compact" : ""}`} role="img" aria-label={`Stage ${stage + 1} of ${TRACK_STAGES.length}: ${label}`}>
      <ol aria-hidden="true" style={{ "--p": stage / (TRACK_STAGES.length - 1) }}>
        {TRACK_STAGES.map((s, i) => <li key={s.id} className={i < stage ? "is-done" : i === stage ? "is-now" : ""} />)}
      </ol>
      <p className="den-route-now">{label}</p>
    </div>
  );
}

function FitAsk({ order, item, onSaved }) {
  const { showToast } = useContext(AppContext);
  const [busy, setBusy] = useState("");
  const pick = async (fit) => {
    setBusy(fit);
    try {
      await request(`/profile/orders/${order.id}/items/${item.id}/fit`, { method: "POST", body: { fit } });
      onSaved(fit);
      showToast("Thanks. That tunes your size.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy("");
    }
  };
  if (item.fit_feedback) {
    return <p className="den-fit-done">Fit: <b>{FITS.find(([k]) => k === item.fit_feedback)?.[1]}</b></p>;
  }
  return (
    <div className="den-fit" role="group" aria-label={`How's the fit on ${item.product_name}?`}>
      <span>How's the fit?</span>
      {FITS.map(([k, l]) => (
        <button key={k} type="button" className="den-chip" disabled={Boolean(busy)} onClick={() => pick(k)}>{busy === k ? "…" : l}</button>
      ))}
    </div>
  );
}

function OrderCard({ order, productsById, features, email }) {
  const { addToCart } = useContext(AppContext);
  const stage = stageOf(order.status);
  const pending = String(order.status).toLowerCase() === "pending";
  const delivered = stage === 6;
  const items = order.order_items || [];
  const ref = orderRef(order);
  const trackHref = `/track-order?order=${encodeURIComponent(order.id)}${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  const savedFit = (itemId, fit) => patchState((s) => ({
    orders: (s.orders || []).map((o) => (o.id !== order.id ? o : { ...o, order_items: o.order_items.map((i) => (i.id === itemId ? { ...i, fit_feedback: fit } : i)) })),
  }));

  return (
    <article className="den-order" aria-labelledby={`ord-${order.id}`}>
      <header className="den-order-head">
        <h3 id={`ord-${order.id}`}>Order #{ref}</h3>
        <p className="muted">{day(order.created_at)} · {money(order.total_amount)}</p>
      </header>
      {pending
        ? <p className="den-order-note">Waiting for payment. If you paid, this updates once your bank confirms it.</p>
        : <OrderRoute stage={stage} />}
      <ul className="den-lines">
        {items.map((i) => {
          const product = productsById.get(i.product_id);
          const src = product ? cartThumb({ ...product, color: i.color }) : "";
          const canReorder = product && product.isActive !== false && !pending;
          return (
            <li key={i.id} className="den-line">
              <span className="den-line-photo">{src ? <img src={src} alt="" loading="lazy" decoding="async" /> : null}</span>
              <span className="den-line-info">
                {product ? <Link className="den-line-name" to={`/product/${product.slug || product.id}`}>{i.product_name}</Link> : <span className="den-line-name">{i.product_name}</span>}
                <span className="muted">{[i.color, i.size && `Size ${i.size}`, i.quantity > 1 && `${i.quantity} pieces`].filter(Boolean).join(" · ")}</span>
                {delivered && features.fit && i.product_id && <FitAsk order={order} item={i} onSaved={(f) => savedFit(i.id, f)} />}
              </span>
              <span className="den-line-end">
                <span className="den-line-price">{money(i.total_price ?? i.unit_price * i.quantity)}</span>
                {canReorder && (
                  <button className="text-btn" type="button" onClick={() => addToCart(product, i.size, i.color, 1)}>Reorder same size</button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <footer className="acct-actions den-order-foot">
        {!pending && stage >= 0 && <Link className="btn btn-small" to={trackHref}>Track</Link>}
        {delivered && <Link className="btn btn-small" to="/returns">Return or exchange</Link>}
        <a className="text-btn" href={`mailto:${BUSINESS.emails.orders}?subject=${encodeURIComponent(`Order #${ref}`)}`}>Something wrong?</a>
      </footer>
    </article>
  );
}

export default function OrdersTab({ orders, ordersError, productsById, features, email }) {
  if (orders === null && !ordersError) return <p className="den-loading" role="status">Getting your orders…</p>;
  if (ordersError && !orders) {
    return (
      <div className="den-empty" role="alert">
        <p>{ordersError}</p>
        <button className="btn btn-small" type="button" onClick={() => loadOrders(true)}>Try again</button>
      </div>
    );
  }
  if (!orders.length) {
    return (
      <div className="den-empty">
        <p className="den-empty-h">Nothing here yet.</p>
        <p className="muted">When you order, it shows up here with where it is on its way to you.</p>
        <Link className="btn btn-primary" to="/shop">See the tees</Link>
      </div>
    );
  }
  return (
    <div className="den-orders">
      {orders.map((o) => <OrderCard key={o.id} order={o} productsById={productsById} features={features} email={email} />)}
    </div>
  );
}
