import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

function wishlistLogContext(context = {}) {
  return { service: "wishlist", ...context };
}

function toWishlistApiError(error, fallbackMessage) {
  const message = error?.message || fallbackMessage;
  if (message.includes('invalid input syntax for type uuid: "')) {
    return new ApiError(
      500,
      "Wishlist schema mismatch: the database expects a UUID product id. Ensure the frontend sends the real products.id from Supabase."
    );
  }
  return new ApiError(400, message || fallbackMessage);
}

export async function getWishlistByUserId(userId) {
  logInfo("Fetching wishlist by user id", wishlistLogContext({ userId }));

  const { data, error } = await supabaseAdmin
    .from("wishlist_items")
    .select("product_id, products(*)")
    .eq("user_id", userId);

  if (error) {
    logError("Wishlist lookup failed", wishlistLogContext({ userId, error }));
    throw toWishlistApiError(error, "Failed to load wishlist.");
  }

  return (data || []).map((item) => item.products).filter(Boolean);
}

export async function toggleWishlistByUserId(userId, productId) {
  logInfo("Toggling wishlist item", wishlistLogContext({ userId, productId }));

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("wishlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingError) {
    logError("Wishlist lookup before toggle failed", wishlistLogContext({ userId, productId, error: existingError }));
    throw toWishlistApiError(existingError, "Failed to check wishlist item.");
  }

  if (existing?.id) {
    const { error: deleteError } = await supabaseAdmin.from("wishlist_items").delete().eq("id", existing.id);
    if (deleteError) {
      logError("Wishlist delete failed", wishlistLogContext({ userId, productId, error: deleteError }));
      throw toWishlistApiError(deleteError, "Failed to remove wishlist item.");
    }
    return { added: false };
  }

  const { error: insertError } = await supabaseAdmin.from("wishlist_items").insert({ user_id: userId, product_id: productId });
  if (insertError) {
    logError("Wishlist insert failed", wishlistLogContext({ userId, productId, error: insertError }));
    throw toWishlistApiError(insertError, "Failed to add wishlist item.");
  }

  return { added: true };
}
