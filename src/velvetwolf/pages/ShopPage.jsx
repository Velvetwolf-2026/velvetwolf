import React, { useContext, useState, useEffect } from "react";
import { useParams, useNavigate, useLoaderData } from "react-router";
import { AppContext } from "./AppContext";
import { useLanguage } from "./LanguageContext";
import { useBreakpoint } from "../utils/breakpoints";
import ProductCard from "../components/ProductCard";
import Icon from "../components/Icon";
import { COLLECTIONS, getCollectionById } from "../utils/collectionsData";
import { HeroHeader } from "../styles/shared";
import { apiUrl } from "../utils/api";
import { loadProductsFromAPI } from "../utils/products";

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
  const title = collection ? `${collection.name} — VelvetWolf` : "Shop — VelvetWolf";
  const description = collection?.description || "Shop the full VelvetWolf catalog of luxury streetwear.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
  ];
}

const AVAILABLE_COLORS = [
  { name: "Black", value: "#0a0a0a" },
  { name: "White", value: "#faf9f7" },
  { name: "Beige/Sand", value: "#d2b48c" },
  { name: "Forest Green", value: "#1e4620" },
  { name: "Crimson Ember", value: "#8B2635" }
];

const FABRIC_TYPES = ["Egyptian Cotton", "Supima Cotton", "French Terry", "Heavyweight Jersey"];
const SLEEVE_TYPES = ["Half Sleeve", "Full Sleeve", "Sleeveless"];
const NECK_TYPES = ["Crew Neck", "Round Neck", "Hooded"];
const CATEGORIES = ["tshirt", "cargo", "hoodie", "cap"];

