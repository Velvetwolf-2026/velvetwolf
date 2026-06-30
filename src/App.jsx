import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { AppContext } from "./velvetwolf/pages/AppContext";
import { LanguageProvider } from "./velvetwolf/pages/LanguageContext";
const FAQPage = lazy(() => import("./velvetwolf/pages/FAQPage"));
const Policy = lazy(() => import("./velvetwolf/pages/Policy"));
const ShoppingPolicy = lazy(() => import("./velvetwolf/pages/ShoppingPolicy"));
const ContactPage = lazy(() => import("./velvetwolf/pages/ContactPage"));
const ReturnsPage = lazy(() => import("./velvetwolf/pages/ReturnsPage"));
const SizeGuide = lazy(() => import("./velvetwolf/pages/SizeGuide"));
const TermsPage = lazy(() => import("./velvetwolf/pages/TermsPage"));
const TrackOrder = lazy(() => import("./velvetwolf/pages/TrackOrder"));
const ForgetPassword = lazy(() => import("./velvetwolf/pages/ForgetPassword"));
const Login = lazy(() => import("./velvetwolf/pages/Login"));
const AccountPage = lazy(() => import("./velvetwolf/pages/AccountPage"));
const CheckoutPage = lazy(() => import("./velvetwolf/pages/CheckoutPage"));
const PaymentStatusPage = lazy(() => import("./velvetwolf/pages/PaymentStatusPage"));
const CollectionsPage = lazy(() => import("./velvetwolf/pages/Collections"));

const HomePage = lazy(() => import("./velvetwolf/pages/HomePage"));
const ShopPage = lazy(() => import("./velvetwolf/pages/ShopPage"));
const QuizPage = lazy(() => import("./velvetwolf/pages/QuizPage"));
const CustomDesignPage = lazy(() => import("./velvetwolf/pages/CustomDesignPage"));
const BulkOrderPage = lazy(() => import("./velvetwolf/pages/BulkOrderPage"));
const BulkOrderSuccessPage = lazy(() => import("./velvetwolf/pages/BulkOrderSuccessPage"));
const ProductDetailPage = lazy(() => import("./velvetwolf/pages/ProductDetailPage"));
const CartPage = lazy(() => import("./velvetwolf/pages/CartPage"));
const WishlistPage = lazy(() => import("./velvetwolf/pages/WishlistPage"));

import { addCartItemDB, updateCartQtyDB, removeCartItemDB, loadCartFromDB, mergeGuestCart } from "./velvetwolf/utils/cart";
import { toggleWishlistDB, loadWishlistFromDB } from "./velvetwolf/utils/wishlist";
import { loadProductsFromAPI } from "./velvetwolf/utils/products";
import { apiUrl } from "./velvetwolf/utils/api";
import Navbar from "./velvetwolf/components/Navbar";
import Footer from "./velvetwolf/components/Footer";
import ProductModal from "./velvetwolf/components/ProductModal";
import CartSidebar from "./velvetwolf/components/CartSidebar";
import WishlistSidebar from "./velvetwolf/components/WishlistSidebar";
import Toast from "./velvetwolf/components/Toast";
import Icon from "./velvetwolf/components/Icon";
import { trackAddToCart } from "./velvetwolf/utils/analytics";
import AiFashionAssistant from "./velvetwolf/components/AiFashionAssistant";

// Admin layout lazy-loaded
const AdminLayout = lazy(() => import("./velvetwolf/admin/AdminLayout"));


let productsLoadPromise = null;

