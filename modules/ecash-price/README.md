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
