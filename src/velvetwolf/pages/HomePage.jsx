// Home: the VelvetWolf Gallery. Five sticky "rooms"; the scroll position maps to
// a camera station in the shared 3D hall (GalleryProvider). The Quiet Hours room
// shows the newest drops from the catalogue, pinned into the pools of light.
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { AppContext } from "./AppContext";
import { loadProductsFromAPI } from "../utils/products";
import { useGallery } from "../gallery/galleryContext";
import { COLORWAYS, COLOR_ORDER } from "../gallery/data";
import { money, photoFor, colorwaysOf, productHref, newestDrops, fromPrice } from "../gallery/galleryProducts";

// Server-rendered on first load so the catalog is present in the HTML for
// crawlers and link previews, not just after the client fetches it.
export async function loader() {
  try {
    const products = await loadProductsFromAPI();
    return { products };
  } catch {
    return { products: [] };
  }
}

export function meta() {
  const title = "VelvetWolf — Statements in silence";
  const description = "Heavyweight oversized tees in five colours, shown in the VelvetWolf gallery. See the newest drops from Quiet Hours.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@200;300;400;500&display=swap" },
  ];
}

const ORDER = ["hero", "drop", "color", "craft", "teaser"];
const DROP_COUNT = 3; // one per pool of light in the Quiet Hours room
const reducedMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function HomePage() {
  const { products: ctxProducts } = useContext(AppContext);
  const loaderData = useLoaderData();
  const products = useMemo(
    () => (ctxProducts.length > 0 ? ctxProducts : loaderData?.products || []),
    [ctxProducts, loaderData]
  );
  const drops = useMemo(() => newestDrops(products, DROP_COUNT), [products]);
  const lowest = useMemo(() => fromPrice(products), [products]);
  const navigate = useNavigate();
  const { engine, status } = useGallery();
  const glReady = status === "ready";

  const sceneRefs = useRef([]);
  const dropStickyRef = useRef(null);
  const dropListRef = useRef(null);
  const dropCardRefs = useRef([]);
  const geometry = useRef({ tops: [], heights: [] });
  const [activeColor, setActiveColor] = useState(0);
  const [teaserText, setTeaserText] = useState("Say less.");
  const teaserPrint = useRef(null);

  // Camera station for this page.
  useEffect(() => {
    engine?.setView("home");
  }, [engine]);

  // Measure the rooms (re-measure on resize/load: their heights are in vh).
  useEffect(() => {
    const measure = () => {
      const scenes = sceneRefs.current.filter(Boolean);
      geometry.current = { tops: scenes.map((s) => s.offsetTop), heights: scenes.map((s) => s.offsetHeight) };
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    const t = setTimeout(measure, 300);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      clearTimeout(t);
    };
  }, []);

  // Per frame: scroll position -> camera station, colorway scrub, and the drop
  // cards pinned into the three pools of light.
  useEffect(() => {
    let raf = 0;
    let lastActive = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const { tops, heights } = geometry.current;
      if (!tops.length) return;
      const y = window.scrollY, vh = window.innerHeight;
      let s = 0, colorT = 0;
      for (let i = 0; i < tops.length; i++) {
        const local = y - tops[i];
        const dwell = Math.max(1, heights[i] - vh);
        if (local < 0) break;
        s = i + Math.min(1, Math.max(0, (local - dwell) / vh));
        if (ORDER[i] === "color") colorT = local > dwell ? 1 : Math.min(1, Math.max(0, local / (dwell * 0.86)));
      }
      s = Math.min(s, ORDER.length - 1);
      engine?.setHomeProgress(s, colorT);

      const active = Math.round(colorT * (COLOR_ORDER.length - 1));
      if (active !== lastActive) { lastActive = active; setActiveColor(active); }

      // Pin each product photo where a tee would float (reads before writes).
      const list = dropListRef.current, host = dropStickyRef.current;
      if (engine && list && host && Math.abs(s - 1) < 1.05) {
        const frames = engine.dropFrames();
        const box = host.getBoundingClientRect();
        const cards = dropCardRefs.current.filter(Boolean);
        cards.forEach((el, i) => {
          const f = frames[i];
          if (!f) return;
          const [cx, top, bottom] = f;
          const w = Math.max(84, Math.min(320, (bottom - top) * 0.8)); // 4:5 photo, as tall as the tee
          const edge = 12;
          const x = Math.min(Math.max(cx - box.left, w / 2 + edge), box.width - w / 2 - edge);
          el.style.width = `${w.toFixed(1)}px`;
          el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(top - box.top).toFixed(1)}px)`;
        });
        list.classList.toggle("is-near", Math.abs(s - 1) < 0.5);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  // Teaser: whatever you type prints on the tee in the last room.
  useEffect(() => {
    if (!engine) return undefined;
    let cancelled = false;
    import("../gallery/three/prints.js").then(({ createCustomPrint, drawCustom }) => {
      if (cancelled) return;
      if (!teaserPrint.current) teaserPrint.current = { print: createCustomPrint("front"), drawCustom };
      const draw = () => {
        const { print, drawCustom: dc } = teaserPrint.current;
        dc(print, { mode: "text", text: teaserText || " ", font: "display", scale: 0.95, offset: 0.05 });
        engine.dressTeaser(print.texture, "noir");
      };
      draw();
      document.fonts?.ready.then(() => { if (!cancelled) draw(); });
    });
    return () => { cancelled = true; };
  }, [engine, teaserText]);

  const scrollToColor = (i) => {
    const idx = ORDER.indexOf("color");
    const { tops, heights } = geometry.current;
    if (!tops.length) return;
    const dwell = heights[idx] - window.innerHeight;
    const t = i / (COLOR_ORDER.length - 1);
    window.scrollTo({ top: tops[idx] + t * dwell * 0.86 + 2, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const openDesigner = (e) => {
    e.preventDefault();
    const line = teaserText.trim();
    navigate(line ? `/custom?text=${encodeURIComponent(line)}` : "/custom");
  };

  const setScene = (i) => (el) => { sceneRefs.current[i] = el; };

  return (
    <main className={`vwg vwg-home${glReady ? " is-gl" : ""}`}>
      {/* ---- hero ---- */}
      <section className="scene scene-hero" ref={setScene(0)} aria-labelledby="hero-h">
        <div className="sticky">
          <div className="copy copy-hero">
            <p className="eyebrow">Drop 01 &middot; Quiet Hours</p>
            <h1 className="display" id="hero-h">Statements <span className="quiet">in silence.</span></h1>
            <p className="lede">Heavyweight oversized tees in five colors. Combed cotton at 220&ndash;240&nbsp;GSM, cut and sewn in Tirupur.</p>
            <div className="actions">
              <Link className="btn btn-primary" to="/shop">Enter the shop</Link>
              <Link className="btn" to="/custom">Upload your design</Link>
            </div>
          </div>
          <figure className="placard placard-hero">
            <figcaption>
              <Link className="placard-link" to="/shop">
                <span className="pl-title">The Oversized Tee</span>
                <span>Velvetwolf, 2027</span>
                <span>Combed cotton, in five colours</span>
                {lowest && <span className="pl-price">From {money(lowest)}</span>}
              </Link>
            </figcaption>
          </figure>
          <p className="scroll-cue" aria-hidden="true"><span />Scroll to walk the gallery</p>
        </div>
      </section>

      {/* ---- Quiet Hours: the newest drops ---- */}
      <section className="scene scene-drop" ref={setScene(1)} aria-labelledby="drop-h">
        <div className="sticky" ref={dropStickyRef}>
          <div className="copy copy-top">
            <p className="eyebrow">New drops</p>
            <h2 className="h2" id="drop-h">Quiet Hours</h2>
            <p>The newest tees in the store, fresh off the press. Each one is lit in plain white light, so the colour on screen stays close to the cloth.</p>
          </div>
          <Link className="text-link drop-all" to="/shop">See all {products.length > 0 ? `${products.length} tees` : "tees"}</Link>
          {drops.length > 0 ? (
            <ol className="drop-cards" ref={dropListRef}>
              {drops.map((p, i) => {
                const color = colorwaysOf(p)[0];
                const photo = photoFor(p, color);
                return (
                  <li key={p.id} className="drop-card" ref={(el) => { dropCardRefs.current[i] = el; }}>
                    <Link to={productHref(p)} className="drop-photo" aria-label={`${p.name}, ${money(p.price)}`}>
                      {photo && <img src={photo} alt={p.name} loading={i === 0 ? "eager" : "lazy"} decoding="async" />}
                    </Link>
                    <div className="placard">
                      <Link to={productHref(p)} className="placard-link">
                        <span className="pl-title">{p.name}</span>
                        <span className="pl-coll">{String(p.collection || "").replace(/-/g, " ")}</span>
                        <span className="pl-price">{money(p.price)}</span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="drop-empty">New drops are being hung. <Link to="/shop" className="text-link">Browse the shop</Link></p>
          )}
        </div>
      </section>

      {/* ---- colorways ---- */}
      <section className="scene scene-color" ref={setScene(2)} aria-labelledby="color-h">
        <div className="sticky">
          <div className="copy">
            <p className="eyebrow">Colorways</p>
            <h2 className="h2" id="color-h">Five dyes, lit in plain white light.</h2>
            <p className="hide-sm">Every tee here is rendered under neutral white light with no tinted environment, so the color on screen stays close to the dyed cloth. Screens still vary.</p>
            <ol className="swatch-list" aria-label="Colorways">
              {COLOR_ORDER.map((id, i) => {
                const c = COLORWAYS[id];
                return (
                  <li key={id}>
                    <button type="button" className="swatch-row" aria-pressed={i === activeColor} onClick={() => scrollToColor(i)}>
                      <span className="chip" style={{ background: c.hex }} />
                      <span className="sw-name">{c.name}</span>
                      <span className="sw-hex">{c.hex}</span>
                      <span className="sw-status">In every design</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ---- the cloth ---- */}
      <section className="scene scene-craft" ref={setScene(3)} aria-labelledby="craft-h">
        <div className="sticky">
          <div className="copy">
            <p className="eyebrow">The cloth</p>
            <h2 className="h2" id="craft-h">Heavy cotton that keeps its shape.</h2>
            <dl className="specs">
              <div><dt>Weight</dt><dd>220&ndash;240 GSM</dd></div>
              <div><dt>Fibre</dt><dd>Combed cotton</dd></div>
              <div><dt>Fit</dt><dd>Oversized, boxy</dd></div>
              <div><dt>Sizes</dt><dd>S to XXL</dd></div>
              <div><dt>Made in</dt><dd>Tirupur, Tamil Nadu</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---- teaser: type, and it prints ---- */}
      <section className="scene scene-teaser" ref={setScene(4)} aria-labelledby="teaser-h">
        <div className="sticky">
          <div className="copy">
            <p className="eyebrow">Design your own</p>
            <h2 className="h2" id="teaser-h">Your words, or your own artwork.</h2>
            <p>Type a line and it prints on the tee as you go. Then open the designer to add your own artwork, pick the colour and order it.</p>
            {/* action/name make it work before hydration too: /custom reads ?text= */}
            <form className="teaser-form" action="/custom" method="get" onSubmit={openDesigner}>
              <label htmlFor="teaser-text">Your line</label>
              <div className="field-row">
                <input
                  id="teaser-text" name="text" type="text" maxLength={24}
                  value={teaserText} onChange={(e) => setTeaserText(e.target.value)}
                  autoComplete="off" spellCheck={false}
                />
                <button className="btn btn-primary" type="submit">Open the designer</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <p className="fine credit">
        3D tee: <a href="https://sketchfab.com/3d-models/oversized-t-shirt-3b6e78d6a1a74370a6e5af6f312d38f7" target="_blank" rel="noopener noreferrer">&ldquo;Oversized t-shirt&rdquo;</a> by kylelhb, <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>, recoloured with prints added.
      </p>
    </main>
  );
}
