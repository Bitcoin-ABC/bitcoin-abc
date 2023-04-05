// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const { getCoingeckoPrices } = require('../src/utils');
const config = require('../config');

const testedPriceObjects = [
    config.priceApi,
    {
        apiBase: 'https://api.coingecko.com/api/v3/simple/price',
        cryptoIds: ['ecash', 'dogecoin', 'solana', 'monero'],
        fiat: 'usd',
        precision: 8,
    },
    {
        apiBase: 'https://api.coingecko.com/api/v3/simple/price',
        cryptoIds: ['ecash', 'dogecoin', 'solana', 'monero'],
        fiat: 'eur',
        precision: 6,
    },
];

async function printGetPricesInfo(priceInfoObj) {
    const { cryptoIds, fiat, precision } = priceInfoObj;
    const priceInfo = await getCoingeckoPrices(priceInfoObj);
    const pricesReceived = Object.keys(priceInfo);

    console.log(
        `Price info for ${JSON.stringify(
            cryptoIds,
        )} in ${fiat.toUpperCase()} with ${precision}-decimal precision`,
    );

    for (let i = 0; i < pricesReceived.length; i += 1) {
        const thisCrypto = pricesReceived[i];
        console.log(
            `1 ${thisCrypto} = $${
                priceInfo[thisCrypto][fiat]
            } ${fiat.toUpperCase()}`,
        );
    }
    // New line
    console.log('');
}

for (let i = 0; i < testedPriceObjects.length; i += 1) {
    printGetPricesInfo(testedPriceObjects[i]);
}
