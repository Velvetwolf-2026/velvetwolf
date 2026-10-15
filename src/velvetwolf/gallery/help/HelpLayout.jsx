// One layout for the help and policy pages (prototype ui/info.js): a header band where the dim
// gallery hall shows through, with a drawing animated for what the page is for, the help
// sub-navigation, then the page. Long documents get a reading-progress line and an
// "On this page" list that follows the scroll.
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

// Drawn once per page: page state lives in classes the pages add, so React must not redraw it.
const Motif = memo(function Motif({ page, motifRef }) {
  return <div className="info-motif" aria-hidden="true" ref={motifRef} dangerouslySetInnerHTML={{ __html: MOTIFS[page]() }} />;
});

export default function HelpLayout({ page, eyebrow, title, lede, station = "frames", motifRef, doc = false, updated = false, children }) {
  const { engine } = useGallery();
  const rootRef = useRef(null);
  const barRef = useRef(null);
  useInAppLinks(rootRef);

  // the hall behind the header: a dim backdrop at the station for this page
  useEffect(() => {
    if (engine) engine.setView("info", station);
  }, [engine, station]);

  // reading progress and the current section, on long pages
  useEffect(() => {
    if (!doc) return undefined;
    const root = rootRef.current;
    const onScroll = () => {
      const secs = [...root.querySelectorAll(".doc-sec")];
      let cur = secs[0]?.id;
      for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * 0.3) cur = s.id;
      root.querySelectorAll(".doc-toc a").forEach((a) => a.toggleAttribute("aria-current", `sec-${a.dataset.goto}` === cur));
      const body = root.querySelector(".info-body");
      if (barRef.current && body) {
        const r = body.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
        barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => removeEventListener("scroll", onScroll);
  }, [doc]);

  return (
    <main className="vwg view-info" ref={rootRef}>
      {doc && <div className="read-progress" ref={barRef} aria-hidden="true" />}
      <header className="info-hero" data-page={page}>
        <div className="info-hero-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="info-title" tabIndex={-1}>{title}</h1>
          <p className="info-lede">{lede}</p>
        </div>
        <Motif page={page} motifRef={motifRef} />
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
