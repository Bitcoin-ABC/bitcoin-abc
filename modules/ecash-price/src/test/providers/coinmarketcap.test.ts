// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { CoinMarketCapProvider } from '../../providers/coinmarketcap';
import { Fiat, CryptoTicker, Period } from '../../types';

const originalFetch = global.fetch;
let mockFetch: typeof fetch;

const API_KEY = 'test-cmc-api-key';

const xecUsdQuote = {
    symbol: 'USD',
    price: 1.241e-5,
    last_updated: '2026-01-06T12:17:53.000Z',
};

describe('CoinMarketCapProvider', () => {
    beforeEach(() => {
        mockFetch = async (
            _url: string | URL | Request,
            _init?: RequestInit,
        ) => {
            throw new Error('Mock fetch not configured');
        };
        global.fetch = mockFetch as typeof fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe('constructor', () => {
        it('should allow constructing without an API key', () => {
            const provider = new CoinMarketCapProvider();
            expect(provider.toJSON()).to.equal('coinmarketcap');
        });
    });

    describe('fetchPrices', () => {
        it('should return empty array for empty sources or quotes', async () => {
            const provider = new CoinMarketCapProvider();
            let result = await provider.fetchPrices({
                sources: [],
                quotes: [],
            });
            expect(result.prices).to.be.an('array').that.has.length(0);
            result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [],
            });
            expect(result.prices).to.be.an('array').that.has.length(0);
            result = await provider.fetchPrices({
                sources: [],
                quotes: [Fiat.USD],
            });
            expect(result.prices).to.be.an('array').that.has.length(0);
        });

        it('should fetch single source single quote successfully', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [xecUsdQuote],
                    },
                ],
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[0].quote).to.equal(Fiat.USD);
            expect(result.prices[0].provider).to.equal(provider);
            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[0].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[0].lastUpdated?.toISOString()).to.equal(
                '2026-01-06T12:17:53.000Z',
            );
            expect(result.prices[0].error).to.equal(undefined);
        });

        it('should fetch multiple sources single quote successfully', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [
                            {
                                symbol: 'USD',
                                price: 1.0,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                        ],
                    },
                    {
                        id: 1,
                        symbol: 'BTC',
                        quote: [
                            {
                                symbol: 'USD',
                                price: 50000,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                        ],
                    },
                    {
                        id: 1027,
                        symbol: 'ETH',
                        quote: [
                            {
                                symbol: 'USD',
                                price: 3000,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                        ],
                    },
                ],
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC, CryptoTicker.BTC, CryptoTicker.ETH],
                quotes: [Fiat.USD],
            });

            expect(result.prices).to.have.length(3);
            expect(result.prices[0].price).to.equal(1.0);
            expect(result.prices[1].price).to.equal(50000);
            expect(result.prices[2].price).to.equal(3000);
            expect(result.prices.every(p => p.error === undefined)).to.equal(
                true,
            );
        });

        it('should fetch single source multiple quotes successfully', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [
                            {
                                symbol: 'USD',
                                price: 1.241e-5,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                            {
                                symbol: 'EUR',
                                price: 1.06e-5,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                            {
                                symbol: 'BTC',
                                price: 1.32515e-10,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                        ],
                    },
                ],
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD, Fiat.EUR, CryptoTicker.BTC],
            });

            expect(result.prices).to.have.length(3);
            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[1].price).to.equal(1.06e-5);
            expect(result.prices[2].price).to.equal(1.32515e-10);
        });

        it('should handle unsupported source', async () => {
            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC, new CryptoTicker('unsupported')],
                quotes: [Fiat.USD],
            });
            expect(result.prices).to.have.length(2);
            expect(result.prices[0].error).to.equal(
                'Unsupported crypto ticker: unsupported',
            );
        });

        it('should handle HTTP errors', async () => {
            mockFetch = async () => {
                return {
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].error).to.equal('HTTP 401: Unauthorized');
            expect(result.prices[0].price).to.equal(undefined);
        });

        it('should handle missing source data in response', async () => {
            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => ({ data: [] }),
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].error).to.equal(
                'Invalid response: missing 10791 data',
            );
        });

        it('should handle missing quote in response', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [xecUsdQuote],
                    },
                ],
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD, Fiat.EUR],
            });

            expect(result.prices).to.have.length(2);
            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[1].error).to.equal(
                'Quote eur not found in response',
            );
        });

        it('should handle invalid price data', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [
                            {
                                symbol: 'USD',
                                price: 0,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                            {
                                symbol: 'EUR',
                                price: -1,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                        ],
                    },
                ],
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD, Fiat.EUR],
            });

            expect(result.prices[0].error).to.equal(
                'Invalid price data for usd',
            );
            expect(result.prices[1].error).to.equal(
                'Invalid price data for eur',
            );
        });

        it('should handle network errors', async () => {
            mockFetch = async () => {
                throw new Error('Network error');
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result.prices[0].error).to.equal(
                'Failed to fetch: Network error',
            );
        });

        it('should omit API key header and use keyless base when no key', async () => {
            let capturedHeaders: HeadersInit | undefined;
            let capturedUrl: string | undefined;
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [xecUsdQuote],
                    },
                ],
            };

            mockFetch = async (
                url: string | URL | Request,
                init?: RequestInit,
            ) => {
                capturedUrl = url.toString();
                capturedHeaders = init?.headers;
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(capturedUrl).to.include(
                'pro-api.coinmarketcap.com/public-api/v3/cryptocurrency/quotes/latest',
            );
            expect(capturedHeaders).to.deep.equal({
                Accept: 'application/json',
            });
        });

        it('should include API key in headers and a timeout signal', async () => {
            let capturedHeaders: HeadersInit | undefined;
            let capturedSignal: AbortSignal | undefined | null;
            let capturedUrl: string | undefined;
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [xecUsdQuote],
                    },
                ],
            };

            mockFetch = async (
                url: string | URL | Request,
                init?: RequestInit,
            ) => {
                capturedUrl = url.toString();
                capturedHeaders = init?.headers;
                capturedSignal = init?.signal;
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider({ apiKey: API_KEY });
            await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(capturedUrl).to.include(
                'pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/latest',
            );
            expect(capturedUrl).to.not.include('/public-api/');
            expect(capturedHeaders).to.deep.equal({
                'Accept': 'application/json',
                'X-CMC_PRO_API_KEY': API_KEY,
            });
            expect(capturedSignal).to.be.instanceOf(AbortSignal);
        });

        it('should return error entries when the request times out', async () => {
            mockFetch = async (
                _url: string | URL | Request,
                init?: RequestInit,
            ) => {
                return new Promise((_resolve, reject) => {
                    const signal = init?.signal;
                    if (!signal) {
                        reject(new Error('Missing abort signal'));
                        return;
                    }
                    if (signal.aborted) {
                        reject(
                            signal.reason ??
                                new DOMException(
                                    'The operation was aborted.',
                                    'AbortError',
                                ),
                        );
                        return;
                    }
                    signal.addEventListener('abort', () => {
                        reject(
                            signal.reason ??
                                new DOMException(
                                    'The operation was aborted.',
                                    'AbortError',
                                ),
                        );
                    });
                });
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider({
                timeoutMs: 1,
            });
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].error).to.match(/^Failed to fetch:/);
            expect(result.prices[0].price).to.equal(undefined);
        });

        it('should use custom API base URL when provided', async () => {
            let capturedUrl: string | undefined;
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [xecUsdQuote],
                    },
                ],
            };

            mockFetch = async (url: string | URL | Request) => {
                capturedUrl = url.toString();
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider({
                apiKey: API_KEY,
                apiBase: 'https://sandbox-api.coinmarketcap.com',
            });
            await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(capturedUrl).to.include(
                'sandbox-api.coinmarketcap.com/v3/cryptocurrency/quotes/latest',
            );
            expect(capturedUrl).to.include('id=10791');
            expect(capturedUrl).to.include('convert=USD');
        });

        it('should handle missing last_updated', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [
                            {
                                symbol: 'USD',
                                price: 1.241e-5,
                            },
                        ],
                    },
                ],
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[0].lastUpdated).to.equal(undefined);
        });
    });

    describe('fetchStats', () => {
        it('should fetch 24h statistics successfully', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 10791,
                        symbol: 'XEC',
                        quote: [
                            {
                                symbol: 'USD',
                                price: 1.0e-5,
                                market_cap: 200000000,
                                volume_24h: 5000000,
                                percent_change_24h: 2.5,
                                last_updated: '2026-01-06T12:17:53.000Z',
                            },
                        ],
                    },
                ],
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const stats = await provider.fetchStats(
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                Period.HOURS_24,
            );

            expect(stats).to.not.equal(null);
            expect(stats?.currentPrice).to.equal(1.0e-5);
            expect(stats?.marketCap).to.equal(200000000);
            expect(stats?.volume).to.equal(5000000);
            expect(stats?.priceChangePercent).to.equal(0.025);
            expect(stats?.priceChangeValue).to.equal(1.0e-5 * 0.025);
        });

        it('should return null for unsupported period', async () => {
            const provider = new CoinMarketCapProvider();
            const stats = await provider.fetchStats(
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                '1h' as Period,
            );
            expect(stats).to.equal(null);
        });

        it('should return null on HTTP error', async () => {
            mockFetch = async () => {
                return {
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinMarketCapProvider();
            const stats = await provider.fetchStats(
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                Period.HOURS_24,
            );
            expect(stats).to.equal(null);
        });
    });

    describe('toString and toJSON', () => {
        it('should return correct string representations', () => {
            const provider = new CoinMarketCapProvider();
            expect(provider.toString()).to.equal('CoinMarketCap');
            expect(provider.toJSON()).to.equal('coinmarketcap');
        });
    });
});
