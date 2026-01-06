// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { PriceRequest, PriceResponse } from '../types';
import type { PriceProvider } from '../provider';

/**
 * Configuration for CoinGecko provider
 */
export interface CoinGeckoConfig {
    /**
     * Optional API key for CoinGecko Pro API
     * Not required for free tier
     */
    apiKey?: string;
    /**
     * Optional custom API base URL
     * Defaults to https://api.coingecko.com/api/v3
     */
    apiBase?: string;
}

/**
 * CoinGecko price provider implementation
 */
export class CoinGeckoProvider implements PriceProvider {
    readonly id = 'coingecko';
    readonly name = 'CoinGecko';
    private readonly apiKey?: string;
    private readonly apiBase: string;

    constructor(config: CoinGeckoConfig = {}) {
        this.apiKey = config.apiKey;
        this.apiBase = config.apiBase ?? 'https://api.coingecko.com/api/v3';
    }

    toString(): string {
        return this.name;
    }

    toJSON(): string {
        return this.id;
    }

    async fetchPrices(request: PriceRequest): Promise<PriceResponse> {
        if (request.quotes.length === 0) {
            return { prices: [] };
        }

        // Build vs_currencies parameter by converting quotes to CoinGecko format
        const vsCurrencies = request.quotes
            .map(quote => quote.toString())
            .join(',');

        const url = `${this.apiBase}/simple/price?ids=ecash&vs_currencies=${vsCurrencies}&include_last_updated_at=true`;

        try {
            const response = await fetch(url, {
                headers: this.apiKey
                    ? { 'x-cg-pro-api-key': this.apiKey }
                    : undefined,
            });

            if (!response.ok) {
                const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                return {
                    prices: request.quotes.map(quote => ({
                        quote,
                        provider: this,
                        error: errorMsg,
                    })),
                };
            }

            const data = (await response.json()) as {
                ecash?: {
                    [currency: string]: number | undefined;
                    last_updated_at?: number;
                };
            };

            const ecashData = data?.ecash;
            if (!ecashData) {
                return {
                    prices: request.quotes.map(quote => ({
                        quote,
                        provider: this,
                        error: 'Invalid response: missing ecash data',
                    })),
                };
            }

            // Extract last_updated_at once (it's a single field, not per currency)
            const lastUpdated = ecashData.last_updated_at
                ? new Date(ecashData.last_updated_at * 1000)
                : undefined;

            return {
                prices: request.quotes.map(quote => {
                    const coinGeckoId = quote.toString();

                    // Check if this quote is missing from the response
                    if (!(coinGeckoId in ecashData)) {
                        return {
                            quote,
                            provider: this,
                            error: `Quote ${coinGeckoId} not found in response`,
                        };
                    }

                    const price = ecashData[coinGeckoId];

                    if (typeof price === 'number' && price > 0) {
                        return {
                            quote,
                            provider: this,
                            price,
                            lastUpdated,
                        };
                    }

                    return {
                        quote,
                        provider: this,
                        error: `Invalid price data for ${coinGeckoId}`,
                    };
                }),
            };
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'Unknown error';
            return {
                prices: request.quotes.map(quote => ({
                    quote,
                    provider: this,
                    error: `Failed to fetch: ${errorMsg}`,
                })),
            };
        }
    }
}
