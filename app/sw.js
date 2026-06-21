/* Service worker pro appku Průměr.
   Stránka (HTML) = network-first → vždy čerstvá, když jsi online; offline z cache.
   Fonty/ikony/knihovny = stale-while-revalidate (rychlé z cache, na pozadí se obnoví).
   Verzi cache zvyš (v3, v4…) při změnách, ať se stará vyhodí. */
const CACHE = 'prumer-v29';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/supabase\.co|skolaonline\.cz/.test(url.host)) return;   // dynamická data necacheovat

  const isDoc = req.mode === 'navigate' || req.destination === 'document';
  if (isDoc) {
    // network-first: čerstvá stránka online, cache jako záloha offline
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE);
        c.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./'))
            || new Response('Offline', { status: 504 });
      }
    })());
    return;
  }

  // ostatní zdroje: vrať z cache hned a na pozadí obnov
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        caches.open(CACHE).then(c => c.put(req, res.clone()));
      }
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
