// Saved delivery addresses (table public.addresses, see schema.sql).
// Every call is scoped to the signed-in user's id, so nobody can read or
// change another customer's addresses.
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError } from "../utils/http.js";

const MAX_ADDRESSES = 10;
const COLUMNS = "id, label, name, phone, address, city, district, state, pincode, is_default, created_at";

function logContext(context = {}) {
  return { service: "address", ...context };
}

const toRow = (data) => ({
  label: data.label || "",
  name: data.name,
  phone: data.phone,
  address: data.address,
  city: data.city,
  district: data.district || "",
  state: data.state,
  pincode: data.pincode,
});

// Default first, then newest.
export async function listAddresses(userId) {
  const { data, error } = await supabaseAdmin
    .from("addresses")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    logError("Failed to list addresses", logContext({ userId, error }));
    throw new ApiError(500, "Could not load your saved addresses.");
  }
  return data || [];
}

async function clearDefault(userId) {
  const { error } = await supabaseAdmin.from("addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
  if (error) {
    logError("Failed to clear default address", logContext({ userId, error }));
    throw new ApiError(500, "Could not update your saved addresses.");
  }
}

export async function createAddress(userId, data) {
  const existing = await listAddresses(userId);
  if (existing.length >= MAX_ADDRESSES) {
    throw new ApiError(400, `You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.`);
  }
  // The first address is the default automatically.
  const makeDefault = data.isDefault || existing.length === 0;
  if (makeDefault) await clearDefault(userId);

  const { data: row, error } = await supabaseAdmin
    .from("addresses")
    .insert({ ...toRow(data), user_id: userId, is_default: makeDefault })
    .select(COLUMNS)
    .single();
  if (error) {
    logError("Failed to save address", logContext({ userId, error }));
    throw new ApiError(500, "Could not save the address.");
  }
  return row;
}

async function assertOwned(userId, addressId) {
  const { data, error } = await supabaseAdmin
    .from("addresses").select("id, user_id, is_default").eq("id", addressId).maybeSingle();
  if (error) {
    logError("Failed to look up address", logContext({ userId, addressId, error }));
    throw new ApiError(500, "Could not update the address.");
  }
  if (!data || data.user_id !== userId) throw new ApiError(404, "Address not found.");
  return data;
}

export async function updateAddress(userId, addressId, data) {
  await assertOwned(userId, addressId);
  if (data.isDefault) await clearDefault(userId);
  const patch = { ...toRow(data), ...(data.isDefault ? { is_default: true } : {}) };
  const { data: row, error } = await supabaseAdmin
    .from("addresses").update(patch).eq("id", addressId).eq("user_id", userId).select(COLUMNS).single();
  if (error) {
    logError("Failed to update address", logContext({ userId, addressId, error }));
    throw new ApiError(500, "Could not update the address.");
  }
  return row;
}

export async function deleteAddress(userId, addressId) {
  const owned = await assertOwned(userId, addressId);
  const { error } = await supabaseAdmin.from("addresses").delete().eq("id", addressId).eq("user_id", userId);
  if (error) {
    logError("Failed to delete address", logContext({ userId, addressId, error }));
    throw new ApiError(500, "Could not remove the address.");
  }
  // Keep one default while any addresses remain.
  if (owned.is_default) {
    const rest = await listAddresses(userId);
    if (rest.length > 0) {
      await supabaseAdmin.from("addresses").update({ is_default: true }).eq("id", rest[0].id).eq("user_id", userId);
    }
  }
  return { success: true };
}
