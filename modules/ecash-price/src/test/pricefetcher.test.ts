// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { PriceFetcher } from '../pricefetcher';
import { MockProvider } from './fixture/mockprovider';
import {
    Fiat,
    CryptoTicker,
    PriceRequest,
    QuoteCurrency,
    Period,
} from '../types';
import { ProviderStrategy } from '../strategy';

describe('PriceFetcher', () => {
    describe('fetch', () => {
        it('should throw error for unsupported strategy', async () => {
            const provider = new MockProvider({});
            const fetcher = new PriceFetcher(
                [provider],
                'unsupported' as ProviderStrategy,
            );

            try {
                await fetcher.fetch({
                    sources: [CryptoTicker.XEC],
                    quotes: [Fiat.USD],
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
                expect((err as Error).message).to.equal(
                    'Strategy unsupported is not implemented yet',
                );
            }
        });

        it('should return true when first provider succeeds', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                price: 0.0001,
            });
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(true);
        });

        it('should fallback to second provider when first fails', async () => {
            const provider1 = new MockProvider({ shouldSucceed: false });
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(true);
        });

        it('should fallback to second provider when first throws', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: true,
            });
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(true);
        });

        it('should return false when all providers fail', async () => {
            // Providers that throw are considered failures by fetch()
            const provider1 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: true,
            });
            const provider2 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: true,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(false);
        });

        it('should return false when all providers throw', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: true,
            });
            const provider2 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: true,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(false);
        });

        it('should cache the response after successful fetch', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 0.0001,
            });
            const fetcher = new PriceFetcher([provider]);

            await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            // Verify cache is set by checking if current() returns without fetching
            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(price).to.equal(0.0001);
        });

        it('should fallback to next provider when provider returns error in price data', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
            });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider1,
                        error: 'Error fetching price',
                    },
                ],
            };
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(true);

            // Verify we got the price from provider2
            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(price).to.equal(0.0002);
        });

        it('should fallback to next provider when provider does not return all requested prices', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
            });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider1,
                        price: 0.0001,
                        lastUpdated: new Date(),
                    },
                    // Missing XEC/EUR pair
                ],
            };
            const provider2 = new MockProvider({
                shouldSucceed: true,
            });
            provider2.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider2,
                        price: 0.0002,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider2,
                        price: 0.00018,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD, Fiat.EUR],
            });

            expect(result).to.equal(true);

            // Verify we got prices from provider2
            const usdPrice = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });
            const eurPrice = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.EUR,
            });

            expect(usdPrice).to.equal(0.0002);
            expect(eurPrice).to.equal(0.00018);
        });

        it('should fallback to next provider when provider returns wrong pair', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
            });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR, // Wrong quote - we requested USD
                        provider: provider1,
                        price: 0.0001,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(true);

            // Verify we got the price from provider2
            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(price).to.equal(0.0002);
        });

        it('should fallback to next provider when provider returns wrong source', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
            });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.BTC, // Wrong source - we requested XEC
                        quote: Fiat.USD,
                        provider: provider1,
                        price: 50000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(true);

            // Verify we got the price from provider2
            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(price).to.equal(0.0002);
        });

        it('should return false when all providers return errors in price data', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
            });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider1,
                        error: 'Error from provider 1',
                    },
                ],
            };
            const provider2 = new MockProvider({
                shouldSucceed: true,
            });
            provider2.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider2,
                        error: 'Error from provider 2',
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD],
            });

            expect(result).to.equal(false);
        });

        it('should return false when all providers return incomplete prices', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
            });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider1,
                        price: 0.0001,
                        lastUpdated: new Date(),
                    },
                    // Missing XEC/EUR
                ],
            };
            const provider2 = new MockProvider({
                shouldSucceed: true,
            });
            provider2.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider2,
                        price: 0.0002,
                        lastUpdated: new Date(),
                    },
                    // Also missing XEC/EUR
                ],
            };
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.fetch({
                sources: [CryptoTicker.XEC],
                quotes: [Fiat.USD, Fiat.EUR],
            });

            expect(result).to.equal(false);
        });
    });

    describe('current', () => {
        it('should throw error for unsupported strategy when the cache is dirty', async () => {
            const provider = new MockProvider({});
            const fetcher = new PriceFetcher(
                [provider],
                'unsupported' as ProviderStrategy,
            );

            try {
                await fetcher.current({
                    source: CryptoTicker.XEC,
                    quote: Fiat.USD,
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
                expect((err as Error).message).to.equal(
                    'Strategy unsupported is not implemented yet',
                );
            }
        });

        it('should fetch and return price when cache is not set', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 0.0001,
            });
            const fetcher = new PriceFetcher([provider]);

            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(price).to.equal(0.0001);
        });

        it('should return price from cache when available and not expired', async () => {
            const now = Date.now();
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            // Set a response with a recent timestamp to ensure cache is valid
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0001,
                        lastUpdated: new Date(now - 1000), // 1 second ago
                    },
                ],
            };
            const fetcher = new PriceFetcher(
                [provider],
                ProviderStrategy.FALLBACK,
                60000,
            );

            // First call to populate cache
            const firstPrice = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });
            expect(firstPrice).to.equal(0.0001);

            // Change provider to return different price
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0002,
                        lastUpdated: new Date(),
                    },
                ],
            };

            // Second call should use cache (not fetch from provider)
            const secondPrice = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(secondPrice).to.equal(0.0001); // Should be cached value, not new value
        });

        it('should fetch when cache is expired', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 0.0001,
            });
            // Set cache expiry to 0ms to force immediate expiry
            const fetcher = new PriceFetcher(
                [provider],
                ProviderStrategy.FALLBACK,
                0,
            );

            // First call to populate cache
            await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            // Change provider response to return new price
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0002,
                        lastUpdated: new Date(),
                    },
                ],
            };

            // Second call should fetch new price (cache expired due to 0ms expiry)
            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(price).to.equal(0.0002); // Should be new value
        });

        it('should fetch when cache does not contain requested pair', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 0.0001,
            });
            const fetcher = new PriceFetcher([provider]);

            // First call to populate cache with XEC/USD
            await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            // Setup provider to return EUR price
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 0.00009,
                        lastUpdated: new Date(),
                    },
                ],
            };

            // Request EUR pair - should fetch since it's not in cache
            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.EUR,
            });

            expect(price).to.equal(0.00009);
        });

        it('should return null when fetch fails', async () => {
            const provider = new MockProvider({ shouldSucceed: false });
            const fetcher = new PriceFetcher([provider]);

            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(price).to.be.equal(null);
        });

        it('should return null when price data is missing from response', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                response: {
                    prices: [],
                },
            });
            const fetcher = new PriceFetcher([provider]);

            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(price).to.be.equal(null);
        });

        it('should work with cryptocurrency quotes', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                shouldThrow: false,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: CryptoTicker.BTC,
                        provider: provider,
                        price: 1.32515e-10,
                        lastUpdated: new Date(1767706673 * 1000),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);

            const price = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: CryptoTicker.BTC,
            });

            expect(price).to.equal(1.32515e-10);
        });

        it('should handle multiple sources and quotes in cache', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0001,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 0.00009,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.BTC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 50000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher(
                [provider],
                ProviderStrategy.FALLBACK,
                60000,
            );

            // Fetch all prices at once
            await fetcher.fetch({
                sources: [CryptoTicker.XEC, CryptoTicker.BTC],
                quotes: [Fiat.USD, Fiat.EUR],
            });

            // All should be available from cache
            const xecUsd = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });
            const xecEur = await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.EUR,
            });
            const btcUsd = await fetcher.current({
                source: CryptoTicker.BTC,
                quote: Fiat.USD,
            });

            expect(xecUsd).to.equal(0.0001);
            expect(xecEur).to.equal(0.00009);
            expect(btcUsd).to.equal(50000);
        });
    });

    describe('currentPairs', () => {
        it('should return array of prices for multiple pairs', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0001,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 0.00009,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.BTC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 50000,
                        lastUpdated: new Date(),
                    },
                    {
                        // Include BTC/EUR to satisfy all combinations check,
                        // since currentPairs attempts to fetch them all
                        source: CryptoTicker.BTC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 45000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);

            const prices = await fetcher.currentPairs([
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.XEC, quote: Fiat.EUR },
                { source: CryptoTicker.BTC, quote: Fiat.USD },
            ]);

            expect(prices).to.have.length(3);
            expect(prices[0]).to.equal(0.0001);
            expect(prices[1]).to.equal(0.00009);
            expect(prices[2]).to.equal(50000);
        });

        it('should preserve ordering of pairs', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0001,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 0.00009,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.BTC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 50000,
                        lastUpdated: new Date(),
                    },
                    {
                        // Include BTC/EUR to satisfy all combinations check
                        // since currentPairs attempts to fetch them all
                        source: CryptoTicker.BTC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 45000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);

            const pairs = [
                { source: CryptoTicker.BTC, quote: Fiat.USD },
                { source: CryptoTicker.XEC, quote: Fiat.EUR },
                { source: CryptoTicker.XEC, quote: Fiat.USD },
            ];

            const prices = await fetcher.currentPairs(pairs);

            expect(prices).to.have.length(3);
            // Order should match input order
            expect(prices[0]).to.equal(50000); // BTC/USD
            expect(prices[1]).to.equal(0.00009); // XEC/EUR
            expect(prices[2]).to.equal(0.0001); // XEC/USD
        });

        it('should return null for pairs that fail to fetch', async () => {
            const provider = new MockProvider({ shouldSucceed: false });
            const fetcher = new PriceFetcher([provider]);

            const prices = await fetcher.currentPairs([
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.XEC, quote: Fiat.EUR },
            ]);

            expect(prices).to.have.length(2);
            expect(prices[0]).to.be.equal(null);
            expect(prices[1]).to.be.equal(null);
        });

        it('should handle mix of cached and uncached pairs', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            const now = Date.now();
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0001,
                        lastUpdated: new Date(now - 1000), // 1 second ago
                    },
                ],
            };
            const fetcher = new PriceFetcher(
                [provider],
                ProviderStrategy.FALLBACK,
                60000,
            );

            // First call to cache USD
            await fetcher.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            // Update provider to return both USD and EUR
            // Since EUR is not cached, currentPairs will fetch all pairs together
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0002,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 0.00009,
                        lastUpdated: new Date(),
                    },
                ],
            };

            // Request both USD (cached) and EUR (not cached)
            // Since any pair is dirty, currentPairs fetches all pairs together
            const prices = await fetcher.currentPairs([
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.XEC, quote: Fiat.EUR },
            ]);

            expect(prices).to.have.length(2);
            // Both prices come from the fresh fetch (not from cache)
            expect(prices[0]).to.equal(0.0002); // From fresh fetch
            expect(prices[1]).to.equal(0.00009); // From fresh fetch
        });

        it('should handle duplicate pairs and only fetch unique source/quote combinations', async () => {
            let fetchCallCount = 0;
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            // Track fetch calls by wrapping the fetchPrices method
            const originalFetchPrices = provider.fetchPrices.bind(provider);
            let fetchedSources: CryptoTicker[] = [];
            let fetchedQuotes: QuoteCurrency[] = [];
            provider.fetchPrices = async (request: PriceRequest) => {
                fetchCallCount += 1;
                // Verify that sources and quotes are deduplicated
                // currentPairs should deduplicate before calling fetch
                fetchedSources = request.sources;
                fetchedQuotes = request.quotes;
                expect(fetchedSources.length).to.equal(2); // XEC and BTC (unique)
                expect(fetchedQuotes.length).to.equal(2); // USD and EUR (unique)
                expect(fetchedSources).to.include(CryptoTicker.XEC);
                expect(fetchedSources).to.include(CryptoTicker.BTC);
                expect(fetchedQuotes).to.include(Fiat.USD);
                expect(fetchedQuotes).to.include(Fiat.EUR);
                return originalFetchPrices(request);
            };

            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.0001,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 0.00009,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.BTC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 50000,
                        lastUpdated: new Date(),
                    },
                    {
                        // Include BTC/EUR to satisfy all combinations check
                        // since currentPairs deduplicates and fetches all unique combinations
                        source: CryptoTicker.BTC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 45000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);

            // Pass duplicate pairs - same pair appears multiple times
            const pairs = [
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.XEC, quote: Fiat.USD }, // Duplicate
                { source: CryptoTicker.XEC, quote: Fiat.EUR },
                { source: CryptoTicker.BTC, quote: Fiat.USD },
                { source: CryptoTicker.XEC, quote: Fiat.USD }, // Duplicate again
            ];

            const prices = await fetcher.currentPairs(pairs);

            // Should return a price for each pair, including duplicates
            expect(prices).to.have.length(5);
            // All XEC/USD pairs should return the same price
            expect(prices[0]).to.equal(0.0001); // First XEC/USD
            expect(prices[1]).to.equal(0.0001); // Duplicate XEC/USD
            expect(prices[2]).to.equal(0.00009); // XEC/EUR
            expect(prices[3]).to.equal(50000); // BTC/USD
            expect(prices[4]).to.equal(0.0001); // Duplicate XEC/USD again

            // Verify all duplicates return the same price
            expect(prices[0]).to.equal(prices[1]);
            expect(prices[0]).to.equal(prices[4]);

            // Verify fetch was only called once (efficiency check)
            // The fetch should deduplicate sources and quotes
            expect(fetchCallCount).to.equal(1);
        });
    });
    describe('instance checking', () => {
        it('should find prices in cache when the types are built from constructor', async () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);

            const price = await fetcher.current({
                source: new CryptoTicker('xec'),
                quote: new Fiat('usd'),
            });

            expect(price).to.equal(0.00001241);
        });
    });

    describe('stats', () => {
        it('should throw error for unsupported strategy', async () => {
            const provider = new MockProvider({});
            const fetcher = new PriceFetcher(
                [provider],
                'unsupported' as ProviderStrategy,
            );

            try {
                await fetcher.stats(
                    { source: CryptoTicker.XEC, quote: Fiat.USD },
                    Period.HOURS_24,
                );
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
                expect((err as Error).message).to.equal(
                    'Strategy unsupported is not implemented yet',
                );
            }
        });

        it('should return statistics when first provider succeeds', async () => {
            const statistics = {
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
                currentPrice: 0.0001,
                marketCap: 2000000000,
                volume: 50000000,
                priceChangeValue: 0.0000025,
                priceChangePercent: 0.025, // 2.5% as decimal factor
            };

            const provider1 = new MockProvider({
                statistics,
            });
            const provider2 = new MockProvider({
                statistics: {
                    ...statistics,
                    currentPrice: 0.0002,
                },
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.stats(
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                Period.HOURS_24,
            );

            expect(result).to.not.be.equal(null);
            expect(result).to.deep.equal(statistics);
        });

        it('should fallback to second provider when first returns null', async () => {
            const statistics = {
                source: CryptoTicker.BTC,
                quote: Fiat.USD,
                currentPrice: 50000,
                marketCap: 1000000000000,
                volume: 20000000000,
                priceChangeValue: -500,
                priceChangePercent: -0.01, // -1% as decimal factor
            };

            const provider1 = new MockProvider({});
            const provider2 = new MockProvider({
                statistics,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.stats(
                { source: CryptoTicker.BTC, quote: Fiat.USD },
                Period.HOURS_24,
            );

            expect(result).to.not.be.equal(null);
            expect(result).to.deep.equal(statistics);
        });

        it('should fallback to second provider when first throws', async () => {
            const statistics = {
                source: CryptoTicker.ETH,
                quote: Fiat.EUR,
                currentPrice: 2000,
                marketCap: 250000000000,
                volume: 10000000000,
                priceChangeValue: 50,
                priceChangePercent: 0.025, // 2.5% as decimal factor
            };

            const provider1 = new MockProvider({
                shouldThrow: true,
            });
            const provider2 = new MockProvider({
                statistics,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.stats(
                { source: CryptoTicker.ETH, quote: Fiat.EUR },
                Period.HOURS_24,
            );

            expect(result).to.not.be.equal(null);
            expect(result).to.deep.equal(statistics);
        });

        it('should return null when all providers fail', async () => {
            const provider1 = new MockProvider({});
            const provider2 = new MockProvider({});
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.stats(
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                Period.HOURS_24,
            );

            expect(result).to.be.equal(null);
        });

        it('should return null when all providers throw', async () => {
            const provider1 = new MockProvider({
                shouldThrow: true,
            });
            const provider2 = new MockProvider({
                shouldThrow: true,
            });
            const fetcher = new PriceFetcher([provider1, provider2]);

            const result = await fetcher.stats(
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                Period.HOURS_24,
            );

            expect(result).to.be.equal(null);
        });

        it('should work with cryptocurrency quote currency', async () => {
            const statistics = {
                source: CryptoTicker.XEC,
                quote: CryptoTicker.BTC,
                currentPrice: 0.0000000001,
                marketCap: 1000,
                volume: 50,
                priceChangeValue: 0.0000000000025,
                priceChangePercent: 0.025, // 2.5% as decimal factor
            };

            const provider = new MockProvider({
                statistics,
            });
            const fetcher = new PriceFetcher([provider]);

            const result = await fetcher.stats(
                { source: CryptoTicker.XEC, quote: CryptoTicker.BTC },
                Period.HOURS_24,
            );

            expect(result).to.not.be.equal(null);
            expect(result).to.deep.equal(statistics);
        });
    });
});
