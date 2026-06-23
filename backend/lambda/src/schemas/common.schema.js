import { z } from "zod";

export const cartAddSchema = z.object({
  userId: z.string({ required_error: "User ID is required" }).min(1, "User ID is required"),
  productId: z.string({ required_error: "Product ID is required" }).min(1, "Product ID is required"),
  quantity: z
    .number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export const cartUpdateSchema = z.object({
  cartItemId: z
    .string({ required_error: "Cart item ID is required" })
    .uuid("Cart item ID must be a valid UUID"),
  quantity: z
    .number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" })
    .int()
    .min(0, "Quantity cannot be negative"),
});

export const cartRemoveSchema = z.object({
  cartItemId: z
    .string({ required_error: "Cart item ID is required" })
    .uuid("Cart item ID must be a valid UUID"),
});

export const wishlistToggleSchema = z.object({
  userId: z.string({ required_error: "User ID is required" }).min(1, "User ID is required"),
  productId: z.string({ required_error: "Product ID is required" }).min(1, "Product ID is required"),
});

export const contactSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Please enter your name")
    .max(100)
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Please enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  subject: z
    .string({ required_error: "Subject is required" })
    .min(1, "Please select a subject")
    .max(200)
    .trim(),
  message: z
    .string({ required_error: "Message is required" })
    .min(10, "Message must be at least 10 characters")
    .max(5000)
    .trim(),
});

export const bulkOrderSchema = z.object({
  type: z.string({ required_error: "Order type is required" }).min(1).trim(),
  org: z
    .string({ required_error: "Organization name is required" })
    .min(2, "Please enter organization name")
    .max(200)
    .trim(),
  contact: z
    .string({ required_error: "Contact person is required" })
    .min(2, "Please enter contact person name")
    .max(100)
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Please enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  qty: z.coerce
    .number({ required_error: "Quantity is required" })
    .int()
    .min(5, "Minimum quantity should be 5"),
  message: z
    .string({ required_error: "Requirements are required" })
    .min(10, "Requirements must be at least 10 characters")
    .max(5000)
    .trim(),
  images: z.array(z.string()).optional(),
});
