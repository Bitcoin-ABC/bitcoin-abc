// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { PriceData, PriceRequest, PriceResponse } from '../types';
import { CryptoTicker } from '../types';
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
 * Map a CryptoTicker to a CoinGecko ID
 */
function _toCoingeckoId(ticker: CryptoTicker): string {
    switch (ticker) {
        case CryptoTicker.XEC:
            return 'ecash';
        case CryptoTicker.BTC:
            return 'bitcoin';
        case CryptoTicker.ETH:
            return 'ethereum';
        case CryptoTicker.XMR:
            return 'monero';
        case CryptoTicker.SOL:
            return 'solana';
    }

    throw new Error(`Unsupported crypto ticker: ${ticker}`);
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
        if (request.sources.length === 0 || request.quotes.length === 0) {
            return { prices: [] };
        }

        // Build ids parameter by converting sources to CoinGecko IDs. For now
        // if any source is not supported, throw an error for all of them as we
        // are fetching them all within a single request.
        const sourceIds: string[] = [];
        for (const source of request.sources) {
            try {
                sourceIds.push(_toCoingeckoId(source));
            } catch {
                return {
                    prices: request.sources
                        .map(_ => {
                            return request.quotes.map(quote => {
                                return {
                                    source,
                                    quote,
                                    provider: this,
                                    error: `Unsupported crypto ticker: ${source}`,
                                };
                            });
                        })
                        .flat(),
                };
            }
        }

        // Build vs_currencies parameter by converting quotes to CoinGecko format
        const vsCurrencies = request.quotes
            .map(quote => quote.toString())
            .join(',');

        const url = `${this.apiBase}/simple/price?ids=${sourceIds}&vs_currencies=${vsCurrencies}&include_last_updated_at=true&precision=full`;

        const prices: PriceData[] = [];

        try {
            const response = await fetch(url, {
                headers: this.apiKey
                    ? { 'x-cg-pro-api-key': this.apiKey }
                    : undefined,
            });

            if (!response.ok) {
                const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                return {
                    prices: request.sources
                        .map(source => {
                            return request.quotes.map(quote => {
                                return {
                                    source,
                                    quote,
                                    provider: this,
                                    error: errorMsg,
                                };
                            });
                        })
                        .flat(),
                };
            }

            for (const source of request.sources) {
                const sourceId = _toCoingeckoId(source);
                const data = (await response.json()) as {
                    [sourceId: string]: {
                        [currency: string]: number | undefined;
                        last_updated_at?: number;
                    };
                };
                const sourceData = data[sourceId];
                if (!sourceData) {
                    prices.push(
                        ...request.quotes.map(quote => ({
                            source,
                            quote,
                            provider: this,
                            error: `Invalid response: missing ${sourceId} data`,
                        })),
                    );
                    continue;
                }

                // Extract last_updated_at once (it's a single field, not per currency)
                const lastUpdated = sourceData.last_updated_at
                    ? new Date(sourceData.last_updated_at * 1000)
                    : undefined;

                prices.push(
                    ...request.quotes.map(quote => {
                        const coinGeckoId = quote.toString();

                        // Check if this quote is missing from the response
                        if (!(coinGeckoId in sourceData)) {
                            return {
                                source,
                                quote,
                                provider: this,
                                error: `Quote ${coinGeckoId} not found in response`,
                            };
                        }

                        const price = sourceData[coinGeckoId];

                        if (typeof price === 'number' && price > 0) {
                            return {
                                source,
                                quote,
                                provider: this,
                                price,
                                lastUpdated,
                            };
                        }

                        return {
                            source,
                            quote,
                            provider: this,
                            error: `Invalid price data for ${coinGeckoId}`,
                        };
                    }),
                );
            }
            return { prices };
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'Unknown error';
            return {
                prices: request.sources
                    .map(source => {
                        return request.quotes.map(quote => {
                            return {
                                source,
                                quote,
                                provider: this,
                                error: `Failed to fetch: ${errorMsg}`,
                            };
                        });
                    })
                    .flat(),
            };
        }
    }
}
