
import { useState, useEffect, useContext } from "react";
import { AppContext } from "./velvetwolf/pages/AppContext";
import { FAQPage, Policy, ShoppingPolicy, ContactPage, ReturnsPage, SizeGuide, TermsPage, TrackOrder, MosaicCarousel, ForgetPassword, Login, Signup, AccountPage } from "./index";
import { supabase } from './velvetwolf/utils/supabase';
import { getProfile } from './velvetwolf/utils/auth';
import { addCartItemDB, updateCartQtyDB, removeCartItemDB, loadCartFromDB, mergeGuestCart } from './velvetwolf/utils/cart';
import { toggleWishlistDB, loadWishlistFromDB } from './velvetwolf/utils/wishlist';
import { placeOrder, getUserOrders } from './velvetwolf/utils/order';

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --obsidian: #0a0a0a;
      --onyx: #111111;
      --graphite: #1a1a1a;
      --smoke: #2a2a2a;
      --silver: #888888;
      --ash: #c8c8c8;
      --pearl: #f0ede8;
      --ivory: #faf9f7;
      --gold: #c9a84c;
      --gold-light: #e8c97a;
      --crimson: #8b1a1a;
      --wolf-red: #c0392b;
      --font-display: 'Bebas Neue', sans-serif;
      --font-serif: 'Cormorant Garamond', serif;
      --font-mono: 'Space Mono', monospace;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--obsidian);
      color: var(--ivory);
      font-family: var(--font-serif);
      overflow-x: hidden;
      cursor: crosshair;
    }

    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: var(--obsidian); }
    ::-webkit-scrollbar-thumb { background: var(--gold); }

    /* Animations */
    @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes wolfHowl { 0% { transform: scaleX(1); } 50% { transform: scaleX(1.02); } 100% { transform: scaleX(1); } }
    @keyframes borderGlow { 0%, 100% { border-color: var(--gold); box-shadow: 0 0 10px rgba(201,168,76,0.3); } 50% { border-color: var(--gold-light); box-shadow: 0 0 20px rgba(201,168,76,0.6); } }
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @keyframes countUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }

    .animate-fadeUp { animation: fadeUp 0.6s ease forwards; }
    .animate-float { animation: float 3s ease-in-out infinite; }

    /* Noise texture overlay */
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 9999;
      opacity: 0.4;
    }

    /* Button styles */
    .btn-gold {
      background: linear-gradient(135deg, var(--gold), var(--gold-light));
      color: var(--obsidian);
      border: none;
      padding: 14px 32px;
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 3px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s ease;
      clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
    }
    .btn-gold:hover {
      background: linear-gradient(135deg, var(--gold-light), var(--gold));
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(201,168,76,0.4);
    }

    .btn-outline {
      background: transparent;
      color: var(--gold);
      border: 1px solid var(--gold);
      padding: 12px 28px;
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 3px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-outline:hover {
      background: var(--gold);
      color: var(--obsidian);
    }

    .btn-ghost {
      background: transparent;
      color: var(--ash);
      border: 1px solid var(--smoke);
      padding: 10px 22px;
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-ghost:hover { border-color: var(--silver); color: var(--ivory); }

    /* Input styles */
    .input-dark {
      background: var(--graphite);
      border: 1px solid var(--smoke);
      color: var(--ivory);
      padding: 12px 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      width: 100%;
      outline: none;
      transition: border-color 0.3s;
    }
    .input-dark:focus { border-color: var(--gold); }
    .input-dark::placeholder { color: var(--silver); }

    /* Card styles */
    .product-card {
      background: var(--onyx);
      border: 1px solid var(--smoke);
      transition: all 0.4s ease;
      position: relative;
      overflow: hidden;
    }
    .product-card::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--gold), transparent);
      transition: left 0.5s ease;
    }
    .product-card:hover::before { left: 100%; }
    .product-card:hover {
      border-color: var(--gold);
      transform: translateY(-4px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(201,168,76,0.1);
    }

    /* Marquee */
    .marquee-container { overflow: hidden; white-space: nowrap; }
    .marquee-inner { display: inline-block; animation: marquee 20s linear infinite; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    .modal-box {
      background: var(--onyx);
      border: 1px solid var(--smoke);
      max-width: 520px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      animation: fadeUp 0.3s ease;
    }

    /* Sidebar */
    .sidebar {
      position: fixed;
      top: 0; right: 0;
      width: 420px;
      max-width: 95vw;
      height: 100vh;
      background: var(--onyx);
      border-left: 1px solid var(--smoke);
      z-index: 900;
      animation: slideRight 0.3s ease;
      overflow-y: auto;
    }

    /* Admin */
    .admin-sidebar {
      width: 240px;
      min-height: 100vh;
      background: var(--graphite);
      border-right: 1px solid var(--smoke);
      flex-shrink: 0;
    }

    /* Tag badge */
    .badge {
      font-family: var(--font-mono);
      font-size: 9px;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 3px 8px;
    }

    /* Gold shimmer text */
    .gold-text {
      background: linear-gradient(90deg, var(--gold), var(--gold-light), var(--gold));
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }

    /* Section divider */
    .divider {
      width: 60px;
      height: 1px;
      background: var(--gold);
      margin: 16px auto;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: var(--graphite);
      border: 1px solid var(--gold);
      color: var(--ivory);
      padding: 14px 24px;
      font-family: var(--font-mono);
      font-size: 11px;
      z-index: 9998;
      animation: fadeUp 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    select.input-dark { appearance: none; cursor: pointer; }
    textarea.input-dark { resize: vertical; min-height: 100px; }

    @media (max-width: 768px) {
      .sidebar { width: 100vw; }
      .admin-sidebar { width: 180px; }
    }
  `}</style>
);

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
// AppContext is imported from ./AppContext.js — shared with Login, Signup, ForgetPassword

// ─── DATA ────────────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { id: "ai-tech", name: "AI & Tech Humor", icon: "⚡", color: "#4fc3f7" },
  { id: "anime", name: "Anime Anarchy", icon: "⛩", color: "#f06292" },
  { id: "xp-mode", name: "XP Mode: Activated", icon: "🖥", color: "#81c784" },
  { id: "beast-mode", name: "Beast Mode Grind", icon: "🔥", color: "#ff8a65" },
  { id: "mind-mayhem", name: "Mind Over Mayhem", icon: "🧠", color: "#ce93d8" },
  { id: "silent-luxury", name: "Silent Luxury", icon: "◆", color: "#c9a84c" },
  { id: "savage-quotes", name: "Savage Quotes", icon: "💬", color: "#ef5350" },
  { id: "founder", name: "Founder Energy", icon: "🚀", color: "#ffd54f" },
  { id: "trending", name: "Trending Now", icon: "📈", color: "#80cbc4" },
  { id: "limited", name: "Limited Edition", icon: "🏷", color: "#ffab91" },
  { id: "most-loved", name: "Most Loved", icon: "♥", color: "#f48fb1" },
  { id: "budget", name: "Under ₹999", icon: "◎", color: "#a5d6a7" },
  { id: "custom", name: "Upload Your Design", icon: "✦", color: "#b0bec5" },
  { id: "bulk", name: "Bulk Orders", icon: "📦", color: "#bcaaa4" },
  { id: "corporate", name: "Corporate Orders", icon: "🏢", color: "#90caf9" },
];

const INITIAL_PRODUCTS = [
  { id: 1, name: "Neural Network Tee", collection: "ai-tech", price: 1299, originalPrice: 1899, image: null, sizes: ["XS","S","M","L","XL","XXL"], colors: ["#0a0a0a","#1a1a2e","#f0ede8"], rating: 4.8, reviews: 234, tag: "BESTSELLER", description: "Minimal circuit-board motif. 100% Egyptian cotton, 220 GSM.", stock: 45 },
  { id: 2, name: "Silent Predator", collection: "silent-luxury", price: 2499, originalPrice: 3200, image: null, sizes: ["S","M","L","XL"], colors: ["#0a0a0a","#2c2c2c"], rating: 4.9, reviews: 189, tag: "LIMITED", description: "Embossed wolf crest. Supima cotton, hand-stitched details.", stock: 12 },
  { id: 3, name: "Founder's Mindset", collection: "founder", price: 1599, originalPrice: 1999, image: null, sizes: ["XS","S","M","L","XL","XXL"], colors: ["#0a0a0a","#1a1a1a","#faf9f7"], rating: 4.7, reviews: 312, tag: "NEW", description: "Bold motivational typography. Heavyweight fleece blend.", stock: 78 },
  { id: 4, name: "Demon Mode Activated", collection: "anime", price: 899, originalPrice: 1299, image: null, sizes: ["S","M","L","XL"], colors: ["#0a0a0a","#1a0010"], rating: 4.6, reviews: 445, tag: "TRENDING", description: "Anime-inspired demon slayer aesthetic. Oversized drop cut.", stock: 33 },
  { id: 5, name: "100 Days of Grind", collection: "beast-mode", price: 1199, originalPrice: 1499, image: null, sizes: ["M","L","XL","XXL"], colors: ["#0a0a0a","#111111"], rating: 4.8, reviews: 267, tag: "HOT", description: "Motivational beast-mode print. Moisture-wicking fabric.", stock: 56 },
  { id: 6, name: "Error 404: Sleep", collection: "ai-tech", price: 799, originalPrice: 999, image: null, sizes: ["XS","S","M","L","XL","XXL"], colors: ["#0a0a0a","#0a1628","#faf9f7"], rating: 4.5, reviews: 523, tag: "MOST LOVED", description: "Geek humor meets streetwear. Ultra-soft jersey.", stock: 120 },
  { id: 7, name: "Wolf Among Sheep", collection: "savage-quotes", price: 1399, originalPrice: 1799, image: null, sizes: ["S","M","L","XL"], colors: ["#0a0a0a","#2a0a0a"], rating: 4.9, reviews: 198, tag: "SIGNATURE", description: "Signature VelvetWolf statement piece. Garment-dyed.", stock: 29 },
  { id: 8, name: "Mind Palace Tee", collection: "mind-mayhem", price: 1699, originalPrice: 2199, image: null, sizes: ["XS","S","M","L","XL"], colors: ["#0a0a0a","#0a0a1a","#1a0a0a"], rating: 4.7, reviews: 143, tag: "NEW", description: "Surrealist brain artwork. Artist collaboration piece.", stock: 41 },
];

const TAG_COLORS = {
  "BESTSELLER": { bg: "#c9a84c", color: "#0a0a0a" },
  "LIMITED": { bg: "#8b1a1a", color: "#faf9f7" },
  "NEW": { bg: "#1a3a1a", color: "#81c784" },
  "TRENDING": { bg: "#1a1a3a", color: "#4fc3f7" },
  "HOT": { bg: "#3a1a0a", color: "#ff8a65" },
  "MOST LOVED": { bg: "#3a0a1a", color: "#f48fb1" },
  "SIGNATURE": { bg: "#2a1a0a", color: "#c9a84c" },
};

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    wolf: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2L8 6H4l3 3-1 5 6-3 6 3-1-5 3-3h-4L12 2zm0 8a2 2 0 100 4 2 2 0 000-4z"/></svg>,
    cart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    heart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    heartFill: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    menu: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    minus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    arrowRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    package: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    upload: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  };
  return icons[name] || null;
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const colors = { success: "#c9a84c", error: "#c0392b", info: "#4fc3f7" };
  return (
    <div className="toast" style={{ borderColor: colors[type] }}>
      <span style={{ color: colors[type] }}>
        {type === "success" ? "✓" : type === "error" ? "✕" : "i"}
      </span>
      {message}
    </div>
  );
};

// ─── PRODUCT IMAGE PLACEHOLDER ────────────────────────────────────────────────
const ProductImage = ({ product, height = 280 }) => {
  const collectionColors = {
    "ai-tech": ["#0a1628", "#1a2a4a", "#4fc3f7"],
    "anime": ["#1a0010", "#2a0020", "#f06292"],
    "silent-luxury": ["#1a1a0a", "#2a2a1a", "#c9a84c"],
    "founder": ["#0a1a0a", "#1a2a1a", "#ffd54f"],
    "beast-mode": ["#1a0a00", "#2a1a00", "#ff8a65"],
    "mind-mayhem": ["#0a001a", "#1a0a2a", "#ce93d8"],
    "savage-quotes": ["#1a0a0a", "#2a0000", "#ef5350"],
    "xp-mode": ["#001a00", "#0a2a0a", "#81c784"],
  };
  const cols = collectionColors[product.collection] || ["#111","#1a1a1a","#888"];
  return (
    <div style={{
      height, background: `linear-gradient(135deg, ${cols[0]}, ${cols[1]})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${cols[2]}22, transparent 70%)`
      }}/>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 72, color: cols[2],
        opacity: 0.15, userSelect: "none", letterSpacing: 4,
        position: "absolute"
      }}>VW</div>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 22, color: cols[2],
          letterSpacing: 3, lineHeight: 1.2
        }}>
          {product.name.split(" ").map((w, i) => <div key={i}>{w}</div>)}
        </div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 9, color: cols[2],
          opacity: 0.6, letterSpacing: 2, marginTop: 10
        }}>VELVETWOLF</div>
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 60, background: `linear-gradient(transparent, ${cols[0]}88)`
      }}/>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function VelvetWolf() {
  const [page, setPage] = useState("home");
  const [adminPage, setAdminPage] = useState("dashboard");
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
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
  const [orders, setOrders] = useState([
    { id: "VW-2024-001", date: "2024-12-10", items: 2, total: 2598, status: "Delivered", customer: "Arjun Mehta" },
    { id: "VW-2024-002", date: "2024-12-12", items: 1, total: 2499, status: "Shipped", customer: "Priya Sharma" },
    { id: "VW-2024-003", date: "2024-12-14", items: 3, total: 4197, status: "Processing", customer: "Ravi Kumar" },
    { id: "VW-2024-004", date: "2024-12-15", items: 1, total: 899, status: "Pending", customer: "Sneha Patel" },
  ]);
  const [customers] = useState([
    { id: 1, name: "Arjun Mehta", email: "arjun@example.com", orders: 5, spent: 12450, joined: "Oct 2024", tier: "Gold" },
    { id: 2, name: "Priya Sharma", email: "priya@example.com", orders: 3, spent: 7890, joined: "Nov 2024", tier: "Silver" },
    { id: 3, name: "Ravi Kumar", email: "ravi@example.com", orders: 8, spent: 21300, joined: "Sep 2024", tier: "Platinum" },
    { id: 4, name: "Sneha Patel", email: "sneha@example.com", orders: 2, spent: 3400, joined: "Dec 2024", tier: "Bronze" },
    { id: 5, name: "Kabir Singh", email: "kabir@example.com", orders: 12, spent: 34560, joined: "Aug 2024", tier: "Platinum" },
  ]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const getLocalWishlistKey = (email) => `vw_wishlist_${(email || "guest").toLowerCase()}`;
  const getGuestCart = () => JSON.parse(localStorage.getItem("vw_guest_cart") || "[]");

  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const parseBackendToken = (token) => {
    try {
      const payload = token.split(".")[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
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

  const buildUserState = async (authUser) => {
    const storedUser = getStoredUser();

    if (!authUser?.id) {
      return {
        ...storedUser,
        ...authUser,
        email: authUser.email || storedUser?.email,
        name: authUser.name || storedUser?.name || authUser.email?.split("@")[0],
        full_name: authUser.full_name || authUser.name || storedUser?.full_name || storedUser?.name,
        authSource: authUser.authSource || storedUser?.authSource || "backend",
        isAdmin: storedUser?.isAdmin || false,
      };
    }

    try {
      const profile = await getProfile(authUser.id);
      return {
        ...storedUser,
        ...authUser,
        ...profile,
        name: profile.full_name || storedUser?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
        isAdmin: profile.is_admin,
      };
    } catch (err) {
      console.warn("[buildUserState]", err.message);
      return {
        ...storedUser,
        ...authUser,
        name: storedUser?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
        full_name: storedUser?.full_name || authUser.user_metadata?.full_name,
        isAdmin: storedUser?.isAdmin || false,
      };
    }
  };

  // ── syncCartFromDB: loads DB cart into React state ──────────────────────────
  // Defined first — addToCart/removeFromCart below both call it
  const syncCartFromDB = async (userId) => {
    try {
      const items = await loadCartFromDB(userId);
      setCart(items);
    } catch (err) {
      console.error('[syncCartFromDB]', err.message);
    }
  };

  const addToCart = async (product, size, color, qty = 1) => {
    try {
      if (user?.id) {
        await addCartItemDB(user.id, product, size, color, qty);
        await syncCartFromDB(user.id);
      } else {
        // Guest: save to localStorage
        const guest = getGuestCart();
        const idx = guest.findIndex(i => i.id === product.id && i.size === size && i.color === color);
        if (idx > -1) guest[idx].qty += qty;
        else guest.push({ ...product, size, color, qty });
        localStorage.setItem('vw_guest_cart', JSON.stringify(guest));
        setCart(guest);
      }
      showToast('Added to cart ✓');
    } catch (err) {
      showToast('Could not add to cart. Please try again.', 'error');
      console.error('[addToCart]', err.message);
    }
  };

  const removeFromCart = async (id, size, color) => {
    try {
      if (user?.id) {
        const item = cart.find(i => i.id === id && i.size === size && i.color === color);
        if (item?.cart_item_id) await removeCartItemDB(item.cart_item_id);
        await syncCartFromDB(user.id);
      } else {
        setCart(prev => prev.filter(i => !(i.id === id && i.size === size && i.color === color)));
      }
    } catch (err) {
      showToast('Could not remove item.', 'error');
      console.error('[removeFromCart]', err.message);
    }
  };

  const updateCartQty = async (id, size, color, qty) => {
    if (user?.id) {
      // For DB-backed cart: find the cart_item_id, update via DB
      const item = cart.find(i => i.id === id && i.size === size && i.color === color);
      if (item?.cart_item_id) {
        if (qty < 1) {
          await removeCartItemDB(item.cart_item_id);
        } else {
          await updateCartQtyDB(item.cart_item_id, qty);
        }
        await syncCartFromDB(user.id);
      }
    } else {
      // Guest cart: update local state
      if (qty < 1) {
        setCart(prev => prev.filter(i => !(i.id === id && i.size === size && i.color === color)));
      } else {
        setCart(prev => prev.map(i => i.id === id && i.size === size && i.color === color ? { ...i, qty } : i));
      }
    }
  };

  // merge guest localStorage cart into DB on login
  const mergeGuestCartToDB = async (userId) => {
    try {
      await mergeGuestCart(userId);
    } catch (err) {
      console.error('[mergeGuestCartToDB]', err.message);
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
      setPage('login');
      showToast('Sign in to save items', 'info');
      return;
    }
    if (!user?.id) {
      const added = toggleLocalWishlist(product);
      showToast(added ? 'Added to wishlist â™¥' : 'Removed from wishlist', added ? 'success' : 'info');
      return;
    }
    try {
      const added = await toggleWishlistDB(user.id, product);
      await syncWishlistFromDB(user.id);
      showToast(added ? 'Added to wishlist ♥' : 'Removed from wishlist', added ? 'success' : 'info');
    } catch (err) {
      showToast('Could not update wishlist', 'error');
      console.error('[toggleWishlist]', err.message);
    }
  };

  const signOutUser = async () => {
    try {
      if (user?.id) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      setWishlist([]);
      setCart([]);
      setPage("home");
      showToast("Signed out successfully", "info");
    } catch (err) {
      console.error("[signOutUser]", err.message);
      showToast("Sign out failed", "error");
    }
  };

  // Coerce to numbers — Supabase returns numeric columns as strings via JS client
  const cartTotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const cartCount = cart.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  const ctx = {
    page, setPage, adminPage, setAdminPage,
    products, setProducts, cart, setCart,
    wishlist, setWishlist, user, setUser,
    cartOpen, setCartOpen, wishlistOpen, setWishlistOpen,
    authModal, setAuthModal, selectedProduct, setSelectedProduct,
    activeCollection, setActiveCollection, searchQuery, setSearchQuery,
    orders, customers, cartTotal, cartCount,
    addToCart, removeFromCart, updateCartQty, toggleWishlist, signOutUser, showToast,
  };

  // ── Scroll to top on every page change ──────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  // ── Session init + auth state listener ──────────────────────────────────────
  useEffect(() => {
    const applySignedInUser = async (authUser, mergeGuestCart = false) => {
      const nextUser = await buildUserState(authUser);
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));

      if (mergeGuestCart && authUser?.id) {
        await mergeGuestCartToDB(authUser.id);
      }

      if (authUser?.id) {
        await syncCartFromDB(authUser.id);
        await syncWishlistFromDB(authUser.id);
      } else {
        setCart(getGuestCart());
        setWishlist(loadLocalWishlist(nextUser.email));
      }
    };

    const clearSignedInUser = () => {
      setUser(null);
      setCart([]);
      setWishlist([]);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    };

    const query = new URLSearchParams(window.location.search);
    const backendToken = query.get("token");
    if (backendToken) {
      const decoded = parseBackendToken(backendToken);
      if (decoded?.email) {
        const backendUser = {
          ...decoded,
          full_name: decoded.name,
          authSource: "google",
        };
        localStorage.setItem("token", backendToken);
        localStorage.setItem("user", JSON.stringify(backendUser));
        setUser(backendUser);
        setWishlist(loadLocalWishlist(backendUser.email));
        setCart(getGuestCart());
        setPage("account");
      }
      query.delete("token");
      const nextQuery = query.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }

    const storedUser = getStoredUser();
    if (storedUser?.email) {
      setUser(storedUser);
      if (!storedUser?.id) {
        setWishlist(loadLocalWishlist(storedUser.email));
        setCart(getGuestCart());
      }
    }

    // 1. Get session on first load (handles page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await applySignedInUser(session.user);
      } else if (!storedUser?.email) {
        clearSignedInUser();
      }
    });

    // 2. Listen for login/logout/token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && session?.user) {
          await applySignedInUser(session.user, event === "SIGNED_IN");
        }
        if (event === "SIGNED_OUT") {
          clearSignedInUser();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);     

  useEffect(() => {
    if (user && ["login", "signup", "forgetpassword"].includes(page)) {
      setPage("account");
    }
  }, [page, user]);

  return (
    <AppContext.Provider value={ctx}>
      <GlobalStyles />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {page === "admin" ? <AdminLayout /> : (
        <>
          {/* ── Auth pages: standalone, no Navbar / Footer ── */}
          {page === "login"           && <Login />}
          {page === "signup"          && <Signup />}
          {page === "forgetpassword"  && <ForgetPassword />}

          {/* ── All other pages: wrapped with Navbar + Footer ── */}
          {!["login", "signup", "forgetpassword"].includes(page) && (
            <>
              <Navbar />
              {page === "home"           && <HomePage />}
              {page === "shop"           && <ShopPage />}
              {page === "collection"     && <CollectionPage />}
              {page === "account"        && <AccountPage />}
              {page === "checkout"       && <CheckoutPage />}
              {page === "custom"         && <CustomDesignPage />}
              {page === "bulk"           && <BulkOrderPage />}
              {page === "contactus"      && <ContactPage />}
              {page === "faq"            && <FAQPage />}
              {page === "privacypolicy"  && <Policy />}
              {page === "shoppingpolicy" && <ShoppingPolicy />}
              {page === "termspage"      && <TermsPage />}
              {page === "returnspage"    && <ReturnsPage />}
              {page === "sizeguide"      && <SizeGuide />}
              {page === "trackorder"     && <TrackOrder />}
              <Footer />
            </>
          )}
        </>
      )}

      {cartOpen && <CartSidebar />}
      {wishlistOpen && <WishlistSidebar />}
      {authModal && <AuthModal />}
      {selectedProduct && <ProductModal />}
    </AppContext.Provider>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar() {
  const { setPage, setCartOpen, setWishlistOpen, user, cartCount, wishlist, signOutUser } = useContext(AppContext);
  const [scrolled, setScrolled] = useState(false);
  const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "";
  const greetingName = displayName ? displayName.split(" ")[0] : "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 800,
      background: scrolled ? "rgba(10,10,10,0.95)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(201,168,76,0.2)" : "none",
      transition: "all 0.4s ease",
      padding: "0 40px",
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
        {/* Logo */}
        <div onClick={() => setPage("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--obsidian)" }}>VW</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 6, color: "var(--ivory)", lineHeight: 1 }}>VELVETWOLF</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", opacity: 0.8 }}>LUXURY STREETWEAR</div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {[["SHOP", "shop"], ["COLLECTIONS", "collection"], ["CUSTOM", "custom"], ["BULK", "bulk"]].map(([label, pg]) => (
            <button key={pg} onClick={() => setPage(pg)} style={{
              background: "none", border: "none", color: "var(--ash)", cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: 17, letterSpacing: 3,
              transition: "color 0.3s", padding: "4px 0", position: "relative"
            }}
              onMouseEnter={e => { e.target.style.color = "var(--gold)"; }}
              onMouseLeave={e => { e.target.style.color = "var(--ash)"; }}
            >{label}</button>
          ))}
          {user?.isAdmin && (
            <button onClick={() => setPage("admin")} style={{
              background: "none", border: "1px solid var(--gold)", color: "var(--gold)", cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, padding: "4px 12px"
            }}>ADMIN</button>
          )}
        </div>

        {/* Icons */}
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <button onClick={() => user ? setWishlistOpen(true) : setPage("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", position: "relative" }}>
            <Icon name="heart" size={22} />
            {wishlist.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "var(--wolf-red)", color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8 }}>{wishlist.length}</span>}
          </button>
          <button onClick={() => setCartOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", position: "relative" }}>
            <Icon name="cart" size={22} />
            {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "var(--gold)", color: "var(--obsidian)", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: "bold" }}>{cartCount}</span>}
          </button>
          {greetingName && (
            <button
              onClick={() => setPage("account")}
              style={{ background: "none", border: "1px solid rgba(201,168,76,0.35)", color: "var(--gold)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5, padding: "8px 12px", textTransform: "none" }}
            >
              {`Hi ${greetingName}`}
            </button>
          )}
          {user && (
            <button
              onClick={signOutUser}
              style={{ background: "none", border: "1px solid var(--smoke)", color: "var(--ash)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, padding: "8px 12px" }}
            >
              SIGN OUT
            </button>
          )}
          <button onClick={() => user ? setPage("account") : setPage("login")} style={{ background: "none", border: "none", cursor: "pointer", color: user ? "var(--gold)" : "var(--ash)" }}>
            <Icon name="user" size={22} />
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const { setPage, setActiveCollection, products, addToCart, toggleWishlist, wishlist, setSelectedProduct } = useContext(AppContext);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroSlides = [
    { headline: "WEAR THE", accent: "SILENCE", sub: "Silent Luxury Collection — AW 2024", collection: "silent-luxury" },
    { headline: "BEAST", accent: "MODE ON", sub: "Grind. Hustle. Dominate.", collection: "beast-mode" },
    { headline: "FOUNDER'S", accent: "MINDSET", sub: "Built for builders. Worn by wolves.", collection: "founder" },
  ];
  useEffect(() => { const t = setInterval(() => setHeroIndex(i => (i + 1) % heroSlides.length), 5000); return () => clearInterval(t); }, []);

  const slide = heroSlides[heroIndex];
  const featured = products.slice(0, 4);
  const trending = products.filter(p => p.tag === "TRENDING" || p.tag === "HOT" || p.tag === "MOST LOVED");

  return (
    <div>
      {/* HERO */}
      <section style={{ minHeight: "85vh", position: "relative", display: "flex", alignItems: "center", overflow: "visible", paddingTop: "100px", paddingBottom: "80px"}}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a1a 100%)" }}/>
        {/* Geometric accents */}
        <div style={{ position: "absolute", top: "25%", right: "5%", width: 400, height: 400, border: "1px solid rgba(201,168,76,0.1)", transform: "rotate(45deg)", animation: "float 6s ease-in-out infinite" }}/>
        <div style={{ position: "absolute", bottom: "25%", left: "50%", width: 200, height: 200, border: "1px solid rgba(201,168,76,0.15)", transform: "rotate(15deg)", animation: "float 4s ease-in-out infinite reverse" }}/>
        <div style={{ position: "absolute", top: "50%", right: "15%", width: 2, height: 300, background: "linear-gradient(transparent, var(--gold), transparent)" }}/>

        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px", zIndex: 1, width: "100%" }}>
          <div key={heroIndex} style={{ animation: "fadeUp 0.8s ease" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: 6, color: "var(--gold)", marginBottom: 24 }}>✦ NEW COLLECTION 2026 ✦</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(72px, 12vw, 160px)", lineHeight: 0.9, letterSpacing: -2, marginBottom: 8 }}>
              <span style={{ color: "var(--ivory)", display: "block" }}>{slide.headline}</span>
              <span className="gold-text" style={{ display: "block" }}>{slide.accent}</span>
            </h1>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", fontStyle: "italic", marginTop: 24, marginBottom: 40 }}>{slide.sub}</p>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="btn-gold" onClick={() => { setActiveCollection(slide.collection); setPage("collection"); }}>
                EXPLORE COLLECTION
              </button>
              <button className="btn-outline" onClick={() => setPage("shop")}>SHOP ALL</button>
            </div>
          </div>
          {/* Hero slide indicators */}
          <div style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
            {heroSlides.map((_, i) => (
              <div key={i} onClick={() => setHeroIndex(i)} style={{ width: i === heroIndex ? 32 : 8, height: 2, background: i === heroIndex ? "var(--gold)" : "var(--smoke)", cursor: "pointer", transition: "all 0.4s ease" }}/>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ background: "var(--gold)", padding: "12px 0", overflow: "hidden" }}>
        <div className="marquee-container">
          <div className="marquee-inner" style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 4, color: "var(--obsidian)" }}>
            {Array(3).fill("✦  VELVET WOLF   ✦   LUXURY STREETWEAR   ✦   PREMIUM 220 GSM COTTON   ✦   MADE IN INDIA   ✦   FREE SHIPPING ABOVE ₹1999   ✦   30 DAY EASY RETURNS ").join("")}
          </div>
        </div>
      </div>

      {/* STATS */}
      <section style={{ background: "var(--graphite)", padding: "60px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40, textAlign: "center" }}>
          {[["10,000+", "Happy Wolves"], ["220 GSM", "Premium Cotton"], ["48hr", "Dispatch"], ["100%", "India Made"]].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--gold)", letterSpacing: 2 }}>{num}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3, color: "var(--silver)", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MOSAIC CAROUSEL */}
      <MosaicCarousel
        onCategoryClick={(cat) => {
          setActiveCollection(cat.id);
          setPage("collection");
        }}
      />
      {/* COLLECTIONS GRID */}
      <section style={{ padding: "100px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>OUR UNIVERSE</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 64, letterSpacing: 4, color: "var(--ivory)" }}>COLLECTIONS</h2>
          <div className="divider"/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {COLLECTIONS.map(col => (
            <div key={col.id} onClick={() => { setActiveCollection(col.id); setPage("collection"); }}
              style={{
                background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 20px",
                cursor: "pointer", transition: "all 0.3s ease", textAlign: "center", position: "relative", overflow: "hidden"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = col.color; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.transform = ""; }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{col.icon}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--ash)", lineHeight: 1.4 }}>{col.name.toUpperCase()}</div>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: col.color, opacity: 0, transition: "opacity 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}/>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section style={{ padding: "80px 40px", background: "var(--graphite)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>HANDPICKED FOR YOU</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: 3 }}>FEATURED PIECES</h2>
            </div>
            <button className="btn-outline" onClick={() => setPage("shop")}>VIEW ALL <Icon name="arrowRight" size={12}/></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* WHY VELVETWOLF */}
      <section style={{ padding: "100px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>OUR PROMISE</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: 3 }}>WHY VELVETWOLF</h2>
          <div className="divider"/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            ["◆", "Silent Luxury", "No logo. No noise. Just impeccable quality that speaks through fabric weight, stitch precision, and silhouette."],
            ["⚡", "Culture-First Design", "Every drop is rooted in real youth culture — tech humor, anime, hustle, philosophy. Not trend-chasing."],
            ["✦", "India's Finest", "220 GSM Egyptian cotton. Hand-finished details. Made by master craftspeople in Tirupur, Tamil Nadu."],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ padding: "40px 32px", border: "1px solid var(--smoke)", position: "relative" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--gold)", marginBottom: 20 }}>{icon}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 16 }}>{title}</h3>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", lineHeight: 1.7 }}>{desc}</p>
              <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "linear-gradient(transparent, var(--gold), transparent)" }}/>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section style={{ background: "linear-gradient(135deg, var(--graphite), var(--smoke))", padding: "80px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)" }}/>
        <div style={{ maxWidth: 700, margin: "0 auto", zIndex: 1, position: "relative" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 8, color: "var(--gold)", marginBottom: 24 }}>✦ DESIGN YOUR IDENTITY ✦</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 64, lineHeight: 0.95, letterSpacing: 2, marginBottom: 24 }}>
            UPLOAD YOUR<br/><span className="gold-text">OWN DESIGN</span>
          </h2>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 19, color: "var(--silver)", fontStyle: "italic", marginBottom: 40 }}>
            Your vision. Our premium canvas. Upload your artwork and we'll bring it to life on luxury-grade fabric.
          </p>
          <button className="btn-gold" onClick={() => setPage("custom")} style={{ fontSize: 12, padding: "16px 40px" }}>
            START DESIGNING
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const { addToCart, toggleWishlist, wishlist, setSelectedProduct } = useContext(AppContext);
  const inWishlist = wishlist.find(i => i.id === product.id);
  const tagStyle = TAG_COLORS[product.tag] || { bg: "var(--smoke)", color: "var(--ash)" };
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <div className="product-card" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative" }}>
        <ProductImage product={product} />
        {/* Overlay actions */}
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
          opacity: 0, transition: "opacity 0.3s"
        }} className="card-overlay"
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}>
          <button className="btn-gold" onClick={() => setSelectedProduct(product)} style={{ padding: "10px 24px", fontSize: 10 }}>QUICK VIEW</button>
          <button className="btn-ghost" onClick={() => addToCart(product, product.sizes[0], product.colors[0])} style={{ padding: "10px 24px" }}>ADD TO CART</button>
        </div>
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <span className="badge" style={{ background: tagStyle.bg, color: tagStyle.color }}>{product.tag}</span>
        </div>
        {discount > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "var(--wolf-red)", color: "#fff", padding: "2px 8px", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1 }}>-{discount}%</div>}
        <button onClick={() => toggleWishlist(product)} style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", padding: 8, color: inWishlist ? "var(--wolf-red)" : "var(--ash)" }}>
          <Icon name={inWishlist ? "heartFill" : "heart"} size={16} color={inWishlist ? "#c0392b" : "var(--ash)"} />
        </button>
      </div>
      <div style={{ padding: "20px 20px 24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", marginBottom: 6 }}>
          {COLLECTIONS.find(c => c.id === product.collection)?.name?.toUpperCase()}
        </div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, marginBottom: 8 }}>{product.name}</h3>
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {[1,2,3,4,5].map(s => <Icon key={s} name="star" size={10} color={s <= Math.floor(product.rating) ? "#c9a84c" : "#333"} />)}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", marginLeft: 4 }}>({product.reviews})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--gold)" }}>₹{product.price.toLocaleString()}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", textDecoration: "line-through" }}>₹{product.originalPrice.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SHOP PAGE ────────────────────────────────────────────────────────────────
function ShopPage() {
  const { products, activeCollection, setActiveCollection, searchQuery } = useContext(AppContext);
  const [sort, setSort] = useState("featured");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = products
    .filter(p => !activeCollection || p.collection === activeCollection)
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.collection?.toLowerCase().includes(q) ||
        p.tag?.toLowerCase().includes(q)
      );
    })
    .filter(p => Number(p.price) >= priceRange[0] && Number(p.price) <= priceRange[1])
    .filter(p => selectedSizes.length === 0 || p.sizes.some(s => selectedSizes.includes(s)))
    .sort((a, b) => {
      if (sort === "price-asc") return Number(a.price) - Number(b.price);
      if (sort === "price-desc") return Number(b.price) - Number(a.price);
      if (sort === "rating") return Number(b.rating) - Number(a.rating);
      return 0;
    });

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "var(--graphite)", padding: "60px 40px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>VELVETWOLF STORE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: 4 }}>
            {activeCollection ? COLLECTIONS.find(c => c.id === activeCollection)?.name?.toUpperCase() : "ALL PRODUCTS"}
          </h1>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "var(--silver)", marginTop: 8 }}>{filtered.length} pieces available</p>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 40px", display: "flex", gap: 40 }}>
        {/* Sidebar filters */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--gold)", marginBottom: 16 }}>COLLECTIONS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => setActiveCollection(null)} style={{ background: "none", border: "none", cursor: "pointer", color: !activeCollection ? "var(--gold)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, textAlign: "left", padding: "4px 0" }}>ALL</button>
              {COLLECTIONS.map(col => (
                <button key={col.id} onClick={() => setActiveCollection(activeCollection === col.id ? null : col.id)} style={{ background: "none", border: "none", cursor: "pointer", color: activeCollection === col.id ? "var(--gold)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, textAlign: "left", padding: "4px 0", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{col.icon}</span>{col.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--gold)", marginBottom: 16 }}>SIZE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["XS","S","M","L","XL","XXL"].map(size => (
                <button key={size} onClick={() => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])} style={{ background: selectedSizes.includes(size) ? "var(--gold)" : "transparent", border: "1px solid", borderColor: selectedSizes.includes(size) ? "var(--gold)" : "var(--smoke)", color: selectedSizes.includes(size) ? "var(--obsidian)" : "var(--silver)", padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>{size}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 2 }}>{filtered.length} RESULTS</div>
            <select className="input-dark" value={sort} onChange={e => setSort(e.target.value)} style={{ width: "auto", padding: "8px 16px" }}>
              <option value="featured">FEATURED</option>
              <option value="price-asc">PRICE: LOW TO HIGH</option>
              <option value="price-desc">PRICE: HIGH TO LOW</option>
              <option value="rating">TOP RATED</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--silver)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, opacity: 0.3, marginBottom: 16 }}>EMPTY</div>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>No products match your filters.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── COLLECTION PAGE ──────────────────────────────────────────────────────────
function CollectionPage() {
  const { setPage, setActiveCollection } = useContext(AppContext);
  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div style={{ background: "var(--graphite)", padding: "60px 40px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>EXPLORE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: 4 }}>ALL COLLECTIONS</h1>
        </div>
      </div>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "60px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {COLLECTIONS.map(col => (
            <div key={col.id} onClick={() => { setActiveCollection(col.id); setPage("shop"); }}
              style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "48px 32px", cursor: "pointer", transition: "all 0.3s ease", position: "relative", overflow: "hidden" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = col.color; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.querySelector(".col-bg").style.opacity = 1; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.transform = ""; e.currentTarget.querySelector(".col-bg").style.opacity = 0; }}>
              <div className="col-bg" style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 80% 50%, ${col.color}11, transparent 70%)`, opacity: 0, transition: "opacity 0.4s" }}/>
              <div style={{ fontSize: 48, marginBottom: 20 }}>{col.icon}</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 12 }}>{col.name.toUpperCase()}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: col.color, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2 }}>
                EXPLORE <Icon name="arrowRight" size={12} color={col.color}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT MODAL ────────────────────────────────────────────────────────────
