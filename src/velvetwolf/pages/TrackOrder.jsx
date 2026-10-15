// Track order (gallery help page). Header: a route from the studio to you. Until an order is
// looked up the parcel loops along it; with a real order the loop stops and the parcel moves to
// the order's actual stage (from GET /shipping/track/:id, which reads the order's status).
import { useContext, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import HelpLayout from "../gallery/help/HelpLayout";
import { TRACK_STAGES, SHIPPING, BUSINESS } from "../gallery/help/content";
import { addWorkingDays, fmtDay } from "../gallery/help/motifs";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import { getUserOrders } from "../utils/order";
import { money } from "../gallery/galleryProducts";

export function meta() {
  return [{ title: "Track order · VelvetWolf" }, { name: "description", content: "Enter your order number and the email you used. No account needed." }];
}

const E = BUSINESS.emails;
const short = (id) => String(id || "").slice(0, 8).toUpperCase();
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());

// delivery window from the order date: dispatch days plus the speed's transit days
function etaFor(placedAt, delivery) {
  if (!placedAt) return "";
  const start = new Date(placedAt);
  const days = (SHIPPING.methods.find((m) => m.id === delivery) || SHIPPING.methods[0]).days;
  const a = addWorkingDays(addWorkingDays(start, SHIPPING.dispatch[0]), days[0]);
  const b = addWorkingDays(addWorkingDays(start, SHIPPING.dispatch[1]), days[1]);
  return `${fmtDay(a)} to ${fmtDay(b)}`;
}

