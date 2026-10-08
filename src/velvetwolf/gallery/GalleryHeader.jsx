// Site header from the VelvetWolf Gallery (2027): the wordmark, Shop, Drop 01,
// Studio and the cart. Used on every public page (PublicLayout).
import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { AppContext } from "../pages/AppContext";

export default function GalleryHeader() {
  const { cartCount = 0, setCartOpen } = useContext(AppContext);
  const { pathname, hash } = useLocation();
  // Once content scrolls under it the header gets a solid backing, so links
  // stay legible over the page (the prototype did this for the shop grid).
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const current = (on) => (on ? "page" : undefined);

  return (
    <header className={`vwg-nav${scrolled ? " is-scrolled" : ""}`}>
      <Link className="brand" to="/">VELVETWOLF</Link>
      <nav className="nav-links" aria-label="Primary">
        <Link to="/shop" aria-current={current(pathname === "/shop" || pathname.startsWith("/shop/"))}>Shop</Link>
        <Link to="/#drop" className="hide-sm" aria-current={current(pathname === "/" && hash === "#drop")}>Drop 01</Link>
        <Link to="/custom" aria-current={current(pathname === "/custom")}>Studio</Link>
        <button className="cart-btn" type="button" aria-haspopup="dialog" onClick={() => setCartOpen?.(true)}>
          Cart<span className="cart-count">{cartCount}</span>
        </button>
      </nav>
    </header>
  );
}
