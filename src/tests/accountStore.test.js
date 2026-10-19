import { describe, it, expect } from "vitest";
import { alertsFor, stageOf, isActive, orderRef } from "../velvetwolf/account/store";

const P = { id: "p1", name: "Quiet Mind Oversized Tee", slug: "quiet-mind" };

describe("account: order stages", () => {
  it("reads the real status, the same seven stages as Track order", () => {
    expect(stageOf("pending")).toBe(0);
    expect(stageOf("confirmed")).toBe(1);
    expect(stageOf("in_production")).toBe(2);
    expect(stageOf("dispatched")).toBe(4);
    expect(stageOf("out_for_delivery")).toBe(5);
    expect(stageOf("delivered")).toBe(6);
    expect(stageOf("cancelled")).toBe(-1);
  });

  it("an order needs you while it's paid and not yet delivered", () => {
    expect(isActive({ status: "confirmed" })).toBe(true);
    expect(isActive({ status: "pending" })).toBe(false); // not paid
    expect(isActive({ status: "delivered" })).toBe(false);
    expect(isActive({ status: "cancelled" })).toBe(false);
  });

  it("short order reference", () => {
    expect(orderRef({ id: "abcdef12-3456" })).toBe("ABCDEF12");
    expect(orderRef({ order_number: "#vw-1001", id: "x" })).toBe("VW-1001");
  });
});

describe("account: the bell only says what's true", () => {
  it("a size someone waited on is back", () => {
    const a = alertsFor({ orders: [], alerts: [{ id: "a1", size: "L", back: true, product: P }, { id: "a2", size: "M", back: false, product: P }], features: {} });
    expect(a).toHaveLength(1);
    expect(a[0].title).toBe("Quiet Mind Oversized Tee is back in L");
    expect(a[0].href).toBe("/product/quiet-mind");
  });

  it("orders on their way and out for delivery; nothing for ones still being made", () => {
    const a = alertsFor({ orders: [{ id: "o1", status: "dispatched" }, { id: "o2", status: "out_for_delivery" }, { id: "o3", status: "in_production" }], alerts: [], features: {} });
    expect(a.map((x) => x.id)).toEqual(["order:o1:4", "order:o2:5"]);
  });

  it("asks about the fit on a delivered tee only when fit feedback is switched on", () => {
    const orders = [{ id: "o4", status: "delivered", order_items: [{ id: "i1", product_id: "p1", fit_feedback: null }] }];
    expect(alertsFor({ orders, alerts: [], features: { fit: false } })).toHaveLength(0);
    expect(alertsFor({ orders, alerts: [], features: { fit: true } })[0].kind).toBe("fit");
    const rated = [{ ...orders[0], order_items: [{ id: "i1", product_id: "p1", fit_feedback: "right" }] }];
    expect(alertsFor({ orders: rated, alerts: [], features: { fit: true } })).toHaveLength(0);
  });

  it("no data, no alerts (never sample ones)", () => {
    expect(alertsFor({ orders: null, alerts: null, features: {} })).toEqual([]);
  });
});
