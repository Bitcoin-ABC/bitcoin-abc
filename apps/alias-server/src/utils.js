// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const cashaddr = require('ecashaddrjs');

module.exports = {
    generateReservedAliasTxArray: function () {
        const reservedAliasTxs = [];
        for (
            let i = 0;
            i < config.aliasConstants.reservedAliases.length;
            i += 1
        ) {
            reservedAliasTxs.push({
                address: config.aliasConstants.registrationAddress,
                alias: config.aliasConstants.reservedAliases[i],
                blockheight: 1,
                txid: 'reserved',
            });
        }
        return reservedAliasTxs;
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
    getOutputScriptFromAddress: function (address) {
        const { type, hash } = cashaddr.decode(address, true);
        let registrationOutputScript;
        if (type === 'p2pkh') {
            registrationOutputScript = `76a914${hash}88ac`;
        } else {
            registrationOutputScript = `a914${hash}87`;
        }
        return registrationOutputScript;
    },
};
