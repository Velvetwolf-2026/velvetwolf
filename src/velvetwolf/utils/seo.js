// Search and AI-answer metadata for every page: the canonical address, social
// cards, and schema.org structured data (JSON-LD) built from the site's own
// facts (help/content.js, the catalogue). Nothing here is invented: if a fact
// isn't on the site, it isn't in the schema either.
import { BUSINESS, FAQ, SHIPPING, RETURNS } from "../gallery/help/content";

// The live site answers on www (velvetwolf.in redirects there).
export const SITE_URL = "https://www.velvetwolf.in";
export const SITE_NAME = "VelvetWolf";
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

export const absUrl = (path = "/") => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`);

const stripHtml = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Title, description, canonical, Open Graph and Twitter tags for one page.
// `schema`: extra JSON-LD objects for this page.
export function pageMeta({ title, description, path, image = DEFAULT_IMAGE, type = "website", noindex = false, schema = [] }) {
  const url = absUrl(path);
  const img = absUrl(image);
  return [
    { title },
    { name: "description", content: description },
    ...(noindex ? [{ name: "robots", content: "noindex" }] : [{ tagName: "link", rel: "canonical", href: url }]),
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: img },
    { property: "og:locale", content: "en_IN" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: img },
    ...[].concat(schema).filter(Boolean).map((s) => ({ "script:ld+json": { "@context": "https://schema.org", ...s } })),
  ];
}

// ---------- the business ----------
const sameAs = [BUSINESS.instagram?.href, BUSINESS.facebook?.href].filter(Boolean);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (h) => `${String(h).padStart(2, "0")}:00`;

export function organizationLd() {
  return {
    "@type": ["Organization", "OnlineStore"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    ...(BUSINESS.legalName ? { legalName: BUSINESS.legalName } : {}),
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    image: DEFAULT_IMAGE,
    description: "VelvetWolf makes heavyweight oversized cotton tees in Tirupur, Tamil Nadu, and sells them online across India. Customers can also design their own tee in the VelvetWolf Studio.",
    slogan: "Statements in silence.",
    email: BUSINESS.emails.info,
    telephone: BUSINESS.phone.label.replace(/\s+/g, ""),
    address: { "@type": "PostalAddress", addressLocality: "Chennai", addressRegion: "Tamil Nadu", postalCode: "600001", addressCountry: "IN" },
    areaServed: { "@type": "Country", name: "India" },
    sameAs,
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "customer service",
      email: BUSINESS.emails.info,
      telephone: BUSINESS.phone.label.replace(/\s+/g, ""),
      areaServed: "IN",
      availableLanguage: "English",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: BUSINESS.hours.days.map((d) => DAYS[d]),
        opens: hhmm(BUSINESS.hours.open),
        closes: hhmm(BUSINESS.hours.close),
      },
    }],
    openingHoursSpecification: [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: BUSINESS.hours.days.map((d) => DAYS[d]),
      opens: hhmm(BUSINESS.hours.open),
      closes: hhmm(BUSINESS.hours.close),
    }],
    hasMerchantReturnPolicy: returnPolicyLd(),
  };
}

export function websiteLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/shop?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

// ---------- policies (from help/content.js) ----------
export function returnPolicyLd() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IN",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: RETURNS.windowDays,
    returnMethod: "https://schema.org/ReturnByMail",
    merchantReturnLink: `${SITE_URL}/returns`,
  };
}

export function shippingLd() {
  const standard = SHIPPING.methods.find((m) => m.id === "standard");
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: standard.price, currency: "INR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: SHIPPING.dispatch[0], maxValue: SHIPPING.dispatch[1], unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: standard.days[0], maxValue: standard.days[1], unitCode: "DAY" },
    },
  };
}

// ---------- pages ----------
export function breadcrumbLd(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absUrl(path) })),
  };
}

export function webPageLd({ type = "WebPage", name, description, path }) {
  return {
    "@type": type,
    "@id": `${absUrl(path)}#webpage`,
    name,
    description,
    url: absUrl(path),
    inLanguage: "en-IN",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

// questions: [{ q, a }] (answers may contain links; they're reduced to text)
export function faqLd(questions) {
  return {
    "@type": "FAQPage",
    mainEntity: questions.map(({ q, a }) => ({
      "@type": "Question",
      name: stripHtml(q),
      acceptedAnswer: { "@type": "Answer", text: stripHtml(a) },
    })),
  };
}

export const SITE_FAQ = FAQ;

// ---------- the catalogue ----------
const firstImage = (p) => {
  const raw = (Array.isArray(p?.images) && p.images[0]) || p?.image || "";
  const src = String(raw).includes("::") ? String(raw).split("::").pop() : String(raw);
  return src ? absUrl(src) : DEFAULT_IMAGE;
};

export function productLd(product, { path, images = [] } = {}) {
  const url = absUrl(path || `/product/${product.slug || product.id}`);
  const inStock = Number(product.stock) !== 0;
  const imgs = (images.length ? images : [firstImage(product)]).map(absUrl).slice(0, 6);
  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: stripHtml(product.description) || `${product.name}: a heavyweight oversized cotton tee from VelvetWolf.`,
    sku: String(product.id),
    url,
    image: imgs,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(product.collection ? { category: `Apparel > T-shirts > ${product.collection}` } : { category: "Apparel > T-shirts" }),
    material: "Combed cotton jersey, 220 to 240 GSM",
    audience: { "@type": "PeopleAudience", suggestedGender: { Men: "male", Women: "female" }[product.gender] || "unisex" },
    countryOfOrigin: "IN",
    ...(Array.isArray(product.sizes) && product.sizes.length ? { size: product.sizes } : {}),
    ...(Array.isArray(product.colors) && product.colors.length ? { color: product.colors.join(", ") } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: Number(product.price),
      priceCurrency: "INR",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#organization` },
      hasMerchantReturnPolicy: returnPolicyLd(),
      shippingDetails: shippingLd(),
    },
  };
}

export function itemListLd(products, { name, path }) {
  return {
    "@type": "ItemList",
    name,
    url: absUrl(path),
    numberOfItems: products.length,
    itemListElement: products.slice(0, 50).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absUrl(`/product/${p.slug || p.id}`),
      name: p.name,
    })),
  };
}
