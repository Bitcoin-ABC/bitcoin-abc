// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const axios = require('axios');
const config = require('../config');

module.exports = {
    getXecPrice: async function () {
        let coingeckoApiResponse;
        try {
            coingeckoApiResponse = await axios.get(
                'https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd',
            );
            return coingeckoApiResponse.data.ecash.usd;
        } catch (err) {
            console.log(err);
            // If API error or error getting price, return false
            return false;
        }
    },
    /**
     * Return a formatted string in USD if xecPrice is available
     * Otherwise return formatted XEC amount
     * @param {integer} satoshis
     * @param {number or false} xecPrice
     * @returns {string} formatted price string e.g. '150 XEC' or "$150"
     */
    satsToFormattedValue: function (satoshis, xecPrice) {
        // Convert satoshis to XEC
        const xecAmount = satoshis / 100;

        // Get fiat price
        let formattedValue = xecPrice ? xecAmount * xecPrice : xecAmount;

        // Format fiatAmount for different tiers
        let displayedAmount;
        let localeOptions = { maximumFractionDigits: 0 };
        let descriptor = '';

        if (formattedValue < 0.01) {
            // enough decimal places to show one significant digit
            localeOptions = {
                minimumFractionDigits: -Math.floor(Math.log10(formattedValue)),
            };
        } else if (formattedValue < 10) {
            // Two decimal places
            localeOptions = { minimumFractionDigits: 2 };
        }

        if (formattedValue < 1000) {
            displayedAmount = formattedValue;
        } else if (formattedValue < 1000000) {
            // thousands
            displayedAmount = formattedValue / 1000;
            descriptor = 'k';
        } else if (formattedValue < 1000000000) {
            // millions
            displayedAmount = formattedValue / 1000000;
            descriptor = 'M';
        } else if (formattedValue >= 1000000000) {
            // billions or more
            displayedAmount = formattedValue / 1000000000;
            descriptor = 'B';
        }

        return `${xecPrice ? '$' : ''}${displayedAmount.toLocaleString(
            'en-US',
            localeOptions,
        )}${descriptor}${xecPrice ? '' : ' XEC'}`;
    },
    getAliasFromHex: function (aliasHex) {
        return Buffer.from(aliasHex, 'hex').toString('utf8');
    },
    getHexFromAlias: function (alias) {
        return Buffer.from(alias, 'utf8').toString('hex');
    },
    getAliasBytecount: function (alias) {
        const aliasHex = module.exports.getHexFromAlias(alias);
        const aliasByteCount = aliasHex.length / 2;
        return aliasByteCount;
    },
    isValidAliasString: function (alias) {
        /*
        Initial launch will support only lower case roman alphabet and numbers 0 through 9
        */
        return /^[a-z0-9]+$/.test(alias);
    },
    /**
     * Take a txHistory object from chronik and return confirmedTxs and unconfirmedTxs
     * @param {array} txHistory chronik tx history response
     * @returns {object} {confirmedTxs, unconfirmedTxs}
     */
    splitTxsByConfirmed: function (txHistory) {
        // Remove unconfirmed txs from an array of chronik tx objects
        const confirmedTxs = [];
        const unconfirmedTxs = [];
        for (let i = 0; i < txHistory.length; i += 1) {
            const thisTx = txHistory[i];
            if (typeof thisTx.block !== 'undefined') {
                confirmedTxs.push(thisTx);
            } else {
                unconfirmedTxs.push(thisTx);
            }
        }
        return { confirmedTxs, unconfirmedTxs };
    },
    /**
     * Get alias registration price for an alias of a given length and blockheight
     * Note that for alias-server, you want the price for a given block and NOT the next block,
     * as you need to verify txs in this block
     * @param {object} prices
     * an array of alias registration prices and the blockheight at which they become valid
     * although prices is a constant, it is used as a parameter here to allow unit testing a range of possible options
     * @param {number} aliasLength bytecount of alias hex string, or alias.length of the utf8 alias. 1-21.
     * @param {number} registrationBlockheight blockheight of confirmed alias registration tx
     * @returns {object} {registrationFeeSats, priceExpirationHeight}
     * @throws {error} if blockheight precedes alias launch
     * @throws {error} if the entries of prices are not sorted highest to lowest by prices[i].startHeight
     */
    getAliasPrice: function (prices, aliasLength, registrationBlockheight) {
        // Initialize registrationFeeSats
        let registrationFeeSats, priceExpirationHeight;
        // Initialize lastStartHeight as arbitrarily high
        let lastStartHeight = config.unconfirmedBlockheight;

        for (let i = 0; i < prices.length; i += 1) {
            const { startHeight, fees } = prices[i];

            // Confirm this startHeight is greater than lastStartHeight
            if (startHeight >= lastStartHeight) {
                throw new Error(
                    'alias price epochs must be sorted by startHeight, highest to lowest',
                );
            }

            // If your tested blockheight is higher than this blockheight, these are your prices
            if (registrationBlockheight >= startHeight) {
                registrationFeeSats = fees[aliasLength];
                if (typeof registrationFeeSats !== 'number') {
                    throw new Error(
                        `fees[${aliasLength}] is undefined for ${registrationBlockheight}`,
                    );
                }
                priceExpirationHeight = i === 0 ? null : lastStartHeight;
            }
            // If not, check the next price epoch
            // Update lastStartHeight before incrementing i
            lastStartHeight = startHeight;
        }
        // Return registrationFeeSats if you found it
        if (typeof registrationFeeSats === 'number') {
            return { registrationFeeSats, priceExpirationHeight };
        }
        // If you get to the earliest defined block and haven't found anything, throw an error
        throw new Error(
            `${registrationBlockheight} precedes alias protocol activation height`,
        );
    },
};
