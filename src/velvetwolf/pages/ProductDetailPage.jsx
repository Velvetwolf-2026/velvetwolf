import { useContext, useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLoaderData } from "react-router";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import { INITIAL_COLLECTION_PRODUCTS } from "../utils/collectionsData";
import { trackViewItem } from "../utils/analytics";
import { useGallery } from "../gallery/galleryContext";
import { COLORWAYS, COLOR_ORDER, SIZES } from "../gallery/data";
import { money, colorwaysOf, allPhotos } from "../gallery/galleryProducts";
import { bindDrag } from "../gallery/drag";
import PhotoViewerModal from "../components/PhotoViewerModal";

export async function loader({ params }) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${apiUrl("/products")}/${params.slug}`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      const fallback = INITIAL_COLLECTION_PRODUCTS.find(
        (p) => p.id === params.slug || p.name.toLowerCase().replace(/\s+/g, "-") === params.slug
      );
      return { product: fallback || null };
    }
    const data = await res.json();
    return { product: data.product || null };
  } catch {
    const fallback = INITIAL_COLLECTION_PRODUCTS.find(
      (p) => p.id === params.slug || p.name.toLowerCase().replace(/\s+/g, "-") === params.slug
    );
    return { product: fallback || null };
  }
}

export function meta({ loaderData }) {
  const product = loaderData?.product;
  if (!product) return [{ title: "Product — VelvetWolf Gallery" }];
  const title = `${product.name} — VelvetWolf Gallery`;
  const description = product.description
    ? String(product.description).slice(0, 160)
    : "Luxury streetwear from VelvetWolf.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ];
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const { addToCart, products, showToast } = useContext(AppContext);
  const { engine } = useGallery();

  const [product, setProduct] = useState(loaderData?.product || null);
  const [loading, setLoading] = useState(!loaderData?.product);

  const dragRef = useRef(null);
  const panelRef = useRef(null);

  // Fallback product resolution from AppContext if loader didn't find it
  useEffect(() => {
    if (!product && products.length > 0) {
      const match = products.find(
        (p) => p.slug === slug || p.id === slug || p.name.toLowerCase().replace(/\s+/g, "-") === slug
      );
      if (match) {
        setProduct(match);
        setLoading(false);
      }
    }
  }, [product, products, slug]);

  const availableColors = product ? colorwaysOf(product) : ["noir"];
  const [color, setColor] = useState(availableColors[0] || "noir");
  const [size, setSize] = useState("");
  const [activeFace, setActiveFace] = useState("front");

  // Photo viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Sync color when product changes
  useEffect(() => {
    if (product) {
      const cols = colorwaysOf(product);
      setColor(cols[0] || "noir");
      setSize(product.sizes?.[0] || "M");
      trackViewItem(product);
    }
  }, [product]);

  // Bind 3D engine viewing station
  useEffect(() => {
    if (!engine || !product) return;
    engine.setView("product", "pdp");
    engine.dressPdp(product, color, true);
    engine.face("pdp", activeFace === "back" ? "back" : "front");
  }, [engine, product, color, activeFace]);

  // Bind drag-to-turn on drag surface
  useEffect(() => {
    if (!dragRef.current || !engine) return;
    return bindDrag(dragRef.current, engine, "pdp");
  }, [engine]);

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", color: "#E8E4DA", fontFamily: "var(--font-mono, monospace)" }}>
        LOADING PIECE...
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", color: "#E8E4DA", textAlign: "center", gap: 16 }}>
        <h2>Product not found</h2>
        <Link to="/shop" style={{ color: "#E8E4DA", borderBottom: "1px solid #E8E4DA" }}>Return to Shop</Link>
      </div>
    );
  }

  const photos = allPhotos(product, color);
  const related = (products || []).filter((p) => p.id !== product.id).slice(0, 3);

  const handleFaceChange = (face) => {
    setActiveFace(face);
    if (!engine) return;
    if (face === "detail") {
      engine.face("pdp", "front");
      engine.setStation("pdpDetail");
    } else {
      engine.setStation("pdp");
      engine.face("pdp", face);
    }
  };

  const handleColorChange = (cId) => {
    setColor(cId);
    if (engine) engine.dressPdp(product, cId, false);
  };

  const handleAddToCart = (e) => {
    e?.preventDefault();
    if (!size) {
      showToast("Please select a size", "info");
      return;
    }
    const colorName = COLORWAYS[color]?.site || COLORWAYS[color]?.name || color;
    addToCart(product, size, colorName, 1);
  };

  const handleBuyNow = (e) => {
    e?.preventDefault();
    handleAddToCart();
    setTimeout(() => navigate("/checkout"), 100);
  };

  return (
    <main className="vwg vwg-view-pdp" style={{ minHeight: "100vh", position: "relative" }}>
      {/* 3D Stage Area & Interactive Turn Surface */}
      <div className="vwg-stage-area">
        <div
          ref={dragRef}
          className="vwg-drag-surface"
          tabIndex={0}
          aria-label="Turn the tee. Use the left and right arrow keys or drag."
        />
        <div className="vwg-stage-controls" role="group" aria-label="Camera Angle">
          <button
            type="button"
            aria-pressed={activeFace === "front"}
            onClick={() => handleFaceChange("front")}
          >
            Front
          </button>
          <button
            type="button"
            aria-pressed={activeFace === "back"}
            onClick={() => handleFaceChange("back")}
          >
            Back
          </button>
          <button
            type="button"
            aria-pressed={activeFace === "detail"}
            onClick={() => handleFaceChange("detail")}
          >
            Fabric
          </button>
        </div>
        <p className="vwg-drag-hint">Drag to turn</p>
      </div>

      {/* Vitrine Details Panel */}
      <aside ref={panelRef} className="vwg-panel" aria-label="Product details">
        <nav className="vwg-crumbs" aria-label="Breadcrumb">
          <Link to="/shop">Shop</Link>
          <span aria-hidden="true">/</span>
          <span>{product.collection || "Drop 01"}</span>
        </nav>

        <header className="vwg-pdp-head">
          <h1 className="vwg-pdp-title">{product.name}</h1>
          <div className="vwg-pdp-price-row">
            <span className="vwg-pdp-price">{money(product.price)}</span>
            <span className="vwg-status">
              <i></i>
              {product.stock === 0 ? "Sold out" : "In stock"}
            </span>
          </div>
          <p className="vwg-pdp-blurb">
            {product.description || "A rider’s-eye view over the bars, printed large across the back in one ink."}
          </p>
          <p className="vwg-pdp-label">
            VelvetWolf, 2027. Combed cotton, 220–240 GSM.
          </p>
        </header>

        {/* Worn On-Body Photo Strip */}
        {photos.length > 0 && (
          <section className="vwg-photo-strip" aria-labelledby="photos-h">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 id="photos-h" style={{ font: "600 11px/1 'Manrope', sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, color: "var(--bone, #E8E4DA)" }}>
                Worn <span style={{ color: "rgba(232, 228, 218, 0.5)", fontWeight: 500, textTransform: "none" }}>{photos.length} photos</span>
              </h2>
            </div>
            <ul className="vwg-strip">
              {photos.map((ph, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="vwg-strip-btn"
                    onClick={() => {
                      setViewerIndex(i);
                      setViewerOpen(true);
                    }}
                    aria-label={`Open photo in viewer: ${ph.alt}`}
                  >
                    <img src={ph.src} alt={ph.alt} loading="lazy" decoding="async" />
                    <span className="vwg-strip-color">{ph.color}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Purchase Form */}
        <form className="vwg-pdp-form" onSubmit={handleAddToCart} novalidate>
          {/* Colorway Selection */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 12 }}>
            <legend style={{ display: "flex", justifyContent: "space-between", width: "100%", font: "600 11px/1.3 'Manrope', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E4DA" }}>
              <span>Colorway</span>
              <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", color: "rgba(232, 228, 218, 0.6)" }}>
                {COLORWAYS[color]?.name || color} <span style={{ fontVariantNumeric: "tabular-nums" }}>{COLORWAYS[color]?.hex}</span>
              </span>
            </legend>
            <div className="vwg-swatches">
              {availableColors.map((id) => (
                <label key={id} className="vwg-swatch" title={COLORWAYS[id]?.name || id}>
                  <input
                    type="radio"
                    name="pdp-color"
                    value={id}
                    checked={color === id}
                    onChange={() => handleColorChange(id)}
                  />
                  <span style={{ background: COLORWAYS[id]?.hex || "#141416" }}></span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Size Selection */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 12 }}>
            <legend style={{ display: "flex", justifyContent: "space-between", width: "100%", font: "600 11px/1.3 'Manrope', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E4DA" }}>
              <span>Size</span>
              <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", color: "rgba(232, 228, 218, 0.6)" }}>
                Oversized fit. Take your usual size.
              </span>
            </legend>
            <div className="vwg-sizes">
              {SIZES.map((s) => (
                <label key={s.id} className="vwg-size">
                  <input
                    type="radio"
                    name="pdp-size"
                    value={s.id}
                    checked={size === s.id}
                    onChange={(e) => setSize(e.target.value)}
                  />
                  <span>
                    <b>{s.id}</b>
                    <small>{s.chest} cm</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* CTA Buttons */}
          <div style={{ display: "grid", gap: 10 }}>
            <button
              className="vwg-btn-primary"
              type="submit"
              disabled={!size || product.stock === 0}
            >
              {!size ? "Select a size" : `Add to Cart — ${money(product.price)}`}
            </button>
            <button
              type="button"
              className="vwg-btn-primary"
              style={{ background: "transparent", border: "1px solid rgba(232, 228, 218, 0.3)", color: "#E8E4DA" }}
              disabled={!size || product.stock === 0}
              onClick={handleBuyNow}
            >
              Buy Now with Cashfree
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(232, 228, 218, 0.5)", textAlign: "center" }}>
            Taxes included. Free insured shipping across India.
          </p>
        </form>

        {/* Collapsible details */}
        <div className="vwg-details">
          <details open>
            <summary>Size guide <span style={{ marginLeft: "auto", fontWeight: 500, textTransform: "none", color: "rgba(232, 228, 218, 0.5)" }}>flat measurements, cm</span></summary>
            <table className="vwg-size-table">
              <thead>
                <tr><th>Size</th><th>Chest</th><th>Length</th><th>Sleeve</th></tr>
              </thead>
              <tbody>
                {SIZES.map((s) => (
                  <tr key={s.id}>
                    <th>{s.id}</th><td>{s.chest}</td><td>{s.length}</td><td>{s.sleeve}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <details>
            <summary>Fabric and fit</summary>
            <p>Combed cotton jersey at 220–240 GSM. Cut oversized and boxy with a dropped shoulder. Knitted, cut and sewn in Tirupur, Tamil Nadu.</p>
          </details>
          <details>
            <summary>Care</summary>
            <p>Wash cold, inside out. Dry in the shade. Iron on reverse and keep heat off the print.</p>
          </details>
        </div>

        {/* Related pieces */}
        {related.length > 0 && (
          <section style={{ display: "grid", gap: 14 }}>
            <h2 style={{ font: "600 11px/1 'Manrope', sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, color: "rgba(232, 228, 218, 0.7)" }}>
              More from the collection
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {related.map((r) => {
                const img = allPhotos(r)[0]?.src || "/mockup_silent.webp";
                return (
                  <Link
                    key={r.id}
                    to={`/product/${r.slug || r.id}`}
                    style={{ textDecoration: "none", color: "inherit", background: "#18181B", border: "1px solid rgba(232, 228, 218, 0.12)", borderRadius: 2, overflow: "hidden" }}
                  >
                    <img src={img} alt={r.name} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />
                    <div style={{ padding: "8px 6px" }}>
                      <div style={{ font: "400 11px/1.2 'Unbounded', sans-serif", color: "#E8E4DA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(232, 228, 218, 0.6)", marginTop: 4 }}>{money(r.price)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </aside>

      {/* Full-screen Photo Viewer */}
      <PhotoViewerModal
        photos={photos}
        currentIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
      />
    </main>
  );
}
