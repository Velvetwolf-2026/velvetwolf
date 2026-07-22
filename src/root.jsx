import { useState, useEffect, useCallback } from "react";
import {
  Meta,
  Links,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useLocation,
} from "react-router";
import { AppContext } from "./velvetwolf/pages/AppContext";
import { LanguageProvider } from "./velvetwolf/pages/LanguageContext";

import { addCartItemDB, updateCartQtyDB, removeCartItemDB, loadCartFromDB, mergeGuestCart } from "./velvetwolf/utils/cart";
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
import SmoothScroll from "./velvetwolf/components/SmoothScroll";

import "./index.css";

let productsLoadPromise = null;

// The document shell. React Router's framework mode renders this around every
// route on both the server and the client — this replaces index.html.
export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="icon" type="image/png" href="/logo.png" />
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
        <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" defer></script>
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ececea", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ margin: 0 }}>Something went wrong</h1>
      <a href="/" style={{ color: "#c9a84c" }}>Return home</a>
    </div>
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

  // Phase 2: PWA, Preferences & Notification Center states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: "notif-1", title: "EXCLUSIVE RESTOCK", message: "Silent Luxury Tees in all sizes are back in stock.", category: "restock", time: "2 hours ago", unread: true },
    { id: "notif-2", title: "PRICE DROP ALERT", message: "Mind Palace Tee is now at ₹1,999 (was ₹2,499).", category: "price-drop", time: "1 day ago", unread: false },
    { id: "notif-3", title: "NEW DROP ACCESS", message: "AI Tech wear drops are now live for Wolf Pack members.", category: "new-drop", time: "2 days ago", unread: false }
  ]);
  const [userPreferences, setUserPreferences] = useState({
    sizes: [],
    fits: [],
    colors: [],
    categories: []
  });

  // Hydrate localStorage-backed preferences after mount (unavailable during SSR)
  useEffect(() => {
    const savedNotifications = localStorage.getItem("vw_notifications");
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
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

  const addNotification = (title, message, category) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      message,
      category,
      time: "Just now",
      unread: true
    };
    setNotifications(prev => {
      const next = [newNotif, ...prev];
      localStorage.setItem("vw_notifications", JSON.stringify(next));
      return next;
    });
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, unread: false }));
      localStorage.setItem("vw_notifications", JSON.stringify(next));
      return next;
    });
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
      wishlist: "/wishlist",
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
      forgetpassword: "/forget-password",
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
  const getGuestCart = () => JSON.parse(localStorage.getItem("vw_guest_cart") || "[]");
  const saveGuestCart = (items) => {
    localStorage.setItem("vw_guest_cart", JSON.stringify(items));
    setCart(items);
  };

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

  const syncCartFromDB = async (userId) => {
    try {
      const items = await loadCartFromDB(userId);
      setCart(items);
      try { localStorage.setItem(`vw_cart_${userId}`, JSON.stringify(items)); } catch { /* ignore */ }
    } catch (err) {
      if (err.message === "Authentication required." || err.message.includes("401") || err.message.includes("Unauthorized")) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
      console.warn('[syncCartFromDB]', err.message);
    }
  };

  const syncWishlistFromDB = async (userId) => {
    try {
      const items = await loadWishlistFromDB(userId);
      setWishlist(items);
    } catch (err) {
      if (err.message === "Authentication required." || err.message.includes("401") || err.message.includes("Unauthorized")) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
      console.warn('[syncWishlistFromDB]', err.message);
    }
  };

  const addToCart = async (product, size, color, qty = 1) => {
    try {
      trackAddToCart(product, qty, size, color);
      const backendUserId = getBackendUserId(user);
      if (backendUserId) {
        await addCartItemDB(backendUserId, product, qty, size, color);
        await syncCartFromDB(backendUserId);
      } else {
        const guest = getGuestCart();
        const idx = guest.findIndex(i => i.id === product.id && i.size === size && i.color === color);
        if (idx > -1) guest[idx].qty += qty;
        else guest.push({ ...product, size, color, qty });
        saveGuestCart(guest);
      }
      showToast("Added to cart");
    } catch (err) {
      showToast('Could not add to cart. Please try again.', 'error');
      console.error('[addToCart]', err.message);
    }
  };

  const removeFromCart = async (id, size, color) => {
    try {
      const backendUserId = getBackendUserId(user);
      if (backendUserId) {
        const item = cart.find(i => i.id === id && i.size === size && i.color === color);
        if (item?.cart_item_id) await removeCartItemDB(item.cart_item_id);
        await syncCartFromDB(backendUserId);
      } else {
        saveGuestCart(cart.filter(i => !(i.id === id && i.size === size && i.color === color)));
      }
    } catch (err) {
      showToast('Could not remove item.', 'error');
      console.error('[removeFromCart]', err.message);
    }
  };

  const updateCartQty = async (id, size, color, qty) => {
    try {
      const backendUserId = getBackendUserId(user);
      if (backendUserId) {
        const item = cart.find(i => i.id === id && i.size === size && i.color === color);
        if (item?.cart_item_id) {
          if (qty < 1) {
            await removeCartItemDB(item.cart_item_id);
          } else {
            await updateCartQtyDB(item.cart_item_id, qty);
          }
          await syncCartFromDB(backendUserId);
        }
      } else {
        if (qty < 1) {
          saveGuestCart(cart.filter(i => !(i.id === id && i.size === size && i.color === color)));
        } else {
          saveGuestCart(cart.map(i => i.id === id && i.size === size && i.color === color ? { ...i, qty } : i));
        }
      }
    } catch (err) {
      showToast('Could not update quantity.', 'error');
      console.error('[updateCartQty]', err.message);
      // Force sync to recover from any desync state (like deleted items)
      const backendUserId = getBackendUserId(user);
      if (backendUserId) await syncCartFromDB(backendUserId);
    }
  };

  const clearCart = useCallback(() => {
    localStorage.removeItem("vw_guest_cart");
    const backendUserId = getBackendUserId(user);
    if (backendUserId) {
      localStorage.removeItem(`vw_cart_${backendUserId}`);
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
      navigate('/login');
      showToast('Sign in to save items', 'info');
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
      showToast(added ? "Added to wishlist ♥" : "Removed from wishlist", added ? "success" : "info");
    } catch (err) {
      showToast('Could not update wishlist', 'error');
      console.error('[toggleWishlist]', err.message);
    }
  };

  const signOutUser = async () => {
    try {
      if (user?.id) {
        localStorage.removeItem(`vw_cart_${user.id}`);
      }
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("vw_guest_style_profile");
      // Call backend logout endpoint to clear HttpOnly cookie
      await fetch(apiUrl("/auth/logout"), { method: "POST", credentials: 'include' });
      setUser(null);
      setWishlist([]);
      setCart([]);
      navigate("/");
      showToast("Signed out successfully", "info");
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
    notifications, addNotification, markAllNotificationsRead,
    userPreferences, saveUserPreferences
  };

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // Handle global unauthorized API calls
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
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
          setUser(normalized);
          localStorage.setItem("user", JSON.stringify(normalized));
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
        } else {
          setUser(null);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.warn("[Background Session Check Failed]", err.message);
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
      navigate(`/forget-password?reset_token=${resetToken}`);
    } else if (authError) {
      showToast(decodeURIComponent(authError), "info");
      navigate(authMode === "signup" ? "/signup" : "/login");
    } else if (orderId && location.pathname === "/") {
      checkSession();
      navigate(`/payment-status?order_id=${orderId}`);
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
              "Authorization": `Bearer ${localStorage.getItem("token")}`
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
              setUser(prev => prev ? { ...prev, personality_type: personalityType } : null);
            })
            .catch(err => {
              console.error("Failed to sync guest style profile to backend", err);
            });
        } catch (e) {
          console.error("Failed to parse guest style profile JSON", e);
        }
      }
    } else {
      setCart(getGuestCart());
      setWishlist([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
        {/* Ambient silk cloth behind the whole site + eased momentum scroll */}
        <SilkBackground />
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
