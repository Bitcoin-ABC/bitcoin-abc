// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

module.exports = {
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
