import React, { useContext } from "react";
import { AppContext } from "../pages/AppContext";
import Icon from "./Icon";
import ProductImage from "./ProductImage";

export default function CartSidebar() {
  const { cart, setCartOpen, removeFromCart, updateCartQty, cartTotal, setPage } = useContext(AppContext);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setCartOpen(false)} />
      <div className="sidebar" style={{ right: 0 }}>
        <div style={{ padding: "30px 28px", borderBottom: "1px solid var(--smoke)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 3 }}>YOUR CART</h2>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginTop: 4 }}>{cart.length} ITEMS</div>
          </div>
          <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="x" size={22} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--silver)" }}>
              <Icon name="cart" size={48} color="var(--smoke)" />
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", marginTop: 16 }}>Your cart is empty</p>
            </div>
          ) : cart.map((item, i) => (
            <div key={i} style={{ padding: "20px 0", borderBottom: "1px solid var(--smoke)", display: "flex", gap: 16 }}>
              <div style={{ width: 70, height: 80, flexShrink: 0 }}>
                <ProductImage product={item} height={80} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 1, marginBottom: 4 }}>{item.name}</h4>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1, marginBottom: 10 }}>SIZE: {item.size}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--smoke)" }}>
                    <button onClick={() => updateCartQty(item.id, item.size, item.color, item.qty - 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "4px 10px" }}><Icon name="minus" size={12} /></button>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "0 10px" }}>{item.qty}</span>
                    <button onClick={() => updateCartQty(item.id, item.size, item.color, item.qty + 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "4px 10px" }}><Icon name="plus" size={12} /></button>
                  </div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)" }}>{"\u20b9"}{(item.price * item.qty).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id, item.size, item.color)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)", alignSelf: "flex-start" }}><Icon name="trash" size={14} /></button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: "24px 28px", borderTop: "1px solid var(--smoke)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 2 }}>SUBTOTAL</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ivory)" }}>{"\u20b9"}{cartTotal.toLocaleString()}</span>
            </div>
            {/* Free Shipping Progress Bar */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1 }}>
                {cartTotal >= 1999 ? (
                  <span style={{ color: "#81c784" }}>✓ FREE SHIPPING UNLOCKED</span>
                ) : (
                  <span style={{ color: "var(--silver)" }}>
                    {"\u20b9"}{(1999 - cartTotal).toLocaleString()} AWAY FROM FREE SHIPPING
                  </span>
                )}
                <span style={{ color: "var(--silver)" }}>
                  {Math.min(100, Math.round((cartTotal / 1999) * 100))}%
                </span>
              </div>
              <div style={{ width: "100%", height: 4, background: "var(--smoke)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, (cartTotal / 1999) * 100)}%`,
                  height: "100%",
                  background: cartTotal >= 1999 ? "#81c784" : "var(--gold)",
                  transition: "width 0.3s ease"
                }} />
              </div>
            </div>
            <button className="btn-gold" style={{ width: "100%", marginBottom: 10 }} onClick={() => { setCartOpen(false); setPage("checkout"); }}>PROCEED TO CHECKOUT</button>
            <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setCartOpen(false)}>CONTINUE SHOPPING</button>
          </div>
        )}
      </div>
    </div>
  );
}
