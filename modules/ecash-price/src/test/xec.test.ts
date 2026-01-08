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
});
