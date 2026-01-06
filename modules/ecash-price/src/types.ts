// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { PriceProvider } from './provider';

/**
 * Supported fiat currency codes
 * Enum class for type-safe fiat currency codes
 */
export class Fiat {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value.toLowerCase();
    }

    /**
     * Get the string value of the fiat code
     */
    toString(): string {
        return this.value;
    }

    /**
     * Supported fiat currency codes
     */
    static readonly USD = new Fiat('usd');
    static readonly EUR = new Fiat('eur');
    static readonly GBP = new Fiat('gbp');
    static readonly JPY = new Fiat('jpy');
    static readonly CAD = new Fiat('cad');
    static readonly AUD = new Fiat('aud');
    static readonly CHF = new Fiat('chf');
    static readonly CNY = new Fiat('cny');
}

/**
 * Supported cryptocurrency tickers
 * Enum class for type-safe cryptocurrency tickers
 */
export class CryptoTicker {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value.toLowerCase();
    }

    /**
     * Get the string value of the ticker
     */
    toString(): string {
        return this.value;
    }

    /**
     * Supported cryptocurrency tickers
     */
    static readonly BTC = new CryptoTicker('btc');
    static readonly ETH = new CryptoTicker('eth');
}

/**
 * Quote currency type - can be either a fiat currency or a cryptocurrency
 */
export type QuoteCurrency = Fiat | CryptoTicker;

/**
 * Price data for XEC against a quote currency
 */
export interface PriceData {
    /**
     * Quote currency (e.g., USD for XEC/USD, or BTC for XEC/BTC)
     */
    quote: QuoteCurrency;
    /**
     * Provider used to fetch this price data
     */
    provider: PriceProvider;
    /**
     * Price value in units of the quote currency per XEC
     * For example, if quote is USD, price represents USD per XEC
     * If quote is BTC, price represents BTC per XEC
     * Only present if error is not set
     */
    price?: number;
    /**
     * Date when the price was last updated
     * Only present if error is not set
     */
    lastUpdated?: Date;
    /**
     * Error message if the price fetch failed for this quote currency
     * If set, price and lastUpdated will not be present
     */
    error?: string;
}

/**
 * Request for fetching XEC prices
 */
export interface PriceRequest {
    /**
     * Array of quote currencies to fetch XEC prices against
     * Can include both fiat currencies (e.g., USD, EUR) and cryptocurrencies (e.g., BTC, ETH)
     */
    quotes: QuoteCurrency[];
}

/**
 * Response containing price data
 */
export interface PriceResponse {
    /**
     * Array of price data for requested cryptocurrencies and fiat currencies
     */
    prices: PriceData[];
}
