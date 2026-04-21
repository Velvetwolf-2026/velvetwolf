import { useState, useEffect, useContext, useRef, Component, lazy, Suspense } from "react";
import { AppContext } from "./velvetwolf/pages/AppContext";
import { FAQPage, Policy, ShoppingPolicy, ContactPage, ReturnsPage, SizeGuide, TermsPage, TrackOrder, MosaicCarousel, ForgetPassword, Login, Signup, AccountPage } from "./index";
import CollectionsPage, { COLLECTIONS, HOME_COLLECTIONS, INITIAL_COLLECTION_PRODUCTS, getCollectionById } from "./velvetwolf/pages/Collections";
import CartPage from "./velvetwolf/pages/CartPage";
import WishlistPage from "./velvetwolf/pages/WishlistPage";
import { supabase } from './velvetwolf/utils/supabase';
import { getProfile } from './velvetwolf/utils/auth';
import { addCartItemDB, updateCartQtyDB, removeCartItemDB, loadCartFromDB, mergeGuestCart } from './velvetwolf/utils/cart';
import { toggleWishlistDB, loadWishlistFromDB } from './velvetwolf/utils/wishlist';
import { loadProductsFromAPI } from './velvetwolf/utils/products';
import { placeOrder, getUserOrders } from './velvetwolf/utils/order';
import Navbar from "./velvetwolf/components/Navbar";
import Footer from "./velvetwolf/components/Footer";

