import React from "react";

export default function ProductImage({ product, height = 280, selectedColor = null, isParentHovered = false }) {
  const collectionColors = {
    "ai-tech": ["#0a1628", "#1a2a4a", "#4fc3f7"],
    "anime": ["#1a0010", "#2a0020", "#f06292"],
    "silent-luxury": ["#1a1a0a", "#2a2a1a", "#c9a84c"],
    "founder": ["#0a1a0a", "#1a2a1a", "#ffd54f"],
    "beast-mode": ["#1a0a00", "#2a1a00", "#ff8a65"],
    "mind-mayhem": ["#0a001a", "#1a0a2a", "#ce93d8"],
    "savage-quotes": ["#1a0a0a", "#2a0000", "#ef5350"],
    "xp-mode": ["#001a00", "#0a2a0a", "#81c784"],
  };

  const cols = collectionColors[product.collection] || ["#111", "#1a1a1a", "#888"];

  // Parse product image
  let imageUrl = null;

  // 1. Try to find a color-specific image if selectedColor is provided
  if (selectedColor && Array.isArray(product.images)) {
    const matched = product.images.find(
      (img) => typeof img === "string" && img.startsWith(`${selectedColor}::`)
    );
    if (matched) {
      imageUrl = matched.split("::")[1];
    }
  }

  // 2. Fall back to standard logic
  if (!imageUrl) {
    if (product.image) {
      if (typeof product.image === "string") {
        if (product.image.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(product.image);
            if (Array.isArray(parsed) && parsed.length > 0) {
              imageUrl = parsed[0];
            }
          } catch {
            imageUrl = product.image;
          }
        } else {
          imageUrl = product.image;
        }
      } else if (Array.isArray(product.image) && product.image.length > 0) {
        imageUrl = product.image[0];
      }
    }

    // Fallback to images array if available
    if (!imageUrl && Array.isArray(product.images) && product.images.length > 0) {
      const firstNonPrefixed = product.images.find(img => typeof img === "string" && !img.includes("::"));
      imageUrl = firstNonPrefixed || product.images[0];
    }
  }

  // Strip prefix if any remain
  if (typeof imageUrl === "string" && imageUrl.includes("::")) {
    imageUrl = imageUrl.split("::")[1];
  }

  if (imageUrl) {
    const showModel = Boolean(isParentHovered && product.modelImage);
    return (
      <div
        style={{
          height,
          position: "relative",
          overflow: "hidden",
          background: "var(--onyx)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <img
          src={imageUrl}
          alt={product.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.5s ease, opacity 0.3s ease",
            opacity: showModel ? 0 : 1,
            transform: isParentHovered ? "scale(1.05)" : "scale(1)"
          }}
          loading="lazy"
        />
        {product.modelImage && (
          <img
            src={product.modelImage}
            alt={`${product.name} Model Preview`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.5s ease, opacity 0.3s ease",
              opacity: showModel ? 1 : 0,
              transform: isParentHovered ? "scale(1.05)" : "scale(1.02)",
              pointerEvents: "none"
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: "linear-gradient(transparent, rgba(10,10,10,0.8))",
            zIndex: 3
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        height,
        background: `linear-gradient(135deg, ${cols[0]}, ${cols[1]})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${cols[2]}22, transparent 70%)`,
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 72,
          color: cols[2],
          opacity: 0.15,
          userSelect: "none",
          letterSpacing: 4,
          position: "absolute",
        }}
      >
        VW
      </div>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            color: cols[2],
            letterSpacing: 3,
            lineHeight: 1.2,
          }}
        >
          {product.name.split(" ").map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: cols[2],
            opacity: 0.6,
            letterSpacing: 2,
            marginTop: 10,
          }}
        >
          VELVETWOLF
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: `linear-gradient(transparent, ${cols[0]}88)`,
        }}
      />
    </div>
  );
}
