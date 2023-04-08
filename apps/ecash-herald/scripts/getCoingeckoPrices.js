// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const { getCoingeckoPrices, formatPrice } = require('../src/utils');
const config = require('../config');

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

async function printGetPricesInfo(priceInfoObj) {
    const { cryptos, fiat, precision } = priceInfoObj;
    const { coingeckoPrices } = await getCoingeckoPrices(priceInfoObj);

    console.log(
        `Price info for ${cryptos
            .map(crypto => {
                return crypto.ticker;
            })
            .join(
                ', ',
            )} in ${fiat.toUpperCase()} with ${precision}-decimal precision`,
    );

    for (let i in coingeckoPrices) {
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
