import { describe, it, expect, vi, beforeEach } from "vitest";

const validateCouponEndpoint = vi.fn();
vi.mock("../services/checkout.service.js", () => ({ validateCouponEndpoint, initiateCheckout: vi.fn(), verifyCheckout: vi.fn() }));

const rpc = vi.fn();
vi.mock("../config/supabase.js", () => ({ supabaseAdmin: { from: vi.fn(), rpc } }));

const { validateCoupon } = await import("../controllers/checkout.controller.js");
const { ApiError } = await import("../utils/http.js");

const event = { headers: {}, requestContext: { identity: { sourceIp: "49.36.1.2" } } };
const gate = (blocked) => ({ data: [{ blocked, retry_after_seconds: blocked ? 600 : 0 }], error: null });

describe("coupon validation rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockImplementation((fn) => Promise.resolve(fn === "check_rate_limit_gate" ? gate(false) : { data: null, error: null }));
  });

  it("allows a valid coupon and does not count it as an attempt", async () => {
    validateCouponEndpoint.mockResolvedValueOnce({ success: true, code: "SAVE10" });
    const res = await validateCoupon({ code: "SAVE10", subtotal: 1000 }, event);

    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith("check_rate_limit_gate", expect.objectContaining({ p_key: "coupon:49.36.1.2", p_max: 20 }));
    expect(rpc).not.toHaveBeenCalledWith("record_rate_attempt", expect.anything());
  });

  it("counts a wrong code against the visitor's IP", async () => {
    validateCouponEndpoint.mockRejectedValueOnce(new ApiError(404, "Invalid coupon code"));
    await expect(validateCoupon({ code: "GUESS1", subtotal: 1000 }, event)).rejects.toMatchObject({ statusCode: 404 });
    expect(rpc).toHaveBeenCalledWith("record_rate_attempt", { p_key: "coupon:49.36.1.2" });
  });

  it("blocks with 429 once the limit is reached, without checking the code", async () => {
    rpc.mockImplementation((fn) => Promise.resolve(fn === "check_rate_limit_gate" ? gate(true) : { data: null, error: null }));
    await expect(validateCoupon({ code: "GUESS2", subtotal: 1000 }, event)).rejects.toMatchObject({ statusCode: 429 });
    expect(validateCouponEndpoint).not.toHaveBeenCalled();
  });

  it("fails open if the rate-limit store is down, so checkout keeps working", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "connection failure" } });
    validateCouponEndpoint.mockResolvedValueOnce({ success: true, code: "SAVE10" });
    const res = await validateCoupon({ code: "SAVE10", subtotal: 1000 }, event);
    expect(res.statusCode).toBe(200);
  });
});
