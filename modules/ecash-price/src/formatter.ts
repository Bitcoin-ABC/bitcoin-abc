// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { PricePair, QuoteCurrency, Statistics } from './types';
import { Fiat, CryptoTicker } from './types';
import type { PriceFetcher } from './pricefetcher';

/**
 * Default locale for price formatting
 */
const PRICE_FORMATTER_DEFAULT_LOCALE = 'en-US';

/**
 * Configuration for price formatting
 */
export interface PriceFormatterConfig {
    /**
     * Locale string for number formatting (e.g., 'en-US', 'fr-FR', 'de-DE')
     * Defaults to 'en-US' if not provided
     */
    locale?: string;

    /** Number of decimal places to show */
    decimals?: number;

    /** Always show the sign, even for positive prices */
    alwaysShowSign?: boolean;
}

/**
 * Validate that a locale is supported
 *
 * @param locale - Locale string to validate
 * @throws Error if the locale is not supported
 */
function validateLocale(locale: string): void {
    if (
        Intl.NumberFormat.supportedLocalesOf(locale, {
            localeMatcher: 'lookup',
        }).length === 0
    ) {
        throw new Error(`Locale ${locale} is not supported`);
    }
}

/**
 * Format a price value based on the quote currency
 *
 * @param price - Price value to format
 * @param quote - Quote currency (fiat or crypto)
 * @param config - Optional configuration for formatting (locale, etc.)
 * @returns Formatted price string
 */
export function formatPrice(
    price: number,
    quote: QuoteCurrency,
    config?: PriceFormatterConfig,
): string {
    const locale = config?.locale ?? PRICE_FORMATTER_DEFAULT_LOCALE;
    validateLocale(locale);

    const isFiat = quote instanceof Fiat;
    const currencyCode = quote.toString().toUpperCase();

    // Use absolute value to determine formatting scheme, but preserve sign in output
    const absPrice = Math.abs(price);

    // Determine appropriate decimal places based on price magnitude
    let options: Intl.NumberFormatOptions;

    // If decimals is explicitly set in config, use it to override automatic calculation
    if (config?.decimals !== undefined) {
        const decimals = Math.max(0, Math.floor(config.decimals));
        options = {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        };
    } else if (absPrice >= 1000) {
        // No decimal places for prices >= 1000
        options = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        };
    } else if (absPrice < Number.EPSILON || absPrice >= 1) {
        // 2 decimal places for prices between 1 and 1000, or price 0
        options = {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        };
    } else {
        // More decimal places for small prices < 1
        // Calculate significant digits to show at least 4 non-zero digit
        const significantDigits = Math.max(
            2,
            Math.ceil(-Math.log10(absPrice)) + 4,
        );
        const maxDecimals = isFiat ? 8 : 18;
        // Set minimumFractionDigits to 2 so values like 0.1 display as 0.10
        // Set maximumFractionDigits to show significant digits without trailing zeros
        options = {
            minimumFractionDigits: 2,
            maximumFractionDigits: Math.min(significantDigits, maxDecimals),
        };
    }

    // Set signDisplay option if alwaysShowSign is enabled
    if (config?.alwaysShowSign) {
        options.signDisplay = 'always';
    }

    // Use currency style for fiat, plain number for crypto
    if (isFiat) {
        options.style = 'currency';
        options.currency = currencyCode;
        return new Intl.NumberFormat(locale, options).format(price);
    }

    const formatted = new Intl.NumberFormat(locale, options).format(price);
    return `${formatted} ${currencyCode}`;
}

/**
 * Price formatter for formatting prices as locale-aware strings
 */
export class PriceFormatter {
    private fetcher: PriceFetcher;
    private config: PriceFormatterConfig | undefined;

    constructor(fetcher: PriceFetcher, config?: PriceFormatterConfig) {
        this.fetcher = fetcher;
        this.config = config;

        const locale = config?.locale ?? PRICE_FORMATTER_DEFAULT_LOCALE;
        validateLocale(locale);
    }

    /**
     * Get the current formatted price for a pair
     *
     * @param pair - Pair of source cryptocurrency and quote currency
     * @returns Formatted price string, or null if fetch failed
     */
    async current(pair: PricePair): Promise<string | null> {
        const price = await this.fetcher.current(pair);
        if (price === null) {
            return null;
        }

        return this.formatPrice(price, pair.quote);
    }

    /**
     * Get the current formatted prices for multiple pairs
     *
     * @param pairs - Array of pairs of source cryptocurrency and quote currency
     * @returns Array of formatted price strings, or null if fetch failed for that pair.
     * Ordering is preserved.
     */
    async currentPairs(pairs: PricePair[]): Promise<(string | null)[]> {
        const prices = await this.fetcher.currentPairs(pairs);
        return prices.map((price, index) => {
            if (price === null) {
                return null;
            }
            return this.formatPrice(price, pairs[index].quote);
        });
    }

    /**
     * Format a price value based on the quote currency
     *
     * @param price - Price value to format
     * @param quote - Quote currency (fiat or crypto)
     * @returns Formatted price string
     */
    private formatPrice(price: number, quote: QuoteCurrency): string {
        return formatPrice(price, quote, this.config);
    }

    /**
     * Format statistics data
     *
     * @param statistics - Statistics data to format
     * @returns Formatted statistics object with formatted values as strings
     */
    formatStatistics(statistics: Statistics): FormattedStatistics {
        const locale = this.config?.locale ?? PRICE_FORMATTER_DEFAULT_LOCALE;
        const quote = statistics.quote;

        const formattedPercent = new Intl.NumberFormat(locale, {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(statistics.priceChangePercent);

        return {
            source: statistics.source,
            quote: statistics.quote,
            currentPrice: this.formatPrice(statistics.currentPrice, quote),
            marketCap: this.formatPrice(statistics.marketCap, quote),
            volume: this.formatPrice(statistics.volume, quote),
            priceChangeValue: this.formatPrice(
                statistics.priceChangeValue,
                quote,
            ),
            priceChangePercent: formattedPercent,
        };
    }
}

/**
 * Formatted statistics with formatted values as strings
 */
export interface FormattedStatistics {
    /**
     * Source cryptocurrency
     */
    source: CryptoTicker;
    /**
     * Quote currency (fiat or crypto)
     */
    quote: QuoteCurrency;
    /**
     * Formatted current price
     */
    currentPrice: string;
    /**
     * Formatted market capitalization
     */
    marketCap: string;
    /**
     * Formatted 24-hour trading volume
     */
    volume: string;
    /**
     * Formatted price change value
     */
    priceChangeValue: string;
    /**
     * Formatted price change percentage (e.g., "2.50%" or "-1.25%")
     */
    priceChangePercent: string;
}
