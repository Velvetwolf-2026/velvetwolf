import { useContext } from "react";
import { AppContext } from "./AppContext";
import { useBreakpoint } from "../utils/breakpoints";
import { HeroHeader } from "../styles/shared";

function WishlistItemCard({ item, onAddToCart, onRemove }) {
  const { isMobile } = useBreakpoint();
  return (
    <div className="vw-wishlist-item" style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "24px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 1, marginBottom: 8 }}>{item.name}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginBottom: 12 }}>
          {item.tag} · {item.sizes?.join(" / ")}
        </div>
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--silver)", lineHeight: 1.6, marginBottom: 18 }}>{item.description}</p>
        <div className="vw-wishlist-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn-gold" onClick={onAddToCart}>ADD TO CART</button>
          <button
            onClick={onRemove}
            style={{ background: "transparent", border: "1px solid var(--smoke)", color: "var(--silver)", padding: "10px 16px", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2 }}
          >
            REMOVE
          </button>
        </div>
      </div>
      <div className="vw-wishlist-price" style={{ textAlign: isMobile ? "left" : "right", display: "flex", flexDirection: isMobile ? "row" : "column", justifyContent: "space-between", gap: isMobile ? 8 : 0, alignItems: isMobile ? "center" : "initial", borderTop: isMobile ? "1px solid var(--smoke)" : "none", paddingTop: isMobile ? 12 : 0 }}>
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
      <HeroHeader
        eyebrow="SYNCED WITH YOUR ACCOUNT"
        title="YOUR WISHLIST"
        sub={`${wishlist.length} saved pieces`}
      />

      <div className="page-content-pad" style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 40px" }}>
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
