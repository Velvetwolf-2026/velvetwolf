// Zod fields built on utils/validators.js, so every endpoint checks emails,
// mobile numbers and names the same way the site's forms do.
import { z } from "zod";
import {
  isValidEmail, normalizeEmail, EMAIL_ERROR,
  isValidMobile, cleanMobile, MOBILE_ERROR,
  isValidName, cleanName, NAME_ERROR,
} from "../utils/validators.js";

// Zod 4 folded Zod 3's required_error and invalid_type_error into one `error`
// option. This keeps their meaning: `required` when the field is missing,
// `invalid` when it is the wrong type; anything else gets the usual message.
export const typeErrors = ({ required, invalid } = {}) => ({
  error: (issue) => (issue.input === undefined ? required : issue.code === "invalid_type" ? invalid : undefined),
});

export const emailField = () =>
  z.string(typeErrors({ required: "Email is required" }))
    .refine(isValidEmail, EMAIL_ERROR)
    .transform(normalizeEmail);

export const mobileField = () =>
  z.string(typeErrors({ required: "Mobile number is required" }))
    .transform(cleanMobile)
    .refine(isValidMobile, MOBILE_ERROR);

export const nameField = ({ label = "Name", max = 80 } = {}) =>
  z.string(typeErrors({ required: `${label} is required` }))
    .transform(cleanName)
    .refine((v) => v.length > 0, `${label} is required`)
    .refine((v) => isValidName(v, { max }), label === "Name" ? NAME_ERROR : `Enter the ${label.toLowerCase()}'s name using letters only.`);
