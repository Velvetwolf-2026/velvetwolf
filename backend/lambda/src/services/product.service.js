import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

function parseCommentAndImages(rawComment) {
  if (!rawComment) return { comment: "", images: [] };
  
  const match = rawComment.match(/\n\n\[review_images:(.*)\]$/s);
  if (match) {
    try {
      const images = JSON.parse(match[1]);
      const comment = rawComment.replace(/\n\n\[review_images:(.*)\]$/, "");
      return { comment, images };
    } catch {
      // Ignore parsing errors
    }
  }
  return { comment: rawComment, images: [] };
}

function productLogContext(context = {}) {
  return { service: "product", ...context };
}

function mapProduct(row) {
  if (!row) return null;
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
    reviews: Number(row.reviews ?? row.review_count ?? 0),
    tag: row.tag ?? null,
    description: row.description ?? null,
    stock: Number(row.stock ?? 0),
    slug: row.slug ?? null,
    sku: row.sku ?? null,
    gsm: row.gsm ?? null,
    fabric: row.fabric ?? null,
    images: Array.isArray(row.images) ? row.images : [],
    isActive: row.is_active ?? true,
    isLimited: row.is_limited ?? false,
    style: row.style ?? 'Unisex',
    fit: row.fit ?? 'Oversized',
  };
}

export async function getProductBySlug(slug) {
  logInfo("Fetching product by slug", productLogContext({ slug }));

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "Product not found.");
    }
    logError("Product fetch by slug failed", productLogContext({ slug, error }));
    throw new ApiError(500, error.message || "Failed to load product.");
  }

  return mapProduct(data);
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

export async function getProductReviews(productId) {
  logInfo("Fetching reviews for product", productLogContext({ productId }));

  const { data, error } = await supabaseAdmin
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    logError("Failed to fetch product reviews", productLogContext({ productId, error }));
    throw new ApiError(500, "Failed to load product reviews.");
  }

  return (data || []).map(row => {
    const { comment, images } = parseCommentAndImages(row.comment);
    return {
      id: row.id,
      productId: row.product_id,
      user_name: row.user_name,
      rating: Number(row.rating),
      comment: comment,
      images: images,
      created_at: row.created_at
    };
  });
}

export async function createProductReview(productId, { name, rating, comment, images }) {
  logInfo("Creating review for product", productLogContext({ productId, name }));

  let finalComment = comment?.trim() || "";
  const uploadedUrls = [];

  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      if (!img.data || !img.name) continue;
      const buffer = Buffer.from(img.data, 'base64');
      const fileExt = img.name.split('.').pop() || 'jpg';
      const fileName = `reviews/${crypto.randomUUID()}.${fileExt}`;
      const mimeType = img.type || 'image/jpeg';

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('product-images')
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        logError("Failed to upload review image to storage", { error: uploadError });
        continue;
      }

      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/product-images/${uploadData.path}`;
      uploadedUrls.push(publicUrl);
    }
  }

  if (uploadedUrls.length > 0) {
    finalComment += `\n\n[review_images:${JSON.stringify(uploadedUrls)}]`;
  }

  const { data, error } = await supabaseAdmin
    .from("product_reviews")
    .insert({
      product_id: productId,
      user_name: name.trim(),
      rating: Number(rating),
      comment: finalComment || null
    })
    .select()
    .single();

  if (error) {
    logError("Failed to create product review", productLogContext({ productId, error }));
    throw new ApiError(500, "Failed to submit review.");
  }

  const { comment: parsedComment, images: parsedImages } = parseCommentAndImages(data.comment);

  return {
    id: data.id,
    productId: data.product_id,
    user_name: data.user_name,
    rating: Number(data.rating),
    comment: parsedComment,
    images: parsedImages,
    created_at: data.created_at
  };
}
