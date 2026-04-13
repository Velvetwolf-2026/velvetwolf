import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminOrders, updateOrderStatus } from "../utils/adminApi";
import { StatusBadge } from "./AdminDashboard";

const STATUS_FILTERS = ["all", "pending", "confirmed", "processing", "in_production", "dispatched", "delivered", "cancelled"];
const STATUS_OPTIONS  = ["pending", "confirmed", "processing", "in_production", "dispatched", "delivered", "cancelled"];

export default function AdminOrders() {
  const { setPage, showToast } = useContext(AppContext);
  const [orders, setOrders]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [filter, setFilter]   = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = (status) => {
    setLoading(true);
    fetchAdminOrders({ status: status === "all" ? undefined : status })
      .then((res) => { setOrders(res.orders || []); setTotal(res.total || 0); })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) { showToast("Session expired.", "error"); setPage("login"); }
        else showToast("Failed to load orders.", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      showToast("Order status updated.");
    } catch (err) {
      showToast(err.message || "Failed to update status.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>ORDERS</h1>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", marginTop: 6 }}>{total} TOTAL</div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? "var(--gold)" : "transparent", border: "1px solid", borderColor: filter === s ? "var(--gold)" : "var(--smoke)", color: filter === s ? "var(--obsidian)" : "var(--silver)", padding: "6px 14px", fontFamily: "var(--font-mono)", fontSize: 8, cursor: "pointer", letterSpacing: 2 }}>
            {s.replace(/_/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 2 }}>LOADING...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
                {["ORDER ID", "CUSTOMER", "DATE", "ITEMS", "TOTAL", "STATUS", "UPDATE"].map((h) => (
                  <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>No orders found</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid var(--smoke)", opacity: updatingId === o.id ? 0.6 : 1 }}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", padding: "14px 16px", letterSpacing: 1 }}>{String(o.id).slice(0, 8).toUpperCase()}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ash)" }}>{o.customerName}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)", marginTop: 2 }}>{o.customerEmail}</div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "14px 16px" }}>{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", padding: "14px 16px" }}>{(o.order_items || []).length}</td>
                  <td style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ivory)", padding: "14px 16px" }}>₹{Number(o.total_amount || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: "14px 16px" }}>
                    <select
                      className="input-dark"
                      value={o.status || "pending"}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      disabled={updatingId === o.id}
                      style={{ padding: "4px 8px", fontSize: 9, fontFamily: "var(--font-mono)" }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
