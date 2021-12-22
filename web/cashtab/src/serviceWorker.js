import { clientsClaim } from 'workbox-core';
import { setCacheNameDetails } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

clientsClaim();
self.skipWaiting();

// cofingure prefix, suffix, and cacheNames
const prefix = 'cashtab';
const suffix = 'v1.0.0';
const staticAssetsCache = `static-assets`;

// configure prefix and suffix for default cache names
setCacheNameDetails({
    prefix: prefix,
    suffix: suffix,
    precache: staticAssetsCache,
});

// injection point for static assets caching
precacheAndRoute(self.__WB_MANIFEST);

// Caching TX and Token Details using CacheFirst Strategy
const txDetailsCaches = [
    {
        // ecash tx
        path: '/rawtransactions/getRawTransaction/',
        name: `${prefix}-tx-data-${suffix}`,
    },
    {
        // slp tx
        path: '/slp/txDetails/',
        name: `${prefix}-slp-tx-data-${suffix}`,
    },
    {
        // slp token
        path: '/slp/tokenStats/',
        name: `${prefix}-slp-token-stats-${suffix}`,
    },
];

txDetailsCaches.forEach(cache => {
    registerRoute(
        ({ url }) => url.pathname.includes(cache.path),
        new CacheFirst({
            cacheName: cache.name,
            plugins: [
                new CacheableResponsePlugin({
                    statuses: [200],
                }),
                new ExpirationPlugin({
                    maxEntries: 1000,
                    maxAgeSeconds: 365 * 24 * 60 * 60,
                }),
            ],
        }),
    );
});
