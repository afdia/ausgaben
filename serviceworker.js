const CACHE_NAME = 'ausgaben-cache-v1';
const ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    './icons-192.png',
    './icons-512.png'
];

// 1. Installieren: Dateien in den Cache laden
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting()) // Aktiviert den neuen SW sofort
    );
});

// 2. Aktivieren: Alte Caches löschen, wenn du eine neue Version baust
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Lösche alten Cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Übernimmt sofort die Kontrolle über die Seite
    );
});

// 3. Fetch-Strategie: "Network First" (für maximale Aktualität, mit Offline-Fallback)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Wenn wir Netz haben, klonen wir die Antwort und packen sie in den Cache
                if (networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Wenn das Netz weg ist, nimm das Match aus dem Cache
                return caches.match(event.request);
            })
    );
});
