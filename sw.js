// Service worker: keeps a copy of the game on the device.
// The game page itself: try the internet first (so updates show up), and fall back to the saved copy
// if the connection is slow (over 3 seconds) or offline. Icons and fonts: use the saved copy and refresh it in the background.
const CACHE = 'evo-hoops-v233';
const CORE = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if(r.method !== 'GET') return;
  const page = r.mode === 'navigate' || new URL(r.url).pathname.endsWith('/index.html');
  if(page){
    e.respondWith(new Promise(resolve => {
      let done = false; const fallback = () => caches.match('./index.html').then(c => { if(!done && c){ done = true; resolve(c); } });
      const timer = setTimeout(fallback, 3000);   // slow connection: show the saved copy instead of waiting
      fetch(r).then(res => { clearTimeout(timer); const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); if(!done){ done = true; resolve(res); } })
        .catch(() => { clearTimeout(timer); caches.match('./index.html').then(c => { if(!done){ done = true; resolve(c || Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if(res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
