import { describe, it, expect, vi, beforeEach } from "vitest";

const { upload, createSignedUploadUrl, getPublicUrl, insertResult } = vi.hoisted(() => ({
  upload: vi.fn(),
  createSignedUploadUrl: vi.fn(),
  getPublicUrl: vi.fn((key) => ({ data: { publicUrl: `https://cdn.example/product-images/${key}` } })),
  insertResult: { current: { data: { id: "p1" }, error: null } },
}));

vi.mock("../config/supabase.js", () => {
  const chain = {};
  for (const m of ["insert", "select", "single", "update", "eq", "maybeSingle"]) chain[m] = () => chain;
  chain.then = (resolve) => Promise.resolve(insertResult.current).then(resolve);
  return {
    supabaseAdmin: {
      from: () => chain,
      storage: { from: () => ({ upload, createSignedUploadUrl, getPublicUrl }) },
    },
  };
});

const { createAdminProduct, createProductPhotoUploadUrl } = await import("../services/admin.service.js");

const BASE = { name: "Quiet Mind Oversized Tee", collection: "founder", price: 599, sizes: ["M"], colors: ["Crimson Ember"], stock: 10 };

beforeEach(() => {
  vi.clearAllMocks();
  upload.mockResolvedValue({ error: null });
  insertResult.current = { data: { id: "p1" }, error: null };
});

describe("admin product photos", () => {
  it("stores inline photos under a safe, server-chosen name, never the file's own name", async () => {
    await createAdminProduct({
      ...BASE,
      newImages: [{ base64: "aGk=", fileName: "ChatGPT Image Oct 15, 2026, 11_20 AM #1 (copy) é.png", contentType: "image/jpeg", color: "Crimson Ember" }],
    }, "admin-1");
    const key = upload.mock.calls[0][0];
    expect(key).toMatch(/^\d+_[0-9a-f]{8}\.jpg$/);
  });

  it("keeps the colour tag on the stored URL", async () => {
    upload.mockResolvedValue({ error: null });
    const res = await createAdminProduct({ ...BASE, newImages: [{ base64: "aGk=", fileName: "x.jpg", contentType: "image/jpeg", color: "Crimson Ember" }] }, "admin-1");
    expect(res.success).toBe(true);
    expect(getPublicUrl).toHaveBeenCalled();
  });

  it("says in plain words why a photo failed to save, keeping the raw error for the logs", async () => {
    const raw = { message: "The resource already exists" };
    upload.mockResolvedValue({ error: raw });
    await expect(createAdminProduct({ ...BASE, newImages: [{ base64: "aGk=", fileName: "x.jpg", contentType: "image/jpeg" }] }, "admin-1"))
      .rejects.toMatchObject({ statusCode: 502, message: "Couldn't save a product photo. A file with that name already exists.", cause: raw });
  });

  it("says in plain words why the product failed to save", async () => {
    insertResult.current = { data: null, error: { code: "42703", message: 'column "fit" does not exist' } };
    await expect(createAdminProduct(BASE, "admin-1")).rejects.toMatchObject({
      statusCode: 500,
      message: "Couldn't save the product. The database needs its latest update (run the newest migration in schema.sql).",
    });
  });

  it("issues a one-time upload link for a direct photo upload", async () => {
    createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: "https://x.supabase.co/upload/sign?token=t" }, error: null });
    const r = await createProductPhotoUploadUrl({ contentType: "image/webp" });
    expect(r.path).toMatch(/^\d+_[0-9a-f]{8}\.webp$/);
    expect(r.uploadUrl).toContain("token=");
    expect(r.publicUrl).toContain(r.path);
    await expect(createProductPhotoUploadUrl({ contentType: "application/pdf" })).rejects.toMatchObject({ statusCode: 400 });
  });
});
