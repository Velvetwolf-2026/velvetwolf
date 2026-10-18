import { z } from "zod";
import { emailField, nameField, mobileField } from "./fields.js";

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
  name: nameField(),
  email: emailField(),
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
  contact: nameField({ label: "Contact person" }),
  email: emailField(),
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

// Saved delivery address. Same field names as the checkout address form, so a
// saved address fills the form directly.
export const addressSchema = z.object({
  label: z.string().trim().max(40, "Label must be 40 characters or fewer").optional().default(""),
  name: nameField(),
  phone: mobileField(),
  address: z.string({ required_error: "Address is required" }).trim().min(5, "Address is too short").max(300),
  city: z.string({ required_error: "City is required" }).trim().min(1, "City is required").max(100),
  district: z.string().trim().max(100).optional().default(""),
  state: z.string({ required_error: "State is required" }).trim().min(1, "State is required").max(100),
  pincode: z
    .string({ required_error: "PIN code is required" })
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
  address: z.string({ required_error: "Address is required" }).trim().min(4, "Enter your house number and street.").max(300),
  city: z.string({ required_error: "City is required" }).trim().min(1, "Enter your city or town.").max(100),
  district: z.string().trim().max(100).optional().default(""),
  state: z.string({ required_error: "State is required" }).trim().min(1, "Choose a state.").max(100),
  pincode: z
    .string({ required_error: "PIN code is required" })
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^[1-9]\d{5}$/.test(v), "Enter a valid 6-digit PIN code"),
}).passthrough();

// Deleting an account must be typed out, so a mis-click (or a forged
// request) can't do it.
export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", { errorMap: () => ({ message: "Type DELETE to confirm." }) }),
});
