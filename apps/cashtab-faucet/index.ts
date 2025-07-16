// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from './config';
import 'dotenv/config';
import { startExpressServer } from './src/routes';
import { getWalletFromSeed } from './src/wallet';
import { ChronikClient } from 'chronik-client';
import { Ecc } from 'ecash-lib';
import { rateLimit } from 'express-rate-limit';

// Connect to available in-node chronik servers
const chronik = new ChronikClient(config.chronikUrls);

const mnemonic = process.env.HOTWALLET_MNEMONIC;

if (typeof mnemonic !== 'string') {
    console.error('HOTWALLET_MNEMONIC is not set');
    process.exit(1);
}

// Init wallet
const wallet = getWalletFromSeed(mnemonic);

const ecc = new Ecc();

// Start the express app to expose API endpoints
const server = startExpressServer(
    config.port,
    chronik,
    ecc,
    rateLimit(config.limiter),
    rateLimit(config.tokenLimiter),
    process.env.RECAPTCHA_SK || '',
    wallet,
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
