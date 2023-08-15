// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const { handleBlockConnected, handleAddedToMempool } = require('./events');
const { deletePendingAliases } = require('./db');
const cashaddr = require('ecashaddrjs');
const AsyncLock = require('async-lock');
const blockConnectedLock = new AsyncLock();

module.exports = {
    /**
     * Initialize chronik websocket connection to the alias registration address
     * @param {object} chronik initialized chronik object
     * @param {string} address address that registeres new aliases
     * @param {object} db an initialized mongodb instance
     * @param {object} cache an initialized node-cache instance
     * @param {object} telegramBot initialized node-telegram-bot-api instance
     * @param {string} channelId channel where telegramBot is admin
     * @param {object} avalancheRpc avalanche auth
     * @returns {object} connected websocket
     */
    initializeWebsocket: async function (
        chronik,
        address,
        db,
        cache,
        telegramBot,
        channelId,
        avalancheRpc,
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
                    avalancheRpc,
                    msg,
                );
            },
        });
        // Wait for WS to be connected:
        await ws.waitForOpen();
        console.log(`Connected to websocket`);
        const { type, hash } = cashaddr.decode(address, true);
        ws.subscribe(type, hash);
        return ws;
    },
    /**
     * Handle incoming msgs from the connected chronik websocket
     * @param {object} chronik initialized chronik object
     * @param {object} db an initialized mongodb instance
     * @param {object} cache an initialized node-cache instance
     * @param {object} telegramBot initialized node-telegram-bot-api instance
     * @param {string} channelId channel where telegramBot is admin
     * @param {object} avalancheRpc avalanche auth
     * @param {object} wsMsg msg from connected chronik websocket
     * @returns
     */
    parseWebsocketMessage: async function (
        chronik,
        db,
        cache,
        telegramBot,
        channelId,
        avalancheRpc,
        wsMsg = { type: 'BlockConnected' },
    ) {
        // Determine type of tx
        const { type } = wsMsg;
        // type can be AddedToMempool, BlockConnected, or Confirmed
        // For now, we are only interested in "Confirmed", as only these are valid
        // We will want to look at AddedToMempool to process pending alias registrations later

        switch (type) {
            case 'BlockConnected': {
                return blockConnectedLock
                    .acquire('handleBlockConnected', async function () {
                        return await handleBlockConnected(
                            chronik,
                            db,
                            cache,
                            telegramBot,
                            channelId,
                            avalancheRpc,
                            wsMsg.blockHash,
                        );
                    })
                    .then(
                        result => {
                            // lock released with no error
                            return result;
                        },
                        error => {
                            // lock released with error thrown by handleBlockConnected()
                            console.log(
                                `Error in handleBlockConnected called by ${wsMsg.blockHash}`,
                                error,
                            );
                            // TODO notify admin
                            return false;
                        },
                    );
            }
            case 'AddedToMempool':
                return handleAddedToMempool(chronik, db, cache, wsMsg.txid);
            case 'RemovedFromMempool':
                return deletePendingAliases(db, { txid: wsMsg.txid });
            case 'Confirmed':
                break;
            default:
        }
    },
};
