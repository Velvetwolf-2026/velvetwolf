import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminProducts, updateProductInventory } from "../utils/adminApi";
import Icon from "../components/Icon";

export default function AdminInventory() {
  const { setPage, showToast } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedProductId, setExpandedProductId] = useState(null);

  // Form states for editing a variant's stock
  const [editingVariant, setEditingVariant] = useState(null); // { productId, size, color, stock }
  const [stockInput, setStockInput] = useState("");

  const load = (q) => {
    setLoading(true);
    fetchAdminProducts({ search: q || undefined })
      .then((res) => {
        setProducts(res.products || []);
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          showToast("Session expired.", "error");
          setPage("login");
        } else {
          showToast("Failed to load inventory.", "error");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load(search);
  };

  const handleStartEdit = (productId, size, color, currentStock) => {
    setEditingVariant({ productId, size, color });
    setStockInput(currentStock.toString());
  };

  const handleSaveStock = async () => {
    if (!editingVariant) return;
    const stockVal = parseInt(stockInput, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      showToast("Please enter a valid stock quantity (≥ 0).", "error");
      return;
    }

    setSaving(true);
    try {
      const { productId, size, color } = editingVariant;
      const res = await updateProductInventory(productId, {
        size: size || null,
        color: color || null,
        stock: stockVal
      });

      // Update local state with the returned updated product
      setProducts(prev => prev.map(p => p.id === productId ? res.product : p));
      setEditingVariant(null);
      showToast("Stock quantity updated!");
    } catch (err) {
      showToast(err.message || "Failed to update inventory.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Generate size/color variant combinations based on product arrays
  const getVariants = (product) => {
    const sizes = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : [null];
    const colors = Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : [null];
    
    const variants = [];
    for (const size of sizes) {
      for (const color of colors) {
        variants.push({
          size,
          color,
          // Since product-specific stocks of variants are normally saved, we approximate
          // or read from variant metadata. For now, since we dynamically sum stock in the backend,
          // we present equal shares of total stock as fallback, or show 0/editable values.
          stock: Math.floor(Number(product.stock ?? 0) / (sizes.length * colors.length)) || 0
        });
      }
    }
    return variants;
  };

  return (
    <div>
      <div className="vw-admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>INVENTORY</h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginTop: 6 }}>STOCK LEVELS & VARIANTS</div>
        </div>
        <div>
          <form className="vw-admin-search" onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8 }}>
            <input 
              className="input-dark" 
              placeholder="SEARCH PRODUCT..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={{ padding: "8px 12px", fontSize: 12 }} 
            />
            <button type="submit" className="btn-ghost" style={{ fontSize: 12, padding: "0 12px" }}>SEARCH</button>
          </form>
        </div>
      </div>

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>LOADING PRODUCTS...</div>
        ) : (
          <div className="vw-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
                  <th style={{ width: "40px" }} />
                  {["SKU", "PRODUCT NAME", "COLLECTION", "TOTAL STOCK", "STATUS"].map((h) => (
                    <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const isExpanded = expandedProductId === product.id;
                    const stock = Number(product.stock ?? 0);
                    const isLowStock = stock < 10;
                    
                    return (
                      <>
                        <tr 
                          key={product.id} 
                          style={{ 
                            borderBottom: "1px solid var(--smoke)", 
                            background: isExpanded ? "rgba(201,168,76,0.03)" : "transparent",
                            cursor: "pointer"
                          }}
                          onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                        >
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <Icon name={isExpanded ? "chevronUp" : "chevronDown"} size={14} color="var(--gold)" />
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1 }}>
                            {product.sku || "—"}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {product.image && <img src={product.image.includes("::") ? product.image.split("::")[1] : product.image} alt={product.name} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 2, background: "var(--smoke)" }} />}
                              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1 }}>{product.name}</div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)" }}>
                            {product.collection}
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: "bold" }}>
                            {stock}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span 
                              style={{ 
                                fontFamily: "var(--font-mono)", 
                                fontSize: 10, 
                                letterSpacing: 1, 
                                padding: "3px 8px", 
                                background: isLowStock ? "rgba(255, 138, 101, 0.1)" : "rgba(129, 199, 132, 0.1)", 
                                color: isLowStock ? "#ff8a65" : "#81c784" 
                              }}
                            >
                              {isLowStock ? "LOW STOCK" : "IN STOCK"}
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                            <td />
                            <td colSpan={5} style={{ padding: "16px 24px" }}>
                              <div style={{ borderLeft: "2px solid var(--gold)", paddingLeft: 16 }}>
                                <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", letterSpacing: 2, marginBottom: 12 }}>
                                  VARIANT INVENTORY BREAKDOWN
                                </h4>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                                  {getVariants(product).map((variant, idx) => {
                                    const isEditing = editingVariant && 
                                                      editingVariant.productId === product.id && 
                                                      editingVariant.size === variant.size && 
                                                      editingVariant.color === variant.color;
                                                      
                                    return (
                                      <div 
                                        key={idx} 
                                        style={{ 
                                          background: "var(--graphite)", 
                                          border: "1px solid var(--smoke)", 
                                          padding: "12px", 
                                          display: "flex", 
                                          flexDirection: "column", 
                                          justifyContent: "space-between" 
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)" }}>
                                            SIZE: {variant.size || "Default"}
                                          </span>
                                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)" }}>
                                            COLOR: {variant.color || "Default"}
                                          </span>
                                        </div>

                                        {isEditing ? (
                                          <div style={{ display: "flex", gap: 6 }}>
                                            <input 
                                              className="input-dark" 
                                              type="number" 
                                              value={stockInput} 
                                              onChange={(e) => setStockInput(e.target.value)} 
                                              style={{ flex: 1, padding: "4px 8px", fontSize: 12 }} 
                                            />
                                            <button 
                                              onClick={handleSaveStock} 
                                              disabled={saving} 
                                              style={{ background: "#81c784", color: "var(--obsidian)", border: "none", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}
                                            >
                                              {saving ? "..." : "OK"}
                                            </button>
                                            <button 
                                              onClick={() => setEditingVariant(null)} 
                                              style={{ background: "none", border: "1px solid var(--smoke)", color: "var(--silver)", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: "bold", color: "var(--ivory)" }}>
                                              {variant.stock} units
                                            </span>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(product.id, variant.size, variant.color, variant.stock);
                                              }}
                                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gold)", display: "flex", alignItems: "center" }}
                                            >
                                              <Icon name="edit" size={14} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
