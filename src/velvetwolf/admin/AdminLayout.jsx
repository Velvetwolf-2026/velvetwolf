import { useContext } from "react";
import { AppContext } from "../pages/AppContext";
import AdminDashboard from "./AdminDashboard";
import AdminProducts  from "./AdminProducts";
import AdminOrders    from "./AdminOrders";
import AdminCustomers from "./AdminCustomers";
import AdminAnalytics from "./AdminAnalytics";
import AdminSettings  from "./AdminSettings";

export default function AdminLayout({ Icon, TAG_COLORS }) {
  const { setPage, adminPage, setAdminPage } = useContext(AppContext);

  const navItems = [
    ["dashboard", "DASHBOARD", "chart"],
    ["products",  "PRODUCTS",  "package"],
    ["orders",    "ORDERS",    "cart"],
    ["customers", "CUSTOMERS", "users"],
    ["analytics", "ANALYTICS", "chart"],
    ["settings",  "SETTINGS",  "settings"],
  ];

  return (
    <div className="vw-admin-layout" style={{ display: "flex", minHeight: "100vh", background: "var(--obsidian)" }}>
      {/* Sidebar */}
      <div className="admin-sidebar" style={{ padding: 0, position: "relative" }}>
        <div className="vw-admin-shell-header" style={{ padding: "28px 20px", borderBottom: "1px solid var(--smoke)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 4, color: "var(--gold)" }}>VELVETWOLF</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--silver)", marginTop: 4 }}>ADMIN PANEL</div>
          </div>
          <div className="vw-admin-mobile-title">
            {adminPage.toUpperCase()}
          </div>
        </div>

        <div className="vw-admin-nav" style={{ padding: "20px 0" }}>
          {navItems.map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setAdminPage(id)}
              style={{
                width: "100%",
                background: adminPage === id ? "rgba(201,168,76,0.1)" : "transparent",
                border: "none",
                borderLeft: `3px solid ${adminPage === id ? "var(--gold)" : "transparent"}`,
                color: adminPage === id ? "var(--gold)" : "var(--silver)",
                cursor: "pointer",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 2,
                textAlign: "left",
              }}
            >
              <Icon name={icon} size={14} color={adminPage === id ? "var(--gold)" : "var(--silver)"} />
              {label}
            </button>
          ))}
        </div>

        {/* Back to Store — anchored to sidebar bottom */}
        <div className="vw-admin-back" style={{ position: "absolute", bottom: 20, left: 0, right: 0, padding: "0 16px" }}>
          <button
            onClick={() => setPage("home")}
            className="btn-ghost"
            style={{ width: "100%", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Icon name="arrowRight" size={12} />
            BACK TO STORE
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="vw-admin-main" style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
        {adminPage === "dashboard" && <AdminDashboard />}
        {adminPage === "products"  && <AdminProducts Icon={Icon} TAG_COLORS={TAG_COLORS} />}
        {adminPage === "orders"    && <AdminOrders />}
        {adminPage === "customers" && <AdminCustomers />}
        {adminPage === "analytics" && <AdminAnalytics />}
        {adminPage === "settings"  && <AdminSettings />}
      </div>
    </div>
  );
}
