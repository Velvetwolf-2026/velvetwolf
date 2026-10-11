// Checkout in the gallery style (prototype ui/checkout.js), on the real
// backend: POST /checkout/create re-prices the cart and opens a Cashfree
// session; Cashfree returns to /payment-status, which confirms the payment.
// Guest checkout by default; signing in only fills in saved addresses.
import { useState, useContext, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import { trackBeginCheckout } from "../utils/analytics";
import { getMetaTrackingData } from "../utils/metaPixel";
import { money, allPhotos } from "../gallery/galleryProducts";

// Must match DELIVERY_OPTIONS in the backend checkout service, which is what
// actually charges the customer.
const DELIVERY = [
  { id: "standard", label: "Standard", fee: 0, eta: "4 to 7 working days" },
  { id: "express", label: "Express", fee: 149, eta: "2 to 4 working days" },
];
// Cashfree shows only the chosen method (backend PAY_WITH).
const METHODS = [
  { id: "upi", label: "UPI", hint: "Any UPI app, or scan a QR code" },
  { id: "card", label: "Card", hint: "Debit or credit card" },
  { id: "netbanking", label: "Netbanking", hint: "All major Indian banks" },
  { id: "wallet", label: "Wallet", hint: "Paytm, PhonePe, Amazon Pay and others" },
];
const TAX_RATE = 0.18; // backend calculateTax

const STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

const valid = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()),
  phone: (v) => /^[6-9]\d{9}$/.test(cleanPhone(v)),
  pin: (v) => /^[1-9]\d{5}$/.test(String(v).trim()),
};
const cleanPhone = (v) => String(v || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");

function loadCashfreeScript() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve(window.Cashfree);
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => (window.Cashfree ? resolve(window.Cashfree) : reject(new Error("Cashfree didn't load. Try again.")));
    script.onerror = () => reject(new Error("Cashfree didn't load. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

// Photo for a cart line: the colour's own photo when there is one.
function thumbOf(item) {
  const images = Array.isArray(item.images) ? item.images : [];
  const tagged = images.find((x) => typeof x === "string" && x.toLowerCase().startsWith(`${String(item.color || "").toLowerCase()}::`));
  if (tagged) return tagged.split("::").slice(1).join("::");
  return allPhotos(item)[0]?.src || "";
}

const addrLines = (a) => (
  <>
    <b>{a.name}</b><br />
    {a.address}<br />
    {a.city}{a.district && a.district !== a.city ? `, ${a.district}` : ""}, {a.state} {a.pincode}
    {a.phone ? <><br />+91 {a.phone}</> : null}
  </>
);

function Field({ id, label, value, onChange, error, hint, prefix, required = true, ...rest }) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}{!required && <span className="opt">optional</span>}</label>
      <div className={`input-wrap${prefix ? " has-prefix" : ""}`}>
        {prefix && <span className="input-prefix" aria-hidden="true">{prefix}</span>}
        <input id={id} name={id} value={value} onChange={onChange} required={required}
          aria-invalid={error ? "true" : undefined} aria-describedby={describedBy} {...rest} />
      </div>
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

const blankForm = () => ({
  email: "", phone: "", whatsapp: true,
  name: "", pincode: "", city: "", district: "", state: "", line1: "", line2: "",
  addressId: "", save: true, delivery: "standard", method: "upi",
});

export default function CheckoutPage() {
  const { cart, cartTotal, user, showToast, setCartOpen } = useContext(AppContext);
  const location = useLocation();
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState([]);
  const [pinBusy, setPinBusy] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const bannerRef = useRef(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const clearErr = (id) => setErrors((e) => (e[id] ? { ...e, [id]: "" } : e));

  useEffect(() => {
    if (cart.length > 0) trackBeginCheckout(cart, cartTotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signed in: email from the account, saved addresses (default first).
  const signedInId = user?.id || null;
  useEffect(() => {
    if (!signedInId) { setSaved([]); setForm((f) => ({ ...f, addressId: "" })); return; }
    let cancelled = false;
    setForm((f) => ({ ...f, email: f.email || (user?.email?.endsWith("@mobile.velvetwolf.in") ? "" : user?.email || ""), phone: f.phone || cleanPhone(user?.phone) }));
    fetch(apiUrl("/profile/addresses"), { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { addresses: [] }))
      .then((data) => {
        if (cancelled) return;
        const list = data.addresses || [];
        setSaved(list);
        const first = list.find((a) => a.is_default) || list[0];
        if (first) setForm((f) => ({ ...f, addressId: f.addressId || first.id, phone: f.phone || first.phone }));
      })
      .catch(() => {}); // saved addresses are a convenience; the form still works
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInId]);

  const accountEmail = user?.email && !user.email.endsWith("@mobile.velvetwolf.in") ? user.email : "";
  const useNew = !saved.length || form.addressId === "new" || !saved.some((a) => a.id === form.addressId);
  const chosenSaved = useNew ? null : saved.find((a) => a.id === form.addressId);

  const totals = useMemo(() => {
    const subtotal = cartTotal;
    let discount = 0;
    if (coupon) {
      discount = coupon.discount_type === "percentage"
        ? Math.round((subtotal * Number(coupon.discount_value)) / 100)
        : Number(coupon.discount_value) || 0;
      discount = Math.min(discount, subtotal);
    }
    const ship = DELIVERY.find((d) => d.id === form.delivery) || DELIVERY[0];
    const tax = Math.round(subtotal * TAX_RATE);
    return { subtotal, discount, ship, shipping: ship.fee, tax, total: Math.max(0, subtotal - discount + ship.fee + tax) };
  }, [cartTotal, coupon, form.delivery]);

  // PIN code: fill city, district and state from India Post.
  const onPin = async (value) => {
    const pin = value.replace(/\D/g, "").slice(0, 6);
    set({ pincode: pin });
    clearErr("co-pin");
    if (pin.length !== 6) return;
    setPinBusy(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const po = data?.[0]?.Status === "Success" ? data[0].PostOffice?.[0] : null;
      if (po) {
        setForm((f) => ({ ...f, city: f.city || po.District || po.Name || "", district: po.District || "", state: f.state || po.State || "" }));
        setErrors((e) => ({ ...e, "co-city": "", "co-state": "" }));
      } else {
        setErrors((e) => ({ ...e, "co-pin": "We don't recognise that PIN code. Check it, or fill in the city and state yourself." }));
      }
    } catch {
      // the lookup is a convenience; the fields can be typed by hand
    } finally {
      setPinBusy(false);
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    try {
      const res = await fetch(apiUrl("/checkout/coupon/validate"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: cartTotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That code isn't valid.");
      setCoupon(data);
      showToast(`${data.code} applied`);
    } catch (err) {
      setCoupon(null);
      showToast(err.message, "error");
    } finally {
      setCouponBusy(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!accountEmail && !valid.email(form.email)) e["co-email"] = "Enter an email address like name@example.com.";
    if (!valid.phone(form.phone)) e["co-phone"] = "Enter a 10-digit Indian mobile number.";
    if (useNew) {
      if (form.name.trim().length < 2) e["co-name"] = "Enter the name for the delivery label.";
      if (!valid.pin(form.pincode)) e["co-pin"] = "Enter a 6-digit PIN code.";
      if (!form.city.trim()) e["co-city"] = "Enter your city or town.";
      if (!form.state) e["co-state"] = "Choose a state.";
      if (form.line1.trim().length < 4) e["co-line1"] = "Enter your house number and street.";
    }
    return e;
  };

  const currentAddress = () => {
    const phone = cleanPhone(form.phone);
    const email = accountEmail || form.email.trim();
    if (!useNew && chosenSaved) {
      return { name: chosenSaved.name, phone: phone || chosenSaved.phone, email, address: chosenSaved.address, city: chosenSaved.city, district: chosenSaved.district || chosenSaved.city, state: chosenSaved.state, pincode: chosenSaved.pincode };
    }
    const line = [form.line1.trim(), form.line2.trim()].filter(Boolean).join(", ");
    return { name: form.name.trim(), phone, email, address: line, city: form.city.trim(), district: form.district.trim() || form.city.trim(), state: form.state, pincode: form.pincode };
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const e = validate();
    setErrors(e);
    const ids = Object.keys(e);
    if (ids.length) {
      setBanner(`Check ${ids.length === 1 ? "the field" : `the ${ids.length} fields`} marked below.`);
      setTimeout(() => document.getElementById(ids[0])?.focus(), 30);
      return;
    }
    setBanner("");
    setBusy(true);
    const address = currentAddress();
    try {
      // Remember a new address (opt-in). Never blocks payment.
      if (user && useNew && form.save) {
        fetch(apiUrl("/profile/addresses"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: address.name, phone: address.phone, address: address.address, city: address.city, district: address.district, state: address.state, pincode: address.pincode }),
        }).catch(() => {});
      }

      sessionStorage.setItem("vw_last_checkout_cart", JSON.stringify(cart));
      sessionStorage.setItem("vw_last_checkout_total", String(totals.total));
      const metaCookies = getMetaTrackingData();
      const res = await fetch(apiUrl("/checkout/create"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          address,
          total_amount: totals.total,
          subtotal: totals.subtotal,
          // Ignored by the current backend (it recomputes these); kept so an
          // older backend still works while deploys roll out.
          shipping_amount: totals.shipping,
          tax_amount: totals.tax,
          payment_method: form.method,
          pay_with: form.method,
          delivery: form.delivery,
          couponCode: coupon?.code || null,
          whatsappUpdates: form.whatsapp,
          meta: { fbp: metaCookies.fbp, fbc: metaCookies.fbc },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We couldn't start the payment. Nothing was charged. Try again.");
      if (!data.paymentSessionId) throw new Error("We couldn't start the payment. Nothing was charged. Try again.");

      const Cashfree = await loadCashfreeScript();
      // The backend says which Cashfree environment created this session.
      const cashfree = Cashfree({ mode: data.cashfreeMode === "production" ? "production" : "sandbox" });
      // Cashfree returns to /?order_id=…, which opens /payment-status to confirm.
      cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch (err) {
      setBanner(err.message || "Something went wrong. Nothing was charged. Try again.");
      setBusy(false);
      setTimeout(() => bannerRef.current?.focus(), 30);
    }
  };

  if (!cart.length) {
    return (
      <main className="vwg view-page">
        <div className="page-wrap">
          <header className="page-head">
            <p className="eyebrow">Checkout</p>
            <h1 className="page-title">Your cart is empty</h1>
            <p className="page-sub">Add a tee and come back here to pay.</p>
          </header>
          <div><Link className="btn btn-primary" to="/shop">Browse the shop</Link></div>
        </div>
      </main>
    );
  }

  const summary = (
    <>
      <ul className="sum-items">
        {cart.map((i, idx) => {
          const src = thumbOf(i);
          return (
            <li className="sum-item" key={`${i.id}-${i.size}-${i.color}-${idx}`}>
              <span className="sum-thumb">
                {src ? <img src={src} alt="" loading="lazy" decoding="async" className={i.isCustom ? "is-art" : undefined} /> : null}
                <span className="sum-qty" aria-label={`Quantity ${i.qty}`}>{i.qty}</span>
              </span>
              <span className="sum-info">
                <span className="sum-name">{i.name}</span>
                <span className="sum-meta">{[i.color, i.size].filter(Boolean).join(" / ")}</span>
              </span>
              <span className="sum-price">{money(i.price * i.qty)}</span>
            </li>
          );
        })}
      </ul>
      {coupon ? (
        <div className="promo-applied">
          <span>Code <b>{coupon.code}</b> applied</span>
          <button className="text-btn" type="button" onClick={() => { setCoupon(null); setCouponInput(""); }}>Remove</button>
        </div>
      ) : (
        <div className="promo">
          <input type="text" aria-label="Promo code" placeholder="Promo code" value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }} />
          <button className="btn btn-small" type="button" onClick={applyCoupon} disabled={couponBusy || !couponInput.trim()}>{couponBusy ? "…" : "Apply"}</button>
        </div>
      )}
      <dl className="sum-totals">
        <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
        {totals.discount > 0 && <div><dt>Discount</dt><dd>&minus;{money(totals.discount)}</dd></div>}
        <div><dt>Delivery, {totals.ship.label.toLowerCase()}</dt><dd>{totals.shipping ? money(totals.shipping) : "Free"}</dd></div>
        <div><dt>GST (18%)</dt><dd>{money(totals.tax)}</dd></div>
        <div className="sum-total"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
      </dl>
      <button className="text-btn" type="button" onClick={() => setCartOpen?.(true)}>Edit cart</button>
    </>
  );

  return (
    <main className="vwg view-page">
      <div className="page-wrap page-wide">
        <header className="page-head">
          <p className="eyebrow">Checkout</p>
          <h1 className="page-title">Checkout</h1>
        </header>

        <details className="sum-mobile">
          <summary><span>Order summary</span><span className="sum-mobile-total">{money(totals.total)}</span></summary>
          <div className="sum-body">{summary}</div>
        </details>

        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={onSubmit} noValidate>
            {banner && <div className="form-banner" role="alert" tabIndex={-1} ref={bannerRef}>{banner}</div>}

            <section className="co-step" aria-labelledby="co-h1">
              <h2 className="co-h" id="co-h1"><span className="co-n">1</span>Contact</h2>
              {accountEmail ? (
                <p className="co-signed">Signed in as <b>{accountEmail}</b>.</p>
              ) : (
                <>
                  <p className="co-signed">
                    {user ? "Signed in. Add an email for your receipt." : <>Checking out as a guest. <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>Sign in</Link> to use saved addresses.</>}
                  </p>
                  <Field id="co-email" label="Email" type="email" inputMode="email" autoComplete="email" spellCheck="false" autoCapitalize="off"
                    value={form.email} error={errors["co-email"]} hint="For your receipt and delivery updates."
                    onChange={(e) => { set({ email: e.target.value }); clearErr("co-email"); }} />
                </>
              )}
              <Field id="co-phone" label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} prefix="+91"
                value={form.phone} error={errors["co-phone"]} hint="The courier calls this number if they can't find you."
                onChange={(e) => { set({ phone: e.target.value.replace(/[^\d+\s-]/g, "") }); clearErr("co-phone"); }} />
              <label className="check">
                <input type="checkbox" checked={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.checked })} />
                <span>Send delivery updates on WhatsApp too</span>
              </label>
            </section>

            <section className="co-step" aria-labelledby="co-h2">
              <h2 className="co-h" id="co-h2"><span className="co-n">2</span>Delivery address</h2>
              {saved.length > 0 && (
                <div className="addr-choices" role="radiogroup" aria-label="Saved addresses">
                  {saved.map((a) => (
                    <label className="addr-choice" key={a.id}>
                      <input type="radio" name="co-addr" value={a.id} checked={form.addressId === a.id} onChange={() => set({ addressId: a.id })} />
                      <span><address>{addrLines(a)}</address></span>
                    </label>
                  ))}
                  <label className="addr-choice">
                    <input type="radio" name="co-addr" value="new" checked={useNew} onChange={() => set({ addressId: "new" })} />
                    <span>A new address</span>
                  </label>
                </div>
              )}
              {useNew && (
                <div className="addr-fields">
                  <Field id="co-name" label="Full name" autoComplete="shipping name" value={form.name} error={errors["co-name"]}
                    onChange={(e) => { set({ name: e.target.value }); clearErr("co-name"); }} />
                  <div className="form-pair">
                    <Field id="co-pin" label={pinBusy ? "PIN code (checking…)" : "PIN code"} autoComplete="shipping postal-code" inputMode="numeric" maxLength={6}
                      value={form.pincode} error={errors["co-pin"]} onChange={(e) => onPin(e.target.value)} />
                    <Field id="co-city" label="City or town" autoComplete="shipping address-level2" value={form.city} error={errors["co-city"]}
                      onChange={(e) => { set({ city: e.target.value }); clearErr("co-city"); }} />
                  </div>
                  <div className="form-row">
                    <label htmlFor="co-state">State</label>
                    <select id="co-state" autoComplete="shipping address-level1" value={form.state}
                      aria-invalid={errors["co-state"] ? "true" : undefined} aria-describedby={errors["co-state"] ? "co-state-err" : undefined}
                      onChange={(e) => { set({ state: e.target.value }); clearErr("co-state"); }}>
                      <option value="">Choose a state</option>
                      {[...STATES, ...(form.state && !STATES.includes(form.state) ? [form.state] : [])].map((st) => <option key={st}>{st}</option>)}
                    </select>
                    {errors["co-state"] && <p className="field-error" id="co-state-err">{errors["co-state"]}</p>}
                  </div>
                  <Field id="co-line1" label="House, building, street" autoComplete="shipping address-line1" value={form.line1} error={errors["co-line1"]}
                    onChange={(e) => { set({ line1: e.target.value }); clearErr("co-line1"); }} />
                  <Field id="co-line2" label="Area, landmark" autoComplete="shipping address-line2" required={false} value={form.line2}
                    onChange={(e) => set({ line2: e.target.value })} />
                  {user && (
                    <label className="check">
                      <input type="checkbox" checked={form.save} onChange={(e) => set({ save: e.target.checked })} />
                      <span>Save this address to my account</span>
                    </label>
                  )}
                </div>
              )}
            </section>

            <section className="co-step" aria-labelledby="co-h3">
              <h2 className="co-h" id="co-h3"><span className="co-n">3</span>Delivery</h2>
              <div className="choice-list" role="radiogroup" aria-label="Delivery speed">
                {DELIVERY.map((d) => (
                  <label className="choice" key={d.id}>
                    <input type="radio" name="co-delivery" value={d.id} checked={form.delivery === d.id} onChange={() => set({ delivery: d.id })} />
                    <span className="choice-main"><b>{d.label}</b><span className="muted">Estimated {d.eta} after dispatch</span></span>
                    <span className="choice-price">{d.fee ? money(d.fee) : "Free"}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="co-step" aria-labelledby="co-h4">
              <h2 className="co-h" id="co-h4"><span className="co-n">4</span>Payment</h2>
              <p className="muted">Prepaid orders only: we don't offer cash on delivery. Payment is handled by Cashfree; we never see your card or UPI details.</p>
              <div className="choice-list choice-grid" role="radiogroup" aria-label="Payment method">
                {METHODS.map((m) => (
                  <label className="choice" key={m.id}>
                    <input type="radio" name="co-method" value={m.id} checked={form.method === m.id} onChange={() => set({ method: m.id })} />
                    <span className="choice-main"><b>{m.label}</b><span className="muted">{m.hint}</span></span>
                  </label>
                ))}
              </div>
            </section>

            <div className="co-pay">
              <button className="btn btn-primary btn-block btn-pay" type="submit" disabled={busy}>
                {busy ? "Opening payment…" : `Pay ${money(totals.total)}`}
              </button>
              <p className="fine">You'll confirm the payment in Cashfree's secure window. Your order is placed once the payment goes through.</p>
            </div>
          </form>

          <aside className="sum-side" aria-label="Order summary">
            <h2 className="eyebrow">Order summary</h2>
            {summary}
          </aside>
        </div>
      </div>
    </main>
  );
}
