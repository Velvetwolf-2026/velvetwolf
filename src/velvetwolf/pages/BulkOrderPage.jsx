import { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import Icon from "../components/Icon";
import { HeroHeader } from "../styles/shared";

export default function BulkOrderPage() {
  const { showToast, user } = useContext(AppContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    type: "corporate", qty: 5, product: "", message: "", org: "", contact: "", email: "",
  });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef(null);

  // Pre-populate contact & email if user is logged in and fields are empty
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        contact: prev.contact || user.full_name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRegex = /^[a-zA-Z\s.'-]{2,}$/;
  const orgRegex = /^[a-zA-Z0-9&().,\s'-]{2,}$/;

  const updateField = (key, value) => {
    let nextValue = value;
    if (key === "contact") nextValue = value.replace(/[^a-zA-Z\s.'-]/g, "");
    if (key === "org")     nextValue = value.replace(/[^a-zA-Z0-9&().,\s'-]/g, "");
    setForm(prev => ({ ...prev, [key]: nextValue }));
    setErrorMessage("");
  };

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

  const validateForm = () => {
    if (!form.org.trim())                            return "Please enter organization name.";
    if (!orgRegex.test(form.org.trim()))             return "Please enter a valid organization name.";
    if (!form.contact.trim())                        return "Please enter contact person name.";
    if (!nameRegex.test(form.contact.trim()))        return "Please enter a valid contact person name.";
    if (!form.email.trim())                          return "Please enter email address.";
    if (!emailRegex.test(form.email.trim()))         return "Please enter a valid email address.";
    if (form.qty === "" || form.qty === null)         return "Please enter quantity.";
    if (Number(form.qty) < 5)                        return "Minimum quantity should be 5.";
    if (!form.message.trim())                        return "Please enter product requirements.";
    if (form.message.trim().length < 10)             return "Please enter more detailed product requirements.";
    return "";
  };

  const handleSubmit = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/bulk/send"), {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          images,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send quote request.");

      // Save summary details for display on the success page
      sessionStorage.setItem("vw_last_bulk_order", JSON.stringify(form));

      showToast("Quote request sent! We'll contact you within 24hrs.");
      setErrorMessage("");
      setForm({ type: "corporate", qty: 5, product: "", message: "", org: "", contact: "", email: "" });
      setImages([]);
      
      navigate("/bulk/success");
    } catch (err) {
      showToast(err.message, "error");
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <HeroHeader
        eyebrow="For teams & organizations"
        title="BULK & CORPORATE"
        sub="Outfit your entire team in VelvetWolf luxury."
      />

      <div className="contact-grid page-content-pad" style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 28 }}>Pricing tiers</h2>
          {[["10–49 pcs", "5% off", "Team orders"], ["50–99 pcs", "12% off", "Department orders"], ["100–499 pcs", "20% off", "Corporate branding"], ["500+ pcs", "30% off + custom", "Enterprise bulk"]].map(([qty, disc, label]) => (
            <div key={qty} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid var(--smoke)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, color: "var(--ivory)" }}>{qty}</div>
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginTop: 4 }}>{label}</div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)" }}>{disc}</span>
            </div>
          ))}
          <div style={{ marginTop: 32 }}>
            {["✦ Custom logo embroidery/print", "✦ Pantone color matching", "✦ Individual name printing", "✦ Dedicated account manager", "✦ Net-30 payment terms available"].map(txt => (
              <div key={txt} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginBottom: 10 }}>{txt}</div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 28 }}>Request a quote</h2>

          {errorMessage && (
            <div ref={errorRef} style={{ background: "#2a0f0f", border: "1px solid #7a1f1f", color: "#ff8a80", padding: "12px 14px", marginBottom: 14, fontSize: 14, fontFamily: "'Roboto', sans-serif" }}>
              ✕ {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>Order type</label>
              <select className="input-dark" value={form.type} onChange={e => updateField("type", e.target.value)}>
                <option value="bulk">Bulk order</option>
                <option value="corporate">Corporate branding</option>
                <option value="event">Event merchandise</option>
                <option value="startup">Startup kit</option>
              </select>
            </div>
            <input className="input-dark" placeholder="Organization name" value={form.org} onChange={e => updateField("org", e.target.value)}/>
            <input className="input-dark" placeholder="Contact person" value={form.contact} onChange={e => updateField("contact", e.target.value)}/>
            <input className="input-dark" type="email" placeholder="Email address" value={form.email} onChange={e => updateField("email", e.target.value)}/>
            <input className="input-dark" type="number" placeholder="Quantity required" value={form.qty} onChange={e => updateField("qty", e.target.value)} min="5"/>
            <textarea className="input-dark" placeholder="Product requirements, design ideas, deadline..." value={form.message} onChange={e => updateField("message", e.target.value)} style={{ minHeight: 120 }}/>
            
            {/* Multiple Image Upload Section */}
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>Upload design sketches or logos</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label htmlFor="design-images" style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px dashed var(--smoke)",
                  padding: "20px",
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.01)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: 1,
                  color: "var(--silver)",
                  textAlign: "center"
                }}>
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
            </div>

            <button className="btn-gold" style={{ padding: "16px" }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Sending request..." : "Request quote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
