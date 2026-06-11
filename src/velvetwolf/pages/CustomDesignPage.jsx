import React, { useContext, useState, useRef } from "react";
import { AppContext } from "./AppContext";
import Icon from "../components/Icon";
import { HeroHeader } from "../styles/shared";

export default function CustomDesignPage() {
  const { user, setPage, showToast } = useContext(AppContext);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({ fabric: "220gsm", color: "#0a0a0a", size: "M", qty: 1, note: "" });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith("image/")) {
        showToast("Only image files are allowed", "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image size must be less than 5MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOrderRequest = () => {
    if (!user) {
      showToast("Please sign in to place a custom order.", "info");
      setPage("login");
      return;
    }

    if (images.length === 0) {
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
    setImages([]);
  };

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <HeroHeader
        eyebrow="YOUR VISION, OUR CRAFT"
        title="CUSTOM DESIGN"
        sub="Upload your artwork. We print it on luxury-grade fabric."
      />

      <div className="page-content-pad" style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px" }}>
        <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          {/* Upload zone */}
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>UPLOAD DESIGN</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label htmlFor="design-images" style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed var(--smoke)",
                padding: "40px 20px",
                cursor: "pointer",
                background: "rgba(255,255,255,0.01)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 1,
                color: "var(--silver)",
                textAlign: "center"
              }}>
                <Icon name="upload" size={32} color="var(--silver)" style={{ marginBottom: 12 }} />
                <span>✦ Select images (multiple)</span>
                <span style={{ fontSize: 9, color: "var(--ash)", marginTop: 4 }}>PNG, JPG, JPEG up to 5MB each</span>
              </label>
              <input
                id="design-images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />

              {images.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", background: "rgba(255,255,255,0.02)", padding: 12, border: "1px solid var(--smoke)" }}>
                  {images.map((img, idx) => (
                    <div key={idx} style={{ position: "relative", width: 64, height: 64, border: "1px solid var(--smoke)", background: "#000" }}>
                      <img src={img} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{
                          position: "absolute",
                          top: -4,
                          right: -4,
                          background: "#c0392b",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: 16,
                          height: 16,
                          fontSize: 9,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
