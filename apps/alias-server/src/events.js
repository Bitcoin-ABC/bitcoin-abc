// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const aliasConstants = require('../constants/alias');
const { splitTxsByConfirmed } = require('./utils');
const {
    getServerState,
    updateServerState,
    deletePendingAliases,
} = require('./db');
const { getUnprocessedTxHistory } = require('./chronik');
const {
    getAliasTxs,
    registerAliases,
    parseTxForPendingAliases,
} = require('./alias');
const { sendAliasAnnouncements } = require('./telegram');

module.exports = {
    /**
     * On app startup, get the chaintip and pass to handleBlockConnected
     * @param {object} chronik initialized chronik object
     * @param {object} db an initialized mongodb instance
     * @param {object} cache an initialized node-cache instance
     * @param {object} telegramBot initialized node-telegram-bot-api instance
     * @param {string} channelId channel where telegramBot is admin
     * @returns {bool | function} false if error, otherwise calls handleBlockConnected
     */
    handleAppStartup: async function (
        chronik,
        db,
        cache,
        telegramBot,
        channelId,
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
            // Server will wait until receiving ws msg to handleBlockFinalized()
            return false;
        }

        // Check if this is finalized
        // Now that we are using in-node chronik, this is indexed, no RPC call required

        const { tipHash, tipHeight } = chaintipInfo;

        let blockDetails;
        try {
            blockDetails = await chronik.block(tipHash);
            if (blockDetails.blockInfo.isFinal !== true) {
                // Server will wait until receiving ws msg to handleBlockFinalized()
                return false;
            }
        } catch (err) {
            console.log(
                `Error in chronik.block(${tipHash}) in handleAppStartup()`,
                err,
            );
            // Server will wait until receiving ws msg to handleBlockFinalized()
            return false;
        }

        return module.exports.handleBlockFinalized(
            chronik,
            db,
            cache,
            telegramBot,
            channelId,
            tipHash,
            tipHeight,
        );
    },
    /**
     * Update registered aliases, server state, and pending aliases. Send a telegram
     * msg announcing new alias registrations.
     * @param {object} chronik initialized chronik object
     * @param {object} db an initialized mongodb instance
     * @param {object} cache an initialized node-cache instance
     * @param {object} telegramBot initialized node-telegram-bot-api instance
     * @param {string} channelId channel where telegramBot is admin
     * @param {string} tipHash hash of the chaintip block
     * @param {number | undefined} tipHeight height of the chaintip block
     * @returns {bool | string} false if error, string summarizing results on success
     */
    handleBlockFinalized: async function (
        chronik,
        db,
        cache,
        telegramBot,
        channelId,
        tipHash,
        tipHeight,
    ) {
        /*
         * BLK_FINALIZED callback
         *
         * This is where alias-server queries the blockchain for new transactions and
         * parses those transactions to determine if any are valid alias registrations
         *
         * The database may only be updated if we have a known blockhash and height with
         * isFinalBlock = true confirmed by avalanche
         *
         * A number of error conditions may cause parseWebsocketMessage to exit before any update to
         * the database occurs.
         */

        // Cache the tipHeight
        cache.set('tipHeight', tipHeight);

        const serverState = await getServerState(db);
        if (!serverState) {
            // TODO notify admin
            return false;
        }

        const { processedBlockheight, processedConfirmedTxs } = serverState;

        const allUnprocessedTxs = await getUnprocessedTxHistory(
            chronik,
            aliasConstants.registrationAddress,
            processedBlockheight,
            processedConfirmedTxs,
        );

        if (!allUnprocessedTxs) {
            console.log(
                `Error getting allUnprocessedTxs, exiting handleBlockConnected for ${tipHeight}`,
            );
            // If there is an error getting all the tx history, exit and do not update server state
            return;
        }

        // Separate confirmed and unconfirmed txs as they will be processed separately
        const { confirmedTxs, unconfirmedTxs } =
            splitTxsByConfirmed(allUnprocessedTxs);

        // Process unconfirmed txs for pending
        for (const unconfirmedTx of unconfirmedTxs) {
            await parseTxForPendingAliases(
                db,
                cache,
                unconfirmedTx,
                aliasConstants,
            );
        }

        // If serverState is ahead of the calling block, return false before updating serverState
        // Process pending txs before backing out here, as these should process on app startup
        // A common scenario is starting the app, updating to a block, then restarting the app
        // before a new block is found -- in this case, we still want to check for new pending aliases
        if (processedBlockheight >= tipHeight) {
            // TODO notify admin
            return false;
        }

        // Get all potentially valid alias registrations
        // i.e. correct fee is paid, prefix is good, everything good but not yet checked against
        // conflicting aliases that registered earlier or have alphabetically earlier txid in
        // same block
        const unprocessedAliasTxs = getAliasTxs(confirmedTxs, aliasConstants);

        // Add new valid alias txs to the database and get a list of what was added
        const newAliasRegistrations = await registerAliases(
            db,
            unprocessedAliasTxs,
            tipHeight,
        );

        // New processedBlockheight is the highest one seen, or the
        // height of the first entry of the confirmedUnprocessedTxs array
        // New processedConfirmedTxs is determined by adding the count of now-processed txs
        const newServerState = {
            processedBlockheight: tipHeight,
            processedConfirmedTxs: processedConfirmedTxs + confirmedTxs.length,
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

        // Send alias announcements
        // Do not await this async function
        // Let the msgs send async in the background without holding up the next block processing
        sendAliasAnnouncements(telegramBot, channelId, newAliasRegistrations);

        // Delete all pending alias txs that were attempting to register an alias that is now successfully registered
        for (const newAliasRegistration of newAliasRegistrations) {
            await deletePendingAliases(db, {
                alias: newAliasRegistration.alias,
            });
        }

        // Delete all pending alias txs that were seen more than pendingExpirationBlocks ago
        await deletePendingAliases(db, {
            tipHeight: {
                $lt: tipHeight - config.pendingExpirationBlocks,
            },
        });

        console.log('\x1b[32m%s\x1b[0m', `✔ ${tipHeight}`);
        return `Alias registrations updated to block ${tipHash} at height ${tipHeight}`;
    },
    /**
     * Check if an incoming tx represents a pending alias tx. If so, add it to pendingAliases collection.
     * Note that the addedToMempool event will only ever be called on unconfirmed txs, but it is possible
     * for this tx to become confirmed by the time we check chronik.tx
     * Note that it is possible for an alias registration tx to contain multiple registrations
     * @param {object} chronik initialized chronik object
     * @param {object} db initialized mongodb instance
     * @param {object} cache an initialized node-cache instance
     * @param {string} txid transaction id from chronik websocket msg
     * @returns {bool} true if txid contains a pending alias tx and it was added to the pendingAliases collection
     * @throws {error} on chronik error
     */
    handleAddedToMempool: async function (chronik, db, cache, txid) {
        // Get tx info with chronik
        let txDetails;
        try {
            txDetails = await chronik.tx(txid);
        } catch (err) {
            console.log(
                `Error in chronik.tx(${txid}) in handleAddedToMempool`,
                err,
            );
            throw err;
        }

        return parseTxForPendingAliases(db, cache, txDetails, aliasConstants);
    },
};
