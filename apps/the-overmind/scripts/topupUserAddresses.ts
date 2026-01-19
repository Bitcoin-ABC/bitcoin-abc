// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import 'dotenv/config';
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { HdNode, mnemonicToSeed } from 'ecash-lib';
import { Wallet } from 'ecash-wallet';
import { initDb } from '../src/db';
import { topupUserAddresses } from '../src/topup';

/**
 * Script to top up all user addresses to 1000 XEC
 * Runs in dry-run mode by default (inspects transaction without broadcasting)
 */
const main = async (): Promise<void> => {
    console.info('Starting topup user addresses script...');

    // Load environment variables
    const modMnemonic = process.env.MOD_MNEMONIC;
    if (!modMnemonic) {
        throw new Error('MOD_MNEMONIC environment variable is required');
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    // Initialize database
    const pool = await initDb(databaseUrl);
    console.info('Database connected');

    // Initialize Chronik client
    const chronikUrls = [
        'https://chronik-native3.fabien.cash',
        'https://chronik-native2.fabien.cash',
        'https://chronik-native1.fabien.cash',
    ];
    const chronik = await ChronikClient.useStrategy(
        ConnectionStrategy.ClosestFirst,
        chronikUrls,
    );
    console.info('Chronik client initialized');

    // Initialize wallet
    const seed = mnemonicToSeed(modMnemonic);
    const master = HdNode.fromSeed(seed);
    // The Overmind wallet is at m/44'/1899'/0'/0/0
    const overmindNode = master.derivePath("m/44'/1899'/0'/0/0");
    const modSk = overmindNode.seckey();
    if (!modSk) {
        throw new Error('Failed to derive secret key from mnemonic');
    }
    const wallet = Wallet.fromSk(modSk, chronik);
    console.info(`Wallet initialized: ${wallet.address}`);

    // Sync wallet to get current state
    await wallet.sync();
    const walletBalance = wallet
        .spendableSatsOnlyUtxos()
        .reduce((total, utxo) => total + utxo.sats, 0n);
    console.info(`Wallet balance: ${walletBalance} sats\n`);

    try {
        // Call topup function with dryRun=true by default
        await topupUserAddresses(wallet, chronik, pool, true);
    } catch (err) {
        console.error('Error in topup script:', err);
        throw err;
    } finally {
        // Close database connection
        await pool.end();
        console.info('Database connection closed');
    }
};

// Run the script
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
