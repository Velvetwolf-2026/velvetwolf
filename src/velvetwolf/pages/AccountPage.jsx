import { useState, useEffect, useContext } from "react";
import { AppContext } from "./AppContext";
import { supabase } from "../utils/supabase";
import { getUserOrders } from "../utils/order";

export function AccountPage() {
  const { user, setPage, orders, wishlist, cart, signOutUser, showToast } = useContext(AppContext);
  const [tab, setTab] = useState("overview");
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const databaseUserId = user?.auth_user_id || user?.id || null;

  useEffect(() => {
    if (!databaseUserId || tab !== "orders") return;
    setOrdersLoading(true);
    getUserOrders(databaseUserId)
      .then(data => setUserOrders(data || []))
      .catch(err => console.error('[getUserOrders]', err.message))
      .finally(() => setOrdersLoading(false));

    const channel = supabase
      .channel(`orders:${databaseUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `user_id=eq.${databaseUserId}`,
      }, payload => {
        setUserOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
        showToast(`Order ${payload.new.order_number}: ${payload.new.status}`, 'info');
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [databaseUserId, showToast, tab]);

  const handleSignOut = async () => {
    await signOutUser();
  };

  const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "Wolf";
  const displayInitial = displayName[0].toUpperCase();

  if (!user) {
    return (
      <div style={{ paddingTop: 70, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, marginBottom: 20 }}>SIGN IN REQUIRED</h2>
          <button className="btn-gold" onClick={() => setPage("login")}>SIGN IN</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div style={{ background: "var(--graphite)", padding: "60px 40px 0", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 40 }}>
            <div style={{ width: 72, height: 72, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 28, color: "var(--obsidian)", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
              {displayInitial}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 6 }}>{user.isAdmin ? "ADMIN WOLF" : "WOLF PACK MEMBER"}</div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2 }}>{displayName.toUpperCase()}</h1>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", marginTop: 4 }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            {[["overview", "OVERVIEW"], ["orders", "ORDERS"], ["wishlist", "SAVED"], ["settings", "SETTINGS"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "var(--gold)" : "transparent"}`, color: tab === t ? "var(--gold)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, padding: "12px 24px", cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "40px auto", padding: "0 40px" }}>
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
              {[["ORDERS", userOrders.length], ["WISHLIST", wishlist.length], ["CART ITEMS", cart.length]].map(([label, val]) => (
                <div key={label} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "32px 28px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--silver)", marginBottom: 12 }}>{label}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--gold)" }}>{val}</div>
                </div>
              ))}
            </div>
            {user.isAdmin && (
              <div style={{ background: "linear-gradient(135deg, var(--graphite), rgba(201,168,76,0.1))", border: "1px solid var(--gold)", padding: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>ADMIN ACCESS</div>
                  <p style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>Manage products, orders, and customer analytics</p>
                </div>
                <button className="btn-gold" onClick={() => setPage("admin")}>ADMIN DASHBOARD</button>
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 24 }}>ORDER HISTORY</h2>
            {ordersLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", letterSpacing: 2 }}>
                LOADING ORDERS...
              </div>
            ) : userOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--silver)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
                No orders yet — start shopping!
              </div>
            ) : userOrders.map(order => (
              <div key={order.id} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "24px 28px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", letterSpacing: 2, marginBottom: 6 }}>{order.order_number}</div>
                  <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)", fontSize: 13 }}>
                    {new Date(order.created_at).toLocaleDateString('en-IN')} · {order.order_items?.length || 0} items
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ivory)", marginBottom: 6 }}>₹{order.total_amount?.toLocaleString()}</div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, padding: "3px 10px",
                    background: order.status === "delivered" ? "rgba(129,199,132,0.2)" : order.status === "dispatched" ? "rgba(79,195,247,0.2)" : "rgba(201,168,76,0.2)",
                    color: order.status === "delivered" ? "#81c784" : order.status === "dispatched" ? "#4fc3f7" : "var(--gold)" }}>
                    {order.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "wishlist" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 24 }}>SAVED PIECES</h2>
            {/* Wishlist products grid - uses context.wishlist */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
              {wishlist.map(p => (
                <div key={p.id} style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "20px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 8 }}>{p.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)" }}>₹{p.price}</div>
                </div>
              ))}
            </div>
            {wishlist.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "var(--silver)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>Your wishlist is empty</div>}
          </div>
        )}

        {tab === "settings" && (
          <div style={{ maxWidth: 500 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 32 }}>ACCOUNT SETTINGS</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              <input className="input-dark" defaultValue={displayName} placeholder="FULL NAME"/>
              <input className="input-dark" type="email" defaultValue={user.email} placeholder="EMAIL"/>
              <input className="input-dark" type="tel" placeholder="PHONE NUMBER"/>
            </div>
            <button className="btn-gold" style={{ marginBottom: 16 }}>SAVE CHANGES</button>
            <div style={{ borderTop: "1px solid var(--smoke)", paddingTop: 24, marginTop: 24 }}>
              <button className="btn-ghost" onClick={handleSignOut}>
                SIGN OUT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
