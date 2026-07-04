import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "./AppContext";
import { useLanguage } from "./LanguageContext";
import { useBreakpoint } from "../utils/breakpoints";
import { apiUrl } from "../utils/api";
import { trackBeginCheckout, trackPurchase } from "../utils/analytics";

function loadCashfreeScript() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve(window.Cashfree);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) resolve(window.Cashfree);
      else reject(new Error("Cashfree SDK failed to initialize"));
    };
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK script"));
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, user, showToast, clearCart } = useContext(AppContext);
  const { t } = useLanguage();
  const { isMobile } = useBreakpoint();
  const [step] = useState(1);
  const [showExpressModal, setShowExpressModal] = useState(null); // 'upi', 'gpay', 'applepay'
  const [expressUpiId, setExpressUpiId] = useState("");
  const [expressProcessing, setExpressProcessing] = useState(false);
  const [address, setAddress] = useState({
    name: user?.full_name || user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    address: "", city: "", district: "", state: "", pincode: ""
  });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [pincodeLocations, setPincodeLocations] = useState([]);
  const [loadingPincode, setLoadingPincode] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const shipping = cartTotal >= 1999 ? 0 : 149;
  const tax = Math.round(cartTotal * 0.18);

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discount = Math.round((cartTotal * Number(appliedCoupon.discount_value)) / 100);
    } else if (appliedCoupon.discount_type === "fixed") {
      discount = Number(appliedCoupon.discount_value);
    }
    discount = Math.min(discount, cartTotal);
  }

  const total = Math.max(0, cartTotal - discount + shipping + tax);

  useEffect(() => {
    if (cart.length > 0) {
      trackBeginCheckout(cart, total);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await fetch(apiUrl('/checkout/coupon/validate'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, subtotal: cartTotal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid coupon");

      setAppliedCoupon(data);
      showToast(`Discount applied: ${data.code} ✓`);
    } catch (err) {
      showToast(err.message, "error");
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddress(a => ({ ...a, pincode: pin }));

    if (pin.length === 6) {
      setLoadingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success") {
          const postOffices = data[0].PostOffice;

          const uniqueLocations = [];
          const seen = new Set();

          postOffices.forEach(po => {
            const city = po.Name || "";
            const district = po.District || "";
            const state = po.State || "";
            const key = `${city}-${district}-${state}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueLocations.push({ city, district, state });
            }
          });

          setPincodeLocations(uniqueLocations);

          if (uniqueLocations.length > 0) {
            setAddress(a => ({
              ...a,
              city: uniqueLocations[0].city,
              district: uniqueLocations[0].district,
              state: uniqueLocations[0].state
            }));
          }
        } else {
          setPincodeLocations([]);
          showToast("Invalid Pincode", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Error verifying pincode", "error");
      } finally {
        setLoadingPincode(false);
      }
    } else {
      setPincodeLocations([]);
    }
  };

  const handleOrder = async () => {
    setProcessing(true);
    // Save to session storage for analytics tracking on success
    sessionStorage.setItem("vw_last_checkout_cart", JSON.stringify(cart));
    sessionStorage.setItem("vw_last_checkout_total", String(total));
    try {
      const res = await fetch(apiUrl('/checkout/create'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          address,
          total_amount: total,
          subtotal: cartTotal,
          shipping_amount: shipping,
          tax_amount: tax,
          payment_method: paymentMethod,
          user_id: user?.id,
          couponCode: appliedCoupon?.code || null,
          whatsappUpdates
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate checkout");

      if (paymentMethod === "cod") {
        // Track purchase
        const lastCartVal = sessionStorage.getItem("vw_last_checkout_cart");
        const lastTotalVal = sessionStorage.getItem("vw_last_checkout_total");
        if (lastCartVal) {
          const lastCart = JSON.parse(lastCartVal);
          const lastTotal = Number(lastTotalVal || 0);
          trackPurchase(data.orderId, lastCart, lastTotal, "cod");
          sessionStorage.removeItem("vw_last_checkout_cart");
          sessionStorage.removeItem("vw_last_checkout_total");
        }

        setTimeout(() => {
          clearCart();
          showToast(`🎉 Order placed successfully!`);
          navigate(`/payment-status?order_id=${data.orderId}&method=cod`);
        }, 1300);
        return;
      }

      // Handle Cashfree Payment
      if (data.paymentSessionId) {
        // Initialize Cashfree sdk dynamically
        const Cashfree = await loadCashfreeScript();
        const cashfree = Cashfree({
          mode: "sandbox", // In production this would be "production"
        });

        const checkoutOptions = {
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_self", // Cashfree will redirect back to frontend return_url
        };

        setTimeout(() => {
          cashfree.checkout(checkoutOptions);
        }, 1300);
      } else {
        throw new Error("Payment session not received");
      }

    } catch (err) {
      showToast(err.message, 'error');
      setProcessing(false);
    }
  };

  if (!user && step === 1 && !address.email) {
    // Optional: prompt guest to enter email first, or just show the address form. We'll show the form.
  }

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh", background: "var(--obsidian)", color: "var(--ivory)" }}>

      {/* ONE-PAGE CHECKOUT GRID */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 40px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 380px", gap: 48 }}>

        {/* LEFT COLUMN: Billing & Details */}
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3, marginBottom: 40 }}>CHECKOUT</div>

          {/* 1. EXPRESS PAYMENTS */}
          <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 28, marginBottom: 32 }}>
            <h3 style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 2,
              color: "var(--gold)",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <img src="/express.png" alt="Express" style={{ width: 34, height: 34, objectFit: "contain" }} />
              EXPRESS CHECKOUT
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              {/* UPI Express */}
              <button
                onClick={() => setShowExpressModal('upi')}
                style={{
                  background: "#f5f5f7", // mild white
                  border: "1px solid rgba(0,0,0,0.05)",
                  padding: "10px 14px",
                  height: "44px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                <img src="/bhimupi.png" alt="BHIM UPI" style={{ height: "54px", maxWidth: "100%", objectFit: "contain" }} />
              </button>

              {/* Google Pay */}
              <button
                onClick={() => setShowExpressModal('gpay')}
                style={{
                  background: "#f5f5f7", // mild white
                  border: "1px solid rgba(0,0,0,0.05)",
                  padding: "10px 14px",
                  height: "44px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                <img src="/gpay.png" alt="Google Pay" style={{ height: "54px", maxWidth: "100%", objectFit: "contain" }} />
              </button>

              {/* Apple Pay */}
              <button
                onClick={() => setShowExpressModal('applepay')}
                style={{
                  background: "#f5f5f7", // mild white
                  border: "1px solid rgba(0,0,0,0.05)",
                  padding: "10px 14px",
                  height: "44px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                <img src="/applepay.png" alt="Apple Pay" style={{ height: "54px", maxWidth: "100%", objectFit: "contain" }} />
              </button>
            </div>
          </div>

          {/* 2. DELIVERY ADDRESS */}
          <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 28, marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, margin: 0 }}>{t("deliveryAddress")}</h3>
              {!user && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", background: "rgba(201,168,76,0.1)", padding: "2px 8px" }}>
                  ✦ GUEST CHECKOUT MODE
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <input className="input-dark" placeholder={`${t("fullName")} *`} value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} style={{ gridColumn: "1/-1" }} />
              <input className="input-dark" placeholder={`${t("emailAddress")} *`} value={address.email} onChange={e => setAddress(a => ({ ...a, email: e.target.value }))} style={{ gridColumn: "1/-1" }} />
              <input className="input-dark" placeholder={`${t("mobileNumber")} *`} value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} style={{ gridColumn: "1/-1" }} maxLength={10} />
              <input className="input-dark" placeholder={`${t("addressLine1")} *`} value={address.address} onChange={e => setAddress(a => ({ ...a, address: e.target.value }))} style={{ gridColumn: "1/-1" }} />

              <div style={{ position: "relative" }}>
                <input className="input-dark" placeholder={`${t("pincode")} *`} value={address.pincode} onChange={handlePincodeChange} maxLength={6} style={{ width: "100%" }} />
                {loadingPincode && <span style={{ position: "absolute", right: 10, top: 12, fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>...</span>}
              </div>

              {pincodeLocations.length >= 1 ? (
                <select
                  className="input-dark"
                  value={address.city}
                  onChange={e => {
                    const loc = pincodeLocations.find(l => l.city === e.target.value);
                    if (loc) setAddress(a => ({ ...a, city: loc.city, district: loc.district, state: loc.state }));
                  }}
                  style={{ appearance: "auto", WebkitAppearance: "auto", MozAppearance: "auto" }}
                >
                  <option value="" disabled>SELECT CITY</option>
                  {pincodeLocations.map((loc, i) => (
                    <option key={i} value={loc.city}>{loc.city}</option>
                  ))}
                </select>
              ) : (
                <input className="input-dark" placeholder={`${t("city")} *`} value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
              )}

              <input className="input-dark" placeholder={`${t("district")} *`} value={address.district} onChange={e => setAddress(a => ({ ...a, district: e.target.value }))} />
              <input className="input-dark" placeholder={`${t("state")} *`} value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} />
            </div>
          </div>

          {/* 3. PAYMENT METHOD */}
          <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 28 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 24 }}>PAYMENT METHOD</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { val: "card", label: "ONLINE CARD / UPI / NETBANKING", icon: "/card.png" },
                { val: "cod", label: "CASH ON DELIVERY (COD)", icon: "/cash.png" }
              ].map(({ val, label, icon }) => (
                <label key={val} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 20px", border: `1px solid ${paymentMethod === val ? "var(--gold)" : "var(--smoke)"}`, cursor: "pointer", background: paymentMethod === val ? "rgba(201,168,76,0.05)" : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <input type="radio" name="payment" value={val} checked={paymentMethod === val} onChange={() => setPaymentMethod(val)} style={{ accentColor: "var(--gold)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <img src={icon} alt={label} style={{ width: 20, height: 20, objectFit: "contain" }} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>{label}</span>
                    </div>
                  </div>
                  {val === "card" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 28, flexWrap: "wrap", marginTop: 8 }}>
                      {/* Visa */}
                      <img src="/visa.png" alt="Visa" style={{ height: "50px", objectFit: "contain", borderRadius: 4 }} />

                      {/* Mastercard */}
                      <div style={{
                        width: 50,
                        height: 30,
                        borderRadius: 3,
                        background: "#f5f5f7", // mild white
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 3,
                        boxSizing: "border-box",
                        border: "1px solid rgba(0,0,0,0.05)"
                      }}>
                        <img src="/mastercard.webp" alt="Mastercard" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      </div>

                      {/* RuPay */}
                      <img src="/rupay.png" alt="RuPay" style={{ height: "50px", objectFit: "contain", borderRadius: 4 }} />
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary */}
        <div>
          <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px", position: "sticky", top: 90 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, marginBottom: 20, borderBottom: "1px solid var(--smoke)", paddingBottom: 16 }}>ORDER SUMMARY</h3>
            {cart.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, padding: "8px 0", borderBottom: "1px solid var(--smoke)" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ivory)", letterSpacing: 1 }}>{item.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>Sz: {item.size} · Qty: {item.qty}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ash)" }}>₹{(item.price * item.qty).toLocaleString()}</div>
              </div>
            ))}

            {/* Coupon Code Input */}
            <div style={{ padding: "16px 0", borderBottom: "1px solid var(--smoke)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", letterSpacing: 1, marginBottom: 8 }}>PROMO CODE</div>
              {appliedCoupon ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,168,76,0.1)", padding: "8px 12px", border: "1px solid var(--gold)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", fontWeight: "bold" }}>{appliedCoupon.code} APPLIED</span>
                  <button onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} style={{ background: "none", border: "none", color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>REMOVE</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    className="input-dark"
                    placeholder="ENTER CODE"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    style={{ flex: 1, padding: "8px 12px", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon}
                    style={{
                      background: "var(--gold)",
                      border: "none",
                      color: "var(--obsidian)",
                      padding: "0 16px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {validatingCoupon ? "..." : "APPLY"}
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              {[
                ["Subtotal", `₹${cartTotal.toLocaleString()}`],
                ...(discount > 0 ? [["Discount", `-₹${discount.toLocaleString()}`]] : []),
                ["Shipping", shipping === 0 ? "FREE" : `₹${shipping}`],
                ["GST (18%)", `₹${tax.toLocaleString()}`]
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", marginBottom: 8, letterSpacing: 1 }}>
                  <span>{label}</span><span style={{ color: val === "FREE" ? "#81c784" : val.startsWith("-") ? "#ff6b6b" : "var(--ash)" }}>{val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ivory)", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gold)" }}>
                <span>TOTAL</span><span style={{ color: "var(--gold)" }}>₹{total.toLocaleString()}</span>
              </div>
            </div>

            {/* WhatsApp Updates Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(37, 211, 102, 0.04)",
                border: "1px solid rgba(37, 211, 102, 0.15)",
                borderRadius: "4px",
                padding: "12px 16px",
                marginTop: 16,
                userSelect: "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src="/whatsapp.gif" alt="WhatsApp" style={{ width: 22, height: 22, objectFit: "contain" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 0.5, color: "var(--silver)" }}>
                  GET ORDER UPDATES ON WHATSAPP
                </span>
              </div>

              {/* Toggle Switch */}
              <div
                onClick={() => setWhatsappUpdates(prev => !prev)}
                style={{
                  width: 38,
                  height: 20,
                  borderRadius: 10,
                  background: whatsappUpdates ? "#25d366" : "var(--smoke)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease"
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: whatsappUpdates ? 21 : 3,
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }}
                />
              </div>
            </div>

            {/* Place Order & WhatsApp Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              <button
                className="btn-gold"
                style={{
                  width: "100%",
                  height: "48px",
                  opacity: processing ? 0.8 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden"
                }}
                onClick={() => {
                  const { name, email, phone, address: addr, city, district, state, pincode } = address;
                  if (!name.trim()) { showToast("Please enter your full name.", "error"); return; }
                  if (!email.trim() || !email.includes("@")) { showToast("Please enter a valid email.", "error"); return; }
                  if (!/^[6-9]\d{9}$/.test(phone)) { showToast("Enter a valid 10-digit mobile number.", "error"); return; }
                  if (!addr.trim()) { showToast("Please enter your address.", "error"); return; }
                  if (!/^\d{6}$/.test(pincode)) { showToast("Enter a valid 6-digit pincode.", "error"); return; }
                  if (!city.trim()) { showToast("Please enter your city.", "error"); return; }
                  if (!district.trim()) { showToast("Please enter your district.", "error"); return; }
                  if (!state.trim()) { showToast("Please enter your state.", "error"); return; }
                  handleOrder();
                }}
                disabled={processing || cart.length === 0}
              >
                {processing ? (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <style>{`
                      @keyframes slideCart {
                        0% { left: -50px; }
                        100% { left: 100%; }
                      }
                    `}</style>
                    <lottie-player
                      src="/shopping cart.json"
                      background="transparent"
                      speed="1"
                      style={{
                        width: 48,
                        height: 48,
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        animation: "slideCart 1.3s linear forwards"
                      }}
                      loop={false}
                      autoplay
                    ></lottie-player>
                  </div>
                ) : (
                  `PLACE ORDER · ₹${total.toLocaleString()}`
                )}
              </button>

              {/* ORDER VIA WHATSAPP - COMMENTED OUT
              <button
                onClick={() => {
                  const { name, phone, address: addr, city, pincode } = address;
                  const itemsText = cart.map(i => `- ${i.name} (Size: ${i.size}, Qty: ${i.qty})`).join("\n");
                  const msg = `Hello VelvetWolf, I would like to place an order:\n\n*Items:*\n${itemsText}\n\n*Total Amount:* ₹${total.toLocaleString()}\n\n*Delivery Address:*\nName: ${name || 'N/A'}\nPhone: ${phone || 'N/A'}\nAddress: ${addr || 'N/A'}, ${city || 'N/A'} - ${pincode || 'N/A'}`;
                  const url = `https://wa.me/919999999999?text=${encodeURIComponent(msg)}`;
                  window.open(url, "_blank");
                }}
                style={{
                  background: "#25d366",
                  color: "#fff",
                  border: "none",
                  padding: "14px 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: "bold",
                  letterSpacing: 1,
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                ORDER VIA WHATSAPP
              </button>
              */}
            </div>

          </div>
        </div>

      </div>

      {/* EXPRESS CHECKOUT POPUP DIALOGS */}
      {showExpressModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: 36, maxWidth: 450, width: "100%", margin: 20, position: "relative" }}>
            <button
              onClick={() => { setShowExpressModal(null); setExpressUpiId(""); }}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--gold)", cursor: "pointer" }}
            >
              ✕
            </button>

            {showExpressModal === 'upi' && (
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)", marginBottom: 16 }}>⚡ UPI EXPRESS PAY</h3>
                <p style={{ fontSize: 13, color: "var(--silver)", marginBottom: 20, fontFamily: "var(--font-serif)" }}>Enter your UPI Virtual Payment Address (VPA) to pay instantly.</p>
                <input
                  type="text"
                  className="input-dark"
                  placeholder="e.g. username@okhdfcbank"
                  value={expressUpiId}
                  onChange={e => setExpressUpiId(e.target.value)}
                  style={{ width: "100%", padding: 12, marginBottom: 20 }}
                />
                <button
                  className="btn-gold"
                  style={{ width: "100%", padding: 12 }}
                  disabled={expressProcessing || !expressUpiId.includes("@")}
                  onClick={async () => {
                    const { name, email, phone, address: addr, city, pincode } = address;
                    if (!name.trim() || !email.trim() || !phone.trim() || !addr.trim() || !city.trim() || !pincode.trim()) {
                      showToast("Please fill in your delivery details first.", "error");
                      setShowExpressModal(null);
                      return;
                    }
                    setExpressProcessing(true);
                    showToast("Simulating transaction verification...");
                    setTimeout(async () => {
                      setExpressProcessing(false);
                      setShowExpressModal(null);
                      await handleOrder();
                    }, 2000);
                  }}
                >
                  {expressProcessing ? "WAITING FOR TRANSACTION..." : `PAY ₹${total.toLocaleString()}`}
                </button>
              </div>
            )}

            {(showExpressModal === 'gpay' || showExpressModal === 'applepay') && (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)", marginBottom: 16 }}>
                  {showExpressModal === 'gpay' ? "GOOGLE PAY EXPRESS" : "APPLE PAY EXPRESS"}
                </h3>
                <p style={{ fontSize: 13, color: "var(--silver)", marginBottom: 24, fontFamily: "var(--font-serif)" }}>
                  Confirm checkout of <span style={{ color: "var(--gold)", fontWeight: "bold" }}>₹{total.toLocaleString()}</span> using express pay metadata.
                </p>
                <button
                  className="btn-gold"
                  style={{ width: "100%", padding: 14 }}
                  disabled={expressProcessing}
                  onClick={async () => {
                    const { name, email, phone, address: addr, city, pincode } = address;
                    if (!name.trim() || !email.trim() || !phone.trim() || !addr.trim() || !city.trim() || !pincode.trim()) {
                      showToast("Please fill in your delivery details first.", "error");
                      setShowExpressModal(null);
                      return;
                    }
                    setExpressProcessing(true);
                    showToast("Authorizing express check-out...");
                    setTimeout(async () => {
                      setExpressProcessing(false);
                      setShowExpressModal(null);
                      await handleOrder();
                    }, 2000);
                  }}
                >
                  {expressProcessing ? "AUTHORIZING TRANSACTION..." : "CONFIRM EXPRESS TRANSACTION"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
