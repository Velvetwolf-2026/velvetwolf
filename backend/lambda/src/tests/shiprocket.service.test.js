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

    const ID = "0b6f8b2e-6c1e-4d0b-9a4e-2f7d1c3b5a99";
    const old = new Date(Date.now() - 5 * 864e5).toISOString(); // placed 5 days ago

    it("follows the order's real status, not its age (no made-up 'Delivered')", async () => {
      resetSupabaseMock({ orders: [{ data: { ...ORDER, id: ID, status: "confirmed", created_at: old, awb_number: "SRM123456789" }, error: null }] });
      const result = await getShipmentTracking(ID);
      expect(result).toMatchObject({ success: true, stage: 1, status: "PAYMENT CONFIRMED", awb_number: null });
      expect(result.steps.map((s) => s.done)).toEqual([true, true, false, false, false, false, false]);
    });

    it.each([["pending", 0], ["in_production", 2], ["dispatched", 4], ["delivered", 6]])("maps status %s to stage %i", async (status, stage) => {
      resetSupabaseMock({ orders: [{ data: { ...ORDER, id: ID, status, awb_number: null }, error: null }] });
      await expect(getShipmentTracking(ID)).resolves.toMatchObject({ stage });
    });

    it("shows a cancelled order as cancelled", async () => {
      resetSupabaseMock({ orders: [{ data: { ...ORDER, id: ID, status: "cancelled", awb_number: null }, error: null }] });
      await expect(getShipmentTracking(ID)).resolves.toMatchObject({ stage: -1, status: "CANCELLED" });
    });

    it("checks the email when one is given, and never returns the address", async () => {
      const row = { ...ORDER, id: ID, status: "confirmed", awb_number: null, shipping_address: { email: "Asha@Example.com", phone: "9876543210", address: "1 Road" } };
      resetSupabaseMock({ orders: [{ data: row, error: null }] });
      await expect(getShipmentTracking(ID, "someone@else.com")).rejects.toMatchObject({ statusCode: 404 });
      resetSupabaseMock({ orders: [{ data: row, error: null }] });
      const ok = await getShipmentTracking(ID, " asha@example.com ");
      expect(ok.stage).toBe(1);
      expect(JSON.stringify(ok)).not.toMatch(/9876543210|1 Road/);
    });

    it("rejects a malformed order number without a database lookup", async () => {
      resetSupabaseMock({});
      await expect(getShipmentTracking("VW-27-ABC'")).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