// Shared layout wrapper for rendering Navbar & Footer
function Layout({ children }) {
  const location = useLocation();

  // Floating back button for all info/policy pages
  const showBackButton = [
    "/privacy-policy",
    "/terms",
    "/shipping-policy",
    "/returns",
    "/size-guide",
    "/track-order",
    "/faq",
    "/contact"
  ].includes(location.pathname);

  return (
    <>
      <Navbar activePage={location.pathname} />
      {children}
      {showBackButton && (
        <button
          onClick={() => window.history.back()}
          style={{
            position: "fixed",
            top: 80,
            left: 24,
            zIndex: 850,
            background: "var(--graphite)",
            border: "1px solid var(--smoke)",
            color: "var(--ash)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: 2,
            padding: "8px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.color = "var(--ash)"; }}
        >
          ← BACK
        </button>
      )}
      <Footer onNavigate={() => { }} />
    </>
  );
}

export default function VelvetWolf() {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminPage, setAdminPage] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orders] = useState([]);
  const [customers] = useState([]);

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
      console.error('[syncCartFromDB]', err.message);
    }
  };

  const syncWishlistFromDB = async (userId) => {
    try {
      const items = await loadWishlistFromDB(userId);
      setWishlist(items);
    } catch (err) {
      console.error('[syncWishlistFromDB]', err.message);
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
      showToast("Added to cart ✓");
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

  const clearCart = () => {
    localStorage.removeItem("vw_guest_cart");
    const backendUserId = getBackendUserId(user);
    if (backendUserId) {
      localStorage.removeItem(`vw_cart_${backendUserId}`);
    }
    setCart([]);
  };

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
      localStorage.removeItem("vw_guest_style_profile");
      // Call backend logout endpoint to clear HttpOnly cookie
      await fetch(apiUrl("/auth/logout"), { method: "POST" });
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
  };

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // Session verification using secure httpOnly cookie on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(apiUrl("/auth/session"));
        const data = await res.json();
        if (data.authenticated && data.user) {
          const normalized = normalizeUserRoleState(data.user);
          setUser(normalized);
          localStorage.setItem("user", JSON.stringify(normalized));
        } else {
          setUser(null);
          localStorage.removeItem("user");
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
          .then(data => {
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

  // Admin access validation
  const canAccessAdmin = Boolean(user?.isAdmin);
  useEffect(() => {
    if (location.pathname.startsWith("/admin") && !canAccessAdmin) {
      if (!user) {
        navigate("/login");
        showToast("Please sign in with an admin account.", "info");
      } else {
        navigate("/account");
        showToast("Admin access required.", "error");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user, canAccessAdmin]);

  return (
    <LanguageProvider>
      <AppContext.Provider value={ctx}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <Suspense fallback={
          <div style={{ minHeight: "100vh", background: "var(--obsidian)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)" }}>LOADING VELVETWOLF...</div>
          </div>
        }>
          <Routes>
            {/* Admin chunk lazy-loaded */}
            <Route
              path="/admin/*"
              element={
                canAccessAdmin ? (
                  <Suspense fallback={
                    <div style={{ minHeight: "100vh", background: "var(--obsidian)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)" }}>LOADING ADMIN...</div>
                    </div>
                  }>
                    <AdminLayout Icon={Icon} />
                  </Suspense>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Standalone Auth Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Login />} />
            <Route path="/forget-password" element={<ForgetPassword />} />

            {/* Pages wrapped with Header & Footer */}
            <Route
              path="*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/quiz" element={<QuizPage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/shop/:collection" element={<ShopPage />} />
                    <Route path="/product/:slug" element={<ProductDetailPage />} />
                    <Route path="/collections" element={<CollectionsPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/payment-status" element={<PaymentStatusPage />} />
                    <Route path="/custom" element={<CustomDesignPage />} />
                    <Route path="/bulk" element={<BulkOrderPage />} />
                    <Route path="/bulk/success" element={<BulkOrderSuccessPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/privacy-policy" element={<Policy />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/shipping-policy" element={<ShoppingPolicy />} />
                    <Route path="/returns" element={<ReturnsPage />} />
                    <Route path="/size-guide" element={<SizeGuide />} />
                    <Route path="/track-order" element={<TrackOrder />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </Suspense>

        {selectedProduct && <ProductModal key={selectedProduct.id} />}
        {cartOpen && <CartSidebar />}
        {wishlistOpen && <WishlistSidebar />}
        <AiFashionAssistant />
      </AppContext.Provider>
    </LanguageProvider>
  );
}
