// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const { caching } = require('cache-manager');
const { initializeWebsocket } = require('./chronikWsHandler');

module.exports = {
    main: async function (chronik, telegramBot, telegramChannelId) {
        // Initialize a cache
        // Store data for 2*config.waitForFinalizationMsecs. For now, this is only used
        // to determine if a block connected and subsequently did not finalize
        // within config.waitForFinalizationMsecs
        const CACHE_TTL = 2 * config.waitForFinalizationMsecs;
        const memoryCache = await caching('memory', {
            max: 100,
            ttl: CACHE_TTL,
        });
        // Initialize websocket connection
        try {
            await initializeWebsocket(
                chronik,
                telegramBot,
                telegramChannelId,
                memoryCache,
            );
        } catch (err) {
            console.log(
                `Error initializing ecash-herald websocket connection`,
                err,
            );
            console.log(`Failed to start ecash-herald.`);
            return err;
        }
    },
};
