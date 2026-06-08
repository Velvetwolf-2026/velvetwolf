import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminCustomers } from "../utils/adminApi";

export default function AdminCustomers() {
  const { setPage, showToast } = useContext(AppContext);
  const [customers, setCustomers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);

  const load = (q) => {
    setLoading(true);
    fetchAdminCustomers({ search: q || undefined })
      .then((res) => { setCustomers(res.customers || []); setTotal(res.total || 0); })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) { showToast("Session expired.", "error"); setPage("login"); }
        else showToast("Failed to load customers.", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(""); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgSpend = customers.length > 0 ? Math.round(totalRevenue / customers.length) : 0;

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>CUSTOMERS</h1>
      </div>

      {/* Summary cards */}
      <div className="vw-admin-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          ["TOTAL CUSTOMERS", total],
          ["TOTAL REVENUE",   `₹${totalRevenue.toLocaleString()}`],
          ["AVG SPEND",       `₹${avgSpend.toLocaleString()}`],
        ].map(([label, val]) => (
          <div className="vw-admin-stat-card" key={label} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "20px 24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)", marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <form className="vw-admin-customer-search" onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input
          className="input-dark"
          placeholder="SEARCH BY NAME OR EMAIL"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-gold" style={{ padding: "0 20px", fontSize: 10 }}>SEARCH</button>
        {search && (
          <button type="button" className="btn-ghost" style={{ padding: "0 14px", fontSize: 10 }} onClick={() => { setSearch(""); load(""); }}>CLEAR</button>
        )}
      </form>

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>LOADING...</div>
        ) : (
          <div className="vw-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
                {["CUSTOMER", "EMAIL", "ORDERS", "TOTAL SPENT", "JOINED", "VERIFIED"].map((h) => (
                  <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>No customers found</td></tr>
              ) : customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--smoke)" }}>
                  <td style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ivory)", padding: "14px 16px" }}>{c.name || "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", padding: "14px 16px" }}>{c.email}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ash)", padding: "14px 16px" }}>{c.orderCount}</td>
                  <td style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)", padding: "14px 16px" }}>₹{c.totalSpent.toLocaleString()}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", padding: "14px 16px" }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, padding: "3px 8px", background: c.isVerified ? "rgba(129,199,132,0.2)" : "rgba(255,138,128,0.2)", color: c.isVerified ? "#81c784" : "#ff8a80" }}>
                      {c.isVerified ? "VERIFIED" : "PENDING"}
                    </span>
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
