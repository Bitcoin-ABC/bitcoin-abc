workbox.setConfig({
    debug: false,
});

workbox.core.skipWaiting();
workbox.core.clientsClaim();

const cachedPathNames = [
    '/v2/transaction/details',
    '/v2/rawtransactions/getRawTransaction',
    '/v2/slp/validateTxid',
];

workbox.routing.registerRoute(
    ({ url, event }) =>
        cachedPathNames.some(cachedPathName =>
            url.pathname.includes(cachedPathName),
        ),
    async ({ event, url }) => {
        try {
            const cache = await caches.open('api-cache');
            const cacheKeys = await cache.keys();
            if (cacheKeys.length > 100) {
                await Promise.all(cacheKeys.map(key => cache.delete(key)));
            }
            const requestBody = await event.request.clone().text();

            try {
                const response = await cache.match(
                    `${url.pathname}/${requestBody}`,
                );
                if (!response) {
                    throw new Error('SW: Not cached!');
                }
                return response;
            } catch (error) {
                const response = await fetch(event.request.clone());
                if (response.status === 200) {
                    const body = await response.clone().text();
                    cache.put(
                        `${url.pathname}/${requestBody}`,
                        new Response(body, { status: 200 }),
                    );
                }
                return response.clone();
            }
        } catch (err) {
            return fetch(event.request.clone());
        }
    },
    'POST',
);
