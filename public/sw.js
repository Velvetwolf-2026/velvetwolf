const CACHE_NAME = "velvetwolf-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/logo.png",
  "/vw-logo.png",
  "/manifest.json"
];

// Install Service Worker and cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell and static assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker and clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch events: Network first for navigation (HTML), Cache first for static assets
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip caching for API calls, Supabase DB operations, or Cashfree requests
  if (
    requestUrl.pathname.includes("/api/") ||
    requestUrl.href.includes("supabase.co") ||
    requestUrl.href.includes("cashfree.com")
  ) {
    return;
  }

  // Network-first strategy for navigation requests (HTML/page loads) to prevent stale index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Update cache with the latest index.html
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: try to serve cached index.html or root
          const cachedIndex = await caches.match("/index.html");
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match("/");
          if (cachedRoot) return cachedRoot;
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        })
    );
    return;
  }

  // Cache-first strategy for other static assets (images, fonts, scripts, stylesheets)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // No network and not in cache, return fallback response
          return new Response("Network error", { status: 480, statusText: "Network Error" });
        });
    })
  );
});
