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

// Saved delivery address. Same field names as the checkout address form, so a
// saved address fills the form directly.
export const addressSchema = z.object({
  label: z.string().trim().max(40, "Label must be 40 characters or fewer").optional().default(""),
  name: z.string({ required_error: "Name is required" }).trim().min(1, "Name is required").max(100),
  phone: z
    .string({ required_error: "Phone is required" })
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number"),
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

// Deleting an account must be typed out, so a mis-click (or a forged
// request) can't do it.
export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", { errorMap: () => ({ message: "Type DELETE to confirm." }) }),
});
