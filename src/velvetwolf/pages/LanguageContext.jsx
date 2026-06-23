import { createContext, useState, useContext } from "react";

const LanguageContext = createContext();

const translations = {
  en: {
    // Navbar / General
    shop: "Shop",
    collections: "Collections",
    customDesign: "Custom design",
    bulkOrder: "Bulk order",
    trackOrder: "Track order",
    login: "Login",
    signup: "Signup",
    logout: "Logout",
    account: "Account",
    cart: "Cart",
    wishlist: "Wishlist",
    searchPlaceholder: "Search streetwear...",
    emptyCart: "Your cart is empty",
    continueShopping: "Continue shopping",

    // HomePage
    heroTitle: "Luxury streetwear",
    heroSubtitle: "Unleash the beast within",
    discoverNow: "Discover now",
    featuredProducts: "Featured products",
    newArrivals: "New arrivals",
    ourPromise: "Our promise",
    promiseText: "Premium materials, custom fits, and ethical craftsmanship. Made for the streets.",
    fastDelivery: "Fast delivery",
    securePayments: "Secure payments",

    // ShopPage
    filters: "Filters",
    category: "Category",
    all: "All",
    sort: "Sort by",
    featured: "Featured",
    priceLowHigh: "Price: Low to High",
    priceHighLow: "Price: High to Low",
    rating: "Top rated",
    noProducts: "No products match your filters.",

    // ProductDetail
    addToCart: "Add to cart",
    outOfStock: "Out of stock",
    size: "Size",
    color: "Color",
    style: "Style",
    fit: "Fit",
    description: "Description",
    specifications: "Specifications",
    addedToCart: "Added to cart ✓",
    addedToWishlist: "Added to wishlist ♥",
    removedFromWishlist: "Removed from wishlist",

    // Cart
    checkout: "Checkout",
    subtotal: "Subtotal",
    freeShipping: "Free shipping",
    estimatedTax: "Estimated tax & shipping",
    remove: "Remove",
    qty: "Qty",

    // Checkout
    deliveryAddress: "Delivery address",
    fullName: "Full name",
    emailAddress: "Email address",
    mobileNumber: "Mobile number",
    pincode: "Pincode",
    district: "District",
    city: "City",
    state: "State",
    addressLine1: "Address (House No, Street...)",
    couponCode: "Coupon code",
    apply: "Apply",
    placeOrder: "Place order",
    paymentProcessing: "Processing payment...",
    cod: "Cash on delivery (COD)",
    online: "Online payment",
    orderSuccess: "Order placed successfully!",
  },
  hi: {
    // Navbar / General
    shop: "दुकान",
    collections: "संग्रह",
    customDesign: "कस्टम डिज़ाइन",
    bulkOrder: "थोक ऑर्डर",
    trackOrder: "ऑर्डर ट्रैक करें",
    login: "लॉगिन",
    signup: "साइनअप",
    logout: "लॉगआउट",
    account: "खाता",
    cart: "कार्ट",
    wishlist: "इच्छा सूची",
    searchPlaceholder: "सर्च करें...",
    emptyCart: "आपकी कार्ट खाली है",
    continueShopping: "खरीदारी जारी रखें",

    // HomePage
    heroTitle: "लक्जरी स्ट्रीटवियर",
    heroSubtitle: "अपने भीतर के जानवर को उजागर करें",
    discoverNow: "अभी खोजें",
    featuredProducts: "विशेष उत्पाद",
    newArrivals: "नए आगमन",
    ourPromise: "हमारा वादा",
    promiseText: "प्रीमियम सामग्री, कस्टम फिट, और नैतिक शिल्प कौशल। सड़कों के लिए बनाया गया।",
    fastDelivery: "तेज़ डिलीवरी",
    securePayments: "सुरक्षित भुगतान",

    // ShopPage
    filters: "फ़िल्टर",
    category: "श्रेणी",
    all: "सभी",
    sort: "क्रमबद्ध करें",
    featured: "विशेष रुप से प्रदर्शित",
    priceLowHigh: "कीमत: कम से अधिक",
    priceHighLow: "कीमत: अधिक से कम",
    rating: "शीर्ष रेटेड",
    noProducts: "आपके फ़िल्टर से कोई उत्पाद मेल नहीं खाता।",

    // ProductDetail
    addToCart: "कार्ट में जोड़ें",
    outOfStock: "स्टॉक में नहीं है",
    size: "आकार",
    color: "रंग",
    style: "शैली",
    fit: "फिट",
    description: "विवरण",
    specifications: "विशेषताएं",
    addedToCart: "कार्ट में जोड़ा गया ✓",
    addedToWishlist: "इच्छा सूची में जोड़ा गया ♥",
    removedFromWishlist: "इच्छा सूची से हटाया गया",

    // Cart
    checkout: "चेकआउट",
    subtotal: "कुल योग",
    freeShipping: "मुफ़्त शिपिंग",
    estimatedTax: "अनुमानित कर और शिपिंग",
    remove: "हटाएं",
    qty: "मात्रा",

    // Checkout
    deliveryAddress: "वितरण का पता",
    fullName: "पूरा नाम",
    emailAddress: "ईमेल पता",
    mobileNumber: "मोबाइल नंबर",
    pincode: "पिनकोड",
    district: "जिला",
    city: "शहर",
    state: "राज्य",
    addressLine1: "पता (मकान नंबर, सड़क...)",
    couponCode: "कूपन कोड",
    apply: "लागू करें",
    placeOrder: "ऑर्डर दें",
    paymentProcessing: "भुगतान संसाधित हो रहा है...",
    cod: "कैश ऑन डिलीवरी (COD)",
    online: "ऑनलाइन भुगतान",
    orderSuccess: "ऑर्डर सफलतापूर्वक दिया गया!",
  },
  ta: {
    // Navbar / General
    shop: "கடை",
    collections: "தொகுப்புகள்",
    customDesign: "விருப்ப வடிவமைப்பு",
    bulkOrder: "மொத்த ஆர்டர்",
    trackOrder: "ஆர்டரை டிராக் செய்ய",
    login: "உள்நுழைவு",
    signup: "பதிவு செய்க",
    logout: "வெளியேறு",
    account: "கணக்கு",
    cart: "கூடை",
    wishlist: "விருப்பப் பட்டியல்",
    searchPlaceholder: "தேடுக...",
    emptyCart: "உங்கள் கூடை காலியாக உள்ளது",
    continueShopping: "தொடர்ந்து ஷாப்பிங் செய்ய",

    // HomePage
    heroTitle: "சொகுசு தெரு ஆடை",
    heroSubtitle: "உங்களுக்குள் இருக்கும் திறனை வெளிப்படுத்துங்கள்",
    discoverNow: "இப்போது கண்டறியவும்",
    featuredProducts: "சிறப்பு தயாரிப்புகள்",
    newArrivals: "புதிய வரவுகள்",
    ourPromise: "எங்கள் வாக்குறுதி",
    promiseText: "பிரீமியம் பொருட்கள், தனிப்பயன் பொருத்தங்கள் மற்றும் சிறந்த வேலைப்பாடு. தெருக்களுக்காக உருவாக்கப்பட்டது.",
    fastDelivery: "வேகமான விநியோகம்",
    securePayments: "பாதுகாப்பான கொடுப்பனவுகள்",

    // ShopPage
    filters: "வடிகட்டிகள்",
    category: "வகை",
    all: "அனைத்தும்",
    sort: "வரிசைப்படுத்துக",
    featured: "பிரபலமானவை",
    priceLowHigh: "விலை: குறைந்ததிலிருந்து அதிகம்",
    priceHighLow: "விலை: அதிகத்திலிருந்து குறைவு",
    rating: "உயர் மதிப்பீடு",
    noProducts: "உங்கள் வடிகட்டிகளுடன் எந்த தயாரிப்புகளும் பொருந்தவில்லை.",

    // ProductDetail
    addToCart: "கூடையில் சேர்க்க",
    outOfStock: "இருப்பு இல்லை",
    size: "அளவு",
    color: "நிறம்",
    style: "பாணி",
    fit: "பொருத்தம்",
    description: "விளக்கம்",
    specifications: "விவரக்குறிப்புகள்",
    addedToCart: "கூடையில் சேர்க்கப்பட்டது ✓",
    addedToWishlist: "விருப்பப் பட்டியலில் சேர்க்கப்பட்டது ♥",
    removedFromWishlist: "விருப்பப் பட்டியலிலிருந்து நீக்கப்பட்டது",

    // Cart
    checkout: "செக்அவுட்",
    subtotal: "கூட்டுத்தொகை",
    freeShipping: "இலவச ஷிப்பிங்",
    estimatedTax: "வரி மற்றும் ஷிப்பிங்",
    remove: "நீக்கு",
    qty: "அளவு",

    // Checkout
    deliveryAddress: "விநியோக முகவரி",
    fullName: "முழு பெயர்",
    emailAddress: "மின்னஞ்சல் முகவரி",
    mobileNumber: "கைபேசி எண்",
    pincode: "பின்கோடு",
    district: "மாவட்டம்",
    city: "நகரம்",
    state: "மாநிலம்",
    addressLine1: "முகவரி (வீட்டு எண், தெரு...)",
    couponCode: "கூப்பன் குறியீடு",
    apply: "பயன்படுத்து",
    placeOrder: "ஆர்டர் செய்க",
    paymentProcessing: "கொடுப்பனவு செயலாக்கப்படுகிறது...",
    cod: "டெலிவரி பணம் (COD)",
    online: "ஆன்லைன் கொடுப்பனவு",
    orderSuccess: "ஆர்டர் வெற்றிகரமாக செய்யப்பட்டது!",
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("vw_language") || "en";
  });

  const setLanguage = (lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      localStorage.setItem("vw_language", lang);
    }
  };

  const t = (key) => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
