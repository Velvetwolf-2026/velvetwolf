// Shop: "All tees" in the VelvetWolf Gallery. Every product in the catalogue as
// a photo card over the dimmed 3D hall (GalleryProvider). The colorway filter
// switches every card to that colour's photo (all designs come in all five).
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useNavigate, useParams } from "react-router";
import { AppContext } from "./AppContext";
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

// Photo-first card: the on-body photo covers the stage (4:5); the featured
// product takes a double tile. Hover lifts the photo slightly (no 3D fade:
// products have photos but no print artwork for the 3D tee).
function ProductTile({ product, colorId, feature, eager }) {
  const colors = colorwaysOf(product);
  const shown = colorId && colors.includes(colorId) ? colorId : colors[0];
  const photo = photoFor(product, shown);
  const original = Number(product.originalPrice) || 0;
  const onSale = original > Number(product.price);
  const soldOut = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;
  const cls = ["card", photo && "has-photo", feature && "card-feature"].filter(Boolean).join(" ");
  return (
    <Link to={productHref(product)} className={cls} aria-label={`${product.name}, ${COLORWAYS[shown].name}, ${money(product.price)}`}>
      <div className="stage">
        {photo && <img className="stage-photo" src={photo} alt="" loading={eager ? "eager" : "lazy"} decoding="async" />}
        {soldOut && <span className="tag">Sold out</span>}
      </div>
      <div className="info">
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
      </div>
    </Link>
  );
}

export default function ShopPage() {
  const { products: ctxProducts, searchQuery } = useContext(AppContext);
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
          {" "}in five colours, photographed worn. Pick a colour to see every design in it.
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
          {list.map((p, i) => {
            // the newest tee takes a double tile, but only in the default view
            const feature = i === 0 && colorView === "all" && sort === "featured" && !routeCollection;
            return (
              <li key={p.id} className={feature ? "is-feature" : undefined}>
                <ProductTile product={p} colorId={colorView === "all" ? null : colorView} feature={feature} eager={i < 4} />
              </li>
            );
          })}
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
