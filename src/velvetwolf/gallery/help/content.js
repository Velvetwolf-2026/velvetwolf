// Copy and facts for the help and policy pages (from the gallery prototype's content/site.js).
// The prototype marked facts it couldn't confirm; those are left out here rather than published
// as placeholders. Fill BUSINESS.legal* once confirmed and they appear on the pages.
// Nothing here is legal advice: have the privacy notice and terms reviewed.
import { SIZES } from "../data";

export const BUSINESS = {
  name: "VelvetWolf",
  city: "Chennai, Tamil Nadu 600001",
  // Not shown until confirmed (Consumer Protection (E-Commerce) Rules, 2020 ask for these):
  legalName: "",        // registered business name
  address: "",          // full registered address
  gstin: "",            // GSTIN (the old page showed a placeholder-looking number)
  grievanceName: "",    // Grievance Officer's name
  emails: {
    info: "info@velvetwolf.in",
    orders: "orders@velvetwolf.in",
    returns: "returns@velvetwolf.in",
    bulk: "bulk@velvetwolf.in",
  },
  whatsapp: { label: "+91 93422 45724", href: "https://wa.me/919342245724" },
  instagram: { label: "@velvetwolfofficial", href: "https://www.instagram.com/velvetwolfofficial" },
  // Mon to Sat, 10:00 to 19:00 IST
  hours: { days: [1, 2, 3, 4, 5, 6], open: 10, close: 19, label: "Monday to Saturday, 10 AM to 7 PM IST. Closed on Sunday." },
  processor: "Cashfree",
  updated: "October 2026",
};

const E = BUSINESS.emails;
const mail = (a) => `<a href="mailto:${a}">${a}</a>`;
const who = BUSINESS.legalName || BUSINESS.name;

export const CONTACT_TOPICS = [
  { id: "order", label: "Order issue", needsOrder: true },
  { id: "return", label: "Return or exchange", needsOrder: true },
  { id: "shipping", label: "Shipping delay", needsOrder: true },
  { id: "payment", label: "Payment problem", needsOrder: true },
  { id: "custom", label: "Custom design question" },
  { id: "product", label: "Product question" },
  { id: "bulk", label: "Bulk or corporate order" },
  { id: "collab", label: "Partnership or collaboration" },
  { id: "other", label: "Something else" },
];

// ---------- tracking (the backend's stages, in order) ----------
export const TRACK_STAGES = [
  { id: "placed", label: "Order placed", text: "We have your order." },
  { id: "paid", label: "Payment confirmed", text: "Cashfree has confirmed the payment." },
  { id: "production", label: "In production", text: "Your tee is being printed." },
  { id: "qc", label: "Quality check", text: "We check the cloth, the print and the stitching by hand." },
  { id: "dispatched", label: "Dispatched", text: "Sealed and with the courier." },
  { id: "out", label: "Out for delivery", text: "The courier has it on today's route." },
  { id: "delivered", label: "Delivered", text: "It has arrived." },
];

// ---------- shipping ----------
export const SHIPPING = {
  dispatch: [2, 3], // business days
  methods: [
    { id: "standard", label: "Standard", price: 0, days: [4, 7] },
    { id: "express", label: "Express", price: 149, days: [2, 4] },
  ],
  remote: { extra: [2, 3], label: "Jammu and Kashmir, Ladakh and the North-East" },
};

// ---------- returns ----------
export const RETURNS = {
  windowDays: 7,
  steps: [
    { id: "request", label: "Ask", text: `Email ${mail(E.returns)} within 7 days of delivery with your order number, the item and the reason. For a fault, add a photo.` },
    { id: "approve", label: "Approval", text: "We reply within 24 hours with a return authorisation and the next step." },
    { id: "send", label: "Send it back", text: "Pack it securely. We arrange a pickup where the courier offers one, otherwise you drop it at a courier point." },
    { id: "inspect", label: "Inspection", text: "We check the item within 2 to 3 working days of receiving it." },
    { id: "refund", label: "Refund or exchange", text: "We send your exchange, or start the refund the same day the inspection passes." },
  ],
  refunds: [
    { method: "UPI", time: "1 to 3 working days" },
    { method: "Card or netbanking", time: "5 to 7 working days, depending on your bank" },
    { method: "Store credit, with a 5% bonus", time: "Straight away" },
  ],
};

