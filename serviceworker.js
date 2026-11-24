const CACHE_NAME = 'ausgaben-cache-v2'; // bei Änderungen an den gecachten Dateien erhöhen
const ASSETS = ['./index.html', './manifest.json', './icons-192.png', './icons-512.png'];

// Installieren: Assets vorladen, dann neuen SW sofort aktivieren
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(ASSETS);
        await self.skipWaiting(); // Aktiviert den neuen SW sofort
    })());
});

// Aktivieren: alte Caches löschen und bestehende Seiten übernehmen
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

// Fetch-Strategie: "Network First" (für maximale Aktualität, mit Offline-Fallback)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return; // Cache API supported nur GET
    event.respondWith((async () => {
        try {
            const response = await fetch(event.request);
            if (response.status === 200) { // Wenn wir Netz haben, klonen wir die Antwort und packen sie in den Cache
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, response.clone()).catch(() => {}); // Cache-Fehler dürfen die Antwort nicht verhindern
            }
            return response;
        } catch {
            return (await caches.match(event.request)) || Response.error(); // Wenn das Netz weg ist, nimm das Match aus dem Cache
        }
    })());
});
