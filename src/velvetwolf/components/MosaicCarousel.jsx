// ─────────────────────────────────────────────
// VelvetWolf — <MosaicCarousel />
//
// Dual-row marquee carousel with opposite direction
// auto-scrolling brand logo tiles & glassmorphism.
// ─────────────────────────────────────────────
import { useState, useRef, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { getSupabaseLogoUrl } from "../utils/supabase";

// Complete brand logos list
const LOGOS_LIST_RAW = [
  // Bike logos
  { id: "aprilia", name: "Aprilia", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/aprilia.png" },
  { id: "bmw-bike", name: "BMW Motorrad", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/bmw.png" },
  { id: "ducati", name: "Ducati", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/ducati.png" },
  { id: "harleydavidson", name: "Harley Davidson", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/harleydavidson.png" },
  { id: "kawasaki", name: "Kawasaki", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/kawasaki.png" },
  { id: "ktm", name: "KTM", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/ktm.png" },
  { id: "royalenfield", name: "Royal Enfield", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/royalenfield.png" },
  { id: "triumph", name: "Triumph", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/triumph.png" },
  { id: "yamaha", name: "Yamaha", category: "Bike", image: "/LOGOS/BIKE BRAND LOGOS/yamaha.png" },
  
  // Car logos
  { id: "bentley", name: "Bentley", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/Bently.png" },
  { id: "benz", name: "Mercedes Benz", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/Benz.png" },
  { id: "astonmartin", name: "Aston Martin", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/astomartin.png" },
  { id: "audi", name: "Audi", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/audi.png" },
  { id: "bmw-car", name: "BMW", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/bmw.png" },
  { id: "dodge", name: "Dodge", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/dodge.png" },
  { id: "ferrari", name: "Ferrari", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/ferrari.png" },
  { id: "gtr", name: "Nissan GTR", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/gtr.png" },
  { id: "lambo", name: "Lamborghini", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/lambo.png" },
  { id: "landrover", name: "Land Rover", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/landrover.png" },
  { id: "mclaren", name: "McLaren", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/mclaren.png" },
  { id: "mustang", name: "Mustang", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/mustang.png" },
  { id: "porsche", name: "Porsche", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/porche.png" },
  { id: "rangerover", name: "Range Rover", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/rangerover.png" },
  { id: "rollsroyce", name: "Rolls Royce", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/rollsroyce.png" },
  { id: "srt", name: "Dodge SRT", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/srt.png" },
  { id: "supra", name: "Toyota Supra", category: "Car", image: "/LOGOS/CAR BRAND LOGOS/supra.png" },
  
  // Gaming logos
  { id: "cod", name: "Call of Duty", category: "Gaming", image: "/LOGOS/GAMING LOGOS/cod.png" },
  { id: "csgo", name: "Counter Strike", category: "Gaming", image: "/LOGOS/GAMING LOGOS/cs.png" },
  { id: "ghost", name: "Ghost", category: "Gaming", image: "/LOGOS/GAMING LOGOS/gost.png" },
  { id: "playstation", name: "PlayStation", category: "Gaming", image: "/LOGOS/GAMING LOGOS/ps.png" },
  { id: "valorant", name: "Valorant", category: "Gaming", image: "/LOGOS/GAMING LOGOS/valorant.png" },
  { id: "xbox", name: "Xbox", category: "Gaming", image: "/LOGOS/GAMING LOGOS/xbox.png" }
];

const LOGOS_LIST = LOGOS_LIST_RAW.map(logo => ({
  ...logo,
  image: getSupabaseLogoUrl(logo.image)
}));

const getMosaicMetrics = (viewportWidth) => {
  if (viewportWidth <= 480) {
    return {
      gap: 8,
      tileSize: 106,
      scrollAmount: 260,
      trackPadding: "12px 12px",
      edgeFadeWidth: 28,
      headerGap: 8,
    };
  }

  if (viewportWidth <= 768) {
    return {
      gap: 10,
      tileSize: 128,
      scrollAmount: 360,
      trackPadding: "14px 20px",
      edgeFadeWidth: 46,
      headerGap: 10,
    };
  }

  return {
    gap: 14,
    tileSize: 154,
    scrollAmount: 500,
    trackPadding: "16px 36px",
    edgeFadeWidth: 90,
    headerGap: 12,
  };
};

/* ── Canvas Utility: Process Image to Remove Solid Black/Dark Background ── */
const processedImageCache = new Map();

function getTransparentImageSrc(imgSrc, callback) {
  if (!imgSrc) return;
  if (processedImageCache.has(imgSrc)) {
    callback(processedImageCache.get(imgSrc));
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        callback(imgSrc);
        return;
      }
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Scan all pixels and set dark/black background pixels to alpha = 0
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const maxRgb = Math.max(r, g, b);

        if (maxRgb < 45) {
          if (maxRgb < 24) {
            data[i + 3] = 0;
          } else {
            data[i + 3] = Math.round(((maxRgb - 24) / 21) * 255);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const transparentDataUrl = canvas.toDataURL("image/png");
      processedImageCache.set(imgSrc, transparentDataUrl);
      callback(transparentDataUrl);
    } catch {
      processedImageCache.set(imgSrc, imgSrc);
      callback(imgSrc);
    }
  };

  img.onerror = () => callback(imgSrc);
  img.src = imgSrc;
}

/* ── Individual Glassmorphic Logo Card (Uniform Square) ── */
function LogoTile({ logo, tileSize, onClick }) {
  const [hov, setHov] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(logo.image);

  useEffect(() => {
    if (logo.image) {
      getTransparentImageSrc(logo.image, (cleanUrl) => {
        setDisplaySrc(cleanUrl);
      });
    }
  }, [logo.image]);

  return (
    <div
      onClick={() => onClick(logo)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: tileSize,
        minWidth: tileSize,
        height: tileSize,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        borderRadius: 14,
        cursor: "pointer",
        background: hov 
          ? "rgba(255, 255, 255, 0.08)" 
          : "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: hov 
          ? "1px solid rgba(201, 162, 77, 0.5)" 
          : "1px solid rgba(255, 255, 255, 0.08)",
        transform: hov ? "scale(1.04)" : "scale(1)",
        transition: "all 0.35s cubic-bezier(0.25, 1, 0.2, 1)",
        boxShadow: hov
          ? "0 16px 36px rgba(0, 0, 0, 0.7), inset 0 0 15px rgba(201, 162, 77, 0.15)"
          : "0 4px 20px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        userSelect: "none"
      }}
    >
      {/* Background glow orb */}
      <div 
        style={{
          position: "absolute",
          width: "120%",
          height: "120%",
          background: hov 
            ? "radial-gradient(circle, rgba(201, 162, 77, 0.12) 0%, transparent 60%)" 
            : "radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 60%)",
          transition: "all 0.4s ease",
          pointerEvents: "none"
        }}
      />

      {/* Brand logo image */}
      <div 
        style={{
          width: "72%",
          height: "72%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: hov ? "scale(1.08)" : "scale(1)",
          transition: "transform 0.35s cubic-bezier(0.25, 1, 0.2, 1)",
          filter: hov 
            ? "drop-shadow(0 0 15px rgba(201, 162, 77, 0.35)) brightness(1.1)" 
            : "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) opacity(0.88)",
          mixBlendMode: "screen"
        }}
      >
        {!imgError ? (
          <img 
            src={displaySrc} 
            alt={logo.name} 
            crossOrigin="anonymous"
            onError={() => setImgError(true)}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              mixBlendMode: "screen"
            }}
          />
        ) : (
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: Math.max(12, Math.min(18, tileSize / 7)),
            letterSpacing: 2,
            color: hov ? "var(--gold)" : "var(--ivory)",
            textAlign: "center",
            textShadow: hov ? "0 0 10px rgba(201, 162, 77, 0.5)" : "none"
          }}>
            {logo.name.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main export: 2-Row Carousel Rotating in Opposite Directions ── */
export default function MosaicCarousel() {
  const { openShop, setSearchQuery } = useContext(AppContext);
  const sectionRef = useRef(null);
  const track1Ref = useRef(null);
  const track2Ref = useRef(null);
  
  const [auto, setAuto]     = useState(true);
  const [inView, setInView] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  
  // Drag states for Row 1
  const [drag1, setDrag1] = useState(false);
  const [sx1, setSx1]     = useState(0);
  const [sl1, setSl1]     = useState(0);

  // Drag states for Row 2
  const [drag2, setDrag2] = useState(false);
  const [sx2, setSx2]     = useState(0);
  const [sl2, setSl2]     = useState(0);

  const dist = useRef(0);
  const metrics = getMosaicMetrics(viewportWidth);

  // Split logos into 2 subsets for Top and Bottom rows
  const row1Base = LOGOS_LIST.filter((_, idx) => idx % 2 === 0);
  const row2Base = LOGOS_LIST.filter((_, idx) => idx % 2 !== 0);

  // Quadruple arrays for seamless infinite looping
  const row1Logos = [...row1Base, ...row1Base, ...row1Base, ...row1Base];
  const row2Logos = [...row2Base, ...row2Base, ...row2Base, ...row2Base];

  useEffect(() => {
    const el = sectionRef.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initial scroll position setup for Row 2 (starting in middle for reverse scroll)
  useEffect(() => {
    if (track2Ref.current) {
      track2Ref.current.scrollLeft = track2Ref.current.scrollWidth / 2;
    }
  }, []);

  // Animation Loop: Row 1 scrolls Left, Row 2 scrolls Right (Opposite Directions)
  useEffect(() => {
    let raf;
    const tick = () => {
      if (auto && inView) {
        // Row 1: Leftward scroll
        const el1 = track1Ref.current;
        if (el1 && !drag1) {
          el1.scrollLeft += 0.75;
          if (el1.scrollLeft >= el1.scrollWidth / 2) {
            el1.scrollLeft = 0;
          }
        }

        // Row 2: Rightward scroll (Opposite direction)
        const el2 = track2Ref.current;
        if (el2 && !drag2) {
          el2.scrollLeft -= 0.75;
          if (el2.scrollLeft <= 0) {
            el2.scrollLeft = el2.scrollWidth / 2;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto, drag1, drag2, inView]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pause = (ms = 3500) => {
    setAuto(false);
    clearTimeout(window.__vwmc_pause);
    window.__vwmc_pause = setTimeout(() => setAuto(true), ms);
  };

  // Drag handlers for Row 1
  const onMD1 = e => { dist.current = 0; setDrag1(true); setAuto(false); setSx1(e.pageX - track1Ref.current.offsetLeft); setSl1(track1Ref.current.scrollLeft); };
  const onMM1 = e => { if (!drag1) return; e.preventDefault(); const w = (e.pageX - track1Ref.current.offsetLeft - sx1) * 1.5; dist.current = Math.abs(w); track1Ref.current.scrollLeft = sl1 - w; };
  const onMU1 = () => { setDrag1(false); setTimeout(() => setAuto(true), 3500); };
  const onTS1 = e => { dist.current = 0; setDrag1(true); setAuto(false); setSx1(e.touches[0].pageX - track1Ref.current.offsetLeft); setSl1(track1Ref.current.scrollLeft); };
  const onTM1 = e => { const w = (e.touches[0].pageX - track1Ref.current.offsetLeft - sx1) * 1.5; dist.current = Math.abs(w); track1Ref.current.scrollLeft = sl1 - w; };

  // Drag handlers for Row 2
  const onMD2 = e => { dist.current = 0; setDrag2(true); setAuto(false); setSx2(e.pageX - track2Ref.current.offsetLeft); setSl2(track2Ref.current.scrollLeft); };
  const onMM2 = e => { if (!drag2) return; e.preventDefault(); const w = (e.pageX - track2Ref.current.offsetLeft - sx2) * 1.5; dist.current = Math.abs(w); track2Ref.current.scrollLeft = sl2 - w; };
  const onMU2 = () => { setDrag2(false); setTimeout(() => setAuto(true), 3500); };
  const onTS2 = e => { dist.current = 0; setDrag2(true); setAuto(false); setSx2(e.touches[0].pageX - track2Ref.current.offsetLeft); setSl2(track2Ref.current.scrollLeft); };
  const onTM2 = e => { const w = (e.touches[0].pageX - track2Ref.current.offsetLeft - sx2) * 1.5; dist.current = Math.abs(w); track2Ref.current.scrollLeft = sl2 - w; };

  const handleClick = (logo) => {
    if (dist.current > 8) return;
    setSearchQuery(logo.name);
    openShop();
  };

  const scrollBy = dir => { 
    pause(4000); 
    if (track1Ref.current) track1Ref.current.scrollBy({ left: dir * metrics.scrollAmount, behavior: "smooth" });
    if (track2Ref.current) track2Ref.current.scrollBy({ left: -dir * metrics.scrollAmount, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        .vwmc-track { scrollbar-width:none; -ms-overflow-style:none; }
        .vwmc-track::-webkit-scrollbar { display:none; }
        .vwmc-btn { all:unset; width:40px; height:40px; border:1px solid rgba(201,168,76,0.28); color:#c9a84c; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; transition:all 0.25s; background:rgba(9,9,9,0.92); backdrop-filter:blur(10px); }
        .vwmc-btn:hover { background:rgba(201,168,76,0.1); border-color:#c9a84c; transform:scale(1.1); }
        @media (max-width: 768px) {
          .vwmc-btn { width:40px; height:40px; font-size:18px; }
        }
        @media (max-width: 480px) {
          .vwmc-btn { width:40px; height:40px; font-size:16px; }
        }
      `}</style>

      <section ref={sectionRef} style={{ background: "#090909", paddingBottom: 8 }}>

        {/* Header row */}
        <div className="vw-mosaic-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "46px 36px 26px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 15% 50%,rgba(201,168,76,0.04),transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: 5, color: "#c9a24d", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 1, background: "#c9a24d" }} />SHOP BY BRAND<div style={{ width: 22, height: 1, background: "#c9a24d" }} />
            </div>
            <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "clamp(36px,5vw,62px)", letterSpacing: 7, color: "#f5f0e8", lineHeight: 1, margin: 0 }}>
              BRAND COLLABS
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: metrics.headerGap, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginRight: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9a24d", animation: "vwmc-blink 2.2s infinite" }} />
              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, letterSpacing: 3, color: "rgba(255, 255, 255, 0.63)" }}>{LOGOS_LIST.length} BRANDS</span>
            </div>
            <button className="vwmc-btn" onClick={() => scrollBy(-1)}>‹</button>
            <button className="vwmc-btn" onClick={() => scrollBy(1)}>›</button>
          </div>
        </div>

        {/* Dual Track Container with Edge Fades */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: metrics.gap }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: metrics.edgeFadeWidth, zIndex: 10, background: "linear-gradient(to right,#090909 15%,transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: metrics.edgeFadeWidth, zIndex: 10, background: "linear-gradient(to left,#090909 15%,transparent)", pointerEvents: "none" }} />

          {/* ROW 1: Top Row Auto-Scrolling Left ← */}
          <div
            ref={track1Ref}
            className="vwmc-track vw-mosaic-track"
            onMouseDown={onMD1} onMouseMove={onMM1} onMouseUp={onMU1} onMouseLeave={onMU1}
            onTouchStart={onTS1} onTouchMove={onTM1} onTouchEnd={onMU1}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: metrics.gap, 
              overflowX: "scroll", 
              padding: metrics.trackPadding, 
              cursor: drag1 ? "grabbing" : "grab" 
            }}
          >
            {row1Logos.map((logo, idx) => (
              <LogoTile key={`r1-${idx}-${logo.id}`} logo={logo} tileSize={metrics.tileSize} onClick={handleClick} />
            ))}
          </div>

          {/* ROW 2: Bottom Row Auto-Scrolling Right → (Opposite Direction) */}
          <div
            ref={track2Ref}
            className="vwmc-track vw-mosaic-track"
            onMouseDown={onMD2} onMouseMove={onMM2} onMouseUp={onMU2} onMouseLeave={onMU2}
            onTouchStart={onTS2} onTouchMove={onTM2} onTouchEnd={onMU2}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: metrics.gap, 
              overflowX: "scroll", 
              padding: metrics.trackPadding, 
              cursor: drag2 ? "grabbing" : "grab" 
            }}
          >
            {row2Logos.map((logo, idx) => (
              <LogoTile key={`r2-${idx}-${logo.id}`} logo={logo} tileSize={metrics.tileSize} onClick={handleClick} />
            ))}
          </div>

        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontFamily: "'Roboto', sans-serif", fontSize: 10, letterSpacing: 4, color: "rgba(255, 255, 255, 0.47)", paddingBottom: 32 }}>
          DRAG · CLICK · EXPLORE
        </div>
      </section>
    </>
  );
}
