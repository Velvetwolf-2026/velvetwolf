import React, { useContext, useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLoaderData } from "react-router";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import Icon from "../components/Icon";
import { getCollectionById } from "../utils/collectionsData";
import { trackViewItem } from "../utils/analytics";
import { useBreakpoint } from "../utils/breakpoints";
import ProductCard from "../components/ProductCard";
import { getSupabaseLogoUrl } from "../utils/supabase";


const getProductImage = (p) => {
  if (!p) return null;
  let img = p.image;
  if (typeof img === "string") {
    if (img.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(img);
        if (Array.isArray(parsed) && parsed.length > 0) {
          img = parsed[0];
        }
      } catch {
        // ignore
      }
    }
  } else if (Array.isArray(img) && img.length > 0) {
    img = img[0];
  }
  if (!img && Array.isArray(p.images) && p.images.length > 0) {
    const firstNonPrefixed = p.images.find(i => typeof i === "string" && !i.includes("::"));
    img = firstNonPrefixed || p.images[0];
  }
  if (typeof img === "string" && img.includes("::")) {
    img = img.split("::")[1];
  }
  return img || null;
};

const COLOR_MAP = {
  "Black": "#0a0a0a",
  "White": "#faf9f7",
  "Beige/Sand": "#d2b48c",
  "Forest Green": "#1e4620",
  "Crimson Ember": "#8B2635"
};

// Runs on the server for the initial request (and on the client for in-app
// navigations) so product pages render with real content instead of an empty
// shell — this is what makes them indexable and gives share links a real card.
export async function loader({ params }) {
  try {
    const res = await fetch(`${apiUrl("/products")}/${params.slug}`);
    if (!res.ok) return { product: null };
    const data = await res.json();
    return { product: data.product || null };
  } catch {
    return { product: null };
  }
}

