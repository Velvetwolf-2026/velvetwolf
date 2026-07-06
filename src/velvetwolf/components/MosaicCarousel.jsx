// ─────────────────────────────────────────────
// VelvetWolf — <MosaicCarousel />
//
// Horizontally scrolling carousel with mosaic
// tile layout displaying brand logos with glassmorphism.
// ─────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback, useContext } from "react";
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
      gap: 5,
      panelGap: 12,
      rowHeight: 210,
      smallWidth: 94,
      tallWidth: 112,
      wideWidth: 164,
      rightColOne: 98,
      rightColTwo: 98,
      logoSmall: 20,
      logoTall: 32,
      logoWide: 40,
      logoClusterTop: 22,
      logoClusterBottom: 18,
      trackPadding: "4px 12px 10px",
      edgeFadeWidth: 28,
      scrollAmount: 220,
      navButtonSize: 30,
      navButtonFontSize: 16,
      headerGap: 8,
    };
  }

  if (viewportWidth <= 768) {
    return {
      gap: 6,
      panelGap: 16,
      rowHeight: 270,
      smallWidth: 122,
      tallWidth: 142,
      wideWidth: 224,
      rightColOne: 128,
      rightColTwo: 128,
      logoSmall: 26,
      logoTall: 40,
      logoWide: 50,
      logoClusterTop: 26,
      logoClusterBottom: 22,
      trackPadding: "4px 18px 12px",
      edgeFadeWidth: 46,
      scrollAmount: 300,
      navButtonSize: 34,
      navButtonFontSize: 18,
      headerGap: 9,
    };
  }

  return {
    gap: 8,
    panelGap: 24,
    rowHeight: 390,
    smallWidth: 178,
    tallWidth: 200,
    wideWidth: 340,
    rightColOne: 182,
    rightColTwo: 182,
    logoSmall: 36,
    logoTall: 60,
    logoWide: 80,
    logoClusterTop: 38,
    logoClusterBottom: 30,
    trackPadding: "4px 36px 16px",
    edgeFadeWidth: 90,
    scrollAmount: 500,
    navButtonSize: 40,
    navButtonFontSize: 20,
    headerGap: 10,
  };
};

/* ── Individual Glassmorphic Logo Card ── */
function LogoTile({ logo, w, h, onClick }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={() => onClick(logo)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: w,
        minWidth: w,
        height: h,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        borderRadius: 14,
        cursor: "pointer",
        // Glassmorphism effect
        background: hov 
          ? "rgba(255, 255, 255, 0.08)" 
          : "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: hov 
          ? "1px solid rgba(201, 162, 77, 0.5)" 
          : "1px solid rgba(255, 255, 255, 0.08)",
        transform: hov ? "scale(1.03)" : "scale(1)",
        transition: "all 0.4s cubic-bezier(0.25, 1, 0.2, 1)",
        boxShadow: hov
          ? "0 20px 40px rgba(0, 0, 0, 0.7), inset 0 0 15px rgba(201, 162, 77, 0.15)"
          : "0 4px 20px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
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
            ? "radial-gradient(circle, rgba(201, 162, 77, 0.1) 0%, transparent 60%)" 
            : "radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 60%)",
          transition: "all 0.5s ease",
          pointerEvents: "none"
        }}
      />

      {/* Brand logo image */}
      <div 
        style={{
          width: "55%",
          height: "55%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: hov ? "scale(1.1)" : "scale(1)",
          transition: "transform 0.4s cubic-bezier(0.25, 1, 0.2, 1)",
          filter: hov 
            ? "drop-shadow(0 0 15px rgba(201, 162, 77, 0.35)) brightness(1.1)" 
            : "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) opacity(0.85)"
        }}
      >
        <img 
          src={logo.image} 
          alt={logo.name} 
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain"
          }}
        />
      </div>

      {/* Title overlay */}
      <div 
        style={{
          position: "absolute",
          bottom: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          letterSpacing: 2,
          color: hov ? "#c9a24d" : "rgba(255, 255, 255, 0.5)",
          opacity: hov ? 1 : 0.6,
          transition: "all 0.3s ease",
          textAlign: "center"
        }}
      >
        {logo.name.toUpperCase()}
      </div>
    </div>
  );
}

