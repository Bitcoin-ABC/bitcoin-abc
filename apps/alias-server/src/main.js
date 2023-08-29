// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const { initializeWebsocket } = require('./chronikWsHandler');
const { handleAppStartup } = require('./events');

module.exports = {
    main: async function (
        db,
        chronik,
        address,
        telegramBot,
        channelId,
        avalancheRpc,
        returnMocks = false,
    ) {
        // Initialize websocket connection
        const aliasWebsocket = await initializeWebsocket(
            chronik,
            address,
            db,
            telegramBot,
            channelId,
            avalancheRpc,
        );
        if (aliasWebsocket && aliasWebsocket._subs && aliasWebsocket._subs[0]) {
            const subscribedHash160 = aliasWebsocket._subs[0].scriptPayload;
            console.log(`Websocket subscribed to ${subscribedHash160}`);
        } else {
            // Shutdown if the websocket does not connect on startup
            return false;
        }

        // Get the latest alias information on app startup
        const appStartup = await handleAppStartup(
            chronik,
            db,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        // Return mocks for unit testing
        if (returnMocks) {
            return { aliasWebsocket, appStartup };
        }
    },
    /**
     * Make sure the the database and API server shut down gracefully
     * @param {object} server the express server returned by the startServer function in app.js
     * @param {object} mongoClient the mongo client connection
     */
    cleanup: async function (server, mongoClient) {
        await server.close();
        console.log('API server closed.');

        await mongoClient.close();
        console.log('MongoDB connection closed.');

        // Shut down alias-server
        console.log('alias-server shut down successfully');
        process.exit(0);
    },
};
