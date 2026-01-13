// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Main API
export { XECPrice } from './xec';
export { PriceFetcher } from './pricefetcher';

// Formatter
export { PriceFormatter, formatPrice } from './formatter';
export type { PriceFormatterConfig, FormattedStatistics } from './formatter';

// Types
export { Fiat, CryptoTicker, Period } from './types';
export type {
    QuoteCurrency,
    PriceData,
    PriceRequest,
    PriceResponse,
    PricePair,
    Statistics,
} from './types';

// Provider interface
export type { PriceProvider } from './provider';

// Strategy
export { ProviderStrategy } from './strategy';

// Providers
export { CoinGeckoProvider } from './providers/coingecko';
export type { CoinGeckoConfig } from './providers/coingecko';

// Test utilities
export { MockProvider } from './test/fixture/mockprovider';
export type { MockProviderOptions } from './test/fixture/mockprovider';