export function meta({ loaderData }) {
  const product = loaderData?.product;
  if (!product) {
    return [{ title: "Product — VelvetWolf" }];
  }
  const image = getProductImage(product);
  const title = `${product.name} — VelvetWolf`;
  const description = product.description
    ? String(product.description).slice(0, 160)
    : "Luxury streetwear from VelvetWolf.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    ...(image ? [{ property: "og:image", content: image }] : []),
    { property: "og:type", content: "product" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isMobile, isMobileOrTablet } = useBreakpoint();
  const { addToCart, toggleWishlist, wishlist, products, showToast } = useContext(AppContext);
  const loaderData = useLoaderData();

  const [product, setProduct] = useState(loaderData?.product || null);
  const [loading, setLoading] = useState(!loaderData?.product);
  const [error, setError] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);

  const [lightboxOpen, setLightboxOpen] = useState(false);

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
  const [reviewImages, setReviewImages] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Smart Bundles & Recently Viewed
  const [bundles, setBundles] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Pincode & Delivery Estimate
  const [pincode, setPincode] = useState("");
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  // Redesign state additions
  const [mobileImageIndex, setMobileImageIndex] = useState(0);
  const [activeFAQIndex, setActiveFAQIndex] = useState(null);
  const carouselRef = useRef(null);

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
        
        const hasColorPrefixedImages = (prod.images || []).some(img => 
          typeof img === "string" && img.includes("::")
        );
        let defaultColor = prod.colors?.[0] || "Black";
        if (hasColorPrefixedImages && Array.isArray(prod.colors)) {
          const firstAvailableColor = prod.colors.find(c => 
            (prod.images || []).some(img => 
              typeof img === "string" && img.toLowerCase().startsWith(c.toLowerCase() + "::")
            )
          );
          if (firstAvailableColor) {
            defaultColor = firstAvailableColor;
          }
        }
        setColor(defaultColor);
        setSelectedImage(null);
        setLoading(false);

        // Track recently viewed in localStorage
        const stored = JSON.parse(localStorage.getItem("vw_recently_viewed") || "[]");
        const nextStored = [prod.slug, ...stored.filter(s => s !== prod.slug)].slice(0, 4);
        localStorage.setItem("vw_recently_viewed", JSON.stringify(nextStored));
        localStorage.setItem("vw_last_viewed_category", prod.category || "");
        setRecentlyViewed(nextStored);

        // Update Title & Meta details for SEO
        document.title = `${prod.name} | VelvetWolf Luxury Streetwear`;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          document.head.appendChild(metaDesc);
        }
        metaDesc.content = prod.description || `Explore ${prod.name} from VelvetWolf's luxury streetwear collections.`;

        // Update JSON-LD
        let jsonLdScript = document.getElementById("product-json-ld");
        if (!jsonLdScript) {
          jsonLdScript = document.createElement("script");
          jsonLdScript.id = "product-json-ld";
          jsonLdScript.type = "application/ld+json";
          document.head.appendChild(jsonLdScript);
        }
        jsonLdScript.textContent = JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": prod.name,
          "image": getProductImage(prod),
          "description": prod.description,
          "sku": prod.sku || `VW-${prod.id}`,
          "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "INR",
            "price": prod.price,
            "availability": prod.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        });

        // Fetch AI Smart Bundles
        fetch(`${apiUrl("/ai/bundles")}?productId=${prod.id}`, { credentials: 'include' })
          .then(res => res.json())
          .then(bData => setBundles(bData.bundles || []))
          .catch(err => console.error("Bundles load failed", err));

        // Fetch dynamic reviews
        fetch(`${apiUrl("/products")}/${prod.id}/reviews`, { credentials: 'include' })
          .then(res => {
            if (!res.ok) throw new Error("Failed to load reviews");
            return res.json();
          })
          .then(rData => setProductReviews(rData.reviews || []))
          .catch(err => {
            console.error("Reviews load failed", err);
            setProductReviews([]);
          });
      })
      .catch((err) => {
        setError(err.message || "Failed to load product details.");
        setLoading(false);
      });
  }, [slug]);

  // Desktop image zoom coordinate handlers
  const handleDesktopMouseMove = (e) => {
    const img = e.currentTarget.querySelector("img");
    if (!img) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
  };

  const handleDesktopMouseEnter = (e) => {
    const img = e.currentTarget.querySelector("img");
    if (img) {
      img.style.transform = "scale(1.8)";
    }
  };

  const handleDesktopMouseLeave = (e) => {
    const img = e.currentTarget.querySelector("img");
    if (img) {
      img.style.transform = "scale(1)";
      img.style.transformOrigin = "center center";
    }
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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewImages(prev => [
          ...prev,
          { name: file.name, type: file.type, data: reader.result.split(",")[1] }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCarouselScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    if (width > 0) {
      const index = Math.round(scrollLeft / width);
      setMobileImageIndex(index);
    }
  };

  // Submit product review
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      showToast("Please fill in name and comment", "error");
      return;
    }
    setSubmittingReview(true);

    // Post review to database
    fetch(`${apiUrl("/products")}/${product.id}/reviews`, {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: reviewName,
        rating: reviewRating,
        comment: reviewComment,
        images: reviewImages
      })
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
        setReviewImages([]);
        setSubmittingReview(false);
      })
      .catch(err => {
        console.error("Review submission failed", err);
        showToast("Failed to submit review. Please try again.", "error");
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
        // 1. Fetch city/state details from postal pin code API
        const postRes = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const postData = await postRes.json();
        
        let city = "";
        let state = "";
        let isPostSuccess = false;

        if (postData && postData[0] && postData[0].Status === "Success") {
          const po = postData[0].PostOffice?.[0];
          if (po) {
            city = po.District || po.Name;
            state = po.State;
            isPostSuccess = true;
          }
        }

        if (!isPostSuccess) {
          setDeliveryInfo({ available: false, message: "Invalid Pincode" });
          return;
        }

        // 2. Query our real Shiprocket Serviceability API on the backend
        const servRes = await fetch(`${apiUrl("/shipping/serviceability")}?pincode=${pin}`, { credentials: "include" });
        if (!servRes.ok) throw new Error("Serviceability check failed");
        
        const servData = await servRes.json();
        
        if (servData && servData.available) {
          setDeliveryInfo({
            available: true,
            city,
            state,
            date: servData.etd || "3-5 Days",
            codAvailable: servData.cod_available ?? true
          });
        } else {
          setDeliveryInfo({
            available: false,
            message: servData.message || "Location not serviceable"
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
  const colors = (Array.isArray(product.colors) ? product.colors : []).filter(c => {
    const hasColorPrefixedImages = (product.images || []).some(img => 
      typeof img === "string" && img.includes("::")
    );
    if (!hasColorPrefixedImages) return true;
    return (product.images || []).some(img => 
      typeof img === "string" && img.toLowerCase().startsWith(c.toLowerCase() + "::")
    );
  });

  const isSizeOutOfStock = (sizeName) => {
    if (!product) return false;
    const hash = product.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    if (sizeName === "XXL" && hash % 3 === 0) return true;
    if (sizeName === "XS" && hash % 4 === 0) return true;
    return false;
  };

  const isSizeBestSeller = (sizeName) => {
    return sizeName === "M" || sizeName === "L";
  };
  const primaryImage = getProductImage(product);
  const rawGallery = Array.isArray(product.images) ? product.images : [];
  
  // Parse any stringified arrays inside rawGallery
  const parsedRawGallery = [];
  rawGallery.forEach(img => {
    if (typeof img === "string" && img.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(img);
        if (Array.isArray(parsed)) {
          parsedRawGallery.push(...parsed);
        } else {
          parsedRawGallery.push(img);
        }
      } catch {
        parsedRawGallery.push(img);
      }
    } else {
      parsedRawGallery.push(img);
    }
  });

  const isPrimaryInGallery = parsedRawGallery.some(img => 
    img === primaryImage || 
    (typeof img === "string" && img.includes("::") && img.split("::")[1] === primaryImage)
  );

  const gallery = primaryImage && !isPrimaryInGallery
    ? [primaryImage, ...parsedRawGallery]
    : (parsedRawGallery.length > 0 ? parsedRawGallery : (primaryImage ? [primaryImage] : []));

  // Filter gallery based on the selected color
  let filteredGallery = [];
  const colorSpecificImages = [];
  const generalImages = [];

  gallery.forEach(img => {
    if (typeof img === "string") {
      if (img.includes("::")) {
        const [imgColor, imgUrl] = img.split("::");
        if (imgColor.trim().toLowerCase() === color.trim().toLowerCase()) {
          colorSpecificImages.push(imgUrl);
        }
      } else {
        generalImages.push(img);
      }
    } else {
      generalImages.push(img);
    }
  });

  if (colorSpecificImages.length > 0) {
    filteredGallery = [...colorSpecificImages, ...generalImages];
  } else {
    // If no color-specific images exist for this color, show general images or fall back to all images without prefix
    filteredGallery = generalImages.length > 0 
      ? generalImages 
      : gallery.map(img => (typeof img === "string" && img.includes("::") ? img.split("::")[1] : img));
  }

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

          {/* Left - Image Gallery & Pincode/Details */}
          <div>
            {!isMobileOrTablet ? (
              /* Desktop: Vertical thumbnails + active image hero zoom */
              <div className="vw-gallery-desktop-layout">
                {/* Thumbnails */}
                {filteredGallery.length > 1 && (
                  <div className="vw-gallery-thumbs-column">
                    {filteredGallery.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(img)}
                        className={`vw-gallery-thumb-btn ${activeImage === img ? "vw-gallery-thumb-btn-active" : ""}`}
                        aria-label={`View detail view ${i + 1}`}
                      >
                        <img src={img} alt={`${product.name} thumbnail ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
                {/* Active Image */}
                <div
                  className="vw-pdp-image-wrap"
                  style={{
                    background: "var(--onyx)",
                    border: "1px solid var(--smoke)",
                    overflow: "hidden",
                    position: "relative",
                    cursor: "zoom-in",
                    height: 600
                  }}
                  onMouseMove={handleDesktopMouseMove}
                  onMouseEnter={handleDesktopMouseEnter}
                  onMouseLeave={handleDesktopMouseLeave}
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={activeImage}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform-origin 0s"
                    }}
                    loading="eager"
                  />
                  {discount > 0 && (
                    <div style={{ position: "absolute", top: 20, right: 20, background: "var(--wolf-red)", color: "#fff", padding: "4px 12px", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1, zIndex: 5 }}>
                      -{discount}%
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 16, left: 16, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, opacity: 0.5, zIndex: 5 }}>
                    {String(filteredGallery.indexOf(activeImage) + 1).padStart(2, '0')} / {String(filteredGallery.length).padStart(2, '0')}
                  </div>
                </div>
              </div>
            ) : (
              /* Mobile: Clean swipe snap carousel with bullets */
              <div>
                <div className="vw-gallery-container">
                  <div
                    ref={carouselRef}
                    className="vw-gallery-mobile-carousel"
                    onScroll={handleCarouselScroll}
                  >
                    {filteredGallery.map((img, i) => (
                      <div
                        key={i}
                        className="vw-gallery-mobile-slide"
                        onClick={() => setLightboxOpen(true)}
                      >
                        <img
                          src={img}
                          alt={`${product.name} detail view ${i + 1}`}
                          loading={i === 0 ? "eager" : "lazy"}
                        />
                      </div>
                    ))}
                  </div>
                  {discount > 0 && (
                    <div style={{ position: "absolute", top: 20, right: 20, background: "var(--wolf-red)", color: "#fff", padding: "4px 12px", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1, zIndex: 10 }}>
                      -{discount}%
                    </div>
                  )}
                </div>

                {/* Bullets */}
                {filteredGallery.length > 1 && (
                  <div className="vw-gallery-bullets">
                    {filteredGallery.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (carouselRef.current) {
                            const width = carouselRef.current.clientWidth;
                            carouselRef.current.scrollTo({ left: i * width, behavior: "smooth" });
                          }
                          setMobileImageIndex(i);
                        }}
                        className={`vw-gallery-bullet ${mobileImageIndex === i ? "vw-gallery-bullet-active" : ""}`}
                        aria-label={`Jump to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Delivery Estimate & Accordion details in the Left column */}
            <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Delivery Estimate */}
              <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "24px", position: "relative" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>ESTIMATE DELIVERY DATE</div>
                <div style={{ display: "flex", gap: 10, position: "relative" }}>
                  <input
                    className="input-dark"
                    type="text"
                    placeholder="Enter 6-digit Pincode"
                    value={pincode}
                    onChange={handlePincodeChange}
                    maxLength={6}
                    style={{ flex: 1, padding: "12px 14px", fontSize: 13, border: "1px solid var(--smoke)" }}
                  />
                  {loadingPincode && (
                    <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
                      VERIFYING...
                    </span>
                  )}
                </div>

                {deliveryInfo && (
                  <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--smoke)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                    {deliveryInfo.available ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ color: "#81c784", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                          <span>✓ Deliverable to {deliveryInfo.city}, {deliveryInfo.state}</span>
                        </div>
                        <div style={{ color: "var(--silver)", fontSize: 12 }}>
                          Estimated Delivery: <span style={{ color: "var(--gold)", fontWeight: 600 }}>{deliveryInfo.date}</span>
                        </div>
                        <div style={{ color: "var(--silver)", fontSize: 12 }}>
                          COD: <span style={{ color: "var(--ivory)" }}>{deliveryInfo.codAvailable ? "Available" : "Not Available"}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "#e07070", fontWeight: 600 }}>✕ {deliveryInfo.message}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Collapsible Accordion details */}
              <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "24px" }}>
                <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--smoke)", paddingBottom: 10, marginBottom: 16 }}>
                  {["details", "shipping", "badges"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        background: "none",
                        border: "none",
                        color: activeTab === tab ? "var(--gold)" : "var(--silver)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: 2,
                        cursor: "pointer",
                        paddingBottom: 6,
                        borderBottom: `2px solid ${activeTab === tab ? "var(--gold)" : "transparent"}`,
                        transition: "all 0.3s ease"
                      }}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                {activeTab === "details" && (
                  <div style={{ fontSize: 13, color: "var(--silver)", lineHeight: 1.8, fontFamily: "var(--font-serif)" }}>
                    <p style={{ margin: 0 }}>• Premium {product.gsm || "240"} GSM {product.fabric || "Egyptian long-staple cotton"}.</p>
                    <p style={{ margin: "6px 0 0" }}>• Custom fit: structured shoulders, {product.fit || "Oversized"} body chest drape.</p>
                    <p style={{ margin: "6px 0 0" }}>• Clean finish: invisible stitching at neck rib and bottom fold.</p>
                  </div>
                )}

                {activeTab === "shipping" && (
                  <div style={{ fontSize: 13, color: "var(--silver)", lineHeight: 1.8, fontFamily: "var(--font-serif)" }}>
                    <p style={{ margin: 0 }}>• Fast Express Delivery: orders dispatched within 24-48 hours.</p>
                    <p style={{ margin: "6px 0 0" }}>• Shipping timeframe: 3-5 business days across India.</p>
                    <p style={{ margin: "6px 0 0" }}>• Live updates: Real-time SMS and AWB courier link tracking.</p>
                  </div>
                )}

                {activeTab === "badges" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--silver)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>🛡️ <span>Secure Gateways</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>🌿 <span>Responsibly Sourced</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>⚡ <span>Express Dispatch</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>🔄 <span>10 Day Easy Returns</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right - Product Details (Sticky Panel on Desktop) */}
          <div className={!isMobileOrTablet ? "vw-pdp-sticky" : ""}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3, color: "var(--gold)", marginBottom: 10 }}>
              {getCollectionById(product.collection)?.name?.toUpperCase() || product.collection?.toUpperCase()}
            </div>

            {/* Brand statement */}
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--gold)", marginBottom: 12, fontWeight: 600 }}>
              ✦ Designed for creators. Built to last.
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4.5vw, 46px)", letterSpacing: 2, marginBottom: 16, lineHeight: 1.1 }}>
              {product.name}
            </h1>

            {/* Reviews count & Verdict */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={14} color={s <= Math.floor(product.rating || 5) ? "#c9a84c" : "#333"} />)}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginLeft: 8 }}>
                  ({productReviews.length || product.reviews || 0} verdicts) · <span style={{ color: "var(--ivory)", fontWeight: 700 }}>{product.rating || 4.9} / 5.0</span>
                </span>
              </div>
              <div style={{ width: 1, height: 12, background: "var(--smoke)" }} />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--silver)" }}>
                FIT: <span style={{ color: "var(--gold)" }}>{product.fit?.toUpperCase() || "OVERSIZED"}</span>
              </div>
            </div>

            {/* Price & Taxes Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--ivory)" }}>{"\u20b9"}{product.price.toLocaleString()}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--silver)", textDecoration: "line-through" }}>{"\u20b9"}{product.originalPrice.toLocaleString()}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--gold)", fontWeight: "bold" }}>({discount}% OFF)</span>
                  </>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-body)", color: "var(--silver)" }}>Inclusive of all taxes (GST Included)</span>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--smoke)" }} />
                <span style={{ fontSize: 11, fontFamily: "var(--font-body)", color: "#81c784" }}>⚡ Free shipping above ₹999</span>
              </div>
            </div>

            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--silver)", lineHeight: 1.8, marginBottom: 28 }}>
              {product.description}
            </p>

            {/* Product Highlights Grid */}
            <div className="vw-highlights-grid">
              <div className="vw-highlight-card">
                <span className="vw-highlight-title">{product.gsm || "240"} GSM</span>
                <span className="vw-highlight-desc">Heavyweight Knit</span>
              </div>
              <div className="vw-highlight-card">
                <span className="vw-highlight-title">{product.fabric || "100% Cotton"}</span>
                <span className="vw-highlight-desc">Premium Combed</span>
              </div>
              <div className="vw-highlight-card">
                <span className="vw-highlight-title">{product.fit || "Oversized"} Fit</span>
                <span className="vw-highlight-desc">Boxy Silhouette</span>
              </div>
              <div className="vw-highlight-card">
                <span className="vw-highlight-title">Pre-Shrunk</span>
                <span className="vw-highlight-desc">Shape Retention</span>
              </div>
              <div className="vw-highlight-card">
                <span className="vw-highlight-title">Bio Wash</span>
                <span className="vw-highlight-desc">Ultra Soft Fabric</span>
              </div>
              <div className="vw-highlight-card">
                <span className="vw-highlight-title">Fade Resistant</span>
                <span className="vw-highlight-desc">Long Lasting Color</span>
              </div>
            </div>

            {/* Color selector */}
            {colors.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)", marginBottom: 12 }}>
                  COLOR: <span style={{ color: "var(--gold)" }}>{color.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {colors.map((c) => (
                    <button
                      key={c}
                      className={`vw-swatch-btn ${color === c ? "vw-swatch-btn-active" : ""}`}
                      onClick={() => { setColor(c); setSelectedImage(null); }}
                      aria-label={`Select color ${c}`}
                      aria-pressed={color === c}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setColor(c);
                          setSelectedImage(null);
                        }
                      }}
                    >
                      <span
                        className="vw-swatch-btn-inner"
                        style={{ background: COLOR_MAP[c] || c, border: "1px solid rgba(255,255,255,0.15)" }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Stock Alert */}
            {product.stock > 0 && product.stock <= 10 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "10px 14px", background: "rgba(192, 57, 43, 0.08)", border: "1px solid rgba(192, 57, 43, 0.3)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--wolf-red)", animation: "vw-badge-pulse 2s infinite" }} />
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 0.5 }}>
                  ⚡ ONLY <span style={{ color: "var(--gold)", fontWeight: "bold" }}>{product.stock} PIECES LEFT</span> IN STOCK!
                </span>
              </div>
            )}

            {/* Size selector & Advisor links */}
            {sizes.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)" }}>SIZE: {size}</span>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setSizeAdvisorOpen(true)}
                      style={{ background: "none", border: "none", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    >
                      ✦ AI SIZE ADVISOR
                    </button>
                    <button
                      onClick={() => setCompareOpen(true)}
                      style={{ background: "none", border: "none", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    >
                      COMPARE SPECS
                    </button>
                    <button
                      onClick={() => setSizeChartOpen(true)}
                      style={{ background: "none", border: "none", color: "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    >
                      SIZE CHART
                    </button>
                  </div>
                </div>

                <div className="vw-size-cards-grid">
                  {sizes.map((s) => {
                    const outOfStock = isSizeOutOfStock(s);
                    const isBest = isSizeBestSeller(s);
                    return (
                      <button
                        key={s}
                        disabled={outOfStock}
                        onClick={() => !outOfStock && setSize(s)}
                        className={`vw-size-card ${size === s ? "vw-size-card-active" : ""} ${outOfStock ? "vw-size-card-disabled" : ""}`}
                        aria-label={`Size ${s} ${outOfStock ? "(Out of stock)" : ""} ${isBest ? "(Best seller)" : ""}`}
                      >
                        {isBest && !outOfStock && <span className="vw-size-badge-best">Best</span>}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Qty and Actions */}
            <div ref={ctaRef} style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--smoke)", background: "var(--onyx)" }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="Decrease Quantity"
                >
                  <Icon name="minus" size={12} />
                </button>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ivory)", padding: "0 8px", minWidth: 24, textAlign: "center" }}>{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="Increase Quantity"
                >
                  <Icon name="plus" size={12} />
                </button>
              </div>
              <button
                className="btn-outline"
                style={{ flex: 1.2, padding: "16px", minWidth: 140, fontSize: 11, letterSpacing: 2 }}
                onClick={() => { addToCart(product, size, color, qty); showToast("Added to Cart ✓"); }}
              >
                ADD TO CART
              </button>
              <button
                className="btn-gold"
                style={{ flex: 1.2, padding: "16px", minWidth: 140, fontSize: 11, letterSpacing: 2 }}
                onClick={() => { addToCart(product, size, color, qty); setTimeout(() => navigate("/checkout"), 100); }}
              >
                BUY NOW
              </button>
              <button
                onClick={() => toggleWishlist(product)}
                style={{
                  background: inWishlist ? "rgba(192,57,43,0.15)" : "transparent",
                  border: `1px solid ${inWishlist ? "var(--wolf-red)" : "var(--smoke)"}`,
                  color: inWishlist ? "var(--wolf-red)" : "var(--silver)",
                  padding: "0 18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease"
                }}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Icon name={inWishlist ? "heartFill" : "heart"} size={18} color={inWishlist ? "#c0392b" : "var(--silver)"} />
              </button>
            </div>

            {/* Minimal trust badges for quick signals */}
            <div style={{ display: "flex", gap: 16, borderTop: "1px solid var(--smoke)", paddingTop: 18, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--silver)" }}>
                <Icon name="truck" size={14} color="var(--gold)" />
                <span>Free Express Shipping</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--silver)" }}>
                <Icon name="undo" size={14} color="var(--gold)" />
                <span>10-Day Easy Returns</span>
              </div>
            </div>

            {/* Payment Method Trust Badges */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-start", padding: "14px 0", borderTop: "1px solid var(--smoke)", marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--silver)", letterSpacing: 1, marginRight: 6 }}>SECURE PROTOCOLS:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {/* Visa */}
                <img src={getSupabaseLogoUrl("/visa.png")} alt="Visa" style={{ height: 26, width: "auto", objectFit: "contain", borderRadius: 2 }} />

                {/* Mastercard */}
                <div style={{
                  width: 44,
                  height: 26,
                  borderRadius: 2,
                  background: "#f5f5f7",
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
                <img src={getSupabaseLogoUrl("/rupay.png")} alt="RuPay" style={{ height: 26, width: "auto", objectFit: "contain", borderRadius: 2 }} />
              </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
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
                      src={getProductImage(related[0]) || activeImage}
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
                        await addToCart(product, size || "M", color || product.colors?.[0] || "Black", 1);
                        await addToCart(related[0], "M", related[0].colors?.[0] || "Black", 1);
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
                <img src={getProductImage(product)} alt={product.name} style={{ width: 50, height: 50, objectFit: "cover", border: "1px solid var(--smoke)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: "bold" }}>{product.name} (Base)</div>
                  <div style={{ fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>₹{product.price}</div>
                </div>
              </div>
              {bundles.map(bItem => (
                <Link key={bItem.id} to={`/product/${bItem.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 16, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                    <img src={getProductImage(bItem)} alt={bItem.name} style={{ width: 50, height: 50, objectFit: "cover", border: "1px solid var(--smoke)" }} />
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

        {/* PRODUCT STORY SECTION */}
        <section className="vw-story-block" style={{ borderTop: "1px solid var(--smoke)", paddingTop: 48 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 20, color: "var(--gold)" }}>
            THE PIECE STORY
          </h2>
          <div className="vw-story-inner">
            <p className="vw-story-quote">"A premium streetwear staple engineered for heavy rotations."</p>
            <p className="vw-story-para">
              {product.description || "Designed for creators. Built to last. Crafted from dense Egyptian cotton knit with structured drop-shoulders and meticulous invisible stitching details."}
            </p>
          </div>
        </section>

        {/* FABRIC INFORMATION SECTION */}
        <section className="vw-fabric-showcase">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, color: "var(--ivory)" }}>
            FABRIC COMPOSITION & CRAFT
          </h2>
          <p style={{ fontSize: 13, color: "var(--silver)", fontFamily: "var(--font-serif)", marginTop: 8 }}>
            Garment architecture built to endure.
          </p>
          <div className="vw-fabric-cards">
            <div className="vw-fabric-card">
              <span className="vw-fabric-card-title">01. Premium Feel</span>
              <p className="vw-fabric-card-desc">Knitted from combed long-staple yarn, providing a soft texture against the skin while maintaining robust weight.</p>
            </div>
            <div className="vw-fabric-card">
              <span className="vw-fabric-card-title">02. Air Flow & Comfort</span>
              <p className="vw-fabric-card-desc">The open loopknit pattern optimizes natural airflow, making it exceptionally breathable for warm climates.</p>
            </div>
            <div className="vw-fabric-card">
              <span className="vw-fabric-card-title">03. Heavyweight Grade</span>
              <p className="vw-fabric-card-desc">Double-stitched at all structural stress points, featuring reinforced rib-collar support that does not sag after washes.</p>
            </div>
          </div>
        </section>

        {/* CUSTOMER REVIEWS AND RATINGS */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: 2, marginBottom: 32 }}>CUSTOMER VERDICTS</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "1.8fr 1.2fr", gap: 40, alignItems: "start" }}>
            {/* Left: Reviews List & Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Verdict Summary Cards */}
              <div className="vw-reviews-summary-card" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.5fr", gap: 24, padding: "28px 24px", background: "var(--onyx)", border: "1px solid var(--smoke)" }}>
                {/* Score Column */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: isMobile ? "none" : "1px solid var(--smoke)", paddingRight: isMobile ? 0 : 24, borderBottom: isMobile ? "1px solid var(--smoke)" : "none", paddingBottom: isMobile ? 18 : 0 }}>
                  <span style={{ fontSize: 64, fontFamily: "var(--font-display)", color: "var(--gold)", lineHeight: 1 }}>{product.rating || 4.9}</span>
                  <div style={{ display: "flex", gap: 2, margin: "12px 0 6px" }}>
                    {[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={13} color={s <= Math.floor(product.rating || 5) ? "#c9a84c" : "#333"} />)}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 1.5, textTransform: "uppercase" }}>Based on {productReviews.length || product.reviews || 12} verdicts</span>
                </div>
                {/* Distribution Progress Bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = productReviews.filter(r => r.rating === stars).length || Math.round((productReviews.length || 12) * (stars === 5 ? 0.75 : stars === 4 ? 0.15 : stars === 3 ? 0.07 : stars === 2 ? 0.02 : 0.01));
                    const total = productReviews.length || 12;
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={stars} className="vw-reviews-breakdown-row">
                        <span style={{ minWidth: 44 }}>{stars} Star</span>
                        <div className="vw-reviews-bar-bg">
                          <div className="vw-reviews-bar-fill" style={{ width: `${percent}%` }} />
                        </div>
                        <span style={{ minWidth: 32, textAlign: "right" }}>{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verified Image Gallery in action */}
              {productReviews.flatMap(r => r.images || []).filter(Boolean).length > 0 && (
                <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "24px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--gold)", marginBottom: 14 }}>VERDICTS IN ACTION</div>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
                    {productReviews.flatMap(r => r.images || []).filter(Boolean).map((imgUrl, i) => (
                      <img
                        key={i}
                        src={imgUrl}
                        alt={`Customer verdict ${i}`}
                        onClick={() => {
                          setSelectedImage(imgUrl);
                          setLightboxOpen(true);
                        }}
                        style={{ width: 80, height: 80, objectFit: "cover", border: "1px solid var(--smoke)", cursor: "pointer", transition: "all 0.3s ease" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--smoke)"}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews list */}
              <div>
                {productReviews.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>No verdicts on this piece yet. Be the first to share your verdict!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {productReviews.map((rev, idx) => (
                      <div key={idx} style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ivory)", fontWeight: "bold" }}>{rev.user_name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--gold)", fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>
                              <span>✓</span> <span>VERIFIED BUYER</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 3, height: "fit-content" }}>
                            {[1, 2, 3, 4, 5].map(s => <Icon key={s} name="star" size={11} color={s <= rev.rating ? "#c9a84c" : "#333"} />)}
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--ash)", margin: 0, fontFamily: "var(--font-body)", lineHeight: 1.6 }}>"{rev.comment}"</p>
                        {rev.images && rev.images.length > 0 && (
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                            {rev.images.map((imgUrl, i) => (
                              <img
                                key={i}
                                src={imgUrl && imgUrl.includes("/storage/v1/object/public/") ? imgUrl.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + "?width=150&quality=85" : imgUrl}
                                alt="Review attachment"
                                onClick={() => {
                                  setSelectedImage(imgUrl);
                                  setLightboxOpen(true);
                                }}
                                style={{
                                  width: 60,
                                  height: 60,
                                  objectFit: "cover",
                                  border: "1px solid var(--smoke)",
                                  cursor: "pointer",
                                  transition: "border-color 0.2s"
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--smoke)"}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewRating(s)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <Icon
                          name="star"
                          size={24}
                          color={s <= reviewRating ? "#c9a84c" : "rgba(255, 255, 255, 0.1)"}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", display: "block", marginBottom: 6 }}>ATTACH PHOTOS (OPTIONAL)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label
                      style={{
                        border: "1px dashed var(--gold)",
                        padding: "16px",
                        textAlign: "center",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--gold)",
                        background: "rgba(201,168,76,0.02)",
                        transition: "background 0.3s ease",
                        display: "block"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(201,168,76,0.02)"}
                    >
                      ✦ UPLOAD IMAGES
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                      />
                    </label>
                    {reviewImages.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                        {reviewImages.map((img, idx) => (
                          <div key={idx} style={{ position: "relative", aspectRatio: "1", background: "var(--onyx)", border: "1px solid var(--smoke)" }}>
                            <img
                              src={`data:${img.type};base64,${img.data}`}
                              alt={img.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                            <button
                              type="button"
                              onClick={() => setReviewImages(prev => prev.filter((_, i) => i !== idx))}
                              style={{
                                position: "absolute",
                                top: 2,
                                right: 2,
                                background: "rgba(0,0,0,0.8)",
                                border: "none",
                                color: "var(--gold)",
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 9,
                                cursor: "pointer",
                                padding: 0
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

        {/* FAQ ACCORDION SECTION */}
        <section className="vw-faq-accordion" style={{ borderTop: "1px solid var(--smoke)", paddingTop: 40, marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 24, color: "var(--ivory)" }}>
            COMMON VERDICTS & FAQS
          </h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              {
                q: "How does the sizing run for VelvetWolf products?",
                a: "All of our products are designed with a boxy, oversized streetwear silhouette featuring dropped shoulders. We recommend buying your true size for the intended streetwear fit, or sizing down if you prefer a standard, closer fit. Refer to our AI Size Advisor or Sizing Spec Chart above for exact measurements."
              },
              {
                q: "What is the wash care guide for this fabric?",
                a: "To maximize garment longevity: Machine wash cold inside out with similar colors. Use mild detergent. Do not bleach. Hang dry in shade. Avoid ironing directly on print graphics or decals."
              },
              {
                q: "Do you offer shipping and hassle-free returns?",
                a: "We offer express shipping across India, with dispatch within 24-48 hours. Orders above ₹999 qualify for free shipping. We have a robust 10-day easy return and exchange policy for all unworn garments with tags attached."
              }
            ].map((faq, idx) => {
              const isOpen = activeFAQIndex === idx;
              return (
                <div key={idx} className="vw-accordion-item">
                  <button
                    onClick={() => setActiveFAQIndex(isOpen ? null : idx)}
                    className="vw-accordion-trigger"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="vw-accordion-chevron" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
                      <Icon name="chevronDown" size={14} color="var(--gold)" />
                    </span>
                  </button>
                  <div
                    className="vw-accordion-content"
                    style={{ maxHeight: isOpen ? "200px" : "0" }}
                  >
                    <div className="vw-accordion-body">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RELATED PRODUCTS */}
        {related.length > 0 && (
          <section style={{ marginBottom: 60, borderTop: "1px solid var(--smoke)", paddingTop: 40 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>RELATED PIECES</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))", justifyContent: "center", gap: 20 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))", justifyContent: "center", gap: 20 }}>
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
                      <img src={getProductImage(item)} alt={item.name} style={{ width: 44, height: 44, objectFit: "cover", marginBottom: 4 }} />
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
                      <td key={idx} style={{ padding: 10, textAlign: "center" }}>{item.gsm ? `${item.gsm} GSM` : (isPremium ? "240 GSM Luxury" : "240 GSM Heavy")}</td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 0", color: "var(--gold)" }}>FIT PROFILE</td>
                  {[product, ...related.slice(0, 2)].map((item, idx) => {
                    const isUltra = item.collection === "beast-mode" || item.slug.includes("cargo");
                    return (
                      <td key={idx} style={{ padding: 10, textAlign: "center" }}>{item.fit || (isUltra ? "Oversized Streetwear" : "Structured Drop Shoulder")}</td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 0", color: "var(--gold)" }}>COMPOSITION</td>
                  {[product, ...related.slice(0, 2)].map((item, idx) => {
                    const isPremium = item.collection === "silent-luxury" || item.slug.includes("silent");
                    return (
                      <td key={idx} style={{ padding: 10, textAlign: "center" }}>{item.fabric || (isPremium ? "100% Egyptian Cotton" : "100% Combed Cotton")}</td>
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
                          addToCart(item, "M", item.colors?.[0] || "Black", 1);
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

      {/* Lightbox Modal for mobile pinch/tap-to-zoom/fullscreen */}
      {lightboxOpen && (
        <div 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(0,0,0,0.95)", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 1000 
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <button 
            onClick={() => setLightboxOpen(false)} 
            style={{ 
              position: "absolute", 
              top: 20, 
              right: 20, 
              background: "none", 
              border: "none", 
              color: "#fff", 
              cursor: "pointer",
              fontSize: 20
            }}
          >
            ✕
          </button>
          <img 
            src={activeImage && activeImage.includes("/storage/v1/object/public/") ? activeImage.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + "?width=800&quality=90" : activeImage} 
            alt={product.name} 
            style={{ 
              maxWidth: "90%", 
              maxHeight: "85%", 
              objectFit: "contain" 
            }} 
          />
          <div style={{ color: "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 11, marginTop: 16 }}>
            Tap anywhere to close
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom CTA */}
      {isMobileOrTablet && showStickyBar && (
        <div style={{
          position: "fixed",
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
          left: 0,
          right: 0,
          background: "rgba(10, 10, 10, 0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--smoke)",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 890,
          animation: "vw-slide-up-cta 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: "70%" }}>
              <img
                src={activeImage}
                alt={product.name}
                style={{ width: 36, height: 36, objectFit: "cover", background: "var(--onyx)", border: "1px solid var(--smoke)" }}
              />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ivory)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", textTransform: "uppercase" }}>
                  {product.name}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold)" }}>
                  ₹{product.price.toLocaleString()} · Color: {color} · Size: {size}
                </div>
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--gold)" }}>
              ₹{product.price.toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-outline"
              style={{ flex: 1, padding: "10px", fontSize: 10, letterSpacing: 1 }}
              onClick={() => {
                addToCart(product, size, color, qty);
                showToast("Added to Cart ✓");
              }}
            >
              ADD TO BAG
            </button>
            <button
              className="btn-gold"
              style={{ flex: 1, padding: "10px", fontSize: 10, letterSpacing: 1 }}
              onClick={() => {
                addToCart(product, size, color, qty);
                setTimeout(() => navigate("/checkout"), 100);
              }}
            >
              BUY NOW
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
