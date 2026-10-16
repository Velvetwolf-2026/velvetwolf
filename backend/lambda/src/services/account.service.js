// The account page ("The Den"): membership number, fit feedback on delivered tees, restock
// alerts for a size, notification choices, and a shareable link to the saved list.
//
// Every feature here needs the "ACCOUNT (THE DEN)" migration in schema.sql. Until it has run,
// each call answers 503 with { unavailable: true } (and the membership number falls back to a
// count), so deploying this code before the migration never breaks the rest of the account.
import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { sendEmail } from "../config/smtp.js";
import { ApiError, logError, logInfo, logWarn } from "../utils/http.js";

const ctx = (c = {}) => ({ service: "account", ...c });

// Postgres undefined_table / undefined_column, and PostgREST's "not in the schema cache"
const MISSING = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);
const isMissing = (error) => Boolean(error && MISSING.has(error.code));

export class FeatureUnavailable extends ApiError {
  constructor() {
    super(503, "This part of your account isn't switched on yet.");
    this.unavailable = true;
  }
}
const unavailable = () => new FeatureUnavailable();

const FITS = ["tight", "right", "roomy"];
const SIZES = ["S", "M", "L", "XL", "XXL"];
const MAX_ALERTS = 20;
export const DEFAULT_PREFS = { restock: true };

// ---------- membership ----------

// Member number and the month they joined. The number is stored once (users.member_no, filled
// in join order by the migration); before that it's counted, which can shift if accounts are
// deleted, so the stored one is preferred.
export async function getMembership(userId) {
  const { data: user, error } = await supabaseAdmin.from("users").select("id, created_at").eq("id", userId).maybeSingle();
  if (error || !user) {
    logError("Membership lookup failed", ctx({ userId, error }));
    throw new ApiError(error ? 500 : 404, "Couldn't load your membership.");
  }
  let memberNo = null;
  const stored = await supabaseAdmin.from("users").select("member_no").eq("id", userId).maybeSingle();
  if (!stored.error && stored.data?.member_no) memberNo = Number(stored.data.member_no);
  if (!memberNo) {
    const { count, error: countError } = await supabaseAdmin
      .from("users").select("id", { count: "exact", head: true }).lte("created_at", user.created_at);
    if (!countError && count) memberNo = count;
  }
  return { memberNo, memberSince: user.created_at };
}

// ---------- fit feedback ----------

// "How's the fit?" on a delivered tee: tight, right or roomy. Feeds the Fit tab.
export async function setFitFeedback(userId, orderId, itemId, fit) {
  if (!FITS.includes(fit)) throw new ApiError(400, "Choose tight, right or roomy.");
  const { data: order, error } = await supabaseAdmin
    .from("orders").select("id, user_id, status").eq("id", orderId).maybeSingle();
  if (error) { logError("Order lookup for fit failed", ctx({ userId, orderId, error })); throw new ApiError(500, "Couldn't save that."); }
  if (!order || order.user_id !== userId) throw new ApiError(404, "Order not found.");
  if (String(order.status).toLowerCase() !== "delivered") throw new ApiError(409, "You can tell us about the fit once it's delivered.");

  const { data, error: upError } = await supabaseAdmin
    .from("order_items").update({ fit_feedback: fit }).eq("id", itemId).eq("order_id", orderId).select("id, fit_feedback").maybeSingle();
  if (isMissing(upError)) throw unavailable();
  if (upError) { logError("Fit feedback save failed", ctx({ userId, orderId, itemId, error: upError })); throw new ApiError(500, "Couldn't save that."); }
  if (!data) throw new ApiError(404, "That tee isn't in this order.");
  return { itemId: data.id, fit: data.fit_feedback };
}

// ---------- stock per size (for the saved list) ----------

// { [productId]: { [size]: units } }, summed across colours
export async function getStockBySize(productIds = []) {
  const ids = [...new Set(productIds.filter((id) => /^[0-9a-f-]{36}$/i.test(String(id))))].slice(0, 100);
  if (!ids.length) return {};
  const { data, error } = await supabaseAdmin.from("product_variants").select("product_id, size, stock_qty").in("product_id", ids);
  if (error) { logError("Stock lookup failed", ctx({ error })); throw new ApiError(500, "Couldn't check stock."); }
  const out = {};
  for (const v of data || []) {
    if (!v.size) continue;
    const row = (out[v.product_id] ||= {});
    row[v.size] = (row[v.size] || 0) + Math.max(0, Number(v.stock_qty) || 0);
  }
  return out;
}

// ---------- restock alerts ----------

