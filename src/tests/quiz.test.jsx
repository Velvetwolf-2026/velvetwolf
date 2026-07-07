import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppContext } from "../velvetwolf/pages/AppContext";
import QuizPage from "../velvetwolf/pages/QuizPage";

describe("QuizPage Scoring & Interaction Tests", () => {
  const mockSetUser = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());

    // Mock localStorage
    const store = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, val) => { store[key] = String(val); }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const k in store) delete store[k]; })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const renderQuiz = (user = null) => {
    return render(
      <MemoryRouter>
        <AppContext.Provider value={{ user, setUser: mockSetUser, showToast: mockShowToast }}>
          <QuizPage />
        </AppContext.Provider>
      </MemoryRouter>
    );
  };

  it("should render the welcome screen initially", () => {
    renderQuiz(null);
    expect(screen.getByText("DISCOVER YOUR")).toBeDefined();
    expect(screen.getByText("WOLF TYPE")).toBeDefined();
    expect(screen.getByText("START QUIZ")).toBeDefined();
  });

  it("should progress through questions and calculate BUILDER wolf type", async () => {
    renderQuiz(null);

    // Click Start Quiz
    fireEvent.click(screen.getByText("START QUIZ"));

    // Q1: What drives you? -> Click Building
    expect(screen.getByText("What drives you?")).toBeDefined();
    fireEvent.click(screen.getByText("Building"));

    // Q2: Your weekend looks like? -> Click Coding a side project
    expect(screen.getByText("Your weekend looks like?")).toBeDefined();
    fireEvent.click(screen.getByText("Coding a side project"));

    // Q3: Choose your aesthetic -> Click Techwear
    expect(screen.getByText("Choose your aesthetic")).toBeDefined();
    fireEvent.click(screen.getByText("Techwear"));

    // Q4: Pick a color -> Click Forest Green
    expect(screen.getByText("Pick a color")).toBeDefined();
    fireEvent.click(screen.getByText("Forest Green"));

    // Q5: How do you want people to see you? -> Click Intelligent
    expect(screen.getByText("How do you want people to see you?")).toBeDefined();
    fireEvent.click(screen.getByText("Intelligent"));

    // Wait for the loader
    expect(screen.getByText("CALCULATING WOLF PROFILE...")).toBeDefined();

    // Fast-forward the cinematic timeout
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    // Should display BUILDER wolf details (MIDNIGHT MINIMALIST)
    expect(screen.getByText("MIDNIGHT MINIMALIST")).toBeDefined();
    expect(screen.getByText(/YOU ARE:\s*Monochromatic\.\s*Clean\.\s*Made\s*in\s*silence\./i)).toBeDefined();
  });

  it("should save style profile to local storage for guests", async () => {
    renderQuiz(null);

    // Complete the quiz
    fireEvent.click(screen.getByText("START QUIZ"));
    fireEvent.click(screen.getByText("Building"));
    fireEvent.click(screen.getByText("Coding a side project"));
    fireEvent.click(screen.getByText("Techwear"));
    fireEvent.click(screen.getByText("Forest Green"));
    fireEvent.click(screen.getByText("Intelligent"));

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    // Check localStorage
    const saved = localStorage.getItem("vw_guest_style_profile");
    expect(saved).not.toBeNull();
    const data = JSON.parse(saved);
    expect(data.personalityType).toBe("BUILDER");
    expect(data.quizScore.builder).toBeGreaterThan(50); // BUILDER should have high percentage
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining("Style profile saved locally")
    );
  });

  it("should trigger POST /user/style-profile for authenticated users", async () => {
    const mockUser = { id: "user-uuid", name: "Alpha User", email: "alpha@example.com" };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    renderQuiz(mockUser);

    fireEvent.click(screen.getByText("START QUIZ"));
    
    // Choose Alpha options
    // Q1: Winning
    fireEvent.click(screen.getByText("Winning"));
    // Q2: Gym session
    fireEvent.click(screen.getByText("Gym session"));
    // Q3: Streetwear
    fireEvent.click(screen.getByText("Streetwear"));
    // Q4: Charcoal
    fireEvent.click(screen.getByText("Charcoal"));
    // Q5: Powerful
    fireEvent.click(screen.getByText("Powerful"));

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    // Check fetch payload
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/user/style-profile"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"personalityType":"ALPHA"')
      })
    );
    expect(mockSetUser).toHaveBeenCalled();
  });
});
