// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { PricePair, PriceRequest, PriceResponse } from './types';
import type { PriceProvider } from './provider';
import { ProviderStrategy } from './strategy';

/**
 * Fetch prices as batch
 */
export class PriceFetcher {
    private providers: PriceProvider[];
    private strategy: ProviderStrategy;
    private cacheExpiryMs: number;

    private cachedResponse?: PriceResponse;

    constructor(
        providers: PriceProvider[],
        strategy: ProviderStrategy = ProviderStrategy.FALLBACK,
        cacheExpiryMs: number = 60 * 1000, // 30 seconds
    ) {
        this.providers = providers;
        this.strategy = strategy;
        this.cacheExpiryMs = cacheExpiryMs;
    }

    /**
     * @param pair - Pair of source cryptocurrency and quote currency
     * @returns True if the cache is dirty and fetching is needed, false otherwise
     */
    private isCacheDirty(pair: PricePair): boolean {
        // If the cache is not set, it is dirty
        if (!this.cachedResponse) {
            return true;
        }

        // If the cache doesn't contain the requested price, it is dirty
        const priceData = this.cachedResponse?.prices.find(
            p => p.source === pair.source && p.quote === pair.quote,
        );
        if (!priceData) {
            return true;
        }

        // If the cache is expired, it is dirty
        if (
            Date.now() - (priceData.lastUpdated?.getTime() ?? 0) >=
            this.cacheExpiryMs
        ) {
            return true;
        }

        return false;
    }

    /**
     * Fetch prices for the given request and cache the response.
     * Note that this will always refresh the cache, even if the request is
     * the same as the cached response.
     *
     * @param request - Price request, can contain multiple quote currencies
     * @returns True if the fetch was successful and the cache populated, false otherwise
     */
    async fetch(request: PriceRequest): Promise<boolean> {
        if (this.strategy !== ProviderStrategy.FALLBACK) {
            throw new Error(`Strategy ${this.strategy} is not implemented yet`);
        }

        for (const provider of this.providers) {
            try {
                // We assume all providers should be able to fetch all the
                // requested prices, so we return the response directly and
                // don't try to merge the results.
                const response = await provider.fetchPrices(request);
                this.cachedResponse = response;
                return true;
            } catch {
                // Provider threw an error, try next one
                continue;
            }
        }

        // If all providers failed, clear the cache
        this.cachedResponse = undefined;
        return false;
    }

    /**
     * Get the current pair price.
     * This uses the cache if available, otherwise it fetches the price.
     *
     * @param pair - Pair of source cryptocurrency and quote currency
     * @returns Price value in units of quote currency per source cryptocurrency, or null if fetch failed
     */
    async current(pair: PricePair): Promise<number | null> {
        if (
            this.isCacheDirty(pair) &&
            !(await this.fetch({
                sources: [pair.source],
                quotes: [pair.quote],
            }))
        ) {
            return null;
        }

        return (
            this.cachedResponse?.prices.find(
                p => p.source === pair.source && p.quote === pair.quote,
            )?.price ?? null
        );
    }

    /**
     * Get the current prices for the given pairs.
     * This uses the cache if available, otherwise it fetches the prices.
     *
     * @param pairs - Array of pairs of source cryptocurrency and quote currency
     * @returns Array of prices, or null if fetch failed for any pair. Ordering
     * is preserved.
     */
    async currentPairs(pairs: PricePair[]): Promise<(number | null)[]> {
        // Check upfront if the cache is dirty for any pair so we return fresh
        // data for all of them if we need to fetch.
        const isCacheDirty = pairs.some(pair => this.isCacheDirty(pair));
        if (
            isCacheDirty &&
            !(await this.fetch({
                sources: pairs.map(pair => pair.source),
                quotes: pairs.map(pair => pair.quote),
            }))
        ) {
            return pairs.map(() => null);
        }

        return pairs.map(
            pair =>
                this.cachedResponse?.prices.find(
                    p => p.source === pair.source && p.quote === pair.quote,
                )?.price ?? null,
        );
    }
}
