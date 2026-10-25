import { z } from "zod";
import { typeErrors } from "./fields.js";

// Who a product is cut for. Stored in products.gender (and mirrored to the older
// products.style, which the site already reads).
export const GENDERS = ["Unisex", "Men", "Women"];
const genderField = z.enum(GENDERS, { error: "Gender must be Unisex, Men or Women." });

// The home page's "Top 5 designs": a product's place in it (1 to 5, or none), and the flat
// print artwork the 3D tee wears there (a transparent PNG, uploaded to product storage).
const topRankField = z.number().int().min(1, "Top 5 position is 1 to 5.").max(5, "Top 5 position is 1 to 5.").nullable();
const printImageField = z.string().trim().max(1000).regex(/^https:\/\//, "Print artwork must be an https URL.").nullable();

const VALID_ORDER_STATUSES = [
  "pending", "confirmed", "processing", "in_production",
  "dispatched", "delivered", "cancelled",
];

export const updateOrderStatusSchema = z.object({
  status: z.enum(VALID_ORDER_STATUSES, {
    error: `Status must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
  }),
});

export const createProductSchema = z.object({
  name: z
    .string(typeErrors({ required: "Product name is required" }))
    .min(1, "Product name is required")
    .max(200, "Name must be 200 characters or fewer")
    .trim(),
  collection: z
    .string(typeErrors({ required: "Collection is required" }))
    .min(1, "Collection is required")
    .trim(),
  price: z
    .number(typeErrors({ required: "Price is required", invalid: "Price must be a number" }))
    .positive("Price must be greater than 0"),
  original_price: z
    .number(typeErrors({ invalid: "Original price must be a number" }))
    .positive("Original price must be greater than 0")
    .optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  tag: z.string().max(50).trim().optional().nullable(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  stock: z.number(typeErrors({ invalid: "Stock must be a number" })).int().min(0, "Stock cannot be negative").default(0),
  image: z.string().optional().nullable(),
  images: z.array(z.string()).optional().default([]),
  newImages: z.array(z.object({
    base64: z.string(),
    fileName: z.string(),
    contentType: z.string().optional(),
    previewUrl: z.string().optional(),
    color: z.string().optional(),
  })).optional().default([]),
  style: z.string().optional().default("Unisex"),
  gender: genderField.optional(),
  fit: z.string().optional().default("Oversized"),
  top_rank: topRankField.optional(),
  print_image: printImageField.optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  collection: z.string().min(1).trim().optional(),
  price: z.number().positive().optional(),
  original_price: z.number().positive().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  tag: z.string().max(50).trim().optional().nullable(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  stock: z.number().int().min(0).optional(),
  image: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  newImages: z.array(z.object({
    base64: z.string(),
    fileName: z.string(),
    contentType: z.string().optional(),
    previewUrl: z.string().optional(),
    color: z.string().optional(),
  })).optional(),
  style: z.string().optional(),
  gender: genderField.optional(),
  fit: z.string().optional(),
  top_rank: topRankField.optional(),
  print_image: printImageField.optional(),
});

export const getOrdersSchema = z.object({
  status: z.string().optional(),
  page: z.string().optional().transform((v) => (v ? Math.max(1, Number(v)) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(200, Number(v)) : 50)),
});

export const getProductsSchema = z.object({
  collection: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.string().optional().transform((v) => (v ? Math.max(1, Number(v)) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(200, Number(v)) : 100)),
});

export const getCustomersSchema = z.object({
  search: z.string().max(200).optional(),
  page: z.string().optional().transform((v) => (v ? Math.max(1, Number(v)) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(200, Number(v)) : 50)),
});
