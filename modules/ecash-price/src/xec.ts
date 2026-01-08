// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { QuoteCurrency } from './types';
import { CryptoTicker } from './types';
import type { PriceProvider } from './provider';
import { ProviderStrategy } from './strategy';
import { PriceFetcher } from './pricefetcher';

/**
 * Main price API client for XEC
 * Specialized wrapper around PriceFetcher that always fetches XEC prices
 */
export class XECPrice {
    private fetcher: PriceFetcher;

    constructor(
        providers: PriceProvider[],
        strategy: ProviderStrategy = ProviderStrategy.FALLBACK,
        cacheExpiryMs: number = 0, // Default: no caching
    ) {
        this.fetcher = new PriceFetcher(providers, strategy, cacheExpiryMs);
    }

    /**
     * Get current XEC price against a quote currency
     *
     * @param quote - Quote currency, can be a fiat (e.g., Fiat.USD) or crypto (e.g., CryptoTicker.BTC)
     * @returns Price value in units of quote currency per XEC, or null if fetch failed
     */
    async current(quote: QuoteCurrency): Promise<number | null> {
        return this.fetcher.current({
            source: CryptoTicker.XEC,
            quote: quote,
        });
    }
}
