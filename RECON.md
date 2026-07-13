# VelvetWolf — Recon Report

**Scope note (read first):** This was requested as a "ui-ux-pro-max skill" audit. That skill is not in my available skill list, so this report was produced with direct grep/read tooling instead — same deliverable, no skill invocation.

**Naming mismatch:** the request named `TeeConfigurator.jsx`, `ConfiguratorSection.jsx`, and Firestore. None of these exist in this repo. VelvetWolf is a Supabase/Postgres-backed storefront; the only R3F-adjacent code is a homepage hero built on raw `three` (not `@react-react/fiber` — no React Three Fiber anywhere in the repo). The mappings below use the actual files. Where a requested artifact has no equivalent, it's marked **N/A**.

---

## 1. Architecture map

| Requested role | Actual file(s) | Notes |
|---|---|---|
| PDP | `src/velvetwolf/pages/ProductDetailPage.jsx` (1549 lines) | Single-file page component, inline styles throughout. |
| "TeeConfigurator.jsx" | **N/A** — no dedicated configurator component | Closest equivalents: the color-swatch selector inside `ProductDetailPage.jsx` (~line 804-826), `ProductModal.jsx` (quick-view color picker), and `CustomDesignPage.jsx` (a separate custom-print design tool with its own color palette). |
| "ConfiguratorSection.jsx" | **N/A** | Does not exist under any name. |
| R3F component | `src/velvetwolf/components/Cinematic3DHero.jsx` (810 lines) | Imperative `three` + `GLTFLoader` inside a `useEffect`, not React Three Fiber (`@react-three/fiber` is not a dependency anywhere in `package.json`). Wrapped by `src/velvetwolf/components/ClientOnly3DHero.jsx`, which lazy-mounts it client-side only and shows a static image on mobile/tablet. Loads `public/tee_model.glb`. Has its own `colorOptions` array (5 entries) driving the 3D tee's material color. |
| Global CSS | `src/index.css` (1687 lines) | Real design-token system: CSS custom properties on `:root` (colors, fonts, fluid type scale), plus ~150 utility classes (`.vw-*`, `.btn-*`, `.product-card`, etc.) and all responsive breakpoint overrides. **`src/index.css.backup` also exists** — a stale duplicate of an earlier version of the same `:root` block (checked: still has `--obsidian: #0a0a0a` etc.), sitting in the source tree as dead weight / drift risk. |
| Tailwind config | **N/A** — Tailwind is not used anywhere in this repo (no `tailwind.config.*`, not in `package.json`). All styling is CSS custom properties + inline `style={{}}` objects. |
| Token/theme file | Three separate, independent sources (see drift note below): <br>1. `src/index.css` `:root` block — CSS custom properties (`--gold`, `--obsidian`, `--vw-ivory`, fluid type scale, etc.) <br>2. `src/velvetwolf/utils/constants.js` — a JS `THEME` object (`gold`, `bg`, `surface`, `border`, `muted`, `text`) + `TAG_COLORS` + category gradient data, consumed by `src/velvetwolf/styles/shared.jsx` | No single source of truth; two independent palettes that happen to agree on `gold` (`#c9a84c`) today but have no mechanism keeping them in sync. |
| Cart hook | **Not a hook** — `src/velvetwolf/utils/cart.js` exports plain async functions (`addCartItemDB`, `loadCartFromDB`, `updateCartQtyDB`, `removeCartItemDB`, `mergeGuestCart`). Cart *state* lives in a monolithic `AppContext` (defined in `src/velvetwolf/pages/AppContext.js`, populated in `src/root.jsx`), consumed via `useContext(AppContext)` everywhere — not a dedicated `useCart()` hook. | |
| Colorway consumers | See table below (Section 2) for every file that renders or reads a colorway value. | |

---

## 2. Colorway-drift map

Target colorways: **black, white, beige, forest green, crimson red**.

### 2a. The core problem: five independent name→hex tables

The same five names are hardcoded as **five separate JS objects/arrays**, copy-pasted rather than imported from one place:

