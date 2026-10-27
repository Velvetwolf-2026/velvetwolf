import { describe, it, expect, vi, beforeEach } from "vitest";

const { createSignedUploadUrl, createSignedUrls, createBucket, rpc } = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  createSignedUrls: vi.fn(),
  createBucket: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("../config/supabase.js", () => ({
  supabaseAdmin: { storage: { from: () => ({ createSignedUploadUrl, createSignedUrls }), createBucket }, rpc },
}));

const { createUploadUrl, signDesignFiles } = await import("../services/studio.service.js");
const { studioUploadUrl } = await import("../controllers/checkout.controller.js");

const gate = (blocked) => (fn) =>
  Promise.resolve(["check_rate_limit_gate", "hit_rate_limit"].includes(fn) ? { data: [{ blocked, retry_after_seconds: 600 }], error: null } : { data: null, error: null });

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

  it("creates the private bucket when its migration hasn't run, then uploads", async () => {
    createSignedUploadUrl.mockResolvedValueOnce({ data: null, error: { message: "Bucket not found" } });
    createBucket.mockResolvedValueOnce({ data: { name: "studio-artwork" }, error: null });
    const r = await createUploadUrl({ kind: "proof", contentType: "image/png" });
    expect(createBucket).toHaveBeenCalledWith("studio-artwork", expect.objectContaining({ public: false }));
    expect(createSignedUploadUrl).toHaveBeenCalledTimes(2);
    expect(r.uploadUrl).toContain("token=");
  });

  it("says uploads are unavailable when storage still refuses", async () => {
    createSignedUploadUrl.mockResolvedValue({ data: null, error: { message: "Bucket not found" } });
    createBucket.mockResolvedValueOnce({ data: null, error: { message: "permission denied" } });
    await expect(createUploadUrl({ kind: "artwork", contentType: "image/png" })).rejects.toMatchObject({ statusCode: 503 });
    createSignedUploadUrl.mockResolvedValueOnce({ data: null, error: { message: "Internal error" } });
    createBucket.mockClear();
    await expect(createUploadUrl({ kind: "artwork", contentType: "image/png" })).rejects.toMatchObject({ statusCode: 503 });
    expect(createBucket).not.toHaveBeenCalled();
  });

  it("rate-limits the endpoint per visitor IP", async () => {
    const event = { headers: {}, requestContext: { identity: { sourceIp: "49.36.1.2" } } };
    const res = await studioUploadUrl({ kind: "artwork", contentType: "image/png" }, event);
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith("hit_rate_limit", expect.objectContaining({ p_key: "studio-upload:49.36.1.2", p_max: 60 }));

    rpc.mockImplementation(gate(true));
    await expect(studioUploadUrl({ kind: "artwork", contentType: "image/png" }, event)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("gives admins short-lived links to a design's files", async () => {
    createSignedUrls.mockResolvedValueOnce({ data: [{ path: "uploads/a.png", signedUrl: "https://s/a" }, { path: "proofs/b.png", signedUrl: "https://s/b" }], error: null });
    const files = await signDesignFiles({ sides: { front: { artwork: "uploads/a.png", proof: "proofs/b.png" }, back: { mode: "text" } } });
    expect(files).toEqual({ front: { artworkUrl: "https://s/a", proofUrl: "https://s/b" } });
  });
});
