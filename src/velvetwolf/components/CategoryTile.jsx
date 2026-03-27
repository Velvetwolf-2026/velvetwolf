// ─────────────────────────────────────────────
// VelvetWolf — <CategoryTile />
//
// A single category card used inside carousels.
//
// Props:
//   cat       (object)  — category object from constants.js
//   w         (number)  — tile width in px
//   h         (number)  — tile height in px
//   logoSize  (number)  — SVG logo size (default: 52)
//   onClick   (fn)      — called with cat object on click
//   activeId  (string)  — currently active category id (for highlight ring)
// ─────────────────────────────────────────────
import { useState } from "react";
import { LOGO_MAP } from "./CategoryLogos";

export default function CategoryTile({ cat, w, h, logoSize = 52, onClick, activeId }) {
  const [hov, setHov] = useState(false);
  const Logo  = LOGO_MAP[cat.id];
  const lit   = hov || activeId === cat.id;

  return (
    <div
      onClick={() => onClick(cat)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: w, minWidth: w, height: h,
        flexShrink: 0, position: "relative", overflow: "hidden",
        borderRadius: 12, cursor: "pointer",
        background: `linear-gradient(148deg,${cat.bg[0]},${cat.bg[1]},${cat.bg[2]})`,
        border: `1px solid ${lit ? cat.accent + "66" : "rgba(255,255,255,0.06)"}`,
        transform: hov ? "scale(1.03)" : "scale(1)",
        transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.38s",
        boxShadow: hov
          ? `0 24px 64px rgba(0,0,0,0.8), 0 0 42px ${cat.glow}28`
          : "0 2px 14px rgba(0,0,0,0.55)",
        userSelect: "none",
        zIndex: hov ? 5 : 1,
      }}
    >
      {/* Mesh glow */}
      <div style={{ position:"absolute",inset:0,background:cat.mesh,opacity:lit?.24:.07,transition:"opacity 0.4s",pointerEvents:"none" }}/>

      {/* Film grain */}
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",opacity:.45,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`
      }}/>

      {/* Glow orb */}
      <div style={{ position:"absolute",width:"140%",height:"140%",
        top:hov?"-20%":"20%",left:hov?"-20%":"10%",
        background:`radial-gradient(circle,${cat.glow}12 0%,transparent 58%)`,
        transition:"all 0.5s ease",pointerEvents:"none"
      }}/>

      {/* Corner border lines */}
      <div style={{ position:"absolute",top:0,left:0,width:hov?"50%":"0%",height:"2px",background:`linear-gradient(to right,${cat.accent},transparent)`,transition:"width 0.48s cubic-bezier(0.34,1.56,0.64,1)" }}/>
      <div style={{ position:"absolute",top:0,left:0,width:"2px",height:hov?"35%":"0%",background:`linear-gradient(to bottom,${cat.accent},transparent)`,transition:"height 0.48s cubic-bezier(0.34,1.56,0.64,1)" }}/>
      <div style={{ position:"absolute",bottom:0,right:0,width:hov?"50%":"0%",height:"2px",background:`linear-gradient(to left,${cat.accent},transparent)`,transition:"width 0.48s cubic-bezier(0.34,1.56,0.64,1)" }}/>
      <div style={{ position:"absolute",bottom:0,right:0,width:"2px",height:hov?"35%":"0%",background:`linear-gradient(to top,${cat.accent},transparent)`,transition:"height 0.48s cubic-bezier(0.34,1.56,0.64,1)" }}/>

      {/* Logo centered */}
      <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{
          transform: hov ? "scale(1.2)" : "scale(1)",
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          filter: hov
            ? `drop-shadow(0 0 20px ${cat.glow}ee) drop-shadow(0 0 8px ${cat.glow}88)`
            : `drop-shadow(0 0 7px ${cat.glow}44)`,
        }}>
          {Logo && <Logo size={logoSize} color={hov ? cat.accent : "rgba(255,255,255,0.6)"}/>}
        </div>
      </div>

      {/* Bottom vignette + name on hover */}
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"44%",background:`linear-gradient(transparent,${cat.bg[0]}cc)`,pointerEvents:"none" }}/>
      <div style={{
        position:"absolute",bottom:0,left:0,right:0,textAlign:"center",
        paddingBottom: logoSize > 56 ? 18 : 10,
        opacity:hov?1:0, transform:hov?"translateY(0)":"translateY(6px)",
        transition:"all 0.28s ease",
      }}>
        <span style={{
          fontFamily:"'Bebas Neue',cursive",
          fontSize: logoSize > 56 ? 12 : logoSize > 40 ? 10 : 8,
          letterSpacing:5, color:cat.accent, opacity:.9,
        }}>
          {cat.name.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