| File:line | Form | Black | White | Beige | Forest Green | Crimson |
|---|---|---|---|---|---|---|
| `src/velvetwolf/pages/ProductDetailPage.jsx:40-46` | `COLOR_MAP` object | `#0a0a0a` | `#faf9f7` | `Beige/Sand` → `#d2b48c` | `#1e4620` | `Crimson Ember` → `#8B2635` |
| `src/velvetwolf/components/ProductModal.jsx:8-14` | `COLOR_MAP` object | `#0a0a0a` | `#faf9f7` | `Beige/Sand` → `#d2b48c` | `#1e4620` | `Crimson Ember` → `#8B2635` |
| `src/velvetwolf/admin/AdminProducts.jsx:35-41` | `COLOR_MAP` object (+ `T_SHIRT_COLORS` name array, line 43) | `#0a0a0a` | `#faf9f7` | `Beige/Sand` → `#d2b48c` | `#1e4620` | `Crimson Ember` → `#8B2635` |
| `src/velvetwolf/components/ProductCard.jsx:101` | inline `colorMap` (re-created every render, inside `.map()`) | `#0a0a0a` | `#faf9f7` | `Beige/Sand` → `#d2b48c` | `#1e4620` | `Crimson Ember` → `#8B2635` |
| `src/velvetwolf/pages/ShopPage.jsx:36-40` | `{name, value}` array (shop filter UI) | `#0a0a0a` | `#faf9f7` | `Beige/Sand` → `#d2b48c` | `#1e4620` | `Crimson Ember` → `#8B2635` |

These five agree with each other today (same hex per name) — but they're 5 hand-synced copies with no shared import, so the next person editing one will silently desync the others.

### 2b. Where it actually diverges: the R3F hero

`src/velvetwolf/components/Cinematic3DHero.jsx:66-70` — its own `colorOptions` array, used to tint the 3D tee material and drive the desktop hero's color-swatch UI. **Does not match the table above:**

| Name in hero | Hex in hero | Hex in the 5-file table | Match? |
|---|---|---|---|
| "Black" (label "Obsidian Black") | `#0D0D0D` | `#0a0a0a` | ✗ different value |
| "White" (label "Alabaster White") | `#FAF9F6` | `#faf9f7` | ✗ different value (off by one hex digit) |
| "Beige" (label "Desert Sand") | `#D9C5B2` | `Beige/Sand` = `#d2b48c` | ✗ different value **and** different display name |
| "Forest Green" (label "Forest Canopy") | `#1E352F` | `#1e4620` | ✗ different value |
| "Crimson Ember" | `#8B2635` | `#8B2635` | ✓ matches |

### 2c. A third, independent palette: the custom-design tool

`src/velvetwolf/pages/CustomDesignPage.jsx:22-26` defines its own color list for the print-design color picker — a **third** distinct set of values, and the only place in the repo where "Crimson Red" appears as its own separate entry from "Crimson Ember":

```
Line 22: { hex: "#0a0a0a", name: "Obsidian Black" }
Line 23: { hex: "#faf9f7", name: "Ivory White" }
Line 28: { hex: "#d5bda9", name: "Desert Sand" }     <- name matches the hero's Beige label, hex doesn't (#d5bda9 vs #D9C5B2)
Line 24: { hex: "#1e3725", name: "Forest Green" }    <- a THIRD distinct Forest Green hex (differs from both #1e4620 and #1E352F)
Line 25: { hex: "#8B2635", name: "Crimson Ember" }
Line 26: { hex: "#4a1515", name: "Crimson Red" }     <- distinct color AND distinct name from "Crimson Ember"
```

