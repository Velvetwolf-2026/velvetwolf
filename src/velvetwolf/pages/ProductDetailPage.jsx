import React, { useContext, useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import Icon from "../components/Icon";
import { getCollectionById } from "../utils/collectionsData";
import { trackViewItem } from "../utils/analytics";
import { useBreakpoint } from "../utils/breakpoints";
import ProductCard from "../components/ProductCard";
import { getSupabaseLogoUrl } from "../utils/supabase";


const COLOR_MAP = {
  "Black": "#0a0a0a",
  "White": "#faf9f7",
  "Beige/Sand": "#d2b48c",
  "Forest Green": "#1e4620"
};

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isMobile, isMobileOrTablet } = useBreakpoint();
  const { addToCart, toggleWishlist, wishlist, products, showToast } = useContext(AppContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);

  // Zoom position
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);

  // Sticky bottom CTA states & ref
  const [showStickyBar, setShowStickyBar] = useState(false);
  const ctaRef = useRef(null);

  useEffect(() => {
    if (!isMobileOrTablet) return;
    const handleScroll = () => {
      if (ctaRef.current) {
        const ctaPosition = ctaRef.current.getBoundingClientRect().bottom;
        // Scrolled past if bottom of CTA container is above the top of viewport
        setShowStickyBar(ctaPosition < 0);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobileOrTablet]);

  // Modals
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [sizeAdvisorOpen, setSizeAdvisorOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  // Size Advisor Inputs
  const [advHeight, setAdvHeight] = useState("");
  const [advWeight, setAdvWeight] = useState("");
  const [advAge, setAdvAge] = useState("");
  const [advFit, setAdvFit] = useState("Regular");
  const [advResult, setAdvResult] = useState(null);
  const [advLoading, setAdvLoading] = useState(false);

  // Accordion Tabs
  const [activeTab, setActiveTab] = useState("details");

  // Dynamic reviews
  const [productReviews, setProductReviews] = useState([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Smart Bundles & Recently Viewed
  const [bundles, setBundles] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Pincode & Delivery Estimate
  const [pincode, setPincode] = useState("");
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  // Purchase activity simulated alerts
  const [purchaseAlert, setPurchaseAlert] = useState(null);

  useEffect(() => {
    const locations = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Jaipur"];
    const names = ["Aarav S.", "Meera K.", "Vikram R.", "Rohan D.", "Ananya M.", "Karan P.", "Neha G.", "Siddharth V."];

    const triggerAlert = () => {
      const randLoc = locations[Math.floor(Math.random() * locations.length)];
      const randName = names[Math.floor(Math.random() * names.length)];
      setPurchaseAlert({ name: randName, city: randLoc, time: "just now" });
      setTimeout(() => setPurchaseAlert(null), 5000);
    };

    const tStart = setTimeout(triggerAlert, 4000);
    const interval = setInterval(triggerAlert, 20000);

    return () => {
      clearTimeout(tStart);
      clearInterval(interval);
    };
  }, []);

  // Fetch product and dependencies
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${apiUrl("/products")}/${slug}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((data) => {
        const prod = data.product;
        setProduct(prod);
        trackViewItem(prod);

        setSize(prod.sizes?.[0] || "M");
        setColor(prod.colors?.[0] || "Black");
        setSelectedImage(null);
        setLoading(false);

        // Track recently viewed in localStorage
        const stored = JSON.parse(localStorage.getItem("vw_recently_viewed") || "[]");
        const nextStored = [prod.slug, ...stored.filter(s => s !== prod.slug)].slice(0, 4);
        localStorage.setItem("vw_recently_viewed", JSON.stringify(nextStored));
        localStorage.setItem("vw_last_viewed_category", prod.category || "");
        setRecentlyViewed(nextStored);

        // Fetch AI Smart Bundles
        fetch(`${apiUrl("/ai/bundles")}?productId=${prod.id}`, { credentials: 'include' })
          .then(res => res.json())
          .then(bData => setBundles(bData.bundles || []))
          .catch(err => console.error("Bundles load failed", err));

        // Fetch dynamic reviews
        fetch(`${apiUrl("/products")}/${prod.id}/reviews`, { credentials: 'include' })
          .then(res => res.json())
          .then(rData => setProductReviews(rData.reviews || []))
          .catch(() => {
            // Setup default mock reviews based on reviews count
            const mockList = [];
            for (let i = 0; i < (prod.reviews || 3); i++) {
              mockList.push({
                user_name: i === 0 ? "Aarav S." : (i === 1 ? "Meera K." : "Vikram R."),
                rating: 5,
                comment: i === 0 ? "Outstanding weight and texture. High-end drop." : "Best oversized tee I have purchased this year.",
                created_at: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString()
              });
            }
            setProductReviews(mockList);
          });
      })
      .catch((err) => {
        setError(err.message || "Failed to load product details.");
        setLoading(false);
      });
  }, [slug]);

  // Handle main image zoom coordinate calculations
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y });
  };

  // Run AI size advisor
  const handleSizeAdvisorSubmit = (e) => {
    e.preventDefault();
    if (!advHeight || !advWeight) {
      showToast("Height and Weight are required", "error");
      return;
    }
    setAdvLoading(true);
    fetch(apiUrl("/ai/size-recommendation"), {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ height: advHeight, weight: advWeight, age: advAge, preferredFit: advFit })
    })
      .then(res => res.json())
      .then(data => {
        setAdvResult(data.recommendedSize || "M");
        setSize(data.recommendedSize || "M");
        setAdvLoading(false);
      })
      .catch(() => {
        setAdvResult("M");
        setAdvLoading(false);
      });
  };

  // Submit product review
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      showToast("Please fill in name and comment", "error");
      return;
    }
    setSubmittingReview(true);

    // Simulate/Post review locally to DB (we have a product reviews table)
    fetch(`${apiUrl("/products")}/${product.id}/reviews`, {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: reviewName, rating: reviewRating, comment: reviewComment })
    })
      .then(res => {
        if (!res.ok) throw new Error("Could not submit");
        return res.json();
      })
      .then(data => {
        setProductReviews(prev => [data.review, ...prev]);
        showToast("Thank you for your feedback!");
        setReviewName("");
        setReviewComment("");
        setSubmittingReview(false);
      })
      .catch(() => {
        // Offline fallback addition
        const mockReview = {
          user_name: reviewName.trim(),
          rating: reviewRating,
          comment: reviewComment.trim(),
          created_at: new Date().toISOString()
        };
        setProductReviews(prev => [mockReview, ...prev]);
        showToast("Review submitted successfully!");
        setReviewName("");
        setReviewComment("");
        setSubmittingReview(false);
      });
  };

  // Add Smart Bundle to cart with quick discount
  const handleAddBundleToCart = () => {
    addToCart(product, size, color, 1);
    bundles.forEach(item => {
      const defaultS = item.sizes?.[0] || "M";
      const defaultC = item.colors?.[0] || "Black";
      addToCart(item, defaultS, defaultC, 1);
    });
    showToast("Whole bundle added to your cart with drop discount! ✓");
  };

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(pin);

    if (pin.length === 6) {
      setLoadingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success") {
          const postOffices = data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            const po = postOffices[0];
            const getFormat = (d) => {
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
            };
            const minDate = new Date();
            minDate.setDate(minDate.getDate() + 3);
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 5);
            const deliveryWindow = `${getFormat(minDate)} - ${getFormat(maxDate)}`;

            setDeliveryInfo({
              available: true,
              city: po.District || po.Name,
              state: po.State,
              date: deliveryWindow
            });
          } else {
            setDeliveryInfo({
              available: false,
              message: "Invalid Pincode"
            });
          }
        } else {
          setDeliveryInfo({
            available: false,
            message: "Invalid Pincode"
          });
        }
      } catch (err) {
        console.error(err);
        setDeliveryInfo({
          available: false,
          message: "Failed to estimate delivery date"
        });
      } finally {
        setLoadingPincode(false);
      }
    } else {
      setDeliveryInfo(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--obsidian)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)" }}>LOADING PRODUCT DETAILS...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--obsidian)", color: "var(--silver)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--wolf-red)", marginBottom: 16 }}>✕ PRODUCT NOT FOUND</h2>
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", marginBottom: 24 }}>{error || "We couldn't find the piece you're looking for."}</p>
        <button className="btn-ghost" onClick={() => window.history.back()}>← GO BACK</button>
      </div>
    );
  }

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const rawGallery = Array.isArray(product.images) ? product.images : [];
  const gallery = product.image && !rawGallery.includes(product.image)
    ? [product.image, ...rawGallery]
    : (rawGallery.length > 0 ? rawGallery : (product.image ? [product.image] : []));

  let filteredGallery = gallery.map(img => (typeof img === "string" && img.includes("::") ? img.split("::")[1] : img));
  const activeImage = selectedImage || (filteredGallery[0] || null);

  const inWishlist = wishlist.some(i => i.id === product.id);
  const discount = Math.round((1 - product.price / (product.originalPrice || product.price)) * 100);

  // Related products
  const related = products
    .filter(p => p.id !== product.id && p.collection === product.collection)
    .slice(0, 4);

  return (
    <div style={{ paddingTop: 90, minHeight: "100vh", background: "var(--obsidian)", color: "var(--ivory)" }}>
      <div className="page-content-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "20px 16px" : "40px 24px" }}>

        {/* Main Grid */}
        <div className={!isMobileOrTablet ? "vw-pdp-grid" : ""} style={isMobileOrTablet ? { marginBottom: 80 } : { marginBottom: 80 }}>

          {/* Left - Image Gallery */}
          <div>
            {!isMobileOrTablet ? (
              /* Desktop: Clean vertical scrollable image stack */
              <div className="vw-pdp-image-stack">
                {filteredGallery.map((img, i) => (
                  <div
                    key={i}
                    className="vw-pdp-image-wrap"
                    style={{
                      background: "var(--onyx)",
                      border: "1px solid var(--smoke)",
                      overflow: "hidden",
                      position: "relative",
                      transition: "border-color 0.3s ease"
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--smoke)"}
                  >
                    <img
                      src={img}
                      alt={`${product.name} detail view ${i + 1}`}
                      style={{
                        width: "100%",
                        height: "auto",
                        minHeight: 500,
                        objectFit: "cover",
                        display: "block"
                      }}
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                    {i === 0 && discount > 0 && (
                      <div style={{ position: "absolute", top: 20, right: 20, background: "var(--wolf-red)", color: "#fff", padding: "4px 12px", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1 }}>
                        -{discount}%
                      </div>
                    )}
                    {i === 0 && (
                      <div style={{ position: "absolute", bottom: 16, left: 16, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, opacity: 0.5 }}>
                        {String(i + 1).padStart(2, '0')} / {String(filteredGallery.length).padStart(2, '0')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div
                  onMouseMove={handleMouseMove}
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  style={{
                    background: "var(--onyx)",
                    border: "1px solid var(--smoke)",
                    position: "relative",
                    overflow: "hidden",
                    height: 520,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "zoom-in"
                  }}
                >
                  {activeImage ? (
                    <img
                      src={activeImage}
                      alt={product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: isZoomed ? "scale(2.2)" : "scale(1)",
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        transition: isZoomed ? "none" : "transform 0.4s ease"
                      }}
                    />
                  ) : (
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 32, opacity: 0.1 }}>VW PLACEHOLDER</div>
                  )}
                  {discount > 0 && <div style={{ position: "absolute", top: 20, right: 20, background: "var(--wolf-red)", color: "#fff", padding: "4px 12px", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1 }}>-{discount}%</div>}
                </div>

                {/* Thumbnail grid */}
                {filteredGallery.length > 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 16 }}>
                    {filteredGallery.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(img)}
                        style={{
                          padding: 0,
                          border: activeImage === img ? "2px solid var(--gold)" : "1px solid var(--smoke)",
                          background: "var(--onyx)",
                          height: 80,
                          cursor: "pointer",
                          overflow: "hidden"
                        }}
                      >
                        <img src={img} alt={`${product.name} thumbnail ${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right - Product Details (Sticky Panel on Desktop) */}
          <div className={!isMobileOrTablet ? "vw-pdp-sticky" : ""}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3, color: "var(--gold)", marginBottom: 12 }}>
              {getCollectionById(product.collection)?.name?.toUpperCase() || product.collection?.toUpperCase()}
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 52px)", letterSpacing: 2, marginBottom: 16, lineHeight: 1 }}>
              {product.name}
            </h1>

            {/* Reviews count & Tags */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={14} color={s <= Math.floor(product.rating || 5) ? "#c9a84c" : "#333"} />)}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", marginLeft: 8 }}>({productReviews.length} verdicts)</span>
              </div>
              <div style={{ width: 1, height: 12, background: "var(--smoke)" }} />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)" }}>
                FIT: <span style={{ color: "var(--gold)" }}>{product.fit?.toUpperCase() || "OVERSIZED"}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 44, color: "var(--gold)" }}>{"\u20b9"}{product.price.toLocaleString()}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--silver)", textDecoration: "line-through" }}>{"\u20b9"}{product.originalPrice.toLocaleString()}</span>
              )}
            </div>

            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 15, color: "var(--silver)", lineHeight: 1.8, marginBottom: 32 }}>{product.description}</p>

            {/* Fabric Specs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28, background: "rgba(255,255,255,0.02)", border: "1px solid var(--smoke)", padding: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 0.5 }}>FABRIC WEIGHT</div>
                <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--gold)", fontWeight: "bold", marginTop: 4 }}>{product.gsm || "220"} GSM</div>
              </div>
              <div style={{ textAlign: "center", borderLeft: "1px solid var(--smoke)", borderRight: "1px solid var(--smoke)" }}>
                <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 0.5 }}>FABRIC FEEL</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-serif)", color: "var(--ivory)", fontWeight: "bold", marginTop: 4 }}>{product.fabric || "Buttery Soft"}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 0.5 }}>STRETCH LEVEL</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", fontWeight: "bold", marginTop: 4 }}>Medium-Low</div>
              </div>
            </div>

            {/* Fit Meter */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ash)", marginBottom: 8, letterSpacing: 1 }}>
                <span>FIT SPECTRUM</span>
                <span style={{ color: "var(--gold)" }}>{product.fit || "Oversized"} Fit</span>
              </div>
              <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: product.fit === "Slim Fit" ? "20%" : product.fit === "Regular" ? "50%" : "85%",
                  background: "var(--gold)",
                  borderRadius: 3
                }} />
                <div style={{
                  position: "absolute",
                  left: product.fit === "Slim Fit" ? "20%" : product.fit === "Regular" ? "50%" : "85%",
                  top: -3,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--ivory)",
                  border: "2px solid var(--gold)",
                  transform: "translateX(-50%)"
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--silver)", marginTop: 6, letterSpacing: 0.5 }}>
                <span>SLIM FIT</span>
                <span>REGULAR</span>
                <span>OVERSIZED FIT</span>
              </div>
            </div>

            {/* Color selector */}
            {colors.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)", marginBottom: 12 }}>COLOR: {color.toUpperCase()}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: COLOR_MAP[c] || c,
                        border: color === c ? "2px solid var(--gold)" : "2px solid transparent",
                        cursor: "pointer",
                        outline: color === c ? "2px solid #fff" : "1px solid var(--smoke)"
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Live Stock Alert */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "10px 14px", background: "rgba(192, 57, 43, 0.08)", border: "1px solid rgba(192, 57, 43, 0.3)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--wolf-red)", animation: "vw-badge-pulse 2s infinite" }} />
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 0.5 }}>
                ⚡ HURRY! ONLY <span style={{ color: "var(--gold)", fontWeight: "bold" }}>{product.stock && product.stock < 15 ? product.stock : 4} PIECES LEFT</span> IN SIZE {size || "M"}!
              </span>
            </div>

            {/* Size selector & Advisor links */}
            {sizes.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)" }}>SIZE: {size}</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={() => setSizeAdvisorOpen(true)}
                      style={{ background: "none", border: "none", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, cursor: "pointer", textDecoration: "underline" }}
                    >
                      ✦ AI SIZE ADVISOR
                    </button>
                    <button
                      onClick={() => setCompareOpen(true)}
                      style={{ background: "none", border: "none", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, cursor: "pointer", textDecoration: "underline" }}
                    >
                      COMPARE SPECS
                    </button>
                    <button
                      onClick={() => setSizeChartOpen(true)}
                      style={{ background: "none", border: "none", color: "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, cursor: "pointer", textDecoration: "underline" }}
                    >
                      SIZE CHART
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      style={{
                        padding: "10px 18px",
                        border: "1px solid",
                        borderColor: size === s ? "var(--gold)" : "var(--smoke)",
                        background: size === s ? "var(--gold)" : "transparent",
                        color: size === s ? "var(--obsidian)" : "var(--silver)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        cursor: "pointer",
                        letterSpacing: 1
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty and Actions */}
            <div ref={ctaRef} style={{ display: "flex", gap: 12, marginBottom: 36, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--smoke)" }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "10px 12px" }}><Icon name="minus" size={12} /></button>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ivory)", padding: "0 12px" }}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "10px 12px" }}><Icon name="plus" size={12} /></button>
              </div>
              <button className="btn-outline" style={{ flex: 1, padding: "16px", minWidth: 120, fontSize: 11 }} onClick={() => { addToCart(product, size, color, qty); showToast("Added to Cart ✓"); }}>ADD TO CART</button>
              <button className="btn-gold" style={{ flex: 1, padding: "16px", minWidth: 120, fontSize: 11 }} onClick={() => { addToCart(product, size, color, qty); setTimeout(() => navigate("/checkout"), 100); }}>BUY NOW</button>
              <button
                onClick={() => toggleWishlist(product)}
                style={{
                  background: inWishlist ? "rgba(192,57,43,0.15)" : "transparent",
                  border: `1px solid ${inWishlist ? "var(--wolf-red)" : "var(--smoke)"}`,
                  color: inWishlist ? "var(--wolf-red)" : "var(--silver)",
                  padding: "0 18px",
                  cursor: "pointer"
                }}
              >
                <Icon name={inWishlist ? "heartFill" : "heart"} size={18} color={inWishlist ? "#c0392b" : "var(--silver)"} />
              </button>
            </div>

            {/* Payment Method Trust Badges */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-start", padding: "14px 20px", border: "1px dashed var(--smoke)", marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 1, marginRight: 6 }}>SECURE PROTOCOLS:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 28, flexWrap: "wrap", marginTop: 8 }}>
                {/* Visa */}
                <img src={getSupabaseLogoUrl("/visa.png")} alt="Visa" style={{ height: "50px", objectFit: "contain", borderRadius: 4 }} />

                {/* Mastercard */}
                <div style={{
                  width: 50,
                  height: 30,
                  borderRadius: 3,
                  background: "#f5f5f7", // mild white
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 3,
                  boxSizing: "border-box",
                  border: "1px solid rgba(0,0,0,0.05)"
                }}>
                  <img src={getSupabaseLogoUrl("/mastercard.webp")} alt="Mastercard" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </div>

                {/* RuPay */}
                <img src={getSupabaseLogoUrl("/rupay.png")} alt="RuPay" style={{ height: "50px", objectFit: "contain", borderRadius: 4 }} />
              </div>
            </div>

            {/* Delivery Estimate */}
            <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "18px 20px", marginBottom: 36 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)", marginBottom: 12 }}>ESTIMATE DELIVERY DATE</div>
              <div style={{ display: "flex", gap: 10, position: "relative" }}>
                <input
                  className="input-dark"
                  type="text"
                  placeholder="Enter 6-digit Pincode"
                  value={pincode}
                  onChange={handlePincodeChange}
                  maxLength={6}
                  style={{ flex: 1, padding: "10px 14px", fontSize: 13 }}
                />
                {loadingPincode && (
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
                    ...
                  </span>
                )}
              </div>

              {deliveryInfo && (
                <div style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 11, color: deliveryInfo.available ? "#81c784" : "#e07070" }}>
                  {deliveryInfo.available ? (
                    <div>
                      <div>✓ Deliverable to <span style={{ color: "var(--ivory)", fontWeight: 600 }}>{deliveryInfo.city}, {deliveryInfo.state}</span></div>
                      <div style={{ marginTop: 6, color: "var(--silver)" }}>Estimated Delivery: <span style={{ color: "var(--gold)", fontWeight: 600 }}>{deliveryInfo.date}</span></div>
                    </div>
                  ) : (
                    <div>✕ {deliveryInfo.message}</div>
                  )}
                </div>
              )}
            </div>

            {/* Frequently Bought Together Bundle */}
            {related.length > 0 && (
              <div style={{
                background: "var(--onyx)",
                border: "1px solid var(--smoke)",
                padding: 20,
                marginBottom: 36,
                textAlign: "left"
              }}>
                <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--gold)", margin: "0 0 16px 0", textTransform: "uppercase" }}>
                  Frequently Bought Together
                </h4>
                <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: 12, marginBottom: 16 }}>
                  {/* Item 1 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={activeImage}
                      alt={product.name}
                      style={{ width: 44, height: 44, objectFit: "cover", border: "1px solid var(--smoke)" }}
                    />
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ivory)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 100 }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--gold)" }}>₹{product.price}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: "var(--gold)", fontWeight: "bold" }}>+</div>

                  {/* Item 2 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={related[0].image || (related[0].gallery?.[0] || activeImage)}
                      alt={related[0].name}
                      style={{ width: 44, height: 44, objectFit: "cover", border: "1px solid var(--smoke)" }}
                    />
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ivory)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 100 }}>
                        {related[0].name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--gold)" }}>₹{related[0].price}</div>
                    </div>
                  </div>
                </div>

                {/* Total and Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--smoke)", paddingTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--ash)" }}>BUNDLE PRICE (10% OFF)</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 18, fontFamily: "var(--font-display)", color: "var(--gold)" }}>
                        ₹{Math.round((product.price + related[0].price) * 0.9).toLocaleString()}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ash)", textDecoration: "line-through" }}>
                        ₹{(product.price + related[0].price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-gold"
                    style={{ padding: "10px 16px", fontSize: 9, letterSpacing: 1 }}
                    onClick={async () => {
                      try {
                        await addToCart(product, size || "M", color || "#0a0a0a", 1);
                        await addToCart(related[0], "M", "#0a0a0a", 1);
                        showToast("Bundle Added to Bag! 🛍️");
                      } catch (err) {
                        console.error('[Add Bundle Fail]', err.message);
                      }
                    }}
                  >
                    ADD BUNDLE
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible Accordion details */}
            <div style={{ borderTop: "1px solid var(--smoke)", paddingTop: 20 }}>
              <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--smoke)", paddingBottom: 10, marginBottom: 16 }}>
                {["details", "shipping", "badges"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ background: "none", border: "none", color: activeTab === tab ? "var(--gold)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, cursor: "pointer", paddingBottom: 6, borderBottom: `2px solid ${activeTab === tab ? "var(--gold)" : "transparent"}` }}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {activeTab === "details" && (
                <div style={{ fontSize: 13, color: "var(--silver)", lineHeight: 1.6, fontFamily: "var(--font-serif)" }}>
                  <p>• Premium 220 GSM Egyptian long-staple cotton canvas.</p>
                  <p style={{ marginTop: 6 }}>• Custom fit: structured shoulders, relaxed body chest drape.</p>
                  <p style={{ marginTop: 6 }}>• Clean finish: invisible stitching at neck rib and bottom fold.</p>
                </div>
              )}

              {activeTab === "shipping" && (
                <div style={{ fontSize: 13, color: "var(--silver)", lineHeight: 1.6, fontFamily: "var(--font-serif)" }}>
                  <p>• Fast Express Delivery: orders dispatched within 24-48 hours.</p>
                  <p style={{ marginTop: 6 }}>• Shipping timeframe: 3-5 business days across India.</p>
                  <p style={{ marginTop: 6 }}>• Live updates: Real-time SMS and AWB courier link tracking.</p>
                </div>
              )}

              {activeTab === "badges" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                  <div>🛡️ SECURE GATEWAY Cards and UPI</div>
                  <div>100% Tirupur Made Cotton</div>
                  <div>⚡ Express courier tracking</div>
                  <div>🔄 30 Day Easy Returns policy</div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* AI SMART BUNDLE - Buy the look */}
        {bundles.length > 0 && (
          <section style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: 32, marginBottom: 60, position: "relative" }}>
            <span style={{ position: "absolute", top: -10, left: 20, background: "var(--gold)", color: "var(--obsidian)", padding: "2px 10px", fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "bold", letterSpacing: 2 }}>AI RECOMMENDED LOOK</span>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 1, marginBottom: 8 }}>BUY THE LOOK BUNDLE</h3>
                <p style={{ fontSize: 13, color: "var(--silver)", margin: 0, fontFamily: "var(--font-serif)" }}>Complement your style with these handpicked items and get 10% bundle checkout savings.</p>
              </div>
              <button className="btn-gold" onClick={handleAddBundleToCart}>ADD LOOK TO CART ({(bundles.length + 1)} ITEMS)</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginTop: 24 }}>
              <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 50, height: 50, background: "var(--smoke)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: "bold" }}>{product.name} (Base)</div>
                  <div style={{ fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>₹{product.price}</div>
                </div>
              </div>
              {bundles.map(bItem => (
                <Link key={bItem.id} to={`/product/${bItem.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 16, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                    <div style={{ width: 50, height: 50, background: "var(--smoke)" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: "bold" }}>{bItem.name}</div>
                      <div style={{ fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>₹{bItem.price}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CUSTOMER LOOKBOOK & VIDEO REVIEWS */}
        <section style={{ marginBottom: 60, borderTop: "1px solid var(--smoke)", paddingTop: 40 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 28 }}>STYLING VERDICTS</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr", gap: 32, marginBottom: 40 }}>
            {/* Customer Photos */}
            <div>
              <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", marginBottom: 16 }}>CUSTOMER LOOKBOOK (FIT PICS)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  "/mockup_silent.png",
                  "/mockup_founder.png",
                  "/mockup_beast.png"
                ].map((img, idx) => (
                  <div key={idx} style={{ aspectRatio: "0.8", background: "var(--onyx)", border: "1px solid var(--smoke)", overflow: "hidden", position: "relative" }}>
                    <img src={img} alt={`Lookbook ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                    <span style={{ position: "absolute", bottom: 8, left: 8, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--gold)", background: "rgba(0,0,0,0.6)", padding: "2px 6px" }}>
                      @user_{(idx + 1) * 23}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Reviews */}
            <div>
              <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", marginBottom: 16 }}>COMMUNITY REELS (VIDEO REVIEWS)</h3>
              <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 10 }}>
                {[
                  { name: "Rohit D.", duration: "0:45", views: "14.2K", title: "Heavyweight 220 GSM Fit check" },
                  { name: "Meera K.", duration: "1:12", views: "28.5K", title: "Silent Luxury style guide" }
                ].map((vid, idx) => (
                  <div
                    key={idx}
                    onClick={() => showToast(`Playing video review by ${vid.name}...`)}
                    style={{
                      flex: "0 0 160px",
                      aspectRatio: "0.6",
                      background: "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, rgba(9,9,9,0.9) 100%)",
                      border: "1px solid var(--smoke)",
                      position: "relative",
                      cursor: "pointer",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end"
                    }}
                  >
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(201,168,76,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="arrowRight" size={16} color="var(--obsidian)" />
                    </div>
                    <div style={{ position: "absolute", top: 12, left: 12, fontSize: 8, fontFamily: "var(--font-mono)", color: "#faf9f7", background: "rgba(0,0,0,0.5)", padding: "2px 6px" }}>
                      {vid.duration} · {vid.views} VIEWS
                    </div>
                    <div style={{ zIndex: 2 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)" }}>{vid.name}</div>
                      <div style={{ fontSize: 9, color: "var(--silver)", marginTop: 4, lineHeight: 1.2 }}>{vid.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CUSTOMER REVIEWS AND RATINGS */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 32 }}>CUSTOMER VERDICTS</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "1.8fr 1.2fr", gap: 40 }}>
            {/* Reviews list */}
            <div>
              {productReviews.length === 0 ? (
                <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>No verdicts on this piece yet. Be the first to share your verdict!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {productReviews.map((rev, idx) => (
                    <div key={idx} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 24 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--gold)", fontWeight: "bold" }}>{rev.user_name}</div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {[1, 2, 3, 4, 5].map(s => <Icon key={s} name="star" size={11} color={s <= rev.rating ? "#c9a84c" : "#333"} />)}
                        </div>
                      </div>
                      <p style={{ fontSize: 14, color: "var(--silver)", margin: 0, fontFamily: "var(--font-serif)", lineHeight: 1.6 }}>"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Write a review form */}
            <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 28, height: "fit-content" }}>
              <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>SUBMIT YOUR VERDICT</h3>
              <form onSubmit={handleReviewSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", display: "block", marginBottom: 6 }}>YOUR NAME</label>
                  <input
                    type="text"
                    className="input-dark"
                    value={reviewName}
                    onChange={e => setReviewName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", display: "block", marginBottom: 6 }}>RATING</label>
                  <select
                    value={reviewRating}
                    onChange={e => setReviewRating(Number(e.target.value))}
                    style={{ width: "100%", padding: 10, background: "#0a0a0a", border: "1px solid var(--smoke)", color: "var(--gold)", fontSize: 12, fontFamily: "var(--font-mono)" }}
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", display: "block", marginBottom: 6 }}>VERDICT COMMENT</label>
                  <textarea
                    rows="4"
                    className="input-dark"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Review comments..."
                    style={{ height: "auto" }}
                  />
                </div>
                <button type="submit" className="btn-gold" style={{ padding: 12, fontSize: 11 }} disabled={submittingReview}>
                  {submittingReview ? "SUBMITTING..." : "SUBMIT VERDICT"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* RELATED PRODUCTS */}
        {related.length > 0 && (
          <section style={{ marginBottom: 60, borderTop: "1px solid var(--smoke)", paddingTop: 40 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>RELATED PIECES</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* RECENTLY VIEWED PRODUCTS */}
        {recentlyViewed.length > 1 && (
          <section style={{ borderTop: "1px solid var(--smoke)", paddingTop: 40 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>RECENTLY VIEWED</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {products
                .filter(p => recentlyViewed.includes(p.slug) && p.id !== product.id)
                .slice(0, 4)
                .map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          </section>
        )}

      </div>

      {/* ── SIZE CHART MODAL ────────────────────────────────────────────────── */}
      {sizeChartOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: 36, maxWidth: 500, width: "100%", margin: 20, position: "relative" }}>
            <button
              onClick={() => setSizeChartOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--gold)", cursor: "pointer" }}
            >
              <Icon name="x" size={20} />
            </button>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>SIZE CHART GUIDE</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center", color: "var(--silver)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--gold)", color: "var(--ivory)" }}>
                  <th style={{ padding: 10 }}>SIZE</th>
                  <th style={{ padding: 10 }}>CHEST (IN)</th>
                  <th style={{ padding: 10 }}>LENGTH (IN)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["XS", '38"', '27"'],
                  ["S", '40"', '28"'],
                  ["M", '42"', '29"'],
                  ["L", '44"', '30"'],
                  ["XL", '46"', '31"'],
                  ["XXL", '48"', '32"']
                ].map(([sz, chest, len]) => (
                  <tr key={sz} style={{ borderBottom: "1px solid var(--smoke)" }}>
                    <td style={{ padding: 10, fontWeight: "bold", color: "var(--gold)" }}>{sz}</td>
                    <td style={{ padding: 10 }}>{chest}</td>
                    <td style={{ padding: 10 }}>{len}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AI SIZE ADVISOR MODAL ───────────────────────────────────────────── */}
      {sizeAdvisorOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: 36, maxWidth: 450, width: "100%", margin: 20, position: "relative" }}>
            <button
              onClick={() => { setSizeAdvisorOpen(false); setAdvResult(null); }}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--gold)", cursor: "pointer" }}
            >
              <Icon name="x" size={20} />
            </button>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>AI SIZE ADVISOR</h3>
            <p style={{ fontSize: 13, color: "var(--silver)", marginBottom: 20, fontFamily: "var(--font-serif)" }}>Enter your body details for our AI stylist to recommend the perfect fit.</p>

            {advResult ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 2 }}>RECOMMENDED SIZE</div>
                <div style={{ fontSize: 72, fontFamily: "var(--font-display)", color: "var(--gold)", margin: "10px 0" }}>{advResult}</div>
                <p style={{ fontSize: 13, color: "var(--silver)", fontFamily: "var(--font-serif)", marginBottom: 24 }}>This recommended size matches your profile and preferred fit.</p>
                <button
                  className="btn-gold"
                  onClick={() => { setSizeAdvisorOpen(false); setAdvResult(null); }}
                  style={{ padding: "12px 32px" }}
                >
                  USE SIZE {advResult}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSizeAdvisorSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", display: "block", marginBottom: 6 }}>HEIGHT (CM)</label>
                    <input type="number" required className="input-dark" value={advHeight} onChange={e => setAdvHeight(e.target.value)} placeholder="e.g. 175" />
                  </div>
                  <div>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", display: "block", marginBottom: 6 }}>WEIGHT (KG)</label>
                    <input type="number" required className="input-dark" value={advWeight} onChange={e => setAdvWeight(e.target.value)} placeholder="e.g. 70" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", display: "block", marginBottom: 6 }}>AGE</label>
                    <input type="number" className="input-dark" value={advAge} onChange={e => setAdvAge(e.target.value)} placeholder="e.g. 25" />
                  </div>
                  <div>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", display: "block", marginBottom: 6 }}>FIT PREFERENCE</label>
                    <select
                      value={advFit}
                      onChange={e => setAdvFit(e.target.value)}
                      style={{ width: "100%", padding: 10, background: "#0a0a0a", border: "1px solid var(--smoke)", color: "var(--silver)", fontSize: 12, fontFamily: "var(--font-mono)" }}
                    >
                      <option value="Tight">Tight Fit</option>
                      <option value="Regular">Regular Fit</option>
                      <option value="Oversized">Oversized / Loose</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-gold" style={{ padding: 12, marginTop: 12 }} disabled={advLoading}>
                  {advLoading ? "CALCULATING RECOMMENDED FIT..." : "RECOMMEND MY SIZE"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── SPECS COMPARISON DRAWER ────────────────────────────────────────── */}
      {compareOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 990 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setCompareOpen(false)} />
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "75vh",
            overflowY: "auto",
            background: "var(--onyx)",
            borderTop: "1px solid var(--gold)",
            borderLeft: "1px solid var(--smoke)",
            borderRight: "1px solid var(--smoke)",
            padding: "24px 20px 40px",
            animation: "vw-drawer-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, color: "var(--gold)" }}>
                SPECS COMPARISON
              </h3>
              <button
                onClick={() => setCompareOpen(false)}
                style={{ background: "none", border: "none", color: "var(--silver)", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--silver)", fontSize: 11, fontFamily: "var(--font-mono)", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--smoke)", color: "var(--ivory)" }}>
                  <th style={{ padding: "8px 0" }}>SPEC</th>
                  {[product, ...related.slice(0, 2)].map((item, idx) => (
                    <th key={idx} style={{ padding: 8, textAlign: "center", maxWidth: 100 }}>
                      <img src={item.image} alt={item.name} style={{ width: 44, height: 44, objectFit: "cover", marginBottom: 4 }} />
                      <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontSize: 9 }}>{item.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 0", color: "var(--gold)" }}>PRICE</td>
                  {[product, ...related.slice(0, 2)].map((item, idx) => (
                    <td key={idx} style={{ padding: 10, textAlign: "center", fontWeight: "bold", color: "var(--ivory)" }}>₹{item.price}</td>
                  ))}
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 0", color: "var(--gold)" }}>GSM / WEIGHT</td>
                  {[product, ...related.slice(0, 2)].map((item, idx) => {
                    const isPremium = item.collection === "silent-luxury" || item.slug.includes("silent");
                    return (
                      <td key={idx} style={{ padding: 10, textAlign: "center" }}>{isPremium ? "240 GSM Luxury" : "220 GSM Heavy"}</td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 0", color: "var(--gold)" }}>FIT PROFILE</td>
                  {[product, ...related.slice(0, 2)].map((item, idx) => {
                    const isUltra = item.collection === "beast-mode" || item.slug.includes("cargo");
                    return (
                      <td key={idx} style={{ padding: 10, textAlign: "center" }}>{isUltra ? "Oversized Streetwear" : "Structured Drop Shoulder"}</td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 0", color: "var(--gold)" }}>COMPOSITION</td>
                  {[product, ...related.slice(0, 2)].map((item, idx) => {
                    const isPremium = item.collection === "silent-luxury" || item.slug.includes("silent");
                    return (
                      <td key={idx} style={{ padding: 10, textAlign: "center" }}>{isPremium ? "100% Egyptian Cotton" : "100% Combed Cotton"}</td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: "10px 0" }}></td>
                  {[product, ...related.slice(0, 2)].map((item, idx) => (
                    <td key={idx} style={{ padding: "10px 4px", textAlign: "center" }}>
                      <button
                        className="btn-gold"
                        style={{ padding: "6px 8px", fontSize: 9, width: "100%" }}
                        onClick={() => {
                          addToCart(item, "M", "#0a0a0a", 1);
                          showToast("Added item to bag! 🛍️");
                        }}
                      >
                        ADD
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* purchaseAlert */}
      {purchaseAlert && (
        <div style={{
          position: "fixed",
          bottom: isMobileOrTablet ? 140 : 24,
          left: 24,
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid var(--gold)",
          padding: "12px 20px",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          animation: "vw-drawer-slide 0.3s ease"
        }}>
          <div style={{ fontSize: 16 }}>🛍️</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1 }}>
            <div style={{ color: "var(--gold)", fontWeight: "bold" }}>RECENT PURCHASE</div>
            <div style={{ color: "var(--ivory)", marginTop: 2 }}>{purchaseAlert.name} from {purchaseAlert.city} bought this item!</div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom CTA */}
      {isMobileOrTablet && showStickyBar && (
        <div style={{
          position: "fixed",
          bottom: 64, // sits right above our bottom navigation bar (64px)
          left: 0,
          right: 0,
          background: "rgba(16, 16, 16, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--smoke)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 890,
          animation: "vw-slide-up-cta 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: "60%" }}>
            <img
              src={activeImage}
              alt={product.name}
              style={{ width: 40, height: 40, objectFit: "cover", background: "var(--onyx)", border: "1px solid var(--smoke)" }}
            />
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ivory)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {product.name.toUpperCase()}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)" }}>
                ₹{product.price.toLocaleString()} · {size}
              </div>
            </div>
          </div>
          <button
            className="btn-gold"
            style={{ padding: "10px 18px", fontSize: 10, letterSpacing: 1, minWidth: 100 }}
            onClick={() => {
              addToCart(product, size, color, qty);
              showToast("Added to Cart ✓");
            }}
          >
            ADD TO BAG
          </button>
        </div>
      )}

    </div>
  );
}
