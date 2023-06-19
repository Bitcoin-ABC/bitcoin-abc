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
    /**
     * Return a formatted string for a telegram msg given an amount of satoshis     *
     * @param {number} xecAmount amount of XEC as a number
     * @returns {string}
     */
    formatXecAmount: function (xecAmount) {
        // Initialize displayed string variables
        let displayedAmount, descriptor;

        // Initialize displayedDecimals as 0
        let displayedDecimals = 0;

        // Build format string for fixed levels
        if (xecAmount < 10) {
            // If xecAmount is less than 10, return un-rounded
            displayedAmount = xecAmount;
            descriptor = '';
            displayedDecimals = 2;
        } else if (xecAmount < 1000) {
            displayedAmount = xecAmount;
            descriptor = '';
            // If xecAmount is between 10 and 1k, return rounded
        } else if (xecAmount < 1000000) {
            // If xecAmount is between 1k and 1 million, return formatted + rounded
            displayedAmount = xecAmount / 1000; // thousands
            descriptor = 'k';
        } else if (xecAmount < 1000000000) {
            // If xecAmount is between 1 million and 1 billion, return formatted + rounded
            displayedAmount = xecAmount / 1000000; // millions
            descriptor = 'M';
        } else if (xecAmount < 1000000000000) {
            // If xecAmount is between 1 billion and 1 trillion, return formatted + rounded
            displayedAmount = xecAmount / 1000000000; // billions
            descriptor = 'B';
        } else if (xecAmount >= 1000000000000) {
            // If xecAmount is greater than 1 trillion, return formatted + rounded
            displayedAmount = xecAmount / 1000000000000;
            descriptor = 'T';
        }

        return `${displayedAmount.toLocaleString('en-US', {
            maximumFractionDigits: displayedDecimals,
        })}${descriptor} XEC`;
    },
    /**
     * Return a formatted string of fiat if price info is available and > $1
     * Otherwise return formatted XEC amount
     * @param {integer} satoshis
     * @param {array or false} coingeckoPrices [{fiat, price}...{fiat, price}] with xec price at index 0
     */
    satsToFormattedValue: function (satoshis, coingeckoPrices) {
        // Get XEC qty
        const xecAmount = satoshis / 100;

        if (!coingeckoPrices) {
            return module.exports.formatXecAmount(xecAmount);
        }
        // Get XEC price from index 0
        const { fiat, price } = coingeckoPrices[0];

        // Get fiat price
        let fiatAmount = xecAmount * price;

        // Format fiatAmount for different tiers
        if (fiatAmount < 1) {
            // If we're working with less than a dollar, give XEC amounts
            return module.exports.formatXecAmount(xecAmount);
        }
        let displayedAmount, descriptor;
        if (fiatAmount < 1000) {
            displayedAmount = fiatAmount;
            descriptor = '';
        } else if (fiatAmount < 1000000) {
            // thousands
            displayedAmount = fiatAmount / 1000;
            descriptor = 'k';
        } else if (fiatAmount < 1000000000) {
            // millions
            displayedAmount = fiatAmount / 1000000;
            descriptor = 'M';
        } else if (fiatAmount >= 1000000000) {
            // billions or more
            displayedAmount = fiatAmount / 1000000000;
            descriptor = 'B';
        }
        const fiatSymbol = config.fiatReference[fiat];

        return `${fiatSymbol}${displayedAmount.toLocaleString('en-US', {
            maximumFractionDigits: 0,
        })}${descriptor}`;
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
    /**
     * Convert a map to a key value array
     * Useful to generate test vectors by `console.log(mapToKeyValueArray(someMap))` in a function
     * @param {map} map
     * @returns array
     */
    mapToKeyValueArray: function (map) {
        let kvArray = [];
        map.forEach((value, key) => {
            kvArray.push([key, value]);
        });
        return kvArray;
    },
};
