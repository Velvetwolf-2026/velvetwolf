import { ApiError } from "../utils/http.js";

/**
 * Returns a validator function for the given Zod schema.
 * Usage: const data = validate(mySchema)(rawInput);
 *
 * On validation failure, throws ApiError(400) with the first Zod error message.
 * On success, returns the parsed (and transformed) data.
 *
 * @param {import("zod").ZodTypeAny} schema
 * @returns {(input: unknown) => unknown}
 */
// Zod (before 4.6.6) builds an error for every failing item of an array with no
// length cap, so one huge array can exhaust the Lambda's memory (GHSA-mrhx-c7xc-m3w5).
// No form on the site sends more than a few dozen items, so anything far bigger is
// refused before parsing.
export const MAX_ARRAY_ITEMS = 200;
const MAX_DEPTH = 8;

export function assertReasonableInput(input, depth = 0) {
  if (depth > MAX_DEPTH) throw new ApiError(400, "Request is nested too deeply.");
  if (Array.isArray(input)) {
    if (input.length > MAX_ARRAY_ITEMS) throw new ApiError(400, `Too many items (the limit is ${MAX_ARRAY_ITEMS}).`);
    for (const item of input) if (item && typeof item === "object") assertReasonableInput(item, depth + 1);
  } else if (input && typeof input === "object") {
    for (const value of Object.values(input)) if (value && typeof value === "object") assertReasonableInput(value, depth + 1);
  }
}

export function validate(schema) {
  return (input) => {
    assertReasonableInput(input);
    const result = schema.safeParse(input);
    if (!result.success) {
      const first = result.error.errors[0];
      const field = first.path.length > 0 ? `${first.path.join(".")}: ` : "";
      throw new ApiError(400, `${field}${first.message}`);
    }
    return result.data;
  };
}
