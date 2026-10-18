// Studio uploads: the backend hands out a one-time signed URL for the private
// "studio-artwork" bucket and the file goes straight there (no size limit from
// the API). Returns the stored path, which the order references.
import { apiUrl } from "./api";

// Every step has a time limit, so the Studio can never sit on "Uploading" for
// ever: a slow or dead connection ends in a clear error the customer can retry.
const URL_TIMEOUT_MS = 20000;
const PUT_TIMEOUT_MS = 90000; // artwork can be up to 8 MB on a phone connection

async function withTimeout(ms, run) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await run(ctrl.signal);
  } catch (err) {
    if (err?.name === "AbortError") throw new Error("The upload took too long. Check your connection and try again.");
    if (err instanceof TypeError) throw new Error("We couldn't reach the upload service. Check your connection and try again.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadStudioFile(blob, kind) {
  const data = await withTimeout(URL_TIMEOUT_MS, async (signal) => {
    const res = await fetch(apiUrl("/checkout/studio-upload"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, contentType: blob.type }),
      signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.uploadUrl) throw new Error(body.error && body.error !== "Route not found" ? body.error : "Uploads aren't available right now. Try again in a few minutes.");
    return body;
  });

  await withTimeout(PUT_TIMEOUT_MS, async (signal) => {
    const put = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": blob.type, "x-upsert": "false" },
      body: blob,
      signal,
    });
    if (!put.ok) throw new Error("Your artwork didn't upload. Check your connection and try again.");
  });
  return data.path;
}

export const canvasToBlob = (canvas) =>
  new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render the print."))), "image/png");
    } catch (e) {
      reject(e);
    }
  });

// A small PNG of the print for the cart line (keeps localStorage small).
export function thumbnailOf(canvas, max = 160) {
  try {
    const k = Math.min(1, max / Math.max(canvas.width, canvas.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(canvas.width * k));
    c.height = Math.max(1, Math.round(canvas.height * k));
    c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } catch {
    return "";
  }
}
