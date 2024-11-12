// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { getCoingeckoPrices, formatPrice } from '../src/utils';
import config from '../config';

const testedPriceObjects = [
    config.priceApi,
    {
        apiBase: 'https://api.coingecko.com/api/v3/simple/price',
        cryptos: [
            { coingeckoSlug: 'ecash', ticker: 'XEC' },
            { coingeckoSlug: 'dogecoin', ticker: 'DOGE' },
            { coingeckoSlug: 'solana', ticker: 'SOL' },
            { coingeckoSlug: 'monero', ticker: 'XMR' },
        ],
        fiat: 'usd',
        precision: 8,
    },
    {
        apiBase: 'https://api.coingecko.com/api/v3/simple/price',
        cryptos: [
            { coingeckoSlug: 'ecash', ticker: 'XEC' },
            { coingeckoSlug: 'dogecoin', ticker: 'DOGE' },
            { coingeckoSlug: 'solana', ticker: 'SOL' },
            { coingeckoSlug: 'monero', ticker: 'XMR' },
        ],
        fiat: 'eur',
        precision: 6,
    },
];

// Use any type as this is an overengineered function from before ts implementation
// not impactful to improve the types since we never use the feature
// todo change if we need it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function printGetPricesInfo(priceInfoObj: any) {
    const { cryptos, fiat, precision } = priceInfoObj;
    const resp = await getCoingeckoPrices(priceInfoObj);
    let coingeckoPrices;
    if (resp !== false) {
        coingeckoPrices = resp.coingeckoPrices;
    } else {
        return console.error(`Failed to fetch coingeckoPrices`);
    }

    console.log(
        `Price info for ${cryptos
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((crypto: any) => {
                return crypto.ticker;
            })
            .join(
                ', ',
            )} in ${fiat.toUpperCase()} with ${precision}-decimal precision`,
    );

    for (const i in coingeckoPrices) {
        const { fiat, price, ticker } = coingeckoPrices[i];
        const formattedPrice = formatPrice(price, fiat);
        console.log(`1 ${ticker} = ${formattedPrice} ${fiat.toUpperCase()}`);
    }
    // New line
    console.log('');
}

for (let i = 0; i < testedPriceObjects.length; i += 1) {
    printGetPricesInfo(testedPriceObjects[i]);
}
