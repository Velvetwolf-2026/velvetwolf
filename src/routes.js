import { index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "./velvetwolf/pages/Login.jsx", { id: "login" }),
  route("signup", "./velvetwolf/pages/Login.jsx", { id: "signup" }),
  route("forget-password", "./velvetwolf/pages/ForgetPassword.jsx"),
  route("admin/*", "./velvetwolf/components/AdminGate.jsx"),

  layout("./velvetwolf/components/PublicLayout.jsx", [
    index("./velvetwolf/pages/HomePage.jsx"),
    route("quiz", "./velvetwolf/pages/QuizPage.jsx"),
    route("shop", "./velvetwolf/pages/ShopPage.jsx", { id: "shop" }),
    route("shop/:collection", "./velvetwolf/pages/ShopPage.jsx", { id: "shop-collection" }),
    route("product/:slug", "./velvetwolf/pages/ProductDetailPage.jsx"),
    route("collections", "./velvetwolf/pages/Collections.jsx"),
    route("cart", "./velvetwolf/pages/CartPage.jsx"),
    route("wishlist", "./velvetwolf/pages/WishlistPage.jsx"),
    route("account", "./velvetwolf/pages/AccountPage.jsx"),
    route("checkout", "./velvetwolf/pages/CheckoutPage.jsx"),
    route("payment-status", "./velvetwolf/pages/PaymentStatusPage.jsx"),
    route("custom", "./velvetwolf/pages/CustomDesignPage.jsx"),
    route("bulk", "./velvetwolf/pages/BulkOrderPage.jsx"),
    route("bulk/success", "./velvetwolf/pages/BulkOrderSuccessPage.jsx"),
    route("contact", "./velvetwolf/pages/ContactPage.jsx"),
    route("faq", "./velvetwolf/pages/FAQPage.jsx"),
    route("privacy-policy", "./velvetwolf/pages/Policy.jsx"),
    route("terms", "./velvetwolf/pages/TermsPage.jsx"),
    route("shipping-policy", "./velvetwolf/pages/ShoppingPolicy.jsx"),
    route("returns", "./velvetwolf/pages/ReturnsPage.jsx"),
    route("size-guide", "./velvetwolf/pages/SizeGuide.jsx"),
    route("track-order", "./velvetwolf/pages/TrackOrder.jsx"),
    route("*", "./velvetwolf/components/NotFoundRedirect.jsx"),
  ]),

  route("sitemap.xml", "./routes/sitemap-xml.jsx"),
  route("robots.txt", "./routes/robots-txt.jsx"),
  route("healthz", "./routes/healthz.jsx"),
];
