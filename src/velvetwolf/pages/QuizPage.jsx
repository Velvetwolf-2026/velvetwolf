import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";

const QUESTIONS = [
  {
    id: 1,
    question: "What drives you?",
    options: [
      { text: "Building", weights: { builder: 3, creator: 1, alpha: 0, shadow: 0 } },
      { text: "Creating", weights: { builder: 1, creator: 3, alpha: 0, shadow: 0 } },
      { text: "Winning", weights: { builder: 0, creator: 0, alpha: 3, shadow: 1 } },
      { text: "Exploring", weights: { builder: 1, creator: 2, alpha: 1, shadow: 0 } },
      { text: "Escaping", weights: { builder: 0, creator: 1, alpha: 0, shadow: 3 } }
    ]
  },
  {
    id: 2,
    question: "Your weekend looks like?",
    options: [
      { text: "Coding a side project", weights: { builder: 3, creator: 1, alpha: 0, shadow: 0 } },
      { text: "Watching anime", weights: { builder: 0, creator: 3, alpha: 0, shadow: 1 } },
      { text: "Gym session", weights: { builder: 0, creator: 0, alpha: 3, shadow: 1 } },
      { text: "Road trip", weights: { builder: 1, creator: 2, alpha: 1, shadow: 0 } },
      { text: "Gaming marathon", weights: { builder: 0, creator: 1, alpha: 0, shadow: 3 } }
    ]
  },
  {
    id: 3,
    question: "Choose your aesthetic",
    options: [
      { text: "Minimal", weights: { builder: 1, creator: 0, alpha: 0, shadow: 3 } },
      { text: "Techwear", weights: { builder: 3, creator: 1, alpha: 0, shadow: 0 } },
      { text: "Streetwear", weights: { builder: 0, creator: 2, alpha: 2, shadow: 0 } },
      { text: "Anime", weights: { builder: 0, creator: 3, alpha: 0, shadow: 0 } },
      { text: "Luxury", weights: { builder: 2, creator: 0, alpha: 1, shadow: 2 } }
    ]
  },
  {
    id: 4,
    question: "Pick a color",
    options: [
      { text: "Black", weights: { builder: 0, creator: 0, alpha: 1, shadow: 3 } },
      { text: "Forest Green", weights: { builder: 3, creator: 1, alpha: 0, shadow: 0 } },
      { text: "Beige", weights: { builder: 1, creator: 0, alpha: 0, shadow: 3 } },
      { text: "White", weights: { builder: 0, creator: 3, alpha: 0, shadow: 0 } },
      { text: "Charcoal", weights: { builder: 2, creator: 0, alpha: 2, shadow: 1 } }
    ]
  },
  {
    id: 5,
    question: "How do you want people to see you?",
    options: [
      { text: "Intelligent", weights: { builder: 3, creator: 1, alpha: 0, shadow: 1 } },
      { text: "Creative", weights: { builder: 1, creator: 3, alpha: 0, shadow: 0 } },
      { text: "Powerful", weights: { builder: 0, creator: 0, alpha: 3, shadow: 1 } },
      { text: "Mysterious", weights: { builder: 0, creator: 1, alpha: 0, shadow: 3 } },
      { text: "Ambitious", weights: { builder: 2, creator: 0, alpha: 2, shadow: 0 } }
    ]
  }
];

const WOLF_DETAILS = {
  BUILDER: {
    title: "THE BUILDER WOLF",
    description: "Focused. Disciplined. Always creating.",
    story: "You thrive on structure, design, and building the future. Your style is functional, technical, and precise. You appreciate products that blend technology with raw industrial strength.",
    aesthetic: "Techwear, clean lines, and dark minimal colors.",
    collections: [
      { name: "AI Tech", slug: "ai-tech" },
      { name: "Founder", slug: "founder" },
      { name: "Silent Luxury", slug: "silent-luxury" }
    ]
  },
  ALPHA: {
    title: "THE ALPHA WOLF",
    description: "Ambitious. Powerful. Leading the pack.",
    story: "You represent power, persistence, and presence. You make no excuses and demand excellence. Your style is bold, high-contrast, and commands attention in any room.",
    aesthetic: "Heavy-weight graphics, bold quotes, and high-impact streetwear.",
    collections: [
      { name: "Beast Mode", slug: "beast-mode" },
      { name: "Savage Quotes", slug: "savage-quotes" }
    ]
  },
  SHADOW: {
    title: "THE SHADOW WOLF",
    description: "Mysterious. Calculated. Quiet luxury.",
    story: "You operate in the background with absolute focus and minimal noise. You represent silent strength. Your style is monochromatic, clean, and made of premium materials with zero loud branding.",
    aesthetic: "Absolute minimalism, premium textures, all-black and earthy tones.",
    collections: [
      { name: "Silent Luxury", slug: "silent-luxury" }
    ]
  },
  CREATOR: {
    title: "THE CREATOR WOLF",
    description: "Artistic. Experimental. Cultured.",
    story: "You are constantly redefining aesthetics. You express yourself through vibrant cultural art, illustrations, and unique proportions. Your style is expressive, oversized, and boundary-pushing.",
    aesthetic: "Vibrant graphics, anime-inspired drops, and oversized tech statements.",
    collections: [
      { name: "Anime", slug: "anime" },
      { name: "AI Tech", slug: "ai-tech" }
    ]
  }
};

