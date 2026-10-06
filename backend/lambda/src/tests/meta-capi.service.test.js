import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { sendPurchaseToMeta } from "../services/meta-capi.service.js";

describe("sendPurchaseToMeta", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      META_PIXEL_ID: "1234567890",
      META_CAPI_TOKEN: "mock_capi_token",
      META_GRAPH_VERSION: "v20.0",
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events_received: 1 }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("skips execution gracefully if META_PIXEL_ID or META_CAPI_TOKEN is missing", async () => {
    delete process.env.META_PIXEL_ID;
    delete process.env.VITE_META_PIXEL_ID;

    await sendPurchaseToMeta({
      id: "order-123",
      total: 1999,
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("correctly hashes customer email and normalizes phone number with country code", async () => {
    const rawEmail = " Customer@VelvetWolf.in ";
    const rawPhone = "9876543210"; // 10 digit Indian number

    const expectedEmailHash = crypto
      .createHash("sha256")
      .update("customer@velvetwolf.in")
      .digest("hex");
    const expectedPhoneHash = crypto
      .createHash("sha256")
      .update("919876543210")
      .digest("hex");

    await sendPurchaseToMeta({
      id: "order-abc-123",
      paidAt: 1700000000000,
      email: rawEmail,
      phone: rawPhone,
      total: 2499,
      skus: ["sku-1", "sku-2"],
      meta: {
        ip: "103.21.244.2",
        ua: "Mozilla/5.0 TestBrowser",
        fbp: "fb.1.12345.6789",
        fbc: "fb.1.12345.abcdef",
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];

    expect(url).toBe("https://graph.facebook.com/v20.0/1234567890/events?access_token=mock_capi_token");
    expect(options.method).toBe("POST");

    const payload = JSON.parse(options.body);
    expect(payload.data).toHaveLength(1);

    const event = payload.data[0];
    expect(event.event_name).toBe("Purchase");
    expect(event.event_id).toBe("order-abc-123");
    expect(event.event_time).toBe(1700000000);
    expect(event.user_data.em).toEqual([expectedEmailHash]);
    expect(event.user_data.ph).toEqual([expectedPhoneHash]);
    expect(event.user_data.client_ip_address).toBe("103.21.244.2");
    expect(event.user_data.client_user_agent).toBe("Mozilla/5.0 TestBrowser");
    expect(event.user_data.fbp).toBe("fb.1.12345.6789");
    expect(event.user_data.fbc).toBe("fb.1.12345.abcdef");
    expect(event.custom_data.value).toBe(2499);
    expect(event.custom_data.currency).toBe("INR");
    expect(event.custom_data.content_ids).toEqual(["sku-1", "sku-2"]);
  });

  it("includes test_event_code when META_TEST_EVENT_CODE is configured", async () => {
    process.env.META_TEST_EVENT_CODE = "TEST9999";

    await sendPurchaseToMeta({
      id: "order-test",
      total: 999,
      skus: ["test-sku"],
    });

    const [, options] = global.fetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.test_event_code).toBe("TEST9999");
  });
});
