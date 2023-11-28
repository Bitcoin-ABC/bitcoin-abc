// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const { initializeWebsocket } = require('./chronikWsHandler');

module.exports = {
    main: async function (
        chronik,
        websocketSubscriptionAddress,
        telegramBot,
        telegramChannelId,
    ) {
        // Initialize websocket connection
        try {
            await initializeWebsocket(
                chronik,
                websocketSubscriptionAddress,
                telegramBot,
                telegramChannelId,
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
