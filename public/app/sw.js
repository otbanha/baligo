// 峇里手帳 service worker：讓 /app/ 沒網路也能打開。
// 頁面採 network-first（有網路就拿最新版），離線時用快取；
// /_astro/ 的 JS、CSS 檔名含 hash，採 cache-first。
const CACHE = 'bali-journal-v1';
const SHELL = ['/app/', '/app/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bali-journal-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' && url.pathname.startsWith('/app')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/app/', copy));
          return res;
        })
        .catch(() => caches.match('/app/')),
    );
    return;
  }

  if (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/fonts/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
