import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { supabaseAdmin } = vi.hoisted(() => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin }));

const ORIGINAL_ENV = { ...process.env };

const ORDER = {
  id: "order-1",
  created_at: "2026-01-01T10:00:00.000Z",
  payment_method: "card",
  subtotal: 1299,
  shipping_address: { name: "Alex Guest", address: "221B Baker St", city: "Mumbai", pincode: "400001", state: "MH", email: "a@b.com", phone: "9876543210" },
};
const ITEMS = [
  { product_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", product_name: "Mind Palace Tee", size: "M", color: "Black", quantity: 1, unit_price: 1299 },
];

let createShiprocketOrder, getShipmentTracking, checkServiceability;

function resetSupabaseMock(responseQueues) {
  const fresh = createSupabaseMock(responseQueues);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
  return fresh;
}

beforeEach(async () => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.SHIPROCKET_EMAIL;
  delete process.env.SHIPROCKET_PASSWORD;
  // The module caches its Shiprocket auth token at module scope, so each test
  // needs a fresh module instance to avoid one test's token leaking into
  // another's "no credentials" / "auth failed" assertions.
  vi.resetModules();
  const mod = await import("../services/shiprocket.service.js");
  createShiprocketOrder = mod.createShiprocketOrder;
  getShipmentTracking = mod.getShipmentTracking;
  checkServiceability = mod.checkServiceability;
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllGlobals();
});

describe("shiprocket.service", () => {
  describe("createShiprocketOrder", () => {
    it("returns null when the order can't be found", async () => {
      resetSupabaseMock({ orders: [{ data: null, error: null }] });
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const result = await createShiprocketOrder("missing-order");

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("falls back to mock fulfillment when no Shiprocket credentials are configured", async () => {
      const { calls } = resetSupabaseMock({
        orders: [{ data: ORDER, error: null }],
        order_items: [{ data: ITEMS, error: null }],
      });
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const result = await createShiprocketOrder("order-1");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.shiprocket_order_id).toMatch(/^MOCK_ORD_\d+$/);
      expect(result.awb_number).toMatch(/^SRM\d+$/);
      const orderUpdate = calls.find((c) => c.table === "orders" && c.method === "update");
      expect(orderUpdate.payload.shipping_status).toBe("ORDER PLACED");
    });

    it("creates a real Shiprocket order and assigns an AWB when credentials are present", async () => {
      process.env.SHIPROCKET_EMAIL = "ops@velvetwolf.in";
      process.env.SHIPROCKET_PASSWORD = "fake-password";
      const { calls } = resetSupabaseMock({
        orders: [{ data: ORDER, error: null }],
        order_items: [{ data: ITEMS, error: null }],
      });

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ token: "tok-123" }) }) // auth
        .mockResolvedValueOnce({ ok: true, json: async () => ({ order_id: 555, shipment_id: 777 }) }) // create adhoc
        .mockResolvedValueOnce({ ok: true, json: async () => ({ response: { data: { awb_code: "AWBXYZ", courier_name: "Bluedart" } } }) }); // assign awb
      vi.stubGlobal("fetch", fetchMock);

      const result = await createShiprocketOrder("order-1");

      expect(result).toMatchObject({
        success: true,
        shiprocket_order_id: "555",
        shiprocket_shipment_id: "777",
        awb_number: "AWBXYZ",
        courier_name: "Bluedart",
        shipping_status: "ORDER PLACED",
      });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[0][0]).toContain("/auth/login");
      expect(fetchMock.mock.calls[1][0]).toContain("/orders/create/adhoc");
      expect(fetchMock.mock.calls[2][0]).toContain("/courier/assign/awb");
      const orderUpdate = calls.find((c) => c.table === "orders" && c.method === "update");
      expect(orderUpdate.payload).toMatchObject({ shiprocket_order_id: "555", awb_number: "AWBXYZ" });
    });

    it("falls back to mock fulfillment when Shiprocket auth fails, without attempting further API calls", async () => {
      process.env.SHIPROCKET_EMAIL = "ops@velvetwolf.in";
      process.env.SHIPROCKET_PASSWORD = "wrong-password";
      resetSupabaseMock({
        orders: [{ data: ORDER, error: null }],
        order_items: [{ data: ITEMS, error: null }],
      });

      const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Invalid credentials" }) });
      vi.stubGlobal("fetch", fetchMock);

      const result = await createShiprocketOrder("order-1");

      expect(result.shiprocket_order_id).toMatch(/^MOCK_ORD_\d+$/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("checkServiceability", () => {
    it("returns a mock-available response when no credentials are configured", async () => {
      const result = await checkServiceability("400001");
      expect(result).toMatchObject({ success: true, available: true });
    });

    it("returns the top courier's serviceability when Shiprocket has credentials and couriers are available", async () => {
      process.env.SHIPROCKET_EMAIL = "ops@velvetwolf.in";
      process.env.SHIPROCKET_PASSWORD = "fake-password";
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ token: "tok-123" }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 200, data: { available_courier_companies: [{ courier_name: "Delhivery", etd: "2-3 Days", cod: 1 }] } }),
        });
      vi.stubGlobal("fetch", fetchMock);

      const result = await checkServiceability("110001");

      expect(result).toMatchObject({ success: true, available: true, courier: "Delhivery", etd: "2-3 Days", cod_available: true });
    });

    it("reports unavailable when no couriers serve the pincode", async () => {
      process.env.SHIPROCKET_EMAIL = "ops@velvetwolf.in";
      process.env.SHIPROCKET_PASSWORD = "fake-password";
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ token: "tok-123" }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 200, data: { available_courier_companies: [] } }) });
      vi.stubGlobal("fetch", fetchMock);

      const result = await checkServiceability("999999");

      expect(result).toMatchObject({ success: false, available: false });
    });
  });

  describe("getShipmentTracking", () => {
    it("throws a 404 ApiError when the order doesn't exist", async () => {
      resetSupabaseMock({ orders: [{ data: null, error: null }] });
      await expect(getShipmentTracking("missing-order")).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns mock tracking steps for a mock AWB", async () => {
      resetSupabaseMock({ orders: [{ data: { ...ORDER, awb_number: "SRM123456789" }, error: null }] });
      const result = await getShipmentTracking("order-1");
      expect(result.success).toBe(true);
      expect(result.steps.length).toBeGreaterThan(0);
    });
  });
});
