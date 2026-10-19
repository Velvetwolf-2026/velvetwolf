import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadCartFromDB, mergeGuestCart, readLocalCart, writeLocalCart, forgetAccountData } from "../velvetwolf/utils/cart";

describe("Cart Utility Tests", () => {
  beforeEach(() => {
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
  });

  it("should load cart items from DB successfully", async () => {
    const mockItems = [{ id: "p1", name: "Mind Palace Tee", qty: 2, price: 1299 }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    const items = await loadCartFromDB("user-uuid");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/cart"),
      expect.any(Object)
    );
    expect(items).toEqual(mockItems);
  });

  it("should throw error if loadCartFromDB API returns an error status", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed connection" }),
    });

    await expect(loadCartFromDB("user-uuid")).rejects.toThrow("Failed connection");
  });

  it("should merge guest cart items into database and clear local storage", async () => {
    const mockGuestItems = [
      { id: "p1", name: "Mind Palace Tee", qty: 1, size: "M", color: "Black" },
      { id: "p2", name: "Silent Luxury Tee", qty: 2, size: "L", color: "Gray" }
    ];
    localStorage.setItem("vw_guest_cart", JSON.stringify(mockGuestItems));

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await mergeGuestCart("user-uuid");

    // Expect batch /cart/merge to be called once
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/cart/merge"),
      expect.objectContaining({ method: "POST" })
    );
    expect(localStorage.removeItem).toHaveBeenCalledWith("vw_guest_cart");
    expect(localStorage.getItem("vw_guest_cart")).toBeNull();
  });

  it("moves a guest's Studio tees to the account's own local cart when they sign in", async () => {
    localStorage.setItem("vw_guest_cart", JSON.stringify([
      { id: "p1", qty: 1, size: "M", color: "Black" },
      { id: "custom-studio-1", isCustom: true, qty: 1, size: "L", color: "Black" },
    ]));
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    await mergeGuestCart("user-uuid");

    expect(JSON.parse(fetch.mock.calls[0][1].body).items.map((i) => i.id)).toEqual(["p1"]);
    expect(readLocalCart("user-uuid").map((i) => i.id)).toEqual(["custom-studio-1"]);
    expect(localStorage.getItem("vw_guest_cart")).toBeNull();
  });
});

describe("account data in this browser", () => {
  beforeEach(() => { vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });

  it("keeps each account's local items apart from the guest cart", () => {
    writeLocalCart("u1", [{ id: "custom-1", isCustom: true, qty: 1 }]);
    expect(readLocalCart("u1")).toHaveLength(1);
    expect(readLocalCart(null)).toEqual([]);
    writeLocalCart("u1", []);
    expect(localStorage.getItem("vw_local_cart_u1")).toBeNull();
  });

  it("forgets everything of a deleted account, so a new sign-up starts empty", () => {
    localStorage.setItem("user", "{}");
    localStorage.setItem("vw_guest_cart", "[1]");
    localStorage.setItem("vw_cart_u1", "[1]");
    localStorage.setItem("vw_local_cart_u1", "[1]");
    localStorage.setItem("vw_wishlist_a@b.com", "[1]");
    localStorage.setItem("vw_local_cart_u2", "[1]");
    sessionStorage.setItem("vw_last_checkout_cart", "[1]");

    forgetAccountData("u1");

    for (const k of ["user", "vw_guest_cart", "vw_cart_u1", "vw_local_cart_u1", "vw_wishlist_a@b.com"]) expect(localStorage.getItem(k)).toBeNull();
    expect(localStorage.getItem("vw_local_cart_u2")).toBe("[1]"); // another account on this browser
    expect(sessionStorage.getItem("vw_last_checkout_cart")).toBeNull();
  });
});
