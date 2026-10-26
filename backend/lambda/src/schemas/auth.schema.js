import { z } from "zod";
import { emailField, nameField, typeErrors } from "./fields.js";

export const signupSchema = z.object({
  name: nameField(),
  email: emailField(),
  recaptchaToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailField(),
  recaptchaToken: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: emailField(),
  otp: z
    .union([z.string(), z.number()])
    .transform(String)
    .refine((v) => /^\d{4,8}$/.test(v), "Invalid OTP format"),
  type: z.string(typeErrors({ required: "OTP type is required" })).min(1, "OTP type is required"),
});

export const resendOtpSchema = z.object({
  email: emailField(),
  kind: z.string().optional(),
  type: z.string().optional(),
});

export const firebaseLoginSchema = z.object({
  identifier: z.string().optional(),
  phone: z.string().optional(), // keeping for backward compatibility
  token: z.string(typeErrors({ required: "Firebase token is required" })).min(1, "Firebase token is required"),
});
