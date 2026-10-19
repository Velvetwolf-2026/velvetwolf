// Home: the VelvetWolf Gallery. Five sticky "rooms"; the scroll position maps to
// a camera station in the shared 3D hall (GalleryProvider). The Quiet Hours room
// hangs the newest drops from the catalogue as framed photographs in the hall,
// with a placard pinned under each frame.
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router";
import { AppContext } from "./AppContext";
import { loadProductsFromAPI } from "../utils/products";
import { useGallery } from "../gallery/galleryContext";
import { COLORWAYS, COLOR_ORDER } from "../gallery/data";
import { money, photoFor, colorwaysOf, productHref, newestDrops, fromPrice } from "../gallery/galleryProducts";
import { handOffArtwork } from "../gallery/studioHandoff";
import { pageMeta, organizationLd, websiteLd } from "../utils/seo";

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
  return pageMeta({
    title: "VelvetWolf · Statements in silence",
    description: "Heavyweight oversized tees in five colours, made in Tirupur and shown in the VelvetWolf gallery. Shop the Quiet Hours drop or design your own.",
    path: "/",
    schema: [organizationLd(), websiteLd()],
  });
}

const ORDER = ["hero", "drop", "color", "craft", "teaser"];
const DROP_COUNT = 3; // one per frame in the Quiet Hours room
// Hash links from the header/footer to a room.
const HASH_ROOMS = { "#drop": "drop", "#colors": "color", "#cloth": "craft" };
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
  const { hash } = useLocation();
  const { engine, status } = useGallery();
  const glReady = status === "ready";

  const sceneRefs = useRef([]);
  const dropStickyRef = useRef(null);
  const dropListRef = useRef(null);
  const placardRefs = useRef([]);
  const geometry = useRef({ tops: [], heights: [] });
  const [activeColor, setActiveColor] = useState(0);
  const [teaserText, setTeaserText] = useState("Say less.");
  const teaserPrint = useRef(null);
  const teaserFile = useRef(null);

  // Camera station for this page.
  useEffect(() => {
    engine?.setView("home");
  }, [engine]);

  // Hang the newest drops in the three frames (each in its first colourway).
  useEffect(() => {
    if (!engine) return;
    engine.setDropPhotos(drops.map((p) => photoFor(p, colorwaysOf(p)[0])).filter(Boolean));
  }, [engine, drops]);

  // /#drop, /#colors, /#cloth: jump to that room (after layout has settled).
  useEffect(() => {
    const room = HASH_ROOMS[hash];
    if (!room) return undefined;
    const t = setTimeout(() => {
      const el = sceneRefs.current[ORDER.indexOf(room)];
      if (el) window.scrollTo({ top: el.offsetTop, behavior: "auto" });
    }, 60);
    return () => clearTimeout(t);
  }, [hash]);

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

  // Per frame: scroll position -> camera station, colorway scrub, and the
  // placards pinned under the three framed photographs.
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

      // Pin a placard under each frame (only while the room is on screen;
      // reads before writes so phones don't pay for a layout per placard).
      const list = dropListRef.current, host = dropStickyRef.current;
      if (engine && list && host && Math.abs(s - 1) < 1.05) {
        const anchors = engine.dropAnchors();
        const box = host.getBoundingClientRect();
        const placards = placardRefs.current.filter(Boolean);
        const halves = placards.map((el) => el.offsetWidth / 2);
        placards.forEach((el, i) => {
          const a = anchors[i];
          if (!a) return;
          const [x, py] = a;
          // a frame that runs off the screen edge (phones) keeps its placard hidden
          el.classList.toggle("is-off", x < -2 || x > box.width + box.left + 2);
          // keep each label inside the page gutter on narrow screens
          const half = halves[i], edge = 16;
          const cx = Math.min(Math.max(x - box.left, half + edge), box.width - half - edge);
          el.style.transform = `translate(${cx.toFixed(1)}px, ${(py - box.top).toFixed(1)}px) translateX(-50%)`;
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
            <p>The newest tees in the store, hung in the hall. Each one is printed large on heavyweight cotton.</p>
          </div>
          <Link className="text-link drop-all" to="/shop">See all {products.length > 0 ? `${products.length} tees` : "tees"}</Link>
          {drops.length > 0 ? (
            // Placards pin under the three framed photographs in the hall; the
            // photo inside a placard only shows when there's no 3D hall (no WebGL).
            <ol className="drop-placards" ref={dropListRef}>
              {drops.map((p, i) => {
                const color = colorwaysOf(p)[0];
                const photo = photoFor(p, color);
                return (
                  <li key={p.id} className="placard placard-drop" ref={(el) => { placardRefs.current[i] = el; }}>
                    <Link to={productHref(p)} className="placard-link">
                      {photo && <img className="pl-photo" src={photo} alt={p.name} loading="lazy" decoding="async" />}
                      <span className="pl-title">{p.name}</span>
                      <span className="pl-color">{COLORWAYS[color].name}</span>
                      <span className="pl-tech">{String(p.collection || "").replace(/-/g, " ")}</span>
                      <span className="pl-price">{money(p.price)}</span>
                    </Link>
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
            <p>Type a line and it prints on the tee as you go. Or upload your own design as a PNG, JPG, WebP or SVG, and see it on the tee in 3D before you order.</p>
            {/* action/name make it work before hydration too: /custom reads ?text= */}
            <form className="teaser-form" action="/custom" method="get" onSubmit={openDesigner}>
              <label htmlFor="teaser-text">Your line</label>
              <div className="field-row">
                <input
                  id="teaser-text" name="text" type="text" maxLength={24}
                  value={teaserText} onChange={(e) => setTeaserText(e.target.value)}
                  autoComplete="off" spellCheck={false}
                />
                <button className="btn btn-primary" type="submit">Open the Studio</button>
              </div>
              {/* upload straight from here: pick a file, then the Studio opens with it on the front */}
              <div className="teaser-upload">
                <span className="or" aria-hidden="true">or</span>
                <button className="btn" type="button" onClick={() => teaserFile.current?.click()}>Upload your artwork</button>
                <input
                  ref={teaserFile} type="file" className="sr" tabIndex={-1} aria-hidden="true"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    handOffArtwork(f);
                    navigate("/custom?upload=1");
                  }}
                />
              </div>
            </form>
          </div>
        </div>
      </section>

    </main>
  );
}
