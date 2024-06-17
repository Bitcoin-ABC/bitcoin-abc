// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const { initializeWebsocket } = require('./chronikWsHandler');
const { handleAppStartup } = require('./events');

module.exports = {
    /**
     * Entrypoint of the app. Initializes server, updates indexer, and listens for new txs.
     * @param {object} db an initialized mongodb instance
     * @param {object} cache an initialized node-cache instance
     * @param {ChronikClient} chronik initialized chronik object
     * @param {string} address address that registeres new aliases
     * @param {object} telegramBot initialized node-telegram-bot-api instance
     * @param {string} channelId channel where telegramBot is admin
     * @param {bool} returnMocks
     * @returns {object} if returnMocks
     */
    main: async function (
        db,
        cache,
        chronik,
        address,
        telegramBot,
        channelId,
        returnMocks = false,
    ) {
        // Initialize websocket connection
        let aliasWebsocket;
        try {
            aliasWebsocket = await initializeWebsocket(
                chronik,
                address,
                db,
                cache,
                telegramBot,
                channelId,
            );
        } catch (err) {
            console.log(
                `Error initializing websocket connection, shutting down`,
            );
            return false;
        }

        // Get the latest alias information on app startup
        const appStartup = await handleAppStartup(
            chronik,
            db,
            cache,
            telegramBot,
            channelId,
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
     * @param {object} cache an initialized node-cache instance
     */
    cleanup: async function (server, mongoClient, cache) {
        await server.close();
        console.log('API server closed.');

        // We do not want to risk restarting the server with a stale tipHeight
        cache.flushAll();
        cache.close();
        console.log('Cache cleared.');

        await mongoClient.close();
        console.log('MongoDB connection closed.');

        // Shut down alias-server
        console.log('alias-server shut down successfully');
        process.exit(0);
    },
};
