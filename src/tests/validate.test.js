import { describe, it, expect } from "vitest";
import * as site from "../velvetwolf/utils/validate";
import * as backend from "../../backend/lambda/src/utils/validators.js";

// The QA report's rejected addresses (issues 14 to 23), plus everyday ones that must keep working.
const GOOD_EMAILS = [
  "name@example.com",
  "first.last@example.co.in",
  "a_b-c+tag@sub.example.org",
  "o'neil@example.ie",
  "UPPER@Example.COM",
  "x@ex-ample.in",
];
const BAD_EMAILS = [
  ["<>", "a<b>@example.com"],
  ["<> in local part", "<name>@example.com"],
  ["consecutive dots in domain", "name@example..com"],
  ["consecutive dots in multi-part domain", "name@mail.example..co.in"],
  ["leading dot", ".name@example.com"],
  ["dot before @", "name.@example.com"],
  ["consecutive dots in local part", "first..last@example.com"],
  ["! in domain", "name@exam!ple.com"],
  ["> in domain", "name@exam>ple.com"],
  ["too long", `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com`],
  ["local part over 64", `${"a".repeat(65)}@example.com`],
  ["no tld", "name@example"],
  ["numeric tld", "name@example.123"],
  ["hyphen at label start", "name@-example.com"],
  ["two @", "a@b@example.com"],
  ["space", "na me@example.com"],
  ["empty", ""],
];

for (const [label, mod] of [["site", site], ["backend", backend]]) {
  describe(`validators (${label})`, () => {
    it.each(GOOD_EMAILS)("accepts %s", (email) => {
      expect(mod.isValidEmail(email)).toBe(true);
    });
    it.each(BAD_EMAILS)("rejects an email with %s", (_why, email) => {
      expect(mod.isValidEmail(email)).toBe(false);
    });

    it("accepts real mobile numbers and rejects test numbers", () => {
      expect(mod.isValidMobile("9342245724")).toBe(true);
      expect(mod.isValidMobile("6123456789")).toBe(true);
      for (const n of ["9999999999", "6666666666", "9876543210", "5123456789", "934224572", "93422457245", "93422abcde"]) {
        expect(mod.isValidMobile(n)).toBe(false);
      }
      expect(mod.cleanMobile("+91 93422-45724")).toBe("9342245724");
      expect(mod.cleanMobile("09342245724")).toBe("9342245724");
    });

    it("accepts names in letters and rejects numeric names", () => {
      for (const n of ["Asha", "Vimal Kanna M", "O'Neil", "Anne-Marie", "J. R. Rao", "வினோத்", "राहुल"]) {
        expect(mod.isValidName(n)).toBe(true);
      }
      for (const n of ["12345", "Asha1", "A", "  ", "<script>", "Asha_", "x".repeat(81)]) {
        expect(mod.isValidName(n)).toBe(false);
      }
    });
  });
}
