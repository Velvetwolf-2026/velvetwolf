import React, { useContext } from "react";
import { AppContext } from "../pages/AppContext";
import Icon from "./Icon";
import ProductImage from "./ProductImage";

export default function WishlistSidebar() {
  const { wishlist, setWishlistOpen, toggleWishlist, addToCart } = useContext(AppContext);
  
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setWishlistOpen(false)}/>
      <div className="sidebar">
        <div style={{ padding: "30px 28px", borderBottom: "1px solid var(--smoke)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 3 }}>WISHLIST</h2>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginTop: 4 }}>{wishlist.length} SAVED PIECES</div>
          </div>
          <button onClick={() => setWishlistOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="x" size={22}/></button>
        </div>
        <div style={{ padding: "0 28px", overflowY: "auto", maxHeight: "calc(100vh - 100px)" }}>
          {wishlist.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--silver)" }}>
              <Icon name="heart" size={48} color="var(--smoke)"/>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", marginTop: 16 }}>Nothing saved yet</p>
            </div>
          ) : wishlist.map(item => (
            <div key={item.id} style={{ padding: "20px 0", borderBottom: "1px solid var(--smoke)", display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 70, flexShrink: 0 }}><ProductImage product={item} height={80}/></div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 1, marginBottom: 6 }}>{item.name}</h4>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)", marginBottom: 10 }}>{"\u20b9"}{item.price.toLocaleString()}</div>
                <button className="btn-gold" style={{ padding: "8px 16px", fontSize: 9 }} onClick={async () => {
                  try {
                    await addToCart(item, item.sizes?.[0] || "M", item.colors?.[0] || "#0a0a0a");
                  } catch (err) {
                    console.error('[WishlistSidebar addToCart]', err.message);
                  }
                }}>ADD TO CART</button>
              </div>
              <button onClick={() => toggleWishlist(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wolf-red)" }}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