// ---------- size guide ----------
// Garment: the tee laid flat (chest is armpit to armpit). Body: chest all the way round.
const BODY_CHEST = { S: [91, 96], M: [96, 102], L: [102, 107], XL: [107, 112], XXL: [112, 118] };
export const SIZE_GUIDE = SIZES.map((s) => ({ id: s.id, garment: { chest: s.chest, length: s.length, sleeve: s.sleeve }, body: BODY_CHEST[s.id] }));

export const CARE = [
  "Wash cold (30°C), inside out, with similar colours.",
  "No bleach or harsh detergent.",
  "Dry flat in the shade, or tumble dry on low.",
  "Iron on medium, on the reverse, never directly on the print.",
];

// ---------- FAQ ----------
export const FAQ = [
  { cat: "Orders", q: "How do I place an order?", a: "Choose a tee, a colour and a size, then check out. You don't need an account. Pay by UPI, card, netbanking or a wallet through Cashfree. A confirmation email follows within about 15 minutes of a successful payment." },
  { cat: "Orders", q: "Can I change or cancel my order?", a: `Yes, within 1 hour of ordering. Email ${mail(E.orders)} with your order number. After that it may already be in production. A custom Studio order can't be cancelled once printing starts.` },
  { cat: "Orders", q: "Do you offer cash on delivery?", a: "No. Every order is prepaid, by UPI, card, netbanking or wallet." },
  { cat: "Shipping", q: "When will my order ship?", a: "We dispatch within 2 to 3 business days. Standard delivery (free) usually takes 4 to 7 working days after that, and Express (₹149) 2 to 4. Jammu and Kashmir, Ladakh and the North-East take 2 to 3 days longer." },
  { cat: "Shipping", q: "Do you ship outside India?", a: "Not yet. We deliver across India only." },
  { cat: "Shipping", q: "My tracking hasn't updated in 48 hours.", a: `Couriers sometimes skip a scan. Send your order number to ${mail(E.info)} or on <a href="${BUSINESS.whatsapp.href}" target="_blank" rel="noopener">WhatsApp</a> and we'll chase it with them.` },
  { cat: "Products", q: "Will sold-out sizes come back?", a: "When a size sells out, the product page says so. We only post a restock date once it's confirmed." },
  { cat: "Products", q: "How do I care for my tee?", a: "Wash it cold and inside out, skip the bleach, dry it flat in the shade, and iron on the reverse, away from the print." },
  { cat: "Products", q: "What is the cloth?", a: "Combed cotton jersey at 220 to 240 GSM, knitted, cut and sewn in Tirupur, Tamil Nadu." },
  { cat: "Custom", q: "How does the Studio work?", a: "Pick a tee colour, then add text, upload your own artwork, or use one of our marks, on the front, the back or both. The tee updates in 3D as you edit. Studio tees are made to order." },
  { cat: "Custom", q: "Which files can I upload?", a: "PNG, JPG, WebP or SVG, up to 8 MB. For a sharp print, aim for at least 150 dpi at the printed size; the Studio tells you if a file is too small. A PNG with a transparent background prints cleanest." },
  { cat: "Returns", q: "What is your return policy?", a: "You can return unworn, unwashed tees with their tags within 7 days of delivery. Custom Studio tees and pieces marked Final Sale can't be returned unless they arrive damaged or faulty. Damaged, faulty or wrong items are always taken back." },
  { cat: "Returns", q: "How long does a refund take?", a: "We inspect returns within 2 to 3 working days of receiving them. After that, UPI refunds land in 1 to 3 working days, and card or netbanking refunds in 5 to 7. Store credit is immediate." },
  { cat: "Account", q: "Do I need an account?", a: "No. Guest checkout works with just an email and phone number. An account saves your addresses and keeps your orders in one place." },
  { cat: "Account", q: "How do I reset my password?", a: "There are no passwords. Sign in with a 6-digit code sent to your email or phone, or with Google." },
];