function ProductModal() {
  const { selectedProduct: p, setSelectedProduct, addToCart, toggleWishlist, wishlist } = useContext(AppContext);
  const [size, setSize] = useState(p.sizes[0]);
  const [color, setColor] = useState(p.colors[0]);
  const [qty, setQty] = useState(1);
  const inWishlist = wishlist.find(i => i.id === p.id);

  return (
    <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
      <div className="modal-box" style={{ maxWidth: 880, display: "flex", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ flex: 1, flexShrink: 0 }}>
          <ProductImage product={p} height={420} />
        </div>
        <div style={{ flex: 1, padding: 40, overflowY: "auto" }}>
          <button onClick={() => setSelectedProduct(null)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="x" size={20}/></button>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>
            {COLLECTIONS.find(c => c.id === p.collection)?.name?.toUpperCase()}
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2, marginBottom: 12 }}>{p.name}</h2>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {[1,2,3,4,5].map(s => <Icon key={s} name="star" size={12} color={s <= Math.floor(p.rating) ? "#c9a84c" : "#333"}/>)}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", marginLeft: 6 }}>{p.rating} ({p.reviews} reviews)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>₹{p.price.toLocaleString()}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--silver)", textDecoration: "line-through" }}>₹{p.originalPrice.toLocaleString()}</span>
          </div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--silver)", lineHeight: 1.7, marginBottom: 24 }}>{p.description}</p>

          {/* Color */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--ash)", marginBottom: 10 }}>COLOR</div>
            <div style={{ display: "flex", gap: 8 }}>
              {p.colors.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "2px solid var(--gold)" : "2px solid transparent", cursor: "pointer", outline: "2px solid var(--smoke)" }}/>
              ))}
            </div>
          </div>

          {/* Size */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--ash)", marginBottom: 10 }}>SIZE</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {p.sizes.map(s => (
                <button key={s} onClick={() => setSize(s)} style={{ padding: "8px 14px", border: "1px solid", borderColor: size === s ? "var(--gold)" : "var(--smoke)", background: size === s ? "var(--gold)" : "transparent", color: size === s ? "var(--obsidian)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Qty */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--ash)", marginBottom: 10 }}>QUANTITY</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--smoke)", width: "fit-content" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "8px 14px" }}><Icon name="minus" size={14}/></button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ivory)", padding: "0 16px" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "8px 14px" }}><Icon name="plus" size={14}/></button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-gold" style={{ flex: 1 }} onClick={() => { addToCart(p, size, color, qty); setSelectedProduct(null); }}>ADD TO CART</button>
            <button onClick={() => toggleWishlist(p)} style={{ background: inWishlist ? "rgba(192,57,43,0.2)" : "transparent", border: `1px solid ${inWishlist ? "var(--wolf-red)" : "var(--smoke)"}`, color: inWishlist ? "var(--wolf-red)" : "var(--silver)", padding: "0 18px", cursor: "pointer" }}>
              <Icon name={inWishlist ? "heartFill" : "heart"} size={18} color={inWishlist ? "#c0392b" : "var(--silver)"}/>
            </button>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
            {["🔒 Secure Payment", "🚚 Free Ship ₹1999+", "↩ 30-Day Returns"].map(t => (
              <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)", letterSpacing: 1 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CART SIDEBAR ─────────────────────────────────────────────────────────────
function CartSidebar() {
  const { cart, setCartOpen, removeFromCart, updateCartQty, cartTotal, setPage } = useContext(AppContext);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setCartOpen(false)}/>
      <div className="sidebar" style={{ right: 0 }}>
        <div style={{ padding: "30px 28px", borderBottom: "1px solid var(--smoke)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 3 }}>YOUR CART</h2>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginTop: 4 }}>{cart.length} ITEMS</div>
          </div>
          <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="x" size={22}/></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--silver)" }}>
              <Icon name="cart" size={48} color="var(--smoke)"/>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", marginTop: 16 }}>Your cart is empty</p>
            </div>
          ) : cart.map((item, i) => (
            <div key={i} style={{ padding: "20px 0", borderBottom: "1px solid var(--smoke)", display: "flex", gap: 16 }}>
              <div style={{ width: 70, height: 80, flexShrink: 0 }}>
                <ProductImage product={item} height={80} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 1, marginBottom: 4 }}>{item.name}</h4>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1, marginBottom: 10 }}>SIZE: {item.size}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--smoke)" }}>
                    <button onClick={() => updateCartQty(item.id, item.size, item.color, item.qty - 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "4px 10px" }}><Icon name="minus" size={12}/></button>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "0 10px" }}>{item.qty}</span>
                    <button onClick={() => updateCartQty(item.id, item.size, item.color, item.qty + 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "4px 10px" }}><Icon name="plus" size={12}/></button>
                  </div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)" }}>₹{(item.price * item.qty).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id, item.size, item.color)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)", alignSelf: "flex-start" }}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: "24px 28px", borderTop: "1px solid var(--smoke)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 2 }}>SUBTOTAL</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ivory)" }}>₹{cartTotal.toLocaleString()}</span>
            </div>
            {cartTotal >= 1999 && <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#81c784", letterSpacing: 1, marginBottom: 16 }}>✓ FREE SHIPPING UNLOCKED</div>}
            <button className="btn-gold" style={{ width: "100%", marginBottom: 10 }} onClick={() => { setCartOpen(false); setPage("checkout"); }}>PROCEED TO CHECKOUT</button>
            <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setCartOpen(false)}>CONTINUE SHOPPING</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WISHLIST SIDEBAR ─────────────────────────────────────────────────────────
