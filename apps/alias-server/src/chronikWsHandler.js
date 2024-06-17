// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const { handleBlockFinalized, handleAddedToMempool } = require('./events');
const { deletePendingAliases } = require('./db');
const cashaddr = require('ecashaddrjs');
const AsyncLock = require('async-lock');
const blockFinalizedLock = new AsyncLock();

module.exports = {
    /**
     * Initialize chronik websocket connection to the alias registration address
     * @param {ChronikClient} chronik initialized chronik object
     * @param {string} address address that registeres new aliases
     * @param {object} db an initialized mongodb instance
     * @param {object} cache an initialized node-cache instance
     * @param {object} telegramBot initialized node-telegram-bot-api instance
     * @param {string} channelId channel where telegramBot is admin
     * @returns {object} connected websocket
     */
    initializeWebsocket: async function (
        chronik,
        address,
        db,
        cache,
        telegramBot,
        channelId,
    ) {
        // Subscribe to chronik websocket
        const ws = chronik.ws({
            onMessage: async msg => {
                await module.exports.parseWebsocketMessage(
                    chronik,
                    db,
                    cache,
                    telegramBot,
                    channelId,
                    msg,
                );
            },
        });
        // Wait for WS to be connected:
        await ws.waitForOpen();
        console.log(`Connected to websocket`);
        const { type, hash } = cashaddr.decode(address, true);
        ws.subscribeToScript(type, hash);
        ws.subscribeToBlocks();
        return ws;
    },
    /**
     * Handle incoming msgs from the connected chronik websocket
     * @param {object} chronik initialized chronik object
     * @param {object} db an initialized mongodb instance
     * @param {object} cache an initialized node-cache instance
     * @param {object} telegramBot initialized node-telegram-bot-api instance
     * @param {string} channelId channel where telegramBot is admin
     * @param {object} wsMsg msg from connected chronik websocket
     * @returns
     */
    parseWebsocketMessage: async function (
        chronik,
        db,
        cache,
        telegramBot,
        channelId,
        wsMsg,
    ) {
        // Determine type of tx
        const { msgType } = wsMsg;
        // for type === "Block"
        // msgType can be BLK_CONNECTED, BLK_DISCONNECTED, or BLK_FINALIZED
        // We are only interested in BLK_FINALIZED, as only these cannot be re-organized

        // for type == "Tx"
        // msgType can be TX_ADDED_TO_MEMPOOL, TX_REMOVED_FROM_MEMPOOL, TX_CONFIRMED, TX_FINALIZED

        switch (msgType) {
            case 'BLK_FINALIZED': {
                return blockFinalizedLock
                    .acquire('handleBlockFinalized', async function () {
                        return await handleBlockFinalized(
                            chronik,
                            db,
                            cache,
                            telegramBot,
                            channelId,
                            wsMsg.blockHash,
                            wsMsg.blockHeight,
                        );
                    })
                    .then(
                        result => {
                            // lock released with no error
                            return result;
                        },
                        error => {
                            // lock released with error thrown by handleBlockFinalized()
                            console.log(
                                `Error in handleBlockFinalized called by ${wsMsg.blockHash}`,
                                error,
                            );
                            // TODO notify admin
                            return false;
                        },
                    );
            }
            case 'TX_ADDED_TO_MEMPOOL':
                return handleAddedToMempool(chronik, db, cache, wsMsg.txid);
            case 'TX_REMOVED_FROM_MEMPOOL':
                return deletePendingAliases(db, { txid: wsMsg.txid });
            default:
                // No action for all other msg types
                break;
        }
    },
};