/* ── One repeating mosaic panel ── */
function MosaicPanel({ cats, onClick, metrics }) {
  // LEFT ZONE
  const GAP = metrics.gap;
  const ROW_H = metrics.rowHeight;
  const smW   = metrics.smallWidth;
  const smH   = (ROW_H - GAP * 2) / 3;
  const tallW = metrics.tallWidth;

  // RIGHT ZONE
  const wideW   = metrics.wideWidth;
  const rc1W    = metrics.rightColOne;
  const rc2W    = metrics.rightColTwo;
  const rcTopH  = ROW_H / 2 - GAP / 2;
  const rcBotH  = (ROW_H - GAP * 3) / 3 * 1.35;

  return (
    <div style={{ display:"flex", gap:GAP, flexShrink:0, height:ROW_H, alignItems:"flex-start" }}>

      {/* Col A — 3 stacked smalls */}
      <div style={{ display:"flex", flexDirection:"column", gap:GAP, flexShrink:0 }}>
        <LogoTile logo={cats[0]} w={smW} h={smH} onClick={onClick} />
        <LogoTile logo={cats[1]} w={smW} h={smH} onClick={onClick} />
        <LogoTile logo={cats[2]} w={smW} h={smH} onClick={onClick} />
      </div>

      {/* Col B — tall */}
      <LogoTile logo={cats[3]} w={tallW} h={ROW_H} onClick={onClick} />

      {/* Spacer */}
      <div style={{ width: GAP * 2, flexShrink:0 }}/>

      {/* Col C — dominant wide */}
      <LogoTile logo={cats[4]} w={wideW} h={ROW_H} onClick={onClick} />

      {/* Col D+E — 2×2 top / 3 bottom cluster */}
      <div style={{ display:"flex", flexDirection:"column", gap:GAP, flexShrink:0 }}>
        <div style={{ display:"flex", gap:GAP }}>
          <LogoTile logo={cats[0]} w={rc1W} h={rcTopH} onClick={onClick} />
          <LogoTile logo={cats[2]} w={rc2W} h={rcTopH} onClick={onClick} />
        </div>
        <div style={{ display:"flex", gap:GAP }}>
          <LogoTile logo={cats[1]} w={rc1W - Math.max(14, GAP * 2)} h={rcBotH} onClick={onClick} />
          <LogoTile logo={cats[3]} w={rc2W} h={rcBotH} onClick={onClick} />
          <LogoTile logo={cats[4]} w={rc1W - Math.max(8, GAP)} h={rcBotH} onClick={onClick} />
        </div>
      </div>

    </div>
  );
}

