'use strict';
const config = require('../config');

module.exports = {
    getValidAliasTxsToBeAddedToDb: function (validAliasesInDb, validAliasTxs) {
        /*
        - See if any tx exist in validAliasTxs and not in validAliasesinDb
        - Return validAliasTxsToBeAddedToDb, an array of these aliases
        - Note that validAliasesInDb and validAliasTxs are sorted by blockheight
        */
        const validAliasTxsToBeAddedToDbCount =
            validAliasTxs.length - validAliasesInDb.length;
        if (validAliasTxsToBeAddedToDbCount > 0) {
            const validAliasTxsToBeAddedToDb = validAliasTxs.slice(
                -validAliasTxsToBeAddedToDbCount,
            );
            return validAliasTxsToBeAddedToDb;
        } else {
            return [];
        }
    },
    getConfirmedTxsToBeAddedToDb: function (confirmedTxsInDb, confirmedTxs) {
        /*
        - See if any confirmed tx exists in confirmedTxs and not in confirmedTxsInDb
        - Return confirmedTxsToBeAddedToDb, an array of these txs
        - Note that confirmedTxsInDb and confirmedTxs are sorted by blockheight, highest to lowest;
          hence you want the first ${confirmedTxsToBeAddedToDbCount} entries of confirmedTxs
        */
        const confirmedTxsToBeAddedToDbCount =
            confirmedTxs.length - confirmedTxsInDb.length;
        if (confirmedTxsToBeAddedToDbCount > 0) {
            const confirmedTxsToBeAddedToDb = confirmedTxs.slice(
                0,
                confirmedTxsToBeAddedToDbCount,
            );
            return confirmedTxsToBeAddedToDb;
        } else {
            return [];
        }
    },
    generateReservedAliasTxArray: function () {
        const reservedAliasTxs = [];
        for (
            let i = 0;
            i < config.aliasConstants.reservedAliases.length;
            i += 1
        ) {
            reservedAliasTxs.push({
                address: config.aliasConstants.address,
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
};
