// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const log = require('./log');

module.exports = {
    handleAppStartup: async function () {
        log(`Checking for new aliases on startup`);

        // If this is app startup, get the latest tipHash and tipHeight by querying the blockchain
        // TODO function params to be db, telegramBot, channelId
        // TODO get chaintipinfo from chronik call
        // TODO handle error in chaintipinfo chronik call
        // TODO assign value for tipHeight on successful chaintipinfo call
        // call handleBlockConnected on params (db, telegramBot, channelId, tipHash, tipHeight)
    },
    // TODO handleBlockConnected will also accept an optional tipHeight param
    handleBlockConnected: async function (db, telegramBot, channelId, tipHash) {
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

        // TODO chronik call to get tipHeight if unknown
        // TODO handle error in chronik call to get tipHeight

        // TODO Get the valid aliases already in the db

        // TODO get server state
        // processedConfirmedTxs - count of processed confirmed txs
        // processedBlockheight - highest blockheight seen by the server

        // TODO get set of transactions not yet processed by the server
        // If app startup, this is full tx history of alias registration address

        // TODO parse tx history for latest valid alias registrations
        // with valid format and fee

        // TODO update database with latest valid alias information

        // TODO update server state
        // TODO If you have new aliases to add to the db, add them + send a tg msg
        // TODO If not, exit loop

        log(`Alias registrations updated to block ${tipHash}`);
        return `Alias registrations updated to block ${tipHash}`;
    },
};
