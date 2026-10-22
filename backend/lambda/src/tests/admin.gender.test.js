// The gender chosen when uploading a product: saved to products.gender and
// mirrored to the older style label; an upload still works before the
// gender column's migration has run.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { supabaseAdmin, calls } = vi.hoisted(() => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }, calls: [] }));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin }));

const { createAdminProduct, updateAdminProduct } = await import("../services/admin.service.js");
const { createProductSchema } = await import("../schemas/admin.schema.js");

function db(queues) {
  calls.length = 0;
  const fresh = createSupabaseMock(queues, calls);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
}

const BASE = { name: "Quiet Mind Tee", collection: "founder", price: 599, sizes: ["M"], colors: ["Black"], stock: 10 };
const MISSING = { data: null, error: { code: "PGRST204", message: "Could not find the 'gender' column of 'products' in the schema cache" } };

beforeEach(() => vi.clearAllMocks());

describe("product gender", () => {
  it("saves the gender and the matching style label", async () => {
    db({ products: [{ data: { id: "p1" }, error: null }] });
    await createAdminProduct({ ...BASE, gender: "Women" }, "admin-1");
    expect(calls.find((c) => c.method === "insert").payload).toMatchObject({ gender: "Women", style: "Women's Fit" });
  });

  it("defaults to Unisex", async () => {
    db({ products: [{ data: { id: "p1" }, error: null }] });
    await createAdminProduct(BASE, "admin-1");
    expect(calls.find((c) => c.method === "insert").payload).toMatchObject({ gender: "Unisex", style: "Unisex" });
  });

  it("still saves the product when the gender column doesn't exist yet", async () => {
    db({ products: [MISSING, { data: { id: "p1" }, error: null }] });
    const res = await createAdminProduct({ ...BASE, gender: "Men" }, "admin-1");
    expect(res.success).toBe(true);
    const inserts = calls.filter((c) => c.table === "products" && c.method === "insert");
    expect(inserts).toHaveLength(2);
    expect(inserts[1].payload).not.toHaveProperty("gender");
    expect(inserts[1].payload.style).toBe("Men's Fit");
  });

  it("updates both fields together", async () => {
    db({ products: [{ data: { id: "p1" }, error: null }] });
    await updateAdminProduct("p1", { gender: "Men" }, "admin-1");
    expect(calls.find((c) => c.method === "update").payload).toMatchObject({ gender: "Men", style: "Men's Fit" });
  });

  it("only accepts Unisex, Men or Women", () => {
    expect(createProductSchema.safeParse({ ...BASE, gender: "Kids" }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...BASE, gender: "Women" }).success).toBe(true);
  });
});
