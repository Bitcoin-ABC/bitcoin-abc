// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from './config';
import 'dotenv/config';
import { startExpressServer } from './src/routes';
import { Wallet } from 'ecash-wallet';
import { ChronikClient } from 'chronik-client';
import { rateLimit } from 'express-rate-limit';

// Connect to available in-node chronik servers
const chronik = new ChronikClient(config.chronikUrls);

const mnemonic = process.env.HOTWALLET_MNEMONIC;

if (typeof mnemonic !== 'string') {
    console.error('HOTWALLET_MNEMONIC is not set');
    process.exit(1);
}

// Init wallet
const wallet = Wallet.fromMnemonic(mnemonic, chronik);

const parseRecaptchaMinScore = (
    value: string | undefined,
    defaultValue: string,
    envName: string,
): number => {
    const score = Number.parseFloat(value ?? defaultValue);
    if (Number.isNaN(score) || score < 0 || score > 1) {
        console.error(`${envName} must be a number between 0 and 1`);
        process.exit(1);
    }
    return score;
};

const recaptchaV3MinScore = parseRecaptchaMinScore(
    process.env.RECAPTCHA_V3_MIN_SCORE,
    '0.9',
    'RECAPTCHA_V3_MIN_SCORE',
);
const recaptchaV3AndroidMinScore = parseRecaptchaMinScore(
    process.env.RECAPTCHA_V3_ANDROID_MIN_SCORE,
    '0.1',
    'RECAPTCHA_V3_ANDROID_MIN_SCORE',
);

const recaptchaEnterprise =
    process.env.RECAPTCHA_PROJECT_ID &&
    process.env.RECAPTCHA_ENTERPRISE_API_KEY &&
    process.env.RECAPTCHA_V3_ANDROID_SITE_KEY
        ? {
              projectId: process.env.RECAPTCHA_PROJECT_ID,
              apiKey: process.env.RECAPTCHA_ENTERPRISE_API_KEY,
              androidSiteKey: process.env.RECAPTCHA_V3_ANDROID_SITE_KEY,
          }
        : null;

if (!process.env.RECAPTCHA_V3_SK) {
    console.warn(
        'RECAPTCHA_V3_SK is not set; token reward claims will fail reCAPTCHA verification',
    );
}

// Start the express app to expose API endpoints
const server = startExpressServer(
    config.port,
    chronik,
    rateLimit(config.limiter),
    rateLimit(config.tokenLimiter),
    process.env.RECAPTCHA_SK || '',
    process.env.RECAPTCHA_V3_SK || '',
    recaptchaV3MinScore,
    recaptchaV3AndroidMinScore,
    wallet,
    recaptchaEnterprise,
);
console.log(`Express server started on port ${config.port}`);

// Gracefully shut down on app termination
process.on('SIGTERM', () => {
    // kill <pid> from terminal
    server.close();
    console.log('cashtab-faucet shut down by SIGTERM');

    // Shut down token-server in non-error condition
    process.exit(0);
});

process.on('SIGINT', () => {
    // ctrl + c in nodejs
    server.close();
    console.log('cashtab-faucet shut down by ctrl+c');

    // Shut down token-server in non-error condition
    process.exit(0);
});