export default function TrackOrder() {
  const { user } = useContext(AppContext);
  const [params] = useSearchParams();
  const motifRef = useRef(null);
  const resultRef = useRef(null);
  const [id, setId] = useState(params.get("order") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [mine, setMine] = useState([]);

  // signed in: your recent orders, one tap to track (no email needed for your own)
  const signedIn = user?.id || null;
  useEffect(() => {
    if (!signedIn) return;
    if (!email && user?.email && !user.email.endsWith("@mobile.velvetwolf.in")) setEmail(user.email);
    getUserOrders().then((list) => setMine(list.filter((o) => o.status !== "cancelled").slice(0, 4))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // draw the order's stage on the route: the loop stops, the parcel moves to its node
  const showStage = (stage) => {
    const motif = motifRef.current?.querySelector(".motif-route");
    if (!motif) return;
    const s = Math.max(0, stage);
    motif.classList.add("has-stage");
    motif.querySelectorAll(".route-node").forEach((n) => n.classList.toggle("is-done", Number(n.dataset.i) <= s && stage >= 0));
    const node = motif.querySelector(`.route-node[data-i="${s}"]`);
    const parcel = motif.querySelector(".route-parcel");
    if (node && parcel) parcel.style.transform = `translate(${node.getAttribute("cx")}px, ${node.getAttribute("cy")}px)`;
    const done = motif.querySelector(".route-done");
    if (done) done.style.strokeDashoffset = String(stage < 0 ? 100 : 100 - (s / (TRACK_STAGES.length - 1)) * 100);
  };

  // re-applied after each render, so the route keeps the order's stage
  useEffect(() => { if (result) showStage(result.stage); });

  const track = async (orderId, mail, own = false) => {
    setLoading(true);
    setErrors({});
    try {
      const q = !own && mail ? `?email=${encodeURIComponent(mail.trim())}` : "";
      const res = await fetch(apiUrl(`/shipping/track/${encodeURIComponent(orderId.trim())}${q}`), { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We couldn't find an order with that number and email. Check both, or write to us.");
      const stage = Number.isInteger(data.stage) ? data.stage : TRACK_STAGES.findIndex((s) => s.label.toUpperCase() === String(data.status).toUpperCase());
      setResult({ ...data, stage });
      setTimeout(() => resultRef.current?.focus({ preventScroll: true }), 40);
    } catch (err) {
      setErrors({ id: err.message });
      document.getElementById("tr-id")?.focus();
    } finally {
      setLoading(false);
    }
  };

  // arriving from the payment page with ?order=&email=: look it up straight away
  useEffect(() => {
    if (params.get("order") && validEmail(params.get("email") || "")) track(params.get("order"), params.get("email"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!id.trim()) errs.id = "Enter your order number.";
    if (!validEmail(email)) errs.email = "Enter the email you ordered with.";
    setErrors(errs);
    if (Object.keys(errs).length) { document.getElementById(errs.id ? "tr-id" : "tr-email")?.focus(); return; }
    track(id, email);
  };

  const stage = result?.stage;
  const cancelled = stage === -1;

  return (
    <HelpLayout page="track-order" eyebrow="Help" title="Track your order" station="route" motifRef={motifRef}
      lede="Enter your order number and the email you used. No account needed.">
      <div className="info-grid">
        <section className="info-card" aria-labelledby="tr-h">
          <h2 className="info-h" id="tr-h">Find your order</h2>
          <form className="tr-form" onSubmit={submit} noValidate>
            <div className="form-row">
              <label htmlFor="tr-id">Order number</label>
              <input id="tr-id" type="text" spellCheck="false" autoCapitalize="off" value={id} placeholder="From your confirmation email"
                onChange={(e) => { setId(e.target.value); setErrors((x) => ({ ...x, id: "" })); }}
                aria-invalid={errors.id ? "true" : undefined} aria-describedby={errors.id ? "tr-id-err" : "tr-id-hint"} />
              <p className="field-hint" id="tr-id-hint">It's in your confirmation email.</p>
              {errors.id && <p className="field-error" id="tr-id-err">{errors.id}</p>}
            </div>
            <div className="form-row">
              <label htmlFor="tr-email">Email used for the order</label>
              <input id="tr-email" type="email" inputMode="email" autoComplete="email" spellCheck="false" autoCapitalize="off" value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: "" })); }}
                aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? "tr-email-err" : undefined} />
              {errors.email && <p className="field-error" id="tr-email-err">{errors.email}</p>}
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>{loading ? "Looking it up…" : "Track order"}</button>
          </form>
          {mine.length > 0 && (
            <div className="tr-mine">
              <p className="eyebrow">Your recent orders</p>
              {mine.map((o) => (
                <button key={o.id} className="text-btn" type="button" onClick={() => { setId(o.id); track(o.id, "", true); }}>
                  #{short(o.id)} · {money(o.total_amount)} · {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="info-card tr-result" tabIndex={-1} ref={resultRef} aria-live="polite">
          {!result ? (
            <>
              <h2 className="info-h">What the stages mean</h2>
              <ol className="tr-stages">{TRACK_STAGES.map((s) => <li key={s.id}><b>{s.label}</b><span>{s.text}</span></li>)}</ol>
              <p className="muted">No update for 48 hours? Send your order number to <a href={`mailto:${E.info}`}>{E.info}</a>.</p>
            </>
          ) : cancelled ? (
            <>
              <h2 className="info-h">Order #{short(result.order_id)}</h2>
              <p className="tr-now"><b>Cancelled</b></p>
              <p className="muted">This order was cancelled. If you paid, the refund goes back the way you paid. Questions: <a href={`mailto:${E.orders}`}>{E.orders}</a>.</p>
            </>
          ) : (
            <>
              <h2 className="info-h">Order #{short(result.order_id)}</h2>
              <p className="tr-now">
                <b>{TRACK_STAGES[stage]?.label}</b>
                {stage < 6 && result.placed_at ? ` · Estimated delivery: ${result.etd || etaFor(result.placed_at, result.delivery)}` : ""}
              </p>
              <ol className="tr-timeline">
                {TRACK_STAGES.map((s, i) => (
                  <li key={s.id} className={i < stage ? "is-done" : i === stage ? "is-now" : ""}>
                    <b>{s.label}</b>
                    <span>{i === stage ? s.text : i === 0 && result.steps?.[0]?.time ? result.steps[0].time : i < stage ? "Done" : ""}</span>
                  </li>
                ))}
              </ol>
              {result.courier_name && result.awb_number && <p className="muted">Courier: {result.courier_name} · AWB {result.awb_number}</p>}
              {result.activities?.length > 0 && (
                <details className="faq-item">
                  <summary><span className="faq-q">Courier updates</span></summary>
                  <ol className="tr-stages">{result.activities.map((a, i) => <li key={i}><b>{a.label}</b><span>{a.time}</span></li>)}</ol>
                </details>
              )}
              <p className="muted">{result.delivery === "express" ? "Express" : "Standard"} delivery. Something wrong? <a href={`mailto:${E.orders}`}>{E.orders}</a> with your order number.</p>
            </>
          )}
        </section>
      </div>
    </HelpLayout>
  );
}
