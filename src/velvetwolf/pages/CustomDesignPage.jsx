import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import Icon from "../components/Icon";
import { HeroHeader } from "../styles/shared";

const FONT_OPTIONS = [
  { value: "Montserrat", label: "Montserrat (Clean Modern)" },
  { value: "Playfair Display", label: "Playfair (Classic Serif)" },
  { value: "Space Mono", label: "Space Mono (Tech / Geek)" },
  { value: "Impact", label: "Impact (Bold / Streetwear)" },
  { value: "Cinzel", label: "Cinzel (Luxury Roman)" }
];

const FABRICS = [
  { id: "220gsm", name: "220 GSM Egyptian Long-Staple Cotton", surcharge: 0 },
  { id: "240gsm", name: "240 GSM Ultra Heavyweight Fleece", surcharge: 200 },
  { id: "180gsm", name: "180 GSM Everyday Jersey Cotton", surcharge: 0 },
  { id: "bamboo", name: "Bamboo Organic Luxury Blend", surcharge: 400 }
];

const COLORS = [
  { hex: "#0a0a0a", name: "Obsidian Black" },
  { hex: "#faf9f7", name: "Ivory White" },
  { hex: "#1e3725", name: "Forest Green" },
  { hex: "#4a1515", name: "Crimson Red" },
  { hex: "#1c2e4a", name: "Navy Blue" },
  { hex: "#d5bda9", name: "Desert Sand" }
];

