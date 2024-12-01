// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const {
    getOutputScriptFromAddress,
    encodeCashAddress,
} = require('ecashaddrjs');
const config = require('../config');
const {
    getAliasFromHex,
    isValidAliasString,
    getAliasPrice,
} = require('./utils');
const {
    addOneAliasToDb,
    addOneAliasToPending,
    getAliasInfoFromAlias,
    getServerState,
} = require('./db');
const { consumeNextPush } = require('ecash-script');

module.exports = {
    getAliasTxs: function (aliasTxHistory, aliasConstants) {
        const aliasTxCount = aliasTxHistory.length;

        // Get expected output script match for parseAliasTx
        // Do it here and not in parseAliasTx so that you don't do it for every single tx
        // Will all be the same for a given set of tx history
        const registrationOutputScript = getOutputScriptFromAddress(
            aliasConstants.registrationAddress,
        );

        // initialize array for all valid aliases
        let aliasTxs = [];
        // iterate over history to get all alias:address pairs
        for (let i = 0; i < aliasTxCount; i += 1) {
            const thisAliasTx = aliasTxHistory[i];
            const parsedAliasTx = module.exports.parseAliasTx(
                thisAliasTx,
                aliasConstants,
                registrationOutputScript,
            );
            if (parsedAliasTx) {
                aliasTxs = aliasTxs.concat(parsedAliasTx);
            }
        }
        return aliasTxs;
    },
    /**
     * Parse a single transaction as returned by chronik tx history endpoint
     * for valid alias registration(s)
     * @param {object} aliasTx Object returned by chronik's tx history endpoint; must be a tx sent to the alias registration address per the spec
     * @param {object} aliasConstants Object used to determine alias pricing and registration address
     * @param {string} registrationOutputScript the hash160 of the alias registration address
     * @returns {array} array of valid aliases registered in this tx if any
     * Might always just be one. But need to handle edge case of multiple OP_RETURNs being mined.
     * @returns {bool} false if the tx is not a valid alias registration
     */
    parseAliasTx: function (aliasTx, aliasConstants, registrationOutputScript) {
        // Initialize aliasHexStrings, an array to hold registered alias hex strings
        let aliasHexStrings = [];

        // Initialize validAliases, an array to hold valid registered alias tx objects
        let validAliases = [];

        // Initialize fee paid and fee required
        let aliasFeePaidSats = BigInt(0);
        let aliasFeeRequiredSats = BigInt(0);

        // Iterate over outputs
        const outputs = aliasTx.outputs;
        for (let i = 0; i < outputs.length; i += 1) {
            const { value, outputScript } = outputs[i];

            if (
                outputScript.startsWith(aliasConstants.outputScriptStartsWith)
            ) {
                // If this is an OP_RETURN tx that pushes the alias registration
                // protocol identifier with the required '04' push operator,

                // Parse the rest of this OP_RETURN stack
                let stack = {
                    remainingHex: outputScript.slice(
                        aliasConstants.outputScriptStartsWith.length,
                    ),
                };

                let stackArray = [];
                while (stack.remainingHex.length > 0) {
                    stackArray.push(consumeNextPush(stack));
                }

                if (stackArray.length !== 3) {
                    // If we don't have exactly 3 pushes after the protocol identifier
                    // Then it is not a valid alias registration per spec
                    // This invalidates registrations that include "empty" pushes e.g. "4c00"
                    continue;
                }

                // stackArray is now
                // [
                //  {data: version_number, pushedWith: <pushOp>},
                //  {data: aliasHex, pushedWith: <pushOp>},
                //  {data: address_type_and_hash, pushedWith: <pushOp>}
                // ]

                // Validate alias tx version
                const aliasTxVersion = stackArray[0];
                if (
                    aliasTxVersion.data !== '00' ||
                    aliasTxVersion.pushedWith !== '00'
                ) {
                    // If this is not a version 0 alias tx pushed with OP_0,
                    // Then it is not a valid alias registration per spec
                    continue;
                }

                // Validate alias length
                const aliasHex = stackArray[1];

                // Alias length in characters is aliasHex / 2, each hex byte is 1 character
                const aliasLength = aliasHex.data.length / 2;

                if (
                    aliasLength === 0 ||
                    aliasLength > aliasConstants.maxLength ||
                    parseInt(aliasHex.pushedWith, 16) !== aliasLength
                ) {
                    // If the alias has 0 length OR
                    // If the alias has length greater than 21 OR
                    // If the alias was not pushed with the minimum push operator
                    // Then it is not a valid alias registration per spec
                    continue;
                }

                const alias = getAliasFromHex(aliasHex.data);

                if (!isValidAliasString(alias)) {
                    // If the registered alias contains characters other than a-z or 0-9
                    // Then it is not a valid alias registration per spec
                    continue;
                }

                if (aliasHexStrings.includes(aliasHex.data)) {
                    // If this tx has already tried to register this same alias in an OP_RETURN output
                    // Then no alias registered in this tx may be valid, per spec
                    return false;
                }
                aliasHexStrings.push(aliasHex.data);

                // Validate alias assigned address
                const addressTypeAndHash = stackArray[2];
                if (
                    addressTypeAndHash.data.length / 2 !== 21 ||
                    addressTypeAndHash.pushedWith !== '15'
                ) {
                    // If we don't have one byte address type and twenty bytes address hash
                    // pushed with the minimum push operator i.e. '15' === hex for 21
                    // Then it is not a valid alias registration per spec
                    continue;
                }

                let addressType;
                switch (addressTypeAndHash.data.slice(0, 2)) {
                    case '00': {
                        addressType = 'p2pkh';
                        break;
                    }
                    case '08': {
                        addressType = 'p2sh';
                        break;
                    }
                    default: {
                        // If the address type byte is not '00' or '08'
                        // Then it is not a valid alias registration per spec
                        continue;
                    }
                }

                let address;
                try {
                    address = encodeCashAddress(
                        'ecash',
                        addressType,
                        addressTypeAndHash.data.slice(2),
                    );
                } catch (err) {
                    // If the type and hash do not constitute a valid cashaddr,
                    // Then it is not a valid alias registration per spec
                    continue;
                }

                // If you get here, the construction of the registration in the OP_RETURN field is valid
                // However you still must compare against fee paid and registration history to finalize
                const registrationBlockheight =
                    aliasTx && aliasTx.block
                        ? aliasTx.block.height
                        : config.unconfirmedBlockheight;
                validAliases.push({
                    alias,
                    address,
                    txid: aliasTx.txid,
                    blockheight: registrationBlockheight,
                });

                // Increment the required fee based on this valid alias
                aliasFeeRequiredSats += BigInt(
                    getAliasPrice(
                        aliasConstants.prices,
                        aliasLength,
                        registrationBlockheight,
                    ).registrationFeeSats,
                );
            } else {
                // Check if outputScript matches alias registration address
                if (outputScript === registrationOutputScript)
                    // If so, then the value here is part of the alias registration fee, aliasFeePaidSats
                    aliasFeePaidSats += BigInt(value);
            }
        }

        if (validAliases.length === 0) {
            // If you have no valid OP_RETURN alias registrations, this is not a valid alias registration tx
            return false;
        }

        if (aliasFeePaidSats < aliasFeeRequiredSats) {
            // If this tx does not pay the required fee for all aliases registered in the tx
            // Then no alias registered in this tx may be valid, per spec
            return false;
        }

        return validAliases;
    },
    sortAliasTxsByTxidAndBlockheight: function (unsortedAliasTxs) {
        // First, sort the aliases array by alphabetical txid
        // (alphabetical first to last, 0 comes before a comes before b comes before c, etc)
        const aliasesTxsSortedByTxid = unsortedAliasTxs.sort((a, b) => {
            return a.txid.localeCompare(b.txid);
        });

        // Next, sort the aliases array by blockheight. This will preserve the alphabetical txid sort
        // 735,625 comes before 735,626 comes before 100,000,000 etc
        const aliasTxsSortedByTxidAndBlockheight = aliasesTxsSortedByTxid.sort(
            (a, b) => {
                return a.blockheight - b.blockheight;
            },
        );

        return aliasTxsSortedByTxidAndBlockheight;
    },
    /**
     * Add alias to database if it is a valid alias registration
     * @param {object} db initialized mongo db instance
     * @param {array} unsortedConfirmedAliasTxs confirmed alias tx objects from getAliasTxs()
     * @param {number} tipHeight avalanche finalized tipHeight from handleBlockConnected
     * @returns {array} array containing all registered alias objects added to the db
     * @returns also adds these valid aliases to the database
     */
    registerAliases: async function (db, unsortedConfirmedAliasTxs, tipHeight) {
        // Sort aliases such that the earliest aliases are the valid ones
        const aliasesSortedByTxidAndBlockheight =
            module.exports.sortAliasTxsByTxidAndBlockheight(
                unsortedConfirmedAliasTxs,
            );

        // Initialize arrays to store alias registration info
        let validAliasRegistrations = [];

        // Iterate over sorted aliases starting from oldest registrations to newest
        // (and alphabetically first txids to last)
        for (let i = 0; i < aliasesSortedByTxidAndBlockheight.length; i += 1) {
            const thisAliasTx = aliasesSortedByTxidAndBlockheight[i];

            const { blockheight } = thisAliasTx;
            if (blockheight > tipHeight) {
                // If this alias tx comes from a block higher than the avalanche finalized tip,
                // disregard it

                // Edge case that can happen if a block confirms on the chronik server after
                // handleBlockConnected loop is already called
                continue;
            }

            /* If the alias isn't in the database, it's valid and should be added
             */

            // If database add is successful,
            // add thisAliasObject to the validAliasObjects array
            if (await addOneAliasToDb(db, thisAliasTx)) {
                // Because thisAliasTx receives an "_id" key on being added to the db,
                // clone it without this field to return
                const { address, alias, txid } = thisAliasTx;
                validAliasRegistrations.push({
                    address,
                    alias,
                    blockheight,
                    txid,
                });
            }
        }
        return validAliasRegistrations;
    },
    /**
     * Given the txDetails of an unconfirmed tx, add it to pendingAliases collection if it is pending
     * @param {object} db initialized mongo db instance
     * @param {object} cache an initialized node-cache instance
     * @param {object} txDetails Response of chronik.tx(txid) for this tx
     * @param {object} aliasConstants Object used to determine alias pricing and registration address
     * @returns {bool} true if tx contained valid pending alias(es), false if not
     */
    parseTxForPendingAliases: async function (
        db,
        cache,
        txDetails,
        aliasConstants,
    ) {
        // pending aliases must be unconfirmed
        if (typeof txDetails.block !== 'undefined') {
            return false;
        }
        // Check for valid alias tx(s) in given txDetails
        // Note that getAliasTxs takes an array of txDetails objects
        // In this case we pass an array of just this txDetails
        const potentialPendingAliases = module.exports.getAliasTxs(
            [txDetails],
            aliasConstants,
        );

        if (potentialPendingAliases.length === 0) {
            // We know this tx cannot be a pending alias tx as it contains no valid registration outputs
            return false;
        }

        // Note that parseTxForPendingAliases is only called on one txDetails
        // However, it is possible that one registration tx registers multiple aliases
        // Edge case as in v0 this requires the tx to have multiple OP_RETURN outputs
        let txContainsPendingAlias = false;
        for (const potentialPendingAlias of potentialPendingAliases) {
            const { alias } = potentialPendingAlias;

            if ((await getAliasInfoFromAlias(db, alias)) === null) {
                // If this alias is not already registered, then this is a valid pending registration
                // Note that you may have more than 1 pending alias of the same 'alias'

                // Get tipHeight to set with this pendingAlias
                let tipHeight = cache.get('tipHeight');

                if (typeof tipHeight === 'undefined') {
                    // If tipHeight is not set, get it from serverState
                    // More expensive call than cache, ok here bc edge case, can only happen
                    // for pending alias txs that come in right at server startup
                    const { processedBlockheight } = await getServerState(db);
                    tipHeight = processedBlockheight;
                }
                potentialPendingAlias.tipHeight = tipHeight;

                const pendingAddedResult = await addOneAliasToPending(
                    db,
                    potentialPendingAlias,
                );

                if (pendingAddedResult && pendingAddedResult.acknowledged) {
                    console.log(`New pending alias: ${alias}`);
                    txContainsPendingAlias = true;
                }
            }
        }

        return txContainsPendingAlias;
    },
};
