// Service worker: keeps a copy of the app's own files so it opens fast and can be installed.
// Your tracker data is never cached here – it always comes live from the Google Sheet.
// Japam books are kept separately (cache "rt-books") by the page itself and are never removed here.
const VERSION = 'rt-v6';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'rt-books').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;     // sheet calls go straight to Google
  if (req.mode === 'navigate') {                                          // the page: newest copy first, saved copy if offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // everything else (icons, the PDF reader in lib/): saved copy first; the reader is saved the first time a book is opened
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && url.pathname.indexOf('/lib/') >= 0) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
