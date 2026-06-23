import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminCategories, createAdminCategory, deleteAdminCategory } from "../utils/adminApi";
import Icon from "../components/Icon";

export default function AdminCategories() {
  const { setPage, showToast } = useContext(AppContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const [form, setForm] = useState({ id: "", name: "", description: "", icon: "" });

  const load = () => {
    setLoading(true);
    fetchAdminCategories()
      .then((res) => setCategories(res || []))
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          showToast("Session expired.", "error");
          setPage("login");
        } else {
          showToast("Failed to load collections.", "error");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.id.trim()) { showToast("ID is required.", "error"); return; }
    if (!form.name.trim()) { showToast("Name is required.", "error"); return; }

    setSaving(true);
    try {
      const payload = {
        id: form.id.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        icon: form.icon.trim() || null,
      };
      const res = await createAdminCategory(payload);
      setCategories((prev) => [...prev, res]);
      setAdding(false);
      setForm({ id: "", name: "", description: "", icon: "" });
      showToast("Collection added!");
    } catch (err) {
      showToast(err.message || "Failed to add collection.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this collection?")) return;
    setSaving(true);
    try {
      await deleteAdminCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast("Collection removed.", "info");
    } catch (err) {
      showToast(err.message || "Failed to delete collection.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="vw-admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>COLLECTIONS</h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginTop: 6 }}>{categories.length} TOTAL</div>
        </div>
        <div>
          <button className="btn-gold" onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="plus" size={14} /> ADD COLLECTION
          </button>
        </div>
      </div>

      {adding && (
        <div className="vw-admin-panel" style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: "28px", marginBottom: 28 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 20 }}>NEW COLLECTION</h3>
          <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <input
              className="input-dark"
              placeholder="COLLECTION ID (e.g. silent-luxury) *"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              required
            />
            <input
              className="input-dark"
              placeholder="COLLECTION NAME *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="input-dark"
              placeholder="ICON NAME (e.g. Diamond, Whatshot)"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            />
            <input
              className="input-dark"
              placeholder="DESCRIPTION"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ gridColumn: "1 / -1" }}
            />
            <div className="vw-admin-form-actions" style={{ display: "flex", gap: 12, marginTop: 10, gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-gold" disabled={saving}>
                {saving ? "SAVING..." : "ADD COLLECTION"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setAdding(false); setForm({ id: "", name: "", description: "", icon: "" }); }}>
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 24 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>LOADING...</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>No collections found</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  border: "1px solid var(--smoke)",
                  background: "var(--obsidian)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ color: "var(--gold)" }}>
                        <Icon name={cat.icon || "package"} size={18} />
                      </div>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 1 }}>{cat.name}</h3>
                    </div>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={saving}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wolf-red)" }}
                      title="Delete Collection"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                  <p style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "var(--silver)", lineHeight: 1.5, marginBottom: 12 }}>
                    {cat.description || "No description provided."}
                  </p>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, marginTop: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", letterSpacing: 1 }}>
                    ID: {cat.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
