// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const axios = require('axios');

module.exports = {
    returnLabeledChronikBlockPromise: async function (
        chronik,
        blockhash,
        blockname,
    ) {
        return new Promise((resolve, reject) => {
            chronik.block(blockhash).then(
                result => {
                    const namedBlockDetails = {};
                    namedBlockDetails.blockname = blockname;
                    namedBlockDetails.result = result;

                    resolve(namedBlockDetails);
                },
                err => {
                    reject(err);
                },
            );
        });
    },
    returnAddressPreview: function (cashAddress, sliceSize = 3) {
        const addressParts = cashAddress.split(':');
        const unprefixedAddress = addressParts[addressParts.length - 1];
        return `${unprefixedAddress.slice(
            0,
            sliceSize,
        )}...${unprefixedAddress.slice(-sliceSize)}`;
    },
    getCoingeckoPrices: async function (priceInfoObj) {
        const { apiBase, cryptoIds, fiat, precision } = priceInfoObj;
        let apiUrl = `${apiBase}?ids=${cryptoIds.join(
            ',',
        )}&vs_currencies=${fiat}&precision=${precision.toString()}`;
        // https://api.coingecko.com/api/v3/simple/price?ids=ecash,bitcoin,ethereum&vs_currencies=usd&precision=8
        let coingeckoApiResponse;
        let prices = false;
        try {
            coingeckoApiResponse = await axios.get(apiUrl);
            const { data } = coingeckoApiResponse;
            // Validate for expected shape
            // For each key in `cryptoIds`, data must contain {<fiat>: <price>}
            if (data && typeof data === 'object') {
                for (let i = 0; i < cryptoIds.length; i += 1) {
                    const thisCrypto = cryptoIds[i];
                    if (!data[thisCrypto] || !data[thisCrypto][fiat]) {
                        return false;
                    }
                }
                return data;
            }
            return false;
        } catch (err) {
            console.log(
                `Error fetching prices of ${cryptoIds.join(
                    ',',
                )} from ${apiUrl}`,
                err,
            );
        }
        return prices;
    },
};
