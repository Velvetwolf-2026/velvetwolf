// ─────────────────────────────────────────────
// VelvetWolf — Size Guide Page
// Route: /size-guide
// ─────────────────────────────────────────────
import { S, PageHeader, Sec, Ul, DataTable } from "../styles/shared";
import { THEME } from "../utils/constants";
const { gold, surface, border } = THEME;

const SIZES = [
  ["XS", "34–36", "86–91",  "25–26", "64–66"],
  ["S",  "36–38", "91–96",  "26–28", "66–71"],
  ["M",  "38–40", "96–102", "28–30", "71–76"],
  ["L",  "40–42", "102–107","30–32", "76–81"],
  ["XL", "42–44", "107–112","32–34", "81–86"],
  ["XXL","44–46", "112–118","34–36", "86–91"],
  ["3XL","46–48", "118–124","36–38", "91–97"],
];

const HOW_TO = [
  { name:"CHEST",    how:"Measure around the fullest part of your chest, keeping the tape horizontal.", tip:"Add 2\" for a relaxed fit." },
  { name:"LENGTH",   how:"Measure from the highest point of your shoulder down to your desired hem.",  tip:"Our tees have a slightly longer back hem." },
  { name:"SHOULDER", how:"Measure from shoulder seam to shoulder seam across the back.",              tip:"Most important fit indicator." },
];

const FIT_TYPES = [
  { fit:"REGULAR FIT", desc:"Classic silhouette. True to size. Relaxed through the chest and body." },
  { fit:"OVERSIZED",   desc:"Drop shoulder, extended body. Size down for streetwear, true size for ultra-relaxed." },
  { fit:"SLIM FIT",    desc:"Tapered through the waist. If between sizes, size up." },
  { fit:"BOXY",        desc:"Square cut, wider shoulders. Size down for a modern boxy look." },
];

export default function SizeGuide() {
  return (
    <div style={S.page}>
      <div style={{ ...S.wrap, maxWidth: 960 }}>
        <PageHeader eyebrow="SIZING" title="SIZE GUIDE" sub="Find your perfect fit · Measurements in inches unless noted" />

        <div style={{ background:"rgba(201,168,76,0.06)", border:`1px solid ${gold}33`, borderLeft:`3px solid ${gold}`, padding:"16px 20px", marginBottom:36, fontSize:15, color:"#bbb" }}>
          <strong style={{ fontFamily:"'Roboto', sans-serif", fontSize:11, letterSpacing:2, color:gold }}>PRO TIP</strong><br/>
          When between sizes, size up for an oversized streetwear look, or size down for a fitted silhouette. All VelvetWolf tees are pre-washed to minimise shrinkage.
        </div>

        <Sec title="T-SHIRTS & HOODIES">
          <DataTable
            headers={["Size", "Chest (in)", "Chest (cm)", "Shoulder (in)", "Length (in)"]}
            rows={SIZES}
          />
        </Sec>

        <Sec title="HOW TO MEASURE">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:14, marginBottom:24 }}>
            {HOW_TO.map((m, i) => (
              <div key={i} style={{ background:surface, border:`1px solid ${border}`, padding:"20px 18px" }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:3, color:gold, marginBottom:8 }}>{m.name}</div>
                <p style={{ ...S.p, marginBottom:8 }}>{m.how}</p>
                <p style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:"rgba(255,255,255,0.38)", marginBottom:0 }}>💡 {m.tip}</p>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="FABRIC GUIDE">
          <DataTable
            headers={["Fabric", "GSM", "Feel", "Best For"]}
            rows={[
              ["Premium Cotton", "220 GSM", "Soft, structured",    "Everyday wear, office looks"],
              ["Heavy Cotton",   "240 GSM", "Thick, premium",      "Oversized fits, premium drops"],
              ["Lightweight",    "180 GSM", "Airy, breathable",    "Summers, layering"],
              ["Bamboo Blend",   "200 GSM", "Ultra-soft, eco",     "Sensitive skin, sustainability"],
            ]}
          />
        </Sec>

        <Sec title="FIT TYPES">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
            {FIT_TYPES.map((f, i) => (
              <div key={i} style={{ background:surface, border:`1px solid ${border}`, padding:"18px 16px", borderTop:`2px solid ${gold}` }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:3, color:gold, marginBottom:8 }}>{f.fit}</div>
                <p style={{ ...S.p, marginBottom:0, fontSize:13 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="CARE INSTRUCTIONS">
          <Ul items={[<>Machine wash cold (<span style={{ fontFamily: "'Roboto', sans-serif" }}>30°C</span>) with similar colours</>,"Do not bleach or use harsh detergents","Tumble dry on low heat or air dry flat","Iron on medium heat — do not iron directly on prints","Turn inside out before washing to preserve print longevity"]} />
        </Sec>
      </div>
    </div>
  );
}
