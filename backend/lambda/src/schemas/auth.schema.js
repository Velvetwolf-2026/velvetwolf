import { z } from "zod";

export const signupSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
  otp: z
    .union([z.string(), z.number()])
    .transform(String)
    .refine((v) => /^\d{4,8}$/.test(v), "Invalid OTP format"),
  type: z.string({ required_error: "OTP type is required" }).min(1, "OTP type is required"),
});

export const resendOtpSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
  kind: z.string().optional(),
  type: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string({ required_error: "Reset token is required" }).min(1, "Reset token is required"),
  newPassword: z
    .string({ required_error: "New password is required" })
    .min(8, "Password must be at least 8 characters"),
});
