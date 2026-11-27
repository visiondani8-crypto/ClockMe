// ClockMe offline support: the app opens without signal. Pages come from the network first, then the saved copy.
const CACHE = "clockme-v4";
// Saved on install, so even the first visit works offline afterwards (PDFs need jsPDF).
const CORE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/apple-touch-icon.png", "/vendor/jspdf.umd.min.js",
  "/vendor/fonts/rubik-latin-wght-normal.woff2", "/vendor/fonts/bricolage-grotesque-latin-opsz-normal.woff2"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.pathname.startsWith("/api/") || /(^|\.)posthog\.com$/.test(url.hostname)) return; // usage stats go straight to PostHog
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); return r; }).catch(() => caches.match("/")));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && url.origin === location.origin) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
