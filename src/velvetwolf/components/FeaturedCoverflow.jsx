import React, { useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import Icon from "./Icon";

export default function FeaturedCoverflow({ products }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!products.length) return;
    setActiveIndex((current) => Math.min(current, products.length - 1));
  }, [products.length]);

  useEffect(() => {
    if (products.length < 2 || isHovered) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % products.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHovered, products.length]);

  if (!products.length) return null;

  const getOffset = (index) => {
    const total = products.length;
    let offset = index - activeIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
  };

  return (
    <div style={{ position: "relative", padding: "20px 0 8px" }}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ position: "relative", height: 560, overflow: "hidden" }}
      >
        {products.map((product, index) => {
          const offset = getOffset(index);
          const distance = Math.abs(offset);
          const isActive = offset === 0;
          const translateX = offset * 250;
          const scale = isActive ? 1 : Math.max(0.72, 0.88 - distance * 0.12);
          const opacity = distance > 2 ? 0 : Math.max(0.24, 1 - distance * 0.28);
          const rotateY = offset * -18;

          return (
            <div
              key={product.id}
              onClick={() => setActiveIndex(index)}
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                width: 340,
                cursor: "pointer",
                zIndex: 20 - distance,
                opacity,
                transform: `translateX(calc(-50% + ${translateX}px)) scale(${scale}) perspective(1400px) rotateY(${rotateY}deg)`,
                transformOrigin: "center center",
                transition: "transform 0.55s ease, opacity 0.45s ease",
                filter: isActive ? "drop-shadow(0 28px 60px rgba(0,0,0,0.45))" : "drop-shadow(0 12px 28px rgba(0,0,0,0.28))",
                pointerEvents: distance > 2 ? "none" : "auto",
              }}
            >
              <ProductCard product={product} />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 12 }}>
        <button className="btn-ghost" onClick={() => setActiveIndex((current) => (current - 1 + products.length) % products.length)} style={{ padding: "10px 16px" }}>
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <Icon name="arrowRight" size={12} color="currentColor" />
          </span>
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {products.map((product, index) => (
            <button
              key={product.id}
              onClick={() => setActiveIndex(index)}
              style={{
                width: index === activeIndex ? 34 : 10,
                height: 3,
                border: "none",
                background: index === activeIndex ? "var(--gold)" : "var(--smoke)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
        <button className="btn-ghost" onClick={() => setActiveIndex((current) => (current + 1) % products.length)} style={{ padding: "10px 16px" }}>
          <Icon name="arrowRight" size={12} color="currentColor" />
        </button>
      </div>
    </div>
  );
}
