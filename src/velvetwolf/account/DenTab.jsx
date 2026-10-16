// The Den: the member card, and below it only what needs you: an order on its way, a size
// you waited on that's back, a delivered tee to rate. Nothing at all is fine too.
import { Link } from "react-router";
import MemberCard from "./MemberCard";
import { OrderRoute } from "./OrdersTab";
import { stageOf, isActive, orderRef } from "./store";

export default function DenTab({ user, name, membership, orders, alerts, features, onTab }) {
  const active = (orders || []).filter(isActive);
  const back = (alerts || []).filter((a) => a.back && a.product);
  const toRate = features.fit ? (orders || []).filter((o) => stageOf(o.status) === 6 && (o.order_items || []).some((i) => i.product_id && !i.fit_feedback)).slice(0, 2) : [];
  const nothing = !active.length && !back.length && !toRate.length;

  return (
    <div className="den-home">
      <MemberCard name={name} membership={membership} personality={user?.personality_type} />
      <section className="den-needs" aria-labelledby="den-needs-h">
        <h2 className="eyebrow" id="den-needs-h">Needs you</h2>
        {orders === null ? (
          <p className="den-loading" role="status">Checking your orders…</p>
        ) : nothing ? (
          <p className="den-calm">Nothing needs you right now. <Link to="/shop">See what's new</Link>.</p>
        ) : (
          <ul className="den-needs-list">
            {active.map((o) => (
              <li key={o.id}>
                <button type="button" className="den-need" onClick={() => onTab("orders")}>
                  <span className="den-need-h">Order #{orderRef(o)}</span>
                  <OrderRoute stage={stageOf(o.status)} compact />
                </button>
              </li>
            ))}
            {back.map((a) => (
              <li key={a.id}>
                <Link className="den-need" to={`/product/${a.product.slug || a.product.id}`}>
                  <span className="den-need-h">{a.product.name} is back in {a.size}</span>
                  <span className="muted">The size you were waiting for.</span>
                </Link>
              </li>
            ))}
            {toRate.map((o) => (
              <li key={`rate-${o.id}`}>
                <button type="button" className="den-need" onClick={() => onTab("orders")}>
                  <span className="den-need-h">How's the fit?</span>
                  <span className="muted">Order #{orderRef(o)} arrived. One tap tunes your size.</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {user?.isAdmin && <p className="muted den-admin"><Link to="/admin">Open the admin dashboard</Link></p>}
      </section>
    </div>
  );
}
