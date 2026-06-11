import React, { useContext, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "./AppContext";
import { useLanguage } from "./LanguageContext";
import ProductCard from "../components/ProductCard";
import Icon from "../components/Icon";
import { COLLECTIONS, getCollectionById } from "./Collections";
import { HeroHeader } from "../styles/shared";

export default function ShopPage() {
  const { products, searchQuery } = useContext(AppContext);
  const { collection: routeCollection } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const activeCollection = routeCollection || null;
  const [sort, setSort] = useState("featured");
  const [priceRange] = useState([0, 10000]);
  const [selectedSizes, setSelectedSizes] = useState([]);

  const handleCollectionClick = (colId) => {
    if (colId) {
      navigate(`/shop/${colId}`);
    } else {
      navigate("/shop");
    }
  };

  const filtered = products
    .filter(p => !activeCollection || p.collection === activeCollection)
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.collection?.toLowerCase().includes(q) ||
        p.tag?.toLowerCase().includes(q)
      );
    })
    .filter(p => Number(p.price) >= priceRange[0] && Number(p.price) <= priceRange[1])
    .filter(p => selectedSizes.length === 0 || p.sizes?.some(s => selectedSizes.includes(s)))
    .sort((a, b) => {
      if (sort === "price-asc") return Number(a.price) - Number(b.price);
      if (sort === "price-desc") return Number(b.price) - Number(a.price);
      if (sort === "rating") return Number(b.rating || 0) - Number(a.rating || 0);
      return 0;
    });

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <HeroHeader
        eyebrow="VELVETWOLF STORE"
        title={activeCollection ? getCollectionById(activeCollection)?.name?.toUpperCase() : t("shop").toUpperCase()}
        sub={`${filtered.length} ${t("shop") === "दुकान" ? "टुकड़े उपलब्ध" : (t("shop") === "கடை" ? "தயாரிப்புகள் உள்ளன" : "pieces available in this drop.")}`}
      />

      <div className="page-content-pad" style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 40px", display: "flex", gap: 40, flexWrap: "wrap" }}>
        {/* Sidebar filters */}
        <div className="shop-sidebar" style={{ width: 220, flexShrink: 0 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 16 }}>{t("collections")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => handleCollectionClick(null)} style={{ background: "none", border: "none", cursor: "pointer", color: !activeCollection ? "var(--gold)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, textAlign: "left", padding: "4px 0" }}>{t("all")}</button>
              {COLLECTIONS.map(col => {
                const IconComponent = col.icon;
                return (
                  <button key={col.id} onClick={() => handleCollectionClick(activeCollection === col.id ? null : col.id)} style={{ background: "none", border: "none", cursor: "pointer", color: activeCollection === col.id ? "var(--gold)" : "#cfcdcd", fontFamily: "'Roboto', sans-serif", fontSize: 12, letterSpacing: 1, textAlign: "left", padding: "4px 0", display: "flex", alignItems: "center", gap: 8 }}>
                    <span><IconComponent /></span>{col.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 16 }}>{t("size")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["XS","S","M","L","XL","XXL"].map(size => (
                <button key={size} onClick={() => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])} style={{ background: selectedSizes.includes(size) ? "var(--gold)" : "transparent", border: "1px solid var(--gold)", color: selectedSizes.includes(size) ? "var(--obsidian)" : "var(--gold)", padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer", letterSpacing: 1 }}>{size}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>{filtered.length} {t("shop") === "दुकान" ? "परिणाम" : (t("shop") === "கடை" ? "முடிவுகள்" : "RESULTS")}</div>
            <select className="input-dark" value={sort} onChange={e => setSort(e.target.value)} style={{ width: "auto", padding: "8px 16px" }}>
              <option value="featured">{t("featured")}</option>
              <option value="price-asc">{t("priceLowHigh")}</option>
              <option value="price-desc">{t("priceHighLow")}</option>
              <option value="rating">{t("rating")}</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--silver)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, opacity: 0.3, marginBottom: 16 }}>{t("shop") === "दुकान" ? "खाली" : (t("shop") === "கடை" ? "வெற்று" : "EMPTY")}</div>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>{t("noProducts")}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