function alertRow(a, stock) {
  const units = stock?.[a.product_id]?.[a.size] ?? 0;
  return {
    id: a.id, productId: a.product_id, size: a.size, createdAt: a.created_at, notifiedAt: a.notified_at,
    back: units > 0,
    product: a.products ? { id: a.products.id, name: a.products.name, slug: a.products.slug, price: Number(a.products.price), image: a.products.image, images: a.products.images || [] } : null,
  };
}

export async function listRestockAlerts(userId) {
  const { data, error } = await supabaseAdmin
    .from("restock_alerts").select("id, product_id, size, created_at, notified_at, products(id, name, slug, price, image, images)")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (isMissing(error)) throw unavailable();
  if (error) { logError("Restock alerts lookup failed", ctx({ userId, error })); throw new ApiError(500, "Couldn't load your alerts."); }
  const stock = await getStockBySize((data || []).map((a) => a.product_id));
  return (data || []).map((a) => alertRow(a, stock));
}

export async function createRestockAlert(userId, { productId, size }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(productId || ""))) throw new ApiError(400, "Pick a tee.");
  if (!SIZES.includes(size)) throw new ApiError(400, "Pick a size from S to XXL.");
  const { count, error: countError } = await supabaseAdmin
    .from("restock_alerts").select("id", { count: "exact", head: true }).eq("user_id", userId).is("notified_at", null);
  if (isMissing(countError)) throw unavailable();
  if ((count || 0) >= MAX_ALERTS) throw new ApiError(429, `You can wait on ${MAX_ALERTS} sizes at once. Remove one first.`);

  // asking again for the same size re-arms it
  const { data, error } = await supabaseAdmin
    .from("restock_alerts")
    .upsert({ user_id: userId, product_id: productId, size, notified_at: null }, { onConflict: "user_id,product_id,size" })
    .select("id, product_id, size, created_at, notified_at, products(id, name, slug, price, image, images)").single();
  if (isMissing(error)) throw unavailable();
  if (error) { logError("Restock alert save failed", ctx({ userId, productId, size, error })); throw new ApiError(500, "Couldn't set that alert."); }
  const stock = await getStockBySize([productId]);
  return alertRow(data, stock);
}

export async function deleteRestockAlert(userId, alertId) {
  const { error } = await supabaseAdmin.from("restock_alerts").delete().eq("id", alertId).eq("user_id", userId);
  if (isMissing(error)) throw unavailable();
  if (error) { logError("Restock alert delete failed", ctx({ userId, alertId, error })); throw new ApiError(500, "Couldn't remove that alert."); }
  return { success: true };
}

