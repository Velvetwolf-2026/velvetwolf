import React, { useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AppContext } from "./AppContext";
import { useLanguage } from "./LanguageContext";
import { apiUrl } from "../utils/api";
import Icon from "../components/Icon";
import ProductImage from "../components/ProductImage";
import { getCollectionById } from "../utils/collectionsData";
import { trackViewItem } from "../utils/analytics";
import { useBreakpoint } from "../utils/breakpoints";

const COLOR_MAP = {
  "Black": "#0a0a0a",
  "White": "#faf9f7",
  "Beige/Sand": "#d2b48c",
  "Forest Green": "#1e4620"
};

export default function ProductDetailPage() {
  const slug = useParams().slug;
  const { isMobile, isTablet, isMobileOrTablet } = useBreakpoint();
  const { addToCart, toggleWishlist, wishlist } = useContext(AppContext);
  const { t } = useLanguage();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);

  // Fetch product by slug
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${apiUrl("/products")}/${slug}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Product not found");
        }
        return res.json();
      })
      .then((data) => {
        const prod = data.product;
        setProduct(prod);
        trackViewItem(prod);
        // Default variant options
        setSize(prod.sizes?.[0] || "M");
        setColor(prod.colors?.[0] || "");
        setSelectedImage(null); // Reset main image to default
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load product details.");
        setLoading(false);
      });
  }, [slug]);

  // SEO metadata tag updates
  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} — VelvetWolf`;

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = product.description || `Shop the VelvetWolf ${product.name}. High-quality luxury streetwear.`;

    // Open Graph Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = `${product.name} — VelvetWolf`;

    // Open Graph Description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = product.description || `Shop the VelvetWolf ${product.name}. High-quality luxury streetwear.`;

    // Open Graph Image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement("meta");
      ogImage.setAttribute("property", "og:image");
      document.head.appendChild(ogImage);
    }
    const defaultImg = Array.isArray(product.images) ? product.images[0] : product.image;
    ogImage.content = defaultImg || "";
  }, [product]);

  // Reset selected image when color selection changes
  useEffect(() => {
    if (!product || !color) return;
    const rawGallery = Array.isArray(product.images) ? product.images : [];
    const gallery = product.image && !rawGallery.includes(product.image) 
      ? [product.image, ...rawGallery] 
      : (rawGallery.length > 0 ? rawGallery : (product.image ? [product.image] : []));

    const colorSpecific = gallery.find(
      (img) => typeof img === "string" && img.startsWith(`${color}::`)
    );
    if (colorSpecific) {
      setSelectedImage(colorSpecific.split("::")[1]);
    } else {
      const firstUnprefixed = gallery.find(
        (img) => typeof img === "string" && !img.includes("::")
      );
      if (firstUnprefixed) {
        setSelectedImage(firstUnprefixed);
      } else {
        setSelectedImage(null);
      }
    }
  }, [color, product]);

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--obsidian)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)" }}>LOADING PRODUCT DETAILS...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--obsidian)", color: "var(--silver)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--wolf-red)", marginBottom: 16 }}>✕ PRODUCT NOT FOUND</h2>
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", marginBottom: 24 }}>{error || "We couldn't find the piece you're looking for."}</p>
        <button className="btn-ghost" onClick={() => window.history.back()}>← GO BACK</button>
      </div>
    );
  }

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const rawGallery = Array.isArray(product.images) ? product.images : [];
  const gallery = product.image && !rawGallery.includes(product.image) 
    ? [product.image, ...rawGallery] 
    : (rawGallery.length > 0 ? rawGallery : (product.image ? [product.image] : []));

  // Filter and clean gallery based on selected color
  let filteredGallery = [];
  if (color) {
    const colorSpecific = gallery.filter(
      (img) => typeof img === "string" && img.startsWith(`${color}::`)
    );
    if (colorSpecific.length > 0) {
      filteredGallery = colorSpecific.map((img) => img.split("::")[1]);
    } else {
      filteredGallery = gallery
        .filter((img) => typeof img === "string" && !img.includes("::"))
        .map((img) => img);
    }
  }
  if (filteredGallery.length === 0) {
    filteredGallery = gallery.map((img) => (typeof img === "string" && img.includes("::") ? img.split("::")[1] : img));
  }

  const activeImage = selectedImage || (filteredGallery[0] || null);

  const inWishlist = wishlist.some((i) => i.id === product.id);
  const discount = Math.round((1 - product.price / (product.originalPrice || product.price)) * 100);

  const handleAddToCart = () => {
    addToCart(product, size, color, qty);
  };

  return (
    <div style={{ paddingTop: 90, minHeight: "100vh", background: "var(--obsidian)" }}>
      <div className="page-content-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "20px 16px" : "40px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : (isTablet ? 32 : 60) }}>
          {/* Left - Image Gallery */}
          <div>
            <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", position: "relative", overflow: "hidden", height: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, opacity: 0.1 }}>VW PLACEHOLDER</div>
              )}
              {discount > 0 && <div style={{ position: "absolute", top: 20, right: 20, background: "var(--wolf-red)", color: "#fff", padding: "4px 12px", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1 }}>-{discount}%</div>}
            </div>

            {/* Thumbnail grid */}
            {filteredGallery.length > 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 16 }}>
                {filteredGallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    style={{
                      padding: 0,
                      border: activeImage === img ? "1px solid var(--gold)" : "1px solid var(--smoke)",
                      background: "var(--onyx)",
                      height: 80,
                      cursor: "pointer",
                      overflow: "hidden"
                    }}
                  >
                    <img src={img} alt={`${product.name} thumbnail ${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right - Product details */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3, color: "var(--gold)", marginBottom: 12 }}>
              {getCollectionById(product.collection)?.name?.toUpperCase() || product.collection?.toUpperCase()}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: 2, marginBottom: 16, lineHeight: 1 }}>{product.name}</h1>
            
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={14} color={s <= Math.floor(product.rating || 5) ? "#c9a84c" : "#333"} />)}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", marginLeft: 8 }}>({product.reviews || 0} {t("shop") === "दुकान" ? "समीक्षाएं" : (t("shop") === "கடை" ? "மதிப்புரைகள்" : "reviews")})</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 44, color: "var(--gold)" }}>{"\u20b9"}{product.price.toLocaleString()}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--silver)", textDecoration: "line-through" }}>{"\u20b9"}{product.originalPrice.toLocaleString()}</span>
              )}
            </div>

            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 15, color: "var(--silver)", lineHeight: 1.8, marginBottom: 32 }}>{product.description}</p>

            {/* Colors selection */}
            {colors.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)", marginBottom: 12 }}>{t("color")}: {color.toUpperCase()}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: COLOR_MAP[c] || c,
                        border: color === c ? "2px solid var(--gold)" : "2px solid transparent",
                        cursor: "pointer",
                        outline: "2px solid var(--smoke)"
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes selection */}
            {sizes.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)", marginBottom: 12 }}>{t("size")}: {size}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      style={{
                        padding: "10px 18px",
                        border: "1px solid",
                        borderColor: size === s ? "var(--gold)" : "var(--smoke)",
                        background: size === s ? "var(--gold)" : "transparent",
                        color: size === s ? "var(--obsidian)" : "var(--silver)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        cursor: "pointer",
                        letterSpacing: 1,
                        transition: "all 0.3s"
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity selection */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)", marginBottom: 12 }}>{t("qty")}</div>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--smoke)", width: "fit-content" }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "10px 16px" }}><Icon name="minus" size={14} /></button>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ivory)", padding: "0 20px" }}>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "10px 16px" }}><Icon name="plus" size={14} /></button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 16 }}>
              <button className="btn-gold" style={{ flex: 1, padding: "18px 40px" }} onClick={handleAddToCart}>{t("addToCart")}</button>
              <button
                onClick={() => toggleWishlist(product)}
                style={{
                  background: inWishlist ? "rgba(192,57,43,0.2)" : "transparent",
                  border: `1px solid ${inWishlist ? "var(--wolf-red)" : "var(--smoke)"}`,
                  color: inWishlist ? "var(--wolf-red)" : "var(--silver)",
                  padding: "0 24px",
                  cursor: "pointer"
                }}
              >
                <Icon name={inWishlist ? "heartFill" : "heart"} size={22} color={inWishlist ? "#c0392b" : "var(--silver)"} />
              </button>
            </div>

            {/* Features list */}
            <div style={{ borderTop: "1px solid var(--smoke)", marginTop: 40, paddingTop: 24, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
              {[
                ["🛡️ SECURE CHECKOUT", "UPI, Cards, EMI, COD"],
                ["⚡ EXPRESS DELIVERY", "Dispatch within 48 hours"],
                ["🔄 EASY RETURNS", "30-day exchange window"]
              ].map(([t, desc]) => (
                <div key={t}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", letterSpacing: 1, marginBottom: 4 }}>{t}</div>
                  <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: "var(--silver)" }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
