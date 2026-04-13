import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminDashboard } from "../utils/adminApi";

function StatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();
  const styles = {
    delivered:   { bg: "rgba(129,199,132,0.2)", color: "#81c784" },
    dispatched:  { bg: "rgba(79,195,247,0.2)",  color: "#4fc3f7" },
    confirmed:   { bg: "rgba(201,168,76,0.2)",  color: "var(--gold)" },
    processing:  { bg: "rgba(201,168,76,0.2)",  color: "var(--gold)" },
    in_production: { bg: "rgba(201,168,76,0.2)", color: "var(--gold)" },
    cancelled:   { bg: "rgba(192,57,43,0.2)",   color: "#e07070" },
  };
  const { bg, color } = styles[s] || { bg: "rgba(255,255,255,0.1)", color: "var(--silver)" };
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "3px 10px", background: bg, color }}>
      {s.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export default function AdminDashboard() {
  const { setPage, showToast } = useContext(AppContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminDashboard()
      .then(setStats)
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          showToast("Session expired. Please sign in again.", "error");
          setPage("login");
        } else {
          showToast("Failed to load dashboard.", "error");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>OVERVIEW</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>DASHBOARD</h1>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  const statCards = [
    { label: "TOTAL REVENUE",   value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,  color: "var(--gold)" },
    { label: "TOTAL ORDERS",    value: stats?.totalOrders || 0,   sub: `${stats?.processingOrders || 0} processing`, color: "#4fc3f7" },
    { label: "CUSTOMERS",       value: stats?.totalCustomers || 0, color: "#81c784" },
    { label: "PRODUCTS",        value: stats?.totalProducts || 0,  sub: `${stats?.lowStockCount || 0} low stock`,    color: "#ff8a65" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>OVERVIEW</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>DASHBOARD</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 40 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: s.color, marginBottom: 6 }}>{s.value}</div>
            {s.sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)" }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>RECENT ORDERS</div>
        {(stats?.recentOrders || []).length === 0 ? (
          <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)", padding: "24px 0" }}>No orders yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ORDER ID", "CUSTOMER", "DATE", "ITEMS", "TOTAL", "STATUS"].map((h) => (
                  <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "8px 0", textAlign: "left", borderBottom: "1px solid var(--smoke)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.recentOrders || []).map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", padding: "12px 0" }}>{String(o.id).slice(0, 8).toUpperCase()}</td>
                  <td style={{ fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--ash)", padding: "12px 0" }}>{o.customerName}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "12px 0" }}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", padding: "12px 0" }}>{o.itemCount}</td>
                  <td style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ivory)", padding: "12px 0" }}>₹{o.total.toLocaleString()}</td>
                  <td style={{ padding: "12px 0" }}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export { StatusBadge };
