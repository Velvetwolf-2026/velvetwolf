// Cart drawer in the gallery style (prototype ui/cart.js).
import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../pages/AppContext";
import { money, cartThumb } from "../gallery/galleryProducts";
import "../gallery/gallery.css";
import "../gallery/gallery-pages.css";

export default function CartSidebar() {
  const { cart, setCartOpen, removeFromCart, updateCartQty, cartTotal, setPage } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const count = cart.reduce((n, i) => n + (Number(i.qty) || 0), 0);

  // Slide in on mount; slide out before unmounting.
  useEffect(() => {
    // A short timer (not requestAnimationFrame, which pauses in background tabs).
    const id = setTimeout(() => setOpen(true), 16);
    closeRef.current?.focus();
    return () => clearTimeout(id);
  }, []);
  const close = () => {
    setOpen(false);
    setTimeout(() => setCartOpen(false), 300);
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="vwg vwg-cart-layer">
      <div className={`vwg-scrim${open ? " open" : ""}`} onClick={close} aria-hidden="true" />
      <aside className={`vwg-drawer${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="vwg-cart-title">
        <header className="drawer-head">
          <h2 id="vwg-cart-title">Cart <span className="drawer-count">{count}</span></h2>
          <button ref={closeRef} type="button" className="icon-btn" onClick={close} aria-label="Close cart">&times;</button>
        </header>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty.</p>
              <button type="button" className="btn" onClick={() => { close(); setPage("shop"); }}>Browse the shop</button>
            </div>
          ) : (
            <ul className="cart-list">
              {cart.map((item, i) => {
                const src = cartThumb(item);
                return (
                  <li className="cart-item" key={`${item.id}-${item.size}-${item.color}-${i}`}>
                    <span className="cart-thumb">
                      {src ? <img src={src} alt="" loading="lazy" decoding="async" className={item.isCustom ? "is-art" : undefined} /> : null}
                    </span>
                    <span className="cart-info">
                      <span className="cart-name">{item.name}</span>
                      <span className="cart-meta">{[item.color, item.size].filter(Boolean).join(" / ")}</span>
                      <span className="qty" role="group" aria-label={`Quantity of ${item.name}`}>
                        <button type="button" aria-label="One fewer" onClick={() => updateCartQty(item.id, item.size, item.color, item.qty - 1)}>&minus;</button>
                        <span aria-live="polite">{item.qty}</span>
                        <button type="button" aria-label="One more" onClick={() => updateCartQty(item.id, item.size, item.color, item.qty + 1)}>+</button>
                      </span>
                    </span>
                    <span className="cart-side">
                      <span className="cart-price">{money(item.price * item.qty)}</span>
                      <button type="button" className="text-btn" onClick={() => removeFromCart(item.id, item.size, item.color)}>Remove</button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="drawer-foot">
            <div className="sub-row"><span>Subtotal</span><span>{money(cartTotal)}</span></div>
            <p className="fine">Free standard delivery. Express ₹149 and GST are added at checkout. Prepaid only.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => { close(); setPage("checkout"); }}>Checkout</button>
            <button type="button" className="btn btn-block" onClick={close}>Keep browsing</button>
          </footer>
        )}
      </aside>
    </div>
  );
}
