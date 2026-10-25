import { z } from "zod";
import { emailField, nameField, mobileField, typeErrors } from "./fields.js";

// Any 8-4-4-4-12 hex id: the check Zod 3's .uuid() made (Zod 4's also checks the
// version and variant digits).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const cartAddSchema = z.object({
  userId: z.string(typeErrors({ required: "User ID is required" })).min(1, "User ID is required"),
  productId: z.string(typeErrors({ required: "Product ID is required" })).min(1, "Product ID is required"),
  quantity: z
    .number(typeErrors({ required: "Quantity is required", invalid: "Quantity must be a number" }))
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export const cartUpdateSchema = z.object({
  cartItemId: z
    .string(typeErrors({ required: "Cart item ID is required" }))
    .regex(UUID, "Cart item ID must be a valid UUID"),
  quantity: z
    .number(typeErrors({ required: "Quantity is required", invalid: "Quantity must be a number" }))
    .int()
    .min(0, "Quantity cannot be negative"),
});

export const cartRemoveSchema = z.object({
  cartItemId: z
    .string(typeErrors({ required: "Cart item ID is required" }))
    .regex(UUID, "Cart item ID must be a valid UUID"),
});

export const wishlistToggleSchema = z.object({
  userId: z.string(typeErrors({ required: "User ID is required" })).min(1, "User ID is required"),
  productId: z.string(typeErrors({ required: "Product ID is required" })).min(1, "Product ID is required"),
});

export const contactSchema = z.object({
  name: nameField(),
  email: emailField(),
  subject: z
    .string(typeErrors({ required: "Subject is required" }))
    .min(1, "Please select a subject")
    .max(200)
    .trim(),
  message: z
    .string(typeErrors({ required: "Message is required" }))
    .min(10, "Message must be at least 10 characters")
    .max(5000)
    .trim(),
});

export const bulkOrderSchema = z.object({
  type: z.string(typeErrors({ required: "Order type is required" })).min(1).trim(),
  org: z
    .string(typeErrors({ required: "Organization name is required" }))
    .min(2, "Please enter organization name")
    .max(200)
    .trim(),
  contact: nameField({ label: "Contact person" }),
  email: emailField(),
  qty: z.coerce
    .number(typeErrors({ required: "Quantity is required" }))
    .int()
    .min(5, "Minimum quantity should be 5"),
  message: z
    .string(typeErrors({ required: "Requirements are required" }))
    .min(10, "Requirements must be at least 10 characters")
    .max(5000)
    .trim(),
  images: z.array(z.string()).optional(),
});

// Saved delivery address. Same field names as the checkout address form, so a
// saved address fills the form directly.
export const addressSchema = z.object({
  label: z.string().trim().max(40, "Label must be 40 characters or fewer").optional().default(""),
  name: nameField(),
  phone: mobileField(),
  address: z.string(typeErrors({ required: "Address is required" })).trim().min(5, "Address is too short").max(300),
  city: z.string(typeErrors({ required: "City is required" })).trim().min(1, "City is required").max(100),
  district: z.string().trim().max(100).optional().default(""),
  state: z.string(typeErrors({ required: "State is required" })).trim().min(1, "State is required").max(100),
  pincode: z
    .string(typeErrors({ required: "PIN code is required" }))
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^\d{6}$/.test(v), "Enter a valid 6-digit PIN code"),
  isDefault: z.boolean().optional().default(false),
});

// The delivery address sent with a checkout. The courier and Cashfree both
// need a real name, mobile number and email, so nothing is filled in for the
// customer any more (a bad number used to be swapped for 9999999999).
export const checkoutAddressSchema = z.object({
  name: nameField(),
  phone: mobileField(),
  email: emailField(),
  address: z.string(typeErrors({ required: "Address is required" })).trim().min(4, "Enter your house number and street.").max(300),
  city: z.string(typeErrors({ required: "City is required" })).trim().min(1, "Enter your city or town.").max(100),
  district: z.string().trim().max(100).optional().default(""),
  state: z.string(typeErrors({ required: "State is required" })).trim().min(1, "Choose a state.").max(100),
  pincode: z
    .string(typeErrors({ required: "PIN code is required" }))
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^[1-9]\d{5}$/.test(v), "Enter a valid 6-digit PIN code"),
}).loose();

// A product review (signed-in customers only, see product.controller.js).
// Photos arrive as base64: up to 3, each at most 2 MB, JPEG, PNG or WebP.
export const REVIEW_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_REVIEW_IMAGE_BASE64 = Math.ceil((2 * 1024 * 1024) / 3) * 4;

export const reviewSchema = z.object({
  name: nameField(),
  rating: z.coerce.number().int("Rating must be 1 to 5.").min(1, "Rating must be 1 to 5.").max(5, "Rating must be 1 to 5."),
  comment: z.string().trim().max(2000, "Review must be 2000 characters or fewer.").optional().default(""),
  images: z.array(z.object({
    data: z.string().min(1).max(MAX_REVIEW_IMAGE_BASE64, "Each photo must be 2 MB or smaller."),
    name: z.string().max(200).optional(),
    type: z.enum(REVIEW_IMAGE_TYPES, { error: "Photos must be JPEG, PNG or WebP." }),
  })).max(3, "Add up to 3 photos.").optional().default([]),
});

// Deleting an account must be typed out, so a mis-click (or a forged
// request) can't do it.
export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", { error: "Type DELETE to confirm." }),
});