/* ── Main export ── */
export default function MosaicCarousel() {
  const { openShop, setSearchQuery } = useContext(AppContext);
  const trackRef = useRef(null);
  const [drag, setDrag]     = useState(false);
  const [sx, setSx]         = useState(0);
  const [sl, setSl]         = useState(0);
  const [showL, setShowL]   = useState(false);
  const [auto, setAuto]     = useState(true);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  const dist = useRef(0);
  const metrics = getMosaicMetrics(viewportWidth);

  // Group LOGOS_LIST into repeating panels of 5 items
  const numPanels = Math.ceil(LOGOS_LIST.length / 5);
  const panels = Array.from({ length: numPanels }, (_, i) => {
    return Array.from({ length: 5 }, (_, j) => {
      const idx = (i * 5 + j) % LOGOS_LIST.length;
      return LOGOS_LIST[idx];
    });
  });
  const allPanels = [...panels, ...panels]; // doubled for infinite loops

  const fade = useCallback(() => {
    const el = trackRef.current; if (!el) return;
    const nextShowL = el.scrollLeft > 20;
    setShowL(prev => prev === nextShowL ? prev : nextShowL);
  }, []);

  useEffect(() => {
    const el = trackRef.current; if (!el) return;
    let raf;
    const tick = () => {
      if (auto && !drag) {
        el.scrollLeft += 0.65;
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft = 0;
        fade();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto, drag, fade]);

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

  const onMD = e => { dist.current=0; setDrag(true); setAuto(false); setSx(e.pageX-trackRef.current.offsetLeft); setSl(trackRef.current.scrollLeft); };
  const onMM = e => { if(!drag) return; e.preventDefault(); const w=(e.pageX-trackRef.current.offsetLeft-sx)*1.5; dist.current=Math.abs(w); trackRef.current.scrollLeft=sl-w; fade(); };
  const onMU = () => { setDrag(false); setTimeout(()=>setAuto(true),3500); };
  const onTS = e => { dist.current=0; setDrag(true); setAuto(false); setSx(e.touches[0].pageX-trackRef.current.offsetLeft); setSl(trackRef.current.scrollLeft); };
  const onTM = e => { const w=(e.touches[0].pageX-trackRef.current.offsetLeft-sx)*1.5; dist.current=Math.abs(w); trackRef.current.scrollLeft=sl-w; };
  const onTE = () => { setDrag(false); setTimeout(()=>setAuto(true),3500); };

  const handleClick = (logo) => {
    if (dist.current > 8) return;
    // Set query based on logo name and navigate to filtered shop page
    setSearchQuery(logo.name);
    openShop();
  };

  const scrollBy = dir => { pause(4000); trackRef.current.scrollBy({ left: dir * metrics.scrollAmount, behavior:"smooth" }); };

  return (
    <>
      <style>{`
        .vwmc-track { scrollbar-width:none; -ms-overflow-style:none; }
        .vwmc-track::-webkit-scrollbar { display:none; }
        .vwmc-btn { all:unset; width:40px; height:40px; border:1px solid rgba(201,168,76,0.28); color:#c9a84c; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; transition:all 0.25s; background:rgba(9,9,9,0.92); backdrop-filter:blur(10px); }
        .vwmc-btn:hover { background:rgba(201,168,76,0.1); border-color:#c9a84c; transform:scale(1.1); }
        @media (max-width: 768px) {
          .vwmc-btn { width:34px; height:34px; font-size:18px; }
        }
        @media (max-width: 480px) {
          .vwmc-btn { width:30px; height:30px; font-size:16px; }
        }
      `}</style>

      <section style={{ background:"#090909", paddingBottom: 8 }}>

        {/* Header row */}
        <div className="vw-mosaic-header" style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:"46px 36px 26px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 15% 50%,rgba(201,168,76,0.04),transparent 60%)",pointerEvents:"none" }}/>
          <div style={{ position:"relative" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:5, color:"#c9a24d", marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:22, height:1, background:"#c9a24d" }}/>SHOP BY BRAND<div style={{ width:22, height:1, background:"#c9a24d" }}/>
            </div>
            <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"clamp(36px,5vw,62px)", letterSpacing:7, color:"#f5f0e8", lineHeight:1, margin:0 }}>
              BRAND COLLABS
            </h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:metrics.headerGap, position:"relative" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginRight:6 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#c9a24d", animation:"vwmc-blink 2.2s infinite" }}/>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize:11, letterSpacing:3, color:"rgba(255, 255, 255, 0.63)" }}>{LOGOS_LIST.length} BRANDS</span>
            </div>
            <button className="vwmc-btn" onClick={() => scrollBy(-1)}>‹</button>
            <button className="vwmc-btn" onClick={() => scrollBy(1)}>›</button>
          </div>
        </div>

        {/* Track with edge fades */}
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute",left:0,top:0,bottom:0,width:metrics.edgeFadeWidth,zIndex:10,background:"linear-gradient(to right,#090909 15%,transparent)",pointerEvents:"none",opacity:showL?1:0,transition:"opacity 0.3s" }}/>
          <div style={{ position:"absolute",right:0,top:0,bottom:0,width:metrics.edgeFadeWidth,zIndex:10,background:"linear-gradient(to left,#090909 15%,transparent)",pointerEvents:"none" }}/>

          <div
            ref={trackRef}
            className="vwmc-track vw-mosaic-track"
            onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
            onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
            onScroll={fade}
            style={{ display:"flex", alignItems:"flex-start", gap:metrics.panelGap, overflowX:"scroll", padding:metrics.trackPadding, cursor:drag?"grabbing":"grab" }}
          >
            {allPanels.map((cats, i) => (
              <MosaicPanel key={i} cats={cats} onClick={handleClick} metrics={metrics}/>
            ))}
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:10, fontFamily:"'Roboto', sans-serif", fontSize:10, letterSpacing:4, color:"rgba(255, 255, 255, 0.47)", paddingBottom:32 }}>
          DRAG · CLICK · EXPLORE
        </div>
      </section>
    </>
  );
}
