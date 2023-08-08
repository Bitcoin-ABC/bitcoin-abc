// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

const ecashaddr = require('ecashaddrjs');

/**
 * Creates a websocket subscription to listen for confirmation on a given txid
 *
 * @param {string} chronik the chronik-client instance
 * @param {string} address the eCash address that generated the txid
 * @param {string} txid the txid to be subscribed to
 * @throws {error} err chronik websocket subscription errors
 */
async function listenForConfirmation(chronik, address, txid) {
    const { type, hash } = ecashaddr.decode(address, true);
    try {
        const ws = chronik.ws({
            onMessage: msg => {
                if (msg.type === 'Confirmed' && msg.txid === txid) {
                    console.log(
                        `listenForConfirmation: ${txid} has received one confirmation`,
                    );
                    // Confirmation received, unsubscribe and close websocket
                    ws.unsubscribe(type, hash);
                    ws.close();
                }
            },
            onReconnect: e => {
                // Fired before a reconnect attempt is made:
                console.log(
                    'listenForConfirmation: Reconnecting websocket, disconnection cause: ',
                    e,
                );
            },
        });

        // Wait for WS to be connected:
        await ws.waitForOpen();

        // Subscribe to scripts
        ws.subscribe(type, hash);
    } catch (err) {
        console.log(
            'listenForConfirmation: Error in chronik websocket subscription: ' +
                err,
        );
    }
}

// Executed via 'npm run listenForConfirmation <address> <txid>'
(async () => {
    // extract args provided at CLI
    const argsFromCli = process.argv.slice(2);
    const address = argsFromCli[0];
    const txid = argsFromCli[1];

    // instantiate chronik-client
    const { ChronikClient } = require('chronik-client');
    const chronik = new ChronikClient('https://chronik.fabien.cash');

    await listenForConfirmation(chronik, address, txid);
})();

module.exports.listenForConfirmation = listenForConfirmation;
