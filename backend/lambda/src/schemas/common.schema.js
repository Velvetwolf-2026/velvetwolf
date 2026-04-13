import { z } from "zod";

export const cartAddSchema = z.object({
  userId: z.string({ required_error: "User ID is required" }).min(1, "User ID is required"),
  productId: z.string({ required_error: "Product ID is required" }).min(1, "Product ID is required"),
  quantity: z
    .number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
});

export const cartUpdateSchema = z.object({
  cartItemId: z
    .number({ required_error: "Cart item ID is required", invalid_type_error: "Cart item ID must be a number" })
    .int()
    .positive("Cart item ID is invalid"),
  quantity: z
    .number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" })
    .int()
    .min(0, "Quantity cannot be negative"),
});

export const cartRemoveSchema = z.object({
  cartItemId: z
    .number({ required_error: "Cart item ID is required", invalid_type_error: "Cart item ID must be a number" })
    .int()
    .positive("Cart item ID is invalid"),
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
