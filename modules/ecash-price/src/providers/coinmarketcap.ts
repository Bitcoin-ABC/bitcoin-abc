// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type {
    PriceData,
    PriceRequest,
    PriceResponse,
    PricePair,
    Statistics,
} from '../types';
import { CryptoTicker, Period } from '../types';
import type { PriceProvider } from '../provider';

/**
 * Configuration for CoinMarketCap provider
 */
export interface CoinMarketCapConfig {
    /**
     * Optional API key for the CoinMarketCap Pro API.
     * When omitted, the keyless Public API is used.
     */
    apiKey?: string;
    /**
     * Optional custom API base URL.
     * Defaults to the Pro API when apiKey is set, otherwise the keyless
     * Public API (`…/public-api`).
     */
    apiBase?: string;
    /**
     * Request timeout in milliseconds
     * Defaults to 10000
     */
    timeoutMs?: number;
}

/** Default timeout for CoinMarketCap HTTP requests */
const DEFAULT_TIMEOUT_MS = 10_000;

const PRO_API_BASE = 'https://pro-api.coinmarketcap.com';
const KEYLESS_API_BASE = 'https://pro-api.coinmarketcap.com/public-api';

/**
 * CoinMarketCap quote entry for a single convert currency
 */
interface CmcQuote {
    symbol?: string;
    price?: number;
    volume_24h?: number;
    market_cap?: number;
    percent_change_24h?: number;
    last_updated?: string;
}

/**
 * CoinMarketCap cryptocurrency payload for quotes/latest
 */
interface CmcCrypto {
    id: number;
    symbol: string;
    quote?: CmcQuote[] | Record<string, CmcQuote>;
}

type CmcData = CmcCrypto[] | Record<string, CmcCrypto | CmcCrypto[]>;

/**
 * Map a CryptoTicker to a CoinMarketCap cryptocurrency ID
 */
function _toCoinMarketCapId(ticker: CryptoTicker): number {
    switch (ticker.toString()) {
        case CryptoTicker.XEC.toString():
            return 10791;
        case CryptoTicker.BTC.toString():
            return 1;
        case CryptoTicker.ETH.toString():
            return 1027;
        case CryptoTicker.XMR.toString():
            return 328;
        case CryptoTicker.SOL.toString():
            return 5426;
        case CryptoTicker.USDT.toString():
            return 825;
    }

    throw new Error(`Unsupported crypto ticker: ${ticker}`);
}

/**
 * Build PriceData error entries for every source/quote pair
 */
function _errorPrices(
    request: PriceRequest,
    provider: PriceProvider,
    error: string,
): PriceData[] {
    return request.sources
        .map(source => {
            return request.quotes.map(quote => {
                return {
                    source,
                    quote,
                    provider,
                    error,
                };
            });
        })
        .flat();
}

/**
 * Find a cryptocurrency payload by CMC id across v2/v3 response shapes
 */
