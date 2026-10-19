// Cart page in the gallery style (same lines as the cart drawer).
import { useContext } from "react";
import { Link } from "react-router";
import { AppContext } from "./AppContext";
import { money, cartThumb } from "../gallery/galleryProducts";

export function meta() {
  return [
    { title: "Your cart · VelvetWolf" },
    { name: "description", content: "The tees in your VelvetWolf cart. Free standard delivery across India." },
    { name: "robots", content: "noindex" },
  ];
}

export default function CartPage() {
  const { cart, removeFromCart, updateCartQty, cartTotal, setPage } = useContext(AppContext);

  return (
    <main className="vwg view-page">
      <div className="page-wrap">
        <header className="page-head">
          <p className="eyebrow">Cart</p>
          <h1 className="page-title">{cart.length ? "Your cart" : "Your cart is empty"}</h1>
          {!cart.length && <p className="page-sub">Add a tee and come back here to pay.</p>}
        </header>

        {!cart.length ? (
          <div><Link className="btn btn-primary" to="/shop">Browse the shop</Link></div>
        ) : (
          <div className="checkout-grid">
            <ul className="cart-list" style={{ borderTop: "1px solid var(--line)" }}>
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

            <aside className="sum-side sum-keep" aria-label="Cart total">
              <h2 className="eyebrow">Summary</h2>
              <dl className="sum-totals">
                <div><dt>Subtotal</dt><dd>{money(cartTotal)}</dd></div>
                <div><dt>Standard delivery</dt><dd>Free</dd></div>
              </dl>
              <p className="fine">Express delivery (₹149) and GST are added at checkout. Prepaid only.</p>
              <button type="button" className="btn btn-primary btn-block" onClick={() => setPage("checkout")}>Checkout</button>
              <Link className="btn btn-block" to="/shop">Keep browsing</Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
