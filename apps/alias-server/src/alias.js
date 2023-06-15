// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const cashaddr = require('ecashaddrjs');
const config = require('../config');
const { getAliasFromHex, isValidAliasString } = require('./utils');
const { addOneAliasToDb } = require('./db');
const { consumeNextPush } = require('ecash-script');

module.exports = {
    getAliasTxs: function (aliasTxHistory, aliasConstants) {
        const aliasTxCount = aliasTxHistory.length;

        // Get expected output script match for parseAliasTx
        // Do it here and not in parseAliasTx so that you don't do it for every single tx
        // Will all be the same for a given set of tx history
        const registrationOutputScript = cashaddr.getOutputScriptFromAddress(
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
                    address = cashaddr.encode(
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
                validAliases.push({
                    alias,
                    address,
                    txid: aliasTx.txid,
                    blockheight:
                        aliasTx && aliasTx.block
                            ? aliasTx.block.height
                            : config.unconfirmedBlockheight,
                });

                // Increment the required fee based on this valid alias
                aliasFeeRequiredSats += BigInt(
                    aliasConstants.registrationFeesSats[aliasLength],
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
    registerAliases: async function (db, unsortedConfirmedAliasTxs) {
        /* Add new valid aliases registration txs to the database. Return an array of what was added.
         *
         * Input parameters
         * db - the app database
         * unsortedConfirmedAliasTxs - array, arbitrary collection of confirmed alias-prefixed txs
         *                             at the alias registration address
         *
         * Outputs
         * - The function adds new valid alias txs to the database
         * - An array of objects, each one a new valid alias registration tx that was added to the database
         *
         * Will get all valid alias registrations if given the full tx history and
         * the database is empty
         */

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

            /* If the alias isn't in the database, it's valid and should be added
             */

            // If database add is successful,
            // add thisAliasObject to the validAliasObjects array
            if (await addOneAliasToDb(db, thisAliasTx)) {
                // Because thisAliasTx receives an "_id" key on being added to the db,
                // clone it without this field to return
                const { address, alias, blockheight, txid } = thisAliasTx;
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
};
