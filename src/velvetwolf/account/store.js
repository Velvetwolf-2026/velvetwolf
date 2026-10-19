// What the account page and the alerts bell in the header both need: the signed-in person's
// orders, their restock alerts, their membership and which optional features the backend has.
// Loaded once per session and shared, so moving between the account tabs (or opening the bell)
// doesn't fetch everything again.
import { useSyncExternalStore } from "react";
import { request, optional } from "./api";

const EMPTY = {
  userId: null,
  orders: null, ordersError: "",
  alerts: null, // restock alerts; null until loaded, [] when the feature is off
  membership: null,
  prefs: null, // notification choices; null when the feature is off
  features: { restock: false, fit: false, prefs: false, share: false },
  ready: false,
};

let state = EMPTY;
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const inflight = new Map();
const once = (key, fn) => {
  if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)));
  return inflight.get(key);
};

export function useAccountStore() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// a different person signed in (or out): forget the last one's data
export function resetAccount(userId = null) {
  if (state.userId === userId) return;
  inflight.clear();
  state = { ...EMPTY, userId };
  listeners.forEach((l) => l());
}

export function loadOrders(force = false) {
  if (!state.userId) return Promise.resolve();
  if (state.orders && !force) return Promise.resolve();
  return once("orders", async () => {
    try {
      const data = await request("/profile/orders");
      set({ orders: Array.isArray(data.orders) ? data.orders : [], ordersError: "" });
    } catch (err) {
      set({ ordersError: err.message, orders: state.orders });
    }
  });
}

// the optional features: one probe each, then their data
export function loadExtras(force = false) {
  if (!state.userId) return Promise.resolve();
  if (state.ready && !force) return Promise.resolve();
  return once("extras", async () => {
    const [prefs, alerts, membership] = await Promise.all([
      optional("/profile/notifications", (d) => d.prefs).catch(() => null),
      optional("/profile/restock-alerts", (d) => d.alerts || []).catch(() => null),
      optional("/profile/membership").catch(() => null),
    ]);
    // the fit and share features ship in the same migration as notification choices
    const on = prefs !== null;
    set({
      prefs, membership,
      alerts: alerts || [],
      features: { prefs: on, fit: on, share: on, restock: alerts !== null },
      ready: true,
    });
  });
}

export async function refreshAlerts() {
  const alerts = await optional("/profile/restock-alerts", (d) => d.alerts || []).catch(() => null);
  if (alerts) set({ alerts });
}

export function patchState(patch) { set(typeof patch === "function" ? patch(state) : patch); }

// ---------- order helpers ----------

export const STAGE_OF = {
  pending: 0, confirmed: 1, processing: 2, in_production: 2, quality_check: 3,
  dispatched: 4, shipped: 4, in_transit: 4, out_for_delivery: 5, delivered: 6,
};
export const stageOf = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "cancelled" || s === "canceled" || s === "failed") return -1;
  return STAGE_OF[s] ?? 0;
};
export const isActive = (o) => { const st = stageOf(o.status); return st >= 0 && st < 6 && String(o.status).toLowerCase() !== "pending"; };
export const isDelivered = (o) => stageOf(o.status) === 6;
export const orderRef = (o) => String(o.order_number || o.id || "").replace(/^#/, "").slice(0, 8).toUpperCase();

// ---------- the bell ----------

// What's worth telling someone, from real data only: a size they waited on is back, an order
// is on its way or out for delivery, a delivered tee hasn't had its fit rated.
export function alertsFor({ orders, alerts, features }) {
  const out = [];
  for (const a of alerts || []) {
    if (a.back && a.product) {
      out.push({ id: `restock:${a.id}:${a.size}`, kind: "restock", title: `${a.product.name} is back in ${a.size}`, text: "The size you were waiting for.", href: `/product/${a.product.slug || a.product.id}`, alert: a });
    }
  }
  for (const o of orders || []) {
    const st = stageOf(o.status);
    if (st === 5) out.push({ id: `order:${o.id}:5`, kind: "order", title: `Order #${orderRef(o)} is out for delivery`, text: "The courier has it on today's route.", tab: "orders", order: o });
    else if (st === 4) out.push({ id: `order:${o.id}:4`, kind: "order", title: `Order #${orderRef(o)} is on its way`, text: "It's with the courier.", tab: "orders", order: o });
    else if (st === 6 && features?.fit && (o.order_items || []).some((i) => !i.fit_feedback && i.product_id)) {
      out.push({ id: `fit:${o.id}`, kind: "fit", title: "How's the fit?", text: `Tell us about order #${orderRef(o)}. It tunes your size.`, tab: "orders", order: o });
    }
  }
  return out;
}

const seenKey = (userId) => `vw_alerts_seen_${userId}`;
export function readSeen(userId) {
  try { return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || "[]")); } catch { return new Set(); }
}
export function markSeen(userId, ids) {
  try { localStorage.setItem(seenKey(userId), JSON.stringify([...new Set([...readSeen(userId), ...ids])].slice(-200))); } catch { /* storage unavailable */ }
}
