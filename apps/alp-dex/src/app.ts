// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import express, { Express, Router } from 'express';
import { SPEC_VERSION } from './constants';

/**
 * Create the Express app for alp-dex.
 *
 * Scaffold only: health endpoints with static payload. Wallet, pricing,
 * inventory, and settle routes land in later diffs.
 *
 * All versioned API routes are mounted under `/api/v1`.
 */
export const createApp = (): Express => {
    const app = express();

    app.use(express.json({ limit: '1mb' }));

    app.get('/', (_req, res) => {
        res.status(200).json({
            success: true,
            data: {
                specVersion: SPEC_VERSION,
                status: 'scaffold',
                pricing: 'local-liquidity',
            },
        });
    });

    const v1: Router = express.Router();

    v1.get('/status', (_req, res) => {
        res.status(200).json({
            status: 'OK',
            specVersion: SPEC_VERSION,
            timestamp: new Date().toISOString(),
        });
    });

    app.use('/api/v1', v1);

    return app;
};
