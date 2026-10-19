// Product page in the gallery style, built around the product's own photos
// from the database (no 3D stage here). Colour-tagged images ("Black::url")
// switch with the selected colour.
import { useContext, useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate, useLoaderData } from "react-router";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import { INITIAL_COLLECTION_PRODUCTS, getCollectionById } from "../utils/collectionsData";
import { trackViewItem } from "../utils/analytics";
import { COLORWAYS, SIZES } from "../gallery/data";
import { money, allPhotos } from "../gallery/galleryProducts";
import PhotoViewerModal from "../components/PhotoViewerModal";
import { pageMeta, productLd, breadcrumbLd } from "../utils/seo";

const findFallback = (slug) =>
  INITIAL_COLLECTION_PRODUCTS.find((p) => p.id === slug || p.name.toLowerCase().replace(/\s+/g, "-") === slug) || null;

export async function loader({ params }) {
  try {
    const controller = new AbortController();
    // long enough for a Lambda cold start; the page still works if it runs out
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${apiUrl("/products")}/${params.slug}`, { signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
    // only a real 404 means the tee is gone (and the page is noindex); a slow
    // or failing API must never tell search engines to drop a product
    if (res.status === 404) return { product: findFallback(params.slug), missing: !findFallback(params.slug) };
    if (!res.ok) return { product: findFallback(params.slug) };
    const data = await res.json();
    return { product: data.product || null, missing: !data.product };
  } catch {
    return { product: findFallback(params.slug) };
  }
}

export function meta({ loaderData, data, params }) {
  const loaded = loaderData ?? data;
  const product = loaded?.product;
  if (!product && loaded?.missing) return pageMeta({ title: "Tee not found · VelvetWolf", description: "This VelvetWolf tee isn't available any more. See every heavyweight oversized tee in the VelvetWolf shop.", path: `/product/${params.slug}`, noindex: true });
  if (!product) {
    // the catalogue didn't answer in time: a plain, indexable page (the tee loads in the browser)
    const name = String(params.slug || "").replace(/-[a-z0-9]{4}$/i, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return pageMeta({ title: `${name || "Tee"} · VelvetWolf`, description: `${name || "This tee"}: a heavyweight oversized cotton tee from VelvetWolf, 220 to 240 GSM, sizes S to XXL. Free delivery across India.`, path: `/product/${params.slug}`, type: "product" });
  }
  const path = `/product/${product.slug || params.slug}`;
  const title = `${product.name} · VelvetWolf`;
  const plain = String(product.description || "").replace(/\s+/g, " ").trim();
  const description = (plain.length >= 70 ? plain : `${product.name}: a heavyweight oversized cotton tee from VelvetWolf, 220 to 240 GSM, sizes S to XXL. ${plain}`).slice(0, 158).trim();
  const images = allPhotos(product).map((p) => p.src).filter(Boolean);
  const collection = product.collection ? getCollectionById(product.collection) : null;
  return pageMeta({
    title,
    description,
    path,
    image: images[0],
    type: "product",
    schema: [
      productLd(product, { path, images }),
      breadcrumbLd([["Home", "/"], ["Shop", "/shop"], ...(collection ? [[collection.name, `/shop/${collection.id}`]] : []), [product.name, path]]),
    ],
  });
}

// Swatch colour for a colour name from the admin ("Black", "Forest Green"...)
// or a hex value.
const NAMED = {
  black: "#0a0a0a", white: "#faf9f7", "beige/sand": "#d2b48c", sand: "#d2b48c", beige: "#d2b48c",
  "forest green": "#1e4620", "crimson ember": "#8B2635", crimson: "#8B2635", navy: "#1b2440", grey: "#808080", gray: "#808080",
};
function swatchHex(color) {
  const c = String(color || "").trim();
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return c;
  const way = Object.values(COLORWAYS).find((w) => w.site.toLowerCase() === c.toLowerCase());
  return way?.hex || NAMED[c.toLowerCase()] || "#555";
}
const colorLabel = (color) => {
  const c = String(color || "");
  const way = Object.values(COLORWAYS).find((w) => w.site.toLowerCase() === c.toLowerCase());
  return way ? way.name : c;
};

// Photos for the selected colour (plus untagged shots); everything if the
// colour has none of its own.
function photosFor(product, color) {
  const all = allPhotos(product);
  if (!color) return all;
  const lc = String(color).toLowerCase();
  const tagged = all.filter((p) => p.color.toLowerCase() === lc);
  if (!tagged.length) return all;
  return [...tagged, ...all.filter((p) => p.color === "Original")];
}

// Colours that have photos come first; colours without any are still offered.
function colorsOf(product) {
  const list = Array.isArray(product?.colors) ? product.colors.filter(Boolean) : [];
  const tagged = new Set(allPhotos(product).map((p) => p.color.toLowerCase()));
  return [...list].sort((a, b) => Number(tagged.has(String(b).toLowerCase())) - Number(tagged.has(String(a).toLowerCase())));
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const { addToCart, products, showToast, wishlist = [], toggleWishlist } = useContext(AppContext);
  const [saving, setSaving] = useState(false);

  const [product, setProduct] = useState(loaderData?.product || null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // A new slug (client navigation) brings new loader data.
  useEffect(() => { setProduct(loaderData?.product || null); }, [loaderData]);

  // Fall back to the catalogue already in memory when the API was unreachable.
  useEffect(() => {
    if (product || !products?.length) return;
    const match = products.find((p) => p.slug === slug || p.id === slug || p.name.toLowerCase().replace(/\s+/g, "-") === slug);
    if (match) setProduct(match);
  }, [product, products, slug]);

  useEffect(() => {
    if (!product) return;
    setColor(colorsOf(product)[0] || "");
    setSize("");
    setIndex(0);
    trackViewItem(product);
  }, [product]);

  const photos = useMemo(() => (product ? photosFor(product, color) : []), [product, color]);
  useEffect(() => { setIndex(0); }, [color]);

  // The server couldn't load it: wait for the catalogue before saying it's gone.
  if (!product && !products?.length) {
    return (
      <main className="vwg vwg-pdp-photos">
        <p className="eyebrow" style={{ textAlign: "center", paddingTop: 120 }}>Loading…</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="vwg vwg-pdp-photos">
        <div className="page-wrap" style={{ textAlign: "center", paddingTop: 80 }}>
          <h1 className="page-title">We can't find that piece</h1>
          <p className="page-sub" style={{ margin: "0 auto" }}>It may have sold out or moved.</p>
          <div><Link className="btn" to="/shop">Back to the shop</Link></div>
        </div>
      </main>
    );
  }

  const colors = colorsOf(product);
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : SIZES.map((s) => s.id);
  const chart = SIZES.filter((s) => sizes.includes(s.id));
  const soldOut = Number(product.stock) <= 0;
  const current = photos[index] || photos[0];
  const related = (products || [])
    .filter((p) => p.id !== product.id && p.isActive !== false)
    .sort((a, b) => Number(b.collection === product.collection) - Number(a.collection === product.collection))
    .slice(0, 4);

  const isSaved = wishlist.some((w) => w.id === product.id);

  const step = (d) => setIndex((i) => (photos.length ? (i + d + photos.length) % photos.length : 0));

  const add = async () => {
    if (!size) { showToast("Choose a size first", "info"); return false; }
    setAdding(true);
    try {
      await addToCart(product, size, color || colors[0] || "Black", 1);
      return true;
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="vwg vwg-pdp-photos">
      <div className="pdp-grid">
        <section className="pdp-media" aria-label={`${product.name} photos`}>
          {photos.length > 1 && (
            <ul className="pdp-thumbs">
              {photos.map((ph, i) => (
                <li key={`${ph.src}-${i}`}>
                  <button type="button" aria-current={i === index ? "true" : undefined} aria-label={`Photo ${i + 1} of ${photos.length}`} onClick={() => setIndex(i)}>
                    <img src={ph.src} alt="" loading="lazy" decoding="async" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <figure className="pdp-main">
            {current ? (
              <button type="button" onClick={() => setViewerOpen(true)} aria-label="Open the photo full screen">
                <img src={current.src} alt={current.alt} decoding="async" fetchPriority="high" />
              </button>
            ) : (
              <div className="pdp-empty" aria-hidden="true">VW</div>
            )}
            {photos.length > 1 && (
              <>
                <button type="button" className="pdp-nav pdp-prev" onClick={() => step(-1)} aria-label="Previous photo">&#8249;</button>
                <button type="button" className="pdp-nav pdp-next" onClick={() => step(1)} aria-label="Next photo">&#8250;</button>
                <span className="pdp-count" aria-hidden="true">{index + 1} / {photos.length}</span>
              </>
            )}
          </figure>
        </section>

        <div className="pdp-info">
          <nav className="vwg-crumbs" aria-label="Breadcrumb">
            <Link to="/shop">Shop</Link>
            <span aria-hidden="true">/</span>
            <span>{product.collection || "Drop 01"}</span>
          </nav>

          <header className="vwg-pdp-head">
            <h1 className="vwg-pdp-title">{product.name}</h1>
            <div className="vwg-pdp-price-row">
              <span className="vwg-pdp-price">
                {money(product.price)}
                {Number(product.originalPrice) > Number(product.price) && (
                  <s style={{ marginLeft: 10, color: "var(--bone-3)", fontWeight: 500 }}>{money(product.originalPrice)}</s>
                )}
              </span>
              <span className={`vwg-status${soldOut ? " vwg-status-wait" : ""}`}><i></i>{soldOut ? "Sold out" : "In stock"}</span>
            </div>
            {product.description && <p className="vwg-pdp-blurb">{product.description}</p>}
            <p className="vwg-pdp-label">
              {[product.fabric || "Combed cotton", product.gsm ? `${product.gsm} GSM` : "220–240 GSM", product.fit || "Oversized"].join(" · ")}
            </p>
          </header>

          <form className="vwg-pdp-form" onSubmit={(e) => { e.preventDefault(); add(); }} noValidate>
            {colors.length > 0 && (
              <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 12 }}>
                <legend className="field-legend" style={{ display: "flex", justifyContent: "space-between", width: "100%", font: "600 11px/1.3 var(--g-body)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--bone-2)", marginBottom: 12 }}>
                  <span>Colour</span>
                  <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", color: "var(--bone-2)" }}>{colorLabel(color)}</span>
                </legend>
                <div className="vwg-swatches">
                  {colors.map((c) => (
                    <label key={c} className="vwg-swatch" title={colorLabel(c)}>
                      <input type="radio" name="pdp-color" value={c} checked={color === c} onChange={() => setColor(c)} />
                      <span style={{ background: swatchHex(c) }}></span>
                      <span className="sr">{colorLabel(c)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 12 }}>
              <legend style={{ display: "flex", justifyContent: "space-between", width: "100%", font: "600 11px/1.3 var(--g-body)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--bone-2)", marginBottom: 12 }}>
                <span>Size</span>
                <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none" }}>{product.fit || "Oversized"} fit. Take your usual size.</span>
              </legend>
              <div className="vwg-sizes">
                {sizes.map((s) => {
                  const row = SIZES.find((x) => x.id === s);
                  return (
                    <label key={s} className="vwg-size">
                      <input type="radio" name="pdp-size" value={s} checked={size === s} onChange={() => setSize(s)} />
                      <span><b>{s}</b>{row && <small>{row.chest} cm flat</small>}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div style={{ display: "grid", gap: 10 }}>
              <button className="vwg-btn-primary" type="submit" disabled={!size || soldOut || adding}>
                {soldOut ? "Sold out" : !size ? "Select a size" : `Add to cart · ${money(product.price)}`}
              </button>
              <button
                type="button" className="btn btn-block" disabled={!size || soldOut || adding}
                onClick={async () => { if (await add()) navigate("/checkout"); }}
              >
                Buy now
              </button>
              {/* Saved tees live in Account > Saved (sign-in needed, so the list follows you) */}
              <button type="button" className="text-btn vwg-save" aria-pressed={isSaved} disabled={saving}
                onClick={async () => { setSaving(true); try { await toggleWishlist(product); } finally { setSaving(false); } }}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                <span>{isSaved ? "Saved to your list" : "Save for later"}</span>
              </button>
            </div>
            <p className="fine" style={{ textAlign: "center" }}>Free standard delivery across India. Express at checkout. Prepaid only.</p>
          </form>

          <div className="vwg-details">
            {chart.length > 0 && (
              <details open>
                <summary>Size guide <span style={{ marginLeft: "auto", fontWeight: 500, textTransform: "none", color: "var(--bone-3)" }}>flat measurements, cm</span></summary>
                <table className="vwg-size-table">
                  <thead><tr><th>Size</th><th>Chest, pit to pit</th><th>Length</th><th>Sleeve</th></tr></thead>
                  <tbody>
                    {chart.map((s) => (
                      <tr key={s.id}><th>{s.id}</th><td>{s.chest}</td><td>{s.length}</td><td>{s.sleeve}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
            <details>
              <summary>Fabric and fit</summary>
              <p>{product.fabric || "Combed cotton jersey"}{product.gsm ? ` at ${product.gsm} GSM` : " at 220–240 GSM"}. Cut {String(product.fit || "oversized").toLowerCase()} with a dropped shoulder. Knitted, cut and sewn in Tirupur, Tamil Nadu.</p>
            </details>
            <details>
              <summary>Care</summary>
              <p>Wash cold, inside out. Dry in the shade. Iron on reverse and keep heat off the print.</p>
            </details>
            <details>
              <summary>Delivery and returns</summary>
              <p>Standard delivery is free (4 to 7 working days); Express is ₹149 (2 to 4 working days). See the <Link to="/returns" style={{ color: "var(--bone)" }}>returns policy</Link>.</p>
            </details>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pdp-related" aria-labelledby="pdp-related-h">
          <h2 className="eyebrow" id="pdp-related-h">More from the collection</h2>
          <ul>
            {related.map((r) => {
              const img = allPhotos(r)[0]?.src;
              return (
                <li key={r.id}>
                  <Link to={`/product/${r.slug || r.id}`}>
                    {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <div className="pdp-empty" style={{ aspectRatio: "4 / 5", background: "var(--raise)" }}>VW</div>}
                    <span className="r-name">{r.name}</span>
                    <span className="r-price">{money(r.price)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <PhotoViewerModal
        photos={photos}
        currentIndex={index}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setIndex}
      />
    </main>
  );
}
