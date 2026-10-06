import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { isBackendUrl } from "./velvetwolf/utils/api";

// Helper to extract csrf_token value from cookies
function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/(^|;)\s*csrf_token\s*=\s*([^;]+)/);
  return match ? match[2] : "";
}

// The session now lives only in the HttpOnly cookie. Remove the JWT that older
// versions of the site kept in localStorage, where any injected script could
// read it.
try { localStorage.removeItem("token"); } catch { /* storage unavailable */ }

// Global fetch interceptor to inject credentials: 'include' and X-CSRF-Token header.
// Auth is cookie-only, so the backend rejects state-changing requests that
// lack a matching X-CSRF-Token (double-submit check in requireAuth).
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : '');
  if (isBackendUrl(urlStr)) {
    options = { ...(options || {}), credentials: 'include' };

    // Inject CSRF token for state-changing requests
    const method = String(options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = getCsrfTokenFromCookie();
      if (csrfToken) {
        const headers = new Headers(options.headers || {});
        headers.set('X-CSRF-Token', csrfToken);
        options.headers = headers;
      }
    }
  }
  return originalFetch(url, options);
};

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});

// Register Service Worker for PWA support (Production only to avoid caching dev assets/breaking HMR)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  } else {
    // In development, unregister any active service worker to prevent HMR and WebSocket issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[PWA] Development mode: Active Service Worker unregistered to allow HMR.');
          }
        });
      }
    });
  }
}
