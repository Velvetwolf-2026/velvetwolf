import { useContext, useEffect, useState } from "react";
import { AppContext } from "./AppContext";

export default function BulkOrderSuccessPage() {
  const { setPage, user } = useContext(AppContext);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("vw_last_bulk_order");
    if (stored) {
      try {
        setDetails(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "60px 40px", maxWidth: 600, width: "100%", margin: "40px 20px" }}>
        <div style={{ fontSize: 60, color: "var(--gold)", marginBottom: 20 }}>✓</div>
        
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2, marginBottom: 16, color: "#81c784" }}>
          Quote request sent
        </h1>
        
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", marginBottom: 32, lineHeight: 1.6 }}>
          Thank you for your request. We have received your bulk order details and will email you a custom quote within 24 hours.
        </p>

        {details && (
          <div style={{ border: "1px solid var(--smoke)", padding: "20px", background: "rgba(255,255,255,0.01)", textAlign: "left", marginBottom: 32, fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <div style={{ borderBottom: "1px solid var(--smoke)", paddingBottom: 10, marginBottom: 12, color: "var(--gold)", letterSpacing: 1, fontWeight: "bold" }}>
              Request summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div><span style={{ color: "var(--ash)" }}>Order type:</span> {details.type?.toUpperCase()}</div>
              <div><span style={{ color: "var(--ash)" }}>Organization:</span> {details.org}</div>
              <div><span style={{ color: "var(--ash)" }}>Contact person:</span> {details.contact}</div>
              <div><span style={{ color: "var(--ash)" }}>Email address:</span> {details.email}</div>
              <div><span style={{ color: "var(--ash)" }}>Quantity:</span> {details.qty} pcs</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-ghost" style={{ padding: "14px 28px" }} onClick={() => setPage("home")}>
            Back to home
          </button>
          <button className="btn-gold" style={{ padding: "14px 28px" }} onClick={() => setPage("shop")}>
            Explore store
          </button>
        </div>

        {!user && (
          <div style={{ border: "1px solid var(--gold)", padding: "24px", background: "rgba(201,168,76,0.02)", textAlign: "left", marginTop: 32 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)", marginBottom: 12 }}>Create an account to:</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <div>✓ Track design updates</div>
              <div>✓ Order bulk repeat runs quickly</div>
              <div>✓ Manage billing profiles</div>
            </div>
            <button className="btn-gold" style={{ width: "100%", padding: "12px" }} onClick={() => setPage("signup")}>
              Create account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
