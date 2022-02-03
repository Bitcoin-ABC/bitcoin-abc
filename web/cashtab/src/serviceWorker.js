import { clientsClaim } from 'workbox-core';
import { setCacheNameDetails } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

clientsClaim();
self.skipWaiting();

// cofingure prefix, suffix, and cacheNames
const prefix = 'cashtab';
const suffix = 'v1.0.1';
const staticAssetsCache = `static-assets`;

// configure prefix and suffix for default cache names
setCacheNameDetails({
    prefix: prefix,
    suffix: suffix,
    precache: staticAssetsCache,
});

// injection point for static assets caching
precacheAndRoute(self.__WB_MANIFEST);

// A response is only cacheable if
//  - status code is 200
//  - it has a blockhash - meaning it has been confirmed
const isResponseCacheable = async (
    response,
    checkResponseDataForCacheableConditons,
) => {
    // TODO: add error checking
    //  response must be of type Response
    //  checkResponseDataForCacheableConditons() must be a function
    let cachable = false;
    if (response && response.status === 200) {
        const clonedResponse = response.clone();
        const clonedResponseData = await clonedResponse.json();
        if (checkResponseDataForCacheableConditons(clonedResponseData)) {
            cachable = true;
        }
    }

    return cachable;
};

const createCustomPlugin = checkResponseDataForCacheableConditons => {
    return {
        cacheWillUpdate: async ({ response }) => {
            const cacheable = await isResponseCacheable(
                response,
                checkResponseDataForCacheableConditons,
            );
            if (cacheable) {
                return response;
            }
            return null;
        },
    };
};

const blockhashExistsInTxResponse = responseBodyJson => {
    return responseBodyJson && responseBodyJson.blockhash;
};

const blockhashExistsInSlpTxResponse = responseBodyJson => {
    return (
        responseBodyJson &&
        responseBodyJson.retData &&
        responseBodyJson.retData.blockhash
    );
};

// Caching TX and Token Details using CacheFirst Strategy
const txDetailsCaches = [
    {
        // ecash tx
        path: '/rawtransactions/getRawTransaction/',
        name: `${prefix}-tx-data-${suffix}`,
        customPlugin: createCustomPlugin(blockhashExistsInTxResponse),
    },
    {
        // slp tx
        path: '/slp/txDetails/',
        name: `${prefix}-slp-tx-data-${suffix}`,
        customPlugin: createCustomPlugin(blockhashExistsInSlpTxResponse),
    },
];

txDetailsCaches.forEach(cache => {
    registerRoute(
        ({ url }) => url.pathname.includes(cache.path),
        new CacheFirst({
            cacheName: cache.name,
            plugins: [
                cache.customPlugin,
                new ExpirationPlugin({
                    maxEntries: 1000,
                    maxAgeSeconds: 365 * 24 * 60 * 60,
                }),
            ],
        }),
    );
});
