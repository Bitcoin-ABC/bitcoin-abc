// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('./config');
const { startExpressServer } = require('./src/routes');
const { initializeWebsocket } = require('./src/chronik/wsHandler');
const { ChronikClientNode } = require('chronik-client');

// Connect to available in-node chronik servers
const chronik = new ChronikClientNode(config.chronikUrls);

// Initialize websocket connection and log incoming blocks
initializeWebsocket(chronik).then(
    ws => {
        console.log(
            `chronik-client connected to websocket hosted by`,
            ws._proxyInterface._endpointArray[ws._proxyInterface._workingIndex]
                .wsUrl,
        );
        // Start the express app to expose API endpoints
        const server = startExpressServer(config.port);
        console.log(`Express server started on port ${config.port}`);

        // Gracefully shut down on app termination
        process.on('SIGTERM', () => {
            // kill <pid> from terminal
            server.close();
            console.log('token-server shut down by SIGTERM');
            process.exit(0);
        });

        process.on('SIGINT', () => {
            // ctrl + c in nodejs
            server.close();
            console.log('token-server shut down by ctrl+c');
            process.exit(0);
        });
    },
    err => {
        console.log(`Error initializing websocket in token-server`, err);
        // Shut down in error condition
        process.exit(1);
    },
);
