// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Unregister legacy service workers and delete Cache Storage entries.
 *
 * Cashtab no longer uses a service worker. This cleanup is intentionally scoped
 * to browser caches; wallet storage in localStorage and IndexedDB is preserved.
 */
export const cleanupLegacyServiceWorkers = async () => {
    if (
        import.meta.env.VITE_BUILD_ENV === 'extension' ||
        !('serviceWorker' in navigator)
    ) {
        return;
    }

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
            registrations.map(registration => registration.unregister()),
        );

        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName)),
            );
        }
    } catch (error) {
        console.error('Error cleaning up legacy service workers:', error);
    }
};
