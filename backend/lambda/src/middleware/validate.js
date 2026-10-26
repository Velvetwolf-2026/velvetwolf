import { ApiError } from "../utils/http.js";

/**
 * Returns a validator function for the given Zod schema.
 * Usage: const data = validate(mySchema)(rawInput);
 *
 * On validation failure, throws ApiError(400) with the first Zod error message.
 * On success, returns the parsed (and transformed) data.
 *
 * @param {import("zod").ZodType} schema
 * @returns {(input: unknown) => unknown}
 */
// Zod before 4.6.6 built an error for every failing item of an array with no
// length cap, so one huge array could exhaust the Lambda's memory (GHSA-mrhx-c7xc-m3w5).
// Zod 4.6.7 is fixed; this stays as a second line of defence. No form on the site
// sends more than a few dozen items, so anything far bigger is refused before parsing.
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

// Zod 4 reworded its built-in messages ("Invalid input: expected string, received
// number"). Fields without a message of their own reach customers with Zod's
// wording, so this keeps Zod 3's: "Expected string, received number", "Required",
// "String must contain at most 200 character(s)" and so on.
function zod3Type(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isNaN(value)) return "nan";
  return typeof value;
}

const quote = (values) => values.map((v) => (typeof v === "string" ? `'${v}'` : v)).join(" | ");

function zod3Message(issue) {
  const { code, origin, exact, inclusive } = issue;
  switch (code) {
    case "invalid_type":
      if (issue.input === undefined) return "Required";
      // Zod 4 refuses ±Infinity as a number; Zod 3 let it through to .int(), which
      // refused it (only z.coerce can produce one, as JSON has no Infinity).
      if (issue.expected === "int" || (issue.expected === "number" && typeof issue.input === "number" && !Number.isNaN(issue.input))) {
        return "Expected integer, received float";
      }
      return `Expected ${issue.expected}, received ${zod3Type(issue.input)}`;
    case "too_small":
      if (origin === "string") return `String must contain ${exact ? "exactly" : inclusive ? "at least" : "over"} ${issue.minimum} character(s)`;
      if (origin === "array") return `Array must contain ${exact ? "exactly" : inclusive ? "at least" : "more than"} ${issue.minimum} element(s)`;
      return `Number must be ${exact ? "exactly equal to " : inclusive ? "greater than or equal to " : "greater than "}${issue.minimum}`;
    case "too_big":
      if (origin === "string") return `String must contain ${exact ? "exactly" : inclusive ? "at most" : "under"} ${issue.maximum} character(s)`;
      if (origin === "array") return `Array must contain ${exact ? "exactly" : inclusive ? "at most" : "less than"} ${issue.maximum} element(s)`;
      return `Number must be ${exact ? "exactly" : inclusive ? "less than or equal to" : "less than"} ${issue.maximum}`;
    case "invalid_format":
      return issue.format === "regex" ? "Invalid" : `Invalid ${issue.format}`;
    case "invalid_value":
      return issue.values.length === 1
        ? `Invalid literal value, expected ${JSON.stringify(issue.values[0])}`
        : `Invalid enum value. Expected ${quote(issue.values)}, received '${issue.input}'`;
    case "unrecognized_keys":
      return `Unrecognized key(s) in object: ${quote(issue.keys).replaceAll(" | ", ", ")}`;
    case "not_multiple_of":
      return `Number must be a multiple of ${issue.divisor}`;
    default:
      return "Invalid input";
  }
}

export function validate(schema) {
  return (input) => {
    assertReasonableInput(input);
    const result = schema.safeParse(input, { error: zod3Message });
    if (!result.success) {
      const first = result.error.issues[0];
      const field = first.path.length > 0 ? `${first.path.join(".")}: ` : "";
      throw new ApiError(400, `${field}${first.message}`);
    }
    return result.data;
  };
}
