// "Top 5 designs" (home page, after Quiet Hours). The tee stands still in the hall; scrolling
// through the room steps through five designs, and only the tee's colour and print change.
// Branches (SVG) run from a node beside the tee to each design's card: as each design becomes
// active its branch lights up in sand-gold, and the card glows. Clicking a card (or its node)
// scrolls the room to that design. Scroll progress comes from GSAP ScrollTrigger; the branches
// are redrawn each frame from where the tee and cards are on screen.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { photoFor, colorwaysOf, productHref, money } from "./galleryProducts";
import { getCollectionById } from "../utils/collectionsData";
import { stepOf, progressFor, fallbackMark } from "./topPicks";

const reducedMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n) => String(n).padStart(2, "0");

export default function TopDesigns({ items, engine, glReady, sceneRef }) {
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const nodeRef = useRef(null);
  const photoRef = useRef(null);
  const cardRefs = useRef([]);
  const baseRefs = useRef([]);
  const litRefs = useRef([]);
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  const count = items.length;

  const setSection = (el) => { sectionRef.current = el; sceneRef?.(el); };

  // scroll progress through the room (GSAP ScrollTrigger, loaded in the browser only)
  useEffect(() => {
    if (!count) return undefined;
    let trigger = null;
    let cancelled = false;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled || !sectionRef.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const update = (self) => {
        progress.current = self.progress;
        const a = stepOf(self.progress, count).active;
        setActive((prev) => (prev === a ? prev : a));
      };
      trigger = ScrollTrigger.create({ trigger: sectionRef.current, start: "top top", end: "bottom bottom", onUpdate: update, onRefresh: update });
      update(trigger);
    });
    return () => { cancelled = true; trigger?.kill(); };
  }, [count]);

  // the still tee wears the active design
  useEffect(() => {
    const p = items[active];
    if (!engine || !p) return;
    engine.dressTop({ colorId: colorwaysOf(p)[0], printUrl: p.printImage || null, mark: fallbackMark(active) });
  }, [engine, active, items]);

  // the branches: from the node beside the tee to each card, lit up to the active one
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const sticky = stickyRef.current, node = nodeRef.current;
      if (!sticky || !node) return;
      const box = sticky.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight || getComputedStyle(node).display === "none") return;
      let nx, ny;
      if (glReady && engine) {
        const [x, y] = engine.topAnchor();
        nx = x - box.left; ny = y - box.top;
      } else {
        const r = photoRef.current?.getBoundingClientRect();
        if (!r || !r.width) return;
        nx = r.right - box.left + 18; ny = r.top + r.height * 0.42 - box.top;
      }
      node.style.transform = `translate(${nx.toFixed(1)}px, ${ny.toFixed(1)}px)`;
      const { active: a, draw } = stepOf(progress.current, count);
      cardRefs.current.forEach((card, i) => {
        const base = baseRefs.current[i], lit = litRefs.current[i];
        if (!card || !base || !lit) return;
        const r = card.getBoundingClientRect();
        const cx = r.left - box.left, cy = r.top + r.height / 2 - box.top;
        const dx = Math.max(36, (cx - nx) * 0.48);
        const d = `M${nx.toFixed(1)},${ny.toFixed(1)} C${(nx + dx).toFixed(1)},${ny.toFixed(1)} ${(cx - dx).toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)}`;
        if (base.getAttribute("d") !== d) { base.setAttribute("d", d); lit.setAttribute("d", d); }
        const length = lit.getTotalLength();
        const shown = i < a ? 1 : i === a ? draw : 0;
        lit.style.strokeDasharray = `${length} ${length}`;
        lit.style.strokeDashoffset = `${(length * (1 - shown)).toFixed(1)}`;
        lit.classList.toggle("is-active", i === a);
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, glReady, count]);

  // a card (or its node) brings its design forward: scroll the room to it
  const goTo = (i) => {
    const sec = sectionRef.current;
    if (!sec) return;
    setActive(i);
    const top = sec.getBoundingClientRect().top + window.scrollY;
    const dwell = Math.max(0, sec.offsetHeight - window.innerHeight);
    window.scrollTo({ top: top + progressFor(i, count) * dwell, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  if (!count) return null;
  const current = items[active] || items[0];
  const currentPhoto = photoFor(current, colorwaysOf(current)[0]);

  return (
    <section className="scene scene-top" ref={setSection} aria-labelledby="top-h">
      <div className="sticky" ref={stickyRef}>
        <svg className="top-lines" aria-hidden="true" focusable="false">
          {items.map((p, i) => <path key={`b-${p.id}`} className="top-line" ref={(el) => { baseRefs.current[i] = el; }} />)}
          {items.map((p, i) => <path key={`l-${p.id}`} className="top-line-lit" ref={(el) => { litRefs.current[i] = el; }} />)}
        </svg>
        <span className="top-node" ref={nodeRef} aria-hidden="true" />
        {/* without the 3D hall (no WebGL), the active tee's photo stands in for it */}
        {currentPhoto && <img className="top-photo" ref={photoRef} src={currentPhoto} alt="" loading="lazy" decoding="async" />}

        <div className="top-panel">
          <h2 className="top-eyebrow" id="top-h"><span>Top 5 designs</span></h2>
          <ol className="top-list">
            {items.map((p, i) => {
              const photo = photoFor(p, colorwaysOf(p)[0]);
              const coll = getCollectionById(p.collection);
              const state = i < active ? "past" : i === active ? "active" : "next";
              return (
                <li key={p.id} data-state={state}>
                  <button type="button" className="top-card" ref={(el) => { cardRefs.current[i] = el; }}
                    aria-pressed={i === active} onClick={() => goTo(i)} aria-label={`${pad(i + 1)}: ${p.name}`}>
                    <span className="top-dot" aria-hidden="true" />
                    <span className="top-no">{pad(i + 1)}</span>
                    {photo ? <img className="top-thumb" src={photo} alt="" loading="lazy" decoding="async" /> : <span className="top-thumb" />}
                    <span className="top-text">
                      <b>{p.name}</b>
                      <small>{coll?.name || String(p.collection || "").replace(/-/g, " ")}</small>
                    </span>
                    <span className="top-price">{money(p.price)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <Link className="text-link top-cta" to={productHref(current)}>View {current.name}</Link>
        </div>
      </div>
    </section>
  );
}
