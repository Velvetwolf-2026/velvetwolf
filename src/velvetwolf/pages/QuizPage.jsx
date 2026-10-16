// The style quiz, in the hall: five rounds, each four photos of real tees, pick the one you'd wear.
// No adjectives, nothing to type. The result is a Wolf Type with a story-sized card to post, and
// the shop is never behind it (it's linked from the account's Fit & style tab, nowhere is gated).
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { AppContext } from "./AppContext";
import { useGallery } from "../gallery/galleryContext";
import { request } from "../account/api";
import { buildRounds, scorePicks } from "../account/quiz";
import { wolfType } from "../account/wolfTypes";
import { drawStoryCard } from "../account/storyCard";
import { useAccountStore } from "../account/store";
import "../gallery/gallery-help.css";
import "../account/account.css";

export function meta() {
  return [
    { title: "Find your Wolf Type · VelvetWolf" },
    { name: "description", content: "Five quick picks from real tees. Find your Wolf Type, and a card to post if you like it." },
  ];
}

const GUEST_KEY = "vw_guest_style_profile";

export default function QuizPage() {
  const { user, setUser, products = [], showToast } = useContext(AppContext);
  const { engine } = useGallery();
  const store = useAccountStore();
  const [seed, setSeed] = useState(7);
  const rounds = useMemo(() => buildRounds(products, seed), [products, seed]);
  const [step, setStep] = useState(-1); // -1 intro, 0..n-1 rounds, n result
  const [picks, setPicks] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const headRef = useRef(null);

  useEffect(() => { if (engine) engine.setView("auth", "auth"); }, [engine]);

  // a type already chosen (on the account, or kept on this device) shows straight away
  useEffect(() => {
    if (step !== -1 || result) return;
    const saved = user?.personality_type;
    if (saved) { setResult({ personalityType: saved.toUpperCase(), collection: null }); return; }
    try {
      const g = JSON.parse(localStorage.getItem(GUEST_KEY) || "null");
      if (g?.personalityType) setResult({ personalityType: g.personalityType, collection: g.collection || null });
    } catch { /* storage unavailable */ }
  }, [user?.personality_type, step, result]);

  useEffect(() => { headRef.current?.focus({ preventScroll: true }); }, [step]);

  const start = () => { setPicks([]); setResult(null); setSeed((s) => s + 1); setStep(0); window.scrollTo({ top: 0 }); };

  const pick = async (option) => {
    const next = [...picks, option];
    setPicks(next);
    if (step < rounds.length - 1) { setStep(step + 1); return; }
    const scored = scorePicks(next);
    setResult(scored);
    setStep(rounds.length);
    const payload = { personalityType: scored.personalityType, quizScore: scored.quizScore };
    if (user) {
      try {
        await request("/user/style-profile", { method: "POST", body: payload });
        setUser((prev) => (prev ? { ...prev, personality_type: scored.personalityType } : prev));
      } catch {
        try { localStorage.setItem(GUEST_KEY, JSON.stringify({ ...payload, collection: scored.collection })); } catch { /* storage unavailable */ }
        showToast("Saved on this device. We'll add it to your account next time.", "info");
      }
    } else {
      try { localStorage.setItem(GUEST_KEY, JSON.stringify({ ...payload, collection: scored.collection })); } catch { /* storage unavailable */ }
    }
  };

  const type = result ? wolfType(result.personalityType) : null;

  const card = async () => {
    setBusy(true);
    try {
      const blob = await drawStoryCard({ type, memberNo: store.membership?.memberNo });
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

  const round = step >= 0 && step < rounds.length ? rounds[step] : null;

  return (
    <main className="vwg view-den view-quiz">
      <div className="den-band is-short" aria-hidden="true" />
      <section className="den-body">
        <div className="den-wrap quiz-wrap">
          {round ? (
            <>
              <header className="quiz-head">
                <p className="eyebrow" aria-live="polite">{step + 1} of {rounds.length}</p>
                <h1 className="den-title" tabIndex={-1} ref={headRef}>{round.prompt}</h1>
                <div className="quiz-progress" aria-hidden="true"><span style={{ transform: `scaleX(${(step + 1) / rounds.length})` }} /></div>
              </header>
              <ul className="quiz-grid">
                {round.options.map((o) => (
                  <li key={o.id}>
                    <button type="button" className="quiz-pick" onClick={() => pick(o)} aria-label={`${o.product.name} in ${o.color}`}>
                      <img src={o.src} alt="" decoding="async" />
                    </button>
                  </li>
                ))}
              </ul>
              {step > 0 && <button className="text-btn quiz-back" type="button" onClick={() => { setPicks(picks.slice(0, -1)); setStep(step - 1); }}>Back</button>}
            </>
          ) : type ? (
            <section className="quiz-result" aria-labelledby="quiz-type">
              <p className="eyebrow">Your Wolf Type</p>
              <h1 className="quiz-type" id="quiz-type" tabIndex={-1} ref={headRef}>{type.name}</h1>
              <p className="den-wt-line">{type.line}</p>
              <p className="muted">{type.story}</p>
              <p className="muted"><b>Wears:</b> {type.look}</p>
              <div className="acct-actions">
                <button className="btn btn-primary" type="button" disabled={busy} onClick={card}>{busy ? "Making it…" : "Get the story card"}</button>
                <Link className="btn" to={result.collection ? `/shop/${result.collection}` : "/shop"}>Shop your picks</Link>
                <button className="text-btn" type="button" onClick={start}>Take it again</button>
              </div>
              {!user && <p className="muted">Kept on this device. <Link to="/signup">Create an account</Link> to keep it with your orders.</p>}
            </section>
          ) : (
            <section className="quiz-intro" aria-labelledby="quiz-h">
              <p className="eyebrow">Style quiz</p>
              <h1 className="den-title" id="quiz-h" tabIndex={-1} ref={headRef}>Find your Wolf Type</h1>
              <p className="muted">Five rounds. Each shows four real tees: pick the one you'd wear. About a minute, nothing to type. The shop doesn't wait on it.</p>
              <div className="acct-actions">
                <button className="btn btn-primary" type="button" onClick={start} disabled={!rounds.length}>{rounds.length ? "Start" : "Getting the tees…"}</button>
                <Link className="btn" to="/shop">Just browse</Link>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
