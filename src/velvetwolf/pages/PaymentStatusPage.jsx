import { useEffect, useState, useContext } from "react";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import { trackPurchase } from "../utils/analytics";
import { getSupabaseLogoUrl } from "../utils/supabase";

export default function PaymentStatusPage() {
  const { clearCart, setPage, showToast, user } = useContext(AppContext);
  const [status, setStatus] = useState("loading"); // loading, success, failed

  useEffect(() => {
    const checkPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get("order_id");
      const method = urlParams.get("method");

      if (!orderId) {
        setStatus("failed");
        return;
      }

      const performTrackAndClear = (m) => {
        const lastCartVal = sessionStorage.getItem("vw_last_checkout_cart");
        const lastTotalVal = sessionStorage.getItem("vw_last_checkout_total");
        if (lastCartVal) {
          const lastCart = JSON.parse(lastCartVal);
          const lastTotal = Number(lastTotalVal || 0);
          trackPurchase(orderId, lastCart, lastTotal, m);
          sessionStorage.removeItem("vw_last_checkout_cart");
          sessionStorage.removeItem("vw_last_checkout_total");
        }
        clearCart();
      };

      if (method === "cod") {
        setStatus("success");
        performTrackAndClear("cod");
        showToast("🎉 Order placed successfully!");
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
          performTrackAndClear("card");
          showToast("🎉 Payment successful! Your order has been placed.");
        } else {
          setStatus("failed");
          showToast("Payment was not successful. Please try again.", "error");
        }
      } catch {
        setStatus("failed");
        showToast("Error verifying payment", "error");
      }
    };

    checkPayment();
  }, []);

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "60px 40px", maxWidth: 500, width: "100%" }}>
        {status === "loading" && (
          <>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 16 }}>VERIFYING PAYMENT</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)" }}>Please wait while we confirm your payment with the gateway...</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <img src={getSupabaseLogoUrl("/payment-success.png")} alt="Order Successful" style={{ width: 140, height: 140, objectFit: "contain", marginBottom: 20 }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2, marginBottom: 16, color: "#81c784" }}>ORDER SUCCESSFUL</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", marginBottom: 32 }}>Your order is confirmed. We will dispatch it soon!</p>
            
            {!user ? (
              <div style={{ border: "1px solid var(--gold)", padding: "24px", background: "rgba(201,168,76,0.02)", textAlign: "left" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)", marginBottom: 12 }}>CREATE AN ACCOUNT TO:</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  <div>✓ Track Orders</div>
                  <div>✓ Faster Checkout</div>
                  <div>✓ Save Addresses</div>
                </div>
                <button className="btn-gold" style={{ width: "100%", padding: "12px" }} onClick={() => {
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setPage("signup");
                }}>CREATE ACCOUNT</button>
              </div>
            ) : (
              <button className="btn-gold" style={{ padding: "14px 32px" }} onClick={() => {
                // Clean up the URL
                window.history.replaceState({}, document.title, window.location.pathname);
                setPage("account");
              }}>VIEW ORDERS</button>
            )}
          </>
        )}

        {status === "failed" && (
          <>
            <img src={getSupabaseLogoUrl("/payment-error.png")} alt="Payment Failed" style={{ width: 140, height: 140, objectFit: "contain", marginBottom: 20 }} />
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
