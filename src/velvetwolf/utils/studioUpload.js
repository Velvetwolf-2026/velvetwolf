// Studio uploads: the backend hands out a one-time signed URL for the private
// "studio-artwork" bucket and the file goes straight there (no size limit from
// the API). Returns the stored path, which the order references.
import { apiUrl } from "./api";

export async function uploadStudioFile(blob, kind) {
  const res = await fetch(apiUrl("/checkout/studio-upload"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, contentType: blob.type }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "We couldn't upload your artwork. Try again.");

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": blob.type, "x-upsert": "false" },
    body: blob,
  });
  if (!put.ok) throw new Error("Your artwork didn't upload. Check your connection and try again.");
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