export default function CustomDesignPage() {
  const { addToCart, showToast, setPage } = useContext(AppContext);

  // Layout states
  const [activeTab, setActiveTab] = useState("base"); // base, graphics, text, embroidery
  const [activeView, setActiveView] = useState("front"); // front, back, left-sleeve, right-sleeve

  // Customization choices
  const [baseColor, setBaseColor] = useState("#0a0a0a");
  const [fabric, setFabric] = useState("220gsm");
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [specialNote, setSpecialNote] = useState("");

  // Print Uploads
  const [logoFile, setLogoFile] = useState(null);       // small front left chest
  const [frontImage, setFrontImage] = useState(null);   // large center front
  const [backImage, setBackImage] = useState(null);     // large center back
  const [sleeveImage, setSleeveImage] = useState(null); // sleeve graphic

  // Custom Typography
  const [text, setText] = useState("");
  const [textFont, setTextFont] = useState("Montserrat");
  const [textColor, setTextColor] = useState("#faf9f7");
  const [textScale, setTextScale] = useState(20);
  const [textPosition, setTextPosition] = useState("front-chest"); // front-chest, back-upper, left-sleeve, right-sleeve

  // Embroidery
  const [isEmbroidery, setIsEmbroidery] = useState(false);
  const [embroideryText, setEmbroideryText] = useState("");
  const [embroideryColor, setEmbroideryColor] = useState("#c9a84c");
  const [embroideryStyle, setEmbroideryStyle] = useState("Standard Satin Stitch");

  // Handle image upload conversions to Base64 preview
  const handleUpload = (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (target === "logo") setLogoFile(reader.result);
      if (target === "front") setFrontImage(reader.result);
      if (target === "back") setBackImage(reader.result);
      if (target === "sleeve") setSleeveImage(reader.result);
      showToast("Uploaded successfully! ✓");
    };
    reader.readAsDataURL(file);
  };

  const getPrice = () => {
    const basePrice = 1499;
    const selectedFabricObj = FABRICS.find(f => f.id === fabric);
    const fabricSurcharge = selectedFabricObj ? selectedFabricObj.surcharge : 0;
    const embroiderySurcharge = isEmbroidery ? 250 : 0;
    return (basePrice + fabricSurcharge + embroiderySurcharge) * Number(qty);
  };

  const handleAddToCart = () => {
    const itemPrice = getPrice() / Number(qty);
    const customProductId = `custom-tee-${Date.now()}`;
    const customItem = {
      id: customProductId,
      name: `Customized Streetwear Tee (${fabric.toUpperCase()})`,
      collection: "custom",
      price: itemPrice,
      originalPrice: itemPrice + 500,
      image: frontImage || logoFile || "/mockup_silent.png",
      sizes: [size],
      colors: [baseColor],
      description: `Custom heavy garment with tailored specs. Fabric: ${fabric}, Color: ${baseColor}, Size: ${size}. Note: ${specialNote || "None"}`,
      stock: 99,
      isCustom: true,
      customMeta: {
        fabric,
        baseColor,
        size,
        logoFile,
        frontImage,
        backImage,
        sleeveImage,
        text,
        textFont,
        textColor,
        textScale,
        textPosition,
        isEmbroidery,
        embroideryText,
        embroideryColor,
        embroideryStyle,
        specialNote
      }
    };

    addToCart(customItem, size, baseColor, Number(qty));
    showToast("Added customized piece to your cart! ✓");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Redirect to checkout
    setTimeout(() => {
      setPage("checkout");
    }, 100);
  };

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh", background: "var(--obsidian)", color: "var(--ivory)" }}>
      <HeroHeader
        eyebrow="AI-POWERED VISUAL DESIGN LAB"
        title="PRODUCT CUSTOMIZER"
        sub="Forge your design. Upload graphics, apply text, select embroidery, and inspect the live preview."
      />

      <div className="page-content-pad" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 40px" }}>
        
        {/* Customizer Layout Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 50, alignItems: "start" }}>
          
          {/* LEFT: Live Preview Studio Canvas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 100 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", letterSpacing: 2 }}>
                LIVE PREVIEW: <span style={{ color: "var(--ivory)" }}>{activeView.toUpperCase()} VIEW</span>
              </div>
              
              {/* View Selector Controls */}
              <div style={{ display: "flex", gap: 8 }}>
                {["front", "back", "left-sleeve", "right-sleeve"].map(v => (
                  <button
                    key={v}
                    onClick={() => setActiveView(v)}
                    style={{
                      padding: "6px 12px",
                      background: activeView === v ? "var(--gold)" : "rgba(255,255,255,0.03)",
                      color: activeView === v ? "var(--obsidian)" : "var(--silver)",
                      border: "1px solid var(--smoke)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      cursor: "pointer",
                      fontWeight: "bold",
                      letterSpacing: 1
                    }}
                  >
                    {v.replace("-", " ").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Vector Canvas */}
            <div style={{
              background: "var(--graphite)",
              border: "1px solid var(--smoke)",
              height: 520,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* SVG vector outlines of the t-shirt model */}
              <svg viewBox="0 0 400 450" width="100%" height="100%" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="shadingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                    <stop offset="35%" stopColor="#000000" stopOpacity="0.25" />
                    <stop offset="70%" stopColor="#ffffff" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {(activeView === "front" || activeView === "back") ? (
                  <>
                    {/* T-Shirt Body path */}
                    <path 
                      d="M 120 40 L 80 80 L 110 130 L 145 105 L 145 420 L 255 420 L 255 105 L 290 130 L 320 80 L 280 40 Z" 
                      fill={baseColor} 
                      stroke="rgba(255,255,255,0.12)" 
                      strokeWidth="2" 
                    />
                    
                    {/* Collar curve */}
                    {activeView === "front" ? (
                      <path d="M 150 40 C 150 70, 250 70, 250 40" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                    ) : (
                      <path d="M 150 40 C 150 48, 250 48, 250 40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    )}

                    {/* Stitch overlay texture */}
                    <path 
                      d="M 120 40 L 80 80 L 110 130 L 145 105 L 145 420 L 255 420 L 255 105 L 290 130 L 320 80 L 280 40 Z" 
                      fill="url(#shadingGrad)" 
                      opacity="0.25" 
                      pointerEvents="none" 
                    />

                    {/* FRONT VIEW OVERLAYS */}
                    {activeView === "front" && (
                      <>
                        {/* Logo Left Chest */}
                        {logoFile && (
                          <image href={logoFile} x="155" y="105" width="28" height="28" style={{ objectFit: "contain" }} />
                        )}

                        {/* Front Graphic Center */}
                        {frontImage && (
                          <image href={frontImage} x="140" y="160" width="120" height="140" style={{ objectFit: "contain" }} />
                        )}

                        {/* Custom Text Front Chest */}
                        {text && textPosition === "front-chest" && (
                          <text 
                            x="200" 
                            y="145" 
                            textAnchor="middle" 
                            fill={textColor} 
                            fontFamily={textFont} 
                            fontSize={textScale * 0.7} 
                            style={{ fontWeight: "bold", letterSpacing: 1 }}
                          >
                            {text}
                          </text>
                        )}

                        {/* Front Embroidery Text */}
                        {isEmbroidery && embroideryText && (
                          <text
                            x="200"
                            y="330"
                            textAnchor="middle"
                            fill={embroideryColor}
                            fontFamily="var(--font-mono)"
                            fontSize="13"
                            stroke={embroideryColor}
                            strokeWidth="0.4"
                            strokeDasharray="2,1"
                            style={{ fontWeight: "bold" }}
                          >
                            🧵 {embroideryText.toUpperCase()}
                          </text>
                        )}
                      </>
                    )}

                    {/* BACK VIEW OVERLAYS */}
                    {activeView === "back" && (
                      <>
                        {/* Back Graphic */}
                        {backImage && (
                          <image href={backImage} x="130" y="130" width="140" height="170" style={{ objectFit: "contain" }} />
                        )}

                        {/* Custom Text Back Upper */}
                        {text && textPosition === "back-upper" && (
                          <text 
                            x="200" 
                            y="90" 
                            textAnchor="middle" 
                            fill={textColor} 
                            fontFamily={textFont} 
                            fontSize={textScale * 0.8} 
                            style={{ fontWeight: "bold", letterSpacing: 2 }}
                          >
                            {text}
                          </text>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Sleeve Close-up path */}
                    <path 
                      d="M 80 120 L 320 120 L 270 340 L 130 340 Z" 
                      fill={baseColor} 
                      stroke="rgba(255,255,255,0.15)" 
                      strokeWidth="2" 
                    />
                    
                    {/* Seam line */}
                    <line x1="130" y1="320" x2="270" y2="320" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
                    
                    {/* Texture shader */}
                    <path 
                      d="M 80 120 L 320 120 L 270 340 L 130 340 Z" 
                      fill="url(#shadingGrad)" 
                      opacity="0.25" 
                      pointerEvents="none" 
                    />

                    {/* Left Sleeve Overlays */}
                    {activeView === "left-sleeve" && (
                      <>
                        {sleeveImage && (
                          <image href={sleeveImage} x="140" y="160" width="120" height="120" style={{ objectFit: "contain" }} />
                        )}
                        {text && textPosition === "left-sleeve" && (
                          <text 
                            x="200" 
                            y="220" 
                            textAnchor="middle" 
                            fill={textColor} 
                            fontFamily={textFont} 
                            fontSize={textScale} 
                            style={{ fontWeight: "bold" }}
                          >
                            {text}
                          </text>
                        )}
                      </>
                    )}

                    {/* Right Sleeve Overlays */}
                    {activeView === "right-sleeve" && (
                      <>
                        {sleeveImage && (
                          <image href={sleeveImage} x="140" y="160" width="120" height="120" style={{ objectFit: "contain" }} />
                        )}
                        {text && textPosition === "right-sleeve" && (
                          <text 
                            x="200" 
                            y="220" 
                            textAnchor="middle" 
                            fill={textColor} 
                            fontFamily={textFont} 
                            fontSize={textScale} 
                            style={{ fontWeight: "bold" }}
                          >
                            {text}
                          </text>
                        )}
                      </>
                    )}
                  </>
                )}
              </svg>
            </div>
            
            {/* Visual Specs summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11, fontFamily: "var(--font-mono)" }}>
              <div>Fabric: <span style={{ color: "var(--gold)" }}>{fabric.toUpperCase()}</span></div>
              <div>Base Color: <span style={{ color: "var(--gold)" }}>{baseColor}</span></div>
              <div>Text font: <span style={{ color: "var(--gold)" }}>{textFont}</span></div>
              <div>Embroidery: <span style={{ color: "var(--gold)" }}>{isEmbroidery ? embroideryStyle : "No"}</span></div>
            </div>
          </div>

          {/* RIGHT: Lab Controls Panel */}
          <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 36 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 32 }}>DESIGN CENTER</h2>
            
            {/* Config Category Tabs */}
            <div style={{ display: "flex", gap: 10, marginBottom: 32, borderBottom: "1px solid var(--smoke)", paddingBottom: 10 }}>
              {[
                { id: "base", label: "BASE" },
                { id: "graphics", label: "GRAPHICS" },
                { id: "text", label: "TYPOGRAPHY" },
                { id: "embroidery", label: "EMBROIDERY" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: activeTab === t.id ? "var(--gold)" : "var(--silver)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: 2,
                    cursor: "pointer",
                    paddingBottom: 6,
                    borderBottom: `2px solid ${activeTab === t.id ? "var(--gold)" : "transparent"}`
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            
            {/* 1. BASE OPTIONS */}
            {activeTab === "base" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Base Color Select */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 12 }}>BASE COLOR</label>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {COLORS.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => setBaseColor(c.hex)}
                        title={c.name}
                        style={{
                          width: 38,
                          height: 38,
                          background: c.hex,
                          border: baseColor === c.hex ? "3px solid var(--gold)" : "1px solid var(--smoke)",
                          outline: baseColor === c.hex ? "2px solid #fff" : "none",
                          cursor: "pointer"
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Fabric Selection */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 12 }}>FABRIC GRADE</label>
                  <select 
                    className="input-dark" 
                    value={fabric} 
                    onChange={e => setFabric(e.target.value)}
                    style={{ width: "100%", padding: 12, fontSize: 13 }}
                  >
                    {FABRICS.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.surcharge > 0 ? `(+₹${f.surcharge})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size Selection */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 12 }}>FIT SIZE</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {["XS", "S", "M", "L", "XL", "XXL"].map(s => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        style={{
                          padding: "10px 18px",
                          border: size === s ? "2px solid var(--gold)" : "1px solid var(--smoke)",
                          background: size === s ? "var(--gold)" : "transparent",
                          color: size === s ? "var(--obsidian)" : "var(--silver)",
                          fontFamily: "var(--font-mono)",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 12 }}>QUANTITY</label>
                  <input
                    type="number"
                    className="input-dark"
                    min="1"
                    value={qty}
                    onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                    style={{ width: "100%", padding: 12 }}
                  />
                </div>
              </div>
            )}

            {/* 2. GRAPHICS & LOGOS */}
            {activeTab === "graphics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Upload Chest Logo */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>CHEST LOGO (FRONT LEFT)</label>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="upload-logo" 
                      style={{ display: "none" }} 
                      onChange={e => handleUpload(e, "logo")} 
                    />
                    <label htmlFor="upload-logo" className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, padding: "10px 16px" }}>
                      <Icon name="upload" size={14} /> SELECT LOGO
                    </label>
                    {logoFile && (
                      <button onClick={() => setLogoFile(null)} style={{ background: "none", border: "none", color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer" }}>
                        REMOVE
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Front Chest Image */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>FRONT CANVAS GRAPHIC (CENTER)</label>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="upload-front" 
                      style={{ display: "none" }} 
                      onChange={e => handleUpload(e, "front")} 
                    />
                    <label htmlFor="upload-front" className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, padding: "10px 16px" }}>
                      <Icon name="upload" size={14} /> SELECT GRAPHIC
                    </label>
                    {frontImage && (
                      <button onClick={() => setFrontImage(null)} style={{ background: "none", border: "none", color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer" }}>
                        REMOVE
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Back Image */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>BACK CANVAS GRAPHIC (CENTER)</label>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="upload-back" 
                      style={{ display: "none" }} 
                      onChange={e => handleUpload(e, "back")} 
                    />
                    <label htmlFor="upload-back" className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, padding: "10px 16px" }}>
                      <Icon name="upload" size={14} /> SELECT BACK ART
                    </label>
                    {backImage && (
                      <button onClick={() => setBackImage(null)} style={{ background: "none", border: "none", color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer" }}>
                        REMOVE
                      </button>
                    )}
                  </div>
                </div>

                {/* Sleeve Graphic */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>SLEEVE GRAPHIC (PRINT)</label>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="upload-sleeve" 
                      style={{ display: "none" }} 
                      onChange={e => handleUpload(e, "sleeve")} 
                    />
                    <label htmlFor="upload-sleeve" className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, padding: "10px 16px" }}>
                      <Icon name="upload" size={14} /> SELECT SLEEVE ART
                    </label>
                    {sleeveImage && (
                      <button onClick={() => setSleeveImage(null)} style={{ background: "none", border: "none", color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer" }}>
                        REMOVE
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. TYPOGRAPHY */}
            {activeTab === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Text Content */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>CUSTOM INSCRIPTION</label>
                  <input
                    type="text"
                    className="input-dark"
                    placeholder="Enter text style"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    style={{ width: "100%", padding: 12 }}
                  />
                </div>

                {/* Font Selector */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>FONT FAMILY</label>
                  <select 
                    className="input-dark" 
                    value={textFont} 
                    onChange={e => setTextFont(e.target.value)}
                    style={{ width: "100%", padding: 12 }}
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Placement Selector */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>TEXT PLACEMENT</label>
                  <select 
                    className="input-dark" 
                    value={textPosition} 
                    onChange={e => { setTextPosition(e.target.value); if(e.target.value.includes("sleeve")) setActiveView("left-sleeve"); else if (e.target.value.includes("back")) setActiveView("back"); else setActiveView("front"); }}
                    style={{ width: "100%", padding: 12 }}
                  >
                    <option value="front-chest">Front Chest (Upper)</option>
                    <option value="back-upper">Back Panel (Upper)</option>
                    <option value="left-sleeve">Left Sleeve</option>
                    <option value="right-sleeve">Right Sleeve</option>
                  </select>
                </div>

                {/* Text Color Picker */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>TEXT COLOR</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input 
                      type="color" 
                      value={textColor} 
                      onChange={e => setTextColor(e.target.value)}
                      style={{ border: "1px solid var(--smoke)", background: "none", cursor: "pointer", width: 50, height: 40 }}
                    />
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{textColor.toUpperCase()}</span>
                  </div>
                </div>

                {/* Text size scale */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    <span>FONT SIZE</span>
                    <span>{textScale}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="52"
                    value={textScale}
                    onChange={e => setTextScale(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--gold)" }}
                  />
                </div>
              </div>
            )}

            {/* 4. EMBROIDERY */}
            {activeTab === "embroidery" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Enable Embroidery Checkbox */}
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isEmbroidery}
                    onChange={e => setIsEmbroidery(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "var(--gold)" }}
                  />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1 }}>
                    UPGRADE TO PREMIUM EMBROIDERY (+₹250)
                  </span>
                </label>

                {isEmbroidery && (
                  <>
                    {/* Embroidery Text */}
                    <div>
                      <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>EMBROIDERY TEXT</label>
                      <input
                        type="text"
                        className="input-dark"
                        placeholder="e.g. WOLF PACK"
                        value={embroideryText}
                        onChange={e => setEmbroideryText(e.target.value)}
                        style={{ width: "100%", padding: 12 }}
                      />
                    </div>

                    {/* Stitch Style Select */}
                    <div>
                      <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>STITCH STYLE</label>
                      <select 
                        className="input-dark" 
                        value={embroideryStyle} 
                        onChange={e => setEmbroideryStyle(e.target.value)}
                        style={{ width: "100%", padding: 12 }}
                      >
                        <option value="Standard Satin Stitch">Standard Satin Stitch</option>
                        <option value="Chainstitch (Vintage)">Chainstitch (Vintage)</option>
                        <option value="3D Puff Embroidery">3D Puff Embroidery</option>
                        <option value="Towel Loop Chenille">Towel Loop Chenille</option>
                      </select>
                    </div>

                    {/* Embroidery Thread color */}
                    <div>
                      <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 10 }}>THREAD COLOR</label>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input 
                          type="color" 
                          value={embroideryColor} 
                          onChange={e => setEmbroideryColor(e.target.value)}
                          style={{ border: "1px solid var(--smoke)", background: "none", cursor: "pointer", width: 50, height: 40 }}
                        />
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{embroideryColor.toUpperCase()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Special notes */}
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--smoke)" }}>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)", display: "block", marginBottom: 8 }}>SPECIAL DESIGN LAB NOTES</label>
              <textarea
                className="input-dark"
                rows="2"
                placeholder="Mention print placements, specific sizes, collar tags or instructions..."
                value={specialNote}
                onChange={e => setSpecialNote(e.target.value)}
                style={{ width: "100%", padding: 12, fontSize: 12, height: "auto" }}
              />
            </div>

            {/* Pricing and Action buttons */}
            <div style={{ marginTop: 32, background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 1 }}>ESTIMATED TOTAL (INC. TAXES)</div>
                  <div style={{ fontSize: 36, fontFamily: "var(--font-display)", color: "var(--gold)", marginTop: 4 }}>
                    ₹{getPrice().toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--silver)" }}>
                  <div>Qty: {qty}</div>
                  <div>Delivery in 7-10 days</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
                <button className="btn-outline" onClick={handleAddToCart} style={{ padding: "14px 0", fontSize: 11 }}>
                  ADD TO CART
                </button>
                <button className="btn-gold" onClick={handleBuyNow} style={{ padding: "14px 0", fontSize: 11 }}>
                  BUY NOW
                </button>
              </div>
            </div>
            
          </div>
          
        </div>
        
      </div>
    </div>
  );
}
