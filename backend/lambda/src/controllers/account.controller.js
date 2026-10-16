import * as accountService from "../services/account.service.js";
import { ApiError, jsonResponse } from "../utils/http.js";
import { requireAuth } from "../middleware/auth.js";

export async function getMembership(query, event) {
  const user = await requireAuth(event);
  return jsonResponse(200, await accountService.getMembership(user.id), {}, event);
}

export async function setFitFeedback(orderId, itemId, body, event) {
  const user = await requireAuth(event);
  return jsonResponse(200, await accountService.setFitFeedback(user.id, orderId, itemId, String(body?.fit || "").toLowerCase()), {}, event);
}

export async function getSavedStock(query, event) {
  await requireAuth(event);
  const ids = String(query?.ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  return jsonResponse(200, { stock: await accountService.getStockBySize(ids) }, {}, event);
}

export async function listRestockAlerts(query, event) {
  const user = await requireAuth(event);
  return jsonResponse(200, { alerts: await accountService.listRestockAlerts(user.id) }, {}, event);
}

export async function createRestockAlert(body, event) {
  const user = await requireAuth(event);
  const alert = await accountService.createRestockAlert(user.id, { productId: body?.productId, size: String(body?.size || "").toUpperCase() });
  return jsonResponse(201, { alert }, {}, event);
}

export async function deleteRestockAlert(alertId, event) {
  const user = await requireAuth(event);
  return jsonResponse(200, await accountService.deleteRestockAlert(user.id, alertId), {}, event);
}

export async function getNotificationPrefs(query, event) {
  const user = await requireAuth(event);
  return jsonResponse(200, { prefs: await accountService.getNotificationPrefs(user.id) }, {}, event);
}

export async function updateNotificationPrefs(body, event) {
  const user = await requireAuth(event);
  if (!body || typeof body !== "object") throw new ApiError(400, "Nothing to save.");
  return jsonResponse(200, { prefs: await accountService.updateNotificationPrefs(user.id, body) }, {}, event);
}

export async function getShare(query, event) {
  const user = await requireAuth(event);
  return jsonResponse(200, await accountService.getShare(user.id), {}, event);
}

export async function setShare(body, event) {
  const user = await requireAuth(event);
  return jsonResponse(200, await accountService.setShare(user.id, body?.enabled === true), {}, event);
}

// public: no sign-in
export async function getSharedWishlist(token, event) {
  return jsonResponse(200, await accountService.getSharedWishlist(token), { "Cache-Control": "no-store" }, event);
}
