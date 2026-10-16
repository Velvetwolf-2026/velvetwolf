// Privacy notice (gallery help page). In the hall: a glass vitrine holding one object for each
// kind of data we keep; pointing at a row of "Everything we hold" lights its object.
import { useEffect, useRef, useState } from "react";
import HelpLayout, { DocBody } from "../gallery/help/HelpLayout";
import { useGallery } from "../gallery/galleryContext";
import { PRIVACY } from "../gallery/help/content";

export function meta() {
  return [{ title: "Privacy policy · VelvetWolf" }, { name: "description", content: "What VelvetWolf collects, why, and who sees it. We don't sell your data." }];
}

// what we keep (one object each in the vitrine)
const HOLD = [
  { id: "contact", label: "Email, name and phone", why: "To send your receipt and delivery updates, and to sign you in." },
  { id: "address", label: "Delivery address", why: "So the courier can find you. Saved only if you ask." },
  { id: "order", label: "Your orders", why: "What you bought and when, for delivery, returns and tax records." },
  { id: "payment", label: "Payment reference", why: "Cashfree's reference for the payment, not your card or UPI details." },
];

export default function PrivacyPolicy() {
  const motifRef = useRef(null);

  // the vitrine holds one object per kind of data we keep; pointing at a row lights it
  const { engine } = useGallery();
  const [focus, setFocus] = useState(null);
  useEffect(() => { engine?.help.privacy.set({ focus }); }, [engine, focus]);

  return (
    <HelpLayout page="privacy-policy" eyebrow="Policy" title="Privacy" motifRef={motifRef} doc updated
      lede="What we collect, why, and who sees it. We don't sell your data.">
      <section className="info-card hold-card" aria-labelledby="hold-h">
        <h2 className="info-h" id="hold-h">Everything we hold, on display</h2>
        <p className="muted">This is the whole list. Point at a row to see it in the case.</p>
        <ul className="hold-list" onMouseLeave={() => setFocus(null)}>
          {HOLD.map((h) => (
            <li key={h.id}>
              <button type="button" className="hold-row" aria-pressed={focus === h.id}
                onMouseEnter={() => setFocus(h.id)} onFocus={() => setFocus(h.id)} onBlur={() => setFocus(null)} onClick={() => setFocus(h.id)}>
                <b>{h.label}</b><span>{h.why}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="fine">Card, UPI and bank details stay with Cashfree; we only keep the payment reference.</p>
      </section>
      <DocBody sections={PRIVACY} />
    </HelpLayout>
  );
}
