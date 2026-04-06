// ─────────────────────────────────────────────
// VelvetWolf — Shared Inline Style Tokens
// Import into any page component that needs
// consistent typography and spacing.
// ─────────────────────────────────────────────
import { THEME } from "../utils/constants";

const { gold, bg, surface, border, muted, text } = THEME;

export const S = {
  page:    { background: bg, minHeight: "100vh", color: text, fontFamily: "'Georgia', serif" },
  wrap:    { maxWidth: 860,  margin: "0 auto", padding: "60px 32px 100px" },
  wrapWide:{ maxWidth: 1060, margin: "0 auto", padding: "60px 32px 100px" },

  eyebrow: {
    fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: 5,
    color: gold, marginBottom: 12, display: "flex", alignItems: "center", gap: 10,
  },
  h1: {
    fontFamily: "'Bebas Neue',cursive",
    fontSize: "clamp(42px,6vw,72px)", letterSpacing: 6,
    color: "#f5f0e8", lineHeight: 1, margin: "0 0 8px",
  },
  sub:  { fontFamily: "'Roboto', sans-serif", fontSize: 12, letterSpacing: 2, color: muted, marginBottom: 48 },
  h2:   { fontFamily: "'Bebas Neue',cursive", fontSize: 26, letterSpacing: 4, color: gold,  marginBottom: 10, marginTop: 44 },
  h3:   { fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, color: "#f5f0e8", marginBottom: 8, marginTop: 24 },
  p:    { fontSize: 14, lineHeight: 1.85, color: "#bbb", marginBottom: 14 },
  li:   { fontSize: 14, lineHeight: 1.8,  color: "#bbb", marginBottom: 6,  paddingLeft: 8 },
  rule: { border: "none", borderTop: `1px solid ${border}`, margin: "40px 0" },
};

/** Reusable page-level header block */
export function PageHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={S.eyebrow}>
        <div style={{ width: 20, height: 1, background: gold }} />
        {eyebrow}
        <div style={{ width: 20, height: 1, background: gold }} />
      </div>
      <h1 style={S.h1}>{title}</h1>
      <p style={S.sub}>{sub}</p>
      <hr style={S.rule} />
    </div>
  );
}

/** Reusable H2 section */
export function Sec({ title, children }) {
  return (
    <div>
      <h2 style={S.h2}>{title}</h2>
      {children}
    </div>
  );
}

/** Reusable bullet list using gold diamonds */
export function Ul({ items }) {
  return (
    <ul style={{ paddingLeft: 0, listStyle: "none", margin: "4px 0 14px" }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: "flex", gap: 10, ...S.li }}>
          <span style={{ color: gold, marginTop: 2, flexShrink: 0 }}>◆</span>
          <span style={{ fontSize: "14px" }}>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Reusable data table */
export function DataTable({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 14 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#161616" }}>
            {headers.map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: "'Roboto', sans-serif", fontSize: 12, letterSpacing: 2, color: gold, border: `1px solid ${border}` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "#0d0d0d" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 14px", color: "#bbb", border: `1px solid ${border}`, fontFamily: "'Roboto', sans-serif"}}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
