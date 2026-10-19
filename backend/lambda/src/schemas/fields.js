// Zod fields built on utils/validators.js, so every endpoint checks emails,
// mobile numbers and names the same way the site's forms do.
import { z } from "zod";
import {
  isValidEmail, normalizeEmail, EMAIL_ERROR,
  isValidMobile, cleanMobile, MOBILE_ERROR,
  isValidName, cleanName, NAME_ERROR,
} from "../utils/validators.js";

export const emailField = () =>
  z.string({ required_error: "Email is required" })
    .refine(isValidEmail, EMAIL_ERROR)
    .transform(normalizeEmail);

export const mobileField = () =>
  z.string({ required_error: "Mobile number is required" })
    .transform(cleanMobile)
    .refine(isValidMobile, MOBILE_ERROR);

export const nameField = ({ label = "Name", max = 80 } = {}) =>
  z.string({ required_error: `${label} is required` })
    .transform(cleanName)
    .refine((v) => v.length > 0, `${label} is required`)
    .refine((v) => isValidName(v, { max }), label === "Name" ? NAME_ERROR : `Enter the ${label.toLowerCase()}'s name using letters only.`);
