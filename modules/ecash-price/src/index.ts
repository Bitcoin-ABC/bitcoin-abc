// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Main API
export { XECPrice } from './xec';

// Types
export { Fiat, CryptoTicker } from './types';
export type {
    QuoteCurrency,
    PriceData,
    PriceRequest,
    PriceResponse,
} from './types';

// Provider interface
export type { PriceProvider } from './provider';

// Strategy
export { ProviderStrategy } from './strategy';

// Providers
export { CoinGeckoProvider } from './providers/coingecko';
export type { CoinGeckoConfig } from './providers/coingecko';
