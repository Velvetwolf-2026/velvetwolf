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

const sendPurchaseToMeta = vi.fn().mockResolvedValue({ success: true });
vi.mock("../services/meta-capi.service.js", () => ({ sendPurchaseToMeta }));

const createPaymentOrder = vi.fn();
const verifyPayment = vi.fn();
vi.mock("../services/cashfree.js", () => ({ createPaymentOrder, verifyPayment, getCashfreeCheckoutMode: () => "sandbox" }));

const { initiateCheckout, verifyCheckout, validateCoupon } = await import("../services/checkout.service.js");

function resetSupabaseMock(responseQueues) {
  calls.length = 0;
  const fresh = createSupabaseMock(responseQueues, calls);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
  supabaseAdmin.rpc.mockImplementation(fresh.supabaseAdmin.rpc);
}

const VARIANT = { id: "variant-1", stock_qty: 10, size: "M", color: "Black" };
const CART_ITEM = { id: "11111111-1111-1111-1111-111111111111", name: "Mind Palace Tee", size: "M", color: "Black", price: 1299, qty: 1 };
const DB_PRODUCT = { data: { price: 1299 }, error: null };

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
        initiateCheckout({ cart: [CART_ITEM], address: {}, total_amount: 1299, subtotal: 1299, payment_method: "card" })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it.each(["cod", "COD"])("rejects Cash on Delivery (%s) for new orders before creating anything", async (method) => {
      resetSupabaseMock({});
      await expect(
        initiateCheckout({ cart: [CART_ITEM], address: { email: "a@b.com" }, payment_method: method })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Cash on delivery is no longer available/) });
      expect(calls.length).toBe(0);
      expect(createPaymentOrder).not.toHaveBeenCalled();
    });

    // Paid orders are confirmed through verifyCheckout (return page or webhook):
    // that decrements stock, emails and pushes to Shiprocket.
    describe("stock decrement on confirmation", () => {
      const confirmPaid = async (rpcResult) => {
        resetSupabaseMock({
          orders: [
            { data: [{ id: "order-1" }], error: null }, // pending -> confirmed claimed
            { data: { id: "order-1", user_id: null, shipping_address: { email: "a@b.com", name: "Alex Guest" } }, error: null },
          ],
          order_items: [{ data: [{ product_id: CART_ITEM.id, product_name: "Tee", size: "M", color: "Black", quantity: 1, products: {} }], error: null }],
          product_variants: [{ data: [VARIANT], error: null }],
        });
        supabaseAdmin.rpc.mockImplementation((fn) =>
          Promise.resolve(fn === "decrement_variant_stock" ? rpcResult : { data: null, error: null }));
        verifyPayment.mockResolvedValueOnce([{ payment_status: "SUCCESS" }]);
        await verifyCheckout("order-1");
      };

      it("takes stock atomically, emails and pushes to Shiprocket", async () => {
        await confirmPaid({ data: true, error: null });
        expect(supabaseAdmin.rpc).toHaveBeenCalledWith("decrement_variant_stock", { p_variant_id: VARIANT.id, p_qty: CART_ITEM.qty });
        expect(calls.some((c) => c.table === "product_variants" && c.method === "update")).toBe(false);
        expect(sendEmail).toHaveBeenCalledTimes(1);
        expect(createShiprocketOrder).toHaveBeenCalledWith("order-1");
      });

      it("flags the order in the audit log when stock ran out before confirmation (oversold)", async () => {
        await confirmPaid({ data: false, error: null });
        const audit = calls.find((c) => c.table === "audit_logs" && c.method === "insert");
        expect(audit.payload).toMatchObject({ action: "order.oversold", resource: "orders", resource_id: "order-1" });
        expect(sendEmail).toHaveBeenCalledTimes(1); // the paid order is still confirmed
      });

      it("falls back to the previous update when the migration hasn't run yet", async () => {
        await confirmPaid({ data: null, error: { code: "PGRST202", message: "function not found" } });
        const update = calls.find((c) => c.table === "product_variants" && c.method === "update");
        expect(update.payload.stock_qty).toBe(VARIANT.stock_qty - CART_ITEM.qty);
      });

      it("does not flag anything for a normal decrement", async () => {
        await confirmPaid({ data: true, error: null });
        expect(calls.some((c) => c.table === "audit_logs")).toBe(false);
      });
    });

    it("initiates a Cashfree payment session for online payment and leaves the order pending (no stock decrement yet)", async () => {
      resetSupabaseMock({
        product_variants: [{ data: [VARIANT], error: null }],
        products: [DB_PRODUCT],
        orders: [{ data: null, error: null }],
        order_items: [{ data: null, error: null }],
      });
      createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_123" });

      const result = await initiateCheckout({
        user_id: "user-1", cart: [CART_ITEM], address: { email: "a@b.com", phone: "9876543210" },
        total_amount: 1299, subtotal: 1299, shipping_amount: 0, tax_amount: 0, payment_method: "card",
      });

      expect(result).toMatchObject({ success: true, method: "card", paymentSessionId: "sess_123", cashfreeMode: "sandbox" });
      expect(sendEmail).not.toHaveBeenCalled();
      expect(createShiprocketOrder).not.toHaveBeenCalled();
      expect(calls.some((c) => c.table === "product_variants" && c.method === "update")).toBe(false);
    });

    it("wraps a Cashfree failure as a 500 ApiError and does not silently succeed", async () => {
      resetSupabaseMock({
        product_variants: [{ data: [VARIANT], error: null }],
        products: [DB_PRODUCT],
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

    describe("server-side pricing (tamper protection)", () => {
      const insertedOrder = () => calls.find((c) => c.table === "orders" && c.method === "insert").payload;

      it("charges the DB price and server-computed shipping/tax, ignoring client-sent amounts", async () => {
        resetSupabaseMock({
          product_variants: [{ data: [VARIANT], error: null }],
          products: [DB_PRODUCT],
          orders: [{ data: null, error: null }],
          order_items: [{ data: null, error: null }],
        });
        createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_1" });

        await initiateCheckout({
          cart: [{ ...CART_ITEM, price: 1 }], address: { email: "a@b.com" },
          total_amount: 1, subtotal: 1, shipping_amount: 0, tax_amount: 0, payment_method: "card",
        });

        // Standard delivery is free; round(1299 * 0.18) = 234 tax
        expect(insertedOrder()).toMatchObject({ subtotal: 1299, shipping_amount: 0, tax_amount: 234, total_amount: 1533, status: "pending" });
        expect(insertedOrder().meta).toMatchObject({ delivery: "standard" });
        expect(createPaymentOrder).toHaveBeenCalledWith(expect.objectContaining({ amount: 1533 }));
      });

      it("charges ₹149 for Express delivery and records the choice", async () => {
        resetSupabaseMock({
          product_variants: [{ data: [VARIANT], error: null }],
          products: [DB_PRODUCT],
          orders: [{ data: null, error: null }],
          order_items: [{ data: null, error: null }],
        });
        createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_1" });

        await initiateCheckout({ cart: [CART_ITEM], address: {}, payment_method: "upi", delivery: "express" });

        expect(insertedOrder()).toMatchObject({ subtotal: 1299, shipping_amount: 149, tax_amount: 234, total_amount: 1682 });
        expect(insertedOrder().meta).toMatchObject({ delivery: "express" });
      });

      it.each([undefined, "overnight", "", 0])("treats an unknown delivery value (%s) as free Standard", async (delivery) => {
        resetSupabaseMock({
          product_variants: [{ data: [VARIANT], error: null }],
          products: [DB_PRODUCT],
          orders: [{ data: null, error: null }],
          order_items: [{ data: null, error: null }],
        });
        createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_1" });

        await initiateCheckout({ cart: [CART_ITEM], address: {}, payment_method: "card", delivery, shipping_amount: 999 });

        expect(insertedOrder()).toMatchObject({ shipping_amount: 0, total_amount: 1533 });
      });

      it("keeps Standard delivery free on larger orders", async () => {
        resetSupabaseMock({
          product_variants: [{ data: [VARIANT], error: null }],
          products: [{ data: { price: 1999 }, error: null }],
          orders: [{ data: null, error: null }],
          order_items: [{ data: null, error: null }],
        });
        createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_1" });

        await initiateCheckout({ cart: [CART_ITEM], address: {}, payment_method: "card" });

        expect(insertedOrder()).toMatchObject({ subtotal: 1999, shipping_amount: 0, tax_amount: 360, total_amount: 2359 });
      });

      it("rejects a catalog item that no longer exists in the DB instead of using the client price", async () => {
        resetSupabaseMock({
          product_variants: [{ data: [VARIANT], error: null }],
          products: [{ data: null, error: null }],
        });

        await expect(
          initiateCheckout({ cart: [CART_ITEM], address: {}, payment_method: "card" })
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(calls.some((c) => c.table === "orders")).toBe(false);
      });

      it("rejects an unknown non-catalog, non-custom item", async () => {
        resetSupabaseMock({});
        await expect(
          initiateCheckout({ cart: [{ ...CART_ITEM, id: "free-stuff" }], address: {}, payment_method: "card" })
        ).rejects.toMatchObject({ statusCode: 400 });
      });

      it.each([0, -2, 1.5, "abc", 101])("rejects invalid quantity %s", async (qty) => {
        resetSupabaseMock({});
        await expect(
          initiateCheckout({ cart: [{ ...CART_ITEM, qty }], address: {}, payment_method: "card" })
        ).rejects.toMatchObject({ statusCode: 400 });
      });

      it("prices a custom tee from its chosen options, not the client price", async () => {
        resetSupabaseMock({
          orders: [{ data: null, error: null }],
          order_items: [{ data: null, error: null }],
        });
        createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_1" });

        await initiateCheckout({
          cart: [{ id: "custom-tee-123", name: "Custom Tee", isCustom: true, price: 1, qty: 2, size: "M", color: "#0a0a0a",
            customMeta: { fabric: "bamboo", isEmbroidery: true } }],
          address: {}, payment_method: "card",
        });

        // (1499 + 400 bamboo + 250 embroidery) * 2 = 4298
        expect(insertedOrder()).toMatchObject({ subtotal: 4298 });
      });

      describe("Studio tees", () => {
        const ART = "uploads/0b6f8b2e-6c1e-4d0b-9a4e-2f7d1c3b5a99.png";
        const PROOF = "proofs/7d3e2a10-1b2c-4d5e-8f90-a1b2c3d4e5f6.png";
        const studioItem = (sides, extra = {}) => ({
          id: "custom-studio-1", name: "Custom tee", isCustom: true, price: 1, qty: 1, size: "L", color: "Black",
          customMeta: { kind: "studio", color: "noir", ink: "bone", sides }, ...extra,
        });
        const fresh = () => {
          resetSupabaseMock({ orders: [{ data: null, error: null }], order_items: [{ data: null, error: null }] });
          createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_1" });
        };

        it("charges ₹2,290 for one printed side and keeps the design with the order", async () => {
          fresh();
          await initiateCheckout({
            cart: [studioItem({ front: { mode: "text", text: "Say less.", font: "display", proof: PROOF }, back: { mode: "text", text: "  " } })],
            address: {}, payment_method: "upi",
          });
          expect(insertedOrder()).toMatchObject({ subtotal: 2290 });
          const [d] = insertedOrder().meta.custom_designs;
          expect(d).toMatchObject({ line: 0, size: "L", quantity: 1, design: { kind: "studio", color: "noir", ink: "bone" } });
          expect(d.design.sides.front).toMatchObject({ mode: "text", text: "Say less.", proof: PROOF });
          expect(d.design.sides.back).toBeUndefined(); // an empty side isn't printed or charged
        });

        it("adds ₹300 when both sides are printed, whatever the client says", async () => {
          fresh();
          await initiateCheckout({
            cart: [studioItem({ front: { mode: "image", artwork: ART, artworkName: "wolf.png" }, back: { mode: "mark", mark: "monogram" } }, { price: 1, qty: 2 })],
            address: {}, payment_method: "card",
          });
          expect(insertedOrder()).toMatchObject({ subtotal: (2290 + 300) * 2 });
          expect(insertedOrder().meta.custom_designs[0].design.sides.front).toMatchObject({ mode: "image", artwork: ART });
        });

        it("refuses a design with no artwork on either side", async () => {
          resetSupabaseMock({});
          await expect(initiateCheckout({ cart: [studioItem({ front: { mode: "text", text: "" } })], address: {}, payment_method: "upi" }))
            .rejects.toMatchObject({ statusCode: 400 });
        });

        it("refuses artwork paths outside the studio upload folder", async () => {
          resetSupabaseMock({});
          await expect(initiateCheckout({ cart: [studioItem({ front: { mode: "image", artwork: "../products/secret.png" } })], address: {}, payment_method: "upi" }))
            .rejects.toMatchObject({ statusCode: 400 });
          expect(calls.some((c) => c.method === "insert")).toBe(false);
        });

        it("drops unknown proof paths and clamps placement values", async () => {
          fresh();
          await initiateCheckout({
            cart: [studioItem({ front: { mode: "text", text: "Hi", proof: "proofs/../x.png", scale: 9, offset: -9 } })],
            address: {}, payment_method: "upi",
          });
          expect(insertedOrder().meta.custom_designs[0].design.sides.front).toMatchObject({ proof: null, scale: 1.5, offset: -1 });
        });
      });

      it("limits Cashfree to the chosen payment method, and shows all methods otherwise", async () => {
        resetSupabaseMock({ product_variants: [{ data: [VARIANT], error: null }], products: [DB_PRODUCT], orders: [{ data: null, error: null }], order_items: [{ data: null, error: null }] });
        createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_1" });
        await initiateCheckout({ cart: [CART_ITEM], address: {}, payment_method: "upi", pay_with: "upi" });
        expect(createPaymentOrder).toHaveBeenLastCalledWith(expect.objectContaining({ paymentMethods: "upi" }));
        expect(insertedOrder().meta).toMatchObject({ pay_with: "upi" });

        resetSupabaseMock({ product_variants: [{ data: [VARIANT], error: null }], products: [DB_PRODUCT], orders: [{ data: null, error: null }], order_items: [{ data: null, error: null }] });
        createPaymentOrder.mockResolvedValueOnce({ payment_session_id: "sess_2" });
        await initiateCheckout({ cart: [CART_ITEM], address: {}, payment_method: "card", pay_with: "bitcoin" });
        expect(createPaymentOrder).toHaveBeenLastCalledWith(expect.objectContaining({ paymentMethods: undefined }));
      });

      it("rejects a custom tee with no options and a price the customiser can't produce", async () => {
        resetSupabaseMock({});
        await expect(
          initiateCheckout({ cart: [{ id: "custom-tee-123", name: "Custom Tee", isCustom: true, price: 10, qty: 1 }], address: {}, payment_method: "card" })
        ).rejects.toMatchObject({ statusCode: 400 });
      });
    });
  });

  describe("verifyCheckout (payment confirmation -> order status transition)", () => {
    it("confirms a pending order when Cashfree reports a successful payment, without leaking order details", async () => {
      resetSupabaseMock({
        orders: [
          { data: [{ id: "order-1" }], error: null }, // conditional update claimed the row
          { data: { id: "order-1", payment_method: "card", shipping_address: { email: "a@b.com", name: "Alex Guest" } }, error: null }, // confirmOrder's select
        ],
        order_items: [{ data: [], error: null }],
      });
      verifyPayment.mockResolvedValueOnce([{ payment_status: "SUCCESS" }]);

      const result = await verifyCheckout("order-1");

      expect(result).toEqual({ success: true, status: "SUCCESS", orderId: "order-1" });
      const orderUpdate = calls.find((c) => c.table === "orders" && c.method === "update");
      expect(orderUpdate.payload).toMatchObject({ status: "confirmed" });
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(createShiprocketOrder).toHaveBeenCalledTimes(1);
    });

    it("is idempotent: when the order was already claimed (confirmed / concurrent request), it does not re-run confirmation", async () => {
      resetSupabaseMock({
        orders: [{ data: [], error: null }], // conditional update matched no pending row
      });
      verifyPayment.mockResolvedValueOnce([{ payment_status: "SUCCESS" }]);

      const result = await verifyCheckout("order-1");

      expect(result).toMatchObject({ success: true, status: "SUCCESS" });
      expect(calls.some((c) => c.table === "product_variants")).toBe(false);
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
