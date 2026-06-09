import React, { useContext, useState, useEffect, useRef } from "react";
import { AppContext } from "./AppContext";
import Icon from "../components/Icon";

export default function BulkOrderPage() {
  const { showToast, user, setPage } = useContext(AppContext);

  useEffect(() => {
    if (!user) {
      showToast("Please sign in to request a bulk quote.", "info");
      setPage("login");
    }
  }, [user, setPage, showToast]);

  const [form, setForm] = useState({ type: "corporate", qty: 5, product: "", message: "", org: "", contact: "", email: "" });

  if (!user) return null;
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRegex = /^[a-zA-Z\s.'-]{2,}$/;
  const orgRegex = /^[a-zA-Z0-9&().,\s'-]{2,}$/;

  const updateField = (key, value) => {
    let nextValue = value;
    if (key === "contact") {
      nextValue = value.replace(/[^a-zA-Z\s.'-]/g, "");
    }
    if (key === "org") {
      nextValue = value.replace(/[^a-zA-Z0-9&().,\s'-]/g, "");
    }
    setForm(prev => ({ ...prev, [key]: nextValue }));
    setErrorMessage("");
  };

  const validateForm = () => {
    if (!form.org.trim()) return "Please enter organization name.";
    if (!orgRegex.test(form.org.trim())) return "Please enter a valid organization name.";
    if (!form.contact.trim()) return "Please enter contact person name.";
    if (!nameRegex.test(form.contact.trim())) return "Please enter a valid contact person name.";
    if (!form.email.trim()) return "Please enter email address.";
    if (!emailRegex.test(form.email.trim())) return "Please enter a valid email address.";
    if (form.qty === "" || form.qty === null) return "Please enter quantity.";
    if (Number(form.qty) < 5) return "Minimum quantity should be 5.";
    if (!form.message.trim()) return "Please enter product requirements.";
    if (form.message.trim().length < 10) return "Please enter more detailed product requirements.";
    return "";
  };

  const handleSubmit = () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    showToast("Quote request sent! We'll contact you within 24hrs.");
    setErrorMessage("");
    setForm({ type: "corporate", qty: 5, product: "", message: "", org: "", contact: "", email: "" });
  };

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div className="page-hero-pad" style={{ background: "var(--graphite)", padding: "80px 40px 60px", textAlign: "center", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>FOR TEAMS & ORGANIZATIONS</div>
        <h1 className="page-hero-title" style={{ fontFamily: "var(--font-display)", fontSize: 80, letterSpacing: 4 }}>BULK &<br/>CORPORATE</h1>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginTop: 16 }}>Outfit your entire team in VelvetWolf luxury.</p>
      </div>

      <div className="contact-grid page-content-pad" style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 28 }}>PRICING TIERS</h2>
          {[["10-49 pcs", "5% OFF", "Team orders"], ["50-99 pcs", "12% OFF", "Department orders"], ["100-499 pcs", "20% OFF", "Corporate branding"], ["500+ pcs", "30% OFF + Custom", "Enterprise bulk"]].map(([qty, disc, label]) => (
            <div key={qty} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid var(--smoke)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, color: "var(--ivory)" }}>{qty}</div>
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginTop: 4 }}>{label}</div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)" }}>{disc}</span>
            </div>
          ))}
          <div style={{ marginTop: 32 }}>
            {["\u2726 Custom logo embroidery/print", "\u2726 Pantone color matching", "\u2726 Individual name printing", "\u2726 Dedicated account manager", "\u2726 Net-30 payment terms available"].map(t => (
              <div key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginBottom: 10 }}>{t}</div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 28 }}>REQUEST A QUOTE</h2>

          {errorMessage && (
            <div ref={errorRef} style={{ background: "#2a0f0f", border: "1px solid #7a1f1f", color: "#ff8a80", padding: "12px 14px", marginBottom: 14, fontSize: 14, fontFamily: "'Roboto', sans-serif" }}>
              ✕ {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>ORDER TYPE</label>
              <select className="input-dark" value={form.type} onChange={e => updateField("type", e.target.value)}>
                <option value="bulk">BULK ORDER</option>
                <option value="corporate">CORPORATE BRANDING</option>
                <option value="event">EVENT MERCHANDISE</option>
                <option value="startup">STARTUP KIT</option>
              </select>
            </div>
            <input className="input-dark" placeholder="ORGANIZATION NAME" value={form.org} onChange={e => updateField("org", e.target.value)}/>
            <input className="input-dark" placeholder="CONTACT PERSON" value={form.contact} onChange={e => updateField("contact", e.target.value)}/>
            <input className="input-dark" type="email" placeholder="EMAIL ADDRESS" value={form.email} onChange={e => updateField("email", e.target.value)}/>
            <input className="input-dark" type="number" placeholder="QUANTITY REQUIRED" value={form.qty} onChange={e => updateField("qty", e.target.value)} min="5"/>
            <textarea className="input-dark" placeholder="PRODUCT REQUIREMENTS, DESIGN IDEAS, DEADLINE..." value={form.message} onChange={e => updateField("message", e.target.value)} style={{ minHeight: 120 }}/>
            <button className="btn-gold" style={{ padding: "16px" }} onClick={handleSubmit}>REQUEST QUOTE</button>
          </div>
        </div>
      </div>
    </div>
  );
}
