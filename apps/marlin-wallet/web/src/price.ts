// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CryptoTicker, Fiat, PriceFetcher, PricePair } from 'ecash-price';
import { activeAssetDefinition, activeQuoteCurrency } from './active-asset';

export class MarlinPriceFetcher {
    private priceFetcher: PriceFetcher;
    private sourceCurrencies: CryptoTicker[];

    constructor(priceFetcher: PriceFetcher, sourceCurrencies: CryptoTicker[]) {
        this.priceFetcher = priceFetcher;
        this.sourceCurrencies = sourceCurrencies;
    }

    /**
     * Keep the ecash-price PriceFetcher.current() API but always refresh all
     * the prices for all the source currencies.
     *
     * We assume the user won't switch fiat often but might switch source often.
     * In order to improve the experience this wrapper keeps the cache hot for
     * all the source currencies and thus avoid reaching rate limits as much as
     * possible.
     */
    async current(pair: PricePair): Promise<number | null> {
        // Special case for Firma: this is a stablecoin pegged to USD, so we
        // can simply return 1.0 for the price if the user is using USD as the
        // quote currency.
        if (
            activeAssetDefinition().key === 'firma' &&
            pair.source.toString() === activeQuoteCurrency().toString() &&
            pair.quote.toString() === Fiat.USD.toString()
        ) {
            return 1.0;
        }

        await this.priceFetcher.currentPairs(
            this.sourceCurrencies.map(source => ({
                source,
                quote: pair.quote,
            })),
        );

        return await this.priceFetcher.current(pair);
    }
}
