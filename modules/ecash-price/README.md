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

```typescript
// Manually fetch and cache prices
const success = await fetcher.fetch({
    sources: [CryptoTicker.XEC, CryptoTicker.BTC],
    quotes: [Fiat.USD, Fiat.EUR],
});
```

### Price Formatting

The `PriceFormatter` class and `formatPrice` function provide locale-aware price formatting. Prices are automatically formatted with appropriate decimal places based on their magnitude.

#### Using PriceFormatter

```typescript
import { PriceFetcher, PriceFormatter, Fiat, CryptoTicker } from 'ecash-price';
import { CoinGeckoProvider } from 'ecash-price/providers/coingecko';

const formatter = new PriceFetcher([new CoinGeckoProvider()]).formatter({
    locale: 'en-US',
});

// Format a single price
const formattedPrice = await formatter.current({
    source: CryptoTicker.XEC,
    quote: Fiat.USD,
});
// Example output: "$0.00001241"

// Format multiple prices at once
const formattedPrices = await formatter.currentPairs([
    { source: CryptoTicker.XEC, quote: Fiat.USD },
    { source: CryptoTicker.BTC, quote: Fiat.USD },
    { source: CryptoTicker.XEC, quote: Fiat.EUR },
]);
// Example output: ["$0.00001241", "$50,000", "€0.00001"]
```

#### Using formatPrice Function Directly

If you already have a price value and just need to format it:

```typescript
import { formatPrice, Fiat, CryptoTicker } from 'ecash-price';

// Format a fiat price with default locale (en-US)
const formatted = formatPrice(0.00001241, Fiat.USD);
// Returns: "$0.00001241"

// Format with a specific locale
const formattedWithLocale = formatPrice(0.00001241, Fiat.USD, {
    locale: 'en-US',
});
// Returns: "$0.00001241"

// Format with different locales
const formattedEUR = formatPrice(50.5, Fiat.EUR, { locale: 'de-DE' });
// Returns: "50,50 €" (German locale uses comma as decimal separator)

const formattedJPY = formatPrice(0.001, Fiat.JPY, { locale: 'ja-JP' });
// Returns: "￥0.001"

// Format crypto-to-crypto prices
const formattedCrypto = formatPrice(1.32515, CryptoTicker.BTC, {
    locale: 'en-US',
});
// Returns: "1.32515 BTC"

// Format large prices (no decimals for prices >= 1000)
const formattedLarge = formatPrice(50000, Fiat.USD, { locale: 'en-US' });
// Returns: "$50,000"

// Format negative prices
const formattedNegative = formatPrice(-50.25, Fiat.USD, { locale: 'en-US' });
// Returns: "-$50.25"
```

#### Formatting Behavior

The formatter automatically adjusts decimal places based on price magnitude:

- **Prices >= 1000**: No decimal places (e.g., `$50,000`)
- **Prices between 1 and 1000**: 2 decimal places (e.g., `$50.25`)
- **Prices < 1**: Up to 8 decimals for fiat, 18 for crypto, showing significant digits (e.g., `$0.000012`)

The formatter uses the absolute value to determine formatting rules but preserves the sign in the output.

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
