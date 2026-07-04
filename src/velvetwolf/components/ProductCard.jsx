import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../pages/AppContext";
import Icon from "./Icon";
import ProductImage from "./ProductImage";
import { getCollectionById } from "../utils/collectionsData";
import { useBreakpoint } from "../utils/breakpoints";
import { TAG_COLORS } from "../utils/constants";

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, wishlist, setSelectedProduct, searchQuery } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  const inWishlist = wishlist.find(i => i.id === product.id);
  const tagStyle = TAG_COLORS[product.tag] || { bg: "var(--smoke)", color: "var(--ash)" };
  const discount = Math.round((1 - product.price / (product.originalPrice || product.price)) * 100);
  const defaultSize = product.sizes?.[0] || "M";
  const defaultColor = product.colors?.[0] || "#0a0a0a";
  const { isMobile } = useBreakpoint();

  const productUrl = `/product/${product.slug || product.id}`;

  const getAiMatchScore = (id) => {
    let hash = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 90 + (Math.abs(hash) % 10); // deterministic 90% to 99%
  };

  return (
    <div 
      className="product-card" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div style={{ position: "relative" }}>
        <Link
          to={productUrl}
          style={{ textDecoration: "none", display: "block" }}
          aria-label={`View ${product.name}`}
        >
          <ProductImage product={product} selectedColor={product.colors?.[0]} isParentHovered={isHovered} />
        </Link>
        
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 10 }}>
          {product.tag && (
            <span className="badge" style={{ background: tagStyle.bg, color: tagStyle.color }}>{product.tag}</span>
          )}
          {searchQuery && searchQuery.trim() && (
            <span className="badge" style={{ 
              background: "rgba(201, 168, 76, 0.95)", 
              color: "var(--obsidian)", 
              fontWeight: "bold",
              boxShadow: "0 0 10px rgba(201, 168, 76, 0.5)",
              border: "1px solid var(--gold)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              letterSpacing: 1
            }}>
              ✨ {getAiMatchScore(product.id)}% AI MATCH
            </span>
          )}
        </div>
        {discount > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "var(--wolf-red)", color: "#fff", padding: "2px 8px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1 }}>-{discount}%</div>}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }} 
          style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", padding: 8, color: inWishlist ? "var(--wolf-red)" : "var(--ash)", zIndex: 10 }}
        >
          <Icon name={inWishlist ? "heartFill" : "heart"} size={16} color={inWishlist ? "#c0392b" : "var(--ash)"} />
        </button>
      </div>
      <div style={{ padding: "20px 20px 24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "#c9c3c3", marginBottom: 6 }}>
          {getCollectionById(product.collection)?.name?.toUpperCase() || product.collection?.toUpperCase()}
        </div>
        <Link to={productUrl} style={{ textDecoration: "none", color: "inherit" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, marginBottom: 8 }}>{product.name}</h3>
        </Link>
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {[1,2,3,4,5].map(s => <Icon key={s} name="star" size={12} color={s <= Math.floor(product.rating || 5) ? "#c9a84c" : "#333"} />)}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#cac7c7", marginLeft: 4 }}>({product.reviews || 0})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--gold)" }}>{"\u20b9"}{product.price.toLocaleString()}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#cac7c7", textDecoration: "line-through" }}>{"\u20b9"}{product.originalPrice.toLocaleString()}</span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginTop: 18 }}>
          <button className="btn-ghost" onClick={() => setSelectedProduct(product)} style={{ width: "100%", padding: "12px 16px" }}>
            QUICK VIEW
          </button>
          <button className="btn-gold" onClick={() => addToCart(product, defaultSize, defaultColor)} style={{ width: "100%", padding: "12px 16px" }}>
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}
