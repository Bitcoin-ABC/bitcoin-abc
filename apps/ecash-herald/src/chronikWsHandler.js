// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const cashaddr = require('ecashaddrjs');
const { handleBlockConnected } = require('./events');

module.exports = {
    initializeWebsocket: async function (
        chronik,
        address,
        telegramBot,
        channelId,
    ) {
        // Subscribe to chronik websocket
        const ws = chronik.ws({
            onMessage: async msg => {
                await module.exports.parseWebsocketMessage(
                    chronik,
                    msg,
                    telegramBot,
                    channelId,
                );
            },
        });
        // Wait for WS to be connected:
        await ws.waitForOpen();
        console.log(`Connected to websocket`);
        // Subscribe to scripts (on Lotus, current ABC payout address):
        // Will give a message on avg every 2 minutes
        const { type, hash } = cashaddr.decode(address, true);
        ws.subscribe(type, hash);
        return ws;
    },
    parseWebsocketMessage: async function (
        chronik,
        wsMsg,
        telegramBot,
        channelId,
    ) {
        console.log(`New chronik websocket message`, wsMsg);
        // Determine type of tx
        const { type } = wsMsg;

        // type can be AddedToMempool, BlockConnected, or Confirmed
        // For now, herald only supports BlockConnected

        switch (type) {
            case 'BlockConnected': {
                return handleBlockConnected(
                    chronik,
                    telegramBot,
                    channelId,
                    wsMsg.blockHash,
                );
            }
            default:
                console.log(`New websocket message of unknown type:`, wsMsg);
                return false;
        }
    },
};
