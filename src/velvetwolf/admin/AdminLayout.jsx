import { useContext, useState } from "react";
import { AppContext } from "../pages/AppContext";
import { COLLECTIONS } from "../pages/Collections";

export default function AdminLayout({ Icon, TAG_COLORS }) {
  const { setPage, adminPage, setAdminPage } = useContext(AppContext);

  const navItems = [
    ["dashboard", "DASHBOARD", "chart"],
    ["products", "PRODUCTS", "package"],
    ["orders", "ORDERS", "cart"],
    ["customers", "CUSTOMERS", "users"],
    ["analytics", "ANALYTICS", "chart"],
    ["settings", "SETTINGS", "settings"],
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--obsidian)" }}>
      <div className="admin-sidebar" style={{ padding: 0 }}>
        <div style={{ padding: "28px 20px", borderBottom: "1px solid var(--smoke)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 4, color: "var(--gold)" }}>VELVETWOLF</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 3, color: "var(--silver)", marginTop: 4 }}>ADMIN PANEL</div>
        </div>
        <div style={{ padding: "20px 0" }}>
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
                fontSize: 9,
                letterSpacing: 2,
                textAlign: "left",
              }}
            >
              <Icon name={icon} size={14} color={adminPage === id ? "var(--gold)" : "var(--silver)"} />
              {label}
            </button>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, padding: "0 16px" }}>
          <button
            onClick={() => setPage("home")}
            className="btn-ghost"
            style={{ width: "100%", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Icon name="arrowRight" size={12} />
            BACK TO STORE
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
        {adminPage === "dashboard" && <AdminDashboard />}
        {adminPage === "products" && <AdminProducts Icon={Icon} TAG_COLORS={TAG_COLORS} />}
        {adminPage === "orders" && <AdminOrders />}
        {adminPage === "customers" && <AdminCustomers />}
        {adminPage === "analytics" && <AdminAnalytics />}
        {adminPage === "settings" && <AdminSettings />}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { orders, customers, products } = useContext(AppContext);
  const revenue = orders.reduce((s, o) => s + Number(o.total_amount || o.total || 0), 0);
  const processingCount = orders.filter((o) =>
    ["processing", "confirmed", "in_production"].includes((o.status || "").toLowerCase())
  ).length;

  const stats = [
    { label: "TOTAL REVENUE", value: `\u20b9${revenue.toLocaleString()}`, sub: "+23% vs last month", color: "var(--gold)" },
    { label: "TOTAL ORDERS", value: orders.length, sub: `${processingCount} processing`, color: "#4fc3f7" },
    { label: "CUSTOMERS", value: customers.length, sub: "2 new this week", color: "#81c784" },
    { label: "PRODUCTS", value: products.length, sub: `${products.filter((p) => (p.stock || 0) < 20).length} low stock`, color: "#ff8a65" },
  ];

  const recentOrders = orders.slice(0, 4);

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>OVERVIEW</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>DASHBOARD</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 40 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: s.color, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 28 }}>
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>MONTHLY REVENUE</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {[40, 65, 48, 80, 72, 90, 85, 95, 70, 88, 92, 100].map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: `${h}%`, background: i === 11 ? "var(--gold)" : "rgba(201,168,76,0.3)", transition: "all 0.3s" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--silver)" }}>{["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>TOP COLLECTIONS</div>
          {[["Silent Luxury", 34], ["AI & Tech", 28], ["Anime", 22], ["Founder", 16]].map(([name, pct]) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)" }}>{name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)" }}>{pct}%</span>
              </div>
              <div style={{ height: 3, background: "var(--smoke)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "var(--gold)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>RECENT ORDERS</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["ORDER ID", "CUSTOMER", "DATE", "TOTAL", "STATUS"].map((h) => (
                <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "8px 0", textAlign: "left", borderBottom: "1px solid var(--smoke)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", padding: "12px 0" }}>{o.order_number || o.id}</td>
                <td style={{ fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--ash)", padding: "12px 0" }}>{o.profiles?.full_name || o.customer || "-"}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "12px 0" }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : o.date || "-"}</td>
                <td style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ivory)", padding: "12px 0" }}>{"\u20b9"}{Number(o.total_amount || o.total || 0).toLocaleString()}</td>
                <td style={{ padding: "12px 0" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "3px 10px", background: ["delivered"].includes((o.status || "").toLowerCase()) ? "rgba(129,199,132,0.2)" : ["dispatched", "shipped"].includes((o.status || "").toLowerCase()) ? "rgba(79,195,247,0.2)" : "rgba(201,168,76,0.2)", color: ["delivered"].includes((o.status || "").toLowerCase()) ? "#81c784" : ["dispatched", "shipped"].includes((o.status || "").toLowerCase()) ? "#4fc3f7" : "var(--gold)" }}>
                    {(o.status || "PENDING").toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminProducts({ Icon, TAG_COLORS }) {
  const { products, setProducts, showToast } = useContext(AppContext);
  const [editProduct, setEditProduct] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newProd, setNewProd] = useState({ name: "", collection: "ai-tech", price: "", originalPrice: "", sizes: ["S", "M", "L", "XL"], colors: ["#0a0a0a"], tag: "NEW", description: "", stock: 50 });

  const handleSave = () => {
    if (editProduct) {
      setProducts((prev) => prev.map((p) => (p.id === editProduct.id ? { ...editProduct } : p)));
      setEditProduct(null);
      showToast("Product updated!");
    }
  };

  const handleAdd = () => {
    if (!newProd.name.trim()) { showToast("Product name is required.", "error"); return; }
    if (!newProd.price || Number(newProd.price) <= 0) { showToast("Enter a valid price.", "error"); return; }
    if (!newProd.originalPrice || Number(newProd.originalPrice) <= 0) { showToast("Enter a valid original price.", "error"); return; }
    if (Number(newProd.originalPrice) < Number(newProd.price)) { showToast("Original price must be >= sale price.", "error"); return; }
    const p = { ...newProd, id: Date.now(), rating: 4.5, reviews: 0, price: Number(newProd.price), originalPrice: Number(newProd.originalPrice) };
    setProducts((prev) => [...prev, p]);
    setAdding(false);
    showToast("Product added!");
    setNewProd({ name: "", collection: "ai-tech", price: "", originalPrice: "", sizes: ["S", "M", "L", "XL"], colors: ["#0a0a0a"], tag: "NEW", description: "", stock: 50 });
  };

  const handleDelete = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast("Product removed", "info");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>PRODUCTS</h1>
        </div>
        <button className="btn-gold" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> ADD PRODUCT</button>
      </div>

      {adding && (
        <div style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: "28px", marginBottom: 28 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 20 }}>NEW PRODUCT</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <input className="input-dark" placeholder="PRODUCT NAME" value={newProd.name} onChange={(e) => setNewProd((p) => ({ ...p, name: e.target.value }))} style={{ gridColumn: "1/-1" }} />
            <select className="input-dark" value={newProd.collection} onChange={(e) => setNewProd((p) => ({ ...p, collection: e.target.value }))}>
              {COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input-dark" value={newProd.tag} onChange={(e) => setNewProd((p) => ({ ...p, tag: e.target.value }))}>
              {Object.keys(TAG_COLORS).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="input-dark" placeholder="PRICE (\u20b9)" type="number" value={newProd.price} onChange={(e) => setNewProd((p) => ({ ...p, price: e.target.value }))} />
            <input className="input-dark" placeholder="ORIGINAL PRICE (\u20b9)" type="number" value={newProd.originalPrice} onChange={(e) => setNewProd((p) => ({ ...p, originalPrice: e.target.value }))} />
            <input className="input-dark" placeholder="STOCK QTY" type="number" value={newProd.stock} onChange={(e) => setNewProd((p) => ({ ...p, stock: e.target.value }))} />
            <textarea className="input-dark" placeholder="DESCRIPTION" value={newProd.description} onChange={(e) => setNewProd((p) => ({ ...p, description: e.target.value }))} style={{ gridColumn: "1/-1" }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button className="btn-gold" onClick={handleAdd}>ADD PRODUCT</button>
            <button className="btn-ghost" onClick={() => setAdding(false)}>CANCEL</button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
              {["PRODUCT", "COLLECTION", "PRICE", "STOCK", "STATUS", "ACTIONS"].map((h) => (
                <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--smoke)" }}>
                <td style={{ padding: "14px 16px" }}>
                  {editProduct?.id === p.id ? <input className="input-dark" value={editProduct.name} onChange={(e) => setEditProduct((ep) => ({ ...ep, name: e.target.value }))} style={{ padding: "6px 10px", fontSize: 11 }} /> : <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1 }}>{p.name}</div>}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "14px 16px", letterSpacing: 1 }}>{COLLECTIONS.find((c) => c.id === p.collection)?.name}</td>
                <td style={{ padding: "14px 16px" }}>
                  {editProduct?.id === p.id ? <input className="input-dark" type="number" value={editProduct.price} onChange={(e) => setEditProduct((ep) => ({ ...ep, price: Number(e.target.value) }))} style={{ padding: "6px 10px", fontSize: 11, width: 90 }} /> : <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)" }}>{"\u20b9"}{p.price.toLocaleString()}</span>}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {editProduct?.id === p.id ? <input className="input-dark" type="number" value={editProduct.stock} onChange={(e) => setEditProduct((ep) => ({ ...ep, stock: Number(e.target.value) }))} style={{ padding: "6px 10px", fontSize: 11, width: 80 }} /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: p.stock < 20 ? "#ff8a65" : "#81c784" }}>{p.stock}</span>}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "3px 8px", background: TAG_COLORS[p.tag]?.bg || "var(--smoke)", color: TAG_COLORS[p.tag]?.color || "var(--ash)" }}>{p.tag}</span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {editProduct?.id === p.id ? (
                      <>
                        <button onClick={handleSave} style={{ background: "none", border: "1px solid #81c784", color: "#81c784", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 9 }}>SAVE</button>
                        <button onClick={() => setEditProduct(null)} style={{ background: "none", border: "1px solid var(--smoke)", color: "var(--silver)", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 9 }}>CANCEL</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditProduct({ ...p })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="edit" size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wolf-red)" }}><Icon name="trash" size={14} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminOrders() {
  const { orders } = useContext(AppContext);
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? orders : orders.filter((o) => (o.status || "").toLowerCase() === filter);

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>ORDERS</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {["all", "pending", "confirmed", "dispatched", "delivered"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? "var(--gold)" : "transparent", border: "1px solid", borderColor: filter === s ? "var(--gold)" : "var(--smoke)", color: filter === s ? "var(--obsidian)" : "var(--silver)", padding: "6px 16px", fontFamily: "var(--font-mono)", fontSize: 9, cursor: "pointer", letterSpacing: 2 }}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
              {["ORDER ID", "CUSTOMER", "DATE", "ITEMS", "TOTAL", "STATUS"].map((h) => (
                <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>No orders found</td>
              </tr>
            ) : filtered.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--smoke)" }}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)", padding: "14px 16px", letterSpacing: 1 }}>{o.order_number || o.id}</td>
                <td style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ash)", padding: "14px 16px" }}>{o.profiles?.full_name || o.customer || "-"}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", padding: "14px 16px" }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : o.date || "-"}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", padding: "14px 16px" }}>{o.order_items?.length ?? o.items ?? "-"}</td>
                <td style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ivory)", padding: "14px 16px" }}>{"\u20b9"}{Number(o.total_amount || o.total || 0).toLocaleString()}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "4px 12px", background: ["delivered"].includes((o.status || "").toLowerCase()) ? "rgba(129,199,132,0.2)" : ["dispatched", "shipped"].includes((o.status || "").toLowerCase()) ? "rgba(79,195,247,0.2)" : ["confirmed", "processing", "in_production"].includes((o.status || "").toLowerCase()) ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.1)", color: ["delivered"].includes((o.status || "").toLowerCase()) ? "#81c784" : ["dispatched", "shipped"].includes((o.status || "").toLowerCase()) ? "#4fc3f7" : ["confirmed", "processing", "in_production"].includes((o.status || "").toLowerCase()) ? "var(--gold)" : "var(--silver)" }}>
                    {(o.status || "PENDING").toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCustomers() {
  const { customers } = useContext(AppContext);
  const tierColors = { Platinum: "#e5e4e2", Gold: "#c9a84c", Silver: "#c0c0c0", Bronze: "#cd7f32" };

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>CUSTOMERS</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[["TOTAL", customers.length], ["PLATINUM", customers.filter((c) => c.tier === "Platinum").length], ["GOLD", customers.filter((c) => c.tier === "Gold").length], ["AVG SPEND", `\u20b9${Math.round(customers.reduce((s, c) => s + c.spent, 0) / customers.length).toLocaleString()}`]].map(([label, val]) => (
          <div key={label} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "20px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
              {["CUSTOMER", "EMAIL", "ORDERS", "TOTAL SPENT", "JOINED", "TIER"].map((h) => (
                <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--smoke)" }}>
                <td style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ivory)", padding: "14px 16px" }}>{c.name}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "14px 16px" }}>{c.email}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ash)", padding: "14px 16px" }}>{c.orders}</td>
                <td style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)", padding: "14px 16px" }}>{"\u20b9"}{c.spent.toLocaleString()}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "14px 16px" }}>{c.joined}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "3px 10px", background: "transparent", border: `1px solid ${tierColors[c.tier]}`, color: tierColors[c.tier] }}>{c.tier.toUpperCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAnalytics() {
  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>INSIGHTS</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>ANALYTICS</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px", gridColumn: "1/-1" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>WEEKLY SALES TREND</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160 }}>
            {[{ day: "MON", val: 65 }, { day: "TUE", val: 80 }, { day: "WED", val: 55 }, { day: "THU", val: 90 }, { day: "FRI", val: 100 }, { day: "SAT", val: 85 }, { day: "SUN", val: 70 }].map((d) => (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>{"\u20b9"}{d.val * 120}</div>
                <div style={{ width: "100%", height: `${d.val}%`, background: d.day === "FRI" ? "var(--gold)" : "rgba(201,168,76,0.35)", position: "relative" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 24 }}>TRAFFIC SOURCES</div>
          {[["Instagram", 42, "#e1306c"], ["Google", 28, "#4285f4"], ["Direct", 18, "#c9a84c"], ["Referral", 12, "#81c784"]].map(([src, pct, col]) => (
            <div key={src} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)" }}>{src}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ash)" }}>{pct}%</span>
              </div>
              <div style={{ height: 4, background: "var(--smoke)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: col }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 24 }}>BEST SELLERS</div>
          {[["Error 404: Sleep", 523, "AI & Tech"], ["Demon Mode", 445, "Anime"], ["Founder's Mindset", 312, "Founder"], ["100 Days of Grind", 267, "Beast Mode"]].map(([name, sales, col]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--smoke)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1 }}>{name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>{col}</div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)" }}>{sales}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminSettings() {
  const { showToast } = useContext(AppContext);

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>CONFIGURE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>SETTINGS</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {[
          { title: "STORE SETTINGS", fields: [["Store Name", "VelvetWolf"], ["Tagline", "Luxury Streetwear"], ["Email", "hello@velvetwolf.in"], ["Phone", "+91 98765 43210"]] },
          { title: "SHIPPING", fields: [["Free Shipping Above (\u20b9)", "1999"], ["Flat Shipping Rate (\u20b9)", "149"], ["Dispatch Time (days)", "2"], ["Return Window (days)", "30"]] },
          { title: "PAYMENT GATEWAYS", fields: [["Razorpay Key", "rzp_test_xxxxx"], ["UPI Handle", "velvetwolf@upi"], ["GST Number", "27XXXXX1234X1ZX"], ["PAN", "XXXXX0000X"]] },
          { title: "NOTIFICATIONS", fields: [["Order Email", "orders@velvetwolf.in"], ["Alert Email", "alerts@velvetwolf.in"], ["SMS Provider", "Twilio"], ["WhatsApp", "+91 98765 43210"]] },
        ].map((section) => (
          <div key={section.title} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>{section.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {section.fields.map(([label, val]) => (
                <div key={label}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, color: "var(--silver)", display: "block", marginBottom: 6 }}>{label}</label>
                  <input className="input-dark" defaultValue={val} style={{ padding: "8px 12px", fontSize: 11 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <button className="btn-gold" onClick={() => showToast("Settings saved successfully!")}>SAVE ALL SETTINGS</button>
      </div>
    </div>
  );
}
