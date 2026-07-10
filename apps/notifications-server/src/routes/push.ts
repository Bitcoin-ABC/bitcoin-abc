// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Router, Request, Response } from 'express';
import { isValidCashAddress } from 'ecashaddrjs';
import { verifyMsg } from 'ecash-lib';
import { Pool } from 'pg';
import {
    deletePushDeviceToken,
    upsertPushDeviceToken,
    type PushPlatform,
} from '../services/pushTokenStore';
import { syncPushAddressSubscriptions } from '../websockets/pushAddressWs';

type PushRegisterBody = {
    active_address?: string;
    signature?: string;
    platform?: string;
    fcm_token?: string;
};

type PushUnregisterBody = {
    active_address?: string;
    signature?: string;
    fcm_token?: string;
};

const isPushPlatform = (value: string): value is PushPlatform =>
    value === 'ios' || value === 'android' || value === 'web';

const authorizePushRequest = (
    res: Response,
    activeAddress: string | undefined,
    signature: string | undefined,
): activeAddress is string => {
    if (!activeAddress || typeof activeAddress !== 'string') {
        res.status(400).json({
            success: false,
            error: 'active_address is required',
        });
        return false;
    }

    if (!signature || typeof signature !== 'string') {
        res.status(400).json({
            success: false,
            error: 'signature is required',
        });
        return false;
    }

    if (!isValidCashAddress(activeAddress)) {
        res.status(400).json({
            success: false,
            error: 'active_address must be a valid cash address',
        });
        return false;
    }

    if (!verifyMsg(activeAddress, signature, activeAddress)) {
        res.status(401).json({
            success: false,
            error: 'Invalid signature: push registration authorization failed',
        });
        return false;
    }

    return true;
};

const createPushRoutes = (pool: Pool): Router => {
    const router = Router();

    router.post('/register', async (req: Request, res: Response) => {
        try {
            const body = req.body as PushRegisterBody;
            const { active_address, signature, platform, fcm_token } = body;

            if (!authorizePushRequest(res, active_address, signature)) {
                return;
            }

            if (
                !platform ||
                typeof platform !== 'string' ||
                !isPushPlatform(platform)
            ) {
                res.status(400).json({
                    success: false,
                    error: 'platform must be ios, android, or web',
                });
                return;
            }

            if (
                !fcm_token ||
                typeof fcm_token !== 'string' ||
                fcm_token.trim() === ''
            ) {
                res.status(400).json({
                    success: false,
                    error: 'fcm_token is required',
                });
                return;
            }

            await upsertPushDeviceToken(
                pool,
                active_address,
                platform,
                fcm_token.trim(),
            );
            await syncPushAddressSubscriptions(pool);

            res.status(200).json({
                success: true,
                data: { registered: true },
            });
        } catch (error) {
            console.error('/api/push/register failed:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    });

    router.post('/unregister', async (req: Request, res: Response) => {
        try {
            const body = req.body as PushUnregisterBody;
            const { active_address, signature, fcm_token } = body;

            if (!authorizePushRequest(res, active_address, signature)) {
                return;
            }

            if (
                !fcm_token ||
                typeof fcm_token !== 'string' ||
                fcm_token.trim() === ''
            ) {
                res.status(400).json({
                    success: false,
                    error: 'fcm_token is required',
                });
                return;
            }

            const removed = await deletePushDeviceToken(
                pool,
                active_address,
                fcm_token.trim(),
            );

            res.status(200).json({
                success: true,
                data: { removed },
            });
        } catch (error) {
            console.error('/api/push/unregister failed:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    });

    return router;
};

export default createPushRoutes;
