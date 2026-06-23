import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminProducts, createProduct, updateProduct, deleteProduct } from "../utils/adminApi";
import { COLLECTIONS } from "../utils/collectionsData";
import Icon from "../components/Icon";
import { TAG_COLORS } from "../utils/constants";

const EMPTY_FORM = { name: "", collection: "ai-tech", price: "", original_price: "", sizes: ["S","M","L","XL"], colors: ["#0a0a0a"], tag: "NEW", description: "", stock: 50, image: "", images: [], newImages: [], style: "Unisex", fit: "Oversized" };

const TAG_OPTIONS = ["BESTSELLER","LIMITED","NEW","TRENDING","HOT","MOST LOVED","SIGNATURE"];

const COLOR_MAP = {
  "Black": "#0a0a0a",
  "White": "#faf9f7",
  "Beige/Sand": "#d2b48c",
  "Forest Green": "#1e4620"
};

const T_SHIRT_COLORS = ["Black", "White", "Beige/Sand", "Forest Green"];

export default function AdminProducts() {
  const { setPage, showToast } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [search, setSearch]     = useState("");
  const [isTshirtForm, setIsTshirtForm] = useState(false);
  const [isTshirtEdit, setIsTshirtEdit] = useState(false);

  const checkIfTshirt = (product) => {
    if (!product) return false;
    const colors = product.colors || [];
    const images = product.images || [];
    const hasTshirtColors = colors.some(c => T_SHIRT_COLORS.includes(c));
    const hasPrefixedImages = images.some(img => typeof img === "string" && img.includes("::"));
    return hasTshirtColors || hasPrefixedImages;
  };

  const startEdit = (p) => {
    setEditProduct({ ...p });
    setAdding(false);
    setIsTshirtEdit(checkIfTshirt(p));
  };

  const load = (q) => {
    setLoading(true);
    fetchAdminProducts({ search: q || undefined })
      .then((res) => { setProducts(res.products || []); setTotal(res.total || 0); })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) { showToast("Session expired.", "error"); setPage("login"); }
        else showToast("Failed to load products.", "error");
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(""); }, []);

  const handleAdd = async () => {
    if (!form.name.trim())                             { showToast("Product name is required.", "error"); return; }
    if (!form.price || Number(form.price) <= 0)        { showToast("Enter a valid price.", "error"); return; }
    if (form.original_price && Number(form.original_price) < Number(form.price)) { showToast("Original price must be ≥ sale price.", "error"); return; }

    setSaving(true);
    try {
      const payload = { 
        ...form, 
        price: Number(form.price), 
        original_price: form.original_price ? Number(form.original_price) : Number(form.price), 
        stock: Number(form.stock || 0) 
      };
      const res = await createProduct(payload);
      setProducts((prev) => [res.product, ...prev]);
      setTotal((t) => t + 1);
      setAdding(false);
      setForm(EMPTY_FORM);
      setIsTshirtForm(false);
      showToast("Product added!");
    } catch (err) {
      showToast(err.message || "Failed to add product.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const res = await updateProduct(editProduct.id, {
        name: editProduct.name,
        collection: editProduct.collection,
        style: editProduct.style || "Unisex",
        fit: editProduct.fit || "Oversized",
        price: Number(editProduct.price),
        original_price: Number(editProduct.original_price ?? editProduct.originalPrice ?? editProduct.price),
        stock: Number(editProduct.stock ?? 0),
        description: editProduct.description,
        tag: editProduct.tag,
        sizes: editProduct.sizes,
        colors: editProduct.colors,
        image: editProduct.image,
        images: editProduct.images,
        newImages: editProduct.newImages,
      });
      setProducts((prev) => prev.map((p) => p.id === editProduct.id ? res.product : p));
      setEditProduct(null);
      showToast("Product updated!");
    } catch (err) {
      showToast(err.message || "Failed to update product.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => t - 1);
      showToast("Product removed.", "info");
    } catch (err) {
      showToast(err.message || "Failed to delete product.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, isEdit = false, color = null) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    try {
      const newUploads = await Promise.all(files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            resolve({ 
              base64, 
              fileName, 
              contentType: file.type, 
              previewUrl: URL.createObjectURL(file),
              color: color || undefined
            });
          };
          reader.readAsDataURL(file);
        });
      }));

      if (isEdit) {
        setEditProduct((ep) => ({ 
          ...ep, 
          newImages: [...(ep.newImages || []), ...newUploads]
        }));
      } else {
        setForm((f) => ({ 
          ...f, 
          newImages: [...(f.newImages || []), ...newUploads]
        }));
      }
      showToast(`${newUploads.length} image(s) ready for upload!`);
    } catch {
      showToast("Failed to process images.", "error");
    }
  };

  const removeNewImage = (index, isEdit = false) => {
    if (isEdit) {
      setEditProduct((ep) => ({ ...ep, newImages: ep.newImages.filter((_, i) => i !== index) }));
    } else {
      setForm((f) => ({ ...f, newImages: f.newImages.filter((_, i) => i !== index) }));
    }
  };

  return (
    <div>
      <div className="vw-admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>PRODUCTS</h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginTop: 6 }}>{total} TOTAL</div>
        </div>
        <div className="vw-admin-toolbar" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <form className="vw-admin-search" onSubmit={(e) => { e.preventDefault(); load(search); }} style={{ display: "flex", gap: 8 }}>
            <input className="input-dark" placeholder="SEARCH..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: "8px 12px", fontSize: 12 }} />
            <button type="submit" className="btn-ghost" style={{ fontSize: 12, padding: "0 12px" }}>SEARCH</button>
          </form>
          <button className="btn-gold" onClick={() => { setAdding(true); setEditProduct(null); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="plus" size={14} /> ADD PRODUCT
          </button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="vw-admin-panel" style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: "28px", marginBottom: 28 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 20 }}>NEW PRODUCT</h3>
          <div className="vw-admin-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <input className="input-dark" placeholder="PRODUCT NAME *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ gridColumn: "1/-1" }} />
            <select className="input-dark" value={form.collection} onChange={(e) => setForm((f) => ({ ...f, collection: e.target.value }))}>
              {COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input-dark" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}>
              {TAG_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="input-dark" placeholder="SALE PRICE (₹) *" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            <input className="input-dark" placeholder="ORIGINAL PRICE (₹)" type="number" value={form.original_price} onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))} />
            <input className="input-dark" placeholder="STOCK QTY" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
            <select className="input-dark" value={form.style} onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}>
              {["Unisex", "Men's Fit", "Women's Fit"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input-dark" value={form.fit} onChange={(e) => setForm((f) => ({ ...f, fit: e.target.value }))}>
              {["Oversized", "Regular Fit", "Relaxed Fit"].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={isTshirtForm} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsTshirtForm(checked);
                    setForm(f => ({
                      ...f,
                      colors: checked ? ["Black", "White", "Beige/Sand", "Forest Green"] : ["#0a0a0a"]
                    }));
                  }} 
                />
                IS T-SHIRT PRODUCT
              </label>
            </div>

            {isTshirtForm ? (
              <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, border: "1px solid var(--smoke)", padding: 16, background: "var(--obsidian)" }}>
                {T_SHIRT_COLORS.map(col => {
                  const colorDot = COLOR_MAP[col] || col;
                  const pending = (form.newImages || []).filter(img => img.color === col);
                  return (
                    <div key={col} style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--graphite)", padding: 12, border: "1px solid var(--smoke)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: colorDot, display: "inline-block", border: "1px solid var(--ash)" }} />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>{col.toUpperCase()}</span>
                      </div>
                      
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 40, alignItems: "center" }}>
                        {pending.map((img) => {
                          const origIndex = form.newImages.findIndex(x => x.fileName === img.fileName);
                          return (
                            <div key={img.fileName} style={{ position: "relative" }}>
                              <img src={img.previewUrl} alt="Preview" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                              <button 
                                onClick={() => removeNewImage(origIndex, false)} 
                                style={{ position: "absolute", top: -6, right: -6, background: "var(--wolf-red)", color: "#fff", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >✕</button>
                            </div>
                          );
                        })}
                      </div>
                      
                      <label className="btn-ghost" style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "6px 12px", fontSize: 10, boxSizing: "border-box", textAlign: "center" }}>
                        UPLOAD {col.toUpperCase()}
                        <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleImageUpload(e, false, col)} />
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, gridColumn: "1/-1", alignItems: "center", flexWrap: "wrap" }}>
                {form.image && (
                  <img src={form.image} alt="Primary" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, background: "var(--smoke)", border: "1px solid var(--gold)" }} />
                )}
                {(form.newImages || []).map((img, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={img.previewUrl} alt={`New ${i}`} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, background: "var(--smoke)" }} />
                    <button onClick={() => removeNewImage(i, false)} style={{ position: "absolute", top: -6, right: -6, background: "var(--wolf-red)", color: "#fff", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                ))}
                <input className="input-dark" placeholder="PRIMARY IMAGE URL (optional)" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} style={{ flex: 1, minWidth: 200 }} />
                <label className="btn-ghost" style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "0 16px", fontSize: 12, height: 40, boxSizing: "border-box" }}>
                  UPLOAD FILE(S)
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleImageUpload(e, false)} />
                </label>
              </div>
            )}
            <textarea className="input-dark" placeholder="DESCRIPTION" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ gridColumn: "1/-1" }} />
          </div>
          <div className="vw-admin-form-actions" style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button className="btn-gold" onClick={handleAdd} disabled={saving}>{saving ? "SAVING..." : "ADD PRODUCT"}</button>
            <button className="btn-ghost" onClick={() => { setAdding(false); setForm(EMPTY_FORM); setIsTshirtForm(false); }}>CANCEL</button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>LOADING...</div>
        ) : (
          <div className="vw-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
                {["PRODUCT", "COLLECTION", "PRICE", "STOCK", "TAG", "ACTIONS"].map((h) => (
                  <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>No products found</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--smoke)" }}>
                  <td style={{ padding: "14px 16px" }}>
                    {editProduct?.id === p.id
                      ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <input className="input-dark" value={editProduct.name} onChange={(e) => setEditProduct((ep) => ({ ...ep, name: e.target.value }))} style={{ padding: "6px 10px", fontSize: 11 }} />
                          
                          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            <select className="input-dark" value={editProduct.collection} onChange={(e) => setEditProduct((ep) => ({ ...ep, collection: e.target.value }))} style={{ padding: "4px 8px", fontSize: 10 }}>
                              {COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select className="input-dark" value={editProduct.tag || ""} onChange={(e) => setEditProduct((ep) => ({ ...ep, tag: e.target.value || null }))} style={{ padding: "4px 8px", fontSize: 10 }}>
                              <option value="">NO TAG</option>
                              {TAG_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select className="input-dark" value={editProduct.style || "Unisex"} onChange={(e) => setEditProduct((ep) => ({ ...ep, style: e.target.value }))} style={{ padding: "4px 8px", fontSize: 10 }}>
                              {["Unisex", "Men's Fit", "Women's Fit"].map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select className="input-dark" value={editProduct.fit || "Oversized"} onChange={(e) => setEditProduct((ep) => ({ ...ep, fit: e.target.value }))} style={{ padding: "4px 8px", fontSize: 10 }}>
                              {["Oversized", "Regular Fit", "Relaxed Fit"].map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </div>

                          <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                            <input 
                              type="checkbox" 
                              checked={isTshirtEdit} 
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setIsTshirtEdit(checked);
                                setEditProduct(ep => ({
                                  ...ep,
                                  colors: checked ? ["Black", "White", "Beige/Sand", "Forest Green"] : ["#0a0a0a"]
                                }));
                              }} 
                            />
                            IS T-SHIRT PRODUCT
                          </label>

                          {isTshirtEdit ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 8, border: "1px solid var(--smoke)", padding: 10, background: "var(--obsidian)" }}>
                              {T_SHIRT_COLORS.map(col => {
                                const colorDot = COLOR_MAP[col] || col;
                                const existing = (editProduct.images || []).filter(img => typeof img === "string" && img.startsWith(`${col}::`));
                                const pending = (editProduct.newImages || []).filter(img => img.color === col);
                                
                                return (
                                  <div key={col} style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--graphite)", padding: 8, border: "1px solid var(--smoke)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorDot, display: "inline-block", border: "1px solid var(--ash)" }} />
                                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>{col.toUpperCase()}</span>
                                    </div>
                                    
                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minHeight: 30, alignItems: "center" }}>
                                      {existing.map((url) => {
                                        const displayUrl = url.split("::")[1];
                                        return (
                                          <div key={url} style={{ position: "relative" }}>
                                            <img src={displayUrl} alt="Existing" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 4 }} />
                                            <button 
                                              onClick={() => {
                                                setEditProduct(ep => ({
                                                  ...ep,
                                                  images: ep.images.filter(x => x !== url)
                                                }));
                                              }} 
                                              style={{ position: "absolute", top: -4, right: -4, background: "var(--wolf-red)", color: "#fff", border: "none", borderRadius: "50%", width: 12, height: 12, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            >✕</button>
                                          </div>
                                        );
                                      })}
                                      {pending.map((img) => {
                                        const origIndex = editProduct.newImages.findIndex(x => x.fileName === img.fileName);
                                        return (
                                          <div key={img.fileName} style={{ position: "relative" }}>
                                            <img src={img.previewUrl} alt="Pending" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 4 }} />
                                            <button 
                                              onClick={() => removeNewImage(origIndex, true)} 
                                              style={{ position: "absolute", top: -4, right: -4, background: "var(--wolf-red)", color: "#fff", border: "none", borderRadius: "50%", width: 12, height: 12, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            >✕</button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <label className="btn-ghost" style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "4px 8px", fontSize: 9, boxSizing: "border-box" }}>
                                      + {col.toUpperCase()}
                                      <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleImageUpload(e, true, col)} />
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                              {editProduct.image && (
                                <img src={editProduct.image} alt="Primary" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 4, background: "var(--smoke)" }} />
                              )}
                              {(editProduct.images || []).map((url, i) => url !== editProduct.image && !url.includes("::") && (
                                <div key={i} style={{ position: "relative" }}>
                                  <img src={url} alt={`Gallery ${i}`} style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 4, background: "var(--smoke)" }} />
                                  <button 
                                    onClick={() => {
                                      setEditProduct(ep => ({
                                        ...ep,
                                        images: ep.images.filter(x => x !== url)
                                      }));
                                    }} 
                                    style={{ position: "absolute", top: -4, right: -4, background: "var(--wolf-red)", color: "#fff", border: "none", borderRadius: "50%", width: 12, height: 12, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  >✕</button>
                                </div>
                              ))}
                              {(editProduct.newImages || []).map((img, i) => (
                                <div key={i} style={{ position: "relative" }}>
                                  <img src={img.previewUrl} alt={`New ${i}`} style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 4, background: "var(--smoke)" }} />
                                  <button onClick={() => removeNewImage(i, true)} style={{ position: "absolute", top: -4, right: -4, background: "var(--wolf-red)", color: "#fff", border: "none", borderRadius: "50%", width: 12, height: 12, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                                </div>
                              ))}
                              <label className="btn-ghost" style={{ cursor: "pointer", padding: "0 8px", fontSize: 10, display: "flex", alignItems: "center", height: 30, boxSizing: "border-box" }}>
                                + FILE(S)
                                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleImageUpload(e, true)} />
                              </label>
                            </div>
                          )}
                        </div>
                      : <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {p.image && <img src={p.image.includes("::") ? p.image.split("::")[1] : p.image} alt={p.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, background: "var(--smoke)" }} />}
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1 }}>{p.name}</div>
                        </div>}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", padding: "14px 16px", letterSpacing: 1 }}>
                    {COLLECTIONS.find((c) => c.id === p.collection)?.name || p.collection}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {editProduct?.id === p.id
                      ? <input className="input-dark" type="number" value={editProduct.price} onChange={(e) => setEditProduct((ep) => ({ ...ep, price: Number(e.target.value) }))} style={{ padding: "6px 10px", fontSize: 11, width: 90 }} />
                      : <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)" }}>₹{Number(p.price).toLocaleString()}</span>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {editProduct?.id === p.id
                      ? <input className="input-dark" type="number" value={editProduct.stock} onChange={(e) => setEditProduct((ep) => ({ ...ep, stock: Number(e.target.value) }))} style={{ padding: "6px 10px", fontSize: 12, width: 80 }} />
                      : <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: Number(p.stock ?? 0) < 10 ? "#ff8a65" : Number(p.stock ?? 0) < 20 ? "#ffd54f" : "#81c784" }}>{p.stock ?? 0}</span>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, padding: "3px 8px", background: TAG_COLORS[p.tag]?.bg || "var(--smoke)", color: TAG_COLORS[p.tag]?.color || "var(--ash)" }}>{p.tag || "—"}</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {editProduct?.id === p.id ? (
                        <>
                          <button onClick={handleSave} disabled={saving} style={{ background: "none", border: "1px solid #81c784", color: "#81c784", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{saving ? "..." : "SAVE"}</button>
                          <button onClick={() => setEditProduct(null)} style={{ background: "none", border: "1px solid var(--smoke)", color: "var(--silver)", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}>CANCEL</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="edit" size={16} /></button>
                          <button onClick={() => handleDelete(p.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wolf-red)" }}><Icon name="trash" size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
