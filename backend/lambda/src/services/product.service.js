import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

function productLogContext(context = {}) {
  return { service: "product", ...context };
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    collection: row.collection,
    price: Number(row.price),
    originalPrice: Number(row.original_price ?? row.originalPrice ?? row.price),
    image: row.image ?? null,
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    rating: Number(row.rating ?? 0),
    reviews: Number(row.reviews ?? 0),
    tag: row.tag ?? null,
    description: row.description ?? null,
    stock: Number(row.stock ?? 0),
  };
}

export async function getProducts({ collection, search, limit = 100, offset = 0 } = {}) {
  logInfo("Fetching products", productLogContext({ collection, search, limit, offset }));

  let query = supabaseAdmin
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (collection) query = query.eq("collection", collection);
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tag.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    logError("Products fetch failed", productLogContext({ collection, search, error }));
    throw new ApiError(500, error.message || "Failed to load products.");
  }

  return (data || []).map(mapProduct);
}
