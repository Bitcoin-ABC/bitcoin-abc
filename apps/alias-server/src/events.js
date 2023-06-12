// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const aliasConstants = require('../constants/alias');
const { wait, removeUnconfirmedTxsFromTxHistory } = require('./utils');
const { isFinalBlock } = require('./rpc');
const { getServerState, updateServerState } = require('./db');
const { getUnprocessedTxHistory } = require('./chronik');
const { getAliasTxs, registerAliases } = require('./alias');

module.exports = {
    handleAppStartup: async function (
        chronik,
        db,
        telegramBot,
        channelId,
        avalancheRpc,
    ) {
        console.log(`Checking for new aliases on startup`);
        // If this is app startup, get the latest tipHash and tipHeight by querying the blockchain

        // Get chain tip
        let chaintipInfo;
        try {
            chaintipInfo = await chronik.blockchainInfo();
        } catch (err) {
            console.log(
                `Error in chronik.blockchainInfo() in handleAppStartup()`,
                err,
            );
            // Server will wait until receiving ws msg to handleBlockConnected()
            return false;
        }
        const { tipHash, tipHeight } = chaintipInfo;
        // Validate for good chronik response
        if (typeof tipHash === 'string' && typeof tipHeight === 'number') {
            return module.exports.handleBlockConnected(
                chronik,
                db,
                telegramBot,
                channelId,
                avalancheRpc,
                tipHash,
                tipHeight,
            );
        }
        return false;
    },
    handleBlockConnected: async function (
        chronik,
        db,
        telegramBot,
        channelId,
        avalancheRpc,
        tipHash,
        tipHeight,
    ) {
        /*
         * BlockConnected callback
         *
         * This is where alias-server queries the blockchain for new transactions and
         * parses those transactions to determine if any are valid alias registrations
         *
         * The database may only be updated if we have a known blockhash and height with
         * isFinalBlock = true confirmed by avalanche
         *
         * A number of error conditions may cause parseWebsocketMessage to exit before any update to
         * the database occurs.
         *
         * If alias-server determines a blockhash and height with isFinalBlock === true,
         * valid alias registrations will be processed up to and including that blockheight
         *
         * Otherwise parseWebsocketMessage will exit before any updates are made to the database
         *
         * Note: websockets disconnect and reconnect frequently. It cannot be assumed that
         * every found block will triggger parseWebsocketMessage. So, parseWebsocketMessage must be designed such that
         * it will always update for all unseen valid alias registrations.
         *
         */

        if (typeof tipHeight === 'undefined') {
            let blockResult;
            try {
                blockResult = await chronik.block(tipHash);
                // chronik blockdetails returns the block height at the 'blockInfo.height' key
                tipHeight = blockResult.blockInfo.height;
            } catch (err) {
                console.log(
                    `Error in chronik.block(${tipHash} in handleBlockConnected(). Exiting function.`,
                    err,
                );
                // Exit handleBlockConnected on chronik error
                return false;
            }
        }

        // Initialize isAvalancheFinalized as false. Only set to true if you
        // prove it so with a node rpc call
        let isAvalancheFinalized = false;

        for (let i = 0; i < config.avalancheCheckCount; i += 1) {
            // Check to see if block tipHash has been finalized by avalanche
            try {
                isAvalancheFinalized = await isFinalBlock(
                    avalancheRpc,
                    tipHash,
                );
            } catch (err) {
                console.log(`Error in isFinalBlock for ${tipHash}`, err);
            }
            if (isAvalancheFinalized) {
                // If isAvalancheFinalized, stop checking
                break;
            }
            wait(config.avalancheCheckWaitInterval);
        }

        if (!isAvalancheFinalized) {
            console.log(
                `Block ${tipHash} is not avalanche finalized after ${
                    config.avalancheCheckWaitInterval *
                    config.avalancheCheckCount
                } ms. Exiting handleBlockConnected().`,
            );
            return false;
        }

        const serverState = await getServerState(db);
        if (!serverState) {
            // TODO notify admin
            return false;
        }

        const { processedBlockheight, processedConfirmedTxs } = serverState;

        // If serverState is, somehow, ahead of the calling block, return false
        if (processedBlockheight >= tipHeight) {
            // TODO notify admin
            return false;
        }

        const allUnprocessedTxs = await getUnprocessedTxHistory(
            chronik,
            aliasConstants.registrationAddress,
            processedBlockheight,
            processedConfirmedTxs,
        );

        // Remove unconfirmed txs as these are not eligible for valid alias registrations
        const confirmedUnprocessedTxs =
            removeUnconfirmedTxsFromTxHistory(allUnprocessedTxs);

        // Get all potentially valid alias registrations
        // i.e. correct fee is paid, prefix is good, everything good but not yet checked against
        // conflicting aliases that registered earlier or have alphabetically earlier txid in
        // same block
        const unprocessedAliasTxs = getAliasTxs(
            confirmedUnprocessedTxs,
            aliasConstants,
        );

        // Add new valid alias txs to the database and get a list of what was added
        await registerAliases(db, unprocessedAliasTxs);

        // New processedBlockheight is the highest one seen, or the
        // height of the first entry of the confirmedUnprocessedTxs array
        // New processedConfirmedTxs is determined by adding the count of now-processed txs
        const newServerState = {
            processedBlockheight: tipHeight,
            processedConfirmedTxs:
                processedConfirmedTxs + confirmedUnprocessedTxs.length,
        };
        // Update serverState
        const serverStateUpdated = await updateServerState(db, newServerState);
        if (!serverStateUpdated) {
            // Don't exit, since you've already added aliases to the db here
            // App will run next on the old server state, so will re-process txs
            // These can't be added to the db, so you will get errors
            // If you get here, there is something wrong with the server that needs to be checked out
            // TODO notify admin
            console.log(
                `serverState failed to update to new serverState`,
                newServerState,
            );
        }

        // TODO telegram notifications for new alias registrations

        console.log(
            `Alias registrations updated to block ${tipHash} at height ${tipHeight}`,
        );
        return `Alias registrations updated to block ${tipHash} at height ${tipHeight}`;
    },
};