// ---------- privacy ----------
export const PRIVACY_MAP = {
  collect: [
    { id: "contact", label: "Name, email, phone" },
    { id: "address", label: "Delivery address" },
    { id: "order", label: "Orders and payment status" },
    { id: "upload", label: "Studio uploads" },
    { id: "device", label: "Device and usage data" },
  ],
  use: [
    { id: "fulfil", label: "Make and deliver your order", from: ["contact", "address", "order", "upload"] },
    { id: "signin", label: "Sign you in", from: ["contact"] },
    { id: "support", label: "Answer you", from: ["contact", "order"] },
    { id: "law", label: "Tax and legal records", from: ["contact", "address", "order"] },
    { id: "improve", label: "Keep the site working", from: ["device"] },
  ],
  share: [
    { id: "pay", label: "Cashfree (payments)", from: ["fulfil"] },
    { id: "ship", label: "Shiprocket and couriers", from: ["fulfil"] },
    { id: "infra", label: "AWS and Supabase (hosting, email)", from: ["signin", "fulfil", "support", "law"] },
    { id: "stats", label: "Analytics and ads measurement", from: ["improve"] },
  ],
};

const grievance = `${BUSINESS.grievanceName ? `${BUSINESS.grievanceName}, ` : ""}Grievance Officer, ${who}${BUSINESS.address ? `, ${BUSINESS.address}` : `, ${BUSINESS.city}`}. Email ${mail(E.info)}.`;

export const PRIVACY = [
  { id: "who", h: "Who we are", body: [
    `This notice explains how ${who} ("VelvetWolf", "we"), based in ${BUSINESS.city}, handles your personal data when you use velvetwolf.in or buy from us. Under India's Digital Personal Data Protection Act, 2023, we are the Data Fiduciary for that data.`,
  ] },
  { id: "collect", h: "What we collect", body: [
    "<b>What you give us:</b> your name, email and phone number; delivery addresses; the artwork and text you add in the Studio; and what you write to us.",
    `<b>About your orders:</b> what you bought, when, and whether the payment went through. ${BUSINESS.processor} collects your card, UPI or bank details. We never see your full card number or your UPI PIN.`,
    "<b>When you browse:</b> your IP address, device and browser type, the pages you visit and the site that sent you. Some of this comes from cookies (below).",
    "We don't ask for passwords: you sign in with a one-time code by email or SMS, or with Google, which shares only your name and email address with us.",
  ] },
  { id: "use", h: "Why we use it", body: [
    "To take payment, make your tee, deliver it, send order and delivery updates, and handle returns.",
    "To sign you in and keep your account safe, and to answer you when you write to us.",
    "To keep the invoices and records that Indian tax law requires, and to prevent fraud.",
    "To send WhatsApp delivery updates <b>only if you asked for them</b> at checkout.",
  ] },
  { id: "share", h: "Who we share it with", body: [
    "We don't sell your personal data. We share only what each service needs to do its job:",
    `<b>${BUSINESS.processor}</b> processes payments. <b>Shiprocket</b> and courier partners such as Delhivery and Blue Dart deliver your order. <b>Amazon Web Services</b> hosts the site and sends our emails. <b>Supabase</b> stores accounts, orders and Studio uploads. <b>Google</b> handles "Continue with Google" if you use it. <b>WhatsApp</b> carries delivery updates if you opt in.`,
    "<b>Analytics and advertising</b> (Google Analytics, Meta Pixel) help us see which pages work and measure our ads.",
    "We share data with the authorities only when the law requires it.",
  ] },
  { id: "cookies", h: "Cookies", body: [
    "<b>Essential</b> cookies keep your cart and sign-in working. <b>Analytics</b> cookies show us which pages work. <b>Marketing</b> cookies measure our ads.",
  ] },
  { id: "keep", h: "How long we keep it", body: [
    "<b>Orders and invoices:</b> as long as Indian tax law requires. <b>Your account and saved addresses:</b> until you delete them, which you can do in one step from your account page. <b>Studio uploads:</b> while your order is being made, and for a while after in case it needs a reprint. <b>Support messages:</b> as long as we need them to help you.",
  ] },
  { id: "rights", h: "Your rights", body: [
    "You can ask for a summary of the personal data we hold about you, have it corrected or completed, have it erased, and withdraw any consent you gave. You can also name someone to exercise these rights for you if you die or become unable to.",
    `Write to ${mail(E.info)}. We acknowledge within 48 hours. If you aren't satisfied with our answer, you can complain to the Data Protection Board of India.`,
  ] },
  { id: "security", h: "Security", body: [
    "The site runs over TLS, payments are handled by a PCI-DSS compliant processor, and access to customer data is limited to the people who need it. No system is perfectly secure: if a breach affects your data, we will tell you and the Data Protection Board without delay.",
  ] },
  { id: "children", h: "Children", body: ["The shop is for adults. We don't knowingly collect data from anyone under 18."] },
  { id: "grievance", h: "Grievance Officer", body: [grievance] },
  { id: "changes", h: "Changes to this notice", body: [`If we change how we use your data, we update this page and the date below. Last updated: ${BUSINESS.updated}.`] },
];

