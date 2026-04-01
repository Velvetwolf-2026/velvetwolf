import { supabaseAdmin } from "./config/supabase.js";
import { ApiError, logError, logInfo } from "./http.js";

function wishlistLogContext(context = {}) {
  return { service: "wishlist", ...context };
}

function normalizeUserId(userId) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new ApiError(400, "Wishlist user id is required.");
  }

  return normalizedUserId;
}

function normalizeProductId(productId) {
  const normalizedProductId = String(productId || "").trim();

  if (!normalizedProductId) {
    throw new ApiError(400, "Wishlist product id is required.");
  }

  return normalizedProductId;
}

function toWishlistApiError(error, fallbackMessage) {
  const message = error?.message || fallbackMessage;

  if (message.includes('invalid input syntax for type uuid: "')) {
    return new ApiError(
      500,
      "Wishlist schema mismatch: the database is expecting a UUID product id. Make sure the frontend sends the real products.id value from Supabase."
    );
  }

  return new ApiError(400, message || fallbackMessage);
}

export async function getWishlistByUserId(userId) {
  const normalizedUserId = normalizeUserId(userId);

  logInfo("Fetching wishlist by user id", wishlistLogContext({ userId: normalizedUserId }));

  const { data, error } = await supabaseAdmin
    .from("wishlist_items")
    .select("product_id, products(*)")
    .eq("user_id", normalizedUserId);

  if (error) {
    logError("Wishlist lookup failed", wishlistLogContext({ userId: normalizedUserId, error }));
    throw toWishlistApiError(error, "Failed to load wishlist.");
  }

  return (data || []).map((item) => item.products).filter(Boolean);
}

export async function toggleWishlistByUserId(userId, productId) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedProductId = normalizeProductId(productId);

  logInfo(
    "Toggling wishlist item",
    wishlistLogContext({ userId: normalizedUserId, productId: normalizedProductId })
  );

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("wishlist_items")
    .select("id")
    .eq("user_id", normalizedUserId)
    .eq("product_id", normalizedProductId)
    .maybeSingle();

  if (existingError) {
    logError(
      "Wishlist lookup before toggle failed",
      wishlistLogContext({ userId: normalizedUserId, productId: normalizedProductId, error: existingError })
    );
    throw toWishlistApiError(existingError, "Failed to check wishlist item.");
  }

  if (existing?.id) {
    const { error: deleteError } = await supabaseAdmin.from("wishlist_items").delete().eq("id", existing.id);

    if (deleteError) {
      logError(
        "Wishlist delete failed",
        wishlistLogContext({ userId: normalizedUserId, productId: normalizedProductId, error: deleteError })
      );
      throw toWishlistApiError(deleteError, "Failed to remove wishlist item.");
    }

    return { added: false };
  }

  const { error: insertError } = await supabaseAdmin.from("wishlist_items").insert({
    user_id: normalizedUserId,
    product_id: normalizedProductId,
  });

  if (insertError) {
    logError(
      "Wishlist insert failed",
      wishlistLogContext({ userId: normalizedUserId, productId: normalizedProductId, error: insertError })
    );
    throw toWishlistApiError(insertError, "Failed to add wishlist item.");
  }

  return { added: true };
}
