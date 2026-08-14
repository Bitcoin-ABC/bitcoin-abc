// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { Wallet } from 'ecash-wallet';
import express, {
    Express,
    NextFunction,
    Request,
    Response,
    Router,
} from 'express';
import type { ParsedTradedConfig } from './config/tradedConfig';
import { POSTAGE_SATS, SPEC_VERSION } from './constants';
import type { AsyncQueue } from './methods/queue';
import { createQuoteRouter } from './routes/quotes';
import { createSettleRouter } from './routes/settle';
import type { TradedTokens } from './tokens/tradedTokens';

export type CreateAppDeps = {
    seller: Wallet;
    slush: Wallet;
    feeAddress: string;
    tradedConfig: ParsedTradedConfig;
    tradedTokens: TradedTokens;
    /**
     * Shared FIFO for settle fuel/sign/broadcast and inventory maintain so
     * both paths cannot select/broadcast the same seller UTXOs concurrently.
     * When omitted, settle creates its own queue (tests).
     */
    walletQueue?: AsyncQueue;
    /**
     * Optional post-settle inventory maintain (fire-and-forget).
     * Errors are logged and must not fail the settle HTTP response.
     */
    maintainInventory?: () => Promise<unknown>;
};

/**
 * Open CORS for browser takers (SPEC.md). Rate limiting lands with deploy ops.
 */
const openCors = (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
    );
    next();
};

/**
 * Create the Express app for alp-dex.
 *
 * Quote API + postage-protocol settle. All versioned API routes are mounted
 * under `/api/v1`.
 */
export const createApp = (deps: CreateAppDeps): Express => {
    const {
        seller,
        slush,
        feeAddress,
        tradedConfig,
        tradedTokens,
        walletQueue,
        maintainInventory,
    } = deps;
    const app = express();

    app.use(openCors);
    app.use(express.json({ limit: '1mb' }));

    app.get('/', (_req, res) => {
        res.status(200).json({
            success: true,
            data: {
                specVersion: SPEC_VERSION,
                status: 'running',
                pricing: 'local-liquidity',
                swapAddress: seller.address,
                platformFeeEnabled: false,
            },
        });
    });

    const v1: Router = express.Router();

    v1.get('/status', (_req, res) => {
        const pairs = tradedConfig.pairs.map(pair => ({
            aTokenId: pair.tokenIdA,
            bTokenId: pair.tokenIdB,
            feePct: pair.feePct,
            aUtxoQty: tradedConfig.utxoQtyByToken.get(pair.tokenIdA),
            bUtxoQty: tradedConfig.utxoQtyByToken.get(pair.tokenIdB),
        }));
        const tokens = [...tradedTokens.values()].map(token => ({
            tokenId: token.tokenId,
            decimals: token.decimals,
            utxoQty: token.utxoQty,
            utxoAtoms: token.utxoAtoms.toString(),
            tokenTicker: token.tokenTicker,
            tokenName: token.tokenName,
        }));
        res.status(200).json({
            status: 'OK',
            specVersion: SPEC_VERSION,
            timestamp: new Date().toISOString(),
            swapAddress: seller.address,
            slushAddress: slush.address,
            feeAddress,
            postage: {
                sats: POSTAGE_SATS.toString(),
            },
            platformFeeEnabled: false,
            tradedTokens: tokens,
            tradedPairs: pairs,
        });
    });

    v1.use(
        createQuoteRouter({
            seller,
            slush,
            feeAddress,
            tradedConfig,
            tradedTokens,
        }),
    );

    v1.use(
        createSettleRouter({
            seller,
            slush,
            feeAddress,
            tradedConfig,
            tradedTokens,
            walletQueue,
            maintainInventory,
        }),
    );

    app.use('/api/v1', v1);

    return app;
};
