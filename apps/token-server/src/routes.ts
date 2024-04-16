// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import express, { Express, Request, Response } from 'express';
import sharp from 'sharp';
import * as http from 'http';
import multer from 'multer';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import config from '../config';
import secrets from '../secrets';
import { getHistoryAfterTimestamp } from './chronik/clientHandler';
import { isAddressEligibleForTokenReward } from './rewards';
import { sendReward } from './transactions';
import { ChronikClientNode } from 'chronik-client';
import { isTokenImageRequest } from './validation';
import makeBlockie from 'ethereum-blockies-base64';
import TelegramBot from 'node-telegram-bot-api';
import { alertNewTokenIcon } from '../src/telegram';
import cashaddr from 'ecashaddrjs';

/**
 * routes.ts
 * Start Express server and expose API endpoints
 */

// Get outputscript of the server wallet
// Used to check eligibility of reward recipients
const SERVER_WALLET_OUTPUTSCRIPT = cashaddr.getOutputScriptFromAddress(
    secrets.prod.wallet.address,
);

// Define upload size limit
var upload = multer({
    limits: { fileSize: config.maxUploadSize },
});

// Only allow images uploads to come from approved domains
var whitelist = config.whitelist;
var corsOptions: CorsOptions = {
    origin: function (origin: string | undefined, callback: Function) {
        if (typeof origin === 'undefined' || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

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
    telegramBot: TelegramBot,
    fs: any,
): http.Server => {
    // Initialize express
    const app: Express = express();

    // Enhanced security for express apps
    // https://www.npmjs.com/package/helmet
    app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

    // Use JSON for data
    app.use(express.json());

    // Use cors
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

            if (!cashaddr.isValidCashAddress(address, 'ecash')) {
                return res.status(500).json({
                    address,
                    error: `Invalid eCash address`,
                });
            }

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
                    address,
                    error: 'chronik error determining address eligibility',
                });
            }

            // Determine if the address is eligible
            const isAddressEligible = isAddressEligibleForTokenReward(
                address,
                config.rewardsTokenId,
                SERVER_WALLET_OUTPUTSCRIPT,
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

    app.get('/claim/:address', async function (req: Request, res: Response) {
        // Get the requested address
        const address = req.params.address;

        logIpInfo(req);

        if (!cashaddr.isValidCashAddress(address, 'ecash')) {
            return res.status(500).json({
                address,
                error: `Invalid eCash address`,
            });
        }

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
                address,
                error: `chronik error building token reward`,
            });
        }

        // Determine if the address is eligible
        const isAddressEligible = isAddressEligibleForTokenReward(
            address,
            config.rewardsTokenId,
            SERVER_WALLET_OUTPUTSCRIPT,
            historyToCheck,
        );

        if (typeof isAddressEligible === 'number') {
            // Return address ineligible response
            return res.status(500).json({
                address,
                error: `Address is not yet eligible for token rewards`,
                becomesEligible:
                    isAddressEligible + config.eligibilityResetSeconds,
            });
        }

        // Build and broadcast reward tx
        let rewardSuccess;
        try {
            rewardSuccess = await sendReward(
                chronik,
                secrets.prod.wallet,
                1, // Send txs at 1 satoshi per byte
                config.rewardsTokenId,
                config.rewardAmountTokenSats,
                address,
            );
        } catch (err) {
            // Return server error response
            return res.status(500).json({
                error: `Error sending rewards tx, please contact admin`,
                msg: `${err}`,
            });
        }

        // Get txid before sending response
        const { txid } = rewardSuccess.response;
        interface SendRewardResponse {
            address: string;
            txid?: string;
            msg: string;
        }
        const response: SendRewardResponse = {
            address,
            txid,
            msg: 'Success',
        };

        return res.status(200).json(response);
    });

    // Post endpoint for token ID on token creation
    // Accept a png (only from cashtab.com or browser extension domain; validation on front end)
    // TODO let anyone change a tokenIcon if they sign a msg with the mint address
    app.post(
        '/new',
        cors(corsOptions),
        upload.single(
            'tokenIcon' /* name attribute of <file> element in your form */,
        ),
        async (req: Request, res: Response) => {
            // Get IP address from before cloudflare proxy
            logIpInfo(req);

            // For now, we only support automatically creating a tokenId on token creation in Cashtab
            // So, we get the token id from req.body.tokenId, from Cashtab
            const tokenId = req.body.tokenId;
            if (typeof req.file === 'undefined') {
                // Should never happen
                console.log(`No file in "/new" token icon request`);
                return res.status(500).json({
                    status: 'error',
                    msg: 'No file in "/new" token icon request',
                });
            }

            if (req.file.mimetype === 'image/png') {
                // If the upload is a png (our only supported file type)

                if (
                    fs.existsSync(
                        `${config.imageDir}/${config.iconSizes[0]}/${tokenId}.png`,
                    )
                ) {
                    // If the icon already exists, send an error response
                    return res.status(500).json({
                        status: 'error',
                        msg: `Token icon already exists for ${tokenId}`,
                    });
                }

                // Create token icon png files at all supported sizes
                const resizePromises = [];

                for (const size of config.iconSizes) {
                    const resizePromise = sharp(req.file.buffer)
                        .resize(size)
                        .toBuffer()
                        .then(img => {
                            fs.writeFileSync(
                                `${config.imageDir}/${size}/${tokenId}.png`,
                                img,
                            );
                        });
                    resizePromises.push(resizePromise);
                }
                try {
                    await Promise.all(resizePromises);
                } catch (err) {
                    console.log(`Error resizing image`, err);
                    return res.status(500).json({
                        status: 'error',
                        msg: `Error resizing uploaded token icon`,
                    });
                }

                // Send tg msg with approve/deny option
                alertNewTokenIcon(
                    telegramBot,
                    secrets.prod.channelId,
                    req.body,
                );
                return res.status(200).json({
                    status: 'ok',
                });
            } else {
                // Note: Cashtab front-end already converts to png and restricts accept types
                // to png or jpg
                // TODO support SVG and other types, you can convert more readily here than in Cashtab

                // Send an error response
                return res.status(403).json({
                    status: 'error',
                    msg: 'Only .png files are allowed.',
                });
            }
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
