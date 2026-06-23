import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminCoupons, createAdminCoupon, updateAdminCoupon, deleteAdminCoupon } from "../utils/adminApi";
import Icon from "../components/Icon";

export default function AdminCoupons() {
  const { setPage, showToast } = useContext(AppContext);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({ code: "", discount_percent: "", active: true });
  const [editForm, setEditForm] = useState({ code: "", discount_percent: "", active: true });

  const load = () => {
    setLoading(true);
    fetchAdminCoupons()
      .then((res) => setCoupons(res || []))
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          showToast("Session expired.", "error");
          setPage("login");
        } else {
          showToast("Failed to load coupons.", "error");
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
    if (!form.code.trim()) { showToast("Code is required.", "error"); return; }
    if (!form.discount_percent || Number(form.discount_percent) <= 0 || Number(form.discount_percent) > 100) {
      showToast("Enter a discount percent between 1 and 100.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_percent: Number(form.discount_percent),
        active: form.active,
      };
      const res = await createAdminCoupon(payload);
      setCoupons((prev) => [res, ...prev]);
      setAdding(false);
      setForm({ code: "", discount_percent: "", active: true });
      showToast("Coupon created successfully!");
    } catch (err) {
      showToast(err.message || "Failed to create coupon.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (coupon) => {
    setEditingId(coupon.id);
    setEditForm({
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      active: coupon.active,
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.code.trim()) { showToast("Code is required.", "error"); return; }
    if (!editForm.discount_percent || Number(editForm.discount_percent) <= 0 || Number(editForm.discount_percent) > 100) {
      showToast("Discount must be 1-100.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: editForm.code.trim().toUpperCase(),
        discount_percent: Number(editForm.discount_percent),
        active: editForm.active,
      };
      const res = await updateAdminCoupon(id, payload);
      setCoupons((prev) => prev.map((c) => (c.id === id ? res : c)));
      setEditingId(null);
      showToast("Coupon updated!");
    } catch (err) {
      showToast(err.message || "Failed to update coupon.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    setSaving(true);
    try {
      const payload = { active: !coupon.active };
      const res = await updateAdminCoupon(coupon.id, payload);
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? res : c)));
      showToast(res.active ? "Coupon activated" : "Coupon deactivated", "info");
    } catch (err) {
      showToast(err.message || "Failed to update coupon status.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    setSaving(true);
    try {
      await deleteAdminCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showToast("Coupon deleted.", "info");
    } catch (err) {
      showToast(err.message || "Failed to delete coupon.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="vw-admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>COUPONS</h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginTop: 6 }}>{coupons.length} TOTAL</div>
        </div>
        <div>
          <button className="btn-gold" onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="plus" size={14} /> ADD COUPON
          </button>
        </div>
      </div>

      {adding && (
        <div className="vw-admin-panel" style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: "28px", marginBottom: 28 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 20 }}>NEW COUPON</h3>
          <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <input
              className="input-dark"
              placeholder="COUPON CODE (e.g. WOLF50) *"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
            />
            <input
              className="input-dark"
              placeholder="DISCOUNT PERCENT (1 - 100) *"
              type="number"
              value={form.discount_percent}
              onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
              required
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                ACTIVE ON CREATION
              </label>
            </div>
            <div className="vw-admin-form-actions" style={{ display: "flex", gap: 12, marginTop: 10, gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-gold" disabled={saving}>
                {saving ? "SAVING..." : "CREATE COUPON"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setAdding(false); setForm({ code: "", discount_percent: "", active: true }); }}>
                CANCEL
              </button>
            </div>
          </form>
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
                  {["CODE", "DISCOUNT", "STATUS", "ACTIONS"].map((h) => (
                    <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "40px 16px", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>
                      No coupons found
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id} style={{ borderBottom: "1px solid var(--smoke)", background: coupon.active ? "transparent" : "rgba(255,255,255,0.01)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        {editingId === coupon.id ? (
                          <input
                            className="input-dark"
                            value={editForm.code}
                            onChange={(e) => setEditForm((ef) => ({ ...ef, code: e.target.value }))}
                            style={{ padding: "6px 10px", fontSize: 12, width: 150 }}
                          />
                        ) : (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: "bold", letterSpacing: 1, color: coupon.active ? "var(--gold)" : "var(--silver)" }}>
                            {coupon.code}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {editingId === coupon.id ? (
                          <input
                            className="input-dark"
                            type="number"
                            value={editForm.discount_percent}
                            onChange={(e) => setEditForm((ef) => ({ ...ef, discount_percent: e.target.value }))}
                            style={{ padding: "6px 10px", fontSize: 12, width: 80 }}
                          />
                        ) : (
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
                            {coupon.discount_percent}% OFF
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {editingId === coupon.id ? (
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={editForm.active}
                              onChange={(e) => setEditForm((ef) => ({ ...ef, active: e.target.checked }))}
                            />
                            ACTIVE
                          </label>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            disabled={saving}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: 0
                            }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: coupon.active ? "#81c784" : "#ff8a65", display: "inline-block" }} />
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: coupon.active ? "#81c784" : "#ff8a65" }}>
                              {coupon.active ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </button>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {editingId === coupon.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(coupon.id)}
                                disabled={saving}
                                style={{ background: "none", border: "1px solid #81c784", color: "#81c784", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}
                              >
                                SAVE
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                style={{ background: "none", border: "1px solid var(--smoke)", color: "var(--silver)", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 11 }}
                              >
                                CANCEL
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(coupon)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}
                              >
                                <Icon name="edit" size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(coupon.id)}
                                disabled={saving}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wolf-red)" }}
                              >
                                <Icon name="trash" size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
