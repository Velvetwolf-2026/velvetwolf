import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { fetchAdminAnalytics } from "../utils/adminApi";

export default function AdminAnalytics() {
  const { setPage, showToast } = useContext(AppContext);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminAnalytics()
      .then(setData)
      .catch((err) => {
        if (err.status === 401 || err.status === 403) { showToast("Session expired.", "error"); setPage("login"); }
        else showToast("Failed to load analytics.", "error");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>INSIGHTS</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>ANALYTICS</h1>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  const monthly = data?.monthlyRevenue || [];
  const maxMonthly = Math.max(...monthly.map((m) => m.revenue), 1);

  const daily = data?.dailyRevenue || [];
  const maxDaily = Math.max(...daily.map((d) => d.revenue), 1);

  const topProducts = data?.topProducts || [];
  const maxQty = Math.max(...topProducts.map((p) => p.quantity), 1);

  const ordersByStatus = data?.ordersByStatus || {};

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>INSIGHTS</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>ANALYTICS</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Monthly revenue chart */}
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px", gridColumn: "1/-1" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>MONTHLY REVENUE (LAST 12 MONTHS)</div>
          {monthly.length === 0 ? (
            <div style={{ fontFamily: "'Roboto', sans-serif",fontSize: 14, fontStyle: "italic", color: "var(--silver)" }}>No data yet.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
              {monthly.map((m, i) => {
                const pct = Math.round((m.revenue / maxMonthly) * 100);
                const isLast = i === monthly.length - 1;
                return (
                  <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--silver)" }}>₹{Math.round(m.revenue / 1000)}k</div>
                    <div style={{ width: "100%", height: `${pct || 2}%`, background: isLast ? "var(--gold)" : "rgba(201,168,76,0.35)", transition: "all 0.3s" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--silver)" }}>{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily revenue — last 30 days */}
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>DAILY REVENUE (LAST 30 DAYS)</div>
          {daily.length === 0 ? (
            <div style={{ fontFamily: "'Roboto', sans-serif",fontSize: 14, fontStyle: "italic", color: "var(--silver)" }}>No data yet.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100 }}>
              {daily.map((d) => {
                const pct = Math.round((d.revenue / maxDaily) * 100);
                return (
                  <div key={d.date} title={`${d.date}: ₹${d.revenue.toLocaleString()}`} style={{ flex: 1, height: `${pct || 2}%`, background: "rgba(201,168,76,0.5)", cursor: "default" }} />
                );
              })}
            </div>
          )}
        </div>

        {/* Orders by status */}
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 24 }}>ORDERS BY STATUS</div>
          {Object.keys(ordersByStatus).length === 0 ? (
            <div style={{ fontFamily: "'Roboto', sans-serif",fontSize: 14, fontStyle: "italic", color: "var(--silver)" }}>No data yet.</div>
          ) : Object.entries(ordersByStatus).map(([status, count]) => {
            const total = Object.values(ordersByStatus).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={status} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)" }}>{status.replace(/_/g, " ").toUpperCase()}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)" }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 3, background: "var(--smoke)" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--gold)" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top products */}
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px", gridColumn: "1/-1" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 24 }}>TOP SELLING PRODUCTS</div>
          {topProducts.length === 0 ? (
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, fontStyle: "italic", color: "var(--silver)" }}>No sales data yet.</div>
          ) : topProducts.map((p) => {
            const pct = Math.round((p.quantity / maxQty) * 100);
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--smoke)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ height: 3, background: "var(--smoke)" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--gold)" }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 80 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)" }}>{p.quantity}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>₹{p.revenue.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
