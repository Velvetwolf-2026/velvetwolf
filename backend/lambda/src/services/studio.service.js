// Studio (custom tee) support: artwork uploads and the server-side check of a
// studio design before it is ordered.
//
// Files go straight from the browser to the private "studio-artwork" storage
// bucket with a one-time signed upload URL, so large images never pass through
// the Lambda (6 MB payload limit). The bucket itself caps size and file types
// (see schema.sql).
import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

export const STUDIO_BUCKET = "studio-artwork";

// Must match src/velvetwolf/gallery/data.js (STUDIO_PRICE, STUDIO_BOTH_SIDES).
export const STUDIO_PRICE = 2290;
export const STUDIO_BOTH_SIDES = 300;

const UPLOAD_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };
const COLORS = ["noir", "bone", "sand", "forest", "crimson"];
const INKS = ["bone", "noir", "sand", "forest", "crimson"];
const MARKS = ["wordmark", "monogram", "horizon", "contour", "nocturne"];
const FONTS = ["display", "body"];
const MAX_TEXT = 60;

const ARTWORK_PATH = /^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|svg)$/;
const PROOF_PATH = /^proofs\/[0-9a-f-]{36}\.png$/;

function logContext(context = {}) {
  return { service: "studio", ...context };
}

// Must match the "STUDIO ARTWORK STORAGE" migration in schema.sql.
const BUCKET_OPTIONS = { public: false, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: Object.keys(UPLOAD_TYPES) };

const isMissingBucket = (error) =>
  /bucket not found/i.test(String(error?.message || "")) || String(error?.statusCode || error?.status || "") === "404";

async function ensureBucket() {
  const { error } = await supabaseAdmin.storage.createBucket(STUDIO_BUCKET, BUCKET_OPTIONS);
  if (error && !/already exists/i.test(String(error.message || ""))) {
    logError("Could not create the studio artwork bucket", logContext({ error }));
    return false;
  }
  logInfo("Created the studio artwork bucket (its migration had not been run)", logContext());
  return true;
}

// kind "artwork": the customer's own file. kind "proof": the print area as
// drawn in the studio (PNG), so the printer gets exactly what was approved.
export async function createUploadUrl({ kind, contentType }) {
  const ext = UPLOAD_TYPES[contentType];
  if (!ext) throw new ApiError(400, "Use a PNG, JPG, WebP or SVG file.");
  if (kind !== "artwork" && kind !== "proof") throw new ApiError(400, "Unknown upload type.");
  if (kind === "proof" && ext !== "png") throw new ApiError(400, "Proofs must be PNG.");

  const path = `${kind === "proof" ? "proofs" : "uploads"}/${crypto.randomUUID()}.${ext}`;
  let { data, error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).createSignedUploadUrl(path);
  // The bucket comes from a migration in schema.sql. If that hasn't been run,
  // make the bucket here (same settings) instead of failing every upload.
  if (error && isMissingBucket(error) && await ensureBucket()) {
    ({ data, error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).createSignedUploadUrl(path));
  }
  if (error || !data?.signedUrl) {
    logError("Could not create studio upload URL", logContext({ path, error }));
    throw new ApiError(503, "Uploads aren't available right now. Try again in a few minutes.");
  }
  return { path, uploadUrl: data.signedUrl };
}

const clamp = (n, lo, hi, fallback) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
};

function cleanSide(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  const mode = ["text", "image", "mark"].includes(s.mode) ? s.mode : "text";
  const side = {
    mode,
    text: mode === "text" ? String(s.text || "").slice(0, MAX_TEXT) : "",
    font: FONTS.includes(s.font) ? s.font : "display",
    mark: mode === "mark" && MARKS.includes(s.mark) ? s.mark : null,
    artwork: mode === "image" && ARTWORK_PATH.test(String(s.artwork || "")) ? s.artwork : null,
    artworkName: mode === "image" ? String(s.artworkName || "").slice(0, 120) : "",
    oneInk: s.oneInk !== false,
    scale: clamp(s.scale, 0.5, 1.5, 1),
    offset: clamp(s.offset, -1, 1, 0),
    proof: PROOF_PATH.test(String(s.proof || "")) ? s.proof : null,
  };
  side.used = Boolean((mode === "text" && side.text.trim()) || (mode === "image" && side.artwork) || (mode === "mark" && side.mark));
  if (mode === "image" && s.artwork && !side.artwork) throw new ApiError(400, "Your uploaded artwork is missing. Upload it again in the Studio.");
  return side;
}

// Validates a studio design from the cart and returns it cleaned, with the
// price the server charges for it.
export function checkStudioDesign(customMeta) {
  const meta = customMeta && typeof customMeta === "object" ? customMeta : {};
  const front = cleanSide(meta.sides?.front);
  const back = cleanSide(meta.sides?.back);
  if (!front.used && !back.used) throw new ApiError(400, "Your custom tee has no artwork. Add some in the Studio.");
  const design = {
    kind: "studio",
    color: COLORS.includes(meta.color) ? meta.color : "noir",
    ink: INKS.includes(meta.ink) ? meta.ink : "bone",
    sides: {},
  };
  for (const [name, side] of [["front", front], ["back", back]]) {
    if (!side.used) continue;
    const { used: _used, ...rest } = side;
    design.sides[name] = rest;
  }
  const price = STUDIO_PRICE + (front.used && back.used ? STUDIO_BOTH_SIDES : 0);
  return { design, price };
}

// An SVG is a document that can carry script, so its link always downloads the
// file instead of opening it in the browser. PNG, JPG and WebP open as before.
const isSvg = (path) => /\.svg$/i.test(path);

async function signPaths(paths, expiresIn, options) {
  if (!paths.length) return [];
  const { data, error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).createSignedUrls(paths, expiresIn, options);
  if (error) throw error;
  return data || [];
}

// Short-lived links to a design's files, for the admin order view.
export async function signDesignFiles(design, expiresIn = 60 * 60 * 24) {
  const out = {};
  for (const [name, side] of Object.entries(design?.sides || {})) {
    const paths = [side.artwork, side.proof].filter(Boolean);
    if (!paths.length) continue;
    let data;
    try {
      data = [
        ...(await signPaths(paths.filter((p) => !isSvg(p)), expiresIn)),
        ...(await signPaths(paths.filter(isSvg), expiresIn, { download: true })),
      ];
    } catch (error) {
      logError("Could not sign studio files", logContext({ error }));
      continue;
    }
    const byPath = Object.fromEntries(data.map((d) => [d.path, d.signedUrl]));
    out[name] = { artworkUrl: side.artwork ? byPath[side.artwork] || null : null, proofUrl: side.proof ? byPath[side.proof] || null : null };
  }
  return out;
}
