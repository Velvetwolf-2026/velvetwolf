// Fit & style: the fit twin (height and chest in, your VelvetWolf size out, with how it and the
// next size sit, shown on a simple form in the room above), what your past tees told us, and your
// Wolf Type with a story-sized card to post. Measurements stay on this page; only the size you
// choose to keep is remembered (on this device).
import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AppContext } from "../pages/AppContext";
import { useGallery } from "../gallery/galleryContext";
import { fitTwin, validBody } from "./fit";
import { wolfType } from "./wolfTypes";
import { drawStoryCard } from "./storyCard";

function FitTwin({ feedback }) {
  const { userPreferences, saveUserPreferences, showToast } = useContext(AppContext);
  const { engine } = useGallery();
  const [body, setBody] = useState({ height: "", chest: "" });
  const [shown, setShown] = useState(null); // the size on the form
  const [touched, setTouched] = useState(false);
  const errors = touched ? validBody(body) : {};
  const twin = useMemo(() => fitTwin(body, feedback), [body, feedback]);
  const onForm = shown && twin?.compare.some((c) => c.size === shown) ? shown : twin?.size;
  const mySize = userPreferences?.sizes?.[0];

  useEffect(() => {
    engine?.den?.setFit?.(twin ? { height: Number(body.height), chest: Number(body.chest), size: onForm } : null);
  }, [engine, twin, onForm, body.height, body.chest]);

  const keep = () => {
    saveUserPreferences({ ...userPreferences, sizes: [twin.size] });
    showToast(`${twin.size} is your size. We'll pick it first.`);
  };

  return (
    <section className="info-card den-twin" aria-labelledby="den-twin-h">
      <h3 className="info-h" id="den-twin-h">Your fit twin</h3>
      <p className="muted">Your height and your chest measured all the way round. We'll show how two sizes sit on a form like you.</p>
      <div className="den-twin-form">
        <div className="form-row">
          <label htmlFor="ft-h">Height <span className="opt">cm</span></label>
          <input id="ft-h" inputMode="numeric" value={body.height} placeholder="175" aria-invalid={errors.height ? "true" : undefined} aria-describedby={errors.height ? "ft-h-err" : undefined}
            onChange={(e) => setBody((b) => ({ ...b, height: e.target.value.replace(/\D/g, "").slice(0, 3) }))} onBlur={() => setTouched(true)} />
          {errors.height && <p className="field-error" id="ft-h-err">{errors.height}</p>}
        </div>
        <div className="form-row">
          <label htmlFor="ft-c">Chest <span className="opt">cm, all the way round</span></label>
          <input id="ft-c" inputMode="numeric" value={body.chest} placeholder="98" aria-invalid={errors.chest ? "true" : undefined} aria-describedby={errors.chest ? "ft-c-err" : undefined}
            onChange={(e) => setBody((b) => ({ ...b, chest: e.target.value.replace(/\D/g, "").slice(0, 3) }))} onBlur={() => setTouched(true)} />
          {errors.chest && <p className="field-error" id="ft-c-err">{errors.chest}</p>}
        </div>
      </div>
      {twin && (
        <div className="den-twin-out" aria-live="polite">
          <div className="den-twin-compare" role="radiogroup" aria-label="Size shown on the form">
            {twin.compare.map((c) => (
              <button key={c.size} type="button" role="radio" aria-checked={onForm === c.size} className="den-twin-size" onClick={() => setShown(c.size)}>
                <b>{c.size}</b>
                <span>{c.chestRoom} cm of room round the chest: {c.feel}.</span>
                <span>The hem sits {c.hem}.</span>
              </button>
            ))}
          </div>
          <p className="den-twin-verdict">Your VelvetWolf size: <b>{twin.size}</b></p>
          {twin.nudged && <p className="muted">Your past tees felt {twin.nudged === "up" ? "tight" : "roomy"}, so we went one size {twin.nudged}.</p>}
          <div className="acct-actions">
            {mySize === twin.size
              ? <span className="den-wait">{twin.size} is saved as your size.</span>
              : <button className="btn btn-small btn-primary" type="button" onClick={keep}>Keep {twin.size} as my size</button>}
            <Link className="text-btn" to="/size-guide">Full size guide</Link>
          </div>
        </div>
      )}
    </section>
  );
}

function FeedbackSummary({ feedback, orders }) {
  if (!feedback.length) return null;
  const n = { tight: 0, right: 0, roomy: 0 };
  feedback.forEach((f) => { n[f] = (n[f] || 0) + 1; });
  const sizes = (orders || []).flatMap((o) => (o.order_items || []).filter((i) => i.fit_feedback).map((i) => i.size)).filter(Boolean);
  return (
    <section className="info-card" aria-labelledby="den-fb-h">
      <h3 className="info-h" id="den-fb-h">What your tees told us</h3>
      <p>{feedback.length} {feedback.length === 1 ? "tee" : "tees"} rated: {n.right} right, {n.tight} tight, {n.roomy} roomy{sizes.length ? `, in ${[...new Set(sizes)].join(", ")}` : ""}.</p>
    </section>
  );
}

function WolfTypeCard({ personality, memberNo }) {
  const { showToast } = useContext(AppContext);
  const type = wolfType(personality);
  const [busy, setBusy] = useState(false);
  if (!type) {
    return (
      <section className="info-card" aria-labelledby="den-wt-h">
        <h3 className="info-h" id="den-wt-h">Find your Wolf Type</h3>
        <p className="muted">Five quick picks, photos not adjectives. You get a type, and a card to post if you like it. The shop doesn't wait on it.</p>
        <div className="acct-actions"><Link className="btn btn-small btn-primary" to="/quiz">Take the quiz</Link></div>
      </section>
    );
  }
  const save = async () => {
    setBusy(true);
    try {
      const blob = await drawStoryCard({ type, memberNo });
      if (!blob) throw new Error("no canvas");
      const file = new File([blob], `velvetwolf-${type.name.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My Wolf Type: ${type.name}` }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch {
      showToast("Couldn't make the card on this browser.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="info-card den-wt" aria-labelledby="den-wt-h">
      <p className="eyebrow">Your Wolf Type</p>
      <h3 className="den-wt-name" id="den-wt-h">{type.name}</h3>
      <p className="den-wt-line">{type.line}</p>
      <p className="muted">{type.story}</p>
      <p className="muted"><b>Wears:</b> {type.look}</p>
      <div className="acct-actions">
        <button className="btn btn-small btn-primary" type="button" disabled={busy} onClick={save}>{busy ? "Making it…" : "Get the story card"}</button>
        <Link className="btn btn-small" to="/quiz">Take it again</Link>
      </div>
    </section>
  );
}

export default function FitTab({ orders, personality, memberNo }) {
  const feedback = useMemo(() => (orders || []).flatMap((o) => (o.order_items || []).map((i) => i.fit_feedback).filter(Boolean)), [orders]);
  return (
    <div className="den-fit-wrap">
      <FitTwin feedback={feedback} />
      <div className="info-stack">
        <WolfTypeCard personality={personality} memberNo={memberNo} />
        <FeedbackSummary feedback={feedback} orders={orders} />
      </div>
    </div>
  );
}

