import React, { useContext, useState } from "react";
import { AppContext } from "../pages/AppContext";
import Icon from "./Icon";
import ProductImage from "./ProductImage";
import { getCollectionById } from "../utils/collectionsData";
import { useBreakpoint } from "../utils/breakpoints";

const COLOR_MAP = {
  "Black": "#0a0a0a",
  "White": "#faf9f7",
  "Beige/Sand": "#d2b48c",
  "Forest Green": "#1e4620",
  "Crimson Ember": "#8B2635"
};

export default function ProductModal() {
  const { selectedProduct: p, setSelectedProduct, addToCart, toggleWishlist, wishlist } = useContext(AppContext);
  const { isMobile, isMobileOrTablet } = useBreakpoint();
  
  const sizes  = Array.isArray(p?.sizes)  && p.sizes.length  ? p.sizes  : [];
  const colors = Array.isArray(p?.colors) && p.colors.length ? p.colors : [];
  const [size, setSize]   = useState(sizes[0]  ?? "M");
  const [color, setColor] = useState(colors[0] ?? "#0a0a0a");
  const [qty, setQty] = useState(1);

  if (!p) return null;
  
  const inWishlist = wishlist.find(i => i.id === p.id);

  return (
    <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
      <div className="modal-box" style={{ maxWidth: 880, display: "flex", flexDirection: isMobileOrTablet ? "column" : "row", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ flex: 1, flexShrink: 0 }}>
          <ProductImage product={p} height={isMobileOrTablet ? 300 : 420} selectedColor={color} />
        </div>
        <div style={{ flex: 1, padding: isMobile ? 24 : 40, position: "relative" }}>
          <button onClick={() => setSelectedProduct(null)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="x" size={20}/></button>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>
            {getCollectionById(p.collection)?.name?.toUpperCase() || p.collection?.toUpperCase()}
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2, marginBottom: 12 }}>{p.name}</h2>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {[1,2,3,4,5].map(s => <Icon key={s} name="star" size={12} color={s <= Math.floor(p.rating || 5) ? "#c9a84c" : "#333"}/>)}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginLeft: 6 }}>{p.rating || 5} ({p.reviews || 0} reviews)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>{"\u20b9"}{p.price.toLocaleString()}</span>
            {p.originalPrice && p.originalPrice > p.price && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--silver)", textDecoration: "line-through" }}>{"\u20b9"}{p.originalPrice.toLocaleString()}</span>
            )}
          </div>
          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: "var(--silver)", lineHeight: 1.7, marginBottom: 24 }}>{p.description}</p>

          {/* Color */}
          {colors.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--ash)", marginBottom: 10 }}>COLOR</div>
              <div style={{ display: "flex", gap: 8 }}>
                {colors.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: COLOR_MAP[c] || c, border: color === c ? "2px solid var(--gold)" : "2px solid transparent", cursor: "pointer", outline: "2px solid var(--smoke)" }}/>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {sizes.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--ash)", marginBottom: 10 }}>SIZE</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sizes.map(s => (
                  <button key={s} onClick={() => setSize(s)} style={{ padding: "8px 14px", border: "1px solid", borderColor: size === s ? "var(--gold)" : "var(--smoke)", background: size === s ? "var(--gold)" : "transparent", color: size === s ? "var(--obsidian)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--ash)", marginBottom: 10 }}>QUANTITY</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--smoke)", width: "fit-content" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "8px 14px" }}><Icon name="minus" size={14}/></button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ivory)", padding: "0 16px" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "8px 14px" }}><Icon name="plus" size={14}/></button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-gold" style={{ flex: 1 }} onClick={() => { addToCart(p, size, color, qty); setSelectedProduct(null); }}>ADD TO CART</button>
            <button onClick={() => toggleWishlist(p)} style={{ background: inWishlist ? "rgba(192,57,43,0.2)" : "transparent", border: `1px solid ${inWishlist ? "var(--wolf-red)" : "var(--smoke)"}`, color: inWishlist ? "var(--wolf-red)" : "var(--silver)", padding: "0 18px", cursor: "pointer" }}>
              <Icon name={inWishlist ? "heartFill" : "heart"} size={18} color={inWishlist ? "#c0392b" : "var(--silver)"}/>
            </button>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
            {["Secure Payment", "Free Ship \u20b91999+", "30-Day Returns"].map(t => (
              <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 1 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
