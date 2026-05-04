import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminProducts, createProduct, updateProduct, deleteProduct } from "../utils/adminApi";
import { COLLECTIONS } from "../pages/Collections";

const EMPTY_FORM = { name: "", collection: "ai-tech", price: "", original_price: "", sizes: ["S","M","L","XL"], colors: ["#0a0a0a"], tag: "NEW", description: "", stock: 50, image: "" };

const TAG_OPTIONS = ["BESTSELLER","LIMITED","NEW","TRENDING","HOT","MOST LOVED","SIGNATURE"];

export default function AdminProducts({ Icon, TAG_COLORS }) {
  const { setPage, showToast } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [search, setSearch]     = useState("");

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

  useEffect(() => { load(""); }, []);

  const handleAdd = async () => {
    if (!form.name.trim())                             { showToast("Product name is required.", "error"); return; }
    if (!form.price || Number(form.price) <= 0)        { showToast("Enter a valid price.", "error"); return; }
    if (!form.original_price || Number(form.original_price) <= 0) { showToast("Enter a valid original price.", "error"); return; }
    if (Number(form.original_price) < Number(form.price)) { showToast("Original price must be ≥ sale price.", "error"); return; }

    setSaving(true);
    try {
      const res = await createProduct({ ...form, price: Number(form.price), original_price: Number(form.original_price), stock: Number(form.stock || 0) });
      setProducts((prev) => [res.product, ...prev]);
      setTotal((t) => t + 1);
      setAdding(false);
      setForm(EMPTY_FORM);
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
        price: Number(editProduct.price),
        original_price: Number(editProduct.original_price ?? editProduct.originalPrice ?? editProduct.price),
        stock: Number(editProduct.stock ?? 0),
        description: editProduct.description,
        tag: editProduct.tag,
        sizes: editProduct.sizes,
        colors: editProduct.colors,
        image: editProduct.image,
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
            <input className="input-dark" placeholder="ORIGINAL PRICE (₹) *" type="number" value={form.original_price} onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))} />
            <input className="input-dark" placeholder="STOCK QTY" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
            <input className="input-dark" placeholder="IMAGE URL" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} />
            <textarea className="input-dark" placeholder="DESCRIPTION" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ gridColumn: "1/-1" }} />
          </div>
          <div className="vw-admin-form-actions" style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button className="btn-gold" onClick={handleAdd} disabled={saving}>{saving ? "SAVING..." : "ADD PRODUCT"}</button>
            <button className="btn-ghost" onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}>CANCEL</button>
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
                      ? <input className="input-dark" value={editProduct.name} onChange={(e) => setEditProduct((ep) => ({ ...ep, name: e.target.value }))} style={{ padding: "6px 10px", fontSize: 11 }} />
                      : <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1 }}>{p.name}</div>}
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
                          <button onClick={() => { setEditProduct({ ...p }); setAdding(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="edit" size={16} /></button>
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
