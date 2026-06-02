import { S, PageHeader, Sec, Ul, DataTable } from "../styles/shared";
import { THEME } from "../utils/constants";
const { gold, surface, border, text } = THEME;

const STAT_CARDS = [
  { icon: "7", label: "DAYS TO RETURN", desc: "From date of delivery" },
  { icon: "48h", label: "REFUND TIME", desc: "To original payment method" },
  { icon: "EX", label: "FREE EXCHANGE", desc: "Size exchanges at no extra cost" },
  { icon: "Rs", label: "STORE CREDIT", desc: "Instant credit, no wait" },
];

const STEPS = [
  { step: "01", title: "EMAIL US", email: "info@velvetwolf.in", desc: "with your order ID, items to return, and reason. Attach photos if defective." },
  { step: "02", title: "GET APPROVED", desc: "We'll review your request within 24 hours and send a return authorisation with instructions." },
  { step: "03", title: "SHIP IT BACK", desc: "Pack the item securely. Drop at the nearest courier point or schedule a pickup (available in select cities)." },
  { step: "04", title: "REFUND PROCESSED", desc: "Once we receive and inspect the item (2-3 days), your refund or exchange is processed within 48 hours." },
];

export default function ReturnsPage() {
  const formatText = (text) =>
    text.split(/(\d+(-\d+)?\s?(hours|days)?)/gi).map((part, i) =>
      /\d/.test(part) ? (
        <span key={i} style={{ fontFamily: "'Roboto', sans-serif" }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <PageHeader eyebrow="RETURNS" title="RETURNS & EXCHANGE" sub="Hassle-free returns within 7 days of delivery" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 44 }}>
          {STAT_CARDS.map((c, i) => (
            <div key={i} style={{ background: surface, border: `1px solid ${border}`, padding: "20px", textAlign: "center", borderBottom: `2px solid ${gold}` }}>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 30, color: gold, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: 3, color: text, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)" }}>{c.desc}</div>
            </div>
          ))}
        </div>

        <Sec title="ELIGIBLE ITEMS">
          <Ul
            items={[
              "Items in original condition - unwashed, unworn, tags intact",
              <>Items returned within <span style={{ fontFamily: "'Roboto', sans-serif" }}>7</span> days of delivery</>,
              "Items with a manufacturing defect (full refund or replacement)",
              "Wrong item received (full refund + free return pickup)",
              <>Damaged in transit (share photos within <span style={{ fontFamily: "'Roboto', sans-serif" }}>24</span> hours of delivery)</>
            ]}
          />
        </Sec>

        <Sec title="NON-ELIGIBLE ITEMS">
          <Ul
            items={[
              "Custom/personalised orders with your uploaded design",
              "Limited Edition drops (marked as Final Sale)",
              "Items that have been washed, worn, or altered",
              "Items without original tags or packaging",
              <>Items returned after <span style={{ fontFamily: "'Roboto', sans-serif" }}>7</span> days</>,
              "Items purchased during Final Sale events"
            ]}
          />
        </Sec>

        <Sec title="HOW TO INITIATE A RETURN">
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 20, marginBottom: 24, alignItems: "flex-start" }}>

              <div
                style={{
                  fontFamily: "'Bebas Neue',cursive",
                  fontSize: 28,
                  color: gold,
                  opacity: 0.5,
                  lineHeight: 1,
                  flexShrink: 0,
                  width: 36
                }}
              >
                {s.step}
              </div>

              <div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: 2, color: text, marginBottom: 4 }}>
                  {s.title}
                </div>

                <p style={{ ...S.p, marginBottom: 0 }}>
                  {s.email ? (
                    <>
                      Send an email to{" "}
                      <a href={`mailto:${s.email}`} style={{ color: gold }}>
                        {s.email}
                      </a>{" "}
                      {formatText(s.desc)}
                    </>
                  ) : (
                    formatText(s.desc)
                  )}
                </p>
              </div>
            </div>
          ))}
        </Sec>

        <Sec title="REFUND METHODS">
          <DataTable
            headers={["Method", "Timeline", "Notes"]}
            rows={[
              ["Original Payment Method", "5-7 business days", "Bank processing time may vary"],
              ["VelvetWolf Store Credit", "Instant", "5% bonus credit added"],
              ["UPI Refund", "1-3 business days", "Fastest refund option"],
              ["COD Orders", "Bank transfer 5 days", "Provide bank details to support"],
            ]}
          />
        </Sec>

        <Sec title="SIZE EXCHANGE">
          <p style={S.p}>
            We offer <strong style={{ color: text }}>free size exchanges</strong> within{" "}
            <span style={{ fontFamily: "'Roboto', sans-serif" }}>7</span> days (subject to availability). Initiate a return, select "Exchange", and specify the size you need. If unavailable, we'll issue a full refund.
          </p>
        </Sec>
      </div>
    </div>
  );
}

