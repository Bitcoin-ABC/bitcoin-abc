// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const axios = require('axios');
const config = require('../config');
const BigNumber = require('bignumber.js');

module.exports = {
    returnAddressPreview: function (cashAddress, sliceSize = 3) {
        const addressParts = cashAddress.split(':');
        const unprefixedAddress = addressParts[addressParts.length - 1];
        return `${unprefixedAddress.slice(
            0,
            sliceSize,
        )}...${unprefixedAddress.slice(-sliceSize)}`;
    },
    getCoingeckoPrices: async function (priceInfoObj) {
        const { apiBase, cryptos, fiat, precision } = priceInfoObj;
        let tickerReference = {};
        let coingeckoSlugs = [];
        for (let i = 0; i < cryptos.length; i += 1) {
            const thisCoingeckoSlug = cryptos[i].coingeckoSlug;
            const thisTicker = cryptos[i].ticker;
            coingeckoSlugs.push(thisCoingeckoSlug);
            tickerReference[thisCoingeckoSlug] = thisTicker;
        }
        let apiUrl = `${apiBase}?ids=${coingeckoSlugs.join(
            ',',
        )}&vs_currencies=${fiat}&precision=${precision.toString()}`;
        // https://api.coingecko.com/api/v3/simple/price?ids=ecash,bitcoin,ethereum&vs_currencies=usd&precision=8
        let coingeckoApiResponse;
        try {
            coingeckoApiResponse = await axios.get(apiUrl);
            const { data } = coingeckoApiResponse;
            // Validate for expected shape
            // For each key in `cryptoIds`, data must contain {<fiat>: <price>}
            let coingeckoPriceArray = [];
            if (data && typeof data === 'object') {
                for (let i = 0; i < coingeckoSlugs.length; i += 1) {
                    const thisCoingeckoSlug = coingeckoSlugs[i];
                    if (
                        !data[thisCoingeckoSlug] ||
                        !data[thisCoingeckoSlug][fiat]
                    ) {
                        return false;
                    }
                    // Create more useful output format
                    const thisPriceInfo = {
                        fiat,
                        price: data[thisCoingeckoSlug][fiat],
                        ticker: tickerReference[thisCoingeckoSlug],
                    };
                    if (thisPriceInfo.ticker === 'XEC') {
                        coingeckoPriceArray.unshift(thisPriceInfo);
                    } else {
                        coingeckoPriceArray.push(thisPriceInfo);
                    }
                }
                return {
                    coingeckoResponse: data,
                    coingeckoPrices: coingeckoPriceArray,
                };
            }
            return false;
        } catch (err) {
            console.log(
                `Error fetching prices of ${coingeckoSlugs.join(
                    ',',
                )} from ${apiUrl}`,
                err,
            );
        }
        return false;
    },
    formatPrice: function (price, fiatCode) {
        // Get symbol
        let fiatSymbol = config.fiatReference[fiatCode];

        // If you can't find the symbol, don't show one
        if (typeof fiatSymbol === 'undefined') {
            fiatSymbol = '';
        }

        // No decimal points for prices greater than 100
        if (price > 100) {
            return `${fiatSymbol}${price.toLocaleString('en-us', {
                maximumFractionDigits: 0,
            })}`;
        }
        // 2 decimal places for prices between 1 and 100
        if (price > 1) {
            return `${fiatSymbol}${price.toLocaleString('en-us', {
                maximumFractionDigits: 2,
            })}`;
        }
        // All decimal places for lower prices
        // For now, these will only be XEC prices
        return `${fiatSymbol}${price.toLocaleString('en-us', {
            maximumFractionDigits: 8,
        })}`;
    },
    jsonReplacer: function (key, value) {
        if (value instanceof Map) {
            const keyValueArray = Array.from(value.entries());

            for (let i = 0; i < keyValueArray.length; i += 1) {
                const thisKeyValue = keyValueArray[i]; // [key, value]
                // If this is not an empty map
                if (typeof thisKeyValue !== 'undefined') {
                    // Note: this value is an array of length 2
                    // [key, value]
                    // Check if value is a big number
                    if (thisKeyValue[1] instanceof BigNumber) {
                        // Replace it
                        thisKeyValue[1] = {
                            // Note, if you use dataType: 'BigNumber', it will not work
                            // This must be reserved
                            // Use a term that is definitely not reserved but also recognizable as
                            // "the dev means BigNumber here"
                            dataType: 'BigNumberReplacer',
                            value: thisKeyValue[1].toString(),
                        };
                    }
                }
            }

            return {
                dataType: 'Map',
                value: keyValueArray,
            };
        } else if (value instanceof Set) {
            return {
                dataType: 'Set',
                value: Array.from(value.keys()),
            };
        } else {
            return value;
        }
    },
    jsonReviver: function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (value.dataType === 'Map') {
                // If the map is not empty
                if (typeof value.value[0] !== 'undefined') {
                    /* value.value is an array of keyValue arrays
                     * e.g.
                     * [
                     *  [key1, value1],
                     *  [key2, value2],
                     *  [key3, value3],
                     * ]
                     */
                    // Iterate over each keyValue of the map
                    for (let i = 0; i < value.value.length; i += 1) {
                        const thisKeyValuePair = value.value[i]; // [key, value]
                        let thisValue = thisKeyValuePair[1];
                        if (
                            thisValue &&
                            thisValue.dataType === 'BigNumberReplacer'
                        ) {
                            // If this is saved BigNumber, replace it with an actual BigNumber
                            // note, you can't use thisValue = new BigNumber(thisValue.value)
                            // Need to use this specific array entry
                            value.value[i][1] = new BigNumber(
                                value.value[i][1].value,
                            );
                        }
                    }
                }
                return new Map(value.value);
            }
            if (value.dataType === 'Set') {
                return new Set(value.value);
            }
        }
        return value;
    },
    returnChronikTokenInfoPromise: function (chronik, tokenId, tokenInfoMap) {
        /* returnChronikTokenInfoPromise
         *
         * For best performance, we want to use Promise.all() to make several
         * chronik API calls at the same time
         *
         * This function returns a promise to ask chronik for token genesis info
         * and add this info to a map
         */
        return new Promise((resolve, reject) => {
            chronik.tx(tokenId).then(
                txDetails => {
                    console.assert(
                        typeof txDetails.slpTxData.genesisInfo !== 'undefined',
                        `Error: no genesisInfo object for ${tokenId}`,
                    );
                    // Note: txDetails.slpTxData.genesisInfo only exists for token genesis txs
                    const genesisInfo = txDetails.slpTxData.genesisInfo;
                    tokenInfoMap.set(tokenId, genesisInfo);
                    resolve(true);
                },
                err => {
                    reject(err);
                },
            );
        });
    },
};
