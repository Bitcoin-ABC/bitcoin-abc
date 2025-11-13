// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Request, Response } from 'express';
import { RateLimitExceededEventHandler } from 'express-rate-limit';

interface CashtabFaucetRateLimits {
    windowMs: number;
    limit: number;
    standardHeaders: 'draft-6' | 'draft-7';
    legacyHeaders: boolean;
    handler: RateLimitExceededEventHandler;
}

interface CashtabFaucetConfig {
    port: number;
    chronikUrls: string[];
    eligibilityResetSeconds: number;
    rewardsTokenId: string;
    rewardAmountTokenSats: bigint;
    xecAirdropAmountSats: bigint;
    limiter: CashtabFaucetRateLimits;
    tokenLimiter: CashtabFaucetRateLimits;
    recaptchaUrl: string;
    recaptchaThreshold: number;
}

const config: CashtabFaucetConfig = {
    port: 3332,
    chronikUrls: [
        'https://chronik-native2.fabien.cash',
        'https://chronik-native3.fabien.cash',
        'https://chronik.pay2stay.com/xec',
        'https://chronik-native1.fabien.cash',
    ],
    eligibilityResetSeconds: 86400, // 24 hours
    // Cachet
    rewardsTokenId:
        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    rewardAmountTokenSats: 10000n, // Cachet is a 2-decimal token, so this is 100.00 Cachet
    xecAirdropAmountSats: 4200n, // satoshis to send in new wallet XEC airdrops, 1000 = 10 XEC

    // Rate limits for XEC rewards
    limiter: {
        windowMs: 7 * 24 * 60 * 60 * 1000, // 1 week
        limit: 24, // requests per IP per `window`
        standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
        handler: (req: Request, res: Response) => {
            // Log a rate limited request
            const ip =
                req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            console.log(`${req.url} from ip="${ip}" blocked by rate limit`);
            return res.status(429).json({
                error: 'Too many requests',
                msg: 'To earn more eCash, set up a staking node, or submit a diff to reviews.bitcoinabc.org.',
            });
        },
    },
    // Rate limits for token rewards
    tokenLimiter: {
        windowMs: 24 * 60 * 60 * 1000, // 24 hrs
        limit: 24, // requests per IP per `window`
        standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
        handler: (req: Request, res: Response) => {
            // Log a rate limited request
            const ip =
                req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            console.log(`${req.url} from ip="${ip}" blocked by rate limit`);
            return res.status(429).json({
                error: 'Too many requests',
                msg: 'To earn more eCash, set up a staking node, or submit a diff to reviews.bitcoinabc.org.',
            });
        },
    },
    recaptchaUrl: 'https://www.google.com/recaptcha/api/siteverify',
    recaptchaThreshold: 0.9,
};

export default config;
