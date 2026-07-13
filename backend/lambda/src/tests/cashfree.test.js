import { describe, it, expect, vi, beforeEach } from "vitest";

const PGCreateOrder = vi.fn();
const PGOrderFetchPayments = vi.fn();

vi.mock("cashfree-pg", () => ({
  CFEnvironment: { SANDBOX: "SANDBOX", PRODUCTION: "PRODUCTION" },
  // Must be a real function (not an arrow) — cashfree.js instantiates this
  // with `new`, and arrow functions can't be used as constructors.
  Cashfree: vi.fn().mockImplementation(function () {
    return { PGCreateOrder, PGOrderFetchPayments };
  }),
}));

const { createPaymentOrder, verifyPayment } = await import("../services/cashfree.js");

describe("cashfree service (thin wrapper around the Cashfree PG SDK)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPaymentOrder", () => {
    it("builds the PG order request from the given order data and returns the SDK's response body", async () => {
      PGCreateOrder.mockResolvedValueOnce({ data: { payment_session_id: "sess_123", order_id: "order-1" } });

      const result = await createPaymentOrder({
        orderId: "order-1", amount: 1299, customerId: "cust-1",
        customerPhone: "9876543210", customerEmail: "a@b.com", customerName: "Alex",
      });

      expect(result).toEqual({ payment_session_id: "sess_123", order_id: "order-1" });
      expect(PGCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: "order-1",
          order_amount: 1299,
          order_currency: "INR",
          customer_details: expect.objectContaining({
            customer_id: "cust-1",
            customer_phone: "9876543210",
            customer_email: "a@b.com",
            customer_name: "Alex",
          }),
        })
      );
    });

    it("wraps an SDK failure in a plain Error carrying Cashfree's error message", async () => {
      PGCreateOrder.mockRejectedValueOnce({ response: { data: { message: "Invalid customer phone" } } });

      await expect(
        createPaymentOrder({ orderId: "order-1", amount: 1299, customerId: "cust-1", customerPhone: "bad", customerEmail: "a@b.com", customerName: "Alex" })
      ).rejects.toThrow("Invalid customer phone");
    });
  });

  describe("verifyPayment", () => {
    it("returns the list of payment records for an order", async () => {
      PGOrderFetchPayments.mockResolvedValueOnce({ data: [{ payment_status: "SUCCESS" }] });

      const result = await verifyPayment("order-1");

      expect(result).toEqual([{ payment_status: "SUCCESS" }]);
      expect(PGOrderFetchPayments).toHaveBeenCalledWith("order-1");
    });

    it("wraps an SDK failure in a plain Error carrying Cashfree's error message", async () => {
      PGOrderFetchPayments.mockRejectedValueOnce({ response: { data: { message: "Order not found" } } });

      await expect(verifyPayment("missing-order")).rejects.toThrow("Order not found");
    });
  });
});
