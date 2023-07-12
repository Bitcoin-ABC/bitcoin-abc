// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const axios = require('axios');

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
    removeUnconfirmedTxsFromTxHistory: function (txHistory) {
        // Remove unconfirmed txs from an array of chronik tx objects
        const confirmedTxHistory = [];
        for (let i = 0; i < txHistory.length; i += 1) {
            const thisTx = txHistory[i];
            if (typeof thisTx.block !== 'undefined') {
                confirmedTxHistory.push(thisTx);
            }
        }
        return confirmedTxHistory;
    },
    wait: async function (msecs) {
        await new Promise(resolve => setTimeout(resolve, msecs));
    },
};
