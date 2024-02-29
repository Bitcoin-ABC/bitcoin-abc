// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const express = require('express');
var cors = require('cors');
const requestIp = require('request-ip');
const helmet = require('helmet');

module.exports = {
    startExpressServer: function (port) {
        // Initialize express
        const app = express();

        // Enhanced security for express apps
        // https://www.npmjs.com/package/helmet
        app.use(helmet());

        // Use JSON for data
        app.use(express.json());

        // Use requestIp for logging IP addresses of requests
        app.use(requestIp.mw());

        // Use cors
        // TODO configure so that we only recognize requests from trusted domains, e.g. https://cashtab.com/
        app.use(cors());

        // API endpoints
        app.get('/status', async function (req, res) {
            // Get IP address from before cloudflare proxy
            const ip = req.clientIp;
            console.log(`/status from IP: ${ip}, host ${req.headers.host}`);

            return res.status(200).json({
                status: 'running',
            });
        });

        return app.listen(port);
    },
};
