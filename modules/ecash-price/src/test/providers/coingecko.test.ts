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
        it('should return empty array for empty sources or quotes', async () => {
            const provider = new CoinGeckoProvider();
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
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result.prices).to.have.length(1);
            expect(result.prices[0].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[0].quote).to.equal(Fiat.USD);
            expect(result.prices[0].provider).to.equal(provider);
            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[0].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[0].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[0].error).to.be.equal(undefined);
        });

        it('should fetch multiple sources single quote successfully', async () => {
            const mockResponse = {
                ecash: {
                    usd: 1.0,
                    last_updated_at: 1767706673,
                },
                bitcoin: {
                    usd: 0.1,
                    last_updated_at: 1767706673,
                },
                ethereum: {
                    usd: 0.01,
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
                sources: [CryptoTicker.XEC, CryptoTicker.BTC, CryptoTicker.ETH],
                quotes: [Fiat.USD],
            });

            expect(result.prices).to.have.length(3);
            expect(result.prices[0].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[0].quote).to.equal(Fiat.USD);
            expect(result.prices[0].provider).to.equal(provider);
            expect(result.prices[0].price).to.equal(1.0);
            expect(result.prices[0].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[0].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[0].error).to.be.equal(undefined);

            expect(result.prices[1].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[1].quote).to.equal(Fiat.USD);
            expect(result.prices[1].provider).to.equal(provider);
            expect(result.prices[1].price).to.equal(0.1);
            expect(result.prices[1].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[1].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[1].error).to.be.equal(undefined);

            expect(result.prices[2].source).to.equal(CryptoTicker.ETH);
            expect(result.prices[2].quote).to.equal(Fiat.USD);
            expect(result.prices[2].provider).to.equal(provider);
            expect(result.prices[2].price).to.equal(0.01);
            expect(result.prices[2].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[2].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[2].error).to.be.equal(undefined);
        });

        it('should fetch single source multiple quotes successfully', async () => {
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
                sources: [CryptoTicker.XEC],
                quotes: [
                    Fiat.USD,
                    Fiat.EUR,
                    Fiat.JPY,
                    CryptoTicker.BTC,
                    CryptoTicker.ETH,
                ],
            });

            expect(result.prices).to.have.length(5);

            expect(result.prices[0].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[0].quote).to.equal(Fiat.USD);
            expect(result.prices[0].provider).to.equal(provider);
            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[0].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[0].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[0].error).to.be.equal(undefined);

            expect(result.prices[1].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[1].quote).to.equal(Fiat.EUR);
            expect(result.prices[1].provider).to.equal(provider);
            expect(result.prices[1].price).to.equal(1.06e-5);
            expect(result.prices[1].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[1].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[1].error).to.be.equal(undefined);

            expect(result.prices[2].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[2].quote).to.equal(Fiat.JPY);
            expect(result.prices[2].provider).to.equal(provider);
            expect(result.prices[2].price).to.equal(0.00194147);
            expect(result.prices[2].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[2].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[2].error).to.be.equal(undefined);

            expect(result.prices[3].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[3].quote).to.equal(CryptoTicker.BTC);
            expect(result.prices[3].provider).to.equal(provider);
            expect(result.prices[3].price).to.equal(1.32515e-10);
            expect(result.prices[3].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[3].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[3].error).to.be.equal(undefined);

            expect(result.prices[4].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[4].quote).to.equal(CryptoTicker.ETH);
            expect(result.prices[4].provider).to.equal(provider);
            expect(result.prices[4].price).to.equal(3.84e-9);
            expect(result.prices[4].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[4].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[4].error).to.be.equal(undefined);
        });

        it('should fetch multiple sources multiple quotes successfully', async () => {
            const mockResponse = {
                bitcoin: {
                    usd: 89824,
                    eur: 76987,
                    jpy: 14089275,
                    btc: 1.0,
                    eth: 29.036698,
                    last_updated_at: 1767880221,
                },
                ecash: {
                    usd: 0.00001158,
                    eur: 0.00000993,
                    jpy: 0.00181693,
                    btc: 1.28888e-10,
                    eth: 3.745e-9,
                    last_updated_at: 1767880213,
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
                sources: [CryptoTicker.XEC, CryptoTicker.BTC],
                quotes: [
                    Fiat.USD,
                    Fiat.EUR,
                    Fiat.JPY,
                    CryptoTicker.BTC,
                    CryptoTicker.ETH,
                ],
            });

            expect(result.prices).to.have.length(10);
            expect(result.prices[0].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[0].quote).to.equal(Fiat.USD);
            expect(result.prices[0].provider).to.equal(provider);
            expect(result.prices[0].price).to.equal(0.00001158);
            expect(result.prices[0].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[0].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[0].error).to.be.equal(undefined);

            expect(result.prices[1].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[1].quote).to.equal(Fiat.EUR);
            expect(result.prices[1].provider).to.equal(provider);
            expect(result.prices[1].price).to.equal(0.00000993);
            expect(result.prices[1].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[1].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[1].error).to.be.equal(undefined);

            expect(result.prices[2].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[2].quote).to.equal(Fiat.JPY);
            expect(result.prices[2].provider).to.equal(provider);
            expect(result.prices[2].price).to.equal(0.00181693);
            expect(result.prices[2].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[2].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[2].error).to.be.equal(undefined);

            expect(result.prices[3].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[3].quote).to.equal(CryptoTicker.BTC);
            expect(result.prices[3].provider).to.equal(provider);
            expect(result.prices[3].price).to.equal(1.28888e-10);
            expect(result.prices[3].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[3].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[3].error).to.be.equal(undefined);

            expect(result.prices[4].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[4].quote).to.equal(CryptoTicker.ETH);
            expect(result.prices[4].provider).to.equal(provider);
            expect(result.prices[4].price).to.equal(3.745e-9);
            expect(result.prices[4].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[4].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[4].error).to.be.equal(undefined);

            expect(result.prices[5].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[5].quote).to.equal(Fiat.USD);
            expect(result.prices[5].provider).to.equal(provider);
            expect(result.prices[5].price).to.equal(89824);
            expect(result.prices[5].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[5].lastUpdated?.getTime()).to.equal(
                1767880221 * 1000,
            );
            expect(result.prices[5].error).to.be.equal(undefined);

            expect(result.prices[6].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[6].quote).to.equal(Fiat.EUR);
            expect(result.prices[6].provider).to.equal(provider);
            expect(result.prices[6].price).to.equal(76987);
            expect(result.prices[6].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[6].lastUpdated?.getTime()).to.equal(
                1767880221 * 1000,
            );
            expect(result.prices[6].error).to.be.equal(undefined);

            expect(result.prices[7].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[7].quote).to.equal(Fiat.JPY);
            expect(result.prices[7].provider).to.equal(provider);
            expect(result.prices[7].price).to.equal(14089275);
            expect(result.prices[7].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[7].lastUpdated?.getTime()).to.equal(
                1767880221 * 1000,
            );
            expect(result.prices[7].error).to.be.equal(undefined);

            expect(result.prices[8].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[8].quote).to.equal(CryptoTicker.BTC);
            expect(result.prices[8].provider).to.equal(provider);
            expect(result.prices[8].price).to.equal(1.0);
            expect(result.prices[8].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[8].lastUpdated?.getTime()).to.equal(
                1767880221 * 1000,
            );
            expect(result.prices[8].error).to.be.equal(undefined);

            expect(result.prices[9].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[9].quote).to.equal(CryptoTicker.ETH);
            expect(result.prices[9].provider).to.equal(provider);
            expect(result.prices[9].price).to.equal(29.036698);
            expect(result.prices[9].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[9].lastUpdated?.getTime()).to.equal(
                1767880221 * 1000,
            );
            expect(result.prices[9].error).to.be.equal(undefined);
        });

        it('should handle missing source in response', async () => {
            const mockResponse = {
                ecash: {
                    usd: 0.00001158,
                    eur: 0.00000993,
                    jpy: 0.00181693,
                    btc: 1.28888e-10,
                    eth: 3.745e-9,
                    last_updated_at: 1767880213,
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
                sources: [CryptoTicker.XEC, CryptoTicker.BTC],
                quotes: [
                    Fiat.USD,
                    Fiat.EUR,
                    Fiat.JPY,
                    CryptoTicker.BTC,
                    CryptoTicker.ETH,
                ],
            });

            expect(result.prices).to.have.length(10);
            expect(result.prices[0].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[0].quote).to.equal(Fiat.USD);
            expect(result.prices[0].provider).to.equal(provider);
            expect(result.prices[0].price).to.equal(0.00001158);
            expect(result.prices[0].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[0].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[0].error).to.be.equal(undefined);

            expect(result.prices[1].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[1].quote).to.equal(Fiat.EUR);
            expect(result.prices[1].provider).to.equal(provider);
            expect(result.prices[1].price).to.equal(0.00000993);
            expect(result.prices[1].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[1].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[1].error).to.be.equal(undefined);

            expect(result.prices[2].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[2].quote).to.equal(Fiat.JPY);
            expect(result.prices[2].provider).to.equal(provider);
            expect(result.prices[2].price).to.equal(0.00181693);
            expect(result.prices[2].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[2].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[2].error).to.be.equal(undefined);

            expect(result.prices[3].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[3].quote).to.equal(CryptoTicker.BTC);
            expect(result.prices[3].provider).to.equal(provider);
            expect(result.prices[3].price).to.equal(1.28888e-10);
            expect(result.prices[3].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[3].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[3].error).to.be.equal(undefined);

            expect(result.prices[4].source).to.equal(CryptoTicker.XEC);
            expect(result.prices[4].quote).to.equal(CryptoTicker.ETH);
            expect(result.prices[4].provider).to.equal(provider);
            expect(result.prices[4].price).to.equal(3.745e-9);
            expect(result.prices[4].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[4].lastUpdated?.getTime()).to.equal(
                1767880213 * 1000,
            );
            expect(result.prices[4].error).to.be.equal(undefined);

            expect(result.prices[5].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[5].quote).to.equal(Fiat.USD);
            expect(result.prices[5].provider).to.equal(provider);
            expect(result.prices[5].price).to.equal(undefined);
            expect(result.prices[5].lastUpdated).to.equal(undefined);
            expect(result.prices[5].error).to.be.equal(
                'Invalid response: missing bitcoin data',
            );

            expect(result.prices[6].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[6].quote).to.equal(Fiat.EUR);
            expect(result.prices[6].provider).to.equal(provider);
            expect(result.prices[6].price).to.equal(undefined);
            expect(result.prices[6].lastUpdated).to.equal(undefined);
            expect(result.prices[6].error).to.be.equal(
                'Invalid response: missing bitcoin data',
            );

            expect(result.prices[7].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[7].quote).to.equal(Fiat.JPY);
            expect(result.prices[7].provider).to.equal(provider);
            expect(result.prices[7].price).to.equal(undefined);
            expect(result.prices[7].lastUpdated).to.equal(undefined);
            expect(result.prices[7].error).to.be.equal(
                'Invalid response: missing bitcoin data',
            );

            expect(result.prices[8].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[8].quote).to.equal(CryptoTicker.BTC);
            expect(result.prices[8].provider).to.equal(provider);
            expect(result.prices[8].price).to.equal(undefined);
            expect(result.prices[8].lastUpdated).to.equal(undefined);
            expect(result.prices[8].error).to.be.equal(
                'Invalid response: missing bitcoin data',
            );

            expect(result.prices[9].source).to.equal(CryptoTicker.BTC);
            expect(result.prices[9].quote).to.equal(CryptoTicker.ETH);
            expect(result.prices[9].provider).to.equal(provider);
            expect(result.prices[9].price).to.equal(undefined);
            expect(result.prices[9].lastUpdated).to.equal(undefined);
            expect(result.prices[9].error).to.be.equal(
                'Invalid response: missing bitcoin data',
            );
        });

        it('should handle unsupported source', async () => {
            const provider = new CoinGeckoProvider();
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
                    status: 429,
                    statusText: 'Too Many Requests',
                } as Response;
            };
            global.fetch = mockFetch as typeof fetch;

            const provider = new CoinGeckoProvider();
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

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
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

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
                sources: [CryptoTicker.XEC],
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
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

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
                sources: [CryptoTicker.XEC],
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
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

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
            await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

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
            await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

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
            const result = await provider.fetchPrices({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[0].lastUpdated).to.be.equal(undefined);
        });

        it('should fetch prices successfully with constructor-built pairs', async () => {
            const mockResponse = {
                ecash: {
                    usd: 1.241e-5,
                    eur: 1.06e-5,
                    btc: 1.32515e-10,
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
                sources: [new CryptoTicker('xec')],
                quotes: [
                    new Fiat('usd'),
                    new Fiat('eur'),
                    new CryptoTicker('btc'),
                ],
            });

            expect(result.prices).to.have.length(3);

            expect(result.prices[0].source.toString()).to.equal('xec');
            expect(result.prices[0].quote.toString()).to.equal('usd');
            expect(result.prices[0].provider).to.equal(provider);
            expect(result.prices[0].price).to.equal(1.241e-5);
            expect(result.prices[0].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[0].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[0].error).to.be.equal(undefined);

            expect(result.prices[1].source.toString()).to.equal('xec');
            expect(result.prices[1].quote.toString()).to.equal('eur');
            expect(result.prices[1].provider).to.equal(provider);
            expect(result.prices[1].price).to.equal(1.06e-5);
            expect(result.prices[1].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[1].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[1].error).to.be.equal(undefined);

            expect(result.prices[2].source.toString()).to.equal('xec');
            expect(result.prices[2].quote.toString()).to.equal('btc');
            expect(result.prices[2].provider).to.equal(provider);
            expect(result.prices[2].price).to.equal(1.32515e-10);
            expect(result.prices[2].lastUpdated).to.be.instanceOf(Date);
            expect(result.prices[2].lastUpdated?.getTime()).to.equal(
                1767706673 * 1000,
            );
            expect(result.prices[2].error).to.be.equal(undefined);
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
