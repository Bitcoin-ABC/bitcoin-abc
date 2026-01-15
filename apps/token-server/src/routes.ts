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
import { isTokenImageRequest, isValidTokenId } from './validation';
import makeBlockie from 'ethereum-blockies-base64';
import { Bot } from 'grammy';
import { alertNewTokenIcon } from './telegram';
import { getBlacklistedTokenIds, getOneBlacklistEntry } from './db';
import { Db } from 'mongodb';
import { writeFileSync, existsSync } from 'fs';
import { IFs } from 'memfs';

/**
 * routes.ts
 * Start Express server and expose API endpoints
 */

// Define upload size limit
const upload = multer({
    limits: { fileSize: config.maxUploadSize },
});

type CorsCallback = (error: Error | null, allow?: boolean) => void;
// Only allow images uploads to come from approved domains
const whitelist = config.whitelist;
const corsOptions: CorsOptions = {
    origin: function (origin: string | undefined, callback: CorsCallback) {
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
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`${req.url} from ${ip}`);
}

/**
 * We need a type for Fs because it is a param
 * It needs to be a param because we use memfs in testing
 */
interface FsLikeRoutes {
    existsSync: typeof existsSync;
    writeFileSync: typeof writeFileSync;
}

export const startExpressServer = (
    port: number,
    db: Db,
    telegramBot: Bot,
    fs: FsLikeRoutes | IFs,
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

    // Use the x-forwarded-for IP address
    // In this way, we get the client address and not the prod server address
    // when the app is deployed with docker
    app.set('trust proxy', 1);

    // API endpoints
    app.get('/status', async function (req: Request, res: Response) {
        logIpInfo(req);

        return res.status(200).json({
            status: 'running',
        });
    });

    app.get('/blacklist', async function (req: Request, res: Response) {
        logIpInfo(req);
        try {
            const tokenIds = await getBlacklistedTokenIds(db);
            return res.status(200).json({ status: 'success', tokenIds });
        } catch (err) {
            console.error('Error retrieving tokenIds:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve tokenIds',
            });
        }
    });

    app.get(
        '/blacklist/:tokenId',
        async function (req: Request, res: Response) {
            logIpInfo(req);
            const tokenId = req.params.tokenId;

            if (typeof tokenId !== 'string' || !isValidTokenId(tokenId)) {
                return res.status(500).json({
                    status: 'error',
                    message: `Invalid tokenId: ${tokenId}`,
                });
            }
            try {
                // Check the blacklist
                const entry = await getOneBlacklistEntry(db, tokenId);
                console.log(`entry`, entry);
                if (entry) {
                    return res.status(200).json({
                        status: 'success',
                        isBlacklisted: true,
                        entry,
                    });
                } else {
                    return res.status(200).json({
                        status: 'success',
                        isBlacklisted: false,
                    });
                }
            } catch (err) {
                console.error(`Error retrieving /blacklist/${tokenId}`, err);
                return res.status(500).json({
                    status: 'error',
                    message: `Failed to retrieve tokenId ${tokenId} from the database`,
                });
            }
        },
    );

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
            const base64Data = data.replace(/^data:image\/png;base64,/, '');
            const img = Buffer.from(base64Data, 'base64');

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