function _findCrypto(data: CmcData, sourceId: number): CmcCrypto | undefined {
    if (Array.isArray(data)) {
        return data.find(entry => entry.id === sourceId);
    }
    const raw = data[String(sourceId)];
    return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Find a quote entry by convert currency across v2/v3 response shapes
 */
function _findQuote(
    quote: CmcQuote[] | Record<string, CmcQuote> | undefined,
    convertKey: string,
): CmcQuote | undefined {
    if (!quote) {
        return undefined;
    }
    if (Array.isArray(quote)) {
        return quote.find(entry => entry.symbol?.toUpperCase() === convertKey);
    }
    return quote[convertKey];
}

/**
 * CoinMarketCap price provider implementation
 */
export class CoinMarketCapProvider implements PriceProvider {
    readonly id = 'coinmarketcap';
    readonly name = 'CoinMarketCap';
    private readonly apiKey?: string;
    private readonly apiBase: string;
    private readonly timeoutMs: number;

    constructor(config: CoinMarketCapConfig = {}) {
        this.apiKey = config.apiKey;
        this.apiBase =
            config.apiBase ?? (this.apiKey ? PRO_API_BASE : KEYLESS_API_BASE);
        this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    }

    toString(): string {
        return this.name;
    }

    toJSON(): string {
        return this.id;
    }

    private _requestHeaders(): HeadersInit {
        const headers: Record<string, string> = {
            Accept: 'application/json',
        };
        if (this.apiKey) {
            headers['X-CMC_PRO_API_KEY'] = this.apiKey;
        }
        return headers;
    }

    async fetchPrices(request: PriceRequest): Promise<PriceResponse> {
        if (request.sources.length === 0 || request.quotes.length === 0) {
            return { prices: [] };
        }

        // Resolve all source tickers to CMC IDs. If any source is unsupported,
        // fail the whole request the same way CoinGeckoProvider does.
        const sourceIds: number[] = [];
        for (const source of request.sources) {
            try {
                sourceIds.push(_toCoinMarketCapId(source));
            } catch {
                return {
                    prices: _errorPrices(
                        request,
                        this,
                        `Unsupported crypto ticker: ${source}`,
                    ),
                };
            }
        }

        // CMC convert currencies are uppercase (USD, EUR, BTC, ...)
        const convert = request.quotes
            .map(quote => quote.toString().toUpperCase())
            .join(',');

        // v3 works for both Pro (keyed) and keyless Public API
        const url =
            `${this.apiBase}/v3/cryptocurrency/quotes/latest` +
            `?id=${sourceIds.join(',')}&convert=${convert}`;

        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(this.timeoutMs),
                headers: this._requestHeaders(),
            });

            if (!response.ok) {
                return {
                    prices: _errorPrices(
                        request,
                        this,
                        `HTTP ${response.status}: ${response.statusText}`,
                    ),
                };
            }

            const body = (await response.json()) as { data?: CmcData };

            if (!body.data) {
                return {
                    prices: _errorPrices(
                        request,
                        this,
                        'Invalid response: missing data',
                    ),
                };
            }

            const prices: PriceData[] = [];

            for (const source of request.sources) {
                const sourceId = _toCoinMarketCapId(source);
                const sourceData = _findCrypto(body.data, sourceId);

                if (!sourceData?.quote) {
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

                prices.push(
                    ...request.quotes.map(quote => {
                        const convertKey = quote.toString().toUpperCase();
                        const quoteData = _findQuote(
                            sourceData.quote,
                            convertKey,
                        );

                        if (!quoteData) {
                            return {
                                source,
                                quote,
                                provider: this,
                                error: `Quote ${quote} not found in response`,
                            };
                        }

                        const price = quoteData.price;
                        if (typeof price === 'number' && price > 0) {
                            return {
                                source,
                                quote,
                                provider: this,
                                price,
                                lastUpdated: quoteData.last_updated
                                    ? new Date(quoteData.last_updated)
                                    : undefined,
                            };
                        }

                        return {
                            source,
                            quote,
                            provider: this,
                            error: `Invalid price data for ${quote}`,
                        };
                    }),
                );
            }

            return { prices };
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'Unknown error';
            return {
                prices: _errorPrices(
                    request,
                    this,
                    `Failed to fetch: ${errorMsg}`,
                ),
            };
        }
    }

    async fetchStats(
        pair: PricePair,
        period: Period,
    ): Promise<Statistics | null> {
        if (period !== Period.HOURS_24) {
            return null;
        }

        try {
            const sourceId = _toCoinMarketCapId(pair.source);
            const convertKey = pair.quote.toString().toUpperCase();

            const url =
                `${this.apiBase}/v3/cryptocurrency/quotes/latest` +
                `?id=${sourceId}&convert=${convertKey}`;

            const response = await fetch(url, {
                signal: AbortSignal.timeout(this.timeoutMs),
                headers: this._requestHeaders(),
            });

            if (!response.ok) {
                return null;
            }

            const body = (await response.json()) as { data?: CmcData };
            if (!body.data) {
                return null;
            }

            const sourceData = _findCrypto(body.data, sourceId);
            const quoteData = _findQuote(sourceData?.quote, convertKey);
            if (!quoteData) {
                return null;
            }

            const price = quoteData.price;
            const marketCap = quoteData.market_cap;
            const volume = quoteData.volume_24h;
            const priceChangePercentFromApi = quoteData.percent_change_24h;

            if (
                typeof price !== 'number' ||
                typeof marketCap !== 'number' ||
                typeof volume !== 'number' ||
                typeof priceChangePercentFromApi !== 'number'
            ) {
                return null;
            }

            // CMC returns percent as e.g. 2.5 for 2.5%; convert to decimal factor
            const priceChangePercent = priceChangePercentFromApi / 100;
            const priceChangeValue = price * priceChangePercent;

            return {
                source: pair.source,
                quote: pair.quote,
                currentPrice: price,
                marketCap,
                volume,
                priceChangeValue,
                priceChangePercent,
            };
        } catch {
            return null;
        }
    }
}