function WishlistSidebar() {
  const { wishlist, setWishlistOpen, toggleWishlist, addToCart } = useContext(AppContext);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setWishlistOpen(false)}/>
      <div className="sidebar">
        <div style={{ padding: "30px 28px", borderBottom: "1px solid var(--smoke)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 3 }}>WISHLIST</h2>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginTop: 4 }}>{wishlist.length} SAVED PIECES</div>
          </div>
          <button onClick={() => setWishlistOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="x" size={22}/></button>
        </div>
        <div style={{ padding: "0 28px" }}>
          {wishlist.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--silver)" }}>
              <Icon name="heart" size={48} color="var(--smoke)"/>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", marginTop: 16 }}>Nothing saved yet</p>
            </div>
          ) : wishlist.map(item => (
            <div key={item.id} style={{ padding: "20px 0", borderBottom: "1px solid var(--smoke)", display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 70, flexShrink: 0 }}><ProductImage product={item} height={80}/></div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 1, marginBottom: 6 }}>{item.name}</h4>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)", marginBottom: 10 }}>₹{item.price.toLocaleString()}</div>
                <button className="btn-gold" style={{ padding: "8px 16px", fontSize: 9 }} onClick={async () => {
                  try {
                    await addToCart(item, item.sizes?.[0] || "M", item.colors?.[0] || "#0a0a0a");
                  } catch (err) {
                    console.error('[WishlistSidebar addToCart]', err.message);
                  }
                }}>ADD TO CART</button>
              </div>
              <button onClick={() => toggleWishlist(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wolf-red)" }}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// // ─── CHECKOUT PAGE ────────────────────────────────────────────────────────────
// function CheckoutPage() {
//   const { cart, cartTotal, setCart, setPage, user, showToast } = useContext(AppContext);
//   const [step, setStep] = useState(1);
//   const [address, setAddress] = useState({ name: user?.full_name || user?.name || "", phone: user?.phone || "", address: "", city: "", state: "", pincode: "" });
//   const [paymentMethod, setPaymentMethod] = useState("card");
//   const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
//   const [processing, setProcessing] = useState(false);

//   const shipping = cartTotal >= 1999 ? 0 : 149;
//   const tax = Math.round(cartTotal * 0.18);
//   const total = cartTotal + shipping + tax;

//   const handleOrder = async () => {
//     setProcessing(true);
//   try {
//     const order = await placeOrder(user.id, {
//       cart, address, paymentMethod, cartTotal,
//     });
//     setCart([]);
//     showToast(`🎉 Order ${order.order_number} placed!`);
//     setPage('account');
//   } catch (err) {
//     showToast(err.message, 'error');
//   } finally {
//     setProcessing(false);
//   }
//   };

//   if (!user) return (
//     <div style={{ paddingTop: 70, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
//       <div style={{ textAlign: "center" }}>
//         <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, marginBottom: 20 }}>SIGN IN TO CHECKOUT</h2>
//         <button className="btn-gold" onClick={() => setPage("login")}>SIGN IN</button>
//       </div>
//     </div>
//   );

//   return (
//     <div style={{ paddingTop: 70, minHeight: "100vh" }}>
//       <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 40px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 48 }}>
//         {/* Left */}
//         <div>
//           <div style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3, marginBottom: 40 }}>CHECKOUT</div>
//           {/* Steps */}
//           <div style={{ display: "flex", gap: 0, marginBottom: 40 }}>
//             {["DELIVERY", "PAYMENT", "REVIEW"].map((s, i) => (
//               <div key={s} style={{ flex: 1, textAlign: "center" }}>
//                 <div style={{ width: 32, height: 32, borderRadius: "50%", background: step > i + 1 ? "var(--gold)" : step === i + 1 ? "var(--gold)" : "var(--smoke)", color: step >= i + 1 ? "var(--obsidian)" : "var(--silver)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, margin: "0 auto 8px", fontWeight: "bold" }}>
//                   {step > i + 1 ? "✓" : i + 1}
//                 </div>
//                 <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: step === i + 1 ? "var(--gold)" : "var(--silver)" }}>{s}</div>
//               </div>
//             ))}
//           </div>

//           {step === 1 && (
//             <div>
//               <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 24 }}>DELIVERY ADDRESS</h3>
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
//                 <input className="input-dark" placeholder="FULL NAME *" value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
//                 <input className="input-dark" placeholder="PHONE NUMBER *" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
//                 <input className="input-dark" placeholder="ADDRESS LINE *" value={address.address} onChange={e => setAddress(a => ({ ...a, address: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
//                 <input className="input-dark" placeholder="CITY *" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}/>
//                 <input className="input-dark" placeholder="STATE *" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}/>
//                 <input className="input-dark" placeholder="PINCODE *" value={address.pincode} onChange={e => setAddress(a => ({ ...a, pincode: e.target.value }))} maxLength={6}/>
//               </div>
//               <button className="btn-gold" style={{ marginTop: 28, padding: "14px 40px" }} onClick={() => {
//                 const { name, phone, address: addr, city, state, pincode } = address;
//                 if (!name.trim())       { showToast("Please enter your full name.", "error"); return; }
//                 if (!/^[6-9]\d{9}$/.test(phone)) { showToast("Enter a valid 10-digit mobile number.", "error"); return; }
//                 if (!addr.trim())       { showToast("Please enter your address.", "error"); return; }
//                 if (!city.trim())       { showToast("Please enter your city.", "error"); return; }
//                 if (!state.trim())      { showToast("Please enter your state.", "error"); return; }
//                 if (!/^\d{6}$/.test(pincode)) { showToast("Enter a valid 6-digit pincode.", "error"); return; }
//                 setStep(2);
//               }}>CONTINUE TO PAYMENT</button>
//             </div>
//           )}

//           {step === 2 && (
//             <div>
//               <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 24 }}>PAYMENT METHOD</h3>
//               <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
//                 {[["card", "💳 Credit / Debit Card"], ["upi", "📱 UPI (GPay, PhonePe, Paytm)"], ["cod", "💵 Cash on Delivery"], ["emi", "📆 EMI (0% for 3 months)"]].map(([val, label]) => (
//                   <label key={val} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", border: `1px solid ${paymentMethod === val ? "var(--gold)" : "var(--smoke)"}`, cursor: "pointer", background: paymentMethod === val ? "rgba(201,168,76,0.05)" : "transparent" }}>
//                     <input type="radio" name="payment" value={val} checked={paymentMethod === val} onChange={() => setPaymentMethod(val)} style={{ accentColor: "var(--gold)" }}/>
//                     <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>{label}</span>
//                   </label>
//                 ))}
//               </div>

//               {paymentMethod === "card" && (
//                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
//                   <input className="input-dark" placeholder="CARD NUMBER" value={card.number} onChange={e => setCard(c => ({ ...c, number: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
//                   <input className="input-dark" placeholder="CARDHOLDER NAME" value={card.name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
//                   <input className="input-dark" placeholder="MM/YY" value={card.expiry} onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))}/>
//                   <input className="input-dark" placeholder="CVV" value={card.cvv} onChange={e => setCard(c => ({ ...c, cvv: e.target.value }))} type="password"/>
//                 </div>
//               )}
//               {paymentMethod === "upi" && (
//                 <input className="input-dark" placeholder="YOUR UPI ID (e.g. name@upi)" style={{ marginTop: 8 }}/>
//               )}

//               <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
//                 <button className="btn-ghost" onClick={() => setStep(1)}>BACK</button>
//                 <button className="btn-gold" style={{ flex: 1 }} onClick={() => setStep(3)}>REVIEW ORDER</button>
//               </div>
//             </div>
//           )}

//           {step === 3 && (
//             <div>
//               <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 24 }}>ORDER REVIEW</h3>
//               <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "20px 24px", marginBottom: 20 }}>
//                 <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>DELIVERY TO</div>
//                 <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{address.name} · {address.phone}</div>
//                 <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{address.address}, {address.city}, {address.state} - {address.pincode}</div>
//               </div>
//               <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "20px 24px", marginBottom: 28 }}>
//                 <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>PAYMENT</div>
//                 <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{paymentMethod === "card" ? `Card ending in ${card.number.slice(-4) || "****"}` : paymentMethod === "upi" ? "UPI Payment" : paymentMethod === "cod" ? "Cash on Delivery" : "EMI - 3 months 0%"}</div>
//               </div>
//               <div style={{ display: "flex", gap: 12 }}>
//                 <button className="btn-ghost" onClick={() => setStep(2)}>BACK</button>
//                 <button className="btn-gold" style={{ flex: 1, opacity: processing ? 0.7 : 1 }} onClick={handleOrder} disabled={processing}>
//                   {processing ? "PROCESSING..." : `PLACE ORDER · ₹${total.toLocaleString()}`}
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Right - Order Summary */}
//         <div>
//           <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px", position: "sticky", top: 90 }}>
//             <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, marginBottom: 20, borderBottom: "1px solid var(--smoke)", paddingBottom: 16 }}>ORDER SUMMARY</h3>
//             {cart.map((item, i) => (
//               <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, padding: "8px 0", borderBottom: "1px solid var(--smoke)" }}>
//                 <div>
//                   <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ivory)", letterSpacing: 1 }}>{item.name}</div>
//                   <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>Sz: {item.size} · Qty: {item.qty}</div>
//                 </div>
//                 <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ash)" }}>₹{(item.price * item.qty).toLocaleString()}</div>
//               </div>
//             ))}
//             <div style={{ marginTop: 16 }}>
//               {[["Subtotal", `₹${cartTotal.toLocaleString()}`], ["Shipping", shipping === 0 ? "FREE" : `₹${shipping}`], ["GST (18%)", `₹${tax.toLocaleString()}`]].map(([label, val]) => (
//                 <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", marginBottom: 8, letterSpacing: 1 }}>
//                   <span>{label}</span><span style={{ color: val === "FREE" ? "#81c784" : "var(--ash)" }}>{val}</span>
//                 </div>
//               ))}
//               <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ivory)", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gold)" }}>
//                 <span>TOTAL</span><span style={{ color: "var(--gold)" }}>₹{total.toLocaleString()}</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// ─── CUSTOM DESIGN PAGE ───────────────────────────────────────────────────────
function CustomDesignPage() {
  const { showToast } = useContext(AppContext);
  const [uploaded, setUploaded] = useState(false);
  const [form, setForm] = useState({ fabric: "220gsm", color: "#0a0a0a", size: "M", qty: 1, note: "" });

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div style={{ background: "var(--graphite)", padding: "80px 40px 60px", borderBottom: "1px solid var(--smoke)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>MAKE IT YOURS</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 80, letterSpacing: 4 }}>CUSTOM<br/>DESIGN</h1>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginTop: 16 }}>Upload your artwork. We print it on luxury-grade fabric.</p>
      </div>

      <div style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          {/* Upload zone */}
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>UPLOAD DESIGN</h2>
            <div style={{ border: `2px dashed ${uploaded ? "var(--gold)" : "var(--smoke)"}`, padding: "60px 40px", textAlign: "center", cursor: "pointer", transition: "all 0.3s", background: uploaded ? "rgba(201,168,76,0.05)" : "transparent" }}
              onClick={() => { setUploaded(!uploaded); if (!uploaded) showToast("Design uploaded!"); }}>
              <Icon name="upload" size={40} color={uploaded ? "var(--gold)" : "var(--silver)"}/>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 2, marginTop: 20, color: uploaded ? "var(--gold)" : "var(--silver)" }}>
                {uploaded ? "DESIGN UPLOADED ✓" : "CLICK TO UPLOAD"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginTop: 8 }}>PNG, JPG, SVG · MAX 50MB</div>
            </div>
            <div style={{ marginTop: 20 }}>
              {["✦ DTG Printing (all colors)", "✦ Screen Printing (bulk)", "✦ Embroidery (luxury tier)"].map(t => (
                <div key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginBottom: 8 }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Customization */}
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>CUSTOMIZE</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>FABRIC</label>
                <select className="input-dark" value={form.fabric} onChange={e => setForm(f => ({ ...f, fabric: e.target.value }))}>
                  <option value="220gsm">220 GSM Egyptian Cotton (+₹0)</option>
                  <option value="240gsm">240 GSM Heavyweight (+₹200)</option>
                  <option value="180gsm">180 GSM Everyday (+₹0)</option>
                  <option value="bamboo">Bamboo Organic (+₹400)</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>BASE COLOR</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["#0a0a0a", "#faf9f7", "#1a2a3a", "#1a0a0a", "#0a1a0a", "#2a2a2a"].map(c => (
                    <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 36, height: 36, background: c, cursor: "pointer", border: `2px solid ${form.color === c ? "var(--gold)" : "transparent"}`, outline: "2px solid var(--smoke)" }}/>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>SIZE</label>
                <select className="input-dark" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}>
                  {["XS","S","M","L","XL","XXL"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>QUANTITY</label>
                <input className="input-dark" type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}/>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>SPECIAL NOTES</label>
                <textarea className="input-dark" placeholder="Print placement, special instructions..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}/>
              </div>
              <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "16px 20px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)", marginBottom: 4 }}>ESTIMATED PRICE</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>₹{(1499 + (form.fabric === "240gsm" ? 200 : form.fabric === "bamboo" ? 400 : 0)).toLocaleString()}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", marginTop: 4 }}>Per piece · Delivery in 7-10 days</div>
              </div>
              <button className="btn-gold" onClick={() => showToast("Custom order request submitted!")}>SUBMIT ORDER REQUEST</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BULK ORDER PAGE ──────────────────────────────────────────────────────────
