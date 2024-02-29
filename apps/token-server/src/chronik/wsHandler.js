// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

/**
 * Connect to websocket with msg handler and subscribe to blocks
 * @param {object} chronik intialized chronik-client
 * @returns {object} connected websocket
 */
const initializeWebsocket = async chronik => {
    const ws = chronik.ws({
        onMessage: msg => {
            handleWsMsg(msg);
        },
    });
    // Wait for WS to be connected:
    await ws.waitForOpen();
    // Subscribe to blocks
    ws.subscribeToBlocks();
    return ws;
};

/**
 * Handle msgs received from the websocket
 * @param {object} msg type WsMsgClient from ChronikClientNode
 */
const handleWsMsg = msg => {
    console.log(msg);
};

module.exports = { initializeWebsocket, handleWsMsg };
