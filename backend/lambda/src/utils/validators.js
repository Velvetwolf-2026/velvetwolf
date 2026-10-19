// Field checks shared by every form that takes an email, a mobile number or a
// person's name. The site has the same file at src/velvetwolf/utils/validate.js
// (the Lambda package can't import from the site); src/tests/validate.test.js
// runs both against the same cases so they can't drift apart.

// Email: the everyday form of an address (what mail providers hand out), not
// everything RFC 5322 technically allows.
// - at most 254 characters in all, 64 before the @
// - before the @: letters, digits and . _ % + - ' ; no dot at the start or end, no two dots in a row
// - after the @: dot-separated labels of letters, digits and hyphens (not at a label's ends),
//   ending in a top-level domain of 2 or more letters
const EMAIL_LOCAL = /^[A-Za-z0-9_%+'-]+(?:\.[A-Za-z0-9_%+'-]+)*$/;
const EMAIL_DOMAIN = /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export const EMAIL_MAX = 254;

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = String(value ?? "").trim();
  if (!email || email.length > EMAIL_MAX) return false;
  const at = email.indexOf("@");
  if (at < 1 || email.lastIndexOf("@") !== at) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return local.length <= 64 && domain.length <= 253 && EMAIL_LOCAL.test(local) && EMAIL_DOMAIN.test(domain);
}

export const EMAIL_ERROR = "Enter a valid email address, like name@example.com.";

// Indian mobile numbers: 10 digits starting 6 to 9. Numbers made of one digit
// repeated (9999999999) or a straight run (9876543210) are test numbers that
// no operator issues.
export function cleanMobile(value) {
  return String(value ?? "").replace(/[\s()-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
}

export function isValidMobile(value) {
  const n = String(value ?? "");
  if (!/^[6-9]\d{9}$/.test(n)) return false;
  if (/^(\d)\1{9}$/.test(n)) return false;
  if (n === "9876543210" || n === "6789012345") return false;
  return true;
}

export const MOBILE_ERROR = "Enter a valid 10-digit Indian mobile number.";

// A person's name: letters in any script, with spaces, dots, apostrophes and
// hyphens between them. At least two letters, no digits.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

export function cleanName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function isValidName(value, { max = 80 } = {}) {
  const n = cleanName(value);
  if (!n || n.length > max || !NAME.test(n)) return false;
  return (n.match(/\p{L}/gu) || []).length >= 2;
}

export const NAME_ERROR = "Enter a name using letters only.";
