import React, { useContext, useState, useRef } from "react";
import { AppContext } from "./AppContext";
import Icon from "../components/Icon";

export default function CustomDesignPage() {
  const { user, setPage, showToast } = useContext(AppContext);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [form, setForm] = useState({ fabric: "220gsm", color: "#0a0a0a", size: "M", qty: 1, note: "" });
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploaded(true);
      setFileName(file.name);
      showToast("Design selected successfully! ✓");
    }
  };

  const handleSubmitOrderRequest = () => {
    if (!user) {
      showToast("Please sign in to place a custom order.", "info");
      setPage("login");
      return;
    }

    if (!uploaded) {
      showToast("Upload your design before submitting the request.", "error");
      return;
    }

    if (!Number.isFinite(Number(form.qty)) || Number(form.qty) < 1) {
      showToast("Enter a valid quantity.", "error");
      return;
    }

    if (!form.note.trim()) {
      showToast("Add your design notes before submitting.", "error");
      return;
    }

    showToast("Custom order request submitted!");
  };

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div className="page-hero-pad" style={{ background: "var(--graphite)", padding: "80px 40px 60px", borderBottom: "1px solid var(--smoke)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>MAKE IT YOURS</div>
        <h1 className="page-hero-title" style={{ fontFamily: "var(--font-display)", fontSize: 80, letterSpacing: 4 }}>CUSTOM<br/>DESIGN</h1>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginTop: 16 }}>Upload your artwork. We print it on luxury-grade fabric.</p>
      </div>

      <div className="page-content-pad" style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px" }}>
        <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          {/* Upload zone */}
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>UPLOAD DESIGN</h2>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept="image/*" 
              onChange={handleFileChange}
            />
            <div style={{ border: `2px dashed ${uploaded ? "var(--gold)" : "var(--smoke)"}`, padding: "60px 40px", textAlign: "center", cursor: "pointer", transition: "all 0.3s", background: uploaded ? "rgba(201,168,76,0.05)" : "transparent" }}
              onClick={() => fileInputRef.current?.click()}>
              <Icon name="upload" size={40} color={uploaded ? "var(--gold)" : "var(--silver)"}/>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, letterSpacing: 2, marginTop: 20, color: uploaded ? "var(--gold)" : "var(--silver)" }}>
                {uploaded ? (fileName ? `UPLOADED: ${fileName.toUpperCase()} ✓` : "DESIGN UPLOADED ✓") : "CLICK TO UPLOAD"}
              </div>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, color: "var(--silver)", letterSpacing: 2, marginTop: 8 }}>PNG, JPG, SVG · MAX 50MB</div>
            </div>
            <div style={{ marginTop: 20 }}>
              {["✦ DTG Printing (all colors)", "✦ Screen Printing (bulk)", "✦ Embroidery (luxury tier)"].map(t => (
                <div key={t} style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginBottom: 8 }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Customization */}
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>CUSTOMIZE</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>FABRIC</label>
                <select className="input-dark" value={form.fabric} onChange={e => setForm(f => ({ ...f, fabric: e.target.value }))}>
                  <option value="220gsm">220 GSM Egyptian Cotton (+{"\u20b9"}0)</option>
                  <option value="240gsm">240 GSM Heavyweight (+{"\u20b9"}200)</option>
                  <option value="180gsm">180 GSM Everyday (+{"\u20b9"}0)</option>
                  <option value="bamboo">Bamboo Organic (+{"\u20b9"}400)</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>BASE COLOR</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["#0a0a0a", "#faf9f7", "#1a2a3a", "#1a0a0a", "#0a1a0a", "#2a2a2a"].map(c => (
                    <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 36, height: 36, background: c, cursor: "pointer", border: `2px solid ${form.color === c ? "var(--gold)" : "transparent"}`, outline: "2px solid var(--smoke)" }}/>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>SIZE</label>
                <select className="input-dark" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}>
                  {["XS","S","M","L","XL","XXL"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>QUANTITY</label>
                <input className="input-dark" type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}/>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>SPECIAL NOTES</label>
                <textarea className="input-dark" placeholder="Print placement, special instructions..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}/>
              </div>
              <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "16px 20px" }}>
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, letterSpacing: 2, color: "var(--silver)", marginBottom: 4 }}>ESTIMATED PRICE</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>₹{(1499 + (form.fabric === "240gsm" ? 200 : form.fabric === "bamboo" ? 400 : 0)).toLocaleString()}</div>
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: "var(--silver)", marginTop: 4 }}>Per piece · Delivery in 7-10 days</div>
              </div>
              <button className="btn-gold" onClick={handleSubmitOrderRequest}>SUBMIT ORDER REQUEST</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
