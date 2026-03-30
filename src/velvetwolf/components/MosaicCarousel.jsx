// ─────────────────────────────────────────────
// VelvetWolf — <MosaicCarousel />
//
// Horizontally scrolling carousel with mosaic
// tile layout matching the reference image.
// Auto-scrolls, drag to scroll, clickable tiles.
//
// Props:
//   onCategoryClick (fn) — called with category object on tile click
//
// Usage:
//   import MosaicCarousel from "./components/MosaicCarousel";
//   <MosaicCarousel onCategoryClick={(cat) => console.log(cat)} />
// ─────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from "react";
import CategoryTile from "./CategoryTile";
import { CATEGORIES, THEME } from "../utils/constants";

const { gold, goldLight, muted, border } = THEME;
const GAP     = 8;   // gap between tiles within a panel
const PANEL_G = 24;  // gap between mosaic panels
const ROW_H   = 390; // total carousel height

/* ── One repeating mosaic panel ── */
function MosaicPanel({ cats, onClick, activeId }) {
  // LEFT ZONE
  const smW   = 178;
  const smH   = (ROW_H - GAP * 2) / 3;
  const tallW = 200;

  // RIGHT ZONE
  const wideW   = 340;
  const rc1W    = 182;
  const rc2W    = 182;
  const rcTopH  = ROW_H / 2 - GAP / 2;
  const rcBotH  = (ROW_H - GAP * 3) / 3 * 1.35;

  return (
    <div style={{ display:"flex", gap:GAP, flexShrink:0, height:ROW_H, alignItems:"flex-start" }}>

      {/* Col A — 3 stacked smalls */}
      <div style={{ display:"flex", flexDirection:"column", gap:GAP, flexShrink:0 }}>
        <CategoryTile cat={cats[0]} w={smW}   h={smH}   logoSize={36} onClick={onClick} activeId={activeId}/>
        <CategoryTile cat={cats[1]} w={smW}   h={smH}   logoSize={36} onClick={onClick} activeId={activeId}/>
        <CategoryTile cat={cats[2]} w={smW}   h={smH}   logoSize={36} onClick={onClick} activeId={activeId}/>
      </div>

      {/* Col B — tall */}
      <CategoryTile cat={cats[3]} w={tallW} h={ROW_H} logoSize={60} onClick={onClick} activeId={activeId}/>

      {/* Spacer */}
      <div style={{ width: GAP * 2, flexShrink:0 }}/>

      {/* Col C — dominant wide */}
      <CategoryTile cat={cats[4]} w={wideW} h={ROW_H} logoSize={80} onClick={onClick} activeId={activeId}/>

      {/* Col D+E — 2×2 top / 3 bottom cluster */}
      <div style={{ display:"flex", flexDirection:"column", gap:GAP, flexShrink:0 }}>
        <div style={{ display:"flex", gap:GAP }}>
          <CategoryTile cat={cats[0]} w={rc1W}      h={rcTopH} logoSize={38} onClick={onClick} activeId={activeId}/>
          <CategoryTile cat={cats[2]} w={rc2W}      h={rcTopH} logoSize={38} onClick={onClick} activeId={activeId}/>
        </div>
        <div style={{ display:"flex", gap:GAP }}>
          <CategoryTile cat={cats[1]} w={rc1W - 22} h={rcBotH} logoSize={30} onClick={onClick} activeId={activeId}/>
          <CategoryTile cat={cats[3]} w={rc2W}      h={rcBotH} logoSize={30} onClick={onClick} activeId={activeId}/>
          <CategoryTile cat={cats[4]} w={rc1W - 10} h={rcBotH} logoSize={30} onClick={onClick} activeId={activeId}/>
        </div>
      </div>

    </div>
  );
}

