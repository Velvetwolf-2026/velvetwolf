import { describe, it, expect, vi, beforeEach } from "vitest";

// A fake Supabase: every query records its table and calls, and resolves to whatever
// respond(table, calls) returns for it.
const { state, sendEmail } = vi.hoisted(() => ({
  state: { respond: () => ({ data: null, error: null }), log: [] },
  sendEmail: vi.fn(),
}));

vi.mock("../config/supabase.js", () => {
  const query = (table) => {
    const calls = [];
    const q = {};
    for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "is", "in", "lte", "order", "limit", "single", "maybeSingle"]) {
      q[m] = (...args) => { calls.push([m, ...args]); return q; };
    }
    q.then = (resolve, reject) => {
      state.log.push({ table, calls });
      return Promise.resolve(state.respond(table, calls)).then(resolve, reject);
    };
    return q;
  };
  return { supabaseAdmin: { from: query } };
});
vi.mock("../config/smtp.js", () => ({ sendEmail }));

const svc = await import("../services/account.service.js");
const has = (calls, m, ...args) => calls.some((c) => c[0] === m && args.every((a, i) => c[i + 1] === a));

beforeEach(() => {
  state.log = [];
  state.respond = () => ({ data: null, error: null });
  sendEmail.mockReset().mockResolvedValue({ messageId: "x" });
});

const U = "11111111-1111-1111-1111-111111111111";
const O = "22222222-2222-2222-2222-222222222222";
const I = "33333333-3333-3333-3333-333333333333";
const P = "44444444-4444-4444-4444-444444444444";

describe("account: membership", () => {
  it("uses the stored member number when the migration has run", async () => {
    state.respond = (t, calls) => {
      if (t === "users" && has(calls, "select", "id, created_at")) return { data: { id: U, created_at: "2026-10-01T00:00:00Z" }, error: null };
      if (t === "users" && has(calls, "select", "member_no")) return { data: { member_no: 427 }, error: null };
      return { data: null, error: null };
    };
    expect(await svc.getMembership(U)).toEqual({ memberNo: 427, memberSince: "2026-10-01T00:00:00Z" });
  });

  it("counts members who joined up to them when the column isn't there yet", async () => {
    state.respond = (t, calls) => {
      if (has(calls, "select", "id, created_at")) return { data: { id: U, created_at: "2026-10-01T00:00:00Z" }, error: null };
      if (has(calls, "select", "member_no")) return { data: null, error: { code: "42703" } };
      if (has(calls, "lte")) return { count: 12, error: null };
      return { data: null, error: null };
    };
    expect((await svc.getMembership(U)).memberNo).toBe(12);
  });
});

