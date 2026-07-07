import { useContext, useState, useEffect } from "react";
import { AppContext } from "./AppContext";
import { useBreakpoint } from "../utils/breakpoints";
import { HeroHeader } from "../styles/shared";

function WishlistItemCard({ item, onAddToCart, onRemove, folders, currentFolder, onMoveToFolder, alerts, onToggleAlert }) {
  const { isMobile } = useBreakpoint();
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  return (
    <div className="vw-wishlist-item" style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "24px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 20 }}>
      <div style={{ position: "relative" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 1, marginBottom: 8 }}>{item.name}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginBottom: 12 }}>
          {item.tag} · {item.sizes?.join(" / ")}
        </div>
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--silver)", lineHeight: 1.6, marginBottom: 18 }}>{item.description}</p>
        
        {/* Alerts & Organization row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20, borderTop: "1px solid var(--smoke)", paddingTop: 14 }}>
          {/* Collection Grouping Dropdown */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setShowFolderMenu(!showFolderMenu)}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--smoke)",
                color: "var(--gold)",
                padding: "6px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              COLLECTION: {currentFolder.toUpperCase()} ▾
            </button>
            {showFolderMenu && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                zIndex: 10,
                background: "var(--onyx)",
                border: "1px solid var(--smoke)",
                minWidth: 160,
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
              }}>
                {folders.map(f => (
                  <div
                    key={f}
                    onClick={() => {
                      onMoveToFolder(f);
                      setShowFolderMenu(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: f === currentFolder ? "var(--gold)" : "var(--silver)",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.02)"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {f.toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ash)" }}>
              <input 
                type="checkbox" 
                checked={alerts?.priceDrop || false} 
                onChange={() => onToggleAlert("priceDrop")}
                style={{ accentColor: "var(--gold)" }}
              />
              PRICE DROP ALERT
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ash)" }}>
              <input 
                type="checkbox" 
                checked={alerts?.backInStock || false} 
                onChange={() => onToggleAlert("backInStock")}
                style={{ accentColor: "var(--gold)" }}
              />
              BACK IN STOCK
            </label>
          </div>
        </div>

        <div className="vw-wishlist-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn-gold" onClick={onAddToCart}>ADD TO CART</button>
          <button
            onClick={onRemove}
            style={{ background: "transparent", border: "1px solid var(--smoke)", color: "var(--silver)", padding: "10px 16px", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2 }}
          >
            REMOVE
          </button>
        </div>
      </div>
      <div className="vw-wishlist-price" style={{ textAlign: isMobile ? "left" : "right", display: "flex", flexDirection: isMobile ? "row" : "column", justifyContent: "space-between", gap: isMobile ? 8 : 0, alignItems: isMobile ? "center" : "initial", borderTop: isMobile ? "1px solid var(--smoke)" : "none", paddingTop: isMobile ? 12 : 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)" }}>₹{Number(item.price).toLocaleString()}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1 }}>SAVE FOR LATER</div>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const { wishlist, user, setPage, toggleWishlist, addToCart, products, showToast } = useContext(AppContext);

  // Read URL search params for shared wishlist
  const query = new URLSearchParams(window.location.search);
  const sharedSlugs = query.get("shared");
  const isSharedView = !!sharedSlugs;

  const [sharedWishlist, setSharedWishlist] = useState([]);
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem("vw_wishlist_folders");
    return saved ? JSON.parse(saved) : ["unassigned", "classics", "summer", "streetwear"];
  });
  const [activeFolderFilter, setActiveFolderFilter] = useState("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);

  // Map of itemId -> folderName
  const [itemFolderMapping, setItemFolderMapping] = useState(() => {
    const saved = localStorage.getItem("vw_wishlist_item_folders");
    return saved ? JSON.parse(saved) : {};
  });

  // Map of itemId -> { priceDrop: boolean, backInStock: boolean }
  const [itemAlerts, setItemAlerts] = useState(() => {
    const saved = localStorage.getItem("vw_wishlist_alerts");
    return saved ? JSON.parse(saved) : {};
  });

  // Parse shared wishlist items from slug params
  useEffect(() => {
    if (sharedSlugs) {
      const slugs = sharedSlugs.split(",");
      const matched = products.filter(p => slugs.includes(p.slug));
      setSharedWishlist(matched);
    }
  }, [sharedSlugs, products]);

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const clean = newFolderName.trim().toLowerCase();
    if (folders.includes(clean)) {
      showToast("Folder already exists.", "info");
      return;
    }
    const next = [...folders, clean];
    setFolders(next);
    localStorage.setItem("vw_wishlist_folders", JSON.stringify(next));
    setNewFolderName("");
    setShowAddFolder(false);
    showToast("Collection folder created! ✦");
  };

  const handleMoveToFolder = (itemId, folder) => {
    const nextMapping = { ...itemFolderMapping, [itemId]: folder };
    setItemFolderMapping(nextMapping);
    localStorage.setItem("vw_wishlist_item_folders", JSON.stringify(nextMapping));
    showToast(`Moved item to ${folder.toUpperCase()}!`);
  };

  const handleToggleAlert = (itemId, type) => {
    const currentItem = itemAlerts[itemId] || { priceDrop: false, backInStock: false };
    const nextItem = { ...currentItem, [type]: !currentItem[type] };
    const nextAlerts = { ...itemAlerts, [itemId]: nextItem };
    setItemAlerts(nextAlerts);
    localStorage.setItem("vw_wishlist_alerts", JSON.stringify(nextAlerts));
    showToast(`Alert updated!`);
  };

  const handleShareWishlist = () => {
    const slugs = wishlist.map(i => i.slug).join(",");
    if (!slugs) return;
    const shareUrl = `${window.location.origin}/wishlist?shared=${encodeURIComponent(slugs)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("Shareable wishlist link copied! ✦");
    }).catch(() => {
      showToast("Failed to copy link. Please copy browser URL.", "error");
    });
  };

  const handleSaveSharedWishlist = () => {
    if (!user) {
      setPage("login");
      showToast("Sign in to save this wishlist.", "info");
      return;
    }
    sharedWishlist.forEach(item => {
      const exists = wishlist.some(i => i.id === item.id);
      if (!exists) toggleWishlist(item);
    });
    showToast("Shared items saved to your wishlist! ✦");
    window.history.pushState({}, "", "/wishlist");
    setSharedWishlist([]);
  };

  // If viewing a shared link
  if (isSharedView) {
    return (
      <div style={{ paddingTop: 70, minHeight: "100vh" }}>
        <HeroHeader
          eyebrow="VELVETWOLF SHARED COLLECTION"
          title="CURATED COLLECTION"
          sub={`${sharedWishlist.length} exclusive designs`}
        />
        <div className="page-content-pad" style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
            <button className="btn-gold" onClick={handleSaveSharedWishlist}>
              ADD ALL TO MY WISHLIST
            </button>
            <button className="btn-outline" onClick={() => { window.history.pushState({}, "", "/wishlist"); setSharedWishlist([]); }}>
              MY WISHLIST
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {sharedWishlist.map((item) => (
              <WishlistItemCard
                key={item.id}
                item={item}
                folders={folders}
                currentFolder="shared"
                onMoveToFolder={() => {}}
                alerts={{}}
                onToggleAlert={() => {}}
                onAddToCart={() => addToCart(item, item.sizes?.[0] || "M", item.colors?.[0] || "#0a0a0a")}
                onRemove={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ paddingTop: 70, minHeight: "100vh" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "90px 40px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: 4, marginBottom: 18 }}>WISHLIST</div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginBottom: 28 }}>Sign in to save pieces to your wishlist and sync them with Supabase.</p>
          <button className="btn-gold" onClick={() => setPage("login")}>SIGN IN</button>
        </div>
      </div>
    );
  }

  // Filter items by folder tab
  const filteredWishlist = wishlist.filter(item => {
    if (activeFolderFilter === "all") return true;
    const folder = itemFolderMapping[item.id] || "unassigned";
    return folder === activeFolderFilter;
  });

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <HeroHeader
        eyebrow="SYNCED WITH YOUR ACCOUNT"
        title="YOUR WISHLIST"
        sub={`${wishlist.length} saved pieces`}
      />

      <div className="page-content-pad" style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 40px" }}>
        {/* Collections Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 36, borderBottom: "1px solid var(--smoke)", paddingBottom: 24 }}>
          {/* Folder tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", ...folders].map(f => {
              const count = f === "all" 
                ? wishlist.length 
                : wishlist.filter(item => (itemFolderMapping[item.id] || "unassigned") === f).length;

              return (
                <button
                  key={f}
                  onClick={() => setActiveFolderFilter(f)}
                  style={{
                    background: activeFolderFilter === f ? "var(--gold)" : "rgba(255,255,255,0.02)",
                    border: "1px solid " + (activeFolderFilter === f ? "var(--gold)" : "var(--smoke)"),
                    color: activeFolderFilter === f ? "var(--obsidian)" : "var(--silver)",
                    padding: "8px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: 1,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {f.toUpperCase()} ({count})
                </button>
              );
            })}
            <button
              onClick={() => setShowAddFolder(!showAddFolder)}
              style={{ background: "transparent", border: "1px dashed var(--gold)", color: "var(--gold)", padding: "8px 16px", fontFamily: "var(--font-mono)", fontSize: 10, cursor: "pointer" }}
            >
              + NEW COLLECTION
            </button>
          </div>

          {/* Share button */}
          {wishlist.length > 0 && (
            <button className="btn-outline" onClick={handleShareWishlist} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              SHARE THIS WISHLIST
            </button>
          )}
        </div>

        {/* Add Folder form */}
        {showAddFolder && (
          <form onSubmit={handleCreateFolder} style={{ display: "flex", gap: 12, marginBottom: 28, maxWidth: 400 }}>
            <input
              type="text"
              placeholder="COLLECTION NAME"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              style={{ flex: 1, background: "#0a0a0a", border: "1px solid var(--smoke)", color: "var(--ivory)", padding: "10px 14px", fontSize: 11, fontFamily: "var(--font-mono)" }}
            />
            <button type="submit" className="btn-gold" style={{ padding: "10px 20px" }}>CREATE</button>
          </form>
        )}

        {/* Wishlist Cards */}
        {filteredWishlist.length === 0 ? (
          <div style={{ textAlign: "center", padding: "90px 0", border: "1px solid var(--smoke)", background: "var(--graphite)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 58, opacity: 0.2, marginBottom: 12 }}>EMPTY</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginBottom: 24 }}>No saved pieces found in this collection.</p>
            <button className="btn-gold" onClick={() => setPage("shop")}>EXPLORE PRODUCTS</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {filteredWishlist.map((item) => (
              <WishlistItemCard
                key={item.id}
                item={item}
                folders={folders}
                currentFolder={itemFolderMapping[item.id] || "unassigned"}
                onMoveToFolder={(folder) => handleMoveToFolder(item.id, folder)}
                alerts={itemAlerts[item.id]}
                onToggleAlert={(type) => handleToggleAlert(item.id, type)}
                onAddToCart={() => addToCart(item, item.sizes?.[0] || "M", item.colors?.[0] || "#0a0a0a")}
                onRemove={() => toggleWishlist(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );}
