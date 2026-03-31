import { supabaseAdmin } from "./config/supabase.js";
import { ApiError, logError, logInfo } from "./http.js";

function cartLogContext(context = {}) {
  return { service: "cart", ...context };
}

function normalizeUserId(userId) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new ApiError(400, "Cart user id is required.");
  }

  return normalizedUserId;
}

function normalizeCartItemId(cartItemId) {
  const normalizedCartItemId = Number(cartItemId);

  if (!Number.isFinite(normalizedCartItemId)) {
    throw new ApiError(400, "Cart item id is required.");
  }

  return normalizedCartItemId;
}

function normalizeProductId(productId) {
  const normalizedProductId = String(productId || "").trim();

  if (!normalizedProductId) {
    throw new ApiError(400, "Cart product id is required.");
  }

  return normalizedProductId;
}

function normalizeQuantity(quantity) {
  const normalizedQuantity = Number(quantity);

  if (!Number.isFinite(normalizedQuantity)) {
    throw new ApiError(400, "Cart quantity is required.");
  }

  return normalizedQuantity;
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
  const normalizedUserId = normalizeUserId(userId);

  logInfo("Fetching cart by user id", cartLogContext({ userId: normalizedUserId }));

  const { data, error } = await supabaseAdmin
    .from("cart_items")
    .select("id, product_id, variant_id, quantity, products(*), product_variants(size, color)")
    .eq("user_id", normalizedUserId);

  if (error) {
    logError("Cart lookup failed", cartLogContext({ userId: normalizedUserId, error }));
    throw new ApiError(400, error.message || "Failed to load cart.");
  }

  return (data || []).map(mapCartItem);
}

export async function addCartItemByUserId(userId, productId, quantity) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedProductId = normalizeProductId(productId);
  const normalizedQuantity = normalizeQuantity(quantity);
  const variant = await getVariantByProductId(normalizedProductId);

  logInfo(
    "Adding cart item",
    cartLogContext({
      userId: normalizedUserId,
      productId: normalizedProductId,
      variantId: variant.id,
      size: variant.size,
      color: variant.color,
      quantity: normalizedQuantity,
    })
  );

  const { data: existingItem, error: existingError } = await supabaseAdmin
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", normalizedUserId)
    .eq("variant_id", variant.id)
    .is("session_id", null)
    .maybeSingle();

  if (existingError) {
    logError(
      "Cart lookup before upsert failed",
      cartLogContext({ userId: normalizedUserId, productId: normalizedProductId, variantId: variant.id, error: existingError })
    );
    throw new ApiError(400, existingError.message || "Failed to check cart item.");
  }

  if (existingItem?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity: existingItem.quantity + normalizedQuantity })
      .eq("id", existingItem.id);

    if (updateError) {
      logError(
        "Cart quantity increment failed",
        cartLogContext({ userId: normalizedUserId, productId: normalizedProductId, variantId: variant.id, error: updateError })
      );
      throw new ApiError(400, updateError.message || "Failed to add cart item.");
    }

    return { success: true };
  }

  const { error } = await supabaseAdmin.from("cart_items").insert({
    user_id: normalizedUserId,
    product_id: normalizedProductId,
    variant_id: variant.id,
    quantity: normalizedQuantity,
  });

  if (error) {
    logError(
      "Cart insert failed",
      cartLogContext({ userId: normalizedUserId, productId: normalizedProductId, variantId: variant.id, error })
    );
    throw new ApiError(400, error.message || "Failed to add cart item.");
  }

  return { success: true };
}

export async function updateCartItemQuantity(cartItemId, quantity) {
  const normalizedCartItemId = normalizeCartItemId(cartItemId);
  const normalizedQuantity = normalizeQuantity(quantity);

  if (normalizedQuantity < 1) {
    return removeCartItemById(normalizedCartItemId);
  }

  logInfo(
    "Updating cart item quantity",
    cartLogContext({ cartItemId: normalizedCartItemId, quantity: normalizedQuantity })
  );

  const { error } = await supabaseAdmin
    .from("cart_items")
    .update({ quantity: normalizedQuantity })
    .eq("id", normalizedCartItemId);

  if (error) {
    logError(
      "Cart quantity update failed",
      cartLogContext({ cartItemId: normalizedCartItemId, quantity: normalizedQuantity, error })
    );
    throw new ApiError(400, error.message || "Failed to update cart item.");
  }

  return { success: true };
}

export async function removeCartItemById(cartItemId) {
  const normalizedCartItemId = normalizeCartItemId(cartItemId);

  logInfo("Removing cart item", cartLogContext({ cartItemId: normalizedCartItemId }));

  const { error } = await supabaseAdmin.from("cart_items").delete().eq("id", normalizedCartItemId);

  if (error) {
    logError("Cart delete failed", cartLogContext({ cartItemId: normalizedCartItemId, error }));
    throw new ApiError(400, error.message || "Failed to remove cart item.");
  }

  return { success: true };
}
