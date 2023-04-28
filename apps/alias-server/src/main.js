// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const config = require('../config');
const { initializeWebsocket } = require('./chronikWsHandler');
const { handleAppStartup } = require('./events');
const { initializeDb } = require('./db');
const express = require('express');
var cors = require('cors');
const requestIp = require('request-ip');

module.exports = {
    main: async function (
        mongoClient,
        chronik,
        address,
        telegramBot,
        channelId,
        avalancheRpc,
        returnMocks = false,
    ) {
        // Initialize db connection
        const db = await initializeDb(mongoClient);

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
            return { db, aliasWebsocket, appStartup };
        }

        // Set up your API endpoints
        const app = express();
        app.use(express.json());
        app.use(requestIp.mw());
        app.use(cors());

        app.get('/aliases', async function (req, res) {
            // Get IP address from before cloudflare proxy
            const ip = req.clientIp;
            console.log(`/aliases from IP: ${ip}, host ${req.headers.host}`);
            let aliases;
            try {
                aliases = await db
                    .collection(config.database.collections.validAliases)
                    .find()
                    .project({ _id: 0, txid: 0, blockheight: 0 })
                    .toArray();
                return res.status(200).json(aliases);
            } catch (error) {
                return res.status(500).json({ error });
            }
        });

        app.listen(config.express.port);
    },
};
