// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const config = require('../config');
const express = require('express');
var cors = require('cors');
const requestIp = require('request-ip');

module.exports = {
    startServer: function (db, port) {
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
                    .project({ _id: 0 })
                    .toArray();
                return res.status(200).json(aliases);
            } catch (error) {
                return res.status(500).json({
                    error:
                        error && error.message
                            ? error.message
                            : 'Error fetching /aliases',
                });
            }
        });

        return app.listen(port);
    },
};
