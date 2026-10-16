// Owns the one fixed WebGL canvas behind the gallery pages (home, shop).
// Mounted once in PublicLayout so moving between home and shop is a camera
// walk through the same hall rather than a reload of the scene. The engine is
// framework-free (./three/engine.js); pages drive it through useGallery().
import { useEffect, useRef, useState } from "react";
import { GalleryContext } from "./galleryContext";
import "./gallery.css";
import "./gallery-pages.css";

// Silhouette shown while the 3D hall loads (and instead of it without WebGL).
// Same outline as the 3D tee, from garment.outlineSvgPath(), pre-rendered here so
// the server HTML doesn't need three.js.
function PosterTee({ path }) {
  return (
    <svg className="vwg-poster-tee" viewBox="0 0 290 212" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

const FONT_FACES = ["200 40px Unbounded", "300 40px Unbounded", "400 40px Unbounded", "500 40px Unbounded", "600 20px Manrope", "700 20px Manrope"];

// poster: the tee silhouette shown while the hall loads (not on the help pages, whose objects
// aren't tees)
export function GalleryProvider({ active, poster = true, children }) {
  const canvasRef = useRef(null);
  const [engine, setEngine] = useState(null);
  // off: not a gallery page | loading | ready | none (no WebGL, static gallery)
  const [status, setStatus] = useState(active ? "loading" : "off");
  const [posterPath, setPosterPath] = useState("");

  useEffect(() => {
    if (!active) {
      setStatus("off");
      return undefined;
    }
    let disposed = false;
    let created = null;
    setStatus("loading");

    (async () => {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const [{ createEngine }, { loadTeeKit }, { outlineSvgPath }] = await Promise.all([
        import("./three/engine.js"),
        import("./three/teeGlb.js"),
        import("./three/garment.js"),
      ]);
      if (disposed) return;
      setPosterPath(outlineSvgPath());

      if (!hasWebGL()) { setStatus("none"); return; }
      // If the tee GLB fails to load or parse, the procedural tee stands in.
      let kit = null;
      try { kit = await loadTeeKit(); } catch (e) { console.warn("[gallery] tee GLB unavailable; using the procedural tee", e); }
      if (disposed || !canvasRef.current) return;

      try {
        created = createEngine(canvasRef.current, { reducedMotion: reduced, kit });
      } catch (e) {
        console.warn("[gallery] 3D unavailable, showing the static gallery", e);
        created = null;
      }
      if (!created) { setStatus("none"); return; }
      created.onReady(() => { if (!disposed) setStatus("ready"); });
      setEngine(created);
      if (import.meta.env.DEV) window.__vwEngine = created; // for debugging in dev only

      // Canvas lettering and prints need the web fonts; redraw once they land.
      Promise.all(FONT_FACES.map((f) => document.fonts?.load(f).catch(() => null)))
        .then(() => { if (!disposed) created?.redrawText(); });
    })().catch((e) => {
      console.warn("[gallery] failed to start", e);
      if (!disposed) setStatus("none");
    });

    return () => {
      disposed = true;
      created?.dispose();
      setEngine(null);
    };
  }, [active]);

  return (
    <GalleryContext.Provider value={{ engine, status }}>
      {active && (
        <div className={`vwg-stage vwg-${status}`} aria-hidden="true">
          <canvas ref={canvasRef} className="vwg-gl" />
          <div className="vwg-poster">{poster && posterPath && <PosterTee path={posterPath} />}</div>
        </div>
      )}
      {children}
    </GalleryContext.Provider>
  );
}
