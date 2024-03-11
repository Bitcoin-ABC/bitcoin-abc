// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from './config';
import { startExpressServer } from './src/routes';
import { initializeWebsocket } from './src/chronik/wsHandler';
import { ChronikClientNode } from 'chronik-client';

// Connect to available in-node chronik servers
const chronik = new ChronikClientNode(config.chronikUrls);

// Initialize websocket connection and log incoming blocks
initializeWebsocket(chronik).then(
    ws => {
        // Start the express app to expose API endpoints
        const server = startExpressServer(config.port, chronik);
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
