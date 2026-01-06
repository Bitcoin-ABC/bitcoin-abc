// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { CoinGeckoProvider } from '../../providers/coingecko';
import { Fiat, CryptoTicker } from '../../types';

// Mock fetch globally
const originalFetch = global.fetch;
let mockFetch: typeof fetch;

describe('CoinGeckoProvider', () => {
    beforeEach(() => {
        // Reset mock before each test
        mockFetch = async (
            _url: string | URL | Request,
            _init?: RequestInit,
        ) => {
            throw new Error('Mock fetch not configured');
        };
        global.fetch = mockFetch as typeof fetch;
    });

    afterEach(() => {
        // Restore original fetch
        global.fetch = originalFetch;
    });

    describe('fetchPrices', () => {
        it('should return empty array for empty quotes', async () => {
            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({ quotes: [] });
            expect(result.prices).to.be.an('array').that.has.length(0);
        });

        it('should fetch single quote successfully', async () => {
            const mockResponse = {
                ecash: {
                    usd: 1.241e-5,
                    last_updated_at: 1767706673,
                },
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({ quotes: [Fiat.USD] });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].quote).to.equal(Fiat.USD);
            expect(result.prices[0].provider).to.equal(provider);
            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[0].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[0].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[0].error).to.be.equal(undefined);
        });

        it('should fetch multiple quotes successfully', async () => {
            const mockResponse = {
                ecash: {
                    usd: 1.241e-5,
                    eur: 1.06e-5,
                    jpy: 0.00194147,
                    btc: 1.32515e-10,
                    eth: 3.84e-9,
                    last_updated_at: 1767706673,
                },
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({
                quotes: [
                    Fiat.USD,
                    Fiat.EUR,
                    Fiat.JPY,
                    CryptoTicker.BTC,
                    CryptoTicker.ETH,
                ],
            });

            expect(result.prices).to.have.length(5);

            const usdPrice = result.prices.find(p => p.quote === Fiat.USD);
            expect(usdPrice).to.not.be.equal(undefined);
            expect(usdPrice?.quote).to.equal(Fiat.USD);
            expect(usdPrice?.provider).to.equal(provider);
            expect(usdPrice?.price).to.equal(1.241e-5);
            expect(usdPrice?.lastUpdated).to.be.instanceOf(Date);
            expect(usdPrice?.lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(usdPrice?.error).to.be.equal(undefined);

            const eurPrice = result.prices.find(p => p.quote === Fiat.EUR);
            expect(eurPrice).to.not.be.equal(undefined);
            expect(eurPrice?.quote).to.equal(Fiat.EUR);
            expect(eurPrice?.provider).to.equal(provider);
            expect(eurPrice?.price).to.equal(1.06e-5);
            expect(eurPrice?.lastUpdated).to.be.instanceOf(Date);
            expect(eurPrice?.lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(eurPrice?.error).to.be.equal(undefined);

            const jpyPrice = result.prices.find(p => p.quote === Fiat.JPY);
            expect(jpyPrice).to.not.be.equal(undefined);
            expect(jpyPrice?.quote).to.equal(Fiat.JPY);
            expect(jpyPrice?.provider).to.equal(provider);
            expect(jpyPrice?.price).to.equal(0.00194147);
            expect(jpyPrice?.lastUpdated).to.be.instanceOf(Date);
            expect(jpyPrice?.lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(jpyPrice?.error).to.be.equal(undefined);

            const btcPrice = result.prices.find(
                p => p.quote === CryptoTicker.BTC,
            );
            expect(btcPrice).to.not.be.equal(undefined);
            expect(btcPrice?.quote).to.equal(CryptoTicker.BTC);
            expect(btcPrice?.provider).to.equal(provider);
            expect(btcPrice?.price).to.equal(1.32515e-10);
            expect(btcPrice?.lastUpdated).to.be.instanceOf(Date);
            expect(btcPrice?.lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(btcPrice?.error).to.be.equal(undefined);

            const ethPrice = result.prices.find(
                p => p.quote === CryptoTicker.ETH,
            );
            expect(ethPrice).to.not.be.equal(undefined);
            expect(ethPrice?.quote).to.equal(CryptoTicker.ETH);
            expect(ethPrice?.provider).to.equal(provider);
            expect(ethPrice?.price).to.equal(3.84e-9);
            expect(ethPrice?.lastUpdated).to.be.instanceOf(Date);
            expect(ethPrice?.lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(ethPrice?.error).to.be.equal(undefined);
        });

        it('should handle HTTP errors', async () => {
            mockFetch = async () => {
                return {
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({ quotes: [Fiat.USD] });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].error).to.equal(
                'HTTP 429: Too Many Requests',
            );
            expect(result.prices[0].price).to.be.equal(undefined);
            expect(result.prices[0].lastUpdated).to.be.equal(undefined);
        });

        it('should handle missing ecash data in response', async () => {
            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => ({}),
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({ quotes: [Fiat.USD] });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].error).to.equal(
                'Invalid response: missing ecash data',
            );
            expect(result.prices[0].price).to.be.equal(undefined);
            expect(result.prices[0].lastUpdated).to.be.equal(undefined);
        });

        it('should handle missing quote in response', async () => {
            const mockResponse = {
                ecash: {
                    usd: 1.241e-5,
                    last_updated_at: 1767706673,
                },
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({
                quotes: [Fiat.USD, Fiat.EUR],
            });

            expect(result.prices).to.have.length(2);

            const usdPrice = result.prices.find(p => p.quote === Fiat.USD);
            expect(usdPrice?.price).to.equal(1.241e-5);
            expect(usdPrice?.lastUpdated).to.be.instanceOf(Date);
            expect(usdPrice?.lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(usdPrice?.error).to.be.equal(undefined);

            const eurPrice = result.prices.find(p => p.quote === Fiat.EUR);
            expect(eurPrice?.error).to.equal('Quote eur not found in response');
            expect(eurPrice?.price).to.be.equal(undefined);
            expect(eurPrice?.lastUpdated).to.be.equal(undefined);
        });

        it('should handle invalid price data (non-number)', async () => {
            const mockResponse = {
                ecash: {
                    usd: 'invalid',
                    last_updated_at: 1767706673,
                },
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({ quotes: [Fiat.USD] });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].error).to.equal(
                'Invalid price data for usd',
            );
            expect(result.prices[0].price).to.be.equal(undefined);
            expect(result.prices[0].lastUpdated).to.be.equal(undefined);
        });

        it('should handle invalid price data (zero or negative)', async () => {
            const mockResponse = {
                ecash: {
                    usd: 0,
                    eur: -1,
                    last_updated_at: 1767706673,
                },
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({
                quotes: [Fiat.USD, Fiat.EUR],
            });

            expect(result.prices).to.have.length(2);
            expect(result.prices[0].error).to.equal(
                'Invalid price data for usd',
            );
            expect(result.prices[0].lastUpdated).to.be.equal(undefined);
            expect(result.prices[1].error).to.equal(
                'Invalid price data for eur',
            );
            expect(result.prices[1].lastUpdated).to.be.equal(undefined);
        });

        it('should handle network errors', async () => {
            mockFetch = async () => {
                throw new Error('Network error');
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({ quotes: [Fiat.USD] });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].error).to.equal(
                'Failed to fetch: Network error',
            );
            expect(result.prices[0].price).to.be.equal(undefined);
            expect(result.prices[0].lastUpdated).to.be.equal(undefined);
        });

        it('should include API key in headers when provided', async () => {
            let capturedHeaders: HeadersInit | undefined;
            const mockResponse = {
                ecash: {
                    usd: 1.241e-5,
                    last_updated_at: 1767706673,
                },
            };

            mockFetch = async (
                _url: string | URL | Request,
                init?: RequestInit,
            ) => {
                capturedHeaders = init?.headers;
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider({ apiKey: 'test-api-key' });
            await provider.fetchPrices({ quotes: [Fiat.USD] });

            expect(capturedHeaders).to.deep.equal({
                'x-cg-pro-api-key': 'test-api-key',
            });
        });

        it('should use custom API base URL when provided', async () => {
            let capturedUrl: string | undefined;
            const mockResponse = {
                ecash: {
                    usd: 1.241e-5,
                    last_updated_at: 1767706673,
                },
            };

            mockFetch = async (url: string | URL | Request) => {
                capturedUrl = url.toString();
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider({
                apiBase: 'https://pro-api.coingecko.com/api/v3',
            });
            await provider.fetchPrices({ quotes: [Fiat.USD] });

            expect(capturedUrl).to.include('pro-api.coingecko.com');
        });

        it('should handle missing last_updated_at', async () => {
            const mockResponse = {
                ecash: {
                    usd: 1.241e-5,
                },
            };

            mockFetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({ quotes: [Fiat.USD] });

            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[0].lastUpdated).to.be.equal(undefined);
        });
    });

    describe('toString and toJSON', () => {
        it('should return correct string representations', () => {
            const provider = new CoinGeckoProvider();
            expect(provider.toString()).to.equal('CoinGecko');
            expect(provider.toJSON()).to.equal('coingecko');
        });
    });
});