So "forest green" alone has **three different hex values** in the repo (`#1e4620`, `#1E352F`, `#1e3725`), and "crimson" has two genuinely different colors sharing the conceptual space (`Crimson Ember` #8B2635 vs `Crimson Red` #4a1515).

### 2d. Static/fallback product data uses a fourth representation: unnamed hex arrays

`src/velvetwolf/utils/collectionsData.js` (9 sample products) stores `colors` as **bare hex arrays with no name field at all**, e.g. line 38: `colors: ["#0a0a0a", "#1a1a1a", "#faf9f7"]`. None of the 9 sample products use a beige, forest-green, or crimson hex — the fallback/demo data never exercises those three swatches at all. This is also the shape `AdminProducts.jsx:31` defaults to (`colors: ["#0a0a0a"]`) before an admin explicitly ticks "all 5 colors."

### 2e. The database layer: `color` vs `color_hex` — and `color_hex` doesn't exist in schema.sql

`schema.sql:92-98` defines `product_variants` with only:
```sql
CREATE TABLE IF NOT EXISTS public.product_variants (
    ...
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    ...
);
```
No `color_hex` column, no `stock_qty` column. Yet the backend actively reads/writes both:

| File:line | Usage |
|---|---|
| `backend/lambda/src/services/checkout.service.js:41,49-51,60` | `.select("id, stock_qty, size, color, color_hex")`, filters on `color_hex` |
| `backend/lambda/src/services/cart.service.js:19,21` | filters on `color_hex` |
| `backend/lambda/src/services/admin.service.js:207` | writes `color_hex: c !== "default" ? c : null` |
| `src/velvetwolf/admin/AdminInventory.jsx:111` | `v.color === color \|\| v.color_hex === color` |

Two possibilities, both bad: either the live Supabase database has `color_hex`/`stock_qty` columns that were added out-of-band and never captured back into `schema.sql` (the committed schema lies about the real DB shape), or these queries are erroring in production. Separately, **`color_hex` isn't actually a hex value** in the data admin.service.js writes: at `admin.service.js:206-207`, both `color` and `color_hex` are set from the *same* loop variable `c`, which per `AdminProducts.jsx:43`'s `T_SHIRT_COLORS` is a **name string** ("Black", "Forest Green", ...), not a hex code. So in the one place that actually populates this column, `color_hex` contains a duplicate copy of the display name, not a hex value — the column is mislabeled relative to what it holds.

### 2f. Cart line items and order items

`src/velvetwolf/utils/cart.js:26-40` (`addCartItemDB`) and `backend/lambda/src/services/checkout.service.js` (`order_items.color`, from `initiateCheckout`) pass through whatever string was on the cart item untouched — which, depending on which page added it to cart, is either a display name (`"Black"`) or a raw hex fallback string. Evidence: `src/velvetwolf/pages/WishlistPage.jsx:244,359` and `src/velvetwolf/components/WishlistSidebar.jsx:34` all fall back to the literal string `"#0a0a0a"` for `item.colors?.[0]` when no color is set — meaning a cart/order line item's `color` field can legitimately be either `"Black"` or `"#0a0a0a"` depending on path, with no normalization at the boundary.

### 2g. Consumer summary table

| Colorway | Representation | File:line | Consumer |
|---|---|---|---|
| Black | `#0a0a0a` (name key) | `ProductDetailPage.jsx:41`, `ProductModal.jsx:9`, `AdminProducts.jsx:36`, `ProductCard.jsx:101`, `ShopPage.jsx:36` | Swatch UI, shop filter |
| Black | `#0D0D0D` ("Obsidian Black") | `Cinematic3DHero.jsx:66` | 3D hero material + swatch |
| Black | `#0a0a0a` ("Obsidian Black") | `CustomDesignPage.jsx:22` | Custom-design picker |
| Black | CSS token `--obsidian`/`--vw-black` = `#0a0a0a` | `src/index.css:18,38` | Global background (unrelated to apparel colorway, same value) |
| Black | bare hex, no name | `collectionsData.js:36-43` (`colors: ["#0a0a0a", ...]`) | Static/fallback product data |
| Black | fallback literal `"#0a0a0a"` | `WishlistPage.jsx:244,359`, `WishlistSidebar.jsx:34` | Cart line item default when no color set |
| Black | DB column `product_variants.color` (TEXT, no enum) | `schema.sql:96` | Persistence — accepts any string |
| White | `#faf9f7` (name key) | `ProductDetailPage.jsx:42`, `ProductModal.jsx:10`, `AdminProducts.jsx:37`, `ProductCard.jsx:101`, `ShopPage.jsx:37` | Swatch UI, shop filter |
| White | `#FAF9F6` ("Alabaster White") | `Cinematic3DHero.jsx:67` | 3D hero material + swatch |
| White | `#faf9f7` ("Ivory White") | `CustomDesignPage.jsx:23` | Custom-design picker |
| Beige | `"Beige/Sand"` → `#d2b48c` | `ProductDetailPage.jsx:43`, `ProductModal.jsx:11`, `AdminProducts.jsx:38`, `ProductCard.jsx:101`, `ShopPage.jsx:38` | Swatch UI, shop filter |
| Beige | `"Beige"` → `#D9C5B2` ("Desert Sand") | `Cinematic3DHero.jsx:68` | 3D hero material + swatch |
| Beige | `"Desert Sand"` → `#d5bda9` | `CustomDesignPage.jsx:28` | Custom-design picker |
| Forest Green | `#1e4620` | `ProductDetailPage.jsx:44`, `ProductModal.jsx:12`, `AdminProducts.jsx:39`, `ProductCard.jsx:101`, `ShopPage.jsx:39` | Swatch UI, shop filter |
| Forest Green | `#1E352F` ("Forest Canopy") | `Cinematic3DHero.jsx:69` | 3D hero material + swatch |
| Forest Green | `#1e3725` | `CustomDesignPage.jsx:24` | Custom-design picker |
| Forest Green | display string only, no hex | `QuizPage.jsx:47,67,94` (quiz answer text + test assertions) | Personality quiz (unrelated to product attribute) |
| Crimson | `"Crimson Ember"` → `#8B2635` | `ProductDetailPage.jsx:45`, `ProductModal.jsx:13`, `AdminProducts.jsx:40`, `ProductCard.jsx:101`, `ShopPage.jsx:40`, `Cinematic3DHero.jsx:70`, `CustomDesignPage.jsx:25` | Swatch UI, shop filter, 3D hero, custom-design picker — the one colorway where all 7 sources agree |
| Crimson | `"Crimson Red"` → `#4a1515` | `CustomDesignPage.jsx:26` | Custom-design picker — **a second, different "crimson," never referenced anywhere else** |
| (unrelated) | `--crimson: #8b1a1a`, `--wolf-red: #c0392b` | `src/index.css:28-29` | UI accent/error-state tokens — same naming space as the apparel colorway but a different concept and different values; a dev grepping "crimson" will hit both and could confuse them |
| (schema) | `color` / `color_hex` columns | `schema.sql:96` (only `color` exists); `checkout.service.js:41`, `cart.service.js:19-21`, `admin.service.js:207`, `AdminInventory.jsx:111` (both used) | See 2e — `color_hex` has no column definition in the committed schema, and where it is populated, it holds a name string, not a hex value |

---

## 3. Accessibility & Touch/Interaction audit (priority 1 & 2 only)

No `ui-ux-pro-max` tooling was available, so contrast ratios below were computed directly from the WCAG relative-luminance formula against the actual token/hex values in the codebase (not estimated).

### 3a. Contrast pairs below 4.5:1 (normal text)

| Foreground | Background | Ratio | File:line | Context |
|---|---|---|---|---|
| `--vw-faint` `#6b6862` | `--vw-black` `#0a0a0a` | **3.57:1** | `src/index.css:43,1131` (`.vw-caption` class) | Caption/meta text — used wherever `.vw-caption` is applied |
| `--wolf-red` `#c0392b` | `--obsidian` `#0a0a0a` | **3.64:1** | `HomePage.jsx:799` (newsletter error, 11px) | Fails at this size (large-text 3:1 threshold doesn't apply below ~18.7px bold / 24px regular) |
| `--wolf-red` `#c0392b` | `--obsidian` `#0a0a0a` | **3.64:1** | `AccountPage.jsx:567,610` (email error, 10px) | Same failure, repeated |
| `--wolf-red` `#c0392b` | `--obsidian` `#0a0a0a` | **3.64:1** | `AccountPage.jsx:709` ("Clear Style Profile" button label, 11px) | Same failure |
| `--wolf-red` `#c0392b` | `--obsidian` `#0a0a0a` | **3.64:1** | `CheckoutPage.jsx:428` ("REMOVE" coupon button, 10px) | Same failure |
| `--wolf-red` `#c0392b` | `--obsidian` `#0a0a0a` | **3.64:1** | `CustomDesignPage.jsx:514,536,558,580` (4× "remove image" buttons, 10px) | Same failure, repeated 4×|
| `--crimson` `#8b1a1a` | `--obsidian` `#0a0a0a` | **2.13:1** | `AccountPage.jsx:709` (`borderColor`) | Border, not text — but still fails WCAG 1.4.11's 3:1 non-text-contrast minimum for a meaningful UI-component border |

Note: `--wolf-red` on `--obsidian` (3.64:1) *does* pass the 3:1 large-text threshold where it's used at ≥40px (`ProductDetailPage.jsx:442` "PRODUCT NOT FOUND", `PaymentStatusPage.jsx:111` "PAYMENT FAILED") — those two are fine. The failures above are specifically the small-text (10-11px) uses of the same token, which is most of its actual usage.

Pairs checked and passing comfortably (for reference, not failures): `--silver` on `--obsidian` 5.19:1, `--ash` 11.83:1, `--vw-muted` 7.97:1, `--gold` on `--obsidian` 8.66:1, `--ivory`/`--vw-ivory` 17-19:1, all 7 `TAG_COLORS` pairs in `constants.js:78-86` (6.27:1–8.83:1).

### 3b. Interactive targets below 44×44px

| Element | Size | File:line | Notes |
|---|---|---|---|
| Color swatch button | 30×30px | `ProductDetailPage.jsx:810-822` | Circular `<button>`, real `onClick` |
| Color swatch button | 28×28px | `ProductModal.jsx:60` | Circular `<button>`, real `onClick` |
| Remove-image button | 16×16px | `AdminProducts.jsx:380,403` | Circular `<button>` with `✕`, `onClick` |
| Remove-image button | 12×12px | `AdminProducts.jsx:501,513,542,549` | Same pattern, smaller — 4 occurrences |
| Edit/delete icon buttons | ~16-18px (icon size, `background:none border:none`, no padding) | `AdminProducts.jsx:589-590` | Clickable box ≈ icon's own rendered size only |
| Agree-to-terms checkbox | 16×16px | `Login.jsx:852` | Custom checkbox implemented as a clickable `<div onClick>`, not a native `<input type="checkbox">` — smallest target guarding an actual form-submission gate |
| Navbar wishlist/cart icon buttons | ~31-33px (icon 19-21px + `.vw-icon-btn`'s `padding: 6px` on each side, from `src/index.css`) | `Navbar.jsx:560-598`, class defined `src/index.css` (`.vw-icon-btn`) | Close to, but under, 44px |
| Language switch pills | ~19px tall (9px font + `padding: 5px 8px`) | `src/index.css` `.vw-lang-pill button` | |

Not flagged: `.vw-color-pill` (`src/index.css`, used by `ProductCard.jsx:98-112`) is 16×16px but has **no `onClick`** — it's a decorative hover-reveal swatch (desktop-only, `title` tooltip only), so it isn't an interactive-target violation, though it visually invites a click it doesn't support.

---

## 4. Hardcoded values that should be tokens

Counted via direct grep across `src/velvetwolf/**/*.jsx` (inline `style={{}}` objects only; CSS file excluded since its custom-property tokens are the actual source of truth):

| Category | Pattern searched | Count | Heaviest files |
|---|---|---|---|
| Hex colors not using `var(--token)` | `#[0-9a-fA-F]{3,8}` | **261** | `ProductImage.jsx` (27), `Cinematic3DHero.jsx` (20), `AdminProducts.jsx` (20), `ProductDetailPage.jsx` (19), `CustomDesignPage.jsx` (15) |
| Raw `fontSize:` numbers | `fontSize:\s*[0-9]+` | **808** | Spread across nearly every page component; `ProductDetailPage.jsx` alone has 30+ |
| Raw `borderRadius:` numbers | `borderRadius:\s*[0-9]+` | **41** | Concentrated in `AdminProducts.jsx` (image thumbnails/remove buttons) |
| Quoted px padding (`padding: "Npx..."`-style) | `padding:\s*"[0-9]+px` | **343** | Spread across nearly every component |

Representative samples (not exhaustive — see counts above for scale):

- **Color:** `ProductDetailPage.jsx:1349` — `background: "#0a0a0a"` inline instead of `var(--obsidian)`. `ProductCard.jsx:94` — `color: "#cac7c7"` for strikethrough price, no token exists for this shade at all. `collectionsData.js:5-10` — category gradient hex triples, fully hardcoded, no relation to the `:root` palette.
- **Font-size:** `ProductDetailPage.jsx:434,442,577,582,616` — 11px/40px/12px/9px/32px, all as bare numbers; `src/index.css` *does* define `--text-hero`, `--text-h1/h2/h3`, `--text-body/small/caption` fluid tokens, but component-level inline styles almost never reference them, defining their own one-off pixel values instead.
- **Border-radius:** `AdminInventory.jsx:192` (`borderRadius: 2`), `AdminProducts.jsx:377,398,402,493,510,530,534,548` (`borderRadius: 4`, repeated 8×) — no `--radius-*` token exists anywhere in `src/index.css` to centralize this.
- **Spacing:** `ProductDetailPage.jsx:577,618` (`padding: "4px 12px"`), pervasive `gap: N` / `marginBottom: N` numeric literals throughout — `src/index.css` has no spacing-scale tokens at all (only the type-scale and tracking tokens listed in Section 1), so 100% of spacing in component files is ad hoc.

**Summary:** `src/index.css` already has a real, reasonably well-designed token system (color, font, fluid type scale) — but it's centralized *only* in the stylesheet's own utility classes (`.vw-*`, `.btn-*`). The moment a value is needed inside a component's inline `style={{}}` object (which is the majority of this codebase's styling), it's almost never expressed as `var(--token)` and instead re-typed as a raw literal — hence 261 stray hex values and 808 stray font-sizes despite tokens existing for most of them.

---

## Not covered in this pass

Per your instructions, no fixes were proposed and no files were changed. Also out of scope here: priority 3+ of whatever the ui-ux-pro-max audit would normally cover (only "Accessibility" and "Touch & Interaction" were requested); a full rgb()/hsl() sweep turned up none in use for these five colorways (the codebase is hex-only for color literals) so that representation is absent from the drift map, not overlooked.