function BulkOrderPage() {
  const { showToast } = useContext(AppContext);
  const [form, setForm] = useState({ type: "corporate", qty: 50, product: "", message: "", org: "", contact: "", email: "" });

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div style={{ background: "var(--graphite)", padding: "80px 40px 60px", textAlign: "center", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>FOR TEAMS & ORGANIZATIONS</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 80, letterSpacing: 4 }}>BULK &<br/>CORPORATE</h1>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginTop: 16 }}>Outfit your entire team in VelvetWolf luxury.</p>
      </div>

      <div style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 28 }}>PRICING TIERS</h2>
          {[["10-49 pcs", "5% OFF", "Team orders"], ["50-99 pcs", "12% OFF", "Department orders"], ["100-499 pcs", "20% OFF", "Corporate branding"], ["500+ pcs", "30% OFF + Custom", "Enterprise bulk"]].map(([qty, disc, label]) => (
            <div key={qty} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid var(--smoke)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, color: "var(--ivory)" }}>{qty}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1, marginTop: 4 }}>{label}</div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)" }}>{disc}</span>
            </div>
          ))}
          <div style={{ marginTop: 32 }}>
            {["✦ Custom logo embroidery/print", "✦ Pantone color matching", "✦ Individual name printing", "✦ Dedicated account manager", "✦ Net-30 payment terms available"].map(t => (
              <div key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginBottom: 10 }}>{t}</div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 28 }}>REQUEST A QUOTE</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>ORDER TYPE</label>
              <select className="input-dark" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="bulk">BULK ORDER</option>
                <option value="corporate">CORPORATE BRANDING</option>
                <option value="event">EVENT MERCHANDISE</option>
                <option value="startup">STARTUP KIT</option>
              </select>
            </div>
            <input className="input-dark" placeholder="ORGANIZATION NAME" value={form.org} onChange={e => setForm(f => ({ ...f, org: e.target.value }))}/>
            <input className="input-dark" placeholder="CONTACT PERSON" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}/>
            <input className="input-dark" type="email" placeholder="EMAIL ADDRESS" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
            <input className="input-dark" type="number" placeholder="QUANTITY REQUIRED" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} min="10"/>
            <textarea className="input-dark" placeholder="PRODUCT REQUIREMENTS, DESIGN IDEAS, DEADLINE..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ minHeight: 120 }}/>
            <button className="btn-gold" style={{ padding: "16px" }} onClick={() => showToast("Quote request sent! We'll contact you within 24hrs.")}>REQUEST QUOTE</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN LAYOUT ─────────────────────────────────────────────────────────────
