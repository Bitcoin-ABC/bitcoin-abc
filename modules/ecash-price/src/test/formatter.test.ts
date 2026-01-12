// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { PriceFetcher } from '../pricefetcher';
import { PriceFormatter } from '../formatter';
import { MockProvider } from './fixture/mockprovider';
import { Fiat, CryptoTicker } from '../types';

describe('PriceFormatter', () => {
    describe('constructor', () => {
        it('should throw error for unsupported locale', () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);

            expect(() => {
                new PriceFormatter(fetcher, { locale: 'xx-XX' });
            }).to.throw('Locale xx-XX is not supported');
        });

        it('should accept valid locales', () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);

            expect(() => {
                new PriceFormatter(fetcher, { locale: 'en-US' });
            }).to.not.throw();

            expect(() => {
                new PriceFormatter(fetcher, { locale: 'fr-FR' });
            }).to.not.throw();

            expect(() => {
                new PriceFormatter(fetcher, { locale: 'de-DE' });
            }).to.not.throw();
        });
    });

    describe('current', () => {
        it('should return formatted USD price for large values', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.BTC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 50000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.BTC,
                quote: Fiat.USD,
            });

            expect(formatted).to.equal('$50,000');
        });

        it('should return formatted USD price for medium values', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 50.25,
            });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(formatted).to.equal('$50.25');
        });

        it('should return formatted USD price for small values with more decimals', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 0.00001241,
            });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(formatted).to.equal('$0.00001241');
        });

        it('should return formatted EUR price with locale', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 50.5, // Use value < 100 to show decimals
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'de-DE' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.EUR,
            });

            // \u00A0 is a non-breaking space
            expect(formatted).to.equal('50,50\u00A0€');
        });

        it('should return formatted JPY price', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.JPY,
                        provider: provider,
                        price: 0.001,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'ja-JP' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.JPY,
            });

            expect(formatted).to.equal('￥0.001');
        });

        it('should return formatted crypto-to-crypto price', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: CryptoTicker.BTC,
                        provider: provider,
                        price: 1.32515e-10,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: CryptoTicker.BTC,
            });

            expect(formatted).to.equal('0.00000000013252 BTC');
        });

        it('should return null when price fetch fails', async () => {
            const provider = new MockProvider({ shouldSucceed: false });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter();

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(formatted).to.be.equal(null);
        });

        it('should use default locale (en-US) when not specified', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
                price: 50.25, // Use a value that will show decimals
            });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter();

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(formatted).to.equal('$50.25');
        });

        it('should format GBP price correctly', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.GBP,
                        provider: provider,
                        price: 75.99,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-GB' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.GBP,
            });

            expect(formatted).to.equal('£75.99');
        });

        it('should format CAD price correctly', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.CAD,
                        provider: provider,
                        price: 25.5,
                        lastUpdated: new Date(),
                    },
                ],
            };

            // When the locale is en-CA, the formatted price should be $25.50
            let fetcher = new PriceFetcher([provider]);
            let formatter = fetcher.formatter({ locale: 'en-CA' });

            let formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.CAD,
            });

            expect(formatted).to.equal('$25.50');

            // When the locale is en-US, the formatted price should be CA$25.50
            fetcher = new PriceFetcher([provider]);
            formatter = fetcher.formatter({ locale: 'en-US' });

            formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.CAD,
            });

            expect(formatted).to.equal('CA$25.50');
        });

        it('should format ETH quote correctly', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: CryptoTicker.ETH,
                        provider: provider,
                        price: 0.00000002,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: CryptoTicker.ETH,
            });

            expect(formatted).to.equal('0.00000002 ETH');
        });

        it('should format negative prices using absolute value for formatting scheme', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: -50.25,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(formatted).to.equal('-$50.25');
        });

        it('should format negative large prices using absolute value for formatting scheme', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.BTC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: -50000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.BTC,
                quote: Fiat.USD,
            });

            expect(formatted).to.equal('-$50,000');
        });

        it('should format negative small prices using absolute value for formatting scheme', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: -0.00001241,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(formatted).to.equal('-$0.00001241');
        });

        it('should format negative crypto prices using absolute value for formatting scheme', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: CryptoTicker.BTC,
                        provider: provider,
                        price: -1.32515e-10,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: CryptoTicker.BTC,
            });

            expect(formatted).to.equal('-0.00000000013252 BTC');
        });

        it('should format zero price using 2 decimal places', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
            });

            expect(formatted).to.equal('$0.00');
        });

        it('should format zero crypto price with 2 decimal places', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: CryptoTicker.BTC,
                        provider: provider,
                        price: 0,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.current({
                source: CryptoTicker.XEC,
                quote: CryptoTicker.BTC,
            });

            expect(formatted).to.equal('0.00 BTC');
        });
    });

    describe('currentPairs', () => {
        it('should format multiple price pairs', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0.00001241,
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
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 50.5,
                        lastUpdated: new Date(),
                    },
                    {
                        // Include BTC/EUR to satisfy all combinations check
                        source: CryptoTicker.BTC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 45000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.currentPairs([
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.BTC, quote: Fiat.USD },
                { source: CryptoTicker.XEC, quote: Fiat.EUR },
            ]);

            expect(formatted).to.have.length(3);
            expect(formatted[0]).to.equal('$0.00001241');
            expect(formatted[1]).to.equal('$50,000');
            expect(formatted[2]).to.equal('€50.50');
        });

        it('should return null for failed price fetches', async () => {
            const provider = new MockProvider({ shouldSucceed: false });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter();

            const formatted = await formatter.currentPairs([
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.BTC, quote: Fiat.USD },
            ]);

            expect(formatted).to.have.length(2);
            expect(formatted[0]).to.equal(null);
            expect(formatted[1]).to.equal(null);
        });

        it('should handle mixed success and failure', async () => {
            const provider1 = new MockProvider({ shouldSucceed: true });
            provider1.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider1,
                        price: 0.00001241,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.BTC,
                        quote: Fiat.USD,
                        provider: provider1,
                        price: 50000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            // First provider succeeds for XEC/USD but fails for BTC/USD
            // Second provider fails completely
            const provider2 = new MockProvider({ shouldSucceed: false });
            const fetcher = new PriceFetcher([provider1, provider2]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.currentPairs([
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.BTC, quote: Fiat.USD },
            ]);

            expect(formatted).to.have.length(2);
            expect(formatted[0]).to.equal('$0.00001241');
            expect(formatted[1]).to.equal('$50,000');
        });

        it('should format crypto-to-crypto pairs', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: CryptoTicker.BTC,
                        provider: provider,
                        price: 1.32515e-10,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: CryptoTicker.ETH,
                        provider: provider,
                        price: 0.00000002,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.currentPairs([
                { source: CryptoTicker.XEC, quote: CryptoTicker.BTC },
                { source: CryptoTicker.XEC, quote: CryptoTicker.ETH },
            ]);

            expect(formatted).to.have.length(2);
            expect(formatted[0]).to.equal('0.00000000013252 BTC');
            expect(formatted[1]).to.equal('0.00000002 ETH');
        });

        it('should handle negative prices in pairs', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: -50.25,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.BTC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: -50000,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.currentPairs([
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.BTC, quote: Fiat.USD },
            ]);

            expect(formatted).to.have.length(2);
            expect(formatted[0]).to.equal('-$50.25');
            expect(formatted[1]).to.equal('-$50,000');
        });

        it('should handle zero prices in pairs', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 0,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: CryptoTicker.BTC,
                        provider: provider,
                        price: 0,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const formatted = await formatter.currentPairs([
                { source: CryptoTicker.XEC, quote: Fiat.USD },
                { source: CryptoTicker.XEC, quote: CryptoTicker.BTC },
            ]);

            expect(formatted).to.have.length(2);
            expect(formatted[0]).to.equal('$0.00');
            expect(formatted[1]).to.equal('0.00 BTC');
        });

        it('formatted price should be available in a one-liner', async () => {
            const provider = new MockProvider({
                shouldSucceed: true,
            });
            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 123,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const formattedCurrent = await new PriceFetcher([provider])
                .formatter()
                .current({ source: CryptoTicker.XEC, quote: Fiat.USD });
            expect(formattedCurrent).to.equal('$123.00');

            provider.response = {
                prices: [
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.USD,
                        provider: provider,
                        price: 123,
                        lastUpdated: new Date(),
                    },
                    {
                        source: CryptoTicker.XEC,
                        quote: Fiat.EUR,
                        provider: provider,
                        price: 456,
                        lastUpdated: new Date(),
                    },
                ],
            };
            const formattedPairs = await new PriceFetcher([provider])
                .formatter()
                .currentPairs([
                    { source: CryptoTicker.XEC, quote: Fiat.USD },
                    { source: CryptoTicker.XEC, quote: Fiat.EUR },
                ]);
            expect(formattedPairs).to.have.length(2);
            expect(formattedPairs[0]).to.equal('$123.00');
            expect(formattedPairs[1]).to.equal('€456.00');
        });
    });
});
