# ecash-price

Library for fetching XEC prices with provider abstraction and fallback support.

## Features

- **Provider Abstraction**: Abstract API that allows easy addition of new price providers
- **Multi-Provider Support**: Support for multiple providers with configurable fallback strategies

## Installation

```bash
pnpm add ecash-price
```

## Usage

### Basic Setup

```typescript
import { XECPrice, ProviderStrategy, Fiat, CryptoTicker } from 'ecash-price';
import { CoinGeckoProvider } from 'ecash-price/providers/coingecko';

const api = new XECPrice([
    new CoinGeckoProvider({
        // Optional for free tier
        apiKey: 'your-api-key',
    }),
]);

// Fetch the current XEC price in USD
const price = await api.current(Fiat.USD);

// Other supported fiat currencies: Fiat.EUR, Fiat.GBP, Fiat.JPY, etc.
const eurPrice = await api.current(Fiat.EUR);

// Fetch XEC price against cryptocurrencies (e.g., XEC/BTC)
const xecBtcPrice = await api.current(CryptoTicker.BTC);
```

### PriceFetcher - Batch Price Fetching

`PriceFetcher` provides more advanced functionality for batch fetching prices with built-in caching. Use `PriceFetcher` when you need to:

- Fetch prices for multiple cryptocurrency pairs (not just XEC)
- Batch fetch multiple prices efficiently
- Control cache behavior and expiry

```typescript
import {
    PriceFetcher,
    ProviderStrategy,
    Fiat,
    CryptoTicker,
} from 'ecash-price';
import { CoinGeckoProvider } from 'ecash-price/providers/coingecko';

const fetcher = new PriceFetcher(
    [new CoinGeckoProvider()],
    ProviderStrategy.FALLBACK,
    60 * 1000, // Cache expiry: 60 seconds (default)
);

// Fetch a single price pair
const xecUsdPrice = await fetcher.current({
    source: CryptoTicker.XEC,
    quote: Fiat.USD,
});

// Fetch prices for multiple pairs at once
const prices = await fetcher.currentPairs([
    { source: CryptoTicker.XEC, quote: Fiat.USD },
    { source: CryptoTicker.XEC, quote: Fiat.EUR },
    { source: CryptoTicker.BTC, quote: Fiat.USD },
    { source: CryptoTicker.ETH, quote: CryptoTicker.BTC },
]);
// Returns: [xecUsdPrice, xecEurPrice, btcUsdPrice, ethBtcPrice]
```

The cache can be force-refreshed by calling the `fetch` method:

```
// Manually fetch and cache prices
const success = await fetcher.fetch({
sources: [CryptoTicker.XEC, CryptoTicker.BTC],
quotes: [Fiat.USD, Fiat.EUR],
});

```

#### Key Features

- **Automatic Caching**: Prices are cached and reused until they expire
- **Batch Fetching**: `currentPairs()` fetches all requested pairs using minimal API calls if any are missing from cache
- **Multiple Cryptocurrencies**: Fetch prices for any supported cryptocurrency (XEC, BTC, ETH, etc.)

#### When to Use PriceFetcher vs XECPrice

- **Use `XECPrice`** when you only need XEC prices and want a simple API
- **Use `PriceFetcher`** when you need:
    - Prices for multiple cryptocurrencies (not just XEC)
    - Batch fetching multiple prices efficiently
    - More control over caching behavior

## Architecture

### Provider Interface

All price providers implement the `PriceProvider` interface:

```typescript
interface PriceProvider {
    readonly id: string;
    readonly name: string;
    fetchPrices(request: PriceRequest): Promise<PriceResponse | null>;
}
```

Provider-specific configuration is passed to each provider's constructor, allowing each provider to define its own configuration interface.

### Fallback Strategies

- `FALLBACK` (default): Try providers in order, use the first successful response