export default function QuizPage() {
  const { user, setUser, showToast } = useContext(AppContext);
  const navigate = useNavigate();

  const [quizState, setQuizState] = useState("welcome"); // welcome, questions, scoring, results
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [quizResults, setQuizResults] = useState(null);
  const [_loading, setLoading] = useState(false);

  // If user already has a style profile, we can load it or give option to retake
  useEffect(() => {
    if (user?.personality_type) {
      // Allow them to see their type immediately, or retake
      setQuizResults({
        personalityType: user.personality_type.toUpperCase(),
        quizScore: null // Backend might not send detailed breakdown directly, or we fetch
      });
      setQuizState("results");
    } else {
      // Reset state if user is logged out and there is no cached guest profile
      const guestProfileRaw = localStorage.getItem("vw_guest_style_profile");
      if (guestProfileRaw) {
        try {
          const guestProfile = JSON.parse(guestProfileRaw);
          setQuizResults(guestProfile);
          setQuizState("results");
        } catch {
          setQuizResults(null);
          setQuizState("welcome");
        }
      } else {
        setQuizResults(null);
        setQuizState("welcome");
      }
    }
  }, [user]);

  const startQuiz = () => {
    setAnswers([]);
    setCurrentQuestionIdx(0);
    setQuizState("questions");
  };

  const handleSelectOption = (option) => {
    const nextAnswers = [...answers, option];
    setAnswers(nextAnswers);

    if (currentQuestionIdx < QUESTIONS.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      calculateResults(nextAnswers);
    }
  };

  const calculateResults = async (finalAnswers) => {
    setQuizState("scoring");
    setLoading(true);

    // Sum up the weights
    const scores = { builder: 0, alpha: 0, shadow: 0, creator: 0 };
    finalAnswers.forEach((answer) => {
      const w = answer.weights;
      scores.builder += w.builder || 0;
      scores.alpha += w.alpha || 0;
      scores.shadow += w.shadow || 0;
      scores.creator += w.creator || 0;
    });

    const total = scores.builder + scores.alpha + scores.shadow + scores.creator;
    const quizScore = {
      builder: Math.round((scores.builder / total) * 100),
      alpha: Math.round((scores.alpha / total) * 100),
      shadow: Math.round((scores.shadow / total) * 100),
      creator: Math.round((scores.creator / total) * 100)
    };

    // Find highest scoring type
    let personalityType = "BUILDER";
    let maxVal = -1;
    Object.keys(quizScore).forEach((type) => {
      if (quizScore[type] > maxVal) {
        maxVal = quizScore[type];
        personalityType = type.toUpperCase();
      }
    });

    // Save results
    const resultsPayload = { personalityType, quizScore };
    setQuizResults(resultsPayload);

    if (user) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(apiUrl("/user/style-profile"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify(resultsPayload)
        });

        if (res.ok) {
          await res.json();
          showToast(`Style profile saved successfully! Wolf Type: ${personalityType}`);
          // Sync primary user personality type
          setUser((prev) => (prev ? { ...prev, personality_type: personalityType } : null));
        } else {
          showToast("Failed to save style profile to account, caching locally instead.", "info");
          localStorage.setItem("vw_guest_style_profile", JSON.stringify(resultsPayload));
        }
      } catch (err) {
        console.error("Error saving style profile:", err);
        localStorage.setItem("vw_guest_style_profile", JSON.stringify(resultsPayload));
      }
    } else {
      // Save locally for guest
      localStorage.setItem("vw_guest_style_profile", JSON.stringify(resultsPayload));
      showToast("Quiz completed! Style profile saved locally. Sign in to sync.");
    }

    setTimeout(() => {
      setQuizState("results");
      setLoading(false);
    }, 1500); // Cinematic pause
  };

  const handleRetake = () => {
    startQuiz();
  };

  const currentQuestion = QUESTIONS[currentQuestionIdx];

  // Welcome Screen render
  if (quizState === "welcome") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--obsidian)",
        padding: "120px 24px 80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "35vw",
          height: "35vw",
          background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0
        }} />

        <div style={{
          maxWidth: 600,
          width: "100%",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          animation: "fadeUp 0.8s ease forwards"
        }}>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: 6,
            color: "var(--gold)",
            marginBottom: 16,
            textTransform: "uppercase"
          }}>
            Style Profile Personalization
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px, 6vw, 72px)",
            letterSpacing: 8,
            color: "var(--ivory)",
            marginBottom: 20,
            lineHeight: 1.1
          }}>
            DISCOVER YOUR <br />
            <span className="gold-text">WOLF TYPE</span>
          </h1>
          <p style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(18px, 3vw, 22px)",
            color: "var(--ash)",
            marginBottom: 40,
            lineHeight: 1.6,
            fontWeight: 300
          }}>
            Answer 5 quick aesthetic questions and unlock your personalized collections, custom AI search parameters, and tailored recommendations.
          </p>

          <button
            onClick={startQuiz}
            className="btn-gold"
            style={{
              padding: "16px 40px",
              fontSize: 14,
              letterSpacing: 4,
              fontFamily: "var(--font-mono)",
              fontWeight: "bold"
            }}
          >
            START QUIZ
          </button>
        </div>
      </div>
    );
  }

  // Question Slides render
  if (quizState === "questions") {
    const progressPercent = ((currentQuestionIdx + 1) / QUESTIONS.length) * 100;
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--obsidian)",
        padding: "120px 24px 80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }}>
        <div style={{
          maxWidth: 600,
          width: "100%",
          position: "relative",
          zIndex: 1
        }}>
          {/* Progress Indicator */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 2,
              color: "var(--silver)",
              marginBottom: 8
            }}>
              <span>QUESTION {currentQuestionIdx + 1} OF {QUESTIONS.length}</span>
              <span style={{ color: "var(--gold)" }}>{Math.round(progressPercent)}% COMPLETE</span>
            </div>
            <div style={{
              height: 2,
              background: "var(--smoke)",
              width: "100%",
              borderRadius: 2,
              overflow: "hidden"
            }}>
              <div style={{
                height: "100%",
                background: "var(--gold)",
                width: `${progressPercent}%`,
                transition: "width 0.4s ease"
              }} />
            </div>
          </div>

          {/* Question Text */}
          <div style={{ key: currentQuestion.id, animation: "fadeIn 0.5s ease forwards" }}>
            <h2 style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 4vw, 38px)",
              color: "var(--ivory)",
              marginBottom: 32,
              letterSpacing: 1,
              fontWeight: 300,
              textAlign: "center"
            }}>
              {currentQuestion.question}
            </h2>

            {/* Answer Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(option)}
                  style={{
                    background: "var(--onyx)",
                    border: "1px solid var(--smoke)",
                    color: "var(--ivory)",
                    padding: "20px 24px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.3s ease",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--gold)";
                    e.currentTarget.style.background = "var(--graphite)";
                    e.currentTarget.style.transform = "translateX(6px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--smoke)";
                    e.currentTarget.style.background = "var(--onyx)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <span>{option.text}</span>
                  <span style={{ color: "var(--gold)", opacity: 0, transition: "opacity 0.2s" }} className="arrow-indicator">➔</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global style helper to show arrow on button hover */}
        <style>{`
          button:hover .arrow-indicator {
            opacity: 1 !important;
          }
        `}</style>
      </div>
    );
  }

  // Scoring/Processing Loading render
  if (quizState === "scoring") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--obsidian)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24
      }}>
        <div style={{
          width: 50,
          height: 50,
          border: "2px solid var(--smoke)",
          borderTopColor: "var(--gold)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: 4,
          color: "var(--gold)",
          animation: "pulse 1.5s ease-in-out infinite"
        }}>
          CALCULATING WOLF PROFILE...
        </div>
      </div>
    );
  }

  // Results Screen render
  if (quizState === "results" && quizResults) {
    const details = WOLF_DETAILS[quizResults.personalityType] || WOLF_DETAILS.BUILDER;
    const scores = quizResults.quizScore || { builder: 45, alpha: 20, creator: 25, shadow: 10 };

    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--obsidian)",
        padding: "120px 24px 80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }}>
        {/* Glow */}
        <div style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "45vw",
          height: "45vw",
          background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0
        }} />

        <div style={{
          maxWidth: 750,
          width: "100%",
          position: "relative",
          zIndex: 1,
          animation: "fadeUp 0.8s ease forwards"
        }}>
          {/* Card container */}
          <div style={{
            background: "var(--onyx)",
            border: "1px solid var(--smoke)",
            padding: "48px 40px",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
          }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 4,
              color: "var(--gold)",
              marginBottom: 12,
              textTransform: "uppercase"
            }}>
              Quiz Results
            </div>
            <h1 className="gold-text" style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 60px)",
              letterSpacing: 6,
              margin: 0,
              lineHeight: 1.1
            }}>
              {details.title}
            </h1>

            <div className="divider" style={{ margin: "24px auto" }} />

            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              letterSpacing: 3,
              color: "var(--ivory)",
              marginBottom: 24,
              textTransform: "uppercase"
            }}>
              YOU ARE: {details.description}
            </div>

            <p style={{
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              color: "var(--ash)",
              lineHeight: 1.6,
              marginBottom: 36,
              fontWeight: 300,
              maxWidth: 600,
              margin: "0 auto 36px"
            }}>
              {details.story}
            </p>

            {/* Score Breakdown Bars (if available) */}
            {quizResults.quizScore && (
              <div style={{
                textAlign: "left",
                maxWidth: 450,
                margin: "0 auto 40px",
                background: "var(--graphite)",
                padding: "24px 28px",
                border: "1px solid var(--smoke)"
              }}>
                <h3 style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: 2,
                  color: "var(--gold)",
                  marginBottom: 16,
                  textAlign: "center"
                }}>
                  PROFILE MATRIX
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(scores).map(([key, val]) => (
                    <div key={key}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: 1,
                        color: "var(--ash)",
                        textTransform: "uppercase",
                        marginBottom: 4
                      }}>
                        <span>{key} wolf</span>
                        <span>{val}%</span>
                      </div>
                      <div style={{ height: 4, background: "var(--smoke)", width: "100%" }}>
                        <div style={{
                          height: "100%",
                          background: key.toUpperCase() === quizResults.personalityType ? "var(--gold)" : "var(--silver)",
                          width: `${val}%`
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Style and Recommended Collections */}
            <div style={{ marginBottom: 40 }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 2,
                color: "var(--silver)",
                marginBottom: 8
              }}>
                YOUR CORE STYLE
              </div>
              <div style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                color: "var(--gold-light)",
                marginBottom: 24
              }}>
                {details.aesthetic}
              </div>

              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 2,
                color: "var(--silver)",
                marginBottom: 14
              }}>
                UNLOCKED COLLECTIONS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
                {details.collections.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/shop/${col.slug}`)}
                    className="btn-outline"
                    style={{
                      padding: "10px 20px",
                      fontSize: 11,
                      letterSpacing: 2
                    }}
                  >
                    SHOP {col.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Options */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <button
                onClick={handleRetake}
                className="btn-ghost"
                style={{
                  fontSize: 11,
                  letterSpacing: 2
                }}
              >
                RETAKE QUIZ
              </button>

              <button
                onClick={() => navigate(user ? "/account" : "/shop")}
                className="btn-gold"
                style={{
                  padding: "12px 28px",
                  fontSize: 11,
                  letterSpacing: 2,
                  fontWeight: "bold"
                }}
              >
                {user ? "VIEW PROFILE" : "EXPLORE STORE"}
              </button>
            </div>

            {/* Guest sync prompt */}
            {!user && (
              <div style={{
                marginTop: 32,
                paddingTop: 24,
                borderTop: "1px solid var(--smoke)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--silver)"
              }}>
                Want to save this profile permanently?{" "}
                <span
                  onClick={() => navigate("/signup?redirect=quiz")}
                  style={{ color: "var(--gold)", cursor: "pointer", textDecoration: "underline" }}
                >
                  Create an account
                </span>{" "}
                or{" "}
                <span
                  onClick={() => navigate("/login?redirect=quiz")}
                  style={{ color: "var(--gold)", cursor: "pointer", textDecoration: "underline" }}
                >
                  Sign in
                </span>.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
