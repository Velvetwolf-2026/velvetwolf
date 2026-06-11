import { useState, useContext, useEffect } from "react";
import { AppContext } from "./AppContext";
import { useLanguage } from "./LanguageContext";
import { apiUrl } from "../utils/api";
import { trackBeginCheckout, trackPurchase } from "../utils/analytics";

export default function CheckoutPage() {
  const { cart, cartTotal, setCart, setPage, user, showToast, clearCart } = useContext(AppContext);
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({ 
    name: user?.full_name || user?.name || "", 
    phone: user?.phone || "", 
    email: user?.email || "",
    address: "", city: "", district: "", state: "", pincode: "" 
  });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
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
          couponCode: appliedCoupon?.code || null
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

        clearCart();
        showToast(`🎉 Order placed successfully!`);
        window.history.replaceState({}, "", `${window.location.pathname}?order_id=${data.orderId}&method=cod`);
        setPage('payment-status');
        return;
      }

      // Handle Cashfree Payment
      if (data.paymentSessionId) {
        // Initialize Cashfree sdk
        const cashfree = window.Cashfree({
          mode: "sandbox", // In production this would be "production"
        });

        const checkoutOptions = {
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_self", // Cashfree will redirect back to frontend return_url
        };
        
        cashfree.checkout(checkoutOptions);
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
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 40px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 48 }}>
        {/* Left */}
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3, marginBottom: 40 }}>CHECKOUT</div>
          {/* Steps */}
          <div style={{ display: "flex", gap: 0, marginBottom: 40 }}>
            {["DELIVERY", "PAYMENT", "REVIEW"].map((s, i) => (
              <div key={s} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: step > i + 1 ? "var(--gold)" : step === i + 1 ? "var(--gold)" : "var(--smoke)", color: step >= i + 1 ? "var(--obsidian)" : "var(--silver)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, margin: "0 auto 8px", fontWeight: "bold" }}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: step === i + 1 ? "var(--gold)" : "var(--silver)" }}>{s}</div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 24 }}>{t("deliveryAddress")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <input className="input-dark" placeholder={`${t("fullName")} *`} value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
                <input className="input-dark" placeholder={`${t("emailAddress")} *`} value={address.email} onChange={e => setAddress(a => ({ ...a, email: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
                <input className="input-dark" placeholder={`${t("mobileNumber")} *`} value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} style={{ gridColumn: "1/-1" }} maxLength={10}/>
                <input className="input-dark" placeholder={`${t("addressLine1")} *`} value={address.address} onChange={e => setAddress(a => ({ ...a, address: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
                
                <div style={{ position: "relative" }}>
                  <input className="input-dark" placeholder={`${t("pincode")} *`} value={address.pincode} onChange={handlePincodeChange} maxLength={6} style={{ width: "100%" }}/>
                  {loadingPincode && <span style={{ position: "absolute", right: 10, top: 12, fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>...</span>}
                </div>

                {pincodeLocations.length > 1 ? (
                  <select className="input-dark" value={address.city} onChange={e => {
                    const loc = pincodeLocations.find(l => l.city === e.target.value);
                    if (loc) setAddress(a => ({ ...a, city: loc.city, district: loc.district, state: loc.state }));
                  }}>
                    <option value="" disabled>{t("shop") === "दुकान" ? "शहर चुनें" : (t("shop") === "கடை" ? "நகரத்தைத் தேர்வுசெய்க" : "SELECT CITY")}</option>
                    {pincodeLocations.map((loc, i) => (
                      <option key={i} value={loc.city}>{loc.city}</option>
                    ))}
                  </select>
                ) : (
                  <input className="input-dark" placeholder={`${t("city")} *`} value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}/>
                )}
                
                <input className="input-dark" placeholder={`${t("district")} *`} value={address.district} onChange={e => setAddress(a => ({ ...a, district: e.target.value }))}/>
                
                <input className="input-dark" placeholder={`${t("state")} *`} value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}/>
              </div>
              <button className="btn-gold" style={{ marginTop: 28, padding: "14px 40px" }} onClick={() => {
                const { name, email, phone, address: addr, city, district, state, pincode } = address;
                if (!name.trim())       { showToast("Please enter your full name.", "error"); return; }
                if (!email.trim() || !email.includes("@")) { showToast("Please enter a valid email.", "error"); return; }
                if (!/^[6-9]\d{9}$/.test(phone)) { showToast("Enter a valid 10-digit mobile number.", "error"); return; }
                if (!addr.trim())       { showToast("Please enter your address.", "error"); return; }
                if (!/^\d{6}$/.test(pincode)) { showToast("Enter a valid 6-digit pincode.", "error"); return; }
                if (!city.trim())       { showToast("Please enter your city.", "error"); return; }
                if (!district.trim())   { showToast("Please enter your district.", "error"); return; }
                if (!state.trim())      { showToast("Please enter your state.", "error"); return; }
                setStep(2);
              }}>{t("shop") === "दुकान" ? "भुगतान जारी रखें" : (t("shop") === "கடை" ? "பணம் செலுத்த தொடரவும்" : "CONTINUE TO PAYMENT")}</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 24 }}>{t("shop") === "दुकान" ? "भुगतान की विधि" : (t("shop") === "கடை" ? "கொடுப்பனவு முறை" : "PAYMENT METHOD")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {[["card", `💳 ${t("online")}`], ["cod", `💵 ${t("cod")}`]].map(([val, label]) => (
                  <label key={val} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", border: `1px solid ${paymentMethod === val ? "var(--gold)" : "var(--smoke)"}`, cursor: "pointer", background: paymentMethod === val ? "rgba(201,168,76,0.05)" : "transparent" }}>
                    <input type="radio" name="payment" value={val} checked={paymentMethod === val} onChange={() => setPaymentMethod(val)} style={{ accentColor: "var(--gold)" }}/>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>{label}</span>
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                <button className="btn-ghost" onClick={() => setStep(1)}>{t("shop") === "दुकान" ? "पीछे" : (t("shop") === "கடை" ? "முன்னால்" : "BACK")}</button>
                <button className="btn-gold" style={{ flex: 1 }} onClick={() => setStep(3)}>{t("shop") === "दुकान" ? "समीक्षा करें" : (t("shop") === "கடை" ? "மதிப்பாய்வு" : "REVIEW ORDER")}</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 24 }}>{t("shop") === "दुकान" ? "ऑर्डर समीक्षा" : (t("shop") === "கடை" ? "ஆர்டர் மதிப்பாய்வு" : "ORDER REVIEW")}</h3>
              <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "20px 24px", marginBottom: 20 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>{t("deliveryAddress").toUpperCase()}</div>
                <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{address.name} · {address.phone}</div>
                <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{address.address}, {address.city}, {address.state} - {address.pincode}</div>
              </div>
              <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "20px 24px", marginBottom: 28 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>{t("shop") === "दुकान" ? "भुगतान" : (t("shop") === "கடை" ? "கொடுப்பனவு" : "PAYMENT")}</div>
                <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{paymentMethod === "card" ? t("online") : t("cod")}</div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-ghost" onClick={() => setStep(2)}>{t("shop") === "दुकान" ? "पीछे" : (t("shop") === "கடை" ? "முன்னால்" : "BACK")}</button>
                <button className="btn-gold" style={{ flex: 1, opacity: processing ? 0.7 : 1 }} onClick={handleOrder} disabled={processing}>
                  {processing ? (t("shop") === "दुकान" ? "प्रगति पर..." : (t("shop") === "கடை" ? "செயலாக்கப்படுகிறது..." : "PROCESSING...")) : `${t("placeOrder")} · ₹${total.toLocaleString()}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right - Order Summary */}
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
                    placeholder="ENTER CODE (e.g. WOLF10)"
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
          </div>
        </div>
      </div>
    </div>
  );
}
