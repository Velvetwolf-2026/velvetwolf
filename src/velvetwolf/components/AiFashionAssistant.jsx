import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import Icon from "./Icon";
import { apiUrl } from "../utils/api";
import { useBreakpoint } from "../utils/breakpoints";

export default function AiFashionAssistant() {
  const { isMobile } = useBreakpoint();
  const getProductImageUrl = (p) => {
    if (!p) return null;
    if (p.image) {
      if (typeof p.image === "string") {
        if (p.image.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(p.image);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
          } catch (err) {
            console.warn("Failed parsing image JSON in AI Assistant", err);
          }
        }
        return p.image;
      } else if (Array.isArray(p.image) && p.image.length > 0) {
        return p.image[0];
      }
    }
    if (Array.isArray(p.images) && p.images.length > 0) {
      const firstNonPrefixed = p.images.find(img => typeof img === "string" && !img.includes("::"));
      return firstNonPrefixed || p.images[0];
    }
    return null;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your VelvetWolf AI Stylist ✦. What are you looking to wear? You can ask me to help you choose an outfit, find pieces under a price limit, or pick the best fit for an occasion!",
      products: []
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const quickChips = [
    "I need something for a weekend trip.",
    "Premium tshirt for office casual",
    "Streetwear under 1500",
    "Outfit for college"
  ];

  // Scroll chat thread to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const queryText = textToSend || input.trim();
    if (!queryText) return;

    if (!textToSend) setInput("");

    // Append user message
    const updatedMessages = [...messages, { role: "user", content: queryText }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/ai/chat"), {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message || "Here are some recommendations for you:",
        products: data.products || []
      }]);
    } catch (err) {
      console.error("AI chat failed", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I am having trouble connecting to styling services. Please check back later!",
        products: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleSendMessage();
    }
  };

  return (
    <div style={{ position: "fixed", bottom: isMobile ? 76 : 24, right: isMobile ? 16 : 24, zIndex: 900 }}>
      {/* Chat bubble button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
            color: "var(--obsidian)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(201,168,76,0.35), 0 0 10px rgba(201,168,76,0.2)",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <Icon name="wolf" size={24} color="var(--obsidian)" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            width: "min(360px, calc(100vw - 32px))",
            height: isMobile ? "min(500px, 70vh)" : 500,
            background: "rgba(10, 10, 10, 0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--gold)",
            borderRadius: 4,
            boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(201,168,76,0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "vw-drawer-slide 0.25s ease"
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 20px", background: "var(--graphite)", borderBottom: "1px solid var(--smoke)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gold)", animation: "vw-badge-pulse 2s infinite" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", fontWeight: "bold", letterSpacing: 2 }}>VW STYLIST AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Messages Feed */}
          <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div
                  style={{
                    background: m.role === "user" ? "var(--gold)" : "var(--graphite)",
                    color: m.role === "user" ? "var(--obsidian)" : "var(--ivory)",
                    padding: "10px 14px",
                    borderRadius: 2,
                    fontSize: 13,
                    lineHeight: 1.5,
                    fontFamily: m.role === "user" ? "var(--font-mono)" : "var(--font-serif)"
                  }}
                >
                  {m.content}
                </div>

                {/* Render recommended product cards inline */}
                {m.products && m.products.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    {m.products.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/product/${p.slug || p.id}`);
                        }}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--smoke)",
                          padding: "10px 12px",
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--smoke)"}
                      >
                        {getProductImageUrl(p) ? (
                          <img 
                            src={getProductImageUrl(p)} 
                            alt={p.name} 
                            style={{ 
                              width: 44, 
                              height: 44, 
                              objectFit: "cover", 
                              flexShrink: 0,
                              border: "1px solid var(--smoke)"
                            }} 
                          />
                        ) : (
                          <div style={{ 
                            width: 44, 
                            height: 44, 
                            background: "var(--graphite)", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            fontSize: 9, 
                            fontFamily: "var(--font-mono)", 
                            color: "var(--gold)",
                            flexShrink: 0,
                            border: "1px solid var(--smoke)"
                          }}>
                            VW
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: "bold", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-mono)", marginTop: 2 }}>₹{p.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
                ✦ VelvetWolf is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips when feed is fresh or last is assistant */}
          {messages.length === 1 && (
            <div style={{ padding: "0 20px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--smoke)",
                    color: "var(--gold)",
                    padding: "6px 10px",
                    borderRadius: 2,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--smoke)"}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Panel */}
          <div style={{ padding: "14px 20px", background: "var(--graphite)", borderTop: "1px solid var(--smoke)", display: "flex", gap: 10 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask Stylist..."
              style={{
                flex: 1,
                background: "#0a0a0a",
                border: "1px solid var(--smoke)",
                color: "var(--ivory)",
                padding: "8px 12px",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                outline: "none",
                borderRadius: 2
              }}
              onFocus={e => e.target.style.borderColor = "var(--gold)"}
              onBlur={e => e.target.style.borderColor = "var(--smoke)"}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              style={{
                background: "var(--gold)",
                color: "var(--obsidian)",
                border: "none",
                borderRadius: 2,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: (loading || !input.trim()) ? "not-allowed" : "pointer",
                opacity: (loading || !input.trim()) ? 0.6 : 1
              }}
            >
              <Icon name="arrowRight" size={14} color="var(--obsidian)" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
