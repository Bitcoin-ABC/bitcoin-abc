// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import express, { Express } from 'express';
import helmet from 'helmet';
import { Pool } from 'pg';
import createPushRoutes from './routes/push';

export const createApp = (pool: Pool): Express => {
    const app = express();

    // Behind token-server-proxy (nginx); trust one hop for X-Forwarded-For
    app.set('trust proxy', 1);

    app.use(helmet());
    app.use(express.json({ limit: '32kb' }));

    app.get('/health', (_req, res) => {
        res.status(200).json({ ok: true });
    });

    app.use('/api/push', createPushRoutes(pool));

    return app;
};
