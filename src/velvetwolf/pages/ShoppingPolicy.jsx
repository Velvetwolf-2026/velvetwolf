// Shipping policy (gallery help page). In the hall: a dispatch runway in business days where
// Express pulls ahead of Standard. The estimator draws packing and transit as bars and gives a
// delivery date range from today.
import { useEffect, useState } from "react";
import HelpLayout, { DocSections } from "../gallery/help/HelpLayout";
import { useGallery } from "../gallery/galleryContext";
import { SHIPPING, BUSINESS } from "../gallery/help/content";
import { nowIST, addWorkingDays, fmtDay } from "../gallery/help/motifs";
import { money } from "../gallery/galleryProducts";

export function meta() {
  return [{ title: "Shipping policy · VelvetWolf" }, { name: "description", content: "Free standard delivery across India, Express for ₹149. Dispatched in 2 to 3 business days." }];
}

const E = BUSINESS.emails;
const mail = (a) => `<a href="mailto:${a}">${a}</a>`;
const SCALE = 16; // days shown on the ruler
const pct = (v) => `${((v / SCALE) * 100).toFixed(2)}%`;

const SECTIONS = [
  { id: "options", h: "Delivery options", body: [
    <table className="info-table" key="t">
      <thead><tr><th>Option</th><th>Time after dispatch</th><th>Cost</th></tr></thead>
      <tbody>{SHIPPING.methods.map((m) => <tr key={m.id}><th scope="row">{m.label}</th><td>{m.days[0]} to {m.days[1]} working days</td><td>{m.price ? money(m.price) : "Free on every order"}</td></tr>)}</tbody>
    </table>,
    `Orders leave the studio within ${SHIPPING.dispatch[0]} to ${SHIPPING.dispatch[1]} business days. ${SHIPPING.remote.label} take ${SHIPPING.remote.extra[0]} to ${SHIPPING.remote.extra[1]} days longer.`,
  ] },
  { id: "where", h: "Where we deliver", body: ["Everywhere in India that our courier partners reach. We don't ship outside India yet."] },
  { id: "pay", h: "Prepaid only", body: [`Every order is paid at checkout by UPI, card, netbanking or wallet through ${BUSINESS.processor}. We don't offer cash on delivery.`] },
  { id: "tracking", h: "Tracking", body: ["When your order ships, we email you the courier and tracking link, and, if you asked for it at checkout, send it on WhatsApp. You can also follow it on our <a href=\"/track-order\">tracking page</a>."] },
  { id: "changes", h: "Changing an order or address", body: [`Write to ${mail(E.orders)} within 1 hour of ordering. After that it may already be in production. Please check the address and phone number at checkout; the courier calls that number if they can't find you.`] },
  { id: "damage", h: "Damaged, lost or late", body: [`If a parcel arrives damaged, send photos of the parcel and the tee to ${mail(E.returns)} within 24 hours and we replace it or refund you. If tracking stops for 48 hours or a parcel is lost, we take it up with the courier and make it right.`] },
  { id: "invoice", h: "GST invoice", body: ["GST is shown at checkout, and a GST invoice is emailed when your order ships. For a business invoice, email your GSTIN to us within 48 hours of ordering."] },
  { id: "bulk", h: "Bulk orders", body: [`For 10 or more pieces, write to ${mail(E.bulk)}. We send a quote within 24 hours.`] },
];

export default function ShoppingPolicy() {
  const [method, setMethod] = useState("standard");
  const [remote, setRemote] = useState(false);

  const m = SHIPPING.methods.find((x) => x.id === method);
  const extra = remote ? SHIPPING.remote.extra : [0, 0];
  const d = SHIPPING.dispatch;
  const minT = d[0] + m.days[0] + extra[0], maxT = d[1] + m.days[1] + extra[1];
  const today = nowIST();

  // the runway: both parcels leave together; Express pulls ahead. Days are the middle of each
  // method's window (packing + transit, plus the remote-area extra).
  const { engine } = useGallery();
  const mid = (x) => (d[0] + d[1]) / 2 + (x.days[0] + x.days[1]) / 2 + (extra[0] + extra[1]) / 2;
  const daysStd = mid(SHIPPING.methods[0]), daysExp = mid(SHIPPING.methods[1]);
  useEffect(() => {
    engine?.help.shipping.set({ days: { standard: daysStd, express: daysExp }, method });
  }, [engine, daysStd, daysExp, method]);

  return (
    <HelpLayout page="shipping-policy" eyebrow="Policy" title="Shipping" updated
      lede={`Free standard delivery across India. Dispatched in ${d[0]} to ${d[1]} business days.`}>
      <section className="info-card ship-est" aria-labelledby="se-h">
        <h2 className="info-h" id="se-h">When will it arrive?</h2>
        <div className="se-controls">
          <div className="seg" role="radiogroup" aria-label="Delivery speed">
            {SHIPPING.methods.map((x) => (
              <label key={x.id}><input type="radio" name="se-method" value={x.id} checked={method === x.id} onChange={() => setMethod(x.id)} /><span>{x.label} · {x.price ? money(x.price) : "Free"}</span></label>
            ))}
          </div>
          <label className="check"><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /><span>Delivering to {SHIPPING.remote.label}</span></label>
        </div>
        <div className="se-bars" aria-hidden="true">
          <div className="se-row"><span className="se-label">Packing</span><div className="se-track">
            <i className="se-seg se-pack" style={{ left: 0, width: pct(d[0]) }} />
            <i className="se-seg se-pack se-maybe" style={{ left: pct(d[0]), width: pct(d[1] - d[0]) }} />
          </div></div>
          <div className="se-row"><span className="se-label">On the way</span><div className="se-track">
            <i className="se-seg se-go" style={{ left: pct(d[0]), width: pct(m.days[0] + extra[0]) }} />
            <i className="se-seg se-go se-maybe" style={{ left: pct(d[0] + m.days[0] + extra[0]), width: pct(maxT - minT) }} />
          </div></div>
          <div className="se-ruler">{Array.from({ length: SCALE + 1 }, (_, i) => <span key={i} style={{ left: pct(i) }}>{i % 2 ? "" : i}</span>)}</div>
        </div>
        <p className="se-answer" role="status" aria-live="polite">
          Order today and it should arrive between <b>{fmtDay(addWorkingDays(today, minT))}</b> and <b>{fmtDay(addWorkingDays(today, maxT))}</b>: {minT} to {maxT} working days.
        </p>
        <p className="fine">Estimates, counted in working days (Monday to Saturday). The courier's tracking page has the live date once it ships.</p>
      </section>
      <DocSections sections={SECTIONS} />
    </HelpLayout>
  );
}
