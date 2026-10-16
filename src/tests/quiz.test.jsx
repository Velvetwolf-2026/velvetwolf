import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { AppContext } from "../velvetwolf/pages/AppContext";
import QuizPage from "../velvetwolf/pages/QuizPage";

// a small real-shaped catalogue: every collection the quiz knows, colour-tagged photos
const COLORS = ["Black", "White", "Beige/Sand", "Forest Green", "Crimson Ember"];
const COLLS = ["silent-luxury", "founder", "mind-mayhem", "anime", "ai-tech", "beast-mode", "savage-quotes", "xp-mode"];
const products = COLLS.flatMap((c) => Array.from({ length: 3 }, (_, i) => ({
  id: `${c}-${i}`, name: `${c} tee ${i}`, collection: c, isActive: true,
  images: COLORS.map((col, k) => `${col}::https://cdn.example/${c}-${i}-${k}.jpg`),
})));

describe("Style quiz (photo picks)", () => {
  const setUser = vi.fn();
  const showToast = vi.fn();
  let store;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((k) => (k in store ? store[k] : null)),
      setItem: vi.fn((k, v) => { store[k] = String(v); }),
      removeItem: vi.fn((k) => { delete store[k]; }),
    });
    window.scrollTo = vi.fn();
    setUser.mockReset();
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  const renderQuiz = (user = null) => render(
    <MemoryRouter>
      <AppContext.Provider value={{ user, setUser, showToast, products }}>
        <QuizPage />
      </AppContext.Provider>
    </MemoryRouter>,
  );

  // pick the option whose photo shows this collection, five times
  const playAll = async (collection) => {
    for (let i = 0; i < 5; i++) {
      const opts = screen.getAllByRole("button").filter((b) => b.classList.contains("quiz-pick"));
      const choice = opts.find((b) => b.getAttribute("aria-label").startsWith(`${collection} tee`)) || opts[0];
      await act(async () => { fireEvent.click(choice); });
    }
  };

  it("starts with a short intro and never gates the shop", () => {
    renderQuiz();
    expect(screen.getByRole("heading", { name: "Find your Wolf Type" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Just browse" }).getAttribute("href")).toBe("/shop");
  });

  it("shows five rounds of four real tee photos, no adjectives", async () => {
    renderQuiz();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByText("1 of 5")).toBeTruthy();
    const opts = screen.getAllByRole("button").filter((b) => b.classList.contains("quiz-pick"));
    expect(opts).toHaveLength(4);
    for (const b of opts) expect(b.querySelector("img").getAttribute("src")).toMatch(/^https:\/\/cdn\.example\//);
  });

  it("a guest's result is kept on this device", async () => {
    renderQuiz();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await playAll("silent-luxury");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBeTruthy();
    const saved = JSON.parse(store.vw_guest_style_profile);
    expect(["BUILDER", "SHADOW", "CREATOR", "ALPHA", "REBEL"]).toContain(saved.personalityType);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("a signed-in result is saved to the account", async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ profile: {} }) });
    renderQuiz({ id: "u1", email: "a@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await playAll("beast-mode");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/user/style-profile"), expect.objectContaining({ method: "POST", body: expect.stringContaining('"personalityType":"') }));
    expect(setUser).toHaveBeenCalled();
    expect(screen.getByText("Get the story card")).toBeTruthy();
  });
});
