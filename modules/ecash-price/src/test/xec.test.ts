// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { XECPrice } from '../xec';
import { CoinGeckoProvider } from '../providers/coingecko';
import { Fiat, CryptoTicker } from '../types';
import { ProviderStrategy } from '../strategy';
import { MockProvider } from './fixture/mockprovider';

describe('XECPrice', () => {
    describe('current', () => {
        it('should throw error for unsupported strategy', async () => {
            const api = new XECPrice(
                [new MockProvider({})],
                'unsupported' as ProviderStrategy,
            );

            try {
                await api.current(Fiat.USD);
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
                expect((err as Error).message).to.equal(
                    'Strategy unsupported is not implemented yet',
                );
            }
        });

        it('should return price from first successful provider', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                price: 0.0001,
            });
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            });
            const api = new XECPrice([provider1, provider2]);

            const price = await api.current(Fiat.USD);

            // Should return provider1's price since it's first
            expect(price).to.equal(0.0001);
        });

        it('should fallback to second provider when first fails', async () => {
            const provider1 = new MockProvider({ shouldSucceed: false }); // Fails
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            }); // Succeeds
            const api = new XECPrice([provider1, provider2]);

            const price = await api.current(Fiat.USD);

            // Should return provider2's price since provider1 failed
            expect(price).to.equal(0.0002);
        });

        it('should fallback to second provider when first throws', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: true,
            }); // Throws
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            }); // Succeeds
            const api = new XECPrice([provider1, provider2]);

            const price = await api.current(Fiat.USD);

            // Should return provider2's price since provider1 threw
            expect(price).to.equal(0.0002);
        });

        it('should return null when all providers fail', async () => {
            const provider1 = new MockProvider({ shouldSucceed: false });
            const provider2 = new MockProvider({ shouldSucceed: false });
            const api = new XECPrice([provider1, provider2]);

            const price = await api.current(Fiat.USD);

            expect(price).to.be.equal(null);
        });

        it('should return null when all providers throw', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: true,
            });
            const provider2 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: true,
            });
            const api = new XECPrice([provider1, provider2]);

            const price = await api.current(Fiat.USD);

            expect(price).to.be.equal(null);
        });

        it('should return null when price data is missing', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                shouldThrow: false,
                response: {
                    prices: [],
                },
            });
            const api = new XECPrice([provider]);

            const price = await api.current(Fiat.USD);

            expect(price).to.be.equal(null);
        });

        it('should skip provider when quote has error', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: false,
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
                price: 0.0002,
            });
            const api = new XECPrice([provider1, provider2]);

            const price = await api.current(Fiat.USD);

            // Should return provider2's price since provider1 had an error
            expect(price).to.equal(0.0002);
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
            const api = new XECPrice([provider]);

            const price = await api.current(CryptoTicker.BTC);

            expect(price).to.equal(1.32515e-10);
        });

        it('should work with CoinGecko provider', async () => {
            // Mock fetch for CoinGecko
            const originalFetch = global.fetch;
            const mockResponse = {
                ecash: {
                    usd: 1.241e-5,
                    last_updated_at: 1767706673,
                },
            };

            global.fetch = async () => {
                return {
                    ok: true,
                    json: async () => mockResponse,
                } as Response;
            };

            try {
                const provider = new CoinGeckoProvider();
                const api = new XECPrice([provider]);

                const price = await api.current(Fiat.USD);

                expect(price).to.equal(1.241e-5);
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should handle provider returning error for requested quote', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: false,
            });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR, // Different quote
                        provider: provider1,
                        price: 1.06e-5,
                        lastUpdated: new Date(1767706673 * 1000),
                    },
                ],
            };
            const provider2 = new MockProvider({
                shouldSucceed: true,
                price: 0.0002,
            }); // Returns USD
            const api = new XECPrice([provider1, provider2]);

            const price = await api.current(Fiat.USD);

            // Should fallback to provider2 which returns USD
            expect(price).to.equal(0.0002);
        });

        it('should handle provider returning error and missing price data', async () => {
            const provider1 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: false,
            });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider1,
                        error: 'Error',
                    },
                ],
            };
            const provider2 = new MockProvider({
                shouldSucceed: true,
                shouldThrow: false,
            });
            provider2.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider2,
                        // No price, no error - invalid state
                    },
                ],
            };
            const api = new XECPrice([provider1, provider2]);

            const price = await api.current(Fiat.USD);

            // Both providers failed in different ways
            expect(price).to.be.equal(null);
        });
    });

    describe('caching', () => {
        it('should not cache prices by default (0ms expiry)', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 0.0001,
            });
            const api = new XECPrice([provider]); // Default: 0ms cache

            // First call
            const firstPrice = await api.current(Fiat.USD);
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

            // Second call should fetch new price (no cache)
            const secondPrice = await api.current(Fiat.USD);
            expect(secondPrice).to.equal(0.0002); // Should be new value, not cached
        });

        it('should cache prices when cacheExpiryMs is set', async () => {
            const now = Date.now();
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            // Set initial response with recent timestamp
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
            const api = new XECPrice(
                [provider],
                ProviderStrategy.FALLBACK,
                60000,
            ); // 60 second cache

            // First call to populate cache
            const firstPrice = await api.current(Fiat.USD);
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
            const secondPrice = await api.current(Fiat.USD);
            expect(secondPrice).to.equal(0.0001); // Should be cached value, not new value
        });

        it('should expire cache after cacheExpiryMs', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 0.0001,
            });
            // Set cache expiry to 10ms to force quick expiry
            const api = new XECPrice([provider], ProviderStrategy.FALLBACK, 10);

            // First call to populate cache
            await api.current(Fiat.USD);

            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 20));

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

            // Second call should fetch new price (cache expired)
            const price = await api.current(Fiat.USD);
            expect(price).to.equal(0.0002); // Should be new value
        });
    });
});
