import { useEffect, useState, useContext } from "react";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";

export default function PaymentStatusPage() {
  const { setCart, setPage, showToast } = useContext(AppContext);
  const [status, setStatus] = useState("loading"); // loading, success, failed

  useEffect(() => {
    const checkPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get("order_id");

      if (!orderId) {
        setStatus("failed");
        return;
      }

      try {
        const res = await fetch(apiUrl('/checkout/verify'), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId })
        });
        
        const data = await res.json();
        
        if (data.status === "SUCCESS") {
          setStatus("success");
          setCart([]); // Clear cart
          showToast("🎉 Payment successful! Your order has been placed.");
        } else {
          setStatus("failed");
          showToast("Payment was not successful. Please try again.", "error");
        }
      } catch (err) {
        setStatus("failed");
        showToast("Error verifying payment", "error");
      }
    };

    checkPayment();
  }, [setCart, showToast]);

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "60px 40px", maxWidth: 500 }}>
        {status === "loading" && (
          <>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 16 }}>VERIFYING PAYMENT</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)" }}>Please wait while we confirm your payment with the gateway...</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div style={{ fontSize: 60, marginBottom: 20 }}>✓</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2, marginBottom: 16, color: "#81c784" }}>PAYMENT SUCCESSFUL</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", marginBottom: 32 }}>Your order is confirmed. We will dispatch it soon!</p>
            <button className="btn-gold" style={{ padding: "14px 32px" }} onClick={() => {
              // Clean up the URL
              window.history.replaceState({}, document.title, window.location.pathname);
              setPage("account");
            }}>VIEW ORDERS</button>
          </>
        )}

        {status === "failed" && (
          <>
            <div style={{ fontSize: 60, marginBottom: 20 }}>✕</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2, marginBottom: 16, color: "var(--wolf-red)" }}>PAYMENT FAILED</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", marginBottom: 32 }}>Your payment could not be processed. Please try again.</p>
            <button className="btn-ghost" style={{ padding: "14px 32px" }} onClick={() => {
              window.history.replaceState({}, document.title, window.location.pathname);
              setPage("checkout");
            }}>TRY AGAIN</button>
          </>
        )}
      </div>
    </div>
  );
}
