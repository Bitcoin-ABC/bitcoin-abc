// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import express, { Express, Request, Response } from 'express';
import * as http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import config from '../config';
import { getHistoryAfterTimestamp } from './chronik/clientHandler';
import { isAddressEligibleForTokenReward } from './rewards';
import { ChronikClientNode } from 'chronik-client';
import { isTokenImageRequest } from './validation';
import makeBlockie from 'ethereum-blockies-base64';

/**
 * routes.ts
 * Start Express server and expose API endpoints
 */

/**
 * Standard IP logger function to be called by all endpoints
 * @param request express request
 */
function logIpInfo(req: Request) {
    const ip = req.socket.remoteAddress;
    console.log(`${req.url} from IP: ${ip}, host ${req.headers.host}`);
}

export const startExpressServer = (
    port: Number,
    chronik: ChronikClientNode,
): http.Server => {
    // Initialize express
    const app: Express = express();

    // Enhanced security for express apps
    // https://www.npmjs.com/package/helmet
    app.use(helmet());

    // Use JSON for data
    app.use(express.json());

    // Use cors
    // TODO configure so that we only recognize requests from trusted domains, e.g. https://cashtab.com/
    app.use(cors());

    // Serve static files from the imageDir directory
    // Note this must be a docker volume for prod
    app.use(express.static(config.imageDir));
    console.log(`Serving static assets from ${config.imageDir}`);

    // API endpoints
    app.get('/status', async function (req: Request, res: Response) {
        logIpInfo(req);

        return res.status(200).json({
            status: 'running',
        });
    });

    app.get(
        '/is-eligible/:address',
        async function (req: Request, res: Response) {
            // Get the requested address
            const address = req.params.address;

            logIpInfo(req);

            // Get the timestamp of the request in seconds
            const timeOfRequest = Math.ceil(Date.now() / 1000);

            // Get the timestamp after which txs received at this address
            // are potentially blocking token reward eligibility
            const timestamp = timeOfRequest - config.eligibilityResetSeconds;
            // Get potentially eligible tx history
            let historyToCheck;
            try {
                historyToCheck = await getHistoryAfterTimestamp(
                    chronik,
                    address,
                    timestamp,
                );
            } catch (err: unknown) {
                console.log(`Error fetching ${req.url}`, err);
                // err is likely ChronikError, i.e. {msg}
                return res.status(500).json({
                    error:
                        typeof err === 'object' && err !== null && 'msg' in err
                            ? err.msg
                            : `Error fetching ${req.url}`,
                });
            }

            // Determine if the address is eligible
            const isAddressEligible = isAddressEligibleForTokenReward(
                address,
                config.rewardsTokenId,
                config.serverOutputScript,
                historyToCheck,
            );

            interface RewardEligibilityResponse {
                address: string;
                isEligible: boolean;
                becomesEligible?: number;
            }
            const response: RewardEligibilityResponse = {
                address,
                isEligible: false,
            };

            if (typeof isAddressEligible === 'number') {
                // If a timestamp is returned, the API returns the timestamp when the address again becomes eligible
                response.becomesEligible =
                    isAddressEligible + config.eligibilityResetSeconds;
            } else {
                response.isEligible = isAddressEligible;
            }

            return res.status(200).json(response);
        },
    );

    app.use((req, res) => {
        // Handle 404

        // Test for token icon request
        if (isTokenImageRequest(req)) {
            // Get the tokenid
            // We validate the request, so the tokenId will always be in the same place
            // e.g. /512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae3cf17ce3ef4d109.png
            const EXTENSION_LENGTH = 4; // '.png'.length
            const TOKEN_ID_AND_PNG_EXT_LENGTH = 68; // 64 + '.png'.length
            const tokenId = req.url.slice(
                req.url.length - TOKEN_ID_AND_PNG_EXT_LENGTH,
                req.url.length - EXTENSION_LENGTH,
            );

            // Build the image
            const data = makeBlockie(tokenId);
            // Prepare to serve the image as a png
            var base64Data = data.replace(/^data:image\/png;base64,/, '');
            var img = Buffer.from(base64Data, 'base64');

            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length,
            });
            // Serve the image
            // Note that these images can be any size and will fit the container used by the app dev
            return res.end(img);
        }

        // Handle 404 that was not a valid token icon (or token image asset) request
        // Log ip info and requested URL for these 404s
        logIpInfo(req);
        return res.status(404).json({ error: `Could not find ${req.url}` });
    });

    return app.listen(port);
};
