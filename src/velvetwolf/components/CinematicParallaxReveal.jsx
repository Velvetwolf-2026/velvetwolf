import React, { useState, useRef, useEffect } from "react";

export default function CinematicParallaxReveal({ activeIndex }) {
  const containerRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [autoPos, setAutoPos] = useState({ x: 0, y: 0 });
  const autoTime = useRef(0);

  useEffect(() => {
    if (!isHovered) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsExiting(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsExiting(false);
    }
  }, [isHovered]);

  // Auto-orbit drift when the mouse is not hovering
  useEffect(() => {
    if (isHovered) return;
    
    const interval = setInterval(() => {
      autoTime.current += 0.015;
      setAutoPos({
        x: Math.cos(autoTime.current) * 0.25, // Orbital range -0.25 to 0.25
        y: Math.sin(autoTime.current * 1.5) * 0.2, // Slightly offset figure-8 path
      });
    }, 16);
    
    return () => clearInterval(interval);
  }, [isHovered]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // range: -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // range: -0.5 to 0.5
    setMouse({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMouse({ x: 0, y: 0 });
  };

  // Determine active coordinates (cursor or auto-drift)
  const activeX = isHovered ? mouse.x : autoPos.x;
  const activeY = isHovered ? mouse.y : autoPos.y;

  const slides = [
    {
      id: "silent",
      name: "Silent Luxury",
      image: "/mockup_silent.webp",
      tag: "SILENT LUXURY",
      bgText: "SILENCE",
      color: "var(--pearl)",
      shadow: "rgba(240, 237, 232, 0.15)",
    },
    {
      id: "beast",
      name: "Beast Mode",
      image: "/mockup_beast.webp",
      tag: "BEAST MODE ON",
      bgText: "BEAST",
      color: "var(--gold)",
      shadow: "rgba(201, 168, 76, 0.25)",
    },
    {
      id: "founder",
      name: "Founder's Mindset",
      image: "/mockup_founder.webp",
      tag: "FOUNDER'S MINDSET",
      bgText: "FOUNDER",
      color: "var(--silver)",
      shadow: "rgba(136, 129, 129, 0.15)",
    },
  ];

  const current = slides[activeIndex] || slides[0];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: "100%",
        height: "500px",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        border: "1px solid rgba(201, 168, 76, 0.1)",
        borderRadius: "24px",
        background: "radial-gradient(circle at center, #111111 0%, #060606 100%)",
        cursor: "crosshair",
        userSelect: "none",
      }}
    >
      {/* 1. Background Grid Layer (Parallax Inverted) */}
      <div
        style={{
          position: "absolute",
          inset: "-40px",
          backgroundImage: `
            linear-gradient(to right, rgba(201, 168, 76, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(201, 168, 76, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          backgroundPosition: "center",
          transform: `translate3d(${activeX * -25}px, ${activeY * -25}px, 0)`,
          transition: isExiting ? "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
          zIndex: 1,
        }}
      />

      {/* 2. Background Large Outline Text (Parallax Inverted) */}
      <div
        key={current.bgText}
        style={{
          position: "absolute",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(80px, 10vw, 150px)",
          letterSpacing: "8px",
          color: "transparent",
          WebkitTextStroke: "1px rgba(255, 255, 255, 0.04)",
          transform: `translate3d(${activeX * -45}px, ${activeY * -45}px, 0)`,
          transition: isExiting ? "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
          pointerEvents: "none",
          zIndex: 2,
          animation: "fadeIn 1s ease",
        }}
      >
        {current.bgText}
      </div>

      {/* 3. Subtle Animated Gold Accents (Parallax Normal) */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "15%",
          width: "70%",
          height: "70%",
          border: "1px dashed rgba(201, 168, 76, 0.15)",
          transform: `translate3d(${activeX * 12}px, ${activeY * 12}px, 0)`,
          transition: isExiting ? "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Moving vertical gold line representing vertical slider coordinate */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `calc(50% + ${activeX * 250}px)`,
          width: "1px",
          background: "linear-gradient(transparent, var(--gold), transparent)",
          opacity: 0.35,
          transition: isExiting ? "left 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
          zIndex: 4,
          pointerEvents: "none",
        }}
      />

      {/* 4. T-shirt Reveal Container */}
      <div
        style={{
          position: "relative",
          width: "360px",
          height: "440px",
          zIndex: 5,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Shadow glow base behind mask */}
        <div
          style={{
            position: "absolute",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            backgroundColor: current.shadow,
            filter: "blur(60px)",
            opacity: 0.6,
            left: `calc(50% + ${activeX * 120}px)`,
            top: `calc(50% + ${activeY * 120}px)`,
            transform: "translate(-50%, -50%)",
            transition: isExiting ? "all 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Dynamic Clipping Mask Lens Ring */}
        <div
          style={{
            position: "absolute",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            border: `1.5px solid ${current.color}`,
            boxShadow: `0 0 30px ${current.shadow}, inset 0 0 20px rgba(0,0,0,0.8)`,
            left: `calc(50% + ${activeX * 200}px)`,
            top: `calc(50% + ${activeY * 200}px)`,
            transform: "translate(-50%, -50%)",
            transition: isExiting ? "all 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
            zIndex: 10,
            pointerEvents: "none",
            background: "transparent",
          }}
        />

        {/* Foreground Full Image inside Circle Clipping Path */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            clipPath: `circle(125px at calc(50% + ${activeX * 200}px) calc(50% + ${activeY * 200}px))`,
            transition: isExiting ? "clip-path 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
            zIndex: 8,
          }}
        >
          <img
            src={current.image}
            alt={current.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `translate3d(${activeX * 35}px, ${activeY * 35}px, 0) scale(1.08)`,
              transition: isExiting ? "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
              filter: "drop-shadow(0 10px 20px rgba(0, 0, 0, 0.6))",
            }}
          />
        </div>

        {/* Background dark/silhouette image outside the clip lens */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 7,
            opacity: 0.15,
          }}
        >
          <img
            src={current.image}
            alt={current.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `translate3d(${activeX * 10}px, ${activeY * 10}px, 0) scale(1.05)`,
              transition: isExiting ? "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
              filter: "grayscale(100%) brightness(30%)",
            }}
          />
        </div>
      </div>

      {/* 5. Parallax Floating Badge (Normal speed parallax) */}
      <div
        key={current.tag}
        style={{
          position: "absolute",
          bottom: "35px",
          background: "rgba(10, 10, 10, 0.9)",
          backdropFilter: "blur(8px)",
          border: `1.5px solid ${current.color}`,
          padding: "6px 20px",
          borderRadius: "30px",
          zIndex: 12,
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "#ffffff",
          letterSpacing: "3px",
          boxShadow: `0 10px 25px rgba(0,0,0,0.6), 0 0 15px ${current.shadow}`,
          transform: `translate3d(${activeX * 45}px, ${activeY * 40}px, 0)`,
          transition: isExiting ? "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
          animation: "fadeUp 0.6s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        {current.tag}
      </div>
    </div>
  );
}
