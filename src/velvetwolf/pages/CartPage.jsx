import { useContext } from "react";
import { AppContext } from "./AppContext";
import { useLanguage } from "./LanguageContext";
import { useBreakpoint } from "../utils/breakpoints";
import { HeroHeader } from "../styles/shared";

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
  const { t } = useLanguage();
  const { isMobile } = useBreakpoint();
  return (
    <div className="vw-cart-item" style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "24px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px, 4vw, 26px)", letterSpacing: 1, marginBottom: 6 }}>
          {item.name}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginBottom: 14 }}>
          {t("size").toUpperCase()} {item.size} · {t("color").toUpperCase()} {item.color}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <QuantityButton onClick={() => onQtyChange(item.qty - 1)}>-</QuantityButton>
          <div style={{ minWidth: 32, textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--ivory)" }}>{item.qty}</div>
          <QuantityButton onClick={() => onQtyChange(item.qty + 1)}>+</QuantityButton>
          <button
            onClick={onRemove}
            style={{
              marginLeft: 8,
              background: "transparent",
              border: "1px solid var(--smoke)",
              color: "var(--silver)",
              padding: "8px 12px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: 2,
            }}
          >
            {t("remove")}
          </button>
        </div>
      </div>
      <div style={{ textAlign: isMobile ? "left" : "right", display: "flex", flexDirection: isMobile ? "row" : "column", justifyContent: "space-between", gap: isMobile ? 8 : 0, alignItems: isMobile ? "center" : "initial" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px, 4vw, 28px)", color: "var(--gold)" }}>
          ₹{(Number(item.price) * Number(item.qty)).toLocaleString()}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1 }}>
          ₹{Number(item.price).toLocaleString()} {t("shop") === "दुकान" ? "प्रत्येक" : (t("shop") === "கடை" ? "ஒன்று" : "each")}
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { cart, cartCount, cartTotal, updateCartQty, removeFromCart, setPage, user } = useContext(AppContext);
  const { t } = useLanguage();

  const eyebrowText = user?.id 
    ? (t("shop") === "दुकान" ? "आपके खाते से सिंक किया गया" : (t("shop") === "கடை" ? "உங்கள் கணக்குடன் ஒத்திசைக்கப்பட்டது" : "SYNCED WITH YOUR ACCOUNT")) 
    : (t("shop") === "दुकान" ? "अतिथि कार्ट" : (t("shop") === "கடை" ? "விருந்தினர் கூடை" : "GUEST CART"));

  const subText = `${cartCount} ${t("shop") === "दुकान" ? "वस्तुएं चेकआउट के लिए तैयार हैं" : (t("shop") === "கடை" ? "பொருட்கள் செக்அவுட்டிற்கு தயாராக உள்ளன" : "items ready for checkout")}`;

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <HeroHeader
        eyebrow={eyebrowText}
        title={t("cart").toUpperCase()}
        sub={subText}
      />

      {/* Cart layout — stacks to single column on tablet/mobile via .cart-layout class */}
      <div
        className="cart-layout page-content-pad"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "48px 40px",
          display: "grid",
          gridTemplateColumns: cart.length ? "1fr 360px" : "1fr",
          gap: 32,
        }}
      >
        {/* Items */}
        <div>
          {cart.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 24px",
                border: "1px solid var(--smoke)",
                background: "var(--graphite)",
              }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 8vw, 58px)", opacity: 0.2, marginBottom: 12 }}>
                {t("shop") === "दुकान" ? "खाली" : (t("shop") === "கடை" ? "வெற்று" : "EMPTY")}
              </div>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginBottom: 24 }}>
                {t("emptyCart")}
              </p>
              <button className="btn-gold" onClick={() => setPage("shop")}>
                {t("discoverNow")}
              </button>
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

        {/* Summary panel */}
        {cart.length > 0 && (
          <div
            className="cart-summary"
            style={{
              background: "var(--graphite)",
              border: "1px solid var(--smoke)",
              padding: 28,
              height: "fit-content",
              position: "sticky",
              top: 92,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 24 }}>{t("shop") === "दुकान" ? "सारांश" : (t("shop") === "கடை" ? "சுருக்கம்" : "SUMMARY")}</div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}>
              <span>{t("qty").toUpperCase()}</span>
              <span>{cartCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}>
              <span>{t("subtotal")}</span>
              <span>₹{cartTotal.toLocaleString()}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 22,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: 2,
                color: cartTotal >= 1999 ? "#81c784" : "var(--silver)",
              }}
            >
              <span>{t("shop") === "दुकान" ? "शिपिंग" : (t("shop") === "கடை" ? "ஷிப்பிங்" : "SHIPPING")}</span>
              <span>{cartTotal >= 1999 ? (t("shop") === "दुकान" ? "मुफ़्त" : (t("shop") === "கடை" ? "இலவசம்" : "FREE")) : "₹149"}</span>
            </div>

            <div style={{ borderTop: "1px solid var(--smoke)", paddingTop: 18, display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>{t("shop") === "दुकान" ? "कुल" : (t("shop") === "கடை" ? "மொத்தம்" : "TOTAL")}</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--gold)" }}>
                ₹{(cartTotal + (cartTotal >= 1999 ? 0 : 149)).toLocaleString()}
              </span>
            </div>

            <button className="btn-gold" style={{ width: "100%", marginBottom: 12 }} onClick={() => setPage("checkout")}>
              {t("checkout")}
            </button>
            <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setPage("shop")}>
              {t("continueShopping")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
