// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { PriceFetcher } from '../src/pricefetcher';
import { CoinMarketCapProvider } from '../src/providers/coinmarketcap';
import { CryptoTicker, Fiat, Period } from '../src/types';
import { PriceFormatter, formatPrice } from '../src/formatter';

/**
 * Test script to call CoinMarketCap provider via PriceFetcher
 * Usage: tsx scripts/fetch-coinmarketcap.ts <source> <quote>
 * Example: tsx scripts/fetch-coinmarketcap.ts xec usd
 * Optional: CMC_API_KEY=... for authenticated Pro API calls
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error(
            'Usage: tsx scripts/fetch-coinmarketcap.ts <source> <quote>',
        );
        console.error('Example: tsx scripts/fetch-coinmarketcap.ts xec usd');
        process.exit(1);
    }

    const [sourceArg, quoteArg] = args;
    const source = new CryptoTicker(sourceArg.toLowerCase());

    let quote: Fiat | CryptoTicker;
    const quoteLower = quoteArg.toLowerCase();
    const fiatMap: Record<string, Fiat> = {
        usd: Fiat.USD,
        eur: Fiat.EUR,
        gbp: Fiat.GBP,
        jpy: Fiat.JPY,
        cad: Fiat.CAD,
        aud: Fiat.AUD,
        chf: Fiat.CHF,
        cny: Fiat.CNY,
    };

    if (fiatMap[quoteLower]) {
        quote = fiatMap[quoteLower];
    } else {
        quote = new CryptoTicker(quoteArg.toLowerCase());
    }

    const apiKey = process.env.CMC_API_KEY?.trim() || undefined;
    const provider = new CoinMarketCapProvider(apiKey ? { apiKey } : undefined);
    const fetcher = new PriceFetcher([provider]);
    const formatter = new PriceFormatter(fetcher);

    const pair = { source, quote };
    console.log(
        `Pair: ${source.toString().toUpperCase()}/${quote.toString().toUpperCase()}`,
    );
    console.log(`Mode: ${apiKey ? 'Pro API (keyed)' : 'keyless Public API'}\n`);

    console.log('\n=== Price ===');

    try {
        const currentPrice = await fetcher.current(pair);

        if (currentPrice === null) {
            console.error('Failed to fetch current price');
        } else {
            console.log(`Current Price: ${formatPrice(currentPrice, quote)}`);
        }

        const stats = await fetcher.stats(pair, Period.HOURS_24);

        if (stats === null) {
            console.error('Failed to fetch statistics');
        } else {
            const formattedStats = formatter.formatStatistics(stats);
            console.log('\n=== Statistics ===');
            console.log(
                `Source: ${formattedStats.source.toString().toUpperCase()}`,
            );
            console.log(
                `Quote: ${formattedStats.quote.toString().toUpperCase()}`,
            );
            console.log(`Current Price: ${formattedStats.currentPrice}`);
            console.log(`Market Cap: ${formattedStats.marketCap}`);
            console.log(`24h Volume: ${formattedStats.volume}`);
            console.log(`24h Price Change: ${formattedStats.priceChangeValue}`);
            console.log(
                `24h Price Change %: ${formattedStats.priceChangePercent}`,
            );
        }
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
