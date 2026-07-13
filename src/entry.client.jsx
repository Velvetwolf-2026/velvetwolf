import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { API_BASE_URL } from "./velvetwolf/utils/api";

// Helper to extract csrf_token value from cookies
function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/(^|;)\s*csrf_token\s*=\s*([^;]+)/);
  return match ? match[2] : "";
}

// Global fetch interceptor to inject credentials: 'include' and X-CSRF-Token header
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : '');
  if (urlStr.startsWith('/') || urlStr.includes(API_BASE_URL)) {
    options = options || {};
    options.credentials = 'include';

    // Inject CSRF token for state-changing requests
    const method = String(options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = getCsrfTokenFromCookie();
      if (csrfToken) {
        options.headers = options.headers || {};
        options.headers['X-CSRF-Token'] = csrfToken;
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
