// Shop: "All tees" in the VelvetWolf Gallery. Every product in the catalogue as
// a photo card over the dimmed 3D hall (GalleryProvider). The colorway filter
// switches every card to that colour's photo (all designs come in all five).
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useNavigate, useParams } from "react-router";
import { AppContext } from "./AppContext";
import Icon from "../components/Icon";
import { COLLECTIONS, getCollectionById } from "../utils/collectionsData";
import { apiUrl } from "../utils/api";
import { loadProductsFromAPI } from "../utils/products";
import { useGallery } from "../gallery/galleryContext";
import { COLORWAYS, COLOR_ORDER } from "../gallery/data";
import { money, photoFor, colorwaysOf, productHref } from "../gallery/galleryProducts";

export async function loader({ params }) {
  try {
    const products = await loadProductsFromAPI({ collection: params.collection });
    return { products };
  } catch {
    return { products: [] };
  }
}

export function meta({ params }) {
  const collection = params.collection ? getCollectionById(params.collection) : null;
  const title = collection ? `${collection.name} — VelvetWolf` : "All tees — VelvetWolf";
  const description = collection?.description || "Every VelvetWolf tee, in five colours. Heavyweight oversized cotton.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@200;300;400;500&display=swap" },
  ];
}

// Search words that jump straight to a collection (same rules as before).
function collectionForQuery(q) {
  if (q.includes("ai") || q.includes("tech")) return "ai-tech";
  if (q.includes("anime")) return "anime";
  if (q.includes("beast")) return "beast-mode";
  if (q.includes("silent") || q.includes("luxury")) return "silent-luxury";
  if (q.includes("founder")) return "founder";
  if (q.includes("savage")) return "savage-quotes";
  if (q.includes("xp")) return "xp-mode";
  if (q.includes("mind") || q.includes("mayhem")) return "mind-mayhem";
  return null;
}

function ProductTile({ product, colorId, inWishlist, onToggleWishlist, eager }) {
  const colors = colorwaysOf(product);
  const shown = colorId && colors.includes(colorId) ? colorId : colors[0];
  const photo = photoFor(product, shown);
  const original = Number(product.originalPrice) || 0;
  const onSale = original > Number(product.price);
  return (
    <div className="card">
      <button
        type="button"
        className="wish"
        aria-pressed={inWishlist}
        aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        onClick={() => onToggleWishlist(product)}
      >
        <Icon name={inWishlist ? "heartFill" : "heart"} size={15} color={inWishlist ? "var(--gold)" : "var(--bone)"} />
      </button>
      <Link to={productHref(product)} className="card-photo" aria-label={`${product.name}, ${COLORWAYS[shown].name}, ${money(product.price)}`}>
        {photo && <img src={photo} alt={product.name} loading={eager ? "eager" : "lazy"} decoding="async" />}
        {product.stock !== undefined && Number(product.stock) <= 0 && <span className="tag">Sold out</span>}
      </Link>
      <Link to={productHref(product)} className="info" style={{ textDecoration: "none" }}>
        <span className="card-title">{product.name}</span>
        <span className="card-meta">{String(product.collection || "").replace(/-/g, " ")}</span>
        <span className="card-row">
          <span className="dots" aria-label={`${colors.length} colorway${colors.length > 1 ? "s" : ""}`}>
            {colors.map((id) => <i key={id} style={{ background: COLORWAYS[id].hex }} />)}
          </span>
          <span className="price">
            {onSale && <s>{money(original)}</s>}
            {money(product.price)}
          </span>
        </span>
      </Link>
    </div>
  );
}

