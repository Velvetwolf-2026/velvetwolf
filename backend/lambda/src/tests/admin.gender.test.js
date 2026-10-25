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

describe("Top 5 designs fields", () => {
  it("saves the Top 5 position and print artwork, and frees that position elsewhere", async () => {
    db({ products: [{ data: { id: "p1" }, error: null }, { data: null, error: null }] });
    await createAdminProduct({ ...BASE, top_rank: 2, print_image: "https://cdn.example/p.png" }, "admin-1");
    expect(calls.find((c) => c.table === "products" && c.method === "insert").payload).toMatchObject({ top_rank: 2, print_image: "https://cdn.example/p.png" });
    expect(calls.find((c) => c.table === "products" && c.method === "update").payload).toEqual({ top_rank: null });
  });

  it("still saves when the Top 5 columns don't exist yet", async () => {
    const missing = (col) => ({ data: null, error: { code: "PGRST204", message: `Could not find the '${col}' column of 'products' in the schema cache` } });
    db({ products: [{ data: null, error: null }, missing("print_image"), missing("top_rank"), { data: { id: "p1" }, error: null }] });
    const res = await updateAdminProduct("p1", { top_rank: 1, print_image: "https://cdn.example/p.png", name: "Tee" }, "admin-1");
    expect(res.success).toBe(true);
    const updates = calls.filter((c) => c.table === "products" && c.method === "update").map((c) => c.payload);
    expect(updates.at(-1)).toEqual({ name: "Tee" });
  });

  it("only accepts positions 1 to 5 and https artwork", () => {
    expect(createProductSchema.safeParse({ ...BASE, top_rank: 6 }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...BASE, top_rank: null }).success).toBe(true);
    expect(createProductSchema.safeParse({ ...BASE, print_image: "http://x/p.png" }).success).toBe(false);
  });
});
