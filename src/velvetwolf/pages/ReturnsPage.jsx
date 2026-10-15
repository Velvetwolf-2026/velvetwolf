// Returns policy (gallery help page). Header: a sand segment running round the return loop;
// picking a step lights its stop. "Can I return this?" answers from three quick questions.
import { useEffect, useRef, useState } from "react";
import HelpLayout, { DocSections } from "../gallery/help/HelpLayout";
import { RETURNS, BUSINESS } from "../gallery/help/content";

export function meta() {
  return [{ title: "Returns · VelvetWolf" }, { name: "description", content: "10 days to change your mind. Damaged or faulty is always on us." }];
}

const E = BUSINESS.emails;
const mail = (a) => `<a href="mailto:${a}">${a}</a>`;
const W = RETURNS.windowDays;

const SECTIONS = [
  { id: "refunds", h: "Refund times", body: [
    <table className="info-table" key="t">
      <thead><tr><th>Refunded to</th><th>After inspection</th></tr></thead>
      <tbody>{RETURNS.refunds.map((r) => <tr key={r.method}><th scope="row">{r.method}</th><td>{r.time}</td></tr>)}</tbody>
    </table>,
    "Every order is prepaid, so refunds go back to the way you paid unless you choose store credit.",
  ] },
  { id: "exchanges", h: "Size exchanges", body: [`Exchanging for another size is free within ${W} days, while that size is in stock. If it isn't, we refund you in full.`] },
  { id: "not", h: "What can't be returned", body: ["Custom Studio tees, pieces marked Final Sale, and anything worn, washed or altered, or returned without its tags. None of this applies to damaged, faulty or wrong items: those we always take back."] },
  { id: "damage", h: "Damaged or faulty", body: [`Send photos to ${mail(E.returns)}, ideally within 24 hours of delivery, and we arrange a free pickup, then a replacement or a full refund.`] },
];

function verdict({ why, final, days, cond }) {
  if (why === "fault" || why === "wrong") return ["always", "Yes, on us", `Yes, always. Email photos to ${mail(E.returns)} and we arrange a free pickup, then a replacement or a full refund.`];
  if (final === "yes") return ["no", "Not this time", "Custom Studio tees and Final Sale pieces can't be returned for size or a change of mind. If it's faulty, choose that above."];
  if (days === "out") return ["no", "Not this time", `The window is ${W} days from delivery. If it's faulty, choose that above; otherwise write to us and we'll see what we can do.`];
  if (cond === "no") return ["no", "Not this time", "We can only take back tees that are unworn and unwashed, with the tags on."];
  return ["yes", "Yes", `Yes. Email ${mail(E.returns)} with your order number. Swap the size for free, or get a refund.`];
}

function Seg({ name, value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => <label key={v}><input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} /><span>{l}</span></label>)}
    </div>
  );
}

export default function ReturnsPage() {
  const motifRef = useRef(null);
  const [a, setA] = useState({ why: "fit", final: "no", days: "in", cond: "yes" });
  const [step, setStep] = useState(0);
  const set = (k) => (v) => setA((x) => ({ ...x, [k]: v }));
  const [ok, head, msg] = verdict(a);

  const [picked, setPicked] = useState(false);
  const pickStep = (i) => { setStep(i); setPicked(true); };
  // the loop in the header lights the step you pick (after each render, so it sticks)
  useEffect(() => {
    const motif = motifRef.current?.querySelector(".motif-loop");
    if (!motif || !picked) return;
    motif.classList.add("is-picked");
    motif.querySelectorAll(".loop-stop").forEach((s) => s.classList.toggle("is-on", Number(s.dataset.i) === step));
  });

  return (
    <HelpLayout page="returns" eyebrow="Policy" title="Returns and exchanges" station="frames" motifRef={motifRef} updated
      lede={`${W} days to change your mind. Damaged or faulty is always on us.`}>
      <div className="facts">
        <div className="fact"><b>{W} days</b><span>from delivery to ask for a return</span></div>
        <div className="fact"><b>Free size exchange</b><span>while your size is in stock</span></div>
        <div className="fact"><b>Always</b><span>for damaged, faulty or wrong items</span></div>
      </div>

      <section className="info-card ret-check" aria-labelledby="rc-h">
        <h2 className="info-h" id="rc-h">Can I return this?</h2>
        <form className="rc-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="field"><legend className="field-legend"><span>What happened?</span></legend>
            <div className="choice-list choice-grid">
              {[["fit", "Wrong size, or I changed my mind"], ["fault", "It arrived damaged or faulty"], ["wrong", "I got the wrong item"]].map(([v, l]) => (
                <label className="choice" key={v}><input type="radio" name="rc-why" value={v} checked={a.why === v} onChange={() => set("why")(v)} /><span className="choice-main"><b>{l}</b></span></label>
              ))}
            </div>
          </fieldset>
          {a.why === "fit" && (
            <div id="rc-more">
              <fieldset className="field"><legend className="field-legend"><span>Is it a custom Studio tee, or marked Final Sale?</span></legend>
                <Seg name="rc-final" value={a.final} onChange={set("final")} options={[["no", "No"], ["yes", "Yes"]]} /></fieldset>
              <fieldset className="field"><legend className="field-legend"><span>When was it delivered?</span></legend>
                <Seg name="rc-days" value={a.days} onChange={set("days")} options={[["in", `Within ${W} days`], ["out", "Longer ago"]]} /></fieldset>
              <fieldset className="field"><legend className="field-legend"><span>Is it unworn and unwashed, with the tags on?</span></legend>
                <Seg name="rc-cond" value={a.cond} onChange={set("cond")} options={[["yes", "Yes"], ["no", "No"]]} /></fieldset>
            </div>
          )}
        </form>
        <div className={`rc-result is-${ok}`} role="status" aria-live="polite">
          <b>{head}</b><p dangerouslySetInnerHTML={{ __html: msg }} />
        </div>
      </section>

      <section className="info-card" aria-labelledby="rs-h">
        <h2 className="info-h" id="rs-h">How it works</h2>
        <ol className="ret-steps">
          {RETURNS.steps.map((s, i) => (
            <li key={s.id}>
              <button className="ret-step" type="button" aria-pressed={step === i} onClick={() => pickStep(i)}><b>{i + 1}. {s.label}</b></button>
              <p dangerouslySetInnerHTML={{ __html: s.text }} />
            </li>
          ))}
        </ol>
      </section>
      <DocSections sections={SECTIONS} />
    </HelpLayout>
  );
}
