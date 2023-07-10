// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const config = require('../config');
const express = require('express');
var cors = require('cors');
const requestIp = require('request-ip');
const { getAliasInfoFromAlias, getAliasInfoFromAddress } = require('./db');
const aliasConstants = require('../constants/alias');

module.exports = {
    startServer: function (db, port) {
        // Set up your API endpoints
        const app = express();
        app.use(express.json());
        app.use(requestIp.mw());
        app.use(cors());

        app.get('/prices', async function (req, res) {
            // Get IP address from before cloudflare proxy
            const ip = req.clientIp;
            console.log(`/prices from IP: ${ip}, host ${req.headers.host}`);
            // Add a note about prices
            let pricesResponse = {
                note: 'alias-server is in beta and these prices are not finalized.',
                prices: aliasConstants.registrationFeesSats,
            };
            try {
                return res.status(200).json(pricesResponse);
            } catch (err) {
                return res.status(500).json({
                    error:
                        err && err.message
                            ? err.message
                            : 'Error fetching /prices',
                });
            }
        });

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

        app.get('/alias/:alias', async function (req, res) {
            // Get the requested alias
            const alias = req.params.alias;

            // Log the request
            console.log(
                `/alias/${alias} from IP: ${req.clientIp}, host ${req.headers.host}`,
            );

            // Lookup the alias
            let response;
            try {
                response = await getAliasInfoFromAlias(db, alias);
                // Custom msg if alias has not yet been registered
                if (response === null) {
                    response = { alias, isRegistered: false };
                } else {
                    response.isRegistered = true;
                }

                // Return successful response
                return res.status(200).json(response);
            } catch (err) {
                // Return error response
                return res.status(500).json({
                    error: `Error fetching /alias/${alias}${
                        err && err.message ? `: ${err.message}` : ''
                    }`,
                });
            }
        });

        app.get('/address/:address', async function (req, res) {
            // Get the requested alias
            const address = req.params.address;

            // Log the request
            console.log(
                `/address/${address} from IP: ${req.clientIp}, host ${req.headers.host}`,
            );

            // Lookup the aliases at given address
            try {
                return res
                    .status(200)
                    .json(await getAliasInfoFromAddress(db, address));
            } catch (err) {
                // Return error response
                return res.status(500).json({
                    error: `Error fetching /address/${address}${
                        err && err.message ? `: ${err.message}` : ''
                    }`,
                });
            }
        });

        return app.listen(port);
    },
};