/* ── Active category banner ── */
function ActiveBanner({ cat, onClose, onShopNow }) {
  if (!cat) return null;
  return (
    <div style={{
      margin: "4px 36px 0",
      padding: "14px 22px",
      borderRadius: 4,
      animation: "vwmc-fadein 0.3s ease",
      background: `linear-gradient(135deg,${cat.bg[1]},${cat.bg[0]})`,
      borderTop: `2px solid ${cat.accent}`,
      border: `1px solid ${cat.accent}33`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ fontSize:26, filter:`drop-shadow(0 0 10px ${cat.glow}aa)` }}>
          {/* Logo inline */}
          {(() => {
            const { LOGO_MAP } = require("./CategoryLogos");
            const L = LOGO_MAP[cat.id];
            return L ? <L size={26} color={cat.accent}/> : null;
          })()}
        </div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:4, color:cat.accent }}>{cat.name}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:3, color:"rgba(255,255,255,0.28)", marginTop:1 }}>
            EXPLORE {cat.name.toUpperCase()} COLLECTION →
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button
          onClick={() => onShopNow && onShopNow(cat)}
          style={{ all:"unset", border:`1px solid ${cat.accent}55`, color:cat.accent, fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:3, padding:"7px 18px", cursor:"pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = cat.accent + "18"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >SHOP NOW</button>
        <button onClick={onClose} style={{ all:"unset", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.22)", fontFamily:"'Space Mono',monospace", fontSize:7, padding:"7px 12px", cursor:"pointer" }}>✕</button>
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function MosaicCarousel({ onCategoryClick }) {
  const trackRef = useRef(null);
  const [drag, setDrag]     = useState(false);
  const [sx, setSx]         = useState(0);
  const [sl, setSl]         = useState(0);
  const [active, setActive] = useState(null);
  const [showL, setShowL]   = useState(false);
  const [auto, setAuto]     = useState(true);
  const dist = useRef(0);

  // Build panels: 5 panels × rotate cats, doubled for loop
  const panels = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => CATEGORIES[(i + j) % 5])
  );
  const allPanels = [...panels, ...panels];

  const fade = useCallback(() => {
    const el = trackRef.current; if (!el) return;
    setShowL(el.scrollLeft > 20);
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

  const handleClick = cat => {
    if (dist.current > 8) return;
    const next = active?.id === cat.id ? null : cat;
    setActive(next);
    if (next && onCategoryClick) onCategoryClick(next);
  };

  const scrollBy = dir => { pause(4000); trackRef.current.scrollBy({ left: dir * 500, behavior:"smooth" }); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap');
        .vwmc-track { scrollbar-width:none; -ms-overflow-style:none; }
        .vwmc-track::-webkit-scrollbar { display:none; }
        .vwmc-btn { all:unset; width:40px; height:40px; border:1px solid rgba(201,168,76,0.28); color:#c9a84c; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; transition:all 0.25s; background:rgba(9,9,9,0.92); backdrop-filter:blur(10px); }
        .vwmc-btn:hover { background:rgba(201,168,76,0.1); border-color:#c9a84c; transform:scale(1.1); }
        @keyframes vwmc-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes vwmc-blink  { 0%,100%{opacity:1} 50%{opacity:.25} }
      `}</style>

      <section style={{ background:"#090909", paddingBottom: 8 }}>

        {/* Header row */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:"46px 36px 26px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 15% 50%,rgba(201,168,76,0.04),transparent 60%)",pointerEvents:"none" }}/>
          <div style={{ position:"relative" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:5, color:gold, marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:22, height:1, background:gold }}/>SHOP BY VIBE<div style={{ width:22, height:1, background:gold }}/>
            </div>
            <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"clamp(36px,5vw,62px)", letterSpacing:7, color:"#f5f0e8", lineHeight:1, margin:0 }}>
              YOUR CULTURE
            </h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginRight:6 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:gold, animation:"vwmc-blink 2.2s infinite" }}/>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize:11, letterSpacing:3, color:"rgba(255, 255, 255, 0.63)" }}>5 CATEGORIES</span>
            </div>
            <button className="vwmc-btn" onClick={() => scrollBy(-1)}>‹</button>
            <button className="vwmc-btn" onClick={() => scrollBy(1)}>›</button>
          </div>
        </div>

        {/* Track with edge fades */}
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute",left:0,top:0,bottom:0,width:90,zIndex:10,background:"linear-gradient(to right,#090909 15%,transparent)",pointerEvents:"none",opacity:showL?1:0,transition:"opacity 0.3s" }}/>
          <div style={{ position:"absolute",right:0,top:0,bottom:0,width:90,zIndex:10,background:"linear-gradient(to left,#090909 15%,transparent)",pointerEvents:"none" }}/>

          <div
            ref={trackRef}
            className="vwmc-track"
            onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
            onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
            onScroll={fade}
            style={{ display:"flex", alignItems:"flex-start", gap:PANEL_G, overflowX:"scroll", padding:`4px 36px 16px`, cursor:drag?"grabbing":"grab" }}
          >
            {allPanels.map((cats, i) => (
              <MosaicPanel key={i} cats={cats} onClick={handleClick} activeId={active?.id}/>
            ))}
          </div>
        </div>

        {/* Active banner */}
        <ActiveBanner
          cat={active}
          onClose={() => setActive(null)}
          onShopNow={(cat) => onCategoryClick && onCategoryClick(cat)}
        />

        {/* Dot nav */}
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:7, marginTop:18, paddingBottom:4 }}>
          {CATEGORIES.map(cat => (
            <div key={cat.id} title={cat.name}
              onClick={() => setActive(active?.id === cat.id ? null : cat)}
              style={{ width:active?.id===cat.id?26:5, height:3, borderRadius:2, background:active?.id===cat.id?cat.accent:"rgba(255,255,255,0.12)", cursor:"pointer", transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
            />
          ))}
        </div>

        <div style={{ textAlign:"center", marginTop:10, fontFamily:"'Roboto', sans-serif", fontSize:10, letterSpacing:4, color:"rgba(255, 255, 255, 0.47)", paddingBottom:32 }}>
          DRAG · CLICK · EXPLORE
        </div>
      </section>
    </>
  );
}
