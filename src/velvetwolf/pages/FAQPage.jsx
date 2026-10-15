// FAQ (gallery help page). Header: index cards that lift in turn; choosing a topic lifts its card.
// Search highlights the term in questions and answers and opens the matches.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import HelpLayout from "../gallery/help/HelpLayout";
import { FAQ, BUSINESS } from "../gallery/help/content";

export function meta() {
  return [{ title: "FAQ · VelvetWolf" }, { name: "description", content: "Short answers about orders, shipping, sizes, the Studio, returns and your account." }];
}

const CATS = [...new Set(FAQ.map((f) => f.cat))];
const plain = (html) => html.replace(/<[^>]+>/g, "");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Wraps the term in <mark> in text nodes only (never inside tags or links' href).
function highlight(html, term) {
  if (!term || term.length < 2) return html;
  const re = new RegExp(`(${escRe(term)})`, "gi");
  return html.split(/(<[^>]+>)/).map((part) => (part.startsWith("<") ? part : part.replace(re, "<mark>$1</mark>"))).join("");
}

export default function FAQPage() {
  const motifRef = useRef(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState({});
  const term = q.trim().toLowerCase();

  const items = useMemo(() => FAQ.map((f, i) => ({
    ...f, key: i,
    hit: (cat === "All" || f.cat === cat) && (!term || `${f.q} ${plain(f.a)}`.toLowerCase().includes(term)),
  })), [cat, term]);
  const shown = items.filter((f) => f.hit).length;

  // lift the chosen topic's card in the header drawing (after each render, so it sticks)
  useEffect(() => {
    motifRef.current?.querySelectorAll(".idx-card").forEach((g) => g.classList.toggle("is-on", cat !== "All" && g.dataset.cat === cat));
  });
  const pick = (c) => setCat(c);

  return (
    <HelpLayout page="faq" eyebrow="Help · FAQ" title="Questions, answered" station="frames" motifRef={motifRef}
      lede="Short answers to what people ask most. If yours isn't here, ask us.">
      <div className="faq-tools">
        <div className="faq-search">
          <label className="sr" htmlFor="faq-q">Search the questions</label>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></svg>
          <input id="faq-q" type="search" placeholder="Search: refund, COD, size, upload…" autoComplete="off" spellCheck="false"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="faq-cats" role="radiogroup" aria-label="Filter by topic">
          {["All", ...CATS].map((c) => (
            <label className="filter" key={c}>
              <input type="radio" name="faq-cat" value={c} checked={cat === c} onChange={() => pick(c)} />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </div>
      <p className="faq-count" role="status" aria-live="polite">{term || cat !== "All" ? `${shown} ${shown === 1 ? "answer" : "answers"}` : ""}</p>
      <div className="faq-list">
        {CATS.map((c) => {
          const list = items.filter((f) => f.cat === c && f.hit);
          if (!list.length) return null;
          return (
            <section className="faq-group" key={c} aria-labelledby={`faq-${c}`}>
              <h2 className="eyebrow" id={`faq-${c}`}>{c}</h2>
              {list.map((f) => (
                <details className="faq-item" key={f.key} open={Boolean(term) || Boolean(open[f.key])}
                  onToggle={(e) => { const isOpen = e.currentTarget.open; if (!term) setOpen((o) => (o[f.key] === isOpen ? o : { ...o, [f.key]: isOpen })); }}>
                  <summary><span className="faq-q" dangerouslySetInnerHTML={{ __html: highlight(f.q.replace(/</g, "&lt;"), term) }} /></summary>
                  <div className="faq-a"><p dangerouslySetInnerHTML={{ __html: highlight(f.a, term) }} /></div>
                </details>
              ))}
            </section>
          );
        })}
      </div>
      {shown === 0 && <p className="faq-empty">Nothing matches that. <Link to="/contact">Ask us directly</Link>; we usually reply within 4 working hours.</p>}
      <section className="info-card faq-more">
        <h2 className="info-h">Still stuck?</h2>
        <p className="muted">Write to <a href={`mailto:${BUSINESS.emails.info}`}>{BUSINESS.emails.info}</a> or message us on <a href={BUSINESS.whatsapp.href} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
      </section>
    </HelpLayout>
  );
}
