// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import express, { Express } from 'express';
import helmet from 'helmet';
import { Pool } from 'pg';
import createPushRoutes from './routes/push';
import { corsMiddleware } from './middleware/cors';

export const createApp = (pool: Pool): Express => {
    const app = express();

    // Behind token-server-proxy (nginx); trust one hop for X-Forwarded-For
    app.set('trust proxy', 1);

    // Capacitor Android WebViews default to origin https://localhost
    // (server.androidScheme "https" + server.hostname "localhost"). That makes
    // fetch() to push.etokens.cash cross-origin, so CORS is required.
    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        }),
    );
    app.use(corsMiddleware);
    app.use(express.json({ limit: '32kb' }));

    app.get('/health', (_req, res) => {
        res.status(200).json({ ok: true });
    });

    app.use('/api/push', createPushRoutes(pool));

    return app;
};