describe("account: fit feedback", () => {
  it("only takes tight, right or roomy", async () => {
    await expect(svc.setFitFeedback(U, O, I, "huge")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("refuses someone else's order", async () => {
    state.respond = (t) => (t === "orders" ? { data: { id: O, user_id: "someone-else", status: "delivered" }, error: null } : { data: null, error: null });
    await expect(svc.setFitFeedback(U, O, I, "right")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("waits until the tee is delivered", async () => {
    state.respond = (t) => (t === "orders" ? { data: { id: O, user_id: U, status: "dispatched" }, error: null } : { data: null, error: null });
    await expect(svc.setFitFeedback(U, O, I, "right")).rejects.toMatchObject({ statusCode: 409 });
  });

  it("saves it on the order line", async () => {
    state.respond = (t) => (t === "orders"
      ? { data: { id: O, user_id: U, status: "delivered" }, error: null }
      : { data: { id: I, fit_feedback: "roomy" }, error: null });
    expect(await svc.setFitFeedback(U, O, I, "roomy")).toEqual({ itemId: I, fit: "roomy" });
    const write = state.log.find((q) => q.table === "order_items");
    expect(has(write.calls, "eq", "order_id", O)).toBe(true);
  });

  it("says the feature is off (503, unavailable) before the migration", async () => {
    state.respond = (t) => (t === "orders"
      ? { data: { id: O, user_id: U, status: "delivered" }, error: null }
      : { data: null, error: { code: "42703" } });
    await expect(svc.setFitFeedback(U, O, I, "right")).rejects.toMatchObject({ statusCode: 503, unavailable: true });
  });
});

describe("account: restock alerts", () => {
  it("checks the tee and the size", async () => {
    await expect(svc.createRestockAlert(U, { productId: "nope", size: "M" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(svc.createRestockAlert(U, { productId: P, size: "XS" })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("caps how many sizes someone can wait on", async () => {
    state.respond = (t, calls) => (has(calls, "is", "notified_at", null) ? { count: 20, error: null } : { data: null, error: null });
    await expect(svc.createRestockAlert(U, { productId: P, size: "L" })).rejects.toMatchObject({ statusCode: 429 });
  });

  it("emails waiting customers once a size is back, skipping anyone who turned them off", async () => {
    const A1 = "55555555-5555-5555-5555-555555555555", A2 = "66666666-6666-6666-6666-666666666666";
    const U2 = "77777777-7777-7777-7777-777777777777";
    state.respond = (t, calls) => {
      if (t === "product_variants") return { data: [{ product_id: P, size: "L", stock_qty: 3 }], error: null };
      if (t === "restock_alerts" && has(calls, "select")) return {
        data: [
          { id: A1, user_id: U, users: { email: "a@example.com" }, products: { name: "Quiet Mind Oversized Tee", slug: "quiet-mind" } },
          { id: A2, user_id: U2, users: { email: "b@example.com" }, products: { name: "Quiet Mind Oversized Tee", slug: "quiet-mind" } },
        ], error: null,
      };
      if (t === "account_settings") return { data: [{ user_id: U2, notification_prefs: { restock: false } }], error: null };
      return { data: null, error: null };
    };
    const r = await svc.notifyRestock(P, "L");
    expect(r.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: "a@example.com", subject: "Quiet Mind Oversized Tee is back in L" });
    expect(sendEmail.mock.calls[0][0].text).toContain("/product/quiet-mind");
    // both alerts are closed (the opted-out one without an email)
    const closed = state.log.filter((q) => q.table === "restock_alerts" && has(q.calls, "update"));
    expect(closed).toHaveLength(2);
  });

  it("sends nothing while the size is still out", async () => {
    state.respond = (t) => (t === "product_variants" ? { data: [{ product_id: P, size: "L", stock_qty: 0 }], error: null } : { data: [], error: null });
    expect((await svc.notifyRestock(P, "L")).sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("never throws into the stock update", async () => {
    state.respond = () => { throw new Error("db down"); };
    await expect(svc.notifyRestock(P, "L")).resolves.toEqual({ sent: 0 });
  });
});

describe("account: stock per size", () => {
  it("sums colours per size and ignores bad ids", async () => {
    state.respond = () => ({ data: [
      { product_id: P, size: "M", stock_qty: 2 }, { product_id: P, size: "M", stock_qty: 3 }, { product_id: P, size: "L", stock_qty: 0 },
    ], error: null });
    expect(await svc.getStockBySize([P, "x"])).toEqual({ [P]: { M: 5, L: 0 } });
    expect(await svc.getStockBySize(["x"])).toEqual({});
  });
});

describe("account: notification choices and the shared list", () => {
  it("restock emails are on unless turned off", async () => {
    state.respond = () => ({ data: null, error: null });
    expect(await svc.getNotificationPrefs(U)).toEqual({ restock: true });
  });

  it("only stores known choices", async () => {
    state.respond = (t, calls) => (has(calls, "upsert")
      ? { data: { notification_prefs: calls.find((c) => c[0] === "upsert")[1].notification_prefs }, error: null }
      : { data: null, error: null });
    expect(await svc.updateNotificationPrefs(U, { restock: false, spam: true })).toEqual({ restock: false });
  });

  it("a shared list shows the first name and the tees, nothing else", async () => {
    state.respond = (t) => {
      if (t === "account_settings") return { data: { user_id: U }, error: null };
      if (t === "profiles") return { data: { full_name: "Vimal Kanna" }, error: null };
      if (t === "users") return { data: { name: "Vimal Kanna" }, error: null };
      if (t === "wishlist_items") return { data: [
        { products: { id: P, name: "Quiet Mind", slug: "quiet-mind", price: "599", image: "a.jpg", images: [], colors: ["Black"], is_active: true } },
        { products: { id: "x", name: "Retired", is_active: false } },
      ], error: null };
      return { data: null, error: null };
    };
    const list = await svc.getSharedWishlist("abcdefghijklmnop");
    expect(list.owner).toBe("Vimal");
    expect(list.items).toEqual([{ id: P, name: "Quiet Mind", slug: "quiet-mind", price: 599, image: "a.jpg", images: [], colors: ["Black"] }]);
    expect(JSON.stringify(list)).not.toContain("Kanna");
  });

  it("a switched-off link is simply not found", async () => {
    state.respond = () => ({ data: null, error: null });
    await expect(svc.getSharedWishlist("abcdefghijklmnop")).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.getSharedWishlist("../etc")).rejects.toMatchObject({ statusCode: 404 });
  });
});
