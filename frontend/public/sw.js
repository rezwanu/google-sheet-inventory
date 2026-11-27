/* Enterprise POS & Inventory PWA Service Worker
 * - শুধু স্ট্যাটিক অ্যাপ শেল ও ফন্ট/JS/CSS অ্যাসেট ক্যাশ করে
 * - Google Apps Script, কুরিয়ার, SMS বা কোনো POST/GET API কল ইন্টারসেপ্ট করে না (ডাটা সুরক্ষা)
 */
const CACHE_NAME = 'enterprise-pos-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg']).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Google Apps Script, বহিরাগত API বা non-http প্রোটোকল কখনো ক্যাশ করবেন না
  if (
    url.origin !== self.location.origin ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com')
  ) {
    return;
  }

  // নেভিগেশন রিকোয়েস্ট (HTML): Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // স্ট্যাটিক JS/CSS/Image অ্যাসেট: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
