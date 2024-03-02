// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ChronikClientNode,
    WsEndpoint_InNode,
    WsMsgClient,
} from 'chronik-client';
/**
 * Connect to websocket with msg handler and subscribe to blocks
 * @param {object} chronik intialized chronik-client
 * @returns {object} connected websocket
 */
export const initializeWebsocket = async (
    chronik: ChronikClientNode,
): Promise<WsEndpoint_InNode> => {
    const ws: WsEndpoint_InNode = chronik.ws({
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
export const handleWsMsg = (msg: WsMsgClient) => {
    console.log(msg);
};
