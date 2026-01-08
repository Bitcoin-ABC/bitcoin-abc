// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { QuoteCurrency, PriceRequest } from './types';
import { CryptoTicker } from './types';
import type { PriceProvider } from './provider';
import { ProviderStrategy } from './strategy';

/**
 * Main price API client
 */
export class XECPrice {
    private providers: PriceProvider[];
    private strategy: ProviderStrategy;

    constructor(
        providers: PriceProvider[],
        strategy: ProviderStrategy = ProviderStrategy.FALLBACK,
    ) {
        this.providers = providers;
        this.strategy = strategy;
    }

    /**
     * Get current XEC price against a quote currency
     *
     * @param quote - Quote currency, can be a fiat (e.g., Fiat.USD) or crypto (e.g., CryptoTicker.BTC)
     * @returns Price value in units of quote currency per XEC, or null if fetch failed
     */
    async current(quote: QuoteCurrency): Promise<number | null> {
        if (this.strategy !== ProviderStrategy.FALLBACK) {
            throw new Error(`Strategy ${this.strategy} is not implemented yet`);
        }

        const request: PriceRequest = {
            sources: [CryptoTicker.XEC],
            quotes: [quote],
        };

        // Try providers in order, use the first successful response
        for (const provider of this.providers) {
            try {
                const response = await provider.fetchPrices(request);
                const priceData = response.prices.find(
                    p => p.source == CryptoTicker.XEC && p.quote === quote,
                );

                if (!priceData) {
                    continue;
                }

                // Check for error first - if present, price value can't be relied upon
                if (priceData.error) {
                    continue;
                }

                // If we have a valid price, return it
                if (priceData.price !== undefined) {
                    return priceData.price;
                }
            } catch {
                // Provider threw an error, try next one
                continue;
            }
        }

        // All providers failed
        return null;
    }
}