export default function ShopPage() {
  const { products: ctxProducts, searchQuery, wishlist = [], toggleWishlist } = useContext(AppContext);
  const loaderData = useLoaderData();
  const products = useMemo(
    () => (ctxProducts.length > 0 ? ctxProducts : loaderData?.products || []),
    [ctxProducts, loaderData]
  );
  const { collection: routeCollection } = useParams();
  const navigate = useNavigate();
  const { engine } = useGallery();

  const [colorView, setColorView] = useState("all");
  const [sort, setSort] = useState("featured");
  const [aiProducts, setAiProducts] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Camera station for this page (the hall recedes as the grid scrolls over it).
  useEffect(() => {
    engine?.setView("shop");
  }, [engine]);

  // Intent-based search from the navbar (falls back to local matching).
  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) {
      setAiProducts(null);
      return undefined;
    }
    setAiLoading(true);
    const timer = setTimeout(() => {
      fetch(apiUrl("/ai/search"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })
        .then((res) => res.json())
        .then((data) => { setAiProducts(data.products || []); setAiLoading(false); })
        .catch((err) => {
          console.error("AI search failed, using local fallback", err);
          setAiProducts(null);
          setAiLoading(false);
        });
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // A search that names a collection opens that collection.
  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) return;
    const matched = collectionForQuery(searchQuery.toLowerCase());
    if (matched && matched !== routeCollection) navigate(`/shop/${matched}`);
  }, [searchQuery, routeCollection, navigate]);

  const list = useMemo(() => {
    const base = Array.isArray(aiProducts) && aiProducts.length > 0 ? aiProducts : products;
    const q = (searchQuery || "").trim().toLowerCase();
    const filtered = base
      .filter((p) => p && p.isActive !== false)
      .filter((p) => !routeCollection || p.collection === routeCollection)
      .filter((p) => {
        if (!q || (Array.isArray(aiProducts) && aiProducts.length > 0)) return true;
        return [p.name, p.description, p.collection, p.tag].some((v) => String(v || "").toLowerCase().includes(q));
      });
    if (sort === "low") return [...filtered].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "high") return [...filtered].sort((a, b) => Number(b.price) - Number(a.price));
    return filtered; // featured: newest first, as the API returns them
  }, [aiProducts, products, routeCollection, searchQuery, sort]);

  // Only collections that actually have tees (plus the open one), in menu order.
  const shownCollections = useMemo(() => {
    const used = new Set(products.map((p) => p?.collection).filter(Boolean));
    return COLLECTIONS.filter((c) => used.has(c.id) || c.id === routeCollection);
  }, [products, routeCollection]);

  const collection = routeCollection ? getCollectionById(routeCollection) : null;
  const heading = collection ? collection.name : "All tees";

  return (
    <main className="vwg vwg-shop">
      <header className="shop-head">
        <p className="eyebrow">{collection ? "Collection" : "Shop"}</p>
        <h1 className="display">{heading}</h1>
        <p className="shop-sub">
          {aiLoading ? "Searching…" : `${list.length} ${list.length === 1 ? "tee" : "tees"}`}
          {" "}in five colours. Pick a colour to see every design in it.
        </p>
      </header>

      <nav className="collections" aria-label="Collections">
        <Link className="coll-link" to="/shop" aria-current={!routeCollection ? "page" : undefined}>All</Link>
        {shownCollections.map((c) => (
          <Link key={c.id} className="coll-link" to={`/shop/${c.id}`} aria-current={routeCollection === c.id ? "page" : undefined}>
            {c.name}
          </Link>
        ))}
      </nav>

      <div className="shop-tools">
        <div className="filters" role="radiogroup" aria-label="Show every tee in a colorway">
          {["all", ...COLOR_ORDER].map((id) => (
            <label key={id} className="filter">
              <input type="radio" name="shop-color" value={id} checked={colorView === id} onChange={() => setColorView(id)} />
              <span>
                {id !== "all" && <i style={{ background: COLORWAYS[id].hex }} />}
                {id === "all" ? "All" : COLORWAYS[id].name}
              </span>
            </label>
          ))}
        </div>
        <div className="sort">
          <label htmlFor="shop-sort">Sort</label>
          <select id="shop-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Newest</option>
            <option value="low">Price, low to high</option>
            <option value="high">Price, high to low</option>
          </select>
        </div>
      </div>

      {searchQuery && searchQuery.trim() && (
        <p className="search-note">Showing results for &ldquo;{searchQuery.trim()}&rdquo;.</p>
      )}

      {list.length > 0 ? (
        <ul className="grid">
          {list.map((p, i) => (
            <li key={p.id}>
              <ProductTile
                product={p}
                colorId={colorView === "all" ? null : colorView}
                inWishlist={wishlist.some((w) => w.id === p.id)}
                onToggleWishlist={toggleWishlist}
                eager={i < 4}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="shop-empty">
          <p>No tees match that yet.</p>
          <Link className="btn" to="/shop">See all tees</Link>
        </div>
      )}

      <p className="fine shop-foot">
        3D tee: <a href="https://sketchfab.com/3d-models/oversized-t-shirt-3b6e78d6a1a74370a6e5af6f312d38f7" target="_blank" rel="noopener noreferrer">&ldquo;Oversized t-shirt&rdquo;</a> by kylelhb, <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>, recoloured with prints added.
      </p>
    </main>
  );
}