function restockEmail({ name, size, url }) {
  const safe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return {
    subject: `${name} is back in ${size}`,
    text: `${name} is back in size ${size}.\n\n${url}\n\nYou asked us to tell you. This was a one-off email; we won't send another for this size unless you ask again.\n\nVelvetWolf`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#0A0A0B;color:#E8E4DA;padding:32px">
<p style="letter-spacing:.22em;font-size:11px;text-transform:uppercase;color:#C9B99B;margin:0 0 16px">Back in your size</p>
<h1 style="font-weight:400;font-size:24px;margin:0 0 12px">${safe(name)} is back in ${safe(size)}.</h1>
<p style="margin:0 0 24px;color:rgba(232,228,218,.7)">You asked us to tell you. This is a one-off email; we won't send another for this size unless you ask again.</p>
<a href="${safe(url)}" style="display:inline-block;background:#E8E4DA;color:#141416;padding:14px 22px;text-decoration:none;letter-spacing:.18em;font-size:12px;text-transform:uppercase">See the tee</a>
<p style="margin:32px 0 0;font-size:12px;color:rgba(232,228,218,.46)">VelvetWolf · velvetwolf.in</p></div>`,
  };
}

// Called after an admin changes a variant's stock. Emails everyone waiting on that size (once),
// unless they turned restock emails off. Never throws: stock updates must not fail because of it.
export async function notifyRestock(productId, size) {
  try {
    if (!SIZES.includes(size)) return { sent: 0 };
    const stock = await getStockBySize([productId]);
    if (!(stock[productId]?.[size] > 0)) return { sent: 0 };
    const { data: alerts, error } = await supabaseAdmin
      .from("restock_alerts").select("id, user_id, users(email), products(name, slug)")
      .eq("product_id", productId).eq("size", size).is("notified_at", null).limit(500);
    if (error) { if (!isMissing(error)) logWarn("Restock alert lookup failed", ctx({ productId, size, error })); return { sent: 0 }; }
    if (!alerts?.length) return { sent: 0 };

    const userIds = alerts.map((a) => a.user_id);
    const { data: settings } = await supabaseAdmin.from("account_settings").select("user_id, notification_prefs").in("user_id", userIds);
    const optedOut = new Set((settings || []).filter((s) => s.notification_prefs?.restock === false).map((s) => s.user_id));

    const site = (process.env.SITE_URL || "https://www.velvetwolf.in").replace(/\/+$/, "");
    let sent = 0;
    for (const a of alerts) {
      const email = a.users?.email;
      const done = async () => supabaseAdmin.from("restock_alerts").update({ notified_at: new Date().toISOString() }).eq("id", a.id);
      if (!email || email.endsWith("@mobile.velvetwolf.in") || optedOut.has(a.user_id)) { await done(); continue; }
      const name = a.products?.name || "Your tee";
      const url = a.products?.slug ? `${site}/product/${a.products.slug}` : `${site}/shop`;
      try {
        await sendEmail({ to: email, ...restockEmail({ name, size, url }) });
        await done();
        sent++;
      } catch (err) {
        logWarn("Restock email failed", ctx({ alertId: a.id, error: err?.message }));
      }
    }
    logInfo("Restock alerts sent", ctx({ productId, size, sent }));
    return { sent };
  } catch (err) {
    logWarn("Restock notify failed", ctx({ productId, size, error: err?.message }));
    return { sent: 0 };
  }
}

// ---------- notification choices + saved-list sharing (account_settings) ----------

async function readSettings(userId) {
  const { data, error } = await supabaseAdmin
    .from("account_settings").select("notification_prefs, wishlist_share_token").eq("user_id", userId).maybeSingle();
  if (isMissing(error)) throw unavailable();
  if (error) { logError("Account settings lookup failed", ctx({ userId, error })); throw new ApiError(500, "Couldn't load your settings."); }
  return data || { notification_prefs: {}, wishlist_share_token: null };
}

async function writeSettings(userId, patch) {
  const { data, error } = await supabaseAdmin
    .from("account_settings").upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("notification_prefs, wishlist_share_token").single();
  if (isMissing(error)) throw unavailable();
  if (error) { logError("Account settings save failed", ctx({ userId, error })); throw new ApiError(500, "Couldn't save your settings."); }
  return data;
}

export async function getNotificationPrefs(userId) {
  const s = await readSettings(userId);
  return { ...DEFAULT_PREFS, ...(s.notification_prefs || {}) };
}

export async function updateNotificationPrefs(userId, prefs = {}) {
  const current = await getNotificationPrefs(userId);
  const next = { ...current };
  for (const key of Object.keys(DEFAULT_PREFS)) if (typeof prefs[key] === "boolean") next[key] = prefs[key];
  const s = await writeSettings(userId, { notification_prefs: next });
  return { ...DEFAULT_PREFS, ...(s.notification_prefs || {}) };
}

export async function getShare(userId) {
  const s = await readSettings(userId);
  return { token: s.wishlist_share_token || null };
}

// on: a new link (any old one stops working); off: no link
export async function setShare(userId, enabled) {
  const token = enabled ? crypto.randomBytes(16).toString("base64url") : null;
  const s = await writeSettings(userId, { wishlist_share_token: token });
  return { token: s.wishlist_share_token || null };
}

// Public: the saved list behind a share link. Only the first name and the tees; nothing else.
export async function getSharedWishlist(token) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(token || ""))) throw new ApiError(404, "This list isn't shared any more.");
  const { data: s, error } = await supabaseAdmin
    .from("account_settings").select("user_id").eq("wishlist_share_token", token).maybeSingle();
  if (isMissing(error)) throw unavailable();
  if (error) { logError("Shared list lookup failed", ctx({ error })); throw new ApiError(500, "Couldn't open this list."); }
  if (!s) throw new ApiError(404, "This list isn't shared any more.");

  const [{ data: profile }, { data: user }, { data: items, error: itemsError }] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name").eq("id", s.user_id).maybeSingle(),
    supabaseAdmin.from("users").select("name").eq("id", s.user_id).maybeSingle(),
    supabaseAdmin.from("wishlist_items").select("products(id, name, slug, price, image, images, colors, is_active)").eq("user_id", s.user_id),
  ]);
  if (itemsError) { logError("Shared list items failed", ctx({ error: itemsError })); throw new ApiError(500, "Couldn't open this list."); }
  const first = String(profile?.full_name || user?.name || "").trim().split(/\s+/)[0];
  return {
    owner: first && !/^mobile$/i.test(first) && !/^\d+$/.test(first) ? first : null,
    items: (items || []).map((i) => i.products).filter((p) => p && p.is_active !== false)
      .map((p) => ({ id: p.id, name: p.name, slug: p.slug, price: Number(p.price), image: p.image, images: p.images || [], colors: p.colors || [] })),
  };
}
