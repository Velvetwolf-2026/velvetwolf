import React, { useMemo, useState, useEffect } from "react";

function getProductImages(product, selectedColor) {
  const list = [];
  const add = (url) => {
    if (!url || typeof url !== "string") return;
    let clean = url.trim();
    if (clean.includes("::")) clean = clean.split("::")[1];
    if (clean && !list.includes(clean)) list.push(clean);
  };

  // Color specific image
  if (selectedColor && Array.isArray(product.images)) {
    const matched = product.images.find(
      (img) => typeof img === "string" && img.startsWith(`${selectedColor}::`)
    );
    if (matched) add(matched);
  }

  // Standard product.image
  if (product.image) {
    if (typeof product.image === "string") {
      if (product.image.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(product.image);
          if (Array.isArray(parsed)) parsed.forEach(add);
        } catch {
          add(product.image);
        }
      } else {
        add(product.image);
      }
    } else if (Array.isArray(product.image)) {
      product.image.forEach(add);
    }
  }

  // Additional product.images
  if (Array.isArray(product.images)) {
    product.images.forEach(add);
  }

  // Model image
  if (product.modelImage) {
    add(product.modelImage);
  }

  return list;
}

export default function ProductImage({ product, height = 280, selectedColor = null, isParentHovered = false }) {
  const imageList = useMemo(() => getProductImages(product, selectedColor), [product, selectedColor]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Dynamic automatic image rotator every few seconds
  useEffect(() => {
    if (imageList.length <= 1 || isParentHovered) return;

    // Organic random duration between 3.5s and 5.5s per product card instance
    const duration = 3500 + Math.floor(Math.random() * 2000);
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % imageList.length);
    }, duration);

    return () => clearInterval(timer);
  }, [imageList, isParentHovered]);

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

  if (imageList.length > 0) {
    const showHoverModel = Boolean(isParentHovered && product.modelImage);

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
        {imageList.map((imgUrl, index) => {
          const isActive = index === activeIdx && !showHoverModel;
          return (
            <img
              key={imgUrl + index}
              src={imgUrl}
              alt={`${product.name} ${index + 1}`}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "opacity 0.6s ease-in-out, transform 0.5s ease",
                opacity: isActive ? 1 : 0,
                transform: isParentHovered ? "scale(1.05)" : "scale(1)",
                pointerEvents: "none"
              }}
              loading="lazy"
            />
          );
        })}

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
              transition: "opacity 0.4s ease-in-out, transform 0.5s ease",
              opacity: showHoverModel ? 1 : 0,
              transform: isParentHovered ? "scale(1.05)" : "scale(1.02)",
              pointerEvents: "none",
              zIndex: 2
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
