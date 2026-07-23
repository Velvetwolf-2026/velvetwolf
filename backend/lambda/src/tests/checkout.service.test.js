import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { supabaseAdmin, calls } = vi.hoisted(() => {
  // Placeholder — reset with real queues per-test via resetSupabaseMock().
  return { supabaseAdmin: { from: vi.fn(), rpc: vi.fn() }, calls: [] };
});

vi.mock("../config/supabase.js", () => ({ supabaseAdmin }));

const sendEmail = vi.fn().mockResolvedValue({ messageId: "mock" });
vi.mock("../config/smtp.js", () => ({ sendEmail }));

const createShiprocketOrder = vi.fn().mockResolvedValue({ success: true });
vi.mock("../services/shiprocket.service.js", () => ({ createShiprocketOrder }));

const createPaymentOrder = vi.fn();
const verifyPayment = vi.fn();
vi.mock("../services/cashfree.js", () => ({ createPaymentOrder, verifyPayment }));

const { initiateCheckout, verifyCheckout, validateCoupon } = await import("../services/checkout.service.js");

function resetSupabaseMock(responseQueues) {
  calls.length = 0;
  const fresh = createSupabaseMock(responseQueues, calls);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
  supabaseAdmin.rpc.mockImplementation(fresh.supabaseAdmin.rpc);
}

const VARIANT = { id: "variant-1", stock_qty: 10, size: "M", color: "Black" };
const CART_ITEM = { id: "11111111-1111-1111-1111-111111111111", name: "Mind Palace Tee", size: "M", color: "Black", price: 1299, qty: 1 };

