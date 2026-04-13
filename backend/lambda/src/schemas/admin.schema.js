import { z } from "zod";

const VALID_ORDER_STATUSES = [
  "pending", "confirmed", "processing", "in_production",
  "dispatched", "delivered", "cancelled",
];

export const updateOrderStatusSchema = z.object({
  status: z.enum(VALID_ORDER_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${VALID_ORDER_STATUSES.join(", ")}` }),
  }),
});

export const createProductSchema = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .min(1, "Product name is required")
    .max(200, "Name must be 200 characters or fewer")
    .trim(),
  collection: z
    .string({ required_error: "Collection is required" })
    .min(1, "Collection is required")
    .trim(),
  price: z
    .number({ required_error: "Price is required", invalid_type_error: "Price must be a number" })
    .positive("Price must be greater than 0"),
  original_price: z
    .number({ invalid_type_error: "Original price must be a number" })
    .positive("Original price must be greater than 0")
    .optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  tag: z.string().max(50).trim().optional().nullable(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  stock: z.number({ invalid_type_error: "Stock must be a number" }).int().min(0, "Stock cannot be negative").default(0),
  image: z.string().optional().nullable(),
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
