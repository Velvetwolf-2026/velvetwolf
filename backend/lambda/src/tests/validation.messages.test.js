// The messages a failed form shows. Zod 4 changed its error API and its
// built-in wording; these pin what customers saw under Zod 3.
import { describe, it, expect } from "vitest";
import { validate } from "../middleware/validate.js";
import { signupSchema, verifyOtpSchema } from "../schemas/auth.schema.js";
import { cartAddSchema, cartRemoveSchema, contactSchema, bulkOrderSchema, checkoutAddressSchema, deleteAccountSchema } from "../schemas/common.schema.js";
import { createProductSchema, updateOrderStatusSchema } from "../schemas/admin.schema.js";

const message = (schema, input) => {
  try {
    validate(schema)(input);
  } catch (err) {
    return err.message;
  }
  return null;
};

const CONTACT = { name: "Asha Rao", email: "asha@example.com", subject: "Order", message: "Where is my parcel?" };
const ADDRESS = { name: "Asha Rao", phone: "9876501234", email: "asha@example.com", address: "12 Main Street", city: "Chennai", state: "Tamil Nadu", pincode: "600001" };
const PRODUCT = { name: "Quiet Tee", collection: "founder", price: 599 };

describe("customer-facing messages", () => {
  it("keeps each field's own message", () => {
    expect(message(signupSchema, { email: "asha@example.com" })).toBe("name: Name is required");
    expect(message(signupSchema, { name: "Asha", email: "asha@" })).toBe("email: Enter a valid email address, like name@example.com.");
    expect(message(contactSchema, { ...CONTACT, email: undefined })).toBe("email: Email is required");
    expect(message(contactSchema, { ...CONTACT, message: "Hi" })).toBe("message: Message must be at least 10 characters");
    expect(message(checkoutAddressSchema, { ...ADDRESS, phone: "12345" })).toBe("phone: Enter a valid 10-digit Indian mobile number.");
    expect(message(checkoutAddressSchema, { ...ADDRESS, pincode: "012345" })).toBe("pincode: Enter a valid 6-digit PIN code");
    expect(message(bulkOrderSchema, { type: "corporate", org: "Acme", contact: "Ravi 2", email: "r@acme.in", qty: 10, message: "Fifty black tees" }))
      .toBe("contact: Enter the contact person's name using letters only.");
    expect(message(verifyOtpSchema, { email: "asha@example.com", otp: "12", type: "email" })).toBe("otp: Invalid OTP format");
    expect(message(cartRemoveSchema, { cartItemId: "not-a-uuid" })).toBe("cartItemId: Cart item ID must be a valid UUID");
  });

  it("keeps required and wrong-type messages apart", () => {
    expect(message(cartAddSchema, { userId: "u1", productId: "p1" })).toBe("quantity: Quantity is required");
    expect(message(cartAddSchema, { userId: "u1", productId: "p1", quantity: "2" })).toBe("quantity: Quantity must be a number");
    expect(message(cartAddSchema, { userId: "u1", productId: "p1", quantity: 1.5 })).toBe("quantity: Quantity must be a whole number");
    expect(message(createProductSchema, { ...PRODUCT, price: undefined })).toBe("price: Price is required");
    expect(message(createProductSchema, { ...PRODUCT, stock: "ten" })).toBe("stock: Stock must be a number");
  });

  it("keeps enum and literal messages", () => {
    expect(message(createProductSchema, { ...PRODUCT, gender: "Kids" })).toBe("gender: Gender must be Unisex, Men or Women.");
    expect(message(createProductSchema, { ...PRODUCT, gender: 3 })).toBe("gender: Gender must be Unisex, Men or Women.");
    expect(message(deleteAccountSchema, { confirm: "delete" })).toBe("confirm: Type DELETE to confirm.");
    expect(message(updateOrderStatusSchema, { status: "lost" }))
      .toBe("status: Status must be one of: pending, confirmed, processing, in_production, dispatched, delivered, cancelled");
  });

  it("keeps Zod 3's wording where a field has no message of its own", () => {
    expect(message(contactSchema, { ...CONTACT, subject: "x".repeat(201) })).toBe("subject: String must contain at most 200 character(s)");
    expect(message(contactSchema, { ...CONTACT, subject: 5 })).toBe("subject: Expected string, received number");
    expect(message(contactSchema, null)).toBe("Expected object, received null");
    expect(message(createProductSchema, { ...PRODUCT, sizes: "M" })).toBe("sizes: Expected array, received string");
    expect(message(createProductSchema, { ...PRODUCT, newImages: [{ fileName: "a.png" }] })).toBe("newImages.0.base64: Required");
    expect(message(bulkOrderSchema, { type: "corporate", org: "Acme", contact: "Ravi", email: "r@acme.in", message: "Fifty black tees" }))
      .toBe("qty: Expected number, received nan");
    expect(message(verifyOtpSchema, { email: "asha@example.com", otp: null, type: "email" })).toBe("otp: Invalid input");
  });

  it("still parses and cleans valid input", () => {
    expect(validate(signupSchema)({ name: "  Asha  Rao ", email: " Asha@Example.com " })).toEqual({ name: "Asha Rao", email: "asha@example.com" });
    expect(validate(checkoutAddressSchema)({ ...ADDRESS, pincode: "600 001", gstin: "kept" })).toMatchObject({ pincode: "600001", district: "", gstin: "kept" });
  });
});
