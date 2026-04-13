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
export function validate(schema) {
  return (input) => {
    const result = schema.safeParse(input);
    if (!result.success) {
      const first = result.error.errors[0];
      const field = first.path.length > 0 ? `${first.path.join(".")}: ` : "";
      throw new ApiError(400, `${field}${first.message}`);
    }
    return result.data;
  };
}
