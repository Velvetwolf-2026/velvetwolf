import { useState, useContext } from "react";
import { AppContext } from "../pages/AppContext";

// NOTE: No backend endpoint exists for store settings yet (requires a store_settings table).
// Save shows validation feedback but does not persist to a database.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AdminSettings() {
  const { showToast } = useContext(AppContext);
  const [settings, setSettings] = useState({
    storeName: "VelvetWolf", tagline: "Luxury Streetwear", storeEmail: "hello@velvetwolf.in", storePhone: "+91 98765 43210",
    freeShipping: "1999", flatRate: "149", dispatchDays: "2", returnDays: "30",
    razorpayKey: "", upiHandle: "", gstNumber: "", pan: "",
    orderEmail: "orders@velvetwolf.in", alertEmail: "alerts@velvetwolf.in", smsProvider: "", whatsapp: "",
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setSettings((s) => ({ ...s, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!settings.storeName.trim())                           e.storeName    = "Store name is required.";
    if (!settings.storeEmail.trim())                          e.storeEmail   = "Email is required.";
    else if (!EMAIL_RE.test(settings.storeEmail.trim()))      e.storeEmail   = "Enter a valid email address.";
    if (!settings.storePhone.trim())                          e.storePhone   = "Phone is required.";
    if (!settings.orderEmail.trim())                          e.orderEmail   = "Order email is required.";
    else if (!EMAIL_RE.test(settings.orderEmail.trim()))      e.orderEmail   = "Enter a valid email address.";
    if (!settings.alertEmail.trim())                          e.alertEmail   = "Alert email is required.";
    else if (!EMAIL_RE.test(settings.alertEmail.trim()))      e.alertEmail   = "Enter a valid email address.";
    if (Number(settings.freeShipping) <= 0)                   e.freeShipping = "Must be greater than 0.";
    if (Number(settings.flatRate) < 0)                        e.flatRate     = "Cannot be negative.";
    if (Number(settings.dispatchDays) < 1)                    e.dispatchDays = "Must be at least 1 day.";
    if (Number(settings.returnDays) < 1)                      e.returnDays   = "Must be at least 1 day.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      showToast("Please fix the errors before saving.", "error");
      return;
    }
    showToast("Settings saved successfully!");
  };

  const sections = [
    { title: "STORE SETTINGS", fields: [
      { label: "Store Name",  key: "storeName" },
      { label: "Tagline",     key: "tagline" },
      { label: "Email",       key: "storeEmail" },
      { label: "Phone",       key: "storePhone" },
    ]},
    { title: "SHIPPING", fields: [
      { label: "Free Shipping Above (₹)", key: "freeShipping", type: "number" },
      { label: "Flat Shipping Rate (₹)",  key: "flatRate",     type: "number" },
      { label: "Dispatch Time (days)",    key: "dispatchDays", type: "number" },
      { label: "Return Window (days)",    key: "returnDays",   type: "number" },
    ]},
    { title: "PAYMENT GATEWAYS", fields: [
      { label: "Razorpay Key", key: "razorpayKey" },
      { label: "UPI Handle",   key: "upiHandle" },
      { label: "GST Number",   key: "gstNumber" },
      { label: "PAN",          key: "pan" },
    ]},
    { title: "NOTIFICATIONS", fields: [
      { label: "Order Email",  key: "orderEmail" },
      { label: "Alert Email",  key: "alertEmail" },
      { label: "SMS Provider", key: "smsProvider" },
      { label: "WhatsApp",     key: "whatsapp" },
    ]},
  ];

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>CONFIGURE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>SETTINGS</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {sections.map((section) => (
          <div key={section.title} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>{section.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {section.fields.map(({ label, key, type = "text" }) => (
                <div key={key}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1, color: errors[key] ? "#e07070" : "var(--silver)", display: "block", marginBottom: 6 }}>{label}</label>
                  <input
                    className="input-dark"
                    type={type}
                    value={settings[key]}
                    onChange={(e) => set(key, e.target.value)}
                    style={{ padding: "8px 12px", fontSize: 12, borderColor: errors[key] ? "rgba(192,57,43,0.5)" : undefined }}
                  />
                  {errors[key] && <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#e07070", marginTop: 4 }}>{errors[key]}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <button className="btn-gold" onClick={handleSave}>SAVE ALL SETTINGS</button>
      </div>
    </div>
  );
}
