// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const config = require('../config');
const express = require('express');
var cors = require('cors');
const requestIp = require('request-ip');
const {
    getAliasInfoFromAlias,
    getAliasInfoFromAddress,
    getServerState,
    getPendingAliases,
} = require('./db');
const { getAliasPrice } = require('./utils');
const aliasConstants = require('../constants/alias');
const { isValidCashAddress } = require('ecashaddrjs');
const helmet = require('helmet');

module.exports = {
    startServer: function (db, port) {
        // Set up your API endpoints
        const app = express();
        app.use(helmet());
        app.use(express.json());
        app.use(requestIp.mw());
        app.use(cors());

        app.get('/prices', async function (req, res) {
            // Get IP address from before cloudflare proxy
            const ip = req.clientIp;
            console.log(`/prices/ from IP: ${ip}, host ${req.headers.host}`);

            let pricesResponse = {
                note: 'alias-server is in beta and these prices are not finalized.',
                prices: aliasConstants.prices,
            };

            return res.status(200).json(pricesResponse);
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

            // Get the server state
            // This is also a reflection of the "availability" of any given alias
            // It's only known to be available in the block after server state processedBlockheight
            const serverState = await getServerState(db);
            if (!serverState) {
                return res.status(500).json({
                    error: `Error fetching /alias/${alias}: alias-server was unable to fetch server state`,
                });
            }

            // Lookup the alias
            let response;
            try {
                response = await getAliasInfoFromAlias(db, alias);
                if (response === null) {
                    // Custom msg if alias has not yet been registered

                    // Check for pending registrations of this alias if it is not confirmed
                    const pending = await getPendingAliases(
                        db,
                        { alias },
                        // Get the registering txid and address of pending registrations for this alias
                        { _id: 0, address: 1, txid: 1 },
                    );

                    response = { alias, isRegistered: false };
                    // Also include the price, since implementing wallet already has to make
                    // API call to check availability
                    // Should just be one call
                    const { processedBlockheight } = serverState;

                    const { registrationFeeSats, priceExpirationHeight } =
                        getAliasPrice(
                            aliasConstants.prices,
                            alias.length,
                            processedBlockheight + 1, // API returns price to get into the next block
                        );
                    response = {
                        alias,
                        isRegistered: false,
                        pending,
                        registrationFeeSats,
                        processedBlockheight,
                    };
                    if (priceExpirationHeight !== null) {
                        response.priceExpirationHeight = priceExpirationHeight;
                    }
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
            let address = req.params.address;

            // Validate input is an ecash: address
            const isValidAddress = isValidCashAddress(address, 'ecash');
            if (!isValidAddress) {
                return res.status(500).json({
                    error: `Error fetching /address/${address}: Input must be a valid eCash address`,
                });
            }

            // Note: prefixless address is valid if checksum matches 'ecash'
            // But database stores all addresses with a prefix
            if (!address.startsWith('ecash:')) {
                //  If query comes from a prefixless valid address, give it a prefix for your db query
                address = `ecash:${address}`;
            }

            // Log the request
            console.log(
                `/address/${address} from IP: ${req.clientIp}, host ${req.headers.host}`,
            );

            try {
                // Lookup the aliases at given address

                const registered = await getAliasInfoFromAddress(db, address);
                const pending = await getPendingAliases(
                    db,
                    { address },
                    // We don't need tipHeight or address
                    { _id: 0, alias: 1, txid: 1 },
                );
                const addressReturnObject = { registered, pending };
                return res.status(200).json(addressReturnObject);
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