export default function ShopPage() {
  const { products: ctxProducts, searchQuery } = useContext(AppContext);
  const loaderData = useLoaderData();
  const products = ctxProducts.length > 0 ? ctxProducts : (loaderData?.products || []);
  const { collection: routeCollection } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isMobileOrTablet, isMobile } = useBreakpoint();

  const activeCollection = routeCollection || null;
  const [sort, setSort] = useState("recommended");

  // Advanced Filter states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedFits, setSelectedFits] = useState([]);
  const [priceMax, setPriceMax] = useState(4000);
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [selectedSleeve, setSelectedSleeve] = useState(null);
  const [selectedNeck, setSelectedNeck] = useState(null);
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(false);
  const [bestSellersOnly, setBestSellersOnly] = useState(false);

  // Mobile Filter Drawer State
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // AI Search states
  const [aiProducts, setAiProducts] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch AI Search intent-based query results
  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) {
      setAiProducts(null);
      return;
    }

    setAiLoading(true);
    const delayDebounce = setTimeout(() => {
      fetch(apiUrl("/ai/search"), {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      })
        .then(res => res.json())
        .then(data => {
          setAiProducts(data.products || []);
          setAiLoading(false);
        })
        .catch(err => {
          console.error("AI search failed, using local fallback", err);
          setAiProducts(null);
          setAiLoading(false);
        });
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Lock scroll when mobile filter drawer is open
  useEffect(() => {
    if (isMobileOrTablet && filterDrawerOpen) {
      document.body.classList.add("vw-scroll-locked");
    } else {
      document.body.classList.remove("vw-scroll-locked");
    }
    return () => {
      document.body.classList.remove("vw-scroll-locked");
    };
  }, [isMobileOrTablet, filterDrawerOpen]);

  // Auto-navigate to collection if search query matches a collection keywords
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      let matchedCol = null;
      if (q.includes("ai") || q.includes("tech")) matchedCol = "ai-tech";
      else if (q.includes("anime")) matchedCol = "anime";
      else if (q.includes("beast")) matchedCol = "beast-mode";
      else if (q.includes("silent") || q.includes("luxury")) matchedCol = "silent-luxury";
      else if (q.includes("founder")) matchedCol = "founder";
      else if (q.includes("savage")) matchedCol = "savage-quotes";
      else if (q.includes("xp")) matchedCol = "xp-mode";
      else if (q.includes("mind") || q.includes("mayhem")) matchedCol = "mind-mayhem";

      if (matchedCol && matchedCol !== routeCollection) {
        navigate(`/shop/${matchedCol}`);
      }
    }
  }, [searchQuery, routeCollection, navigate]);

  const baseList = aiProducts !== null ? aiProducts : products;

  const filtered = baseList
    .filter(p => !activeCollection || p.collection === activeCollection)
    .filter(p => {
      if (!searchQuery || !searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.description || "").toLowerCase().includes(q) ||
        String(p.tag || "").toLowerCase().includes(q) ||
        String(p.category || "").toLowerCase().includes(q) ||
        String(p.collection || "").toLowerCase().includes(q)
      );
    })
    .filter(p => !selectedCategory || p.category === selectedCategory || p.name.toLowerCase().includes(selectedCategory))
    .filter(p => !selectedGender || p.style === selectedGender || p.gender === selectedGender)
    .filter(p => !selectedColor || p.colors?.includes(selectedColor) || p.colors?.some(c => c.toLowerCase().includes(selectedColor.toLowerCase())))
    .filter(p => selectedSizes.length === 0 || p.sizes?.some(s => selectedSizes.includes(s)))
    .filter(p => selectedFits.length === 0 || selectedFits.includes(p.fit))
    .filter(p => Number(p.price) <= priceMax)
    .filter(p => !selectedFabric || p.fabric === selectedFabric || p.description?.includes(selectedFabric))
    .filter(p => !selectedSleeve || p.sleeve_type === selectedSleeve || p.description?.includes(selectedSleeve))
    .filter(p => !selectedNeck || p.neck_type === selectedNeck || p.description?.includes(selectedNeck))
    .filter(p => !availabilityOnly || (p.stock && Number(p.stock) > 0))
    .filter(p => !newArrivalsOnly || p.tag === "NEW" || p.is_new_arrival)
    .filter(p => !bestSellersOnly || p.tag === "BESTSELLER" || p.is_best_seller)
    .sort((a, b) => {
      if (sort === "price-asc") return Number(a.price) - Number(b.price);
      if (sort === "price-desc") return Number(b.price) - Number(a.price);
      if (sort === "rating") return Number(b.rating || 0) - Number(a.rating || 0);
      if (sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sort === "popular") return Number(b.reviews || 0) - Number(a.reviews || 0);
      if (sort === "trending") return Number(b.rating || 0) * Number(b.reviews || 0) - Number(a.rating || 0) * Number(a.reviews || 0);
      return 0;
    });

  const renderFilters = (isMobileView = false) => {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: 2, color: "var(--gold)", fontWeight: "bold" }}>SMART FILTERS</span>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedGender(null);
              setSelectedColor(null);
              setSelectedSizes([]);
              setSelectedFits([]);
              setPriceMax(4000);
              setSelectedFabric(null);
              setSelectedSleeve(null);
              setSelectedNeck(null);
              setAvailabilityOnly(false);
              setNewArrivalsOnly(false);
              setBestSellersOnly(false);
            }}
            style={{ background: "none", border: "none", color: "var(--silver)", cursor: "pointer", fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            CLEAR ALL
          </button>
        </div>

        {/* Category Filter */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>CATEGORY</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                id={`cat-${cat}`}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                style={{
                  padding: "6px 12px",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  border: "1px solid",
                  borderColor: selectedCategory === cat ? "var(--gold)" : "var(--smoke)",
                  background: selectedCategory === cat ? "var(--gold)" : "transparent",
                  color: selectedCategory === cat ? "var(--obsidian)" : "var(--silver)",
                  cursor: "pointer",
                  textTransform: "uppercase"
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gender Filter */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>GENDER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["Unisex", "Men's Fit", "Women's Fit"].map(gender => (
              <label key={gender} style={{ fontSize: 12, color: "var(--silver)", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedGender === gender}
                  onChange={() => setSelectedGender(selectedGender === gender ? null : gender)}
                  style={{ accentColor: "var(--gold)" }}
                />
                {gender}
              </label>
            ))}
          </div>
        </div>

        {/* Color Filter */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>COLOR</div>
          <div style={{ display: "flex", gap: 10 }}>
            {AVAILABLE_COLORS.map(color => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(selectedColor === color.name ? null : color.name)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: color.value,
                  border: selectedColor === color.name ? "2px solid var(--gold)" : "1px solid var(--smoke)",
                  cursor: "pointer",
                  outline: selectedColor === color.name ? "1px solid #fff" : "none"
                }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Size Filter */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>SIZE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["XS", "S", "M", "L", "XL", "XXL"].map(size => (
              <button
                key={size}
                onClick={() => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])}
                style={{
                  padding: "6px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  border: "1px solid",
                  borderColor: selectedSizes.includes(size) ? "var(--gold)" : "var(--smoke)",
                  background: selectedSizes.includes(size) ? "var(--gold)" : "transparent",
                  color: selectedSizes.includes(size) ? "var(--obsidian)" : "var(--silver)",
                  cursor: "pointer"
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Fit Filter */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>FIT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["Oversized", "Regular Fit", "Relaxed Fit"].map(fit => (
              <label key={fit} style={{ fontSize: 12, color: "var(--silver)", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedFits.includes(fit)}
                  onChange={() => setSelectedFits(prev => prev.includes(fit) ? prev.filter(f => f !== fit) : [...prev, fit])}
                  style={{ accentColor: "var(--gold)" }}
                />
                {fit}
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>
            <span>MAX PRICE</span>
            <span>₹{priceMax}</span>
          </div>
          <input
            type="range"
            min="500"
            max="4000"
            step="100"
            value={priceMax}
            onChange={e => setPriceMax(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--gold)" }}
          />
        </div>

        {/* Fabric Type */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>FABRIC</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {FABRIC_TYPES.map(fabric => (
              <label key={fabric} style={{ fontSize: 12, color: "var(--silver)", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name={isMobileView ? "fabric-mobile" : "fabric"}
                  checked={selectedFabric === fabric}
                  onChange={() => setSelectedFabric(selectedFabric === fabric ? null : fabric)}
                  onClick={() => { if (selectedFabric === fabric) setSelectedFabric(null); }}
                  style={{ accentColor: "var(--gold)" }}
                />
                {fabric}
              </label>
            ))}
          </div>
        </div>

        {/* Sleeve & Neck Type */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>SLEEVE TYPE</div>
          <select
            value={selectedSleeve || ""}
            onChange={e => setSelectedSleeve(e.target.value || null)}
            style={{ width: "100%", padding: 8, background: "#0a0a0a", border: "1px solid var(--smoke)", color: "var(--silver)", fontSize: 12, fontFamily: "var(--font-mono)" }}
          >
            <option value="">ALL SLEEVES</option>
            {SLEEVE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>NECK TYPE</div>
          <select
            value={selectedNeck || ""}
            onChange={e => setSelectedNeck(e.target.value || null)}
            style={{ width: "100%", padding: 8, background: "#0a0a0a", border: "1px solid var(--smoke)", color: "var(--silver)", fontSize: 12, fontFamily: "var(--font-mono)" }}
          >
            <option value="">ALL NECKS</option>
            {NECK_TYPES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Quick Badges filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--smoke)", paddingTop: 18 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--silver)", cursor: "pointer" }}>
            <input type="checkbox" checked={availabilityOnly} onChange={e => setAvailabilityOnly(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
            IN STOCK ONLY
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--silver)", cursor: "pointer" }}>
            <input type="checkbox" checked={newArrivalsOnly} onChange={e => setNewArrivalsOnly(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
            NEW ARRIVALS
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--silver)", cursor: "pointer" }}>
            <input type="checkbox" checked={bestSellersOnly} onChange={e => setBestSellersOnly(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
            BEST SELLERS
          </label>
        </div>
      </>
    );
  };

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh", background: "var(--obsidian)" }}>
      <HeroHeader
        eyebrow="VELVETWOLF STORE"
        title={activeCollection ? getCollectionById(activeCollection)?.name?.toUpperCase() : t("shop").toUpperCase()}
        sub={`${filtered.length} items matching your selections.`}
      />

      <div className="page-content-pad" style={{ maxWidth: 1400, margin: "0 auto", padding: isMobileOrTablet ? "20px 16px 80px" : "40px 40px", display: "flex", gap: isMobileOrTablet ? 0 : 40, flexWrap: "wrap" }}>

        {/* Sidebar filters (Desktop only) */}
        {!isMobileOrTablet && (
          <div className="shop-sidebar" style={{ width: 250, flexShrink: 0, background: "var(--graphite)", padding: 24, border: "1px solid var(--smoke)" }}>
            {renderFilters(false)}
          </div>
        )}

        {/* Products Grid Column */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>
              {aiLoading ? "SEARCHING FOR INTENT..." : `${filtered.length} RESULTS FOUND`}
            </div>
            {!isMobileOrTablet && (
              <select
                className="input-dark"
                value={sort}
                onChange={e => setSort(e.target.value)}
                style={{ width: "auto", padding: "8px 16px", fontFamily: "var(--font-mono)", fontSize: 12 }}
              >
                <option value="recommended">RECOMMENDED</option>
                <option value="trending">TRENDING</option>
                <option value="newest">NEWEST ARRIVALS</option>
                <option value="popular">MOST POPULAR</option>
                <option value="price-asc">PRICE: LOW TO HIGH</option>
                <option value="price-desc">PRICE: HIGH TO LOW</option>
              </select>
            )}
          </div>

          {aiLoading ? (
            <div style={{ textAlign: "center", padding: "120px 0", color: "var(--gold)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, letterSpacing: 4 }}>AI DECODING YOUR STYLING INTENT...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "120px 0", color: "var(--silver)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, opacity: 0.2, marginBottom: 16 }}>EMPTY DROP</div>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>No pieces match your filters. Try clearing some selections.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))", justifyContent: "center", gap: isMobile ? 12 : 32 }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>

      </div>

      {/* Floating mobile filter button */}
      {isMobileOrTablet && (
        <button
          onClick={() => setFilterDrawerOpen(true)}
          className="vw-mobile-filter-floating-btn"
        >
          <Icon name="filter" size={14} color="var(--obsidian)" />
          <span>FILTERS & SORT</span>
        </button>
      )}

      {/* Slide-up filter drawer for mobile */}
      {isMobileOrTablet && filterDrawerOpen && (
        <div className="vw-filter-drawer-overlay" onClick={() => setFilterDrawerOpen(false)}>
          <div className="vw-filter-drawer" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--smoke)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", fontWeight: "bold", letterSpacing: 2 }}>FILTERS & SORT</span>
              <button 
                onClick={() => setFilterDrawerOpen(false)}
                style={{ background: "none", border: "none", color: "var(--silver)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11 }}
              >
                CLOSE
              </button>
            </div>
            
            <div className="vw-drawer-content-scroll">
              {/* Sort by selection inside drawer */}
              <div style={{ marginBottom: 24, borderBottom: "1px solid var(--smoke)", paddingBottom: 20 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>SORT ORDER</div>
                <select
                  className="input-dark"
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", fontSize: 12 }}
                >
                  <option value="recommended">RECOMMENDED</option>
                  <option value="trending">TRENDING</option>
                  <option value="newest">NEWEST ARRIVALS</option>
                  <option value="popular">MOST POPULAR</option>
                  <option value="price-asc">PRICE: LOW TO HIGH</option>
                  <option value="price-desc">PRICE: HIGH TO LOW</option>
                </select>
              </div>

              {renderFilters(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
