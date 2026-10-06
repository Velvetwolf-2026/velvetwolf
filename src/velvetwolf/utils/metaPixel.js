// metaPixel.js
// Helpers for Meta Pixel cookie extraction and client-side utilities

export function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Extracts _fbp (browser ID) and _fbc (click ID) cookies.
 * If _fbc cookie is missing but URL contains fbclid, generates standard _fbc value.
 */
export function getMetaTrackingData() {
  if (typeof window === "undefined") {
    return { fbp: null, fbc: null };
  }

  const fbp = getCookie("_fbp");
  let fbc = getCookie("_fbc");

  if (!fbc) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get("fbclid");
      if (fbclid) {
        // Meta standard format: fb.{subdomainIndex}.{creationTime}.{fbclid}
        fbc = `fb.1.${Date.now()}.${fbclid}`;
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  return { fbp, fbc };
}
