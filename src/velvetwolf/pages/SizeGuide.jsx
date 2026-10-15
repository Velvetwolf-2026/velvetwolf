// Size guide (prototype ui/sizeguide.js). The Bone tee stands in the hall and the measurements
// are drawn onto it. Pick a size and the tee grows or shrinks a little while the numbers count to
// the new values; switch cm/in; or enter your chest to get a size. Without WebGL it's the tables.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useGallery } from "../gallery/galleryContext";
import { SIZE_GUIDE, CARE } from "../gallery/help/content";
import { HelpNav } from "../gallery/help/HelpLayout";
import { useInAppLinks } from "../gallery/help/links";
import "../gallery/gallery-help.css";

export function meta() {
  return [{ title: "Size guide · VelvetWolf" }, { name: "description", content: "Flat measurements for every size, how we measure, and a quick size finder." }];
}

const IN = 2.54;
// points on the tee, in its own units (1.955 tall, centred, front facing +z)
const P = {
  chestL: [-0.545, -0.1, 0.37], chestR: [0.545, -0.1, 0.37],
  hps: [-0.21, 0.978, 0.02], hem: [-0.52, -0.95, 0.44],
  lenTop: [-1.02, 0.978, 0.2], lenBot: [-1.02, -0.95, 0.2],
  slvA: [0.665, 0.7, 0.2], slvB: [0.876, 0.17, 0.3],
};
const off = (p, d) => [p[0] + d[0], p[1] + d[1], p[2]];
const SLV_OFF = [0.13, 0.055];
const SCALE = { S: 0.965, M: 1, L: 1.035, XL: 1.07, XXL: 1.105 };

