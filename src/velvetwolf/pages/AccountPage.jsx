import { useState, useEffect, useContext } from "react";
import { AppContext } from "./AppContext";
import { supabase } from "../utils/supabase";
import { getUserOrders } from "../utils/order";
import { updateProfile, sendEmailUpdateOtp, verifyEmailUpdateOtp } from "../utils/profile";
import { apiUrl } from "../utils/api";

export function AccountPage() {
  const { user, setUser, setPage, wishlist, cart, signOutUser, showToast } = useContext(AppContext);
  const [tab, setTab] = useState("overview");
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [settings, setSettings] = useState({ fullName: "", email: "", phone: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const databaseUserId = user?.id || null;

  // Style Profile and Personalization States
  const [styleProfile, setStyleProfile] = useState(null);
  const [styleProfileLoading, setStyleProfileLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    useRecommendations: true,
    personalizedHomepage: true,
    personalizedEmails: true
  });

  useEffect(() => {
    const rec = localStorage.getItem("vw_privacy_recommendations") !== "false";
    const hp = localStorage.getItem("vw_privacy_homepage") !== "false";
    const em = localStorage.getItem("vw_privacy_emails") !== "false";
    setPrivacySettings({
      useRecommendations: rec,
      personalizedHomepage: hp,
      personalizedEmails: em
    });
  }, []);

  const updatePrivacySetting = (key, val) => {
    setPrivacySettings(prev => ({ ...prev, [key]: val }));
    const storageKeys = {
      useRecommendations: "vw_privacy_recommendations",
      personalizedHomepage: "vw_privacy_homepage",
      personalizedEmails: "vw_privacy_emails"
    };
    localStorage.setItem(storageKeys[key], String(val));
    showToast("Privacy settings updated.");
  };

  useEffect(() => {
    if (tab === "style" && user?.personality_type && !styleProfile) {
      setStyleProfileLoading(true);
      const token = localStorage.getItem("token");
      fetch(apiUrl("/user/style-profile"), {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setStyleProfile(data.profile);
        }
      })
      .catch(err => console.error("Failed to load style profile in account page", err))
      .finally(() => setStyleProfileLoading(false));
    }
  }, [tab, user?.personality_type, styleProfile]);

  const handleClearStyleProfile = async () => {
    if (!window.confirm("Are you sure you want to clear your style profile? This will reset all personalized views.")) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/user/style-profile"), {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      
      if (res.ok) {
        showToast("Style profile cleared successfully.");
        setUser(prev => ({ ...prev, personality_type: null }));
        setStyleProfile(null);
        localStorage.removeItem("vw_guest_style_profile");
      } else {
        showToast("Failed to clear style profile.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error clearing style profile.", "error");
    }
  };

  const [showEmailUpdate, setShowEmailUpdate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleSendEmailOtp = async () => {
    if (!newEmail.trim()) {
      setEmailError("Email address is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    
    setSendingEmailOtp(true);
    setEmailError("");
    try {
      await sendEmailUpdateOtp(newEmail.trim());
      setEmailOtpSent(true);
      showToast("Verification code sent to your email.");
    } catch (err) {
      setEmailError(err.message || "Failed to send verification code.");
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length !== 6) {
      setEmailError("Verification code must be 6 digits.");
      return;
    }

    setVerifyingEmailOtp(true);
    setEmailError("");
    try {
      const result = await verifyEmailUpdateOtp(newEmail.trim(), emailOtp);
      
      if (result.token) {
        localStorage.setItem("token", result.token);
      }
      
      const nextUser = {
        ...user,
        ...result.user,
      };

      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      
      showToast("Email address updated successfully!");
      setShowEmailUpdate(false);
      setEmailOtpSent(false);
      setNewEmail("");
      setEmailOtp("");
    } catch (err) {
      setEmailError(err.message || "Invalid or expired verification code.");
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  useEffect(() => {
    if (!databaseUserId || tab !== "orders") return;
    setOrdersLoading(true);
    getUserOrders(databaseUserId)
      .then(data => setUserOrders(data || []))
      .catch(err => console.error('[getUserOrders]', err.message))
      .finally(() => setOrdersLoading(false));

    const channel = supabase
      .channel(`orders:${databaseUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `user_id=eq.${databaseUserId}`,
      }, payload => {
        setUserOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
        showToast(`Order ${payload.new.order_number}: ${payload.new.status}`, 'info');
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [databaseUserId, showToast, tab]);

  const handleSignOut = async () => {
    await signOutUser();
  };

  const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "Wolf";
  const displayInitial = displayName[0].toUpperCase();
  const profileUserId = user?.id || null;

  useEffect(() => {
    setSettings({
      fullName: displayName,
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [displayName, user?.email, user?.phone]);

  const handleSaveSettings = async () => {
    if (!profileUserId) {
      showToast("Could not find your profile.", "error");
      return;
    }

    setSavingSettings(true);
    try {
      const profile = await updateProfile(profileUserId, {
        fullName: settings.fullName.trim(),
        phone: settings.phone.trim(),
        gender: user?.gender ?? null,
        dob: user?.date_of_birth ?? null,
      });

      const nextUser = {
        ...user,
        ...profile,
        full_name: profile?.full_name || settings.fullName.trim(),
        name: profile?.full_name || settings.fullName.trim(),
        phone: profile?.phone || settings.phone.trim(),
      };

      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      showToast("Profile updated successfully.");
    } catch (err) {
      showToast(err.message || "Could not save changes.", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  if (!user) {
    return (
      <div style={{ paddingTop: 70, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, marginBottom: 20 }}>SIGN IN REQUIRED</h2>
          <button className="btn-gold" onClick={() => setPage("login")}>SIGN IN</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div className="page-hero-pad" style={{ background: "var(--graphite)", padding: "60px 40px 0", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 40, flexWrap: "wrap" }}>
            <div style={{ width: 72, height: 72, background: "linear-gradient(135deg, var(--gold), var(--gold-light))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 28, color: "var(--obsidian)", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
              {displayInitial}
            </div>
            <div className="vw-account-profile-copy">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 6 }}>{user.isAdmin ? "ADMIN WOLF" : "WOLF PACK MEMBER"}</div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 2 }}>{displayName.toUpperCase()}</h1>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: "#cac7c7", marginTop: 4 }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
            {[["overview", "OVERVIEW"], ["orders", "ORDERS"], ["wishlist", "SAVED"], ["settings", "SETTINGS"], ["style", "STYLE PROFILE"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "var(--gold)" : "transparent"}`, color: tab === t ? "var(--gold)" : "var(--silver)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, padding: "12px 20px", cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-content-pad" style={{ maxWidth: 1200, margin: "40px auto", padding: "0 40px" }}>
        {tab === "overview" && (
          <div>
            <div className="account-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
              {[["ORDERS", userOrders.length], ["WISHLIST", wishlist.length], ["CART ITEMS", cart.length]].map(([label, val]) => (
                <div className="vw-account-stat-card" key={label} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "32px 28px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--silver)", marginBottom: 12 }}>{label}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--gold)" }}>{val}</div>
                </div>
              ))}
            </div>
            {user.isAdmin && (
              <div className="vw-account-admin-card" style={{ background: "linear-gradient(135deg, var(--graphite), rgba(201,168,76,0.1))", border: "1px solid var(--gold)", padding: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 8 }}>ADMIN ACCESS</div>
                  <p style={{ fontFamily: "'Roboto', sans-serif", color: "var(--silver)" }}>Manage products, orders, and customer analytics</p>
                </div>
                <button className="btn-gold" onClick={() => setPage("admin")}>ADMIN DASHBOARD</button>
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 24 }}>ORDER HISTORY</h2>
            {ordersLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>
                LOADING ORDERS...
              </div>
            ) : userOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--silver)", fontFamily: "'Roboto', sans-serif", fontStyle: "italic", fontSize: 18 }}>
                No orders yet — start shopping!
              </div>
            ) : userOrders.map(order => (
              <div className="vw-account-order-card" key={order.id} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "24px 28px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", letterSpacing: 2, marginBottom: 6 }}>{order.order_number}</div>
                  <div style={{ fontFamily: "var(--font-serif)", color: "var(--silver)", fontSize: 13 }}>
                    {new Date(order.created_at).toLocaleDateString('en-IN')} · {order.order_items?.length || 0} items
                  </div>
                </div>
                <div className="vw-account-order-total" style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ivory)", marginBottom: 6 }}>₹{order.total_amount?.toLocaleString()}</div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, padding: "3px 10px",
                    background: order.status === "delivered" ? "rgba(129,199,132,0.2)" : order.status === "dispatched" ? "rgba(79,195,247,0.2)" : "rgba(201,168,76,0.2)",
                    color: order.status === "delivered" ? "#81c784" : order.status === "dispatched" ? "#4fc3f7" : "var(--gold)" }}>
                    {order.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "wishlist" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 24 }}>SAVED PIECES</h2>
            {/* Wishlist products grid - uses context.wishlist */}
            <div className="vw-account-wishlist-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
              {wishlist.map(p => (
                <div key={p.id} style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: "20px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 8 }}>{p.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)" }}>₹{p.price}</div>
                </div>
              ))}
            </div>
            {wishlist.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "var(--silver)", fontFamily: "'Roboto', sans-serif", fontStyle: "italic", fontSize: 18 }}>Your wishlist is empty</div>}
          </div>
        )}

        {tab === "settings" && (
          <div className="vw-account-settings-panel" style={{ maxWidth: 500 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 32 }}>ACCOUNT SETTINGS</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}>FULL NAME</label>
                <input
                  className="input-dark"
                  value={settings.fullName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="FULL NAME"
                />
              </div>

              {(() => {
                const isMobileEmail = settings.email?.endsWith("@mobile.velvetwolf.in");
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}>EMAIL ADDRESS</label>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ flex: 1, position: "relative" }}>
                        <input
                          className="input-dark"
                          type="email"
                          value={isMobileEmail ? "No email linked" : settings.email}
                          readOnly
                          placeholder="EMAIL"
                          style={{ width: "100%", opacity: 0.75, cursor: "not-allowed", border: isMobileEmail ? "1px dashed var(--gold)" : "1px solid var(--smoke)" }}
                        />
                        {isMobileEmail && (
                          <span className="badge" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(201, 168, 76, 0.15)", color: "var(--gold)", border: "1px solid var(--gold)", fontSize: 8 }}>
                            UNLINKED
                          </span>
                        )}
                      </div>
                      <button 
                        type="button"
                        className="btn-ghost" 
                        style={{ padding: "12px 20px", fontSize: 10, letterSpacing: 2, height: "100%", whiteSpace: "nowrap" }}
                        onClick={() => {
                          setShowEmailUpdate(!showEmailUpdate);
                          setEmailOtpSent(false);
                          setNewEmail("");
                          setEmailOtp("");
                          setEmailError("");
                        }}
                      >
                        {isMobileEmail ? "LINK EMAIL" : "UPDATE"}
                      </button>
                    </div>

                    {showEmailUpdate && (
                      <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 24, marginTop: 16, position: "relative" }}>
                        <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 3, color: "var(--gold)", marginBottom: 16 }}>
                          {isMobileEmail ? "LINK PERSONAL EMAIL" : "UPDATE EMAIL ADDRESS"}
                        </h3>
                        
                        {!emailOtpSent ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <p style={{ fontSize: 13, color: "var(--silver)", lineHeight: 1.5, fontFamily: "var(--font-serif)" }}>
                              {isMobileEmail 
                                ? "Link a secure email address to receive order confirmations, track delivery status, and log in securely." 
                                : "Enter your new email address. We'll send a 6-digit verification code to confirm ownership."}
                            </p>
                            <input
                              className="input-dark"
                              type="email"
                              value={newEmail}
                              onChange={(e) => {
                                setNewEmail(e.target.value);
                                setEmailError("");
                              }}
                              placeholder="NEW EMAIL ADDRESS"
                              disabled={sendingEmailOtp}
                            />
                            {emailError && (
                              <div style={{ color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1 }}>
                                ✕ {emailError}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                              <button 
                                type="button"
                                className="btn-gold" 
                                style={{ padding: "10px 20px", fontSize: 10 }}
                                onClick={handleSendEmailOtp}
                                disabled={sendingEmailOtp}
                              >
                                {sendingEmailOtp ? "SENDING CODE..." : "SEND CODE"}
                              </button>
                              <button 
                                type="button"
                                className="btn-ghost" 
                                style={{ padding: "10px 20px", fontSize: 10 }}
                                onClick={() => setShowEmailUpdate(false)}
                                disabled={sendingEmailOtp}
                              >
                                CANCEL
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <p style={{ fontSize: 13, color: "var(--silver)", lineHeight: 1.5, fontFamily: "var(--font-serif)" }}>
                              A 6-digit verification code has been sent to <strong style={{ color: "var(--ivory)" }}>{newEmail}</strong>. Enter the code below to complete the update.
                            </p>
                            <input
                              className="input-dark"
                              type="text"
                              value={emailOtp}
                              onChange={(e) => {
                                setEmailOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6));
                                setEmailError("");
                              }}
                              placeholder="6-DIGIT CODE"
                              style={{ letterSpacing: 8, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 18 }}
                              disabled={verifyingEmailOtp}
                            />
                            {emailError && (
                              <div style={{ color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1 }}>
                                ✕ {emailError}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                              <button 
                                type="button"
                                className="btn-gold" 
                                style={{ padding: "10px 20px", fontSize: 10 }}
                                onClick={handleVerifyEmailOtp}
                                disabled={verifyingEmailOtp}
                              >
                                {verifyingEmailOtp ? "VERIFYING..." : "VERIFY & UPDATE"}
                              </button>
                              <button 
                                type="button"
                                className="btn-ghost" 
                                style={{ padding: "10px 20px", fontSize: 10 }}
                                onClick={() => setEmailOtpSent(false)}
                                disabled={verifyingEmailOtp}
                              >
                                BACK
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" }}>PHONE NUMBER</label>
                <input
                  className="input-dark"
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
                  placeholder="PHONE NUMBER"
                />
              </div>
            </div>
            <button className="btn-gold" style={{ marginBottom: 16, opacity: savingSettings ? 0.7 : 1, cursor: savingSettings ? "not-allowed" : "pointer" }} onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "SAVING..." : "SAVE CHANGES"}
            </button>
            <div style={{ borderTop: "1px solid var(--smoke)", paddingTop: 24, marginTop: 24 }}>
              <button className="btn-ghost" onClick={handleSignOut}>
                SIGN OUT
              </button>
            </div>
          </div>
        )}

        {tab === "style" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, marginBottom: 24 }}>YOUR STYLE DNA</h2>
            
            {styleProfileLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", letterSpacing: 2 }}>
                LOADING STYLE PROFILE...
              </div>
            ) : !user.personality_type ? (
              <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--graphite)", border: "1px solid var(--smoke)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--silver)", marginBottom: 12 }}>AESTHETIC DNA UNDISCOVERED</div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ash)", marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" }}>
                  Take our 5-question interactive quiz to discover your Wolf Type (Builder, Alpha, Creator, or Shadow) and unlock tailored storefront panels, custom AI filters, and personalized recommendations.
                </p>
                <button className="btn-gold" onClick={() => setPage("quiz")}>TAKE THE QUIZ</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
                {/* Profile Card */}
                <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 36, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)", letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>
                      ACTIVE PROFILE ARCHETYPE
                    </div>
                    <h3 className="gold-text" style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: 3, margin: "0 0 16px 0", lineHeight: 1.1 }}>
                      THE {user.personality_type.toUpperCase()} WOLF
                    </h3>
                    <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ash)", lineHeight: 1.6, marginBottom: 20 }}>
                      {user.personality_type.toUpperCase() === "BUILDER" && "Focused. Disciplined. Always creating. You thrive on structure, design, and building the future. Your style is functional, technical, and precise."}
                      {user.personality_type.toUpperCase() === "ALPHA" && "Ambitious. Powerful. Leading the pack. You represent power, persistence, and presence. Your style commands attention."}
                      {user.personality_type.toUpperCase() === "SHADOW" && "Mysterious. Calculated. Quiet luxury. You operate in the background with silent strength. Your style is monochromatic and premium."}
                      {user.personality_type.toUpperCase() === "CREATOR" && "Artistic. Experimental. Cultured. You are constantly redefining aesthetics. Your style is expressive, oversized, and boundary-pushing."}
                    </p>
                  </div>
                  
                  <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                    <button className="btn-gold" style={{ fontSize: 11, letterSpacing: 2, padding: "10px 20px" }} onClick={() => setPage("quiz")}>
                      RETAKE QUIZ
                    </button>
                    <button 
                      className="btn-ghost" 
                      style={{ fontSize: 11, letterSpacing: 2, borderColor: "var(--crimson)", color: "var(--wolf-red)", padding: "10px 20px" }} 
                      onClick={handleClearStyleProfile}
                    >
                      RESET PROFILE
                    </button>
                  </div>
                </div>

                {/* Score Breakdown & Privacy */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {styleProfile?.quiz_score && (
                    <div style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 28 }}>
                      <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 16 }}>
                        PROFILE MATRIX
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {Object.entries(styleProfile.quiz_score).map(([key, val]) => (
                          <div key={key}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, color: "var(--ash)", textTransform: "uppercase", marginBottom: 4 }}>
                              <span>{key} wolf</span>
                              <span>{val}%</span>
                            </div>
                            <div style={{ height: 4, background: "var(--smoke)", width: "100%" }}>
                              <div style={{ height: "100%", background: key.toUpperCase() === user.personality_type.toUpperCase() ? "var(--gold)" : "var(--silver)", width: `${val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Privacy Options */}
                  <div style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 28 }}>
                    <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 16 }}>
                      PERSONALIZATION & PRIVACY
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={privacySettings.useRecommendations}
                          onChange={(e) => updatePrivacySetting("useRecommendations", e.target.checked)}
                          style={{ accentColor: "var(--gold)" }}
                        />
                        Use my style profile for recommendations
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={privacySettings.personalizedHomepage}
                          onChange={(e) => updatePrivacySetting("personalizedHomepage", e.target.checked)}
                          style={{ accentColor: "var(--gold)" }}
                        />
                        Personalized homepage shelves
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ash)", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={privacySettings.personalizedEmails}
                          onChange={(e) => updatePrivacySetting("personalizedEmails", e.target.checked)}
                          style={{ accentColor: "var(--gold)" }}
                        />
                        Personalized email newsletters
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