// ---------- terms ----------
export const TERMS = [
  { id: "about", h: "About these terms", body: [
    `These terms apply when you use velvetwolf.in or buy from ${who} ("VelvetWolf", "we"), ${BUSINESS.address || BUSINESS.city}. By placing an order you accept them, along with our <a href="/shipping-policy">shipping</a>, <a href="/returns">returns</a> and <a href="/privacy-policy">privacy</a> policies.`,
  ] },
  { id: "eligibility", h: "Who can buy", body: ["You need to be 18 or older to place an order."] },
  { id: "products", h: "Products and colour", body: [
    "We photograph and render every tee under neutral white light so the colour on screen stays close to the dyed cloth. Screens still differ, so expect small variations. Measurements are in the <a href=\"/size-guide\">size guide</a>. Our tees are made in Tirupur, Tamil Nadu, India.",
  ] },
  { id: "prices", h: "Prices and payment", body: [
    `Prices are in Indian rupees. GST is added at checkout and shown before you pay; the total at checkout is what you pay. Every order is prepaid by UPI, card, netbanking or wallet through ${BUSINESS.processor}; we don't offer cash on delivery. If we listed a clearly wrong price, we may cancel the order before dispatch and refund you in full.`,
  ] },
  { id: "orders", h: "Orders and cancellations", body: [
    "Your order is confirmed when we email you after a successful payment.",
    `You can cancel within 1 hour of ordering by writing to ${mail(E.orders)}. We may cancel an order before dispatch, for example if stock ran out or a payment looks fraudulent; you then get a full refund. Custom Studio orders can't be cancelled once printing starts.`,
  ] },
  { id: "delivery", h: "Delivery", body: ["We deliver across India. Times and charges are in the <a href=\"/shipping-policy\">shipping policy</a>. Please check your address carefully. If a parcel comes back because the address was wrong, write to us and we'll work out re-delivery."] },
  { id: "returns", h: "Returns and refunds", body: ["Returns, exchanges and refunds follow the <a href=\"/returns\">returns policy</a>. Damaged, faulty or wrong items are always taken back, including Final Sale and Studio pieces."] },
  { id: "studio", h: "Your designs in the Studio", body: [
    "When you upload artwork or text, you confirm that you made it or have permission to use it. You give us a licence to print it on your order, and on reprints of that order, and for nothing else.",
    "We may refuse a design that is hateful, obscene, or infringes someone else's rights, including trademarks, film titles and other people's likenesses used without permission. If we refuse it, we refund you in full.",
  ] },
  { id: "ours", h: "Our content", body: ["The site's designs, photos, text and code belong to VelvetWolf or the people who licensed them to us. Please don't copy them for commercial use without asking. The 3D tee is based on \"Oversized t-shirt\" by kylelhb, used under CC BY 4.0."] },
  { id: "use", h: "Using the site fairly", body: ["Please don't try to break into the site, scrape it at scale, place fraudulent orders, or present yourself as part of VelvetWolf."] },
  { id: "liability", h: "Liability", body: ["If something goes wrong with an order, our total liability is the amount you paid for that order. Nothing in these terms limits your rights under the Consumer Protection Act, 2019, or any liability the law doesn't allow us to limit."] },
  { id: "law", h: "Disputes and governing law", body: [
    `Indian law applies. Please write to us first; most things are sorted out quickly. Complaints go to our Grievance Officer at ${mail(E.info)}. We acknowledge within 48 hours and resolve within one month. Courts in Chennai have jurisdiction, and this does not affect your right to approach a consumer commission.`,
  ] },
  { id: "changes", h: "Changes", body: [`We may update these terms. The version in force when you placed your order applies to that order. Last updated: ${BUSINESS.updated}.`] },
];
