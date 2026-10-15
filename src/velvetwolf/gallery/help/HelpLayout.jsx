// One layout for the help and policy pages. The header is a window onto the hall's "back of
// house" wing, where each page has one object under the white light that reacts to the page
// (three/backstage.js); the text renders first and the scene arrives after. Without WebGL the
// page's 2D drawing stands in, still. Long documents get a reading-progress line and an
// "On this page" list; on wide screens their object stays in view beside the text while you read.
import { memo, useEffect, useRef } from "react";
import { Link } from "react-router";
import { useGallery } from "../galleryContext";
import { MOTIFS } from "./motifs";
import { BUSINESS } from "./content";
import { HELP_NAV, useInAppLinks } from "./links";
import "../gallery-help.css";

export function HelpNav({ current }) {
  return (
    <nav className="info-subnav" aria-label="Help pages">
      {HELP_NAV.map(([to, label]) => (
        <Link key={to} to={to} aria-current={to === current ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

export function DocSections({ sections }) {
  return sections.map((s) => (
    <section className="doc-sec" id={`sec-${s.id}`} key={s.id} aria-labelledby={`sec-${s.id}-h`}>
      <h2 className="doc-h" id={`sec-${s.id}-h`} tabIndex={-1}>{s.h}</h2>
      {s.body.map((b, i) => (typeof b === "string"
        ? <p key={i} dangerouslySetInnerHTML={{ __html: b }} />
        : <div key={i}>{b}</div>))}
    </section>
  ));
}

// Long documents: a table of contents beside the text, highlighting the section in view.
export function DocBody({ sections }) {
  const goto = (e, id) => {
    e.preventDefault();
    const t = document.getElementById(`sec-${id}`);
    if (!t) return;
    t.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    t.querySelector(".doc-h")?.focus({ preventScroll: true });
  };
  return (
    <div className="doc-layout">
      <nav className="doc-toc" aria-label="On this page">
        <p className="eyebrow">On this page</p>
        <ol>{sections.map((s) => <li key={s.id}><a href={`#sec-${s.id}`} data-goto={s.id} onClick={(e) => goto(e, s.id)}>{s.h}</a></li>)}</ol>
      </nav>
      <div className="doc-main"><DocSections sections={sections} /></div>
    </div>
  );
}

// back-of-house object for each page (engine.help.<scene>)
const SCENE_OF = { contact: "contact", faq: "faq", "track-order": "track", "shipping-policy": "shipping", returns: "returns", "privacy-policy": "privacy", terms: "terms" };

// Without WebGL: the page's drawing, held still (drawn once per page so React leaves it alone).
const Motif = memo(function Motif({ page, motifRef }) {
  return <div className="info-motif is-still" aria-hidden="true" ref={motifRef} dangerouslySetInnerHTML={{ __html: MOTIFS[page]() }} />;
});

export default function HelpLayout({ page, eyebrow, title, lede, motifRef, doc = false, updated = false, onReadProgress, children }) {
  const { engine, status } = useGallery();
  const scene = SCENE_OF[page];
  const rootRef = useRef(null);
  const barRef = useRef(null);
  const reading = useRef(false);
  useInAppLinks(rootRef);

  // walk to this page's object in the back of house
  useEffect(() => {
    if (engine) engine.setView("info", scene);
  }, [engine, scene]);

  // long documents: reading progress, the current section, and (wide screens) the object kept in
  // view beside the text while you read
  useEffect(() => {
    if (!doc) return undefined;
    const root = rootRef.current;
    const onScroll = () => {
      const secs = [...root.querySelectorAll(".doc-sec")];
      let cur = secs[0]?.id;
      for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * 0.3) cur = s.id;
      root.querySelectorAll(".doc-toc a").forEach((a) => a.toggleAttribute("aria-current", `sec-${a.dataset.goto}` === cur));
      const body = root.querySelector(".info-body");
      if (body) {
        const r = body.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
        if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
        onReadProgress?.(p);
      }
      if (!engine) return;
      // the window: the strip to the right of the text column (lines are kept to a readable
      // length, so wide screens have room there); too narrow and the object stays in the header
      const hero = root.querySelector(".info-hero").getBoundingClientRect();
      const para = root.querySelector(".doc-sec p")?.getBoundingClientRect();
      const x0 = para ? (para.right + 40) / innerWidth : 1;
      const fits = innerWidth >= 1100 && (0.985 - x0) * innerWidth >= 210;
      const nowReading = fits && hero.bottom < innerHeight * 0.35;
      if (nowReading !== reading.current) {
        reading.current = nowReading;
        root.classList.toggle("is-reading", nowReading);
        if (nowReading) {
          engine.setReadArea(scene, [x0, 0.16, 0.985, 0.94]);
          engine.setStation(`${scene}Read`);
        } else engine.setStation(scene);
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    onScroll();
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); };
  }, [doc, engine, scene, onReadProgress]);

  const noGl = status === "none";

  return (
    <main className={`vwg view-info${doc ? " is-doc" : ""}`} ref={rootRef}>
      {doc && <div className="read-progress" ref={barRef} aria-hidden="true" />}
      <header className="info-hero" data-page={page}>
        <div className="info-hero-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="info-title" tabIndex={-1}>{title}</h1>
          <p className="info-lede">{lede}</p>
        </div>
        {noGl ? <Motif page={page} motifRef={motifRef} /> : <div className="info-stage" aria-hidden="true" />}
        <HelpNav current={`/${page}`} />
      </header>
      <div className="info-body">
        <div className="info-wrap">
          {children}
          {updated && (
            <p className="fine doc-updated">
              Last updated: {BUSINESS.updated}. Questions: <a href={`mailto:${BUSINESS.emails.info}`}>{BUSINESS.emails.info}</a>.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