function AdminLayout() {
  const { setPage, adminPage, setAdminPage } = useContext(AppContext);

  const navItems = [
    ["dashboard", "DASHBOARD", "chart"],
    ["products", "PRODUCTS", "package"],
    ["orders", "ORDERS", "cart"],
    ["customers", "CUSTOMERS", "users"],
    ["analytics", "ANALYTICS", "chart"],
    ["settings", "SETTINGS", "settings"],
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--obsidian)" }}>
      {/* Admin Sidebar */}
      <div className="admin-sidebar" style={{ padding: 0 }}>
        <div style={{ padding: "28px 20px", borderBottom: "1px solid var(--smoke)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 4, color: "var(--gold)" }}>VELVETWOLF</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 3, color: "var(--silver)", marginTop: 4 }}>ADMIN PANEL</div>
        </div>
        <div style={{ padding: "20px 0" }}>
          {navItems.map(([id, label, icon]) => (
            <button key={id} onClick={() => setAdminPage(id)} style={{
              width: "100%", background: adminPage === id ? "rgba(201,168,76,0.1)" : "transparent",
              border: "none", borderLeft: `3px solid ${adminPage === id ? "var(--gold)" : "transparent"}`,
              color: adminPage === id ? "var(--gold)" : "var(--silver)", cursor: "pointer",
              padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textAlign: "left"
            }}>
              <Icon name={icon} size={14} color={adminPage === id ? "var(--gold)" : "var(--silver)"}/>
              {label}
            </button>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, padding: "0 16px" }}>
          <button onClick={() => setPage("home")} className="btn-ghost" style={{ width: "100%", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="arrowRight" size={12}/> BACK TO STORE
          </button>
        </div>
      </div>

      {/* Admin Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
        {adminPage === "dashboard" && <AdminDashboard />}
        {adminPage === "products" && <AdminProducts />}
        {adminPage === "orders" && <AdminOrders />}
        {adminPage === "customers" && <AdminCustomers />}
        {adminPage === "analytics" && <AdminAnalytics />}
        {adminPage === "settings" && <AdminSettings />}
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const { orders, customers, products } = useContext(AppContext);

  // Handle both mock (o.total) and Supabase (o.total_amount) field names
  const revenue = orders.reduce((s, o) => s + Number(o.total_amount || o.total || 0), 0);

  // Case-insensitive status comparison for both mock ("Processing") and Supabase ("confirmed")
  const processingCount = orders.filter(o =>
    ["processing", "confirmed", "in_production"].includes((o.status || "").toLowerCase())
  ).length;

  const stats = [
    { label: "TOTAL REVENUE", value: `₹${revenue.toLocaleString()}`, sub: "+23% vs last month", color: "var(--gold)" },
    { label: "TOTAL ORDERS", value: orders.length, sub: `${processingCount} processing`, color: "#4fc3f7" },
    { label: "CUSTOMERS", value: customers.length, sub: "2 new this week", color: "#81c784" },
    { label: "PRODUCTS", value: products.length, sub: `${products.filter(p => (p.stock || 0) < 20).length} low stock`, color: "#ff8a65" },
  ];

  const recentOrders = orders.slice(0, 4);

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>OVERVIEW</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>DASHBOARD</h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 40 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: s.color, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart (simple bar) */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 28 }}>
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>MONTHLY REVENUE</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {[40, 65, 48, 80, 72, 90, 85, 95, 70, 88, 92, 100].map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: `${h}%`, background: i === 11 ? "var(--gold)" : "rgba(201,168,76,0.3)", transition: "all 0.3s" }}/>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--silver)" }}>{["J","F","M","A","M","J","J","A","S","O","N","D"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>TOP COLLECTIONS</div>
          {[["Silent Luxury", 34], ["AI & Tech", 28], ["Anime", 22], ["Founder", 16]].map(([name, pct]) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)" }}>{name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ash)" }}>{pct}%</span>
              </div>
              <div style={{ height: 3, background: "var(--smoke)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "var(--gold)" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px 24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>RECENT ORDERS</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["ORDER ID", "CUSTOMER", "DATE", "TOTAL", "STATUS"].map(h => (
                <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "8px 0", textAlign: "left", borderBottom: "1px solid var(--smoke)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(o => (
              <tr key={o.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", padding: "12px 0" }}>{o.order_number || o.id}</td>
                <td style={{ fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--ash)", padding: "12px 0" }}>{o.profiles?.full_name || o.customer || "—"}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "12px 0" }}>
                  {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : o.date || "—"}
                </td>
                <td style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ivory)", padding: "12px 0" }}>
                  ₹{Number(o.total_amount || o.total || 0).toLocaleString()}
                </td>
                <td style={{ padding: "12px 0" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "3px 10px",
                    background: ["delivered"].includes((o.status||"").toLowerCase()) ? "rgba(129,199,132,0.2)" : ["dispatched","shipped"].includes((o.status||"").toLowerCase()) ? "rgba(79,195,247,0.2)" : "rgba(201,168,76,0.2)",
                    color: ["delivered"].includes((o.status||"").toLowerCase()) ? "#81c784" : ["dispatched","shipped"].includes((o.status||"").toLowerCase()) ? "#4fc3f7" : "var(--gold)" }}>
                    {(o.status || "PENDING").toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ADMIN PRODUCTS ────────────────────────────────────────────────────────────
function AdminProducts() {
  const { products, setProducts, showToast } = useContext(AppContext);
  const [editProduct, setEditProduct] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newProd, setNewProd] = useState({ name: "", collection: "ai-tech", price: "", originalPrice: "", sizes: ["S","M","L","XL"], colors: ["#0a0a0a"], tag: "NEW", description: "", stock: 50 });

  const handleSave = () => {
    if (editProduct) {
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...editProduct } : p));
      setEditProduct(null);
      showToast("Product updated!");
    }
  };

  const handleAdd = () => {
    if (!newProd.name.trim()) { showToast("Product name is required.", "error"); return; }
    if (!newProd.price || Number(newProd.price) <= 0) { showToast("Enter a valid price.", "error"); return; }
    if (!newProd.originalPrice || Number(newProd.originalPrice) <= 0) { showToast("Enter a valid original price.", "error"); return; }
    if (Number(newProd.originalPrice) < Number(newProd.price)) { showToast("Original price must be ≥ sale price.", "error"); return; }
    const p = { ...newProd, id: Date.now(), rating: 4.5, reviews: 0, price: Number(newProd.price), originalPrice: Number(newProd.originalPrice) };
    setProducts(prev => [...prev, p]);
    setAdding(false);
    showToast("Product added!");
    setNewProd({ name: "", collection: "ai-tech", price: "", originalPrice: "", sizes: ["S","M","L","XL"], colors: ["#0a0a0a"], tag: "NEW", description: "", stock: 50 });
  };

  const handleDelete = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast("Product removed", "info");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>PRODUCTS</h1>
        </div>
        <button className="btn-gold" onClick={() => setAdding(true)}><Icon name="plus" size={14}/> ADD PRODUCT</button>
      </div>

      {/* Add product form */}
      {adding && (
        <div style={{ background: "var(--graphite)", border: "1px solid var(--gold)", padding: "28px", marginBottom: 28 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 20 }}>NEW PRODUCT</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <input className="input-dark" placeholder="PRODUCT NAME" value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
            <select className="input-dark" value={newProd.collection} onChange={e => setNewProd(p => ({ ...p, collection: e.target.value }))}>
              {COLLECTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input-dark" value={newProd.tag} onChange={e => setNewProd(p => ({ ...p, tag: e.target.value }))}>
              {Object.keys(TAG_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="input-dark" placeholder="PRICE (₹)" type="number" value={newProd.price} onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))}/>
            <input className="input-dark" placeholder="ORIGINAL PRICE (₹)" type="number" value={newProd.originalPrice} onChange={e => setNewProd(p => ({ ...p, originalPrice: e.target.value }))}/>
            <input className="input-dark" placeholder="STOCK QTY" type="number" value={newProd.stock} onChange={e => setNewProd(p => ({ ...p, stock: e.target.value }))}/>
            <textarea className="input-dark" placeholder="DESCRIPTION" value={newProd.description} onChange={e => setNewProd(p => ({ ...p, description: e.target.value }))} style={{ gridColumn: "1/-1" }}/>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button className="btn-gold" onClick={handleAdd}>ADD PRODUCT</button>
            <button className="btn-ghost" onClick={() => setAdding(false)}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Products table */}
      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
              {["PRODUCT", "COLLECTION", "PRICE", "STOCK", "STATUS", "ACTIONS"].map(h => (
                <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--smoke)" }}>
                <td style={{ padding: "14px 16px" }}>
                  {editProduct?.id === p.id ? (
                    <input className="input-dark" value={editProduct.name} onChange={e => setEditProduct(ep => ({ ...ep, name: e.target.value }))} style={{ padding: "6px 10px", fontSize: 11 }}/>
                  ) : (
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1 }}>{p.name}</div>
                  )}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "14px 16px", letterSpacing: 1 }}>
                  {COLLECTIONS.find(c => c.id === p.collection)?.name}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {editProduct?.id === p.id ? (
                    <input className="input-dark" type="number" value={editProduct.price} onChange={e => setEditProduct(ep => ({ ...ep, price: Number(e.target.value) }))} style={{ padding: "6px 10px", fontSize: 11, width: 90 }}/>
                  ) : (
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)" }}>₹{p.price.toLocaleString()}</span>
                  )}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {editProduct?.id === p.id ? (
                    <input className="input-dark" type="number" value={editProduct.stock} onChange={e => setEditProduct(ep => ({ ...ep, stock: Number(e.target.value) }))} style={{ padding: "6px 10px", fontSize: 11, width: 80 }}/>
                  ) : (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: p.stock < 20 ? "#ff8a65" : "#81c784" }}>{p.stock}</span>
                  )}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "3px 8px", background: TAG_COLORS[p.tag]?.bg || "var(--smoke)", color: TAG_COLORS[p.tag]?.color || "var(--ash)" }}>{p.tag}</span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {editProduct?.id === p.id ? (
                      <>
                        <button onClick={handleSave} style={{ background: "none", border: "1px solid #81c784", color: "#81c784", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 9 }}>SAVE</button>
                        <button onClick={() => setEditProduct(null)} style={{ background: "none", border: "1px solid var(--smoke)", color: "var(--silver)", cursor: "pointer", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 9 }}>CANCEL</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditProduct({ ...p })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="edit" size={14}/></button>
                        <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--wolf-red)" }}><Icon name="trash" size={14}/></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ADMIN ORDERS ─────────────────────────────────────────────────────────────
function AdminOrders() {
  const { orders } = useContext(AppContext);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? orders
    : orders.filter(o => (o.status || "").toLowerCase() === filter);

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>ORDERS</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {["all", "pending", "confirmed", "dispatched", "delivered"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? "var(--gold)" : "transparent", border: "1px solid", borderColor: filter === s ? "var(--gold)" : "var(--smoke)", color: filter === s ? "var(--obsidian)" : "var(--silver)", padding: "6px 16px", fontFamily: "var(--font-mono)", fontSize: 9, cursor: "pointer", letterSpacing: 2 }}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
              {["ORDER ID", "CUSTOMER", "DATE", "ITEMS", "TOTAL", "STATUS"].map(h => (
                <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--silver)" }}>
                  No orders found
                </td>
              </tr>
            ) : filtered.map(o => (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--smoke)" }}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)", padding: "14px 16px", letterSpacing: 1 }}>
                  {o.order_number || o.id}
                </td>
                <td style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ash)", padding: "14px 16px" }}>
                  {o.profiles?.full_name || o.customer || "—"}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", padding: "14px 16px" }}>
                  {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : o.date || "—"}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", padding: "14px 16px" }}>
                  {o.order_items?.length ?? o.items ?? "—"}
                </td>
                <td style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ivory)", padding: "14px 16px" }}>
                  ₹{Number(o.total_amount || o.total || 0).toLocaleString()}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "4px 12px",
                    background: ["delivered"].includes((o.status||"").toLowerCase()) ? "rgba(129,199,132,0.2)" : ["dispatched","shipped"].includes((o.status||"").toLowerCase()) ? "rgba(79,195,247,0.2)" : ["confirmed","processing","in_production"].includes((o.status||"").toLowerCase()) ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.1)",
                    color: ["delivered"].includes((o.status||"").toLowerCase()) ? "#81c784" : ["dispatched","shipped"].includes((o.status||"").toLowerCase()) ? "#4fc3f7" : ["confirmed","processing","in_production"].includes((o.status||"").toLowerCase()) ? "var(--gold)" : "var(--silver)" }}>
                    {(o.status || "PENDING").toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ADMIN CUSTOMERS ──────────────────────────────────────────────────────────
function AdminCustomers() {
  const { customers } = useContext(AppContext);
  const tierColors = { Platinum: "#e5e4e2", Gold: "#c9a84c", Silver: "#c0c0c0", Bronze: "#cd7f32" };

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>MANAGE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>CUSTOMERS</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[["TOTAL", customers.length], ["PLATINUM", customers.filter(c => c.tier === "Platinum").length], ["GOLD", customers.filter(c => c.tier === "Gold").length], ["AVG SPEND", `₹${Math.round(customers.reduce((s,c) => s+c.spent, 0) / customers.length).toLocaleString()}`]].map(([label, val]) => (
          <div key={label} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "20px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--smoke)" }}>
              {["CUSTOMER", "EMAIL", "ORDERS", "TOTAL SPENT", "JOINED", "TIER"].map(h => (
                <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2, color: "var(--silver)", padding: "14px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--smoke)" }}>
                <td style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ivory)", padding: "14px 16px" }}>{c.name}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "14px 16px" }}>{c.email}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ash)", padding: "14px 16px" }}>{c.orders}</td>
                <td style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)", padding: "14px 16px" }}>₹{c.spent.toLocaleString()}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", padding: "14px 16px" }}>{c.joined}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, padding: "3px 10px", background: "transparent", border: `1px solid ${tierColors[c.tier]}`, color: tierColors[c.tier] }}>{c.tier.toUpperCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ADMIN ANALYTICS ──────────────────────────────────────────────────────────
function AdminAnalytics() {
  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>INSIGHTS</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>ANALYTICS</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Sales trend */}
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px", gridColumn: "1/-1" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>WEEKLY SALES TREND</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160 }}>
            {[{ day: "MON", val: 65 }, { day: "TUE", val: 80 }, { day: "WED", val: 55 }, { day: "THU", val: 90 }, { day: "FRI", val: 100 }, { day: "SAT", val: 85 }, { day: "SUN", val: 70 }].map(d => (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>₹{d.val * 120}</div>
                <div style={{ width: "100%", height: `${d.val}%`, background: d.day === "FRI" ? "var(--gold)" : "rgba(201,168,76,0.35)", position: "relative" }}/>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic sources */}
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 24 }}>TRAFFIC SOURCES</div>
          {[["Instagram", 42, "#e1306c"], ["Google", 28, "#4285f4"], ["Direct", 18, "#c9a84c"], ["Referral", 12, "#81c784"]].map(([src, pct, col]) => (
            <div key={src} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)" }}>{src}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ash)" }}>{pct}%</span>
              </div>
              <div style={{ height: 4, background: "var(--smoke)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: col }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Best sellers */}
        <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 24 }}>BEST SELLERS</div>
          {[["Error 404: Sleep", 523, "AI & Tech"], ["Demon Mode", 445, "Anime"], ["Founder's Mindset", 312, "Founder"], ["100 Days of Grind", 267, "Beast Mode"]].map(([name, sales, col]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--smoke)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1 }}>{name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>{col}</div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)" }}>{sales}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN SETTINGS ────────────────────────────────────────────────────────────
function AdminSettings() {
  const { showToast } = useContext(AppContext);
  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>CONFIGURE</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3 }}>SETTINGS</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {[
          { title: "STORE SETTINGS", fields: [["Store Name", "VelvetWolf"], ["Tagline", "Luxury Streetwear"], ["Email", "hello@velvetwolf.in"], ["Phone", "+91 98765 43210"]] },
          { title: "SHIPPING", fields: [["Free Shipping Above (₹)", "1999"], ["Flat Shipping Rate (₹)", "149"], ["Dispatch Time (days)", "2"], ["Return Window (days)", "30"]] },
          { title: "PAYMENT GATEWAYS", fields: [["Razorpay Key", "rzp_test_xxxxx"], ["UPI Handle", "velvetwolf@upi"], ["GST Number", "27XXXXX1234X1ZX"], ["PAN", "XXXXX0000X"]] },
          { title: "NOTIFICATIONS", fields: [["Order Email", "orders@velvetwolf.in"], ["Alert Email", "alerts@velvetwolf.in"], ["SMS Provider", "Twilio"], ["WhatsApp", "+91 98765 43210"]] },
        ].map(section => (
          <div key={section.title} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "28px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 20 }}>{section.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {section.fields.map(([label, val]) => (
                <div key={label}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, color: "var(--silver)", display: "block", marginBottom: 6 }}>{label}</label>
                  <input className="input-dark" defaultValue={val} style={{ padding: "8px 12px", fontSize: 11 }}/>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <button className="btn-gold" onClick={() => showToast("Settings saved successfully!")}>SAVE ALL SETTINGS</button>
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  const { setPage } = useContext(AppContext);
  return (
    <footer style={{ background: "var(--graphite)", borderTop: "1px solid var(--smoke)", padding: "80px 40px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 60, marginBottom: 60 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 6, marginBottom: 4 }}>VELVETWOLF</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)", marginBottom: 20 }}>LUXURY STREETWEAR · EST. 2025</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", lineHeight: 1.8, fontStyle: "italic" }}>
              Born in Chennai. Worn worldwide. VelvetWolf exists for the silent predators — those who lead with presence, not noise.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
              {["📸 Instagram", "𝕏 Twitter", "▶ YouTube"].map(s => (
                <span key={s} style={{ fontFamily: "var(--font-mono)", fontSize: 20, color: "var(--silver)", cursor: "pointer", letterSpacing: 1 }}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20 }}>SHOP</div>
            {[["All Products", "shop"], ["Custom Design", "custom"], ["Bulk Orders", "bulk"], ["Collections", "collection"]].map(([label, pg]) => (
              <div key={label} onClick={() => setPage(pg)} style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", cursor: "pointer", marginBottom: 10 }}>{label}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20 }}>SUPPORT</div>
            {[["Size Guide","sizeguide"],["Track Order","trackorder"],["Returns & Exchange","returnspage"],["FAQ","faq"], ["Contact Us","contactus"]].map(([l,pg]) => (
              <div key={l} onClick={() => setPage(pg)} style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", cursor: "pointer", marginBottom: 10 }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20 }}>NEWSLETTER</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", marginBottom: 16, lineHeight: 1.6 }}>New drops, exclusive offers — for wolves only.</p>
            <input className="input-dark" placeholder="YOUR EMAIL" style={{ marginBottom: 10 }}/>
            <button className="btn-gold" style={{ width: "100%", padding: "10px" }}>JOIN THE PACK</button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--smoke)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1 }}>© 2025 VelvetWolf. All rights reserved. Made with ♥ in Chennai, India.</div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Privacy Policy","privacypolicy"], ["Terms","termspage"], ["Shipping Policy","shoppingpolicy"]].map(([l,pg]) => (
              <span key={l} onClick={() => setPage(pg)} style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", cursor: "pointer", letterSpacing: 1 }}>{l}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["🔒", "💳", "📱"].map(i => <span key={i} style={{ fontSize: 18 }}>{i}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