export default function SizeGuide() {
  const { engine, status } = useGallery();
  const svgRef = useRef(null);
  const panelRef = useRef(null);
  const [size, setSize] = useState("M");
  const [unit, setUnit] = useState("cm");
  const [chest, setChest] = useState("");
  const shown = useRef({ ...SIZE_GUIDE.find((s) => s.id === "M").garment });
  const tween = useRef(null);
  const unitRef = useRef(unit);
  unitRef.current = unit;
  useInAppLinks(panelRef);

  const fmt = (cm, u = unit) => (u === "cm" ? `${Math.round(cm)} cm` : `${(cm / IN).toFixed(1)} in`);

  useEffect(() => {
    if (engine) engine.setView("size", "sizeGuide");
  }, [engine]);

  const redraw = () => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.classList.remove("is-drawn"); void svg.getBoundingClientRect(); svg.classList.add("is-drawn");
  };

  // a new size: the tee scales and the numbers count to the new values
  useEffect(() => {
    engine?.setFitSize(SCALE[size]);
    const target = SIZE_GUIDE.find((s) => s.id === size).garment;
    const from = { ...shown.current };
    const t0 = performance.now();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    tween.current = (now) => {
      const k = reduce ? 1 : Math.min(1, (now - t0) / 450);
      const e = 1 - (1 - k) ** 3;
      for (const key of Object.keys(target)) shown.current[key] = from[key] + (target[key] - from[key]) * e;
      if (k >= 1) tween.current = null;
    };
    redraw();
  }, [size, engine]);

  // the measurement lines follow the tee on screen every frame
  useEffect(() => {
    const svg = svgRef.current;
    if (!engine || !svg) return undefined;
    let raf = 0;
    const set = (el, a, b) => { el.setAttribute("x1", a[0].toFixed(1)); el.setAttribute("y1", a[1].toFixed(1)); el.setAttribute("x2", b[0].toFixed(1)); el.setAttribute("y2", b[1].toFixed(1)); };
    const tick = (el, p, a, b, len = 7) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const nx = (-dy / L) * len, ny = (dx / L) * len;
      set(el, [p[0] - nx, p[1] - ny], [p[0] + nx, p[1] + ny]);
    };
    const dim = (g, a, b, label, at, anchor = "middle", leads = null, rotate = 0) => {
      set(g.querySelector(".fl"), a, b);
      tick(g.querySelector(".tick.a"), a, a, b); tick(g.querySelector(".tick.b"), b, a, b);
      if (leads) { set(g.querySelector(".lead.a"), leads[0][0], leads[0][1]); set(g.querySelector(".lead.b"), leads[1][0], leads[1][1]); }
      const t = g.querySelector(".fit-label");
      t.setAttribute("x", at[0].toFixed(1)); t.setAttribute("y", at[1].toFixed(1)); t.setAttribute("text-anchor", anchor);
      t.setAttribute("transform", rotate ? `rotate(${rotate} ${at[0].toFixed(1)} ${at[1].toFixed(1)})` : "");
      t.textContent = label;
      if (!rotate) {
        const w = t.getComputedTextLength();
        const x = anchor === "start" ? at[0] : anchor === "end" ? at[0] - w : at[0] - w / 2;
        const shift = Math.min(0, innerWidth - 8 - (x + w)) + Math.max(0, 8 - x);
        if (shift) t.setAttribute("x", (at[0] + shift).toFixed(1));
      }
    };
    const f = (cm) => fmt(cm, unitRef.current);
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      tween.current?.(now);
      const s = shown.current;
      const [cL, cR, hps, hem, lT, lB, sA, sB, sA2, sB2] = engine.fitProject([P.chestL, P.chestR, P.hps, P.hem, P.lenTop, P.lenBot, P.slvA, P.slvB, off(P.slvA, SLV_OFF), off(P.slvB, SLV_OFF)]);
      dim(svg.querySelector(".fit-chest"), cL, cR, `Chest ${f(s.chest)}`, [(cL[0] + cR[0]) / 2, cL[1] - 12]);
      dim(svg.querySelector(".fit-len"), lT, lB, `Length ${f(s.length)}`, [lT[0] - 10, (lT[1] + lB[1]) / 2], "middle", [[hps, lT], [hem, lB]], -90);
      dim(svg.querySelector(".fit-slv"), sA2, sB2, `Sleeve ${f(s.sleeve)}`, [(sA2[0] + sB2[0]) / 2 + 14, (sA2[1] + sB2[1]) / 2], "start", [[sA, sA2], [sB, sB2]]);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // find your size from a chest measurement
  let answer = "Measure around the fullest part of your chest, under the arms, with the tape level.";
  let answerHtml = null;
  let suggested = null;
  const v = parseFloat(String(chest).replace(",", "."));
  if (v) {
    const cm = unit === "cm" ? v : v * IN;
    const first = SIZE_GUIDE[0], last = SIZE_GUIDE[SIZE_GUIDE.length - 1];
    if (cm < first.body[0] - 6 || cm > last.body[1] + 8) {
      answer = `${fmt(cm)} is outside our range (${first.id} to ${last.id}). Write to us and we'll help.`;
    } else {
      const fit = SIZE_GUIDE.find((s) => cm >= s.body[0] && cm < s.body[1]) || (cm < first.body[0] ? first : last);
      const near = SIZE_GUIDE.find((s) => s !== fit && Math.abs(cm - (cm > (fit.body[0] + fit.body[1]) / 2 ? s.body[0] : s.body[1])) < 1.5);
      answerHtml = <><b>{fit.id}</b> for the intended oversized fit.{near ? ` You're close to ${near.id}: take ${near.id} for ${SIZE_GUIDE.indexOf(near) > SIZE_GUIDE.indexOf(fit) ? "more room" : "a closer fit"}.` : ""}</>;
      suggested = fit.id;
    }
  }

  // show the suggested size on the tee
  useEffect(() => { if (suggested) setSize(suggested); }, [suggested]);

  const noGl = status === "none" || status === "off";

  return (
    <main className="vwg vwg-view-pdp view-size">
      {!noGl && <svg className="fit-overlay" ref={svgRef} aria-hidden="true">
        <g className="fit-dim fit-chest"><line className="fl" pathLength="1" /><line className="tick a" /><line className="tick b" /><text className="fit-label" /></g>
        <g className="fit-dim fit-len"><line className="lead a" /><line className="lead b" /><line className="fl" pathLength="1" /><line className="tick a" /><line className="tick b" /><text className="fit-label" /></g>
        <g className="fit-dim fit-slv"><line className="lead a" /><line className="lead b" /><line className="fl" pathLength="1" /><line className="tick a" /><line className="tick b" /><text className="fit-label" /></g>
      </svg>}
      <div className="vwg-stage-area stage-area" aria-hidden="true">
        {noGl && <div className="sg-fallback"><p className="fine">The 3D view needs WebGL. Every measurement is in the tables.</p></div>}
      </div>

      <aside className="vwg-panel" ref={panelRef} aria-label="Size guide">
        <nav className="vwg-crumbs" aria-label="Breadcrumb"><Link to="/faq">Help</Link><span aria-hidden="true">/</span><span>Size guide</span></nav>
        <header className="vwg-pdp-head">
          <h1 className="vwg-pdp-title" tabIndex={-1}>Size guide</h1>
          <p className="vwg-pdp-blurb">Oversized and boxy, with a dropped shoulder. Take your usual size for the intended fit, or one size down for a closer fit. Tees are pre-washed to keep shrinkage low.</p>
        </header>
        <div className="sg-controls">
          <fieldset className="field">
            <legend className="field-legend"><span>Size</span><span className="legend-val">Showing {size}</span></legend>
            <div className="seg seg-5" role="radiogroup">
              {SIZE_GUIDE.map((s) => <label key={s.id}><input type="radio" name="sg-size" value={s.id} checked={size === s.id} onChange={() => setSize(s.id)} /><span>{s.id}</span></label>)}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="field-legend"><span>Units</span></legend>
            <div className="seg">
              <label><input type="radio" name="sg-unit" value="cm" checked={unit === "cm"} onChange={() => { setUnit("cm"); redraw(); }} /><span>cm</span></label>
              <label><input type="radio" name="sg-unit" value="in" checked={unit === "in"} onChange={() => { setUnit("in"); redraw(); }} /><span>inches</span></label>
            </div>
          </fieldset>
        </div>

        <section className="sg-block" aria-labelledby="sg-flat">
          <h2 className="eyebrow" id="sg-flat">The tee, laid flat</h2>
          <div className="table-wrap"><table className="size-table sg-table">
            <thead><tr><th scope="col">Size</th><th scope="col">Chest <small>pit to pit</small></th><th scope="col">Length <small>shoulder to hem</small></th><th scope="col">Sleeve</th></tr></thead>
            <tbody>{SIZE_GUIDE.map((s) => (
              <tr key={s.id} className={s.id === size ? "is-on" : ""}><th scope="row">{s.id}</th><td>{fmt(s.garment.chest)}</td><td>{fmt(s.garment.length)}</td><td>{fmt(s.garment.sleeve)}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="fine">The easiest check: lay a tee you like flat, measure it the same way, and compare.</p>
        </section>

        <section className="sg-block" aria-labelledby="sg-find">
          <h2 className="eyebrow" id="sg-find">Find your size</h2>
          <form className="sg-find" onSubmit={(e) => e.preventDefault()} noValidate>
            <div className="form-row">
              <label htmlFor="sg-chest">Your chest, all the way round ({unit})</label>
              <div className="input-wrap"><input id="sg-chest" type="text" inputMode="decimal" autoComplete="off" placeholder={unit === "cm" ? "e.g. 98" : "e.g. 38.5"} value={chest} onChange={(e) => setChest(e.target.value)} aria-describedby="sg-answer" /></div>
            </div>
          </form>
          <p className="sg-answer" id="sg-answer" role="status" aria-live="polite">{answerHtml || answer}</p>
          <div className="table-wrap"><table className="size-table">
            <thead><tr><th scope="col">Size</th><th scope="col">Fits a chest of</th></tr></thead>
            <tbody>{SIZE_GUIDE.map((s) => (
              <tr key={s.id} className={s.id === size ? "is-on" : ""}><th scope="row">{s.id}</th><td>{unit === "cm" ? `${s.body[0]} to ${s.body[1]} cm` : `${(s.body[0] / IN).toFixed(0)} to ${(s.body[1] / IN).toFixed(0)} in`}</td></tr>
            ))}</tbody>
          </table></div>
        </section>

        <section className="sg-block" aria-labelledby="sg-how">
          <h2 className="eyebrow" id="sg-how">How we measure</h2>
          <ul className="sg-how">
            <li><b>Chest</b> straight across, 2.5 cm below the armholes, with the tee flat.</li>
            <li><b>Length</b> from the highest point of the shoulder, next to the collar, straight down to the hem.</li>
            <li><b>Sleeve</b> from the shoulder seam to the end of the sleeve, along the top.</li>
          </ul>
        </section>
        <section className="sg-block" aria-labelledby="sg-care">
          <h2 className="eyebrow" id="sg-care">Care</h2>
          <ul className="sg-how">{CARE.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
        <Link className="btn btn-block" to="/shop">Shop all tees</Link>
        <HelpNav current="/size-guide" />
      </aside>
    </main>
  );
}
