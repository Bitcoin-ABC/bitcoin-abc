// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { PriceFetcher } from '../pricefetcher';
import { PriceFormatter, formatPrice } from '../formatter';
import { MockProvider } from './fixture/mockprovider';
import { Fiat, CryptoTicker } from '../types';
import type { Statistics } from '../types';

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

    describe('formatStatistics', () => {
        it('should format statistics with USD quote', () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const statistics: Statistics = {
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
                currentPrice: 0.00001241,
                marketCap: 2000000000,
                volume: 50000000,
                priceChangeValue: 0.00000031,
                priceChangePercent: 0.025, // 2.5% as decimal factor
            };

            const formatted = formatter.formatStatistics(statistics);

            expect(formatted.source).to.equal(CryptoTicker.XEC);
            expect(formatted.quote).to.equal(Fiat.USD);
            expect(formatted.currentPrice).to.equal('$0.00001241');
            expect(formatted.marketCap).to.equal('$2,000,000,000');
            expect(formatted.volume).to.equal('$50,000,000');
            expect(formatted.priceChangeValue).to.equal('$0.00000031');
            expect(formatted.priceChangePercent).to.equal('2.50%');
        });

        it('should format statistics with negative price change', () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const statistics: Statistics = {
                source: CryptoTicker.BTC,
                quote: Fiat.USD,
                currentPrice: 50000,
                marketCap: 1000000000000,
                volume: 20000000000,
                priceChangeValue: -500,
                priceChangePercent: -0.01, // -1% as decimal factor
            };

            const formatted = formatter.formatStatistics(statistics);

            expect(formatted.currentPrice).to.equal('$50,000');
            expect(formatted.marketCap).to.equal('$1,000,000,000,000');
            expect(formatted.volume).to.equal('$20,000,000,000');
            expect(formatted.priceChangeValue).to.equal('-$500.00');
            expect(formatted.priceChangePercent).to.equal('-1.00%');
        });

        it('should format statistics with EUR quote and locale', () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'fr-FR' });

            const statistics: Statistics = {
                source: CryptoTicker.ETH,
                quote: Fiat.EUR,
                currentPrice: 2000,
                marketCap: 250000000000,
                volume: 10000000000,
                priceChangeValue: 50,
                priceChangePercent: 0.025, // 2.5% as decimal factor
            };

            const formatted = formatter.formatStatistics(statistics);

            expect(formatted.source).to.equal(CryptoTicker.ETH);
            expect(formatted.quote).to.equal(Fiat.EUR);
            expect(formatted.currentPrice).to.include('2');
            expect(formatted.currentPrice).to.include('000');
            // Intl.NumberFormat uses non-breaking space before % in fr-FR locale
            expect(formatted.priceChangePercent).to.include('2,50');
            expect(formatted.priceChangePercent).to.include('%');
        });

        it('should format statistics with cryptocurrency quote', () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const statistics: Statistics = {
                source: CryptoTicker.XEC,
                quote: CryptoTicker.BTC,
                currentPrice: 0.0000000001,
                marketCap: 1000,
                volume: 50,
                priceChangeValue: 0.0000000000025,
                priceChangePercent: 0.025, // 2.5% as decimal factor
            };

            const formatted = formatter.formatStatistics(statistics);

            expect(formatted.source).to.equal(CryptoTicker.XEC);
            expect(formatted.quote).to.equal(CryptoTicker.BTC);
            expect(formatted.currentPrice).to.include('0.0000000001');
            expect(formatted.currentPrice).to.include('BTC');
            expect(formatted.marketCap).to.include('1,000');
            expect(formatted.marketCap).to.include('BTC');
            expect(formatted.volume).to.include('50');
            expect(formatted.volume).to.include('BTC');
            expect(formatted.priceChangeValue).to.include('0.0000000000025');
            expect(formatted.priceChangeValue).to.include('BTC');
            expect(formatted.priceChangePercent).to.equal('2.50%');
        });

        it('should format statistics with large market cap', () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const statistics: Statistics = {
                source: CryptoTicker.BTC,
                quote: Fiat.USD,
                currentPrice: 100000,
                marketCap: 2000000000000,
                volume: 50000000000,
                priceChangeValue: 1000,
                priceChangePercent: 0.01, // 1% as decimal factor
            };

            const formatted = formatter.formatStatistics(statistics);

            expect(formatted.currentPrice).to.equal('$100,000');
            expect(formatted.marketCap).to.equal('$2,000,000,000,000');
            expect(formatted.volume).to.equal('$50,000,000,000');
            expect(formatted.priceChangeValue).to.equal('$1,000');
            expect(formatted.priceChangePercent).to.equal('1.00%');
        });

        it('should format statistics with small price change percentage', () => {
            const provider = new MockProvider({ shouldSucceed: true });
            const fetcher = new PriceFetcher([provider]);
            const formatter = fetcher.formatter({ locale: 'en-US' });

            const statistics: Statistics = {
                source: CryptoTicker.XEC,
                quote: Fiat.USD,
                currentPrice: 0.0001,
                marketCap: 2000000000,
                volume: 50000000,
                priceChangeValue: 0.0000001,
                priceChangePercent: 0.001, // 0.1% as decimal factor
            };

            const formatted = formatter.formatStatistics(statistics);

            expect(formatted.priceChangePercent).to.equal('0.10%');
        });
    });

    describe('decimals option', () => {
        describe('formatPrice function', () => {
            it('should override automatic decimals for large prices (>= 1000)', () => {
                const formatted = formatPrice(50000, Fiat.USD, {
                    locale: 'en-US',
                    decimals: 2,
                });
                // Without decimals option, this would be "$50,000" (0 decimals)
                // With decimals: 2, it should be "$50,000.00"
                expect(formatted).to.equal('$50,000.00');
            });

            it('should override automatic decimals for medium prices (1-1000)', () => {
                const formatted = formatPrice(50.25, Fiat.USD, {
                    locale: 'en-US',
                    decimals: 4,
                });
                // Without decimals option, this would be "$50.25" (2 decimals)
                // With decimals: 4, it should be "$50.2500"
                expect(formatted).to.equal('$50.2500');
            });

            it('should override automatic decimals for small prices (< 1)', () => {
                const formatted = formatPrice(0.00001241, Fiat.USD, {
                    locale: 'en-US',
                    decimals: 2,
                });
                // Without decimals option, this would show more decimals
                // With decimals: 2, it should be "$0.00" (rounded)
                expect(formatted).to.equal('$0.00');
            });

            it('should work with zero decimals', () => {
                const formatted = formatPrice(50.25, Fiat.USD, {
                    locale: 'en-US',
                    decimals: 0,
                });
                expect(formatted).to.equal('$50');
            });

            it('should work with high decimal precision', () => {
                const formatted = formatPrice(1.23456789, Fiat.USD, {
                    locale: 'en-US',
                    decimals: 8,
                });
                expect(formatted).to.equal('$1.23456789');
            });

            it('should work with crypto currencies', () => {
                const formatted = formatPrice(1.32515, CryptoTicker.BTC, {
                    locale: 'en-US',
                    decimals: 4,
                });
                expect(formatted).to.equal('1.3252 BTC');
            });

            it('should work with different locales', () => {
                const formatted = formatPrice(50.5, Fiat.EUR, {
                    locale: 'de-DE',
                    decimals: 2,
                });
                // \u00A0 is a non-breaking space
                expect(formatted).to.equal('50,50\u00A0€');
            });

            it('should handle negative prices with decimals', () => {
                const formatted = formatPrice(-50.25, Fiat.USD, {
                    locale: 'en-US',
                    decimals: 2,
                });
                expect(formatted).to.equal('-$50.25');
            });

            it('should handle zero price with decimals', () => {
                const formatted = formatPrice(0, Fiat.USD, {
                    locale: 'en-US',
                    decimals: 2,
                });
                expect(formatted).to.equal('$0.00');
            });

            it('should round down negative decimals to 0', () => {
                const formatted = formatPrice(50.25, Fiat.USD, {
                    locale: 'en-US',
                    decimals: -5,
                });
                // Should treat -5 as 0
                expect(formatted).to.equal('$50');
            });

            it('should handle non-integer decimals by flooring', () => {
                const formatted = formatPrice(50.25, Fiat.USD, {
                    locale: 'en-US',
                    decimals: 3.7,
                });
                // Should floor 3.7 to 3
                expect(formatted).to.equal('$50.250');
            });
        });

        describe('PriceFormatter class with decimals', () => {
            it('should use decimals option when formatting prices', async () => {
                const provider = new MockProvider({
                    shouldSucceed: true,
                });
                provider.response = {
                    prices: [
                        {
                            source: CryptoTicker.XEC,
                            quote: Fiat.USD,
                            provider: provider,
                            price: 50000,
                            lastUpdated: new Date(),
                        },
                    ],
                };
                const fetcher = new PriceFetcher([provider]);
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    decimals: 2,
                });

                const formatted = await formatter.current({
                    source: CryptoTicker.XEC,
                    quote: Fiat.USD,
                });

                // Without decimals, this would be "$50,000" (0 decimals)
                // With decimals: 2, it should be "$50,000.00"
                expect(formatted).to.equal('$50,000.00');
            });

            it('should use decimals option for small prices', async () => {
                const provider = new MockProvider({
                    shouldSucceed: true,
                    price: 0.00001241,
                });
                const fetcher = new PriceFetcher([provider]);
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    decimals: 8,
                });

                const formatted = await formatter.current({
                    source: CryptoTicker.XEC,
                    quote: Fiat.USD,
                });

                expect(formatted).to.equal('$0.00001241');
            });

            it('should use decimals option for multiple pairs', async () => {
                const provider = new MockProvider({
                    shouldSucceed: true,
                });
                provider.response = {
                    prices: [
                        {
                            source: CryptoTicker.XEC,
                            quote: Fiat.USD,
                            provider: provider,
                            price: 50.25,
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
                const fetcher = new PriceFetcher([provider]);
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    decimals: 4,
                });

                const formatted = await formatter.currentPairs([
                    { source: CryptoTicker.XEC, quote: Fiat.USD },
                    { source: CryptoTicker.BTC, quote: Fiat.USD },
                ]);

                expect(formatted).to.have.length(2);
                expect(formatted[0]).to.equal('$50.2500');
                expect(formatted[1]).to.equal('$50,000.0000');
            });

            it('should use decimals option in formatStatistics', () => {
                const provider = new MockProvider({ shouldSucceed: true });
                const fetcher = new PriceFetcher([provider]);
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    decimals: 4,
                });

                const statistics: Statistics = {
                    source: CryptoTicker.XEC,
                    quote: Fiat.USD,
                    currentPrice: 0.1234,
                    marketCap: 2000000000,
                    volume: 50000000,
                    priceChangeValue: 0.5678,
                    priceChangePercent: 0.025,
                };

                const formatted = formatter.formatStatistics(statistics);

                expect(formatted.currentPrice).to.equal('$0.1234');
                expect(formatted.marketCap).to.equal('$2,000,000,000.0000');
                expect(formatted.volume).to.equal('$50,000,000.0000');
                expect(formatted.priceChangeValue).to.equal('$0.5678');
            });
        });
    });

    describe('alwaysShowSign option', () => {
        describe('formatPrice function', () => {
            it('should show "+" sign for positive fiat prices when enabled', () => {
                const formatted = formatPrice(50.25, Fiat.USD, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                });
                expect(formatted).to.equal('+$50.25');
            });

            it('should show "+" sign for positive crypto prices when enabled', () => {
                const formatted = formatPrice(1.5, CryptoTicker.BTC, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                });
                expect(formatted).to.equal('+1.50 BTC');
            });

            it('should still show "-" sign for negative prices when enabled', () => {
                const formatted = formatPrice(-50.25, Fiat.USD, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                });
                expect(formatted).to.equal('-$50.25');
            });

            it('should show "+" sign for zero price when enabled', () => {
                const formatted = formatPrice(0, Fiat.USD, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                });
                expect(formatted).to.equal('+$0.00');
            });

            it('should not show "+" sign when disabled (default behavior)', () => {
                const formatted = formatPrice(50.25, Fiat.USD, {
                    locale: 'en-US',
                    alwaysShowSign: false,
                });
                expect(formatted).to.equal('$50.25');
            });

            it('should not show "+" sign when not specified (default behavior)', () => {
                const formatted = formatPrice(50.25, Fiat.USD, {
                    locale: 'en-US',
                });
                expect(formatted).to.equal('$50.25');
            });

            it('should work with large prices (>= 1000)', () => {
                const formatted = formatPrice(50000, Fiat.USD, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                });
                expect(formatted).to.equal('+$50,000');
            });

            it('should work with small prices (< 1)', () => {
                const formatted = formatPrice(0.00001241, Fiat.USD, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                });
                expect(formatted).to.equal('+$0.00001241');
            });

            it('should work with different locales', () => {
                const formatted = formatPrice(50.5, Fiat.EUR, {
                    locale: 'de-DE',
                    alwaysShowSign: true,
                });
                // \u00A0 is a non-breaking space
                expect(formatted).to.equal('+50,50\u00A0€');
            });

            it('should work with decimals option', () => {
                const formatted = formatPrice(50.25, Fiat.USD, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                    decimals: 4,
                });
                expect(formatted).to.equal('+$50.2500');
            });

            it('should work with negative prices and decimals option', () => {
                const formatted = formatPrice(-50.25, Fiat.USD, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                    decimals: 4,
                });
                expect(formatted).to.equal('-$50.2500');
            });

            it('should work with crypto currencies and decimals', () => {
                const formatted = formatPrice(1.32515, CryptoTicker.BTC, {
                    locale: 'en-US',
                    alwaysShowSign: true,
                    decimals: 4,
                });
                expect(formatted).to.equal('+1.3252 BTC');
            });
        });

        describe('PriceFormatter class with alwaysShowSign', () => {
            it('should use alwaysShowSign option when formatting prices', async () => {
                const provider = new MockProvider({
                    shouldSucceed: true,
                });
                provider.response = {
                    prices: [
                        {
                            source: CryptoTicker.XEC,
                            quote: Fiat.USD,
                            provider: provider,
                            price: 50.25,
                            lastUpdated: new Date(),
                        },
                    ],
                };
                const fetcher = new PriceFetcher([provider]);
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    alwaysShowSign: true,
                });

                const formatted = await formatter.current({
                    source: CryptoTicker.XEC,
                    quote: Fiat.USD,
                });

                expect(formatted).to.equal('+$50.25');
            });

            it('should use alwaysShowSign for negative prices', async () => {
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
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    alwaysShowSign: true,
                });

                const formatted = await formatter.current({
                    source: CryptoTicker.XEC,
                    quote: Fiat.USD,
                });

                expect(formatted).to.equal('-$50.25');
            });

            it('should use alwaysShowSign for multiple pairs', async () => {
                const provider = new MockProvider({
                    shouldSucceed: true,
                });
                provider.response = {
                    prices: [
                        {
                            source: CryptoTicker.XEC,
                            quote: Fiat.USD,
                            provider: provider,
                            price: 50.25,
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
                const fetcher = new PriceFetcher([provider]);
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    alwaysShowSign: true,
                });

                const formatted = await formatter.currentPairs([
                    { source: CryptoTicker.XEC, quote: Fiat.USD },
                    { source: CryptoTicker.BTC, quote: Fiat.USD },
                ]);

                expect(formatted).to.have.length(2);
                expect(formatted[0]).to.equal('+$50.25');
                expect(formatted[1]).to.equal('+$50,000');
            });

            it('should use alwaysShowSign in formatStatistics', () => {
                const provider = new MockProvider({ shouldSucceed: true });
                const fetcher = new PriceFetcher([provider]);
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    alwaysShowSign: true,
                });

                const statistics: Statistics = {
                    source: CryptoTicker.XEC,
                    quote: Fiat.USD,
                    currentPrice: 0.1234,
                    marketCap: 2000000000,
                    volume: 50000000,
                    priceChangeValue: 0.5678,
                    priceChangePercent: 0.025,
                };

                const formatted = formatter.formatStatistics(statistics);

                expect(formatted.currentPrice).to.equal('+$0.1234');
                expect(formatted.marketCap).to.equal('+$2,000,000,000');
                expect(formatted.volume).to.equal('+$50,000,000');
                expect(formatted.priceChangeValue).to.equal('+$0.5678');
            });

            it('should use alwaysShowSign with negative price change', () => {
                const provider = new MockProvider({ shouldSucceed: true });
                const fetcher = new PriceFetcher([provider]);
                const formatter = fetcher.formatter({
                    locale: 'en-US',
                    alwaysShowSign: true,
                });

                const statistics: Statistics = {
                    source: CryptoTicker.XEC,
                    quote: Fiat.USD,
                    currentPrice: 50.25,
                    marketCap: 2000000000,
                    volume: 50000000,
                    priceChangeValue: -5.25,
                    priceChangePercent: -0.01,
                };

                const formatted = formatter.formatStatistics(statistics);

                expect(formatted.currentPrice).to.equal('+$50.25');
                expect(formatted.priceChangeValue).to.equal('-$5.25');
            });
        });
    });
});
