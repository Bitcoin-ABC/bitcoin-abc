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

    public constructor(value: string) {
        this.value = value.toLowerCase();
    }

    /**
     * Get the string value of the fiat code
     */
    toString(): string {
        return this.value;
    }

    /**
     * List all supported fiat currencies
     * @returns Array of all supported Fiat instances
     */
    static listAll(): Fiat[] {
        return Object.values(Fiat).filter(
            (value): value is Fiat => value instanceof Fiat,
        );
    }

    /**
     * Supported fiat currency codes
     */
    static readonly AED = new Fiat('aed');
    static readonly AUD = new Fiat('aud');
    static readonly BHD = new Fiat('bhd');
    static readonly BRL = new Fiat('brl');
    static readonly CAD = new Fiat('cad');
    static readonly CHF = new Fiat('chf');
    static readonly CLP = new Fiat('clp');
    static readonly CNY = new Fiat('cny');
    static readonly EUR = new Fiat('eur');
    static readonly GBP = new Fiat('gbp');
    static readonly HKD = new Fiat('hkd');
    static readonly IDR = new Fiat('idr');
    static readonly ILS = new Fiat('ils');
    static readonly INR = new Fiat('inr');
    static readonly JPY = new Fiat('jpy');
    static readonly KRW = new Fiat('krw');
    static readonly MYR = new Fiat('myr');
    static readonly NGN = new Fiat('ngn');
    static readonly NOK = new Fiat('nok');
    static readonly NZD = new Fiat('nzd');
    static readonly PHP = new Fiat('php');
    static readonly RUB = new Fiat('rub');
    static readonly SAR = new Fiat('sar');
    static readonly TRY = new Fiat('try');
    static readonly TWD = new Fiat('twd');
    static readonly USD = new Fiat('usd');
    static readonly VND = new Fiat('vnd');
    static readonly ZAR = new Fiat('zar');
}

/**
 * Supported cryptocurrency tickers
 * Enum class for type-safe cryptocurrency tickers
 */
export class CryptoTicker {
    private readonly value: string;

    public constructor(value: string) {
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
    static readonly XEC = new CryptoTicker('xec');
    static readonly BTC = new CryptoTicker('btc');
    static readonly ETH = new CryptoTicker('eth');
    static readonly XMR = new CryptoTicker('xmr');
    static readonly SOL = new CryptoTicker('sol');
}

/**
 * Quote currency type - can be either a fiat currency or a cryptocurrency
 */
export type QuoteCurrency = Fiat | CryptoTicker;

/**
 * Pair of source cryptocurrency and quote currency
 */
export type PricePair = {
    source: CryptoTicker;
    quote: QuoteCurrency;
};

/**
 * Price data for XEC against a quote currency
 */
export interface PriceData {
    /**
     * Source cryptocurrency (e.g., XEC, BTC, ETH)
     */
    source: CryptoTicker;
    /**
     * Quote currency (e.g., USD or BTC)
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
     * Array of source cryptocurrencies to fetch prices against
     */
    sources: CryptoTicker[];
    /**
     * Array of quote currencies to fetch prices against
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

/**
 * Supported time periods for statistics
 */
export enum Period {
    /**
     * 24 hour period
     */
    HOURS_24 = '24h',
}

/**
 * Statistics data for a cryptocurrency pair over a given period
 */
export interface Statistics {
    /**
     * Source cryptocurrency (e.g., XEC, BTC, ETH)
     */
    source: CryptoTicker;
    /**
     * Quote currency (e.g., USD or BTC)
     */
    quote: QuoteCurrency;
    /**
     * Current price in units of quote currency per source cryptocurrency
     */
    currentPrice: number;
    /**
     * Market capitalization in units of quote currency
     */
    marketCap: number;
    /**
     * 24-hour trading volume in units of quote currency
     */
    volume: number;
    /**
     * Price change value over the period in units of quote currency
     */
    priceChangeValue: number;
    /**
     * Price change percentage over the period
     */
    priceChangePercent: number;
}
