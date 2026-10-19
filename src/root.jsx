import { useState, useEffect, useCallback, useRef } from "react";
import {
  Meta,
  Links,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useLocation,
  useNavigationType,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import { AppContext } from "./velvetwolf/pages/AppContext";
import { LanguageProvider } from "./velvetwolf/pages/LanguageContext";

import { addCartItemDB, updateCartQtyDB, removeCartItemDB, loadCartFromDB, mergeGuestCart, readLocalCart, writeLocalCart, forgetAccountData } from "./velvetwolf/utils/cart";
import { toggleWishlistDB, loadWishlistFromDB } from "./velvetwolf/utils/wishlist";
import { loadProductsFromAPI } from "./velvetwolf/utils/products";
import { apiUrl } from "./velvetwolf/utils/api";
import ProductModal from "./velvetwolf/components/ProductModal";
import CartSidebar from "./velvetwolf/components/CartSidebar";
import WishlistSidebar from "./velvetwolf/components/WishlistSidebar";
import Toast from "./velvetwolf/components/Toast";
import { trackAddToCart } from "./velvetwolf/utils/analytics";
import AiFashionAssistant from "./velvetwolf/components/AiFashionAssistant";
import SilkBackground from "./velvetwolf/components/SilkBackground";
import { isGalleryPath } from "./velvetwolf/gallery/galleryContext";
import SmoothScroll from "./velvetwolf/components/SmoothScroll";
import MetaPixel from "./velvetwolf/components/MetaPixel";

import "./index.css";

// Chrome's default Cross-Origin-Opener-Policy blocks Firebase's popup-based
// Google sign-in from closing its own popup after success — the resulting
// stuck cleanup loop is what caused the runaway request storm during login.
// Opting out here lets Firebase manage its own popup lifecycle normally.
export function headers() {
  return {
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  };
}

// Fallback title and description for any page that doesn't set its own.
export function meta() {
  return [
    { title: "VelvetWolf · Heavyweight oversized tees" },
    { name: "description", content: "Heavyweight oversized tees in five colours, made in Tirupur. Shop the drops or design your own in the VelvetWolf Studio." },
  ];
}

let productsLoadPromise = null;

// The document shell. React Router's framework mode renders this around every
// route on both the server and the client — this replaces index.html.
export function Layout({ children }) {
  return (
    <html lang="en-IN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        {/* canonical, social cards and structured data come from each page (utils/seo.js) */}
        {/* the wolf head from the logo, light on the site's dark ground */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Non-render-blocking font load: fetch as a plain resource, then
            promote it to a stylesheet once loaded. The inline script (not a
            React onLoad prop) is needed because it must exist as real HTML
            before hydration — a JS-attached listener would miss the "already
            loaded" case entirely. */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Roboto:wght@400;500;700&display=swap"
        />
        <link
          rel="stylesheet"
          media="print"
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Roboto:wght@400;500;700&display=swap"
          data-font-swap=""
          suppressHydrationWarning
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.currentScript.previousElementSibling;function swap(){l.media="all";}if(l.sheet){swap();}else{l.addEventListener("load",swap);}})();`,
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Roboto:wght@400;500;700&display=swap"
          />
        </noscript>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Something broke while rendering (or a loader threw). Kept self-contained:
// the app's own layout may be what failed.
export function ErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const link = { color: "#E8E4DA", textDecoration: "underline", textUnderlineOffset: 5, padding: "10px 4px", display: "inline-block" };
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0b", color: "#E8E4DA", display: "grid", placeItems: "center", padding: "32px 20px", fontFamily: "Manrope, 'Helvetica Neue', Arial, sans-serif", textAlign: "center" }}>
      <div style={{ maxWidth: 440, display: "grid", gap: 14 }}>
        <p style={{ margin: 0, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 11, color: "rgba(232,228,218,0.6)" }}>{notFound ? "Error 404" : "Something went wrong"}</p>
        <h1 style={{ margin: 0, fontWeight: 300, fontSize: "clamp(28px, 7vw, 40px)", lineHeight: 1.1 }}>{notFound ? "This page isn't here" : "This page didn't load"}</h1>
        <p style={{ margin: 0, color: "rgba(232,228,218,0.7)" }}>{notFound ? "It may have moved, or the link has a typo." : "Reload the page, or try again in a minute. Your cart is safe."}</p>
        <p style={{ margin: 0, display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/" style={link}>Home</a><a href="/shop" style={link}>Shop</a><a href="/contact" style={link}>Contact us</a>
        </p>
      </div>
    </main>
  );
}

export default function VelvetWolfRoot() {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminPage, setAdminPage] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);

  // PWA install prompt and saved preferences. (Alerts come from real orders and restock alerts:
  // see account/store.js and the bell in the header.)
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [userPreferences, setUserPreferences] = useState({
    sizes: [],
    fits: [],
    colors: [],
    categories: []
  });

  // Hydrate localStorage-backed preferences after mount (unavailable during SSR)
  useEffect(() => {
    // the old sample alerts (made-up restocks and price drops) were kept here; clear them out
    localStorage.removeItem("vw_notifications");
    const savedPreferences = localStorage.getItem("vw_user_preferences");
    if (savedPreferences) setUserPreferences(JSON.parse(savedPreferences));
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const triggerPwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const saveUserPreferences = (prefs) => {
    setUserPreferences(prefs);
    localStorage.setItem("vw_user_preferences", JSON.stringify(prefs));
  };
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orders] = useState([]);
  const [customers] = useState([]);

  // Automatically clear search query when navigating away from shop pages
  useEffect(() => {
    if (!location.pathname.startsWith("/shop")) {
      setSearchQuery("");
    }
  }, [location.pathname]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Compatibility page routing mapping
  const setPage = (nextPage) => {
    const paths = {
      home: "/",
      shop: "/shop",
      collection: "/collections",
      cart: "/cart",
      wishlist: "/account?tab=saved",
      account: "/account",
      checkout: "/checkout",
      "payment-status": "/payment-status",
      custom: "/custom",
      quiz: "/quiz",
      bulk: "/bulk",
      "bulk-success": "/bulk/success",
      contactus: "/contact",
      faq: "/faq",
      privacypolicy: "/privacy-policy",
      termspage: "/terms",
      shoppingpolicy: "/shipping-policy",
      returnspage: "/returns",
      sizeguide: "/size-guide",
      trackorder: "/track-order",
      login: "/login",
      signup: "/signup",
      forgetpassword: "/login",
      admin: "/admin"
    };
    const path = paths[nextPage] || "/";
    navigate(path);
  };

  const openShop = (collection = null) => {
    if (collection) {
      navigate(`/shop/${collection}`);
    } else {
      navigate("/shop");
    }
  };

  const getLocalWishlistKey = (email) => `vw_wishlist_${(email || "guest").toLowerCase()}`;

  const loadLocalWishlist = (email) => {
    try {
      return JSON.parse(localStorage.getItem(getLocalWishlistKey(email)) || "[]");
    } catch {
      return [];
    }
  };

  const saveLocalWishlist = (email, items) => {
    localStorage.setItem(getLocalWishlistKey(email), JSON.stringify(items));
    setWishlist(items);
  };

  const getBackendUserId = (value) => value?.id || null;
  const normalizeUserRoleState = (value = {}) => {
    const role = value?.role || (value?.isAdmin ? "admin" : "customer");
    return {
      ...value,
      role,
      isAdmin: role === "admin",
    };
  };

  const isValidUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // Studio tees (no product row) and anything the server couldn't take live in
  // this browser, under the account's own key when signed in (utils/cart.js).
  // On screen they follow the account's saved items. Saved items carry a
  // cart_item_id; browser-held ones don't.
  const withLocal = (userId, items) => [...items.filter((i) => i.cart_item_id), ...readLocalCart(userId)];
  const sameLine = (i, id, size, color) => i.id === id && i.size === size && i.color === color;

  const syncCartFromDB = async (userId) => {
    try {
      const items = withLocal(userId, await loadCartFromDB(userId));
      setCart(items);
      try { localStorage.setItem(`vw_cart_${userId}`, JSON.stringify(items)); } catch { /* ignore */ }
    } catch (err) {
      console.warn('[syncCartFromDB]', err.message);
      // Offline or the server is busy: show this account's last known cart
      try {
        const cached = JSON.parse(localStorage.getItem(`vw_cart_${userId}`) || "[]");
        if (cached.length > 0) setCart(withLocal(userId, cached));
      } catch { /* ignore */ }
    }
  };

  const syncWishlistFromDB = async (userId) => {
    try {
      const items = await loadWishlistFromDB(userId);
      setWishlist(items);
    } catch (err) {
      console.warn('[syncWishlistFromDB]', err.message);
    }
  };

  // Browser-held items: the guest cart, or a signed-in account's local items.
  const setLocalItems = (userId, items) => {
    writeLocalCart(userId, items);
    setCart((prev) => (userId ? [...prev.filter((i) => i.cart_item_id), ...items] : items));
  };

  const addToCart = async (product, size, color, qty = 1) => {
    try {
      trackAddToCart(product, qty, size, color);
      const backendUserId = getBackendUserId(user);
      let syncedToDb = false;

      if (backendUserId && !product.isCustom && isValidUuid(product?.id)) {
        try {
          await addCartItemDB(backendUserId, product, qty, size, color);
          await syncCartFromDB(backendUserId);
          syncedToDb = true;
        } catch (dbErr) {
          console.warn('[addToCart DB sync fallback]', dbErr.message);
        }
      }

      if (!syncedToDb) {
        const local = readLocalCart(backendUserId);
        const idx = local.findIndex((i) => sameLine(i, product.id, size, color));
        if (idx > -1) local[idx] = { ...local[idx], qty: local[idx].qty + qty };
        else local.push({ ...product, size, color, qty });
        setLocalItems(backendUserId, local);
      }
      showToast("Added to cart ✓");
    } catch (err) {
      showToast('Could not add to cart. Please try again.', 'error');
      console.error('[addToCart]', err.message);
    }
  };

  // Remove and quantity changes show at once; the account's saved cart is
  // updated behind them (and put back from the server if that fails).
  const qtyTimers = useRef(new Map());

  const removeFromCart = async (id, size, color) => {
    const backendUserId = getBackendUserId(user);
    const item = cart.find((i) => sameLine(i, id, size, color));
    if (!item) return;
    if (!item.cart_item_id) {
      setLocalItems(backendUserId, readLocalCart(backendUserId).filter((i) => !sameLine(i, id, size, color)));
      return;
    }
    clearTimeout(qtyTimers.current.get(item.cart_item_id));
    qtyTimers.current.delete(item.cart_item_id);
    setCart((prev) => prev.filter((i) => i.cart_item_id !== item.cart_item_id));
    try {
      await removeCartItemDB(item.cart_item_id);
    } catch (err) {
      showToast('Could not remove item.', 'error');
      console.error('[removeFromCart]', err.message);
      if (backendUserId) await syncCartFromDB(backendUserId);
    }
  };

  const updateCartQty = async (id, size, color, qty) => {
    if (qty < 1) return removeFromCart(id, size, color);
    const backendUserId = getBackendUserId(user);
    const item = cart.find((i) => sameLine(i, id, size, color));
    if (!item) return;
    if (!item.cart_item_id) {
      setLocalItems(backendUserId, readLocalCart(backendUserId).map((i) => (sameLine(i, id, size, color) ? { ...i, qty } : i)));
      return;
    }
    if (Number(item.stock) > 0 && qty > Number(item.stock)) {
      showToast(`Only ${item.stock} left in this size.`, 'info');
      return;
    }
    setCart((prev) => prev.map((i) => (i.cart_item_id === item.cart_item_id ? { ...i, qty } : i)));
    // quick taps on + or - send one update, with the final number
    clearTimeout(qtyTimers.current.get(item.cart_item_id));
    qtyTimers.current.set(item.cart_item_id, setTimeout(async () => {
      qtyTimers.current.delete(item.cart_item_id);
      try {
        await updateCartQtyDB(item.cart_item_id, qty);
      } catch (err) {
        showToast(err.message || 'Could not update quantity.', 'error');
        console.error('[updateCartQty]', err.message);
        if (backendUserId) await syncCartFromDB(backendUserId);
      }
    }, 350));
  };

  const clearCart = useCallback(() => {
    localStorage.removeItem("vw_guest_cart");
    const backendUserId = getBackendUserId(user);
    if (backendUserId) {
      localStorage.removeItem(`vw_cart_${backendUserId}`);
      writeLocalCart(backendUserId, []);
    }
    setCart([]);
  }, [user]);

  const mergeGuestCartToDB = async (userId) => {
    try {
      const guestCart = JSON.parse(localStorage.getItem('vw_guest_cart') || '[]');
      if (guestCart.length > 0) {
        await mergeGuestCart(userId);
        await syncCartFromDB(userId);
      }
    } catch (err) {
      console.error('[mergeGuestCartToDB]', err.message);
    }
  };

  const toggleLocalWishlist = (product) => {
    const current = loadLocalWishlist(user?.email);
    const exists = current.some(item => item.id === product.id);
    const nextWishlist = exists
      ? current.filter(item => item.id !== product.id)
      : [...current, product];
    saveLocalWishlist(user?.email, nextWishlist);
    return !exists;
  };

  const toggleWishlist = async (product) => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      showToast('Sign in to save tees to your list', 'info');
      return;
    }
    const backendUserId = getBackendUserId(user);
    if (!backendUserId) {
      const added = toggleLocalWishlist(product);
      showToast(added ? "Added to wishlist ♥" : "Removed from wishlist", added ? "success" : "info");
      return;
    }
    try {
      const added = await toggleWishlistDB(backendUserId, product);
      await syncWishlistFromDB(backendUserId);
      showToast(added ? "Saved. Find it in Account › Saved." : "Removed from your saved list", added ? "success" : "info");
    } catch (err) {
      showToast('Could not update wishlist', 'error');
      console.error('[toggleWishlist]', err.message);
    }
  };

  // forget: the account was deleted, so nothing of it stays in this browser
  const signOutUser = async ({ forget = false } = {}) => {
    try {
      if (forget) forgetAccountData(user?.id);
      if (user?.id) {
        localStorage.removeItem(`vw_cart_${user.id}`);
      }
      localStorage.removeItem("user");
      localStorage.removeItem("vw_guest_style_profile");
      // Call backend logout endpoint to clear HttpOnly cookie
      await fetch(apiUrl("/auth/logout"), { method: "POST", credentials: 'include' });
      setUser(null);
      setWishlist([]);
      setCart([]);
      navigate("/");
      if (!forget) showToast("Signed out successfully", "info");
    } catch (err) {
      console.error("[signOutUser]", err.message);
      showToast("Sign out failed", "error");
    }
  };

  const cartTotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const cartCount = cart.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  const ctx = {
    page: location.pathname, setPage, adminPage, setAdminPage,
    products, setProducts, cart, setCart,
    wishlist, setWishlist, user, setUser,
    cartOpen, setCartOpen, wishlistOpen, setWishlistOpen,
    authModal, setAuthModal, selectedProduct, setSelectedProduct,
    activeCollection, setActiveCollection, searchQuery, setSearchQuery,
    orders, customers, cartTotal, cartCount,
    addToCart, removeFromCart, updateCartQty, toggleWishlist, signOutUser, showToast, openShop, clearCart,
    deferredPrompt, triggerPwaInstall,
    userPreferences, saveUserPreferences
  };

  const navType = useNavigationType();

  // Scroll position restoration on route navigation
  useEffect(() => {
    const key = `vw_scroll_${location.pathname}`;
    const savedScroll = sessionStorage.getItem(key);

    if (navType === "POP" && savedScroll !== null) {
      const y = parseInt(savedScroll, 10);
      if (!isNaN(y)) {
        setTimeout(() => window.scrollTo({ top: y, behavior: "instant" }), 50);
      }
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    const onScroll = () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sessionStorage.setItem(key, String(window.scrollY));
      window.removeEventListener("scroll", onScroll);
    };
  }, [location.pathname, navType]);

  // Email links (contact details, FAQ answers): a computer with no mail app
  // set up does nothing on mailto:, so also copy the address and say so.
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target?.closest?.('a[href^="mailto:"]');
      if (!a || e.defaultPrevented || e.button !== 0) return;
      const address = decodeURIComponent(a.getAttribute("href").slice(7).split("?")[0]);
      if (!address) return;
      const done = () => showToast(`Opening your email app. ${address} is copied too, in case it doesn't open.`, "info");
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(address).then(done, () => showToast(`Write to us at ${address}`, "info"));
      else showToast(`Write to us at ${address}`, "info");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [showToast]);

  // Handle global unauthorized API calls
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem("user");
    };
    window.addEventListener("vw-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("vw-unauthorized", handleUnauthorized);
  }, []);

  // Session verification using secure httpOnly cookie on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(apiUrl("/auth/session"), { credentials: 'include' });
        const data = await res.json();
        if (data.authenticated && data.user) {
          const normalized = normalizeUserRoleState(data.user);
          setUser(prev => {
            if (prev && prev.id === normalized.id && prev.email === normalized.email && prev.role === normalized.role && prev.personality_type === normalized.personality_type) {
              return prev;
            }
            return normalized;
          });
          localStorage.setItem("user", JSON.stringify(normalized));
        } else {
          // Server returned unauthenticated — clear stale local session to prevent 401 sync loops
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch (err) {
        console.warn("[Background Session Check Failed]", err.message);
        const cachedUser = localStorage.getItem("user");
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            if (parsed) setUser(normalizeUserRoleState(parsed));
          } catch {
            setUser(null);
          }
        }
      }
    };

    // Keep Google redirect params parsing for callbacks
    const query = new URLSearchParams(window.location.search);
    const provider = query.get("provider");
    const authError = query.get("auth_error");
    const authMode = query.get("mode");
    const resetToken = query.get("reset_token");
    const orderId = query.get("order_id");

    if (provider === "google") {
      checkSession().then(() => {
        showToast("Successfully logged in, welcome back!");
        navigate("/account");
      });
    } else if (resetToken) {
      // Password resets are gone (sign-in is code-only): old links just sign in.
      navigate("/login");
    } else if (authError) {
      showToast(decodeURIComponent(authError), "info");
      navigate(authMode === "signup" ? "/signup" : "/login");
    } else if (orderId && location.pathname === "/") {
      checkSession();
      // replace: Back from the payment page must not land on this hop again
      navigate(`/payment-status?order_id=${orderId}`, { replace: true });
    } else {
      checkSession();
    }

    if (provider || authError) {
      query.delete("provider");
      query.delete("mode");
      query.delete("auth_error");
      const nextQuery = query.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync cart and wishlist reactively on user state change
  useEffect(() => {
    const backendUserId = getBackendUserId(user);
    if (backendUserId) {
      syncCartFromDB(backendUserId);
      syncWishlistFromDB(backendUserId);
      mergeGuestCartToDB(backendUserId);

      // Sync guest style profile if present
      const localProfile = localStorage.getItem("vw_guest_style_profile");
      if (localProfile) {
        try {
          const { personalityType, quizScore } = JSON.parse(localProfile);
          fetch(apiUrl("/user/style-profile"), {
            method: "POST",
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ personalityType, quizScore })
          })
            .then(res => {
              if (res.ok) return res.json();
              throw new Error("Sync failed");
            })
            .then(() => {
              localStorage.removeItem("vw_guest_style_profile");
              showToast(`Synced your personality type (${personalityType}) to your account!`);
              setUser(prev => {
                if (!prev || prev.personality_type === personalityType) return prev;
                return { ...prev, personality_type: personalityType };
              });
            })
            .catch(err => {
              console.error("Failed to sync guest style profile to backend", err);
            });
        } catch (e) {
          console.error("Failed to parse guest style profile JSON", e);
        }
      }
    } else {
      setCart(readLocalCart(null));
      setWishlist([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  // Initial products load
  useEffect(() => {
    if (!productsLoadPromise) {
      productsLoadPromise = loadProductsFromAPI();
    }

    let cancelled = false;
    productsLoadPromise
      .then((fetched) => {
        if (!cancelled && fetched.length > 0) setProducts(fetched);
      })
      .catch((err) => console.error('[loadProducts]', err.message));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LanguageProvider>
      <AppContext.Provider value={ctx}>
        <MetaPixel />
        {/* Ambient silk cloth behind the whole site + eased momentum scroll.
            The gallery routes (home, shop) draw their own 3D hall instead. */}
        {!isGalleryPath(location.pathname) && <SilkBackground />}
        <SmoothScroll />

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <Outlet />

        {selectedProduct && <ProductModal key={selectedProduct.id} />}
        {cartOpen && <CartSidebar />}
        {wishlistOpen && <WishlistSidebar />}
        <AiFashionAssistant />
      </AppContext.Provider>
    </LanguageProvider>
  );
}
