import { useState } from "react";
import { S, PageHeader, Sec } from "../styles/shared";
import { THEME } from "../utils/constants";
import { apiUrl } from "../utils/api";

const { gold, goldLight, surface, border, muted, text } = THEME;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_GUIDE = [
  { status: "ORDER PLACED", desc: "We've received your order and are preparing it." },
  { status: "PAYMENT CONFIRMED", desc: "Your payment has been verified by our gateway." },
  { status: "IN PRODUCTION", desc: "Your premium streetwear is being processed and printed." },
  { status: "QUALITY CHECK", desc: "The piece is inspected for fabric and printing details." },
  { status: "DISPATCHED", desc: "Your order is package-sealed and with our courier partner." },
  { status: "OUT FOR DELIVERY", desc: "Your delivery agent is on the way." },
  { status: "DELIVERED", desc: "Your order has been delivered. Enjoy!" },
];

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");

  const [tracked, setTracked] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const inputStyle = {
    width: "100%",
    background: "#0a0a0a",
    border: `1px solid ${border}`,
    color: text,
    padding: "12px 14px",
    fontFamily: "'Space Mono',monospace",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const handleTrack = async () => {
    const nextErrors = {};
    const normalizedOrderId = orderId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedOrderId || normalizedOrderId.length < 5) {
      nextErrors.orderId = "Enter a valid order Reference or ID.";
    }

    if (!EMAIL_RE.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setTracked(false);
      setTrackingData(null);
      return;
    }

    setLoading(true);
    setTracked(false);
    setTrackingData(null);

    try {
      const res = await fetch(apiUrl(`/shipping/track/${encodeURIComponent(normalizedOrderId)}`));
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Order tracking details not found. Verify details and try again.");
      }

      setTrackingData(data);
      setTracked(true);
    } catch (err) {
      setErrors({ orderId: err.message });
      setTracked(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <PageHeader
          eyebrow="ORDERS"
          title="TRACK YOUR ORDER"
          sub="Real-time tracking for every VelvetWolf delivery"
        />

        <div
          style={{
            background: surface,
            border: `1px solid ${border}`,
            padding: "32px",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue',cursive",
              fontSize: 20,
              letterSpacing: 4,
              color: gold,
              marginBottom: 20,
            }}
          >
            ENTER ORDER DETAILS
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {[
              {
                key: "orderId",
                label: "ORDER ID / REF",
                placeholder: "e.g. 705fca1c-xxxx...",
                val: orderId,
                set: setOrderId,
              },
              {
                key: "email",
                label: "EMAIL ADDRESS",
                placeholder: "you@email.com",
                val: email,
                set: setEmail,
              },
            ].map((f) => (
              <div key={f.key}>
                <label
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 12,
                    letterSpacing: 3,
                    color: muted,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  {f.label}
                </label>

                <input
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = gold)}
                  onBlur={(e) => (e.target.style.borderColor = border)}
                />

                {errors[f.key] && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#ff8a80" }}>
                    {errors[f.key]}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleTrack}
            disabled={loading}
            style={{
              background: gold,
              color: "#0a0a0a",
              border: "none",
              padding: "12px 32px",
              fontFamily: "'Bebas Neue',cursive",
              fontSize: 16,
              letterSpacing: 4,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = goldLight)}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = gold)}
          >
            {loading ? "SEARCHING..." : "TRACK ORDER →"}
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", border: `1px solid ${border}` }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: 4, color: gold }}>
              RETRIEVING LIVE TRACKING DETAILS...
            </div>
          </div>
        )}

        {tracked && trackingData && (
          <div style={{ border: `1px solid ${gold}44`, padding: "28px 28px 32px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 28,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 14,
                    letterSpacing: 3,
                    color: muted,
                    marginBottom: 4,
                  }}
                >
                  ORDER REFERENCE
                </div>
                <div
                  style={{
                    fontFamily: "'Bebas Neue',cursive",
                    fontSize: 22,
                    letterSpacing: 3,
                    color: gold,
                  }}
                >
                  {trackingData.order_id?.toUpperCase()}
                </div>
              </div>

              <div
                style={{
                  background: trackingData.status === "DELIVERED" ? "rgba(76,175,80,0.1)" : "rgba(201,168,76,0.1)",
                  border: trackingData.status === "DELIVERED" ? "1px solid rgba(76,175,80,0.3)" : "1px solid rgba(201,168,76,0.3)",
                  padding: "6px 16px",
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: trackingData.status === "DELIVERED" ? "#81c784" : gold,
                }}
              >
                ● {trackingData.status}
              </div>
            </div>

            <div style={{ position: "relative", paddingLeft: 32 }}>
              <div
                style={{
                  position: "absolute",
                  left: 9,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: border,
                }}
              />

              {trackingData.steps?.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: i < trackingData.steps.length - 1 ? 24 : 0,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -32,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      top: 0,
                      background: step.done ? gold : "#1a1a1a",
                      border: `2px solid ${step.done ? gold : border}`,
                      fontSize: 9,
                      color: step.done ? "#0a0a0a" : muted,
                    }}
                  >
                    {step.done ? "✓" : ""}
                  </div>

                  <div>
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 10,
                        letterSpacing: 1,
                        color: step.done ? text : muted,
                        marginBottom: 2,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 8,
                        letterSpacing: 1,
                        color: muted,
                      }}
                    >
                      {step.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <hr style={S.rule} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 16,
              }}
            >
              {[
                { label: "CARRIER", value: trackingData.courier_name || "Shiprocket Logistics" },
                { label: "AWB NUMBER", value: trackingData.awb_number || "Awaiting Assignment" },
                { label: "ESTIMATED DELIVERY", value: trackingData.etd || "3-5 Business Days" },
              ].map((d, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontFamily: "'Space Mono',monospace",
                      fontSize: 8,
                      letterSpacing: 3,
                      color: muted,
                      marginBottom: 4,
                    }}
                  >
                    {d.label}
                  </div>
                  <div style={{ fontSize: 14, color: text }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Sec title="ORDER STATUS GUIDE">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 10,
            }}
          >
            {STATUS_GUIDE.map((s, i) => (
              <div
                key={i}
                style={{
                  background: surface,
                  border: `1px solid ${border}`,
                  padding: "16px 14px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 11,
                    letterSpacing: 2,
                    color: gold,
                    marginBottom: 6,
                  }}
                >
                  {s.status}
                </div>
                <p style={{ ...S.p, marginBottom: 0, fontSize: 15 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="NEED HELP?">
          <p style={S.p}>
            If your tracking hasn't updated in{" "}
            <span style={{ fontFamily: "'Roboto', sans-serif" }}>48</span> hours, contact us at{" "}
            <a
              href="mailto:info@velvetwolf.in"
              style={{ color: gold, textDecoration: "none" }}
            >
              info@velvetwolf.in
            </a>{" "}
            with your order ID. We respond within{" "}
            <span style={{ fontFamily: "'Roboto', sans-serif" }}>4</span> hours.
          </p>
        </Sec>
      </div>
    </div>
  );
}