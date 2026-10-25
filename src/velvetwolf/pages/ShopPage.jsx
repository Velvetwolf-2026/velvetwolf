// Shop: "All tees" in the VelvetWolf Gallery. Every product in the catalogue as
// a photo card over the dimmed 3D hall (GalleryProvider). The colorway filter
// switches every card to that colour's photo (all designs come in all five).
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useNavigate, useParams, useSearchParams } from "react-router";
import { AppContext } from "./AppContext";
import { COLLECTIONS, getCollectionById } from "../utils/collectionsData";
import { apiUrl } from "../utils/api";
import { loadProductsFromAPI } from "../utils/products";
import { useGallery } from "../gallery/galleryContext";
import { COLORWAYS, COLOR_ORDER } from "../gallery/data";
import { money, photoFor, colorwaysOf, productHref, allPhotos } from "../gallery/galleryProducts";
import { pageMeta, breadcrumbLd, itemListLd } from "../utils/seo";
import GenderToggle from "../gallery/GenderToggle";
import { parseGender, matchesGender } from "../gallery/genderFilter";

export async function loader({ params }) {
  try {
    const products = await loadProductsFromAPI({ collection: params.collection });
    return { products };
  } catch {
    return { products: [] };
  }
}

// ALL · MEN · WOMEN and ?q= only filter the tees already loaded, so changing them
// mustn't refetch the catalogue (that held the toggle back for a second or more).
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }) {
  if (!formMethod && currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

const GENDER_WORD = { men: "Men's", women: "Women's" };

export function meta({ params, loaderData, data, location }) {
  const collection = params.collection ? getCollectionById(params.collection) : null;
  const path = collection ? `/shop/${collection.id}` : "/shop";
  // ?gender=men|women is a filtered view of the same page (the canonical stays the plain URL)
  const who = GENDER_WORD[parseGender(new URLSearchParams(location?.search || "").get("gender"))];
  const title = collection
    ? `${who ? `${who} ` : ""}${collection.name} tees · VelvetWolf`
    : who ? `${who} tees · VelvetWolf` : "Shop all tees · VelvetWolf";
  const description = collection
    ? `${collection.name}: heavyweight oversized VelvetWolf tees in 220 to 240 GSM cotton, five colours, sizes S to XXL. Free delivery across India.`
    : "Every VelvetWolf tee: heavyweight oversized cotton in five colours, sizes S to XXL, made in Tirupur. Free standard delivery across India.";
  const products = ((loaderData ?? data)?.products || []).filter((p) => p && p.isActive !== false && (!collection || p.collection === collection.id));
  return pageMeta({
    title,
    description,
    path,
    schema: [
      breadcrumbLd(collection ? [["Home", "/"], ["Shop", "/shop"], [collection.name, path]] : [["Home", "/"], ["Shop", "/shop"]]),
      itemListLd(products, { name: collection ? `${collection.name} tees` : "All VelvetWolf tees", path }),
    ],
  });
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
// product takes a double tile. Images rotate dynamically every few seconds
// and update interactively on hover/colorway swatch interaction.
function ProductTile({ product, colorId, feature, eager }) {
  const colors = useMemo(() => colorwaysOf(product), [product]);
  const defaultColor = colorId && colors.includes(colorId) ? colorId : colors[0];

  // Gather all available photos for dynamic cycling & interactive preview
  const tileImages = useMemo(() => {
    const list = [];
    const seen = new Set();
    const addImg = (src, colorKey = null) => {
      if (!src || typeof src !== "string" || seen.has(src)) return;
      seen.add(src);
      list.push({ src, colorKey });
    };

    if (colorId && colors.includes(colorId)) {
      // Color-filtered mode: prioritize photos for this colorway
      const pColor = photoFor(product, colorId);
      if (pColor) addImg(pColor, colorId);

      const colorPhotos = allPhotos(product, colorId);
      const siteName = COLORWAYS[colorId]?.site?.toLowerCase();
      colorPhotos
        .filter((item) => item.color?.toLowerCase() === siteName)
        .forEach((item) => addImg(item.src, colorId));

      if (product.modelImage) addImg(product.modelImage, colorId);
    } else {
      // Default / All colors mode: add the primary photo of each available colorway
      colors.forEach((cId) => {
        const cPhoto = photoFor(product, cId);
        if (cPhoto) addImg(cPhoto, cId);
      });

      // Include model image if present
      if (product.modelImage) addImg(product.modelImage, colors[0] || null);

      // Fallback to all photos if still empty
      if (list.length === 0) {
        allPhotos(product).forEach((p) => addImg(p.src, null));
      }
    }

    return list;
  }, [product, colorId, colors]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverColor, setHoverColor] = useState(null);

  // Reset when filter changes
  useEffect(() => {
    setActiveIdx(0);
    setHoverColor(null);
  }, [colorId]);

  // Dynamic automatic rotation when not hovered
  useEffect(() => {
    if (tileImages.length <= 1 || isHovered) return;

    // Stagger duration (3.6s - 5.0s) per product so tiles don't transition simultaneously
    const charCode = (String(product.id || "").charCodeAt(0) || 0) % 5;
    const duration = 3600 + charCode * 350;

    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % tileImages.length);
    }, duration);

    return () => clearInterval(timer);
  }, [tileImages.length, isHovered, product.id]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // On hover, if there's an alternate view and user hasn't explicitly picked a color swatch,
    // seamlessly preview the second image
    if (tileImages.length > 1 && !hoverColor && activeIdx === 0) {
      setActiveIdx(1);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverColor(null);
  };

  const handleDotEnter = (e, cid) => {
    e.preventDefault();
    e.stopPropagation();
    setHoverColor(cid);
    const targetIdx = tileImages.findIndex((img) => img.colorKey === cid);
    if (targetIdx !== -1) {
      setActiveIdx(targetIdx);
    }
  };

  const currentImg = tileImages[activeIdx] || tileImages[0];
  const activeColorKey = hoverColor || currentImg?.colorKey || defaultColor;

  const original = Number(product.originalPrice) || 0;
  const onSale = original > Number(product.price);
  const soldOut = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;
  const cls = ["card", tileImages.length > 0 && "has-photo", feature && "card-feature"].filter(Boolean).join(" ");

  return (
    <Link
      to={productHref(product)}
      className={cls}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`${product.name}, ${COLORWAYS[activeColorKey]?.name || "Original"}, ${money(product.price)}`}
    >
      <div className="stage">
        {tileImages.map((img, i) => {
          const isActive = i === (activeIdx % tileImages.length);
          return (
            <img
              key={img.src}
              className={`stage-photo ${isActive ? "is-active" : ""}`}
              src={img.src}
              alt={product.name}
              loading={eager && i === 0 ? "eager" : "lazy"}
              decoding="async"
              style={{
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 1 : 0,
              }}
            />
          );
        })}

        {tileImages.length > 1 && (
          <div className="stage-indicators" aria-hidden="true">
            {tileImages.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={`stage-indicator ${i === (activeIdx % Math.min(tileImages.length, 5)) ? "is-active" : ""}`}
              />
            ))}
          </div>
        )}

        {soldOut && <span className="tag">Sold out</span>}
      </div>

      <div className="info">
        <span className="card-title">{product.name}</span>
        <span className="card-meta">{String(product.collection || "").replace(/-/g, " ")}</span>
        <span className="card-row">
          <span className="dots" aria-label={`${colors.length} colorway${colors.length > 1 ? "s" : ""}`}>
            {colors.map((id) => {
              const isSelected = activeColorKey === id;
              return (
                <i
                  key={id}
                  style={{
                    background: COLORWAYS[id].hex,
                    transform: isSelected ? "scale(1.3)" : "scale(1)",
                    borderColor: isSelected ? "var(--bone)" : "var(--line-2)",
                    boxShadow: isSelected ? "0 0 6px rgba(232, 228, 218, 0.45)" : "none",
                    cursor: "pointer",
                  }}
                  title={COLORWAYS[id].name}
                  onMouseEnter={(e) => handleDotEnter(e, id)}
                  onClick={(e) => handleDotEnter(e, id)}
                />
              );
            })}
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
  const { products: ctxProducts, searchQuery, setSearchQuery } = useContext(AppContext);
  const [params] = useSearchParams();

  // /shop?q=... searches (search engines and AI assistants link here: see the
  // WebSite schema in utils/seo.js)
  const urlQuery = params.get("q");
  // ALL · MEN · WOMEN (GenderToggle): Unisex tees show under both
  const gender = parseGender(params.get("gender"));
  const genderQs = gender === "all" ? "" : `?gender=${gender}`;
  useEffect(() => {
    if (urlQuery !== null) setSearchQuery?.(urlQuery.slice(0, 80));
  }, [urlQuery, setSearchQuery]);
  const loaderData = useLoaderData();
  // The catalogue the page shows: the app's copy, unless the server's is fuller (if the
  // browser's own fetch timed out, the app holds only the small offline sample list).
  // Products taken off sale stay in the list (past orders still show them) but not here.
  const products = useMemo(() => {
    const fromServer = loaderData?.products || [];
    const all = ctxProducts.length >= fromServer.length && ctxProducts.length > 0 ? ctxProducts : fromServer;
    return all.filter((p) => p && p.isActive !== false);
  }, [ctxProducts, loaderData]);
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
      .filter((p) => matchesGender(p, gender))
      .filter((p) => {
        if (!q || (Array.isArray(aiProducts) && aiProducts.length > 0)) return true;
        return [p.name, p.description, p.collection, p.tag].some((v) => String(v || "").toLowerCase().includes(q));
      });
    if (sort === "low") return [...filtered].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "high") return [...filtered].sort((a, b) => Number(b.price) - Number(a.price));
    return filtered; // featured: newest first, as the API returns them
  }, [aiProducts, products, routeCollection, searchQuery, sort, gender]);

  // Only collections that actually have tees (plus the open one), in menu order.
  const shownCollections = useMemo(() => {
    const used = new Set(products.map((p) => p?.collection).filter(Boolean));
    return COLLECTIONS.filter((c) => used.has(c.id) || c.id === routeCollection);
  }, [products, routeCollection]);

  const collection = routeCollection ? getCollectionById(routeCollection) : null;
  const genderWord = GENDER_WORD[gender];
  const heading = collection ? collection.name : genderWord ? `${genderWord} tees` : "All tees";

  return (
    <main className="vwg vwg-shop">
      <header className="shop-head">
        <p className="eyebrow">{collection ? (genderWord ? `Collection · ${genderWord}` : "Collection") : "Shop"}</p>
        <h1 className="display">{heading}</h1>
        <p className="shop-sub">
          {aiLoading ? "Searching…" : `${list.length} ${list.length === 1 ? "tee" : "tees"}`}
          {" "}in five colours, photographed worn. Pick a colour to see every design in it.
        </p>
      </header>

      {/* phones, tablets, small laptops: the header has no room, so it sits here */}
      <GenderToggle className="vwg-gender-shop" />

      <nav className="collections" aria-label="Collections">
        <Link className="coll-link" to={`/shop${genderQs}`} aria-current={!routeCollection ? "page" : undefined}>All</Link>
        {shownCollections.map((c) => (
          <Link key={c.id} className="coll-link" to={`/shop/${c.id}${genderQs}`} aria-current={routeCollection === c.id ? "page" : undefined}>
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
            const feature = i === 0 && colorView === "all" && sort === "featured" && !routeCollection && gender === "all";
            return (
              <li key={p.id} className={feature ? "is-feature" : undefined}>
                <ProductTile product={p} colorId={colorView === "all" ? null : colorView} feature={feature} eager={i < 4} />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="shop-empty">
          <p>{gender !== "all" ? `No ${gender === "men" ? "men's" : "women's"} tees${collection ? ` in ${collection.name}` : ""} yet.` : "No tees match that yet."}</p>
          <Link className="btn" to={gender !== "all" && collection ? `/shop/${collection.id}` : "/shop"}>See all tees</Link>
        </div>
      )}

    </main>
  );
}
