import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

function cartLogContext(context = {}) {
  return { service: "cart", ...context };
}

async function getVariantByProductId(productId) {
  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .select("id, size, color")
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  if (error) {
    logError("Product variant lookup failed", cartLogContext({ productId, error }));
    throw new ApiError(400, error.message || "Failed to load product variant.");
  }

  if (!data?.id || !data?.size || !data?.color) {
    throw new ApiError(400, "Product variant not found for cart item.");
  }

  return data;
}

function mapCartItem(item) {
  return {
    ...(item.products || {}),
    size: item.product_variants?.size || null,
    color: item.product_variants?.color || null,
    qty: item.quantity,
    cart_item_id: item.id,
    variant_id: item.variant_id,
  };
}

export async function getCartByUserId(userId) {
  logInfo("Fetching cart by user id", cartLogContext({ userId }));

  const { data, error } = await supabaseAdmin
    .from("cart_items")
    .select("id, product_id, variant_id, quantity, products(*), product_variants(size, color)")
    .eq("user_id", userId);

  if (error) {
    logError("Cart lookup failed", cartLogContext({ userId, error }));
    throw new ApiError(400, error.message || "Failed to load cart.");
  }

  return (data || []).map(mapCartItem);
}

export async function addCartItemByUserId(userId, productId, quantity) {
  const variant = await getVariantByProductId(productId);

  logInfo("Adding cart item", cartLogContext({ userId, productId, variantId: variant.id, quantity }));

  const { data: existingItem, error: existingError } = await supabaseAdmin
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("variant_id", variant.id)
    .is("session_id", null)
    .maybeSingle();

  if (existingError) {
    logError("Cart lookup before upsert failed", cartLogContext({ userId, productId, variantId: variant.id, error: existingError }));
    throw new ApiError(400, existingError.message || "Failed to check cart item.");
  }

  if (existingItem?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity: existingItem.quantity + quantity })
      .eq("id", existingItem.id);

    if (updateError) {
      logError("Cart quantity increment failed", cartLogContext({ userId, productId, error: updateError }));
      throw new ApiError(400, updateError.message || "Failed to add cart item.");
    }
    return { success: true };
  }

  const { error } = await supabaseAdmin.from("cart_items").insert({
    user_id: userId,
    product_id: productId,
    variant_id: variant.id,
    quantity,
  });

  if (error) {
    logError("Cart insert failed", cartLogContext({ userId, productId, error }));
    throw new ApiError(400, error.message || "Failed to add cart item.");
  }

  return { success: true };
}

export async function updateCartItemQuantity(cartItemId, quantity) {
  if (quantity < 1) return removeCartItemById(cartItemId);

  logInfo("Updating cart item quantity", cartLogContext({ cartItemId, quantity }));

  const { error } = await supabaseAdmin.from("cart_items").update({ quantity }).eq("id", cartItemId);
  if (error) {
    logError("Cart quantity update failed", cartLogContext({ cartItemId, quantity, error }));
    throw new ApiError(400, error.message || "Failed to update cart item.");
  }

  return { success: true };
}

export async function removeCartItemById(cartItemId) {
  logInfo("Removing cart item", cartLogContext({ cartItemId }));

  const { error } = await supabaseAdmin.from("cart_items").delete().eq("id", cartItemId);
  if (error) {
    logError("Cart delete failed", cartLogContext({ cartItemId, error }));
    throw new ApiError(400, error.message || "Failed to remove cart item.");
  }

  return { success: true };
}
