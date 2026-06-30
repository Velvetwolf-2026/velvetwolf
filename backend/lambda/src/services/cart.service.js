import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

function cartLogContext(context = {}) {
  return { service: "cart", ...context };
}

async function getVariantByProductSizeColor(productId, size, color) {
  let query = supabaseAdmin
    .from("product_variants")
    .select("id, size, color, stock_qty")
    .eq("product_id", productId);

  if (size) {
    query = query.eq("size", size);
  }
  if (color) {
    if (color.startsWith("#")) {
      query = query.eq("color_hex", color);
    } else {
      query = query.or(`color.eq.${color},color_hex.eq.${color}`);
    }
  }

  const { data, error } = await query;

  if (error) {
    logError("Product variant lookup failed", cartLogContext({ productId, size, color, error }));
    throw new ApiError(400, error.message || "Failed to load product variant.");
  }

  if (!data || data.length === 0) {
    throw new ApiError(400, `Selected variant (${size || "default"}/${color || "default"}) is not available.`);
  }

  // Return the matching variant. If multiple match, take the first one.
  return data[0];
}

function mapCartItem(item) {
  return {
    ...(item.products || {}),
    size: item.product_variants?.size || null,
    color: item.product_variants?.color || null,
    stock: item.product_variants?.stock_qty ?? 0,
    qty: item.quantity,
    cart_item_id: item.id,
    variant_id: item.variant_id,
  };
}

export async function getCartByUserId(userId) {
  logInfo("Fetching cart by user id", cartLogContext({ userId }));

  const { data, error } = await supabaseAdmin
    .from("cart_items")
    .select("id, product_id, variant_id, quantity, products(*), product_variants(size, color, stock_qty)")
    .eq("user_id", userId);

  if (error) {
    logError("Cart lookup failed", cartLogContext({ userId, error }));
    throw new ApiError(400, error.message || "Failed to load cart.");
  }

  return (data || []).map(mapCartItem);
}

export async function addCartItemByUserId(userId, productId, quantity, size = null, color = null) {
  const variant = await getVariantByProductSizeColor(productId, size, color);

  logInfo("Adding cart item", cartLogContext({ userId, productId, variantId: variant.id, quantity }));

  const { data: existingItems, error: existingError } = await supabaseAdmin
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("variant_id", variant.id)
    .is("session_id", null);

  if (existingError) {
    logError("Cart lookup before upsert failed", cartLogContext({ userId, productId, variantId: variant.id, error: existingError }));
    throw new ApiError(400, existingError.message || "Failed to check cart item.");
  }

  let existingItem = null;
  let totalQuantity = quantity;

  if (existingItems && existingItems.length > 0) {
    existingItem = existingItems[0];
    const prevQty = existingItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    totalQuantity = prevQty + quantity;

    // Self-healing: if there are duplicates, delete the extras
    if (existingItems.length > 1) {
      const extraIds = existingItems.slice(1).map(item => item.id);
      await supabaseAdmin.from("cart_items").delete().in("id", extraIds);
    }
  }

  if (variant.stock_qty < totalQuantity) {
    throw new ApiError(400, `Only ${variant.stock_qty} items available in stock for this variant.`);
  }

  if (existingItem?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity: totalQuantity })
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

export async function updateCartItemQuantity(userId, cartItemId, quantity) {
  if (quantity < 1) return removeCartItemById(userId, cartItemId);

  logInfo("Updating cart item quantity", cartLogContext({ userId, cartItemId, quantity }));

  const { data: cartItem, error: cartItemError } = await supabaseAdmin
    .from("cart_items")
    .select("user_id, variant_id, product_variants(stock_qty)")
    .eq("id", cartItemId)
    .maybeSingle();

  if (cartItemError || !cartItem) {
    throw new ApiError(400, "Cart item not found.");
  }

  if (cartItem.user_id !== userId) {
    throw new ApiError(403, "Access denied. Not your cart item.");
  }

  const stock = cartItem.product_variants?.stock_qty ?? 0;
  if (stock < quantity) {
    throw new ApiError(400, `Only ${stock} items available in stock for this variant.`);
  }

  const { error } = await supabaseAdmin.from("cart_items").update({ quantity }).eq("id", cartItemId);
  if (error) {
    logError("Cart quantity update failed", cartLogContext({ cartItemId, quantity, error }));
    throw new ApiError(400, error.message || "Failed to update cart item.");
  }

  return { success: true };
}

export async function removeCartItemById(userId, cartItemId) {
  logInfo("Removing cart item", cartLogContext({ userId, cartItemId }));

  const { data: cartItem, error: cartItemError } = await supabaseAdmin
    .from("cart_items")
    .select("user_id")
    .eq("id", cartItemId)
    .maybeSingle();

  if (cartItemError || !cartItem) {
    throw new ApiError(400, "Cart item not found.");
  }

  if (cartItem.user_id !== userId) {
    throw new ApiError(403, "Access denied. Not your cart item.");
  }

  const { error } = await supabaseAdmin.from("cart_items").delete().eq("id", cartItemId);
  if (error) {
    logError("Cart delete failed", cartLogContext({ cartItemId, error }));
    throw new ApiError(400, error.message || "Failed to remove cart item.");
  }

  return { success: true };
}
