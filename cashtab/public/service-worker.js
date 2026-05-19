// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName)),
            );

            await self.clients.claim();

            const clients = await self.clients.matchAll({ type: 'window' });
            await Promise.all(
                clients.map(client => {
                    if ('navigate' in client) {
                        return client.navigate(client.url);
                    }

                    return undefined;
                }),
            );

            await self.registration.unregister();
        })(),
    );
});
