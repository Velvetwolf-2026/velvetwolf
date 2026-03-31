import { useContext } from "react";
import { AppContext } from "./AppContext";

function QuantityButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "1px solid var(--smoke)",
        color: "var(--ash)",
        width: 34,
        height: 34,
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

function CartItemCard({ item, onQtyChange, onRemove }) {
  return (
    <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "24px", display: "grid", gridTemplateColumns: "1fr auto", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 1, marginBottom: 8 }}>{item.name}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginBottom: 14 }}>
          SIZE {item.size} · COLOR {item.color}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <QuantityButton onClick={() => onQtyChange(item.qty - 1)}>-</QuantityButton>
          <div style={{ minWidth: 32, textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--ivory)" }}>{item.qty}</div>
          <QuantityButton onClick={() => onQtyChange(item.qty + 1)}>+</QuantityButton>
          <button
            onClick={onRemove}
            style={{ marginLeft: 12, background: "transparent", border: "1px solid var(--smoke)", color: "var(--silver)", padding: "8px 14px", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2 }}
          >
            REMOVE
          </button>
        </div>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)" }}>₹{(Number(item.price) * Number(item.qty)).toLocaleString()}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1 }}>
          ₹{Number(item.price).toLocaleString()} each
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { cart, cartCount, cartTotal, updateCartQty, removeFromCart, setPage, user } = useContext(AppContext);

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div style={{ background: "var(--graphite)", padding: "60px 40px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>
            {user?.id ? "SYNCED WITH YOUR ACCOUNT" : "GUEST CART"}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: 4, marginBottom: 8 }}>YOUR CART</h1>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--silver)" }}>{cartCount} items ready for checkout</p>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 40px", display: "grid", gridTemplateColumns: cart.length ? "1fr 360px" : "1fr", gap: 32 }}>
        <div>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "90px 0", border: "1px solid var(--smoke)", background: "var(--graphite)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 58, opacity: 0.2, marginBottom: 12 }}>EMPTY</div>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginBottom: 24 }}>Your cart is waiting for its first piece.</p>
              <button className="btn-gold" onClick={() => setPage("shop")}>SHOP NOW</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {cart.map((item) => (
                <CartItemCard
                  key={`${item.id}-${item.size}-${item.color}`}
                  item={item}
                  onQtyChange={(qty) => updateCartQty(item.id, item.size, item.color, qty)}
                  onRemove={() => removeFromCart(item.id, item.size, item.color)}
                />
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 28, height: "fit-content", position: "sticky", top: 92 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 24 }}>SUMMARY</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}>
              <span>ITEMS</span>
              <span>{cartCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}>
              <span>SUBTOTAL</span>
              <span>₹{cartTotal.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: cartTotal >= 1999 ? "#81c784" : "var(--silver)" }}>
              <span>SHIPPING</span>
              <span>{cartTotal >= 1999 ? "FREE" : "₹149"}</span>
            </div>
            <div style={{ borderTop: "1px solid var(--smoke)", paddingTop: 18, display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>TOTAL</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--gold)" }}>₹{(cartTotal + (cartTotal >= 1999 ? 0 : 149)).toLocaleString()}</span>
            </div>
            <button className="btn-gold" style={{ width: "100%", marginBottom: 12 }} onClick={() => setPage("checkout")}>PROCEED TO CHECKOUT</button>
            <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setPage("shop")}>CONTINUE SHOPPING</button>
          </div>
        )}
      </div>
    </div>
  );
}
