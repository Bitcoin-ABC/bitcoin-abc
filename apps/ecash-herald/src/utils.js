// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const axios = require('axios');
const config = require('../config');
const BigNumber = require('bignumber.js');
const addressDirectory = require('../constants/addresses');
const { consume } = require('ecash-script');

module.exports = {
    returnAddressPreview: function (cashAddress, sliceSize = 3) {
        // Check known addresses for a tag
        if (addressDirectory.has(cashAddress)) {
            return addressDirectory.get(cashAddress).tag;
        }
        const addressParts = cashAddress.split(':');
        const unprefixedAddress = addressParts[addressParts.length - 1];
        return `${unprefixedAddress.slice(
            0,
            sliceSize,
        )}...${unprefixedAddress.slice(-sliceSize)}`;
    },
    /**
     * Get the price API url herald would use for specified config
     * @param {object} config ecash-herald config object
     * @returns {string} expected URL of price API call
     */
    getCoingeckoApiUrl: function (config) {
        return `${config.priceApi.apiBase}?ids=${config.priceApi.cryptos
            .map(crypto => crypto.coingeckoSlug)
            .join(',')}&vs_currencies=${
            config.priceApi.fiat
        }&precision=${config.priceApi.precision.toString()}`;
    },
    getCoingeckoPrices: async function (priceInfoObj) {
        const { apiBase, cryptos, fiat, precision } = priceInfoObj;
        let coingeckoSlugs = cryptos.map(crypto => crypto.coingeckoSlug);
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
                        ticker: cryptos.filter(
                            el => el.coingeckoSlug === thisCoingeckoSlug,
                        )[0].ticker,
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
        const fiatSymbol = config.fiatReference[fiat];

        // Format fiatAmount for different tiers
        let displayedAmount;
        let localeOptions = { maximumFractionDigits: 0 };
        let descriptor = '';

        if (fiatAmount === 0) {
            // Txs that send nothing, e.g. a one-input tx of 5.46 XEC, should keep defaults above
        } else if (fiatAmount < 0.01) {
            // enough decimal places to show one significant digit
            localeOptions = {
                minimumFractionDigits: -Math.floor(Math.log10(fiatAmount)),
            };
        } else if (fiatAmount < 1) {
            // TODO two decimal places
            localeOptions = { minimumFractionDigits: 2 };
        }

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

        return `${fiatSymbol}${displayedAmount.toLocaleString(
            'en-US',
            localeOptions,
        )}${descriptor}`;
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
    /**
     * Assign appropriate emoji based on a balance in satoshis
     * @param {integer} balanceSats
     * @returns {string} emoji determined by thresholds set in config
     */
    getEmojiFromBalanceSats: function (balanceSats) {
        const { whaleSats, emojis } = config;
        if (balanceSats >= whaleSats.bigWhale) {
            return emojis.bigWhale;
        }
        if (balanceSats >= whaleSats.modestWhale) {
            return emojis.modestWhale;
        }
        if (balanceSats >= whaleSats.shark) {
            return emojis.shark;
        }
        if (balanceSats >= whaleSats.swordfish) {
            return emojis.swordfish;
        }
        if (balanceSats >= whaleSats.barracuda) {
            return emojis.barracuda;
        }
        if (balanceSats >= whaleSats.octopus) {
            return emojis.octopus;
        }
        if (balanceSats >= whaleSats.piranha) {
            return emojis.piranha;
        }
        if (balanceSats >= whaleSats.crab) {
            return emojis.crab;
        }
        return emojis.shrimp;
    },
    /**
     * Convert an integer-stored number with known decimals into a formatted decimal string
     * Useful for converting token send quantities to a human-readable string
     * @param {string} bnString an integer value as a string, e.g 100000012
     * @param {number} decimals the number of expected decimal places, e.g. 2
     * @returns {string} e.g. 1,000,000.12
     */
    bigNumberAmountToLocaleString: function (bnString, decimals) {
        const totalLength = bnString.length;

        // Get the values that come after the decimal place
        const decimalValues =
            decimals === 0 ? '' : bnString.slice(-1 * decimals);
        const decimalLength = decimalValues.length;

        // Get the values that come before the decimal place
        const intValue = bnString.slice(0, totalLength - decimalLength);

        // Use toLocaleString() to format the amount before the decimal place with commas
        return `${BigInt(intValue).toLocaleString('en-US', {
            maximumFractionDigits: 0,
        })}${decimals !== 0 ? `.${decimalValues}` : ''}`;
    },
    /**
     * Determine if an OP_RETURN's hex values include characters outside of printable ASCII range
     * @param {string} hexString hex string containing an even number of characters
     */
    containsOnlyPrintableAscii: function (hexString) {
        if (hexString.length % 2 !== 0) {
            // If hexString has an odd number of characters, it is certainly not ascii
            return false;
        }

        // Values lower than 32 are control characters (127 also control char)
        // We could tolerate LF and CR which are in this range, but they make
        // the msg awkward in Telegram -- so they are left out
        const MIN_ASCII_PRINTABLE_DECIMAL = 32;
        const MAX_ASCII_PRINTABLE_DECIMAL = 126;
        const stack = { remainingHex: hexString };

        while (stack.remainingHex.length > 0) {
            const thisByte = parseInt(consume(stack, 1), 16);

            if (
                thisByte > MAX_ASCII_PRINTABLE_DECIMAL ||
                thisByte < MIN_ASCII_PRINTABLE_DECIMAL
            ) {
                return false;
            }
        }
        return true;
    },
};
