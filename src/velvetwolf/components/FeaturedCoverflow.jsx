import React, { useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import Icon from "./Icon";
import { useBreakpoint } from "../utils/breakpoints";

export default function FeaturedCoverflow({ products }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isActiveHovered, setIsActiveHovered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();

  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setStartX(e.pageX || e.touches?.[0]?.clientX || 0);
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const currentX = e.pageX || e.touches?.[0]?.clientX || 0;
    const diff = currentX - startX;

    if (Math.abs(diff) > 60) {
      if (diff > 0) {
        setActiveIndex((current) => (current - 1 + products.length) % products.length);
      } else {
        setActiveIndex((current) => (current + 1) % products.length);
      }
      setIsDragging(false);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

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

  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 550);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  if (!products.length) return null;

  const getOffset = (index) => {
    const total = products.length;
    let offset = index - activeIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
  };

  const cardWidth = isMobile ? 270 : (isTablet ? 310 : 340);
  const containerHeight = isMobile ? 540 : (isTablet ? 590 : 640);
  const offsetStep = isMobile ? 180 : (isTablet ? 220 : 250);

  return (
    <div style={{ position: "relative", padding: "20px 0 8px" }}>
      <style>{`
        @keyframes subtleFloatCarousel {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); handleDragEnd(); }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{
          position: "relative",
          height: containerHeight,
          overflow: "hidden",
          animation: "subtleFloatCarousel 7s ease-in-out infinite",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none"
        }}
      >
        {products.map((product, index) => {
          const offset = getOffset(index);
          const distance = Math.abs(offset);
          const isActive = offset === 0;
          const translateX = offset * offsetStep;

          // Cinematic depth shift and visibility calculations
          const scale = isActive
            ? (transitioning ? 0.94 : 1)
            : (transitioning ? 0.78 : Math.max(0.82, 0.88 - distance * 0.08));

          const opacity = distance > 2
            ? 0
            : (isActive ? 1 : (distance === 1 ? 0.68 : 0.35));

          const rotateY = offset * -15;

          // Spotlight, scale and blur calculations
          const filterValue = isActive
            ? `drop-shadow(0 ${isActiveHovered ? 35 : 28}px ${isActiveHovered ? 70 : 60}px rgba(0,0,0,0.5)) blur(${transitioning ? "1.5px" : "0px"}) brightness(${isActiveHovered ? 1.08 : 1})`
            : `drop-shadow(0 12px 28px rgba(0,0,0,0.3)) blur(${transitioning ? "2.5px" : "0.8px"}) brightness(0.85)`;

          return (
            <div
              key={product.id}
              className="featured-coverflow-card"
              onClick={() => setActiveIndex(index)}
              onMouseEnter={() => { if (isActive) setIsActiveHovered(true); }}
              onMouseLeave={() => { if (isActive) setIsActiveHovered(false); }}
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                width: cardWidth,
                cursor: "pointer",
                zIndex: isActive ? 30 : 20 - distance,
                opacity,
                transform: `translateX(calc(-50% + ${translateX}px)) scale(${scale}) perspective(1400px) rotateY(${rotateY}deg)`,
                transformOrigin: "center center",
                transition: "transform 0.65s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.55s ease, filter 0.55s ease, border-color 0.4s ease, box-shadow 0.4s ease",
                filter: filterValue,
                pointerEvents: distance > 2 ? "none" : "auto",
                background: "var(--onyx)",
                border: isActive 
                  ? (isActiveHovered ? "1.5px solid var(--gold)" : "1.5px solid rgba(201,168,76,0.35)") 
                  : "1px solid var(--smoke)",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: isActive && isActiveHovered
                  ? "0 30px 70px rgba(0,0,0,0.6), 0 0 30px rgba(201,168,76,0.2)"
                  : "none",
              }}
            >
              {/* Luxury Spotlight radial glow backdrop */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    inset: "-50px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)",
                    opacity: isActiveHovered ? 1 : 0,
                    transition: "opacity 0.5s ease",
                    pointerEvents: "none",
                    zIndex: -1,
                  }}
                />
              )}
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
              aria-label={`Go to slide ${index + 1}`}
              style={{
                width: index === activeIndex ? 34 : 10,
                height: 24,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: "100%",
                  height: 3,
                  borderRadius: 2,
                  background: index === activeIndex ? "var(--gold)" : "var(--smoke)",
                  transition: "all 0.3s ease",
                }}
              />
            </button>
          ))}
        </div>
        <button className="btn-ghost" onClick={() => setActiveIndex((current) => (current + 1) % products.length)} style={{ padding: "10px 16px" }}>
          <Icon name="arrowRight" size={12} color="currentColor" />
        </button>
      </div>
    </div>
  );
}
