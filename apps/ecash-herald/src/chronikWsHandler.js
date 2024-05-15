// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const { handleBlockConnected, handleBlockFinalized } = require('./events');

module.exports = {
    initializeWebsocket: async function (
        chronik,
        telegramBot,
        channelId,
        memoryCache,
    ) {
        // Subscribe to chronik websocket
        const ws = chronik.ws({
            onMessage: async msg => {
                await module.exports.parseWebsocketMessage(
                    chronik,
                    msg,
                    telegramBot,
                    channelId,
                    memoryCache,
                );
            },
        });
        // Wait for WS to be connected:
        await ws.waitForOpen();
        console.log(`Listening for chronik block msgs`);
        // Subscribe to blocks
        ws.subscribeToBlocks();
        return ws;
    },
    parseWebsocketMessage: async function (
        chronik,
        wsMsg,
        telegramBot,
        channelId,
        memoryCache,
    ) {
        // Get height and msg type
        // Note that herald only subscribes to blocks, so only MsgBlockClient is expected here
        const { msgType, blockHeight, blockHash } = wsMsg;

        switch (msgType) {
            case 'BLK_CONNECTED': {
                handleBlockConnected(
                    telegramBot,
                    channelId,
                    blockHash,
                    blockHeight,
                    memoryCache,
                );
                break;
            }
            case 'BLK_FINALIZED': {
                return handleBlockFinalized(
                    chronik,
                    telegramBot,
                    channelId,
                    blockHash,
                    blockHeight,
                    memoryCache,
                );
            }
            default:
                // Do nothing for other events
                return false;
        }
    },
};
