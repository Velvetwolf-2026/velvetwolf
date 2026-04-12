import { useState } from "react";
import { S, PageHeader, Sec } from "../styles/shared";
import { THEME } from "../utils/constants";

const { gold, goldLight, surface, border, muted, text } = THEME;

const ORDER_ID_RE = /^VW-\d{4}-[A-Z0-9]{4,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TRACKING_STEPS = [
  { label: "Order Placed", time: "Mar 8, 10:32 AM", done: true },
  { label: "Payment Confirmed", time: "Mar 8, 10:33 AM", done: true },
  { label: "In Production", time: "Mar 9, 2:15 PM", done: true },
  { label: "Quality Check", time: "Mar 10, 11:00 AM", done: true },
  { label: "Dispatched", time: "Mar 11, 9:45 AM", done: true },
  { label: "Out for Delivery", time: "Expected today", done: false },
  { label: "Delivered", time: "—", done: false },
];

const STATUS_GUIDE = [
  { status: "ORDER PLACED", desc: "We've received your order and are preparing it." },
  { status: "IN PRODUCTION", desc: "Your tee is being printed and quality checked." },
  { status: "DISPATCHED", desc: "Your order is with our logistics partner." },
  { status: "OUT FOR DELIVERY", desc: "Your delivery agent is on the way." },
  { status: "DELIVERED", desc: "Your order has been delivered. Enjoy!" },
  { status: "RETURN INITIATED", desc: "Your return request is being processed." },

];

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");

  const [tracked, setTracked] = useState(false);
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

  const handleTrack = () => {
    const nextErrors = {};
    const normalizedOrderId = orderId.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!ORDER_ID_RE.test(normalizedOrderId)) {
      nextErrors.orderId = "Enter a valid order ID like VW-2025-ABCD.";
    }

    if (!EMAIL_RE.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setTracked(false);
      return;
    }

    setOrderId(normalizedOrderId);
    setEmail(normalizedEmail);
    setTracked(true);
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
                label: "ORDER ID",
                placeholder: "VW-2025-ABCD",
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
            style={{
              background: gold,
              color: "#0a0a0a",
              border: "none",
              padding: "12px 32px",
              fontFamily: "'Bebas Neue',cursive",
              fontSize: 16,
              letterSpacing: 4,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = goldLight)}
            onMouseLeave={(e) => (e.currentTarget.style.background = gold)}
          >
            TRACK ORDER →
          </button>
        </div>

        {tracked && (
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
                  ORDER ID
                </div>
                <div
                  style={{
                    fontFamily: "'Bebas Neue',cursive",
                    fontSize: 22,
                    letterSpacing: 3,
                    color: gold,
                  }}
                >
                  {orderId}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(76,175,80,0.1)",
                  border: "1px solid rgba(76,175,80,0.3)",
                  padding: "6px 16px",
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: "#81c784",
                }}
              >
                ● OUT FOR DELIVERY
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

              {TRACKING_STEPS.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: i < TRACKING_STEPS.length - 1 ? 24 : 0,
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
                { label: "CARRIER", value: "Delhivery" },
                { label: "AWB NUMBER", value: "DEL7823940123" },
                { label: "ESTIMATED", value: "Today by 8 PM" },
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