// Keeps a copy of the app on the phone so it opens with no signal.
// Load the app once with signal; after that it starts from this cache.
// Bump CACHE when this file changes so old copies are cleared.
const CACHE = 'site-report-v1';
const NETWORK_TIMEOUT_MS = 4000;
const CORE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Finds the built JS/CSS files (names change on every build) by reading
// index.html and the main script, so lazy-loaded chunks (PDF export) are cached too.
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  const html = await (await cache.match('/index.html')).text();
  const assets = new Set(html.match(/\/assets\/[\w.-]+\.(?:js|css)/g) || []);
  for (const url of [...assets]) {
    if (!url.endsWith('.js')) continue;
    try {
      const js = await (await fetch(url)).text();
      // Chunks are referenced as "assets/x.js" or relative to the script, "./x.js"
      (js.match(/assets\/[\w.-]+\.(?:js|css)/g) || []).forEach(a => assets.add('/' + a));
      (js.match(/["']\.\/[\w.-]+\.(?:js|css)/g) || []).forEach(a => assets.add('/assets/' + a.slice(3)));
    } catch (e) { /* the main script is still cached below */ }
  }
  await cache.addAll([...assets]);

  // Google Fonts: the stylesheet is imported from our CSS; cache it and its font files
  // so text (and the PDF) looks the same offline.
  for (const url of assets) {
    if (!url.endsWith('.css')) continue;
    try {
      const css = await (await cache.match(url)).text();
      for (const fontCssUrl of css.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^'")\s]+/g) || []) {
        const res = await fetch(fontCssUrl);
        if (!res.ok) continue;
        await cache.put(fontCssUrl, res.clone());
        const files = (await res.text()).match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [];
        await Promise.all(files.map(f => fetch(f).then(r => r.ok && cache.put(f, r)).catch(() => {})));
      }
    } catch (e) { /* fonts are optional; the app still works with fallback fonts */ }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(r => { clearTimeout(t); resolve(r); }, e => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  // AI requests always go to the network; the app handles being offline itself.
  if (sameOrigin && url.pathname.startsWith('/api/')) return;

  // Pages: try the network (so updates arrive), fall back to the saved copy
  // when there's no signal or the connection is too slow.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await withTimeout(fetch(req), NETWORK_TIMEOUT_MS);
        if (res.ok) cache.put('/index.html', res.clone());
        return res;
      } catch (e) {
        return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Built files and fonts: use the saved copy, refresh it in the background.
  if (sameOrigin || isFont) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      // ignoreVary: Google Fonts responses vary by request type, which would
      // otherwise stop the saved copy from matching when there's no signal.
      const cached = await cache.match(req, { ignoreVary: true });
      const network = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      });
      if (cached) {
        event.waitUntil(network.catch(() => {}));
        return cached;
      }
      return network;
    })());
  }
});
