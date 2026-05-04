import { useContext } from "react";
import { AppContext } from "./AppContext";

function WishlistItemCard({ item, onAddToCart, onRemove }) {
  return (
    <div className="vw-wishlist-item" style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "24px", display: "grid", gridTemplateColumns: "1fr auto", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 1, marginBottom: 8 }}>{item.name}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginBottom: 12 }}>
          {item.tag} · {item.sizes?.join(" / ")}
        </div>
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--silver)", lineHeight: 1.6, marginBottom: 18 }}>{item.description}</p>
        <div className="vw-wishlist-actions" style={{ display: "flex", gap: 12 }}>
          <button className="btn-gold" onClick={onAddToCart}>ADD TO CART</button>
          <button
            onClick={onRemove}
            style={{ background: "transparent", border: "1px solid var(--smoke)", color: "var(--silver)", padding: "10px 16px", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2 }}
          >
            REMOVE
          </button>
        </div>
      </div>
      <div className="vw-wishlist-price" style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)" }}>₹{Number(item.price).toLocaleString()}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1 }}>SAVE FOR LATER</div>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const { wishlist, user, setPage, toggleWishlist, addToCart } = useContext(AppContext);

  if (!user) {
    return (
      <div style={{ paddingTop: 70, minHeight: "100vh" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "90px 40px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: 4, marginBottom: 18 }}>WISHLIST</div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginBottom: 28 }}>Sign in to save pieces to your wishlist and sync them with Supabase.</p>
          <button className="btn-gold" onClick={() => setPage("login")}>SIGN IN</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div className="vw-page-hero" style={{ background: "var(--graphite)", padding: "60px 40px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>SYNCED WITH YOUR ACCOUNT</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: 4, marginBottom: 8 }}>YOUR WISHLIST</h1>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--silver)" }}>{wishlist.length} saved pieces</p>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 40px" }}>
        {wishlist.length === 0 ? (
          <div style={{ textAlign: "center", padding: "90px 0", border: "1px solid var(--smoke)", background: "var(--graphite)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 58, opacity: 0.2, marginBottom: 12 }}>EMPTY</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginBottom: 24 }}>Your saved pieces will appear here.</p>
            <button className="btn-gold" onClick={() => setPage("shop")}>EXPLORE PRODUCTS</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {wishlist.map((item) => (
              <WishlistItemCard
                key={item.id}
                item={item}
                onAddToCart={() => addToCart(item, item.sizes?.[0] || "M", item.colors?.[0] || "#0a0a0a")}
                onRemove={() => toggleWishlist(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
