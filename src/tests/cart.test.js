import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadCartFromDB, mergeGuestCart } from "../velvetwolf/utils/cart";

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
      expect.stringContaining("/cart?userId=user-uuid")
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

    // Expect addCartItemDB to be called twice (once for each guest item)
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(localStorage.removeItem).toHaveBeenCalledWith("vw_guest_cart");
    expect(localStorage.getItem("vw_guest_cart")).toBeNull();
  });
});
