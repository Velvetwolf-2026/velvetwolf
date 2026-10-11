import { describe, it, expect, vi, beforeEach } from "vitest";

const { createSignedUploadUrl, createSignedUrls, rpc } = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  createSignedUrls: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("../config/supabase.js", () => ({
  supabaseAdmin: { storage: { from: () => ({ createSignedUploadUrl, createSignedUrls }) }, rpc },
}));

const { createUploadUrl, signDesignFiles } = await import("../services/studio.service.js");
const { studioUploadUrl } = await import("../controllers/checkout.controller.js");

const gate = (blocked) => (fn) =>
  Promise.resolve(fn === "check_rate_limit_gate" ? { data: [{ blocked, retry_after_seconds: 600 }], error: null } : { data: null, error: null });

beforeEach(() => {
  vi.clearAllMocks();
  createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: "https://x.supabase.co/storage/v1/object/upload/sign/studio-artwork/p?token=t" }, error: null });
  rpc.mockImplementation(gate(false));
});

describe("studio uploads", () => {
  it("issues a one-time upload URL under a random, server-chosen name", async () => {
    const r = await createUploadUrl({ kind: "artwork", contentType: "image/webp" });
    expect(r.path).toMatch(/^uploads\/[0-9a-f-]{36}\.webp$/);
    expect(r.uploadUrl).toContain("token=");
    expect(createSignedUploadUrl).toHaveBeenCalledWith(r.path);
  });

  it("only accepts printable image types, and PNG proofs", async () => {
    await expect(createUploadUrl({ kind: "artwork", contentType: "application/pdf" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(createUploadUrl({ kind: "proof", contentType: "image/jpeg" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(createUploadUrl({ kind: "other", contentType: "image/png" })).rejects.toMatchObject({ statusCode: 400 });
    const proof = await createUploadUrl({ kind: "proof", contentType: "image/png" });
    expect(proof.path).toMatch(/^proofs\/[0-9a-f-]{36}\.png$/);
  });

  it("says uploads are unavailable when storage refuses (e.g. the bucket is missing)", async () => {
    createSignedUploadUrl.mockResolvedValueOnce({ data: null, error: { message: "Bucket not found" } });
    await expect(createUploadUrl({ kind: "artwork", contentType: "image/png" })).rejects.toMatchObject({ statusCode: 503 });
  });

  it("rate-limits the endpoint per visitor IP", async () => {
    const event = { headers: {}, requestContext: { identity: { sourceIp: "49.36.1.2" } } };
    const res = await studioUploadUrl({ kind: "artwork", contentType: "image/png" }, event);
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith("check_rate_limit_gate", expect.objectContaining({ p_key: "studio-upload:49.36.1.2" }));
    expect(rpc).toHaveBeenCalledWith("record_rate_attempt", { p_key: "studio-upload:49.36.1.2" });

    rpc.mockImplementation(gate(true));
    await expect(studioUploadUrl({ kind: "artwork", contentType: "image/png" }, event)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("gives admins short-lived links to a design's files", async () => {
    createSignedUrls.mockResolvedValueOnce({ data: [{ path: "uploads/a.png", signedUrl: "https://s/a" }, { path: "proofs/b.png", signedUrl: "https://s/b" }], error: null });
    const files = await signDesignFiles({ sides: { front: { artwork: "uploads/a.png", proof: "proofs/b.png" }, back: { mode: "text" } } });
    expect(files).toEqual({ front: { artworkUrl: "https://s/a", proofUrl: "https://s/b" } });
  });
});