describe("checkout.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateCoupon", () => {
    it("returns the coupon when valid and above the minimum order amount", async () => {
      resetSupabaseMock({
        coupons: [{ data: { code: "SAVE10", is_active: true, discount_type: "percentage", discount_value: 10, min_order_amount: 500 }, error: null }],
      });
      const coupon = await validateCoupon("save10", 1000);
      expect(coupon.code).toBe("SAVE10");
    });

    it("throws 404 when the coupon doesn't exist", async () => {
      resetSupabaseMock({ coupons: [{ data: null, error: null }] });
      await expect(validateCoupon("NOPE", 1000)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 400 when the coupon is inactive", async () => {
      resetSupabaseMock({ coupons: [{ data: { code: "OLD", is_active: false }, error: null }] });
      await expect(validateCoupon("OLD", 1000)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when the coupon has expired", async () => {
      resetSupabaseMock({
        coupons: [{ data: { code: "EXPIRED", is_active: true, expires_at: "2000-01-01", min_order_amount: 0 }, error: null }],
      });
      await expect(validateCoupon("EXPIRED", 1000)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when the subtotal is below the coupon's minimum order amount", async () => {
      resetSupabaseMock({
        coupons: [{ data: { code: "BIG", is_active: true, min_order_amount: 5000 }, error: null }],
      });
      await expect(validateCoupon("BIG", 1000)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe("initiateCheckout", () => {
    it("throws 400 when the cart is empty", async () => {
      await expect(initiateCheckout({ cart: [] })).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when stock is insufficient for an item", async () => {
      resetSupabaseMock({
        product_variants: [{ data: [{ ...VARIANT, stock_qty: 0 }], error: null }],
      });
      await expect(
        initiateCheckout({ cart: [CART_ITEM], address: {}, total_amount: 1299, subtotal: 1299, shipping_amount: 0, tax_amount: 0, payment_method: "cod" })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("confirms a COD order immediately: creates it, decrements stock, emails, and pushes to Shiprocket — without touching the payment gateway", async () => {
      const createdOrder = { id: "order-1", user_id: "user-1", payment_method: "cod", shipping_address: { email: "a@b.com", name: "Alex Guest" } };
      resetSupabaseMock({
        product_variants: [
          { data: [VARIANT], error: null }, // stock check in initiateCheckout
          { data: [VARIANT], error: null }, // stock decrement lookup in confirmOrder
        ],
        orders: [
          { data: null, error: null }, // insert
          { data: createdOrder, error: null }, // select in confirmOrder
        ],
        order_items: [
          { data: null, error: null }, // insert
          { data: [{ product_id: CART_ITEM.id, size: "M", color: "Black", quantity: 1, products: {} }], error: null }, // select in confirmOrder
        ],
        cart_items: [{ data: null, error: null }],
      });

      const result = await initiateCheckout({
        user_id: "user-1", cart: [CART_ITEM], address: { email: "a@b.com" },
        total_amount: 1299, subtotal: 1299, shipping_amount: 0, tax_amount: 0, payment_method: "cod",
      });

      expect(result).toMatchObject({ success: true, method: "cod" });
      expect(createPaymentOrder).not.toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(createShiprocketOrder).toHaveBeenCalledWith(expect.any(String));
      const variantUpdate = calls.find((c) => c.table === "product_variants" && c.method === "update");
      expect(variantUpdate.payload.stock_qty).toBe(VARIANT.stock_qty - CART_ITEM.qty);
    });

    it("initiates a Cashfree payment session for online payment and leaves the order pending (no stock decrement yet)", async () => {
      resetSupabaseMock({
        product_variants: [{ data: [VARIANT], error: null }],
        orders: [{ data: null, error: null }],
        order_items: [{ data: null, error: null }],
      });
      createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_123" });

      const result = await initiateCheckout({
        user_id: "user-1", cart: [CART_ITEM], address: { email: "a@b.com", phone: "9876543210" },
        total_amount: 1299, subtotal: 1299, shipping_amount: 0, tax_amount: 0, payment_method: "card",
      });

      expect(result).toMatchObject({ success: true, method: "card", paymentSessionId: "sess_123" });
      expect(sendEmail).not.toHaveBeenCalled();
      expect(createShiprocketOrder).not.toHaveBeenCalled();
      expect(calls.some((c) => c.table === "product_variants" && c.method === "update")).toBe(false);
    });

    it("wraps a Cashfree failure as a 500 ApiError and does not silently succeed", async () => {
      resetSupabaseMock({
        product_variants: [{ data: [VARIANT], error: null }],
        orders: [{ data: null, error: null }],
        order_items: [{ data: null, error: null }],
      });
      createPaymentOrder.mockRejectedValueOnce(new Error("gateway down"));

      await expect(
        initiateCheckout({
          cart: [CART_ITEM], address: { email: "a@b.com" },
          total_amount: 1299, subtotal: 1299, shipping_amount: 0, tax_amount: 0, payment_method: "card",
        })
      ).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe("verifyCheckout (payment confirmation -> order status transition)", () => {
    it("confirms a pending order when Cashfree reports a successful payment", async () => {
      const confirmedOrder = { id: "order-1", status: "confirmed" };
      resetSupabaseMock({
        orders: [
          { data: { status: "pending" }, error: null }, // status check
          { data: confirmedOrder, error: null }, // update -> select -> single
          { data: { id: "order-1", payment_method: "card", shipping_address: { email: "a@b.com", name: "Alex Guest" } }, error: null }, // confirmOrder's select
        ],
        order_items: [{ data: [], error: null }],
      });
      verifyPayment.mockResolvedValueOnce([{ payment_status: "SUCCESS" }]);

      const result = await verifyCheckout("order-1");

      expect(result).toMatchObject({ success: true, status: "SUCCESS" });
      const orderUpdate = calls.find((c) => c.table === "orders" && c.method === "update");
      expect(orderUpdate.payload).toMatchObject({ status: "confirmed" });
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(createShiprocketOrder).toHaveBeenCalledTimes(1);
    });

    it("is idempotent: does not re-confirm, double-decrement stock, or re-email an already-confirmed order", async () => {
      resetSupabaseMock({
        orders: [{ data: { status: "confirmed" }, error: null }],
      });
      verifyPayment.mockResolvedValueOnce([{ payment_status: "SUCCESS" }]);

      const result = await verifyCheckout("order-1");

      expect(result).toMatchObject({ success: true, status: "SUCCESS" });
      expect(calls.some((c) => c.table === "orders" && c.method === "update")).toBe(false);
      expect(sendEmail).not.toHaveBeenCalled();
      expect(createShiprocketOrder).not.toHaveBeenCalled();
    });

    it("leaves the order untouched when Cashfree reports no successful payment yet", async () => {
      resetSupabaseMock({});
      verifyPayment.mockResolvedValueOnce([{ payment_status: "PENDING" }]);

      const result = await verifyCheckout("order-1");

      expect(result).toMatchObject({ success: true, status: "PENDING_OR_FAILED" });
      expect(calls.length).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("wraps a Cashfree verification failure as a 500 ApiError", async () => {
      resetSupabaseMock({});
      verifyPayment.mockRejectedValueOnce(new Error("network error"));

      await expect(verifyCheckout("order-1")).rejects.toMatchObject({ statusCode: 500 });
    });
  });
});
