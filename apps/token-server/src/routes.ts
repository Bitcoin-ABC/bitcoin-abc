// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import express, { Express, Request, Response } from 'express';
import * as http from 'http';
import cors from 'cors';
import helmet from 'helmet';

/**
 * routes.ts
 * Start Express server and expose API endpoints
 */

export const startExpressServer = (port: Number): http.Server => {
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

    // API endpoints
    app.get('/status', async function (req: Request, res: Response) {
        // Get IP address from before cloudflare proxy
        const ip = req.socket.remoteAddress;
        console.log(`/status from IP: ${ip}, host ${req.headers.host}`);

        return res.status(200).json({
            status: 'running',
        });
    });

    return app.listen(port);
};