// Admin chunk is lazy-loaded — not downloaded by regular users
const AdminLayout = lazy(() => import("./velvetwolf/admin/AdminLayout"));

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --obsidian: #0a0a0a;
      --onyx: #111111;
      --graphite: #1a1a1a;
      --smoke: #2a2a2a;
      --silver: #888181;
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
      font-family: 'Roboto', sans-serif;
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
      font-size: 12px;
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
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
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

    .vw-mobile-menu-toggle,
    .vw-mobile-menu-leading,
    .vw-mobile-backdrop,
    .vw-filter-backdrop,
    .vw-filter-drawer-head,
    .vw-shop-bottom-bar,
    .vw-mobile-panel,
    .vw-filter-toggle,
    .vw-shop-results-mobile { display: none; }

    .vw-table-scroll { width: 100%; overflow-x: auto; }
    .vw-table-scroll table { min-width: 720px; }

    .vw-admin-mobile-title { display: none; }

    @media (max-width: 1024px) {
      .vw-nav-shell { padding: 0 28px !important; }
      .vw-nav-row {
        display: flex !important;
        align-items: center;
        height: 68px !important;
        gap: 14px !important;
      }
      .vw-brand-link { min-width: 0; flex: 0 1 auto; }
      .vw-desktop-nav { display: none !important; }
      .vw-mobile-menu-leading {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--ash);
      }
      .vw-nav-actions .vw-mobile-menu-toggle { display: none !important; }
      .vw-nav-actions { gap: 16px !important; margin-left: auto; }
      .vw-brand-logo { width: 35px !important; height: 35px !important; }
      .vw-brand-title { font-size: 23px !important; letter-spacing: 5px !important; }
      .vw-brand-subtitle { font-size: 10px !important; letter-spacing: 3px !important; }
      .vw-mobile-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 850;
        background: rgba(0,0,0,0.58);
        backdrop-filter: blur(3px);
        animation: fadeIn 0.2s ease;
      }
      .vw-mobile-panel {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 900;
        width: min(380px, 78vw);
        height: 100vh;
        background: rgba(17,17,17,0.98);
        border-right: 1px solid rgba(201,168,76,0.28);
        box-shadow: 24px 0 70px rgba(0,0,0,0.55);
        animation: vwDrawerIn 0.28s ease forwards;
        overflow-y: auto;
      }
      .vw-mobile-drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 28px 24px 22px;
        border-bottom: 1px solid var(--smoke);
      }
      .vw-mobile-drawer-brand {
        font-family: var(--font-display);
        font-size: 26px;
        letter-spacing: 6px;
        color: var(--ivory);
        line-height: 1;
      }
      .vw-mobile-drawer-sub {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 3px;
        color: var(--gold);
        margin-top: 5px;
      }
      .vw-mobile-panel-inner {
        display: grid;
        gap: 10px;
        padding: 24px;
      }
      @keyframes vwDrawerIn {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }
      .vw-desktop-nav { gap: 18px !important; }
      .vw-shop-layout { flex-direction: column !important; gap: 24px !important; padding-bottom: 92px !important; }
      .vw-shop-filters {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 900;
        width: min(380px, 78vw) !important;
        height: 100vh;
        padding: 24px !important;
        background: rgba(17,17,17,0.98);
        border-right: 1px solid rgba(201,168,76,0.28);
        box-shadow: 24px 0 70px rgba(0,0,0,0.55);
        overflow-y: auto;
        transform: translateX(-100%);
        transition: transform 0.28s ease;
        display: block !important;
      }
      .vw-shop-filters.is-open {
        transform: translateX(0);
      }
      .vw-shop-bottom-bar { display: none !important; }
      .vw-shop-results-mobile {
        display: flex !important;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 18px;
      }
      .vw-filter-toggle {
        display: inline-flex !important;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        width: auto !important;
        min-width: 0;
        padding: 9px 14px !important;
        border: 1px solid rgba(201,168,76,0.42) !important;
        background: rgba(18,18,18,0.92) !important;
        color: var(--ivory) !important;
        box-shadow: 0 10px 26px rgba(0,0,0,0.24);
        letter-spacing: 1.8px;
      }
      .vw-filter-toggle .vw-filter-toggle-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--gold);
      }
      .vw-shop-toolbar {
        align-items: flex-start !important;
        gap: 16px !important;
        margin-bottom: 24px !important;
      }
      .vw-shop-toolbar > div:first-child {
        display: none !important;
      }
      .vw-shop-layout {
        gap: 28px !important;
        padding: 32px 28px !important;
      }
      .vw-product-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 18px !important;
      }
      .vw-product-card-image {
        height: 236px !important;
      }
      .vw-product-card-body {
        padding: 16px 16px 18px !important;
      }
      .vw-product-card-collection {
        font-size: 10px !important;
        letter-spacing: 1.6px !important;
        margin-bottom: 5px !important;
      }
      .vw-product-card-title {
        font-size: 18px !important;
        line-height: 1.05 !important;
        margin-bottom: 6px !important;
      }
      .vw-product-card-rating {
        margin-bottom: 10px !important;
      }
      .vw-product-card-review-count {
        font-size: 10px !important;
      }
      .vw-product-card-price-row {
        gap: 10px !important;
      }
      .vw-product-card-price {
        font-size: 20px !important;
      }
      .vw-product-card-original-price {
        font-size: 11px !important;
      }
      .vw-product-card-sale,
      .vw-product-card-badge-wrap .badge {
        font-size: 9px !important;
      }
      .vw-product-card-wishlist {
        padding: 6px !important;
      }
      .vw-product-card-actions {
        gap: 8px !important;
        margin-top: 14px !important;
      }
      .vw-product-card-action-button {
        padding: 9px 12px !important;
        font-size: 9px !important;
        letter-spacing: 1.6px !important;
      }
      .vw-filter-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 850;
        background: rgba(0,0,0,0.58);
        backdrop-filter: blur(3px);
        animation: fadeIn 0.2s ease;
      }
      .vw-filter-drawer-head {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 18px;
        margin-bottom: 24px;
        border-bottom: 1px solid var(--smoke);
      }
      .vw-admin-layout { flex-direction: column !important; }
      .admin-sidebar {
        width: 100% !important;
        min-height: auto !important;
        border-right: 0 !important;
        border-bottom: 1px solid var(--smoke) !important;
      }
      .vw-admin-main { padding: 28px !important; overflow-x: hidden !important; }
      .vw-admin-nav { display: flex !important; overflow-x: auto; padding: 10px 12px !important; }
      .vw-admin-nav button {
        width: auto !important;
        min-width: max-content;
        border-left: 0 !important;
        border-bottom: 2px solid transparent;
      }
      .vw-admin-back { position: static !important; padding: 12px 16px 18px !important; }
      .vw-admin-card-grid,
      .vw-admin-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .vw-admin-two-col { grid-template-columns: 1fr !important; }
      .vw-admin-toolbar { flex-wrap: wrap !important; justify-content: flex-start !important; }
      .vw-admin-search { flex: 1 1 260px !important; }
      .btn-gold,
      .btn-outline,
      .btn-ghost {
        padding: 10px 18px;
        font-size: 10px;
        letter-spacing: 2px;
      }
      .vw-section-heading .btn-outline,
      .vw-hero-actions .btn-gold,
      .vw-hero-actions .btn-outline {
        width: auto !important;
        align-self: flex-start;
      }
      .vw-why-section { max-width: 980px !important; padding-top: 72px !important; padding-bottom: 72px !important; }
      .vw-why-header { margin-bottom: 38px !important; }
      .vw-why-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 18px !important;
      }
      .vw-why-card { padding: 26px 20px !important; }
      .vw-why-card-icon { font-size: 32px !important; margin-bottom: 14px !important; }
      .vw-why-card h3 { font-size: 24px !important; margin-bottom: 10px !important; }
      .vw-why-card p { font-size: 14px !important; line-height: 1.55 !important; }
      .vw-footer { padding: 54px 28px 28px !important; }
      .vw-footer-grid { gap: 32px !important; margin-bottom: 36px !important; }
      .vw-footer-socials { gap: 12px !important; flex-wrap: wrap !important; }
      .vw-footer-bottom { padding-top: 20px !important; gap: 16px !important; }
      [style*="grid-template-columns: repeat(4, 1fr)"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      [style*="grid-template-columns: 2fr 1fr 1fr 1fr"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 768px) {
      .sidebar { width: 100vw; }
      .modal-overlay { align-items: flex-start; padding: 16px; overflow-y: auto; }
      .modal-box { width: 100% !important; max-height: none !important; }
      .vw-product-modal { flex-direction: column !important; }
      .vw-product-modal-image { width: 100% !important; flex: none !important; }
      .vw-product-modal-body { padding: 28px 20px !important; }
      .vw-product-modal-actions,
      .vw-product-modal-perks { flex-wrap: wrap !important; }

      .toast {
        left: 16px !important;
        right: 16px !important;
        bottom: 18px !important;
        justify-content: center;
        text-align: center;
      }

      .btn-gold,
      .btn-outline,
      .btn-ghost {
        max-width: 100%;
        letter-spacing: 2px;
        white-space: normal;
      }

      .vw-nav-shell { padding: 0 14px !important; }
      .vw-nav-row {
        display: flex !important;
        align-items: center;
        height: 64px !important;
        gap: 10px !important;
      }
      .vw-brand-link { gap: 9px !important; }
      .vw-nav-actions { gap: 10px !important; justify-self: end; }
      .vw-user-greeting,
      .vw-sign-out { display: none !important; }
      .vw-brand-title { font-size: 20px !important; letter-spacing: 4px !important; }
      .vw-brand-subtitle { font-size: 9px !important; letter-spacing: 2px !important; }
      .vw-mobile-menu-leading {
        width: 36px;
        height: 36px;
      }
      .vw-brand-logo { width: 32px !important; height: 32px !important; }
      .vw-mobile-panel {
        width: min(330px, 84vw);
      }
      .vw-mobile-drawer-head { padding: 24px 20px 18px; }
      .vw-mobile-drawer-brand { font-size: 24px; letter-spacing: 5px; }
      .vw-mobile-panel-inner { padding: 20px; }
      .vw-mobile-panel-inner button {
        font-size: 13px !important;
        padding: 12px 13px !important;
      }

      .vw-home-hero { min-height: 78vh !important; padding: 96px 0 70px !important; overflow: hidden !important; }
      .vw-hero-inner { padding: 0 22px !important; }
      .vw-hero-title { font-size: clamp(52px, 20vw, 86px) !important; letter-spacing: 0 !important; }
      .vw-hero-actions,
      .vw-section-heading,
      .vw-shop-toolbar,
      .vw-admin-header,
      .vw-footer-bottom,
      .vw-account-admin-card,
      .vw-contact-submit-row {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 14px !important;
      }
      .vw-hero-actions,
      .vw-section-heading {
        align-items: flex-start !important;
      }
      .vw-hero-actions .btn-gold,
      .vw-hero-actions .btn-outline,
      .vw-section-heading .btn-outline,
      .vw-filter-toggle {
        width: auto !important;
        min-width: 0;
        padding: 10px 16px !important;
      }

      .vw-section-pad { padding: 56px 20px !important; }
      .vw-page-hero { padding: 48px 20px 34px !important; }
      .vw-page-hero h1,
      [style*="font-size: 72px"],
      [style*="font-size: 80px"] {
        font-size: clamp(36px, 12vw, 48px) !important;
        letter-spacing: 2px !important;
      }
      [style*="font-size: 64px"],
      [style*="font-size: 56px"] {
        font-size: clamp(30px, 10vw, 40px) !important;
        letter-spacing: 2px !important;
      }
      .vw-page-hero p {
        font-size: 13px !important;
        margin-top: 6px !important;
      }
      .vw-shop-layout {
        padding: 26px 20px 28px !important;
        gap: 22px !important;
      }

      [style*="padding: 0px 40px"],
      [style*="padding: 40px 40px"],
      [style*="padding: 48px 40px"],
      [style*="padding: 60px 40px"],
      [style*="padding: 80px 40px"],
      [style*="padding: 100px 40px"] {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      [style*="grid-template-columns: 1fr 1fr"],
      [style*="grid-template-columns: 1fr 1.6fr"],
      [style*="grid-template-columns: 1fr 360px"],
      [style*="grid-template-columns: repeat(2, 1fr)"],
      [style*="grid-template-columns: repeat(3, 1fr)"],
      [style*="grid-template-columns: repeat(4, 1fr)"],
      [style*="grid-template-columns: 2fr 1fr 1fr 1fr"] {
        grid-template-columns: 1fr !important;
      }

      .vw-shop-filters {
        width: min(330px, 84vw) !important;
        padding: 20px !important;
      }
      .vw-product-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 14px !important;
      }
      .vw-product-card-image {
        height: 200px !important;
      }
      .vw-product-card-body {
        padding: 14px 14px 16px !important;
      }
      .vw-product-card-collection {
        font-size: 9px !important;
        letter-spacing: 1.4px !important;
      }
      .vw-product-card-title {
        font-size: 16px !important;
        margin-bottom: 6px !important;
      }
      .vw-product-card-rating {
        gap: 3px !important;
        margin-bottom: 9px !important;
      }
      .vw-product-card-review-count {
        font-size: 9px !important;
      }
      .vw-product-card-price {
        font-size: 18px !important;
      }
      .vw-product-card-original-price {
        font-size: 10px !important;
      }
      .vw-product-card-actions {
        gap: 8px !important;
        margin-top: 12px !important;
      }
      .vw-product-card-action-button {
        padding: 8px 10px !important;
        font-size: 8px !important;
        letter-spacing: 1.4px !important;
      }
      .vw-shop-toolbar {
        margin-bottom: 18px !important;
        gap: 12px !important;
      }
      .vw-shop-toolbar select,
      .vw-shop-toolbar .input-dark {
        font-size: 11px !important;
        padding: 7px 12px !important;
      }
      .vw-shop-results-mobile > div:first-child,
      .vw-shop-toolbar > div:first-child {
        font-size: 11px !important;
        letter-spacing: 1.8px !important;
      }

      .vw-coverflow-stage { height: 500px !important; }
      .vw-coverflow-card { width: min(310px, calc(100vw - 48px)) !important; }
      .vw-mosaic-header { flex-direction: column !important; align-items: flex-start !important; padding: 34px 20px 20px !important; gap: 18px !important; }
      .vw-mosaic-track { padding-left: 20px !important; padding-right: 20px !important; }
      .vw-active-banner { margin: 4px 20px 0 !important; flex-direction: column !important; align-items: stretch !important; gap: 14px !important; }

      .vw-cart-item,
      .vw-wishlist-item {
        grid-template-columns: 1fr !important;
      }
      .vw-cart-total,
      .vw-wishlist-price {
        text-align: left !important;
        gap: 8px !important;
      }
      .vw-cart-controls,
      .vw-wishlist-actions {
        flex-wrap: wrap !important;
      }

      .vw-auth-card { padding: 28px 20px !important; }
      .vw-otp-row { gap: 6px !important; }
      .vw-otp-input {
        width: clamp(36px, 12vw, 46px) !important;
        height: clamp(44px, 13vw, 54px) !important;
      }

      .vw-table-scroll { margin-left: -1px; margin-right: -1px; }
      .vw-admin-main { padding: 24px 18px !important; }
      .vw-admin-main form[style*="display: flex"] { flex-wrap: wrap !important; }
      .vw-admin-main form[style*="display: flex"] .input-dark { min-width: min(220px, 100%); }
      .vw-admin-shell-header {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 18px 16px !important;
      }
      .vw-admin-shell-header > div { min-width: 0; }
      .vw-admin-mobile-title {
        display: block;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 2px;
        color: var(--silver);
        margin-top: 4px;
      }
      .vw-admin-card-grid,
      .vw-admin-summary-grid,
      .vw-admin-form-grid,
      .vw-admin-two-col { grid-template-columns: 1fr !important; }
      .vw-admin-header { margin-bottom: 28px !important; }
      .vw-admin-toolbar,
      .vw-admin-search,
      .vw-admin-actions {
        width: 100% !important;
      }
      .vw-admin-toolbar,
      .vw-admin-actions,
      .vw-admin-form-actions,
      .vw-admin-customer-search {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .vw-admin-main h1 {
        font-size: clamp(36px, 12vw, 44px) !important;
        letter-spacing: 2px !important;
      }
      .vw-admin-main .btn-gold,
      .vw-admin-main .btn-ghost {
        min-height: 42px;
        justify-content: center;
      }
      .vw-table-scroll table { min-width: 760px; }
      .vw-admin-stat-card { padding: 20px 18px !important; }
      .vw-admin-panel { padding: 22px 18px !important; }
      .vw-admin-chart-scroll { overflow-x: auto; padding-bottom: 4px; }
      .vw-admin-chart-scroll > div { min-width: 520px; }
      .vw-why-section { max-width: 760px !important; padding-top: 56px !important; padding-bottom: 56px !important; }
      .vw-why-header { margin-bottom: 30px !important; }
      .vw-why-grid {
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)) !important;
        gap: 14px !important;
      }
      .vw-why-card { padding: 22px 18px !important; }
      .vw-footer { padding: 42px 20px 24px !important; }
      .vw-footer-grid {
        gap: 24px !important;
        margin-bottom: 28px !important;
      }
      .vw-footer-brand p,
      .vw-footer-newsletter p {
        font-size: 15px !important;
        line-height: 1.55 !important;
      }
      .vw-footer-heading { margin-bottom: 12px !important; }
    }

    @media (max-width: 480px) {
      .vw-nav-shell { padding: 0 10px !important; }
      .vw-nav-row {
        gap: 8px !important;
      }
      .vw-nav-actions { gap: 8px !important; }
      .vw-nav-actions button { padding: 0 !important; }
      .vw-mobile-menu-leading { width: 34px; height: 34px; }
      .vw-brand-logo { width: 30px !important; height: 30px !important; }
      .vw-brand-title { font-size: 18px !important; letter-spacing: 3px !important; }
      .vw-brand-subtitle { display: none !important; }
      .vw-mobile-panel { width: min(310px, 88vw); }
      .vw-shop-filters { width: min(310px, 88vw) !important; }
      .vw-shop-results-mobile {
        gap: 10px;
        margin-bottom: 16px;
      }
      .vw-shop-layout {
        padding: 22px 14px 26px !important;
        gap: 18px !important;
      }
      .vw-product-grid {
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 12px !important;
      }
      .vw-product-card-image {
        height: 180px !important;
      }
      .vw-product-card-body {
        padding: 12px 12px 14px !important;
      }
      .vw-product-card-title {
        font-size: 15px !important;
      }
      .vw-product-card-price {
        font-size: 17px !important;
      }
      .vw-product-card-original-price,
      .vw-product-card-review-count {
        font-size: 9px !important;
      }
      .vw-product-card-sale {
        padding: 2px 6px !important;
      }
      .vw-product-card-wishlist {
        bottom: 10px !important;
        right: 10px !important;
        padding: 5px !important;
      }
      .vw-filter-toggle {
        padding: 8px 12px !important;
        font-size: 10px;
      }
      .vw-hero-actions .btn-gold,
      .vw-hero-actions .btn-outline,
      .vw-section-heading .btn-outline,
      .vw-product-card-actions,
      .vw-contact-submit-row button {
        width: 100% !important;
      }
      .vw-product-card-actions { grid-template-columns: 1fr !important; }
      .vw-footer-socials,
      .vw-footer-links { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
      .vw-sidebar-item { gap: 12px !important; }
      .vw-sidebar-thumb { width: 56px !important; height: 68px !important; }
      .btn-gold,
      .btn-outline,
      .btn-ghost {
        padding: 8px 12px;
        font-size: 9px;
        letter-spacing: 1.5px;
      }
      .vw-why-grid { grid-template-columns: minmax(0, 1fr) !important; max-width: 360px; margin: 0 auto; }
      .vw-why-card { padding: 20px 16px !important; }
      .vw-footer-grid { gap: 22px !important; }
      .vw-footer-bottom { align-items: flex-start !important; }
    }
  `}</style>
);

// â"€â"€â"€ CONTEXT â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// AppContext is imported from ./AppContext.js â€" shared with Login, Signup, ForgetPassword
const TAG_COLORS = {
  "BESTSELLER": { bg: "#c9a84c", color: "#0a0a0a" },
  "LIMITED": { bg: "#8b1a1a", color: "#faf9f7" },
  "NEW": { bg: "#1a3a1a", color: "#81c784" },
  "TRENDING": { bg: "#1a1a3a", color: "#4fc3f7" },
  "HOT": { bg: "#3a1a0a", color: "#ff8a65" },
  "MOST LOVED": { bg: "#3a0a1a", color: "#f48fb1" },
  "SIGNATURE": { bg: "#2a1a0a", color: "#c9a84c" },
};

// ─── PAGE ERROR BOUNDARY ─────────────────────────────────────────────────────
class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("[PageError]", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ paddingTop: 120, textAlign: "center", color: "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <div style={{ color: "var(--wolf-red)", fontSize: 14, marginBottom: 12 }}>✕ PAGE FAILED TO RENDER</div>
          <div style={{ color: "var(--silver)", marginBottom: 20 }}>{this.state.error?.message || "Unknown error"}</div>
          <button className="btn-ghost" style={{ fontSize: 9 }} onClick={() => this.setState({ error: null })}>← GO BACK</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// â"€â"€â"€ ICONS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

// â"€â"€â"€ TOAST â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const colors = { success: "#c9a84c", error: "#c0392b", info: "#4fc3f7" };
  return (
    <div className="toast" style={{ borderColor: colors[type] }}>
      <span style={{ color: colors[type] }}>
        {type === "success" ? "\u2713" : type === "error" ? "\u2715" : "i"}
      </span>
      {message}
    </div>
  );
};

const ProductImage = ({ product, height = 280, className = "" }) => {
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

  const cols = collectionColors[product.collection] || ["#111", "#1a1a1a", "#888"];

  return (
    <div
      className={className}
      style={{
        height,
        background: `linear-gradient(135deg, ${cols[0]}, ${cols[1]})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${cols[2]}22, transparent 70%)`,
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 72,
          color: cols[2],
          opacity: 0.15,
          userSelect: "none",
          letterSpacing: 4,
          position: "absolute",
        }}
      >
        VW
      </div>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            color: cols[2],
            letterSpacing: 3,
            lineHeight: 1.2,
          }}
        >
          {product.name.split(" ").map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: cols[2],
            opacity: 0.6,
            letterSpacing: 2,
            marginTop: 10,
          }}
        >
          VELVETWOLF
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: `linear-gradient(transparent, ${cols[0]}88)`,
        }}
      />
    </div>
  );
};

// â"€â"€â"€ MAIN APP â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
export default function VelvetWolf() {
  const [page, _setPage] = useState("home");
  const [adminPage, setAdminPage] = useState("dashboard");

  // Wrap setPage so every navigation is reflected in browser history
  const setPage = (nextPage) => {
    _setPage(nextPage);
    window.history.pushState({ page: nextPage }, "", window.location.pathname);
  };
  const [products, setProducts] = useState(INITIAL_COLLECTION_PRODUCTS);
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
  const [orders, setOrders] = useState([]);
  const [customers] = useState([]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const getLocalWishlistKey = (email) => `vw_wishlist_${(email || "guest").toLowerCase()}`;
  const getGuestCart = () => JSON.parse(localStorage.getItem("vw_guest_cart") || "[]");
  const saveGuestCart = (items) => {
    localStorage.setItem("vw_guest_cart", JSON.stringify(items));
    setCart(items);
  };

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

  // cart_items / wishlist_items FK references auth.users(id), so auth_user_id takes priority
  const getBackendUserId = (value) => value?.auth_user_id || value?.id || null;
  const normalizeUserRoleState = (value = {}) => {
    const role = value?.role || (value?.isAdmin ? "admin" : "customer");
    return {
      ...value,
      role,
      isAdmin: role === "admin",
    };
  };

  const buildUserState = async (authUser) => {
    const storedUser = getStoredUser();
    const backendToken = localStorage.getItem("token");
    const tokenUser = backendToken ? parseBackendToken(backendToken) : null;
    const appUserId = storedUser?.id || tokenUser?.id || null;

    if (!authUser?.id) {
      return normalizeUserRoleState({
        ...storedUser,
        ...authUser,
        id: appUserId,
        auth_user_id: storedUser?.auth_user_id || tokenUser?.auth_user_id,
        email: authUser.email || storedUser?.email,
        name: authUser.name || storedUser?.name || authUser.email?.split("@")[0],
        full_name: authUser.full_name || authUser.name || storedUser?.full_name || storedUser?.name,
        authSource: authUser.authSource || storedUser?.authSource || "backend",
        role: storedUser?.role || tokenUser?.role || "customer",
      });
    }

    try {
      const profile = appUserId ? await getProfile(appUserId) : null;
      return normalizeUserRoleState({
        ...storedUser,
        ...authUser,
        ...profile,
        id: appUserId || authUser.id,
        auth_user_id: authUser.id,
        name: profile?.name || storedUser?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
        full_name: storedUser?.full_name || authUser.user_metadata?.full_name || profile?.name,
        role: profile?.role || storedUser?.role || tokenUser?.role || "customer",
      });
    } catch (err) {
      console.warn("[buildUserState]", err.message);
      return normalizeUserRoleState({
        ...storedUser,
        ...authUser,
        id: appUserId || authUser.id,
        auth_user_id: authUser.id,
        name: storedUser?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
        full_name: storedUser?.full_name || authUser.user_metadata?.full_name,
        role: storedUser?.role || tokenUser?.role || "customer",
      });
    }
  };

  // â"€â"€ syncCartFromDB: loads DB cart into React state â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  // Defined first â€" addToCart/removeFromCart below both call it
  const syncCartFromDB = async (userId) => {
    try {
      const items = await loadCartFromDB(userId);
      setCart(items);
      try { localStorage.setItem(`vw_cart_${userId}`, JSON.stringify(items)); } catch {}
    } catch (err) {
      console.error('[syncCartFromDB]', err.message);
    }
  };

  const addToCart = async (product, size, color, qty = 1) => {
    try {
      const backendUserId = getBackendUserId(user);
      if (backendUserId) {
        await addCartItemDB(backendUserId, product, qty);
        await syncCartFromDB(backendUserId);
      } else {
        // Guest: save to localStorage
        const guest = getGuestCart();
        const idx = guest.findIndex(i => i.id === product.id && i.size === size && i.color === color);
        if (idx > -1) guest[idx].qty += qty;
        else guest.push({ ...product, size, color, qty });
        saveGuestCart(guest);
      }
      showToast("Added to cart \u2713");
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
    const backendUserId = getBackendUserId(user);
    if (backendUserId) {
      // For DB-backed cart: find the cart_item_id, update via DB
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
      // Guest cart: update local state
      if (qty < 1) {
        saveGuestCart(cart.filter(i => !(i.id === id && i.size === size && i.color === color)));
      } else {
        saveGuestCart(cart.map(i => i.id === id && i.size === size && i.color === color ? { ...i, qty } : i));
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
    const backendUserId = getBackendUserId(user);
    if (!backendUserId) {
      const added = toggleLocalWishlist(product);
      showToast(added ? "Added to wishlist \u2665" : "Removed from wishlist", added ? "success" : "info");
      return;
    }
    try {
      const added = await toggleWishlistDB(backendUserId, product);
      await syncWishlistFromDB(backendUserId);
      showToast(added ? "Added to wishlist \u2665" : "Removed from wishlist", added ? "success" : "info");
    } catch (err) {
      showToast('Could not update wishlist', 'error');
      console.error('[toggleWishlist]', err.message);
    }
  };

  const signOutUser = async () => {
    try {
      if (user?.id) {
        await supabase.auth.signOut();
        localStorage.removeItem(`vw_cart_${user.id}`);
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

  // Coerce to numbers â€" Supabase returns numeric columns as strings via JS client
  const cartTotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const cartCount = cart.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  const openShop = (collection = null) => {
    setActiveCollection(collection);
    setPage("shop");
  };

  const ctx = {
    page, setPage, adminPage, setAdminPage,
    products, setProducts, cart, setCart,
    wishlist, setWishlist, user, setUser,
    cartOpen, setCartOpen, wishlistOpen, setWishlistOpen,
    authModal, setAuthModal, selectedProduct, setSelectedProduct,
    activeCollection, setActiveCollection, searchQuery, setSearchQuery,
    orders, customers, cartTotal, cartCount,
    addToCart, removeFromCart, updateCartQty, toggleWishlist, signOutUser, showToast, openShop,
  };

  // â"€â"€ Scroll to top on every page change â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  // ── Browser back/forward button support ─────────────────────────────────────
  useEffect(() => {
    window.history.replaceState({ page: "home" }, "", window.location.pathname);
    const onPopState = (e) => {
      const target = e.state?.page;
      if (target) _setPage(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ── Session init + auth state listener â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    const applySignedInUser = async (authUser, mergeGuestCart = false) => {
      const nextUser = await buildUserState(authUser);
      const backendUserId = getBackendUserId(nextUser);
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));

      if (mergeGuestCart && backendUserId) {
        await mergeGuestCartToDB(backendUserId);
      }

      if (backendUserId) {
        await syncCartFromDB(backendUserId);
        await syncWishlistFromDB(backendUserId);
      } else {
        setCart(getGuestCart());
        setWishlist(loadLocalWishlist(nextUser.email));
      }
    };

    const clearSignedInUser = () => {
      setUser(null);
      setCart(getGuestCart());
      setWishlist([]);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    };

    const query = new URLSearchParams(window.location.search);
    const backendToken = query.get("token");
    const authError = query.get("auth_error");
    const authMode = query.get("mode");
    const resetToken = query.get("reset_token");
    if (backendToken) {
      const decoded = parseBackendToken(backendToken);
      if (decoded?.email) {
        const backendUser = normalizeUserRoleState({
          ...decoded,
          full_name: decoded.name,
          authSource: "google",
        });
        localStorage.setItem("token", backendToken);
        localStorage.setItem("user", JSON.stringify(backendUser));
        setUser(backendUser);
        if (backendUser.id) {
          syncCartFromDB(backendUser.id);
          syncWishlistFromDB(backendUser.id);
        } else {
          setWishlist(loadLocalWishlist(backendUser.email));
          setCart(getGuestCart());
        }
        setPage("home");
      }
    } else if (resetToken) {
      setPage("forgetpassword");
    } else if (authError) {
      showToast(decodeURIComponent(authError), "info");
      setPage(authMode === "signup" ? "signup" : "login");
    }

    if (backendToken || authError) {
      query.delete("token");
      query.delete("provider");
      query.delete("mode");
      query.delete("auth_error");
      const nextQuery = query.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }

    const storedUser = getStoredUser();
    if (storedUser?.email) {
      const normalizedStoredUser = normalizeUserRoleState(storedUser);
      setUser(normalizedStoredUser);
      if (normalizedStoredUser?.id) {
        try {
          const cached = JSON.parse(localStorage.getItem(`vw_cart_${normalizedStoredUser.id}`) || "null");
          if (Array.isArray(cached) && cached.length > 0) setCart(cached);
        } catch {}
        syncCartFromDB(normalizedStoredUser.id);
        syncWishlistFromDB(normalizedStoredUser.id);
      } else {
        setWishlist(loadLocalWishlist(storedUser.email));
        setCart(getGuestCart());
      }
    } else {
      setCart(getGuestCart());
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
    loadProductsFromAPI()
      .then((fetched) => {
        if (fetched.length > 0) setProducts(fetched);
      })
      .catch((err) => console.error('[loadProducts]', err.message));
  }, []);

  useEffect(() => {
    if (user && ["login", "signup", "forgetpassword"].includes(page)) {
      // Admins go straight to the admin dashboard; regular users go to account
      setPage(user.isAdmin ? "admin" : "account");
    }
  }, [page, user]);

  const canAccessAdmin = Boolean(user?.isAdmin);

  useEffect(() => {
    if (page !== "admin" || canAccessAdmin) return;

    setAdminPage("dashboard");

    if (!user) {
      setPage("login");
      showToast("Please sign in with an admin account.", "info");
      return;
    }

    setPage("account");
    showToast("Admin access required.", "error");
  }, [page, user, canAccessAdmin]);

  return (
    <AppContext.Provider value={ctx}>
      <GlobalStyles />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {page === "admin" && canAccessAdmin ? (
        <Suspense fallback={
          <div style={{ minHeight: "100vh", background: "var(--obsidian)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)" }}>LOADING ADMIN...</div>
          </div>
        }>
          <AdminLayout Icon={Icon} TAG_COLORS={TAG_COLORS} />
        </Suspense>
      ) : (
        <>
          {/* â"€â"€ Auth pages: standalone, no Navbar / Footer â"€â"€ */}
          {page === "login"           && <Login />}
          {page === "signup"          && <Signup />}
          {page === "forgetpassword"  && <ForgetPassword />}

          {/* â"€â"€ All other pages: wrapped with Navbar + Footer â"€â"€ */}
          {!["login", "signup", "forgetpassword"].includes(page) && (
            <>
              <Navbar activePage={page} />
              {page === "home"           && <HomePage />}
              {page === "shop"           && <ShopPage />}
              {page === "collection"     && <CollectionsPage />}
              {page === "cart"           && <CartPage />}
              {page === "wishlist"       && <WishlistPage />}
              {page === "account"        && <AccountPage />}
              {page === "checkout"       && <CheckoutPage />}
              {page === "custom"         && <PageErrorBoundary key="custom"><CustomDesignPage /></PageErrorBoundary>}
              {page === "bulk"           && <PageErrorBoundary key="bulk"><BulkOrderPage /></PageErrorBoundary>}
              {page === "contactus"      && <ContactPage />}
              {page === "faq"            && <FAQPage />}
              {page === "privacypolicy"  && <Policy />}
              {page === "shoppingpolicy" && <ShoppingPolicy />}
              {page === "termspage"      && <TermsPage />}
              {page === "returnspage"    && <ReturnsPage />}
              {page === "sizeguide"      && <SizeGuide />}
              {page === "trackorder"     && <TrackOrder />}
              {/* Floating back button for all info/policy pages */}
              {["privacypolicy","shoppingpolicy","termspage","returnspage","sizeguide","trackorder","faq","contactus"].includes(page) && (
                <button
                  onClick={() => window.history.back()}
                  style={{ position:"fixed", top:80, left:24, zIndex:850, background:"var(--graphite)", border:"1px solid var(--smoke)", color:"var(--ash)", fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:2, padding:"8px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="var(--gold)"; e.currentTarget.style.color="var(--gold)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="var(--smoke)"; e.currentTarget.style.color="var(--ash)"; }}
                >
                  ← BACK
                </button>
              )}
              <Footer onNavigate={setPage} />
            </>
          )}
        </>
      )}

      {authModal && <AuthModal />}
      {selectedProduct && <ProductModal />}
      {cartOpen && <CartSidebar />}
      {wishlistOpen && <WishlistSidebar />}
    </AppContext.Provider>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
// function Navbar() {
//   const { setPage, setCartOpen, setWishlistOpen, user, cartCount, wishlist, signOutUser } = useContext(AppContext);
//   const [scrolled, setScrolled] = useState(false);
//   const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "";
//   const greetingName = displayName ? displayName.split(" ")[0] : "";

//   useEffect(() => {
//     const onScroll = () => setScrolled(window.scrollY > 50);
//     window.addEventListener("scroll", onScroll);
//     return () => window.removeEventListener("scroll", onScroll);
//   }, []);

//   return (
//     <nav style={{
//       position: "fixed", top: 0, left: 0, right: 0, zIndex: 800,
//       background: scrolled ? "rgba(10,10,10,0.95)" : "transparent",
//       backdropFilter: scrolled ? "blur(20px)" : "none",
//       borderBottom: scrolled ? "1px solid rgba(201,168,76,0.2)" : "none",
//       transition: "all 0.4s ease",
//       padding: "0 40px",
//     }}>
//       <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
//         {/* Logo */}
//         <div onClick={() => setPage("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
//           <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//             <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--obsidian)" }}>VW</span>
//           </div>
//           <div>
//             <div style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 6, color: "var(--ivory)", lineHeight: 1 }}>VELVETWOLF</div>
//             <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", opacity: 0.8 }}>LUXURY STREETWEAR</div>
//           </div>
//         </div>

//         {/* Nav links */}
//         <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
//           {[["SHOP", "shop"], ["COLLECTIONS", "collection"], ["CUSTOM", "custom"], ["BULK", "bulk"]].map(([label, pg]) => (
//             <button key={pg} onClick={() => setPage(pg)} style={{
//               background: "none", border: "none", color: "var(--ash)", cursor: "pointer",
//               fontFamily: "'Roboto', sans-serif", fontSize: 18, letterSpacing: 3, fontWeight : 500, 
//               transition: "color 0.3s, transform 0.3s", padding: "4px 0", position: "relative"
//             }}
//             onMouseEnter={e => {e.target.style.color = "var(--gold)";
//               e.target.style.transform = "scale(1.1)"; // 👈 zoom
//             }}
//             onMouseLeave={e => { e.target.style.color = "var(--ash)";
//               e.target.style.transform = "scale(1)"; // 👈 normal
//             }}
//             >{label}</button>
//           ))}
//           {user?.isAdmin && (
//             <button onClick={() => setPage("admin")} style={{
//               background: "none", border: "1px solid var(--gold)", color: "var(--gold)", cursor: "pointer",
//               fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, padding: "4px 12px"
//             }}
//             >ADMIN</button>
//           )}
//         </div>

//         {/* Icons */}
//         <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
//           <button onClick={() => user ? setWishlistOpen(true) : setPage("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", position: "relative" }}>
//             <Icon name="heart" size={22} />
//             {wishlist.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "var(--wolf-red)", color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8 }}>{wishlist.length}</span>}
//           </button>
//           <button onClick={() => setCartOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", position: "relative" }}>
//             <Icon name="cart" size={22} />
//             {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "var(--gold)", color: "var(--obsidian)", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: "bold" }}>{cartCount}</span>}
//           </button>
//           {greetingName && (
//             <button
//               onClick={() => setPage("account")}
//               style={{ background: "none", border: "1px solid rgba(201,168,76,0.35)", color: "var(--gold)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5, padding: "8px 12px", textTransform: "none" }}
//             >
//               {`Hi ${greetingName}`}
//             </button>
//           )}
//           {user && (
//             <button
//               onClick={signOutUser}
//               style={{ background: "none", border: "1px solid var(--smoke)", color: "var(--ash)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, padding: "8px 12px" }}
//             >
//               SIGN OUT
//             </button>
//           )}
//           <button onClick={() => user ? setPage("account") : setPage("login")} style={{ background: "none", border: "none", cursor: "pointer", color: user ? "var(--gold)" : "var(--ash)" }}>
//             <Icon name="user" size={22} />
//           </button>
//         </div>
//       </div>
//     </nav>
//   );
// }

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const { setPage, setActiveCollection, products, openShop } = useContext(AppContext);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroSlides = [
    { headline: "WEAR THE", accent: "SILENCE", sub: "Silent Luxury Collection - AW 2024", collection: "silent-luxury" },
    { headline: "BEAST", accent: "MODE ON", sub: "Grind. Hustle. Dominate.", collection: "beast-mode" },
    { headline: "FOUNDER'S", accent: "MINDSET", sub: "Built for builders. Worn by wolves.", collection: "founder" },
  ];
  useEffect(() => { const t = setInterval(() => setHeroIndex(i => (i + 1) % heroSlides.length), 5000); return () => clearInterval(t); }, []);

  const slide = heroSlides[heroIndex];
  const featured = products.slice(0, 7);
  const trending = products.filter(p => p.tag === "TRENDING" || p.tag === "HOT" || p.tag === "MOST LOVED");

  return (
    <div>
      {/* HERO */}
      <section className="vw-home-hero" style={{ minHeight: "85vh", position: "relative", display: "flex", alignItems: "center", overflow: "visible", paddingTop: "100px", paddingBottom: "80px"}}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a1a 100%)" }}/>
        {/* Geometric accents */}
        <div style={{ position: "absolute", top: "25%", right: "5%", width: 400, height: 400, border: "1px solid rgba(201,168,76,0.1)", transform: "rotate(45deg)", animation: "float 6s ease-in-out infinite" }}/>
        <div style={{ position: "absolute", bottom: "25%", left: "50%", width: 200, height: 200, border: "1px solid rgba(201,168,76,0.15)", transform: "rotate(15deg)", animation: "float 4s ease-in-out infinite reverse" }}/>
        <div style={{ position: "absolute", top: "50%", right: "15%", width: 2, height: 300, background: "linear-gradient(transparent, var(--gold), transparent)" }}/>

        <div className="vw-hero-inner" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px", zIndex: 1, width: "100%" }}>
          <div key={heroIndex} style={{ animation: "fadeUp 0.8s ease" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: 6, color: "var(--gold)", marginBottom: 24 }}>{"\u2726 NEW COLLECTION 2026 \u2726"}</div>
            <h1 className="vw-hero-title" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(72px, 12vw, 160px)", lineHeight: 0.9, letterSpacing: -2, marginBottom: 8 }}>
              <span style={{ color: "var(--ivory)", display: "block" }}>{slide.headline}</span>
              <span className="gold-text" style={{ display: "block" }}>{slide.accent}</span>
            </h1>
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, color: "var(--silver)", fontStyle: "italic", marginTop: 24, marginBottom: 40 }}>{slide.sub}</p>
            <div className="vw-hero-actions" style={{ display: "flex", gap: 16 }}>
              <button className="btn-gold" onClick={() => openShop(slide.collection)}>
                EXPLORE COLLECTION
              </button>
              <button className="btn-outline" onClick={() => openShop()}>SHOP ALL</button>
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
            {Array(3).fill("\u2726  VELVET WOLF   \u2726   LUXURY STREETWEAR   \u2726   PREMIUM 220 GSM COTTON   \u2726   MADE IN INDIA   \u2726   FREE SHIPPING ABOVE \u20b91999   \u2726   30 DAY EASY RETURNS ").join("")}
          </div>
        </div>
      </div>

      {/* STATS */}
      <section className="vw-section-pad" style={{ background: "var(--graphite)", padding: "60px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40, textAlign: "center" }}>
          {[["10,000+", "Happy Wolves"], ["220 GSM", "Premium Cotton"], ["48hr", "Dispatch"], ["100%", "India Made"]].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--gold)", letterSpacing: 2 }}>{num}</div>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, letterSpacing: 3, color: "var(--silver)", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

 {/* FEATURED PRODUCTS */}
      <section className="vw-section-pad" style={{ padding: "80px 40px", background: "var(--graphite)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div className="vw-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>HANDPICKED FOR YOU</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: 3 }}>FEATURED PIECES</h2>
            </div>
            <button className="btn-outline" onClick={() => openShop()}>VIEW ALL <Icon name="arrowRight" size={12}/></button>
          </div>
          <FeaturedCoverflow products={featured} />
        </div>
      </section>
      
      {/* MOSAIC CAROUSEL */}
      <MosaicCarousel
        onCategoryClick={(cat) => {
          setActiveCollection(cat.id);
          setPage("shop");
        }}
      />
      {/* COLLECTIONS GRID */}
      {/* <section style={{ padding: "100px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>OUR UNIVERSE</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 64, letterSpacing: 4, color: "var(--ivory)" }}>COLLECTIONS</h2>
          <div className="divider"/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 240px))", justifyContent: "center", gap: 16 }}>
          {HOME_COLLECTIONS.map(col => (
            <div key={col.id} onClick={() => { setActiveCollection(col.id); setPage("shop"); }}
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
        <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
          <button className="btn-outline" onClick={() => setPage("collection")}>EXPLORE ALL COLLECTIONS <Icon name="arrowRight" size={12}/></button>
        </div>
      </section> */}

      {/* CTA BAND */}
      <section className="vw-section-pad" style={{ background: "linear-gradient(135deg, var(--graphite), var(--smoke))", padding: "80px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)" }}/>
        <div style={{ maxWidth: 700, margin: "0 auto", zIndex: 1, position: "relative" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 8, color: "var(--gold)", marginBottom: 24 }}>{"\u2726 DESIGN YOUR IDENTITY \u2726"}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 64, lineHeight: 0.95, letterSpacing: 2, marginBottom: 24 }}>
            UPLOAD YOUR<br/><span className="gold-text">OWN DESIGN</span>
          </h2>
          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 17, color: "var(--silver)", fontStyle: "italic", marginBottom: 40 }}>
            Your vision. Our premium canvas. Upload your artwork and we'll bring it to life on luxury-grade fabric.
          </p>
          <button className="btn-gold" onClick={() => setPage("custom")} style={{ fontSize: 12, padding: "16px 40px" }}>
            START DESIGNING
          </button>
        </div>
      </section>

      {/* WHY VELVETWOLF */}
      <section className="vw-section-pad vw-why-section" style={{ padding: "100px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div className="vw-why-header" style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>OUR PROMISE</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: 3 }}>WHY VELVETWOLF</h2>
          <div className="divider"/>
        </div>
        <div className="vw-why-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            ["\u25c6", "Silent Luxury", "No logo. No noise. Just impeccable quality that speaks through fabric weight, stitch precision, and silhouette."],
            ["\u26a1", "Culture First Design", "Every drop is rooted in real youth culture, tech humor, anime, hustle, philosophy. Not trend-chasing."],
            ["\u2726", "India's Finest", "220 GSM Egyptian cotton. Hand-finished details. Made by master craftspeople in Tirupur, Tamil Nadu."],
          ].map(([icon, title, desc]) => (
            <div className="vw-why-card" key={title} style={{ padding: "40px 32px", border: "1px solid var(--smoke)", position: "relative" }}>
              <div className="vw-why-card-icon" style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--gold)", marginBottom: 20 }}>{icon}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 16 }}>{title}</h3>
              <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 16, color: "var(--silver)", lineHeight: 1.7 }}>{desc}</p>
              <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "linear-gradient(transparent, var(--gold), transparent)" }}/>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// â"€â"€â"€ PRODUCT CARD â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function FeaturedCoverflow({ products }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!products.length) return;
    setActiveIndex((current) => Math.min(current, products.length - 1));
  }, [products.length]);

  useEffect(() => {
    if (products.length < 2 || isHovered) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % products.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHovered, products.length]);

  if (!products.length) return null;

  const getOffset = (index) => {
    const total = products.length;
    let offset = index - activeIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
  };

  return (
    <div style={{ position: "relative", padding: "20px 0 8px" }}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="vw-coverflow-stage"
        style={{ position: "relative", height: 560, overflow: "hidden" }}
      >
        {products.map((product, index) => {
          const offset = getOffset(index);
          const distance = Math.abs(offset);
          const isActive = offset === 0;
          const translateX = offset * 250;
          const scale = isActive ? 1 : Math.max(0.72, 0.88 - distance * 0.12);
          const opacity = distance > 2 ? 0 : Math.max(0.24, 1 - distance * 0.28);
          const rotateY = offset * -18;

          return (
            <div
              key={product.id}
              onClick={() => setActiveIndex(index)}
              className="vw-coverflow-card"
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                width: 340,
                cursor: "pointer",
                zIndex: 20 - distance,
                opacity,
                transform: `translateX(calc(-50% + ${translateX}px)) scale(${scale}) perspective(1400px) rotateY(${rotateY}deg)`,
                transformOrigin: "center center",
                transition: "transform 0.55s ease, opacity 0.45s ease",
                filter: isActive ? "drop-shadow(0 28px 60px rgba(0,0,0,0.45))" : "drop-shadow(0 12px 28px rgba(0,0,0,0.28))",
                pointerEvents: distance > 2 ? "none" : "auto",
              }}
            >
              <ProductCard product={product} />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 12 }}>
        <button className="btn-ghost" onClick={() => setActiveIndex((current) => (current - 1 + products.length) % products.length)} style={{ padding: "10px 16px" }}>
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <Icon name="arrowRight" size={12} color="currentColor" />
          </span>
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {products.map((product, index) => (
            <button
              key={product.id}
              onClick={() => setActiveIndex(index)}
              style={{
                width: index === activeIndex ? 34 : 10,
                height: 3,
                border: "none",
                background: index === activeIndex ? "var(--gold)" : "var(--smoke)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
        <button className="btn-ghost" onClick={() => setActiveIndex((current) => (current + 1) % products.length)} style={{ padding: "10px 16px" }}>
          <Icon name="arrowRight" size={12} color="currentColor" />
        </button>
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const { addToCart, toggleWishlist, wishlist, setSelectedProduct } = useContext(AppContext);
  const inWishlist = wishlist.find(i => i.id === product.id);
  const tagStyle = TAG_COLORS[product.tag] || { bg: "var(--smoke)", color: "var(--ash)" };
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);
  const defaultSize = product.sizes?.[0];
  const defaultColor = product.colors?.[0];

  return (
    <div className="product-card vw-product-card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="vw-product-card-media-wrap" style={{ position: "relative" }}>
        <button
          onClick={() => setSelectedProduct(product)}
          style={{ background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", display: "block", textAlign: "left" }}
          aria-label={`Quick view ${product.name}`}
        >
          <ProductImage product={product} className="vw-product-card-image" />
        </button>
        <div className="vw-product-card-badge-wrap" style={{ position: "absolute", top: 12, left: 12 }}>
          <span className="badge" style={{ background: tagStyle.bg, color: tagStyle.color }}>{product.tag}</span>
        </div>
        {discount > 0 && <div className="vw-product-card-sale" style={{ position: "absolute", top: 12, right: 12, background: "var(--wolf-red)", color: "#fff", padding: "2px 8px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1 }}>-{discount}%</div>}
        <button className="vw-product-card-wishlist" onClick={() => toggleWishlist(product)} style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", padding: 8, color: inWishlist ? "var(--wolf-red)" : "var(--ash)" }}>
          <Icon name={inWishlist ? "heartFill" : "heart"} size={16} color={inWishlist ? "#c0392b" : "var(--ash)"} />
        </button>
      </div>
      <div className="vw-product-card-body" style={{ padding: "20px 20px 24px" }}>
        <div className="vw-product-card-collection" style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "#c9c3c3", marginBottom: 6 }}>
          {getCollectionById(product.collection)?.name?.toUpperCase()}
        </div>
        <h3 className="vw-product-card-title" style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, marginBottom: 8 }}>{product.name}</h3>
        <div className="vw-product-card-rating" style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {[1,2,3,4,5].map(s => <Icon key={s} name="star" size={12} color={s <= Math.floor(product.rating) ? "#c9a84c" : "#333"} />)}
          <span className="vw-product-card-review-count" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#cac7c7", marginLeft: 4 }}>({product.reviews})</span>
        </div>
        <div className="vw-product-card-price-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="vw-product-card-price" style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--gold)" }}>{"\u20b9"}{product.price.toLocaleString()}</span>
          <span className="vw-product-card-original-price" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#cac7c7", textDecoration: "line-through" }}>{"\u20b9"}{product.originalPrice.toLocaleString()}</span>
        </div>
        <div className="vw-product-card-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
          <button className="btn-ghost vw-product-card-action-button" onClick={() => setSelectedProduct(product)} style={{ width: "100%", padding: "12px 16px" }}>
            QUICK VIEW
          </button>
          <button className="btn-gold vw-product-card-action-button" onClick={() => addToCart(product, defaultSize, defaultColor)} style={{ width: "100%", padding: "12px 16px" }}>
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="vw-page-hero" style={{ background: "var(--graphite)", padding: "60px 40px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>VELVETWOLF STORE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: 4 }}>
            {activeCollection ? getCollectionById(activeCollection)?.name?.toUpperCase() : "ALL PRODUCTS"}
          </h1>
          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 16, color: "var(--silver)", marginTop: 8 }}>{filtered.length} pieces available</p>
        </div>
      </div>

      <div className="vw-shop-layout" style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 40px", display: "flex", gap: 40 }}>
        {filterOpen && <div className="vw-filter-backdrop" onClick={() => setFilterOpen(false)} />}
        {/* Sidebar filters */}
        <div id="vw-shop-filters" className={`vw-shop-filters ${filterOpen ? "is-open" : ""}`} style={{ width: 220, flexShrink: 0 }}>
          <div className="vw-filter-drawer-head">
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 4, color: "var(--ivory)", lineHeight: 1 }}>FILTERS</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--gold)", marginTop: 5 }}>REFINE THE DROP</div>
            </div>
            <button
              onClick={() => setFilterOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--silver)", padding: 4 }}
              aria-label="Close filters"
            >
              <Icon name="x" size={22} />
            </button>
          </div>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 16 }}>COLLECTIONS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => setActiveCollection(null)} style={{ background: "none", border: "none", cursor: "pointer", color: !activeCollection ? "var(--gold)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, textAlign: "left", padding: "4px 0" }}>ALL</button>
              {COLLECTIONS.map(col => {
                const CollectionIcon = col.icon;
                const active = activeCollection === col.id;

                return (
                  <button key={col.id} onClick={() => setActiveCollection(active ? null : col.id)} style={{ background: "none", border: "none", cursor: "pointer", color: active ? "var(--gold)" : "#cfcdcd", fontFamily: "'Roboto', sans-serif", fontSize: 12, letterSpacing: 1, textAlign: "left", padding: "4px 0", display: "flex", alignItems: "center", gap: 8 }}>
                    {typeof CollectionIcon === "string" ? (
                      <span>{CollectionIcon}</span>
                    ) : (
                      <CollectionIcon sx={{ fontSize: 16, color: active ? "var(--gold)" : col.color, flexShrink: 0 }} />
                    )}
                    <span>{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 16 }}>SIZE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["XS","S","M","L","XL","XXL"].map(size => (
                <button key={size} onClick={() => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])} style={{background: selectedSizes.includes(size) ? "var(--gold)": "transparent",border: "1px solid var(--gold)", color: selectedSizes.includes(size) ? "var(--obsidian)" : "var(--gold)", padding: "6px 10px",fontFamily: "var(--font-mono)",fontSize: 11, cursor: "pointer", letterSpacing: 1 }}>{size}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div style={{ flex: 1 }}>
          <div className="vw-shop-results-mobile">
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>{filtered.length} RESULTS</div>
            <button className="btn-ghost vw-filter-toggle" onClick={() => setFilterOpen(open => !open)} aria-expanded={filterOpen} aria-controls="vw-shop-filters">
              <span className="vw-filter-toggle-icon">
                <Icon name="filter" size={16} />
              </span>
              <span>{filterOpen ? "HIDE FILTER" : "FILTER"}</span>
            </button>
          </div>
          <div className="vw-shop-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>{filtered.length} RESULTS</div>
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
            <div className="vw-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ COLLECTION PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ PRODUCT MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProductModal() {
  const { selectedProduct: p, setSelectedProduct, addToCart, toggleWishlist, wishlist } = useContext(AppContext);
  const sizes  = Array.isArray(p.sizes)  && p.sizes.length  ? p.sizes  : [];
  const colors = Array.isArray(p.colors) && p.colors.length ? p.colors : [];
  const [size, setSize]   = useState(sizes[0]  ?? null);
  const [color, setColor] = useState(colors[0] ?? null);
  const [qty, setQty] = useState(1);
  const inWishlist = wishlist.find(i => i.id === p.id);

  return (
    <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
      <div className="modal-box vw-product-modal" style={{ maxWidth: 880, display: "flex", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div className="vw-product-modal-image" style={{ flex: 1, flexShrink: 0 }}>
          <ProductImage product={p} height={420} />
        </div>
        <div className="vw-product-modal-body" style={{ flex: 1, padding: 40, overflowY: "auto" }}>
          <button onClick={() => setSelectedProduct(null)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "var(--silver)" }}><Icon name="x" size={20}/></button>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>
            {getCollectionById(p.collection)?.name?.toUpperCase()}
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2, marginBottom: 12 }}>{p.name}</h2>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {[1,2,3,4,5].map(s => <Icon key={s} name="star" size={12} color={s <= Math.floor(p.rating) ? "#c9a84c" : "#333"}/>)}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--silver)", marginLeft: 6 }}>{p.rating} ({p.reviews} reviews)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>{"\u20b9"}{p.price.toLocaleString()}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--silver)", textDecoration: "line-through" }}>{"\u20b9"}{p.originalPrice.toLocaleString()}</span>
          </div>
          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: "var(--silver)", lineHeight: 1.7, marginBottom: 24 }}>{p.description}</p>

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
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--ash)", marginBottom: 10 }}>QUANTITY</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--smoke)", width: "fit-content" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "8px 14px" }}><Icon name="minus" size={14}/></button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ivory)", padding: "0 16px" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ background: "none", border: "none", color: "var(--ash)", cursor: "pointer", padding: "8px 14px" }}><Icon name="plus" size={14}/></button>
            </div>
          </div>

          <div className="vw-product-modal-actions" style={{ display: "flex", gap: 12 }}>
            <button className="btn-gold" style={{ flex: 1 }} onClick={() => { addToCart(p, size, color, qty); setSelectedProduct(null); }}>ADD TO CART</button>
            <button onClick={() => toggleWishlist(p)} style={{ background: inWishlist ? "rgba(192,57,43,0.2)" : "transparent", border: `1px solid ${inWishlist ? "var(--wolf-red)" : "var(--smoke)"}`, color: inWishlist ? "var(--wolf-red)" : "var(--silver)", padding: "0 18px", cursor: "pointer" }}>
              <Icon name={inWishlist ? "heartFill" : "heart"} size={18} color={inWishlist ? "#c0392b" : "var(--silver)"}/>
            </button>
          </div>
          <div className="vw-product-modal-perks" style={{ marginTop: 20, display: "flex", gap: 20 }}>
            {["Secure Payment", "Free Ship \u20b91999+", "30-Day Returns"].map(t => (
              <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 1 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// â"€â"€â"€ CART SIDEBAR â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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
            <div className="vw-sidebar-item" key={i} style={{ padding: "20px 0", borderBottom: "1px solid var(--smoke)", display: "flex", gap: 16 }}>
              <div className="vw-sidebar-thumb" style={{ width: 70, height: 80, flexShrink: 0 }}>
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
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)" }}>{"\u20b9"}{(item.price * item.qty).toLocaleString()}</span>
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
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ivory)" }}>{"\u20b9"}{cartTotal.toLocaleString()}</span>
            </div>
            {cartTotal >= 1999 && <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#81c784", letterSpacing: 1, marginBottom: 16 }}>{"\u2713 FREE SHIPPING UNLOCKED"}</div>}
            <button className="btn-gold" style={{ width: "100%", marginBottom: 10 }} onClick={() => { setCartOpen(false); setPage("checkout"); }}>PROCEED TO CHECKOUT</button>
            <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setCartOpen(false)}>CONTINUE SHOPPING</button>
          </div>
        )}
      </div>
    </div>
  );
}

// â"€â"€â"€ WISHLIST SIDEBAR â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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
            <div className="vw-sidebar-item" key={item.id} style={{ padding: "20px 0", borderBottom: "1px solid var(--smoke)", display: "flex", gap: 16, alignItems: "center" }}>
              <div className="vw-sidebar-thumb" style={{ width: 70, flexShrink: 0 }}><ProductImage product={item} height={80}/></div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 1, marginBottom: 6 }}>{item.name}</h4>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)", marginBottom: 10 }}>{"\u20b9"}{item.price.toLocaleString()}</div>
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

// // â"€â"€â"€ CHECKOUT PAGE â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
void CartSidebar;
void WishlistSidebar;

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
//     showToast(`ðŸŽ‰ Order ${order.order_number} placed!`);
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
//                   {step > i + 1 ? "âœ"" : i + 1}
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
//                 {[["card", "ðŸ'³ Credit / Debit Card"], ["upi", "ðŸ"± UPI (GPay, PhonePe, Paytm)"], ["cod", "ðŸ'µ Cash on Delivery"], ["emi", "ðŸ"† EMI (0% for 3 months)"]].map(([val, label]) => (
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
//                 <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{address.name} Â· {address.phone}</div>
//                 <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{address.address}, {address.city}, {address.state} - {address.pincode}</div>
//               </div>
//               <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "20px 24px", marginBottom: 28 }}>
//                 <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--gold)", marginBottom: 12 }}>PAYMENT</div>
//                 <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)" }}>{paymentMethod === "card" ? `Card ending in ${card.number.slice(-4) || "****"}` : paymentMethod === "upi" ? "UPI Payment" : paymentMethod === "cod" ? "Cash on Delivery" : "EMI - 3 months 0%"}</div>
//               </div>
//               <div style={{ display: "flex", gap: 12 }}>
//                 <button className="btn-ghost" onClick={() => setStep(2)}>BACK</button>
//                 <button className="btn-gold" style={{ flex: 1, opacity: processing ? 0.7 : 1 }} onClick={handleOrder} disabled={processing}>
//                   {processing ? "PROCESSING..." : `PLACE ORDER Â· â‚¹${total.toLocaleString()}`}
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
//                   <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--silver)" }}>Sz: {item.size} Â· Qty: {item.qty}</div>
//                 </div>
//                 <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ash)" }}>â‚¹{(item.price * item.qty).toLocaleString()}</div>
//               </div>
//             ))}
//             <div style={{ marginTop: 16 }}>
//               {[["Subtotal", `â‚¹${cartTotal.toLocaleString()}`], ["Shipping", shipping === 0 ? "FREE" : `â‚¹${shipping}`], ["GST (18%)", `â‚¹${tax.toLocaleString()}`]].map(([label, val]) => (
//                 <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", marginBottom: 8, letterSpacing: 1 }}>
//                   <span>{label}</span><span style={{ color: val === "FREE" ? "#81c784" : "var(--ash)" }}>{val}</span>
//                 </div>
//               ))}
//               <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ivory)", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gold)" }}>
//                 <span>TOTAL</span><span style={{ color: "var(--gold)" }}>â‚¹{total.toLocaleString()}</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// â"€â"€â"€ CUSTOM DESIGN PAGE â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function CustomDesignPage() {
  const { user, setPage, showToast } = useContext(AppContext);
  const [uploaded, setUploaded] = useState(false);
  const [form, setForm] = useState({ fabric: "220gsm", color: "#0a0a0a", size: "M", qty: 1, note: "" });
  const fileInputRef = useRef(null);

  const handleSubmitOrderRequest = () => {
    if (!user) {
      showToast("Please sign in to place a custom order.", "info");
      setPage("login");
      return;
    }

    if (!uploaded) {
      showToast("Upload your design before submitting the request.", "error");
      return;
    }

    if (!Number.isFinite(Number(form.qty)) || Number(form.qty) < 1) {
      showToast("Enter a valid quantity.", "error");
      return;
    }

    if (!form.note.trim()) {
      showToast("Add your design notes before submitting.", "error");
      return;
    }

    showToast("Custom order request submitted!");
  };

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div className="vw-page-hero" style={{ background: "var(--graphite)", padding: "80px 40px 60px", borderBottom: "1px solid var(--smoke)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>MAKE IT YOURS</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 80, letterSpacing: 4 }}>CUSTOM<br/>DESIGN</h1>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginTop: 16 }}>Upload your artwork. We print it on luxury-grade fabric.</p>
      </div>

      <div style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          {/* Upload zone */}
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>UPLOAD DESIGN</h2>
            <div style={{ border: `2px dashed ${uploaded ? "var(--gold)" : "var(--smoke)"}`, padding: "60px 40px", textAlign: "center", cursor: "pointer", transition: "all 0.3s", background: uploaded ? "rgba(201,168,76,0.05)" : "transparent" }}
              onClick={() => { setUploaded(!uploaded); if (!uploaded) showToast("Design uploaded!"); }}>
              <Icon name="upload" size={40} color={uploaded ? "var(--gold)" : "var(--silver)"}/>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, letterSpacing: 2, marginTop: 20, color: uploaded ? "var(--gold)" : "var(--silver)" }}>
                {uploaded ? "DESIGN UPLOADED ✓" : "CLICK TO UPLOAD"}
              </div>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, color: "var(--silver)", letterSpacing: 2, marginTop: 8 }}>PNG, JPG, SVG · MAX 50MB</div>
            </div>
            <div style={{ marginTop: 20 }}>
              {["✦ DTG Printing (all colors)", "✦ Screen Printing (bulk)", "✦ Embroidery (luxury tier)"].map(t => (
                <div key={t} style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginBottom: 8 }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Customization */}
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>CUSTOMIZE</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>FABRIC</label>
                <select className="input-dark" value={form.fabric} onChange={e => setForm(f => ({ ...f, fabric: e.target.value }))}>
                  <option value="220gsm">220 GSM Egyptian Cotton (+{"\u20b9"}0)</option>
                  <option value="240gsm">240 GSM Heavyweight (+{"\u20b9"}200)</option>
                  <option value="180gsm">180 GSM Everyday (+{"\u20b9"}0)</option>
                  <option value="bamboo">Bamboo Organic (+{"\u20b9"}400)</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>BASE COLOR</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["#0a0a0a", "#faf9f7", "#1a2a3a", "#1a0a0a", "#0a1a0a", "#2a2a2a"].map(c => (
                    <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 36, height: 36, background: c, cursor: "pointer", border: `2px solid ${form.color === c ? "var(--gold)" : "transparent"}`, outline: "2px solid var(--smoke)" }}/>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>SIZE</label>
                <select className="input-dark" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}>
                  {["XS","S","M","L","XL","XXL"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>QUANTITY</label>
                <input className="input-dark" type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}/>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>SPECIAL NOTES</label>
                <textarea className="input-dark" placeholder="Print placement, special instructions..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}/>
              </div>
              <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "16px 20px" }}>
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, letterSpacing: 2, color: "var(--silver)", marginBottom: 4 }}>ESTIMATED PRICE</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--gold)" }}>₹{(1499 + (form.fabric === "240gsm" ? 200 : form.fabric === "bamboo" ? 400 : 0)).toLocaleString()}</div>
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: "var(--silver)", marginTop: 4 }}>Per piece · Delivery in 7-10 days</div>
              </div>
              <button className="btn-gold" onClick={handleSubmitOrderRequest}>SUBMIT ORDER REQUEST</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// â"€â"€â"€ BULK ORDER PAGE â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function BulkOrderPage() {
  const { showToast } = useContext(AppContext);
  const [form, setForm] = useState({ type: "corporate", qty: 5, product: "", message: "", org: "", contact: "", email: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRegex = /^[a-zA-Z\s.'-]{2,}$/;
  const orgRegex = /^[a-zA-Z0-9&().,\s'-]{2,}$/;

  const updateField = (key, value) => {
    let nextValue = value;
    if (key === "contact") {
      nextValue = value.replace(/[^a-zA-Z\s.'-]/g, "");
    }
    if (key === "org") {
      nextValue = value.replace(/[^a-zA-Z0-9&().,\s'-]/g, "");
    }
    setForm(prev => ({ ...prev, [key]: nextValue }));
    setErrorMessage("");
  };

  const validateForm = () => {
    if (!form.org.trim()) return "Please enter organization name.";
    if (!orgRegex.test(form.org.trim())) return "Please enter a valid organization name.";
    if (!form.contact.trim()) return "Please enter contact person name.";
    if (!nameRegex.test(form.contact.trim())) return "Please enter a valid contact person name.";
    if (!form.email.trim()) return "Please enter email address.";
    if (!emailRegex.test(form.email.trim())) return "Please enter a valid email address.";
    if (form.qty === "" || form.qty === null) return "Please enter quantity.";
    if (Number(form.qty) < 5) return "Minimum quantity should be 5.";
    if (!form.message.trim()) return "Please enter product requirements.";
    if (form.message.trim().length < 10) return "Please enter more detailed product requirements.";
    return "";
  };

  const handleSubmit = () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    showToast("Quote request sent! We'll contact you within 24hrs.");
    setErrorMessage("");
    setForm({ type: "corporate", qty: 5, product: "", message: "", org: "", contact: "", email: "" });
  };

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div className="vw-page-hero" style={{ background: "var(--graphite)", padding: "80px 40px 60px", textAlign: "center", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>FOR TEAMS & ORGANIZATIONS</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 80, letterSpacing: 4 }}>BULK &<br/>CORPORATE</h1>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginTop: 16 }}>Outfit your entire team in VelvetWolf luxury.</p>
      </div>

      <div style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 28 }}>PRICING TIERS</h2>
          {[["10-49 pcs", "5% OFF", "Team orders"], ["50-99 pcs", "12% OFF", "Department orders"], ["100-499 pcs", "20% OFF", "Corporate branding"], ["500+ pcs", "30% OFF + Custom", "Enterprise bulk"]].map(([qty, disc, label]) => (
            <div key={qty} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid var(--smoke)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, color: "var(--ivory)" }}>{qty}</div>
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginTop: 4 }}>{label}</div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)" }}>{disc}</span>
            </div>
          ))}
          <div style={{ marginTop: 32 }}>
            {["\u2726 Custom logo embroidery/print", "\u2726 Pantone color matching", "\u2726 Individual name printing", "\u2726 Dedicated account manager", "\u2726 Net-30 payment terms available"].map(t => (
              <div key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 1, marginBottom: 10 }}>{t}</div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 28 }}>REQUEST A QUOTE</h2>

          {errorMessage && (
            <div style={{ background: "#2a0f0f", border: "1px solid #7a1f1f", color: "#ff8a80", padding: "12px 14px", marginBottom: 14, fontSize: 14, fontFamily: "'Roboto', sans-serif" }}>
              ✕ {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2, color: "var(--gold)", display: "block", marginBottom: 8 }}>ORDER TYPE</label>
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


// â"€â"€â"€ ADMIN LAYOUT â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// ─── FOOTER ───────────────────────────────────────────────────────────────────
// function Footer() {
//   const { setPage } = useContext(AppContext);
//   return (
//     <footer style={{ background: "var(--graphite)", borderTop: "1px solid var(--smoke)", padding: "80px 40px 40px" }}>
//       <div style={{ maxWidth: 1400, margin: "0 auto" }}>
//         <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 60, marginBottom: 60 }}>
//           <div>
//             <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 28, letterSpacing: 6, marginBottom: 4 }}>VELVETWOLF</div>
//             <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, letterSpacing: 4, color: "var(--gold)", marginBottom: 20 }}>LUXURY STREETWEAR · EST. 2026</div>
//             <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, color: "var(--silver)", lineHeight: 1.8, fontStyle: "italic" }}>
//               Born in Chennai. Worn worldwide. VelvetWolf exists for the silent predators — those who lead with presence, not noise.
//             </p>
//             <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
//               {["📸 Instagram", "𝕏 Twitter", "▶ YouTube"].map(s => (
//                 <span key={s} style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, color: "var(--silver)", cursor: "pointer", letterSpacing: 1 }}>{s}</span>
//               ))}
//             </div>
//           </div>
//           <div>
//             <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20, fontWeight: 700 }}>SHOP</div>
//             {[["All Products", "shop"], ["Custom Design", "custom"], ["Bulk Orders", "bulk"], ["Collections", "collection"]].map(([label, pg]) => (
//               <div key={label} onClick={() => setPage(pg)} style={{ fontFamily: "'Roboto', sans-serif", fontSize: 19, color: "var(--silver)", cursor: "pointer", marginBottom: 10 }}>{label}</div>
//             ))}
//           </div>
//           <div>
//             <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20, fontWeight: 700 }}>SUPPORT</div>
//             {[["Size Guide","sizeguide"],["Track Order","trackorder"],["Returns & Exchange","returnspage"],["FAQ","faq"], ["Contact Us","contactus"]].map(([l,pg]) => (
//               <div key={l} onClick={() => setPage(pg)} style={{ fontFamily: "'Roboto', sans-serif", fontSize: 19, color: "var(--silver)", cursor: "pointer", marginBottom: 10 }}>{l}</div>
//             ))}
//           </div>
//           <div>
//             <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20, fontWeight: 700 }}>NEWSLETTER</div>
//             <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 19, color: "var(--silver)", marginBottom: 16, lineHeight: 1.6 }}>New drops, exclusive offers — for wolves only.</p>
//             <input className="input-dark" placeholder="YOUR EMAIL" style={{ marginBottom: 10 }}/>
//             <button className="btn-gold" style={{ width: "100%", padding: "10px" }}>JOIN THE PACK</button>
//           </div>
//         </div>

//         <div style={{ borderTop: "1px solid var(--smoke)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//           <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 9, color: "var(--silver)", letterSpacing: 1 }}>© 2026 VelvetWolf. All rights reserved. Made with ♥ in Chennai, India.</div>
//           <div style={{ display: "flex", gap: 20 }}>
//             {[["Privacy Policy","privacypolicy"], ["Terms","termspage"], ["Shipping Policy","shoppingpolicy"]].map(([l,pg]) => (
//               <span key={l} onClick={() => setPage(pg)} style={{ fontFamily: "'Roboto', sans-serif", fontSize: 9, color: "var(--silver)", cursor: "pointer", letterSpacing: 1 }}>{l}</span>
//             ))}
//           </div>
//           <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//             {["🔒", "💳", "📱"].map(i => <span key={i} style={{ fontSize: 18 }}>{i}</span>)}
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }
