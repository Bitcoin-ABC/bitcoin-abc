// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import 'dotenv/config';
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import {
    HdNode,
    mnemonicToSeed,
    Script,
    payment,
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
} from 'ecash-lib';
import { Wallet } from 'ecash-wallet';
import { initDb, createUserActionTable } from '../src/db';
import {
    REWARDS_TOKEN_ID,
    REGISTRATION_REWARD_ATOMS,
    REGISTRATION_REWARD_SATS,
} from '../src/constants';
import { getOvermindEmpp, EmppAction } from '../src/empp';

/**
 * Send a missed registration reward to a user by their address
 * @param address - The eCash address of the user
 */
const registrationFill = async (address: string): Promise<void> => {
    console.info(`Starting registration fill for address: ${address}`);

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

    try {
        // Find user by address
        const userResult = await pool.query(
            'SELECT user_tg_id, address, username FROM users WHERE address = $1',
            [address],
        );

        if (userResult.rows.length === 0) {
            throw new Error(
                `No registered user found with address: ${address}`,
            );
        }

        const user = userResult.rows[0];
        // Convert to string (pg returns string, pg-mem returns number)
        const userId = String(user.user_tg_id);
        const username = user.username || 'unknown';
        console.info(`Found user: ${userId} (@${username})`);

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

        // Check if address has already received REWARDS_TOKEN_ID tokens
        let hasReceivedRewards = false;
        try {
            const utxosRes = await chronik.address(address).utxos();
            const utxos = utxosRes.utxos || [];

            // Check if any UTXO contains REWARDS_TOKEN_ID
            hasReceivedRewards = utxos.some(
                utxo =>
                    typeof utxo.token !== 'undefined' &&
                    utxo.token.tokenId === REWARDS_TOKEN_ID,
            );
        } catch (err) {
            console.error('Error checking token history:', err);
            throw err;
        }

        if (hasReceivedRewards) {
            console.info(
                '✅ User has already received registration reward tokens.',
            );
            console.info('Skipping reward send.');
            return;
        }

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

        // Sync wallet to ensure we have latest token balance
        await wallet.sync();
        const walletBalance = wallet
            .spendableSatsOnlyUtxos()
            .reduce((total, utxo) => total + utxo.sats, 0n);
        console.info(`Wallet balance: ${walletBalance} sats`);

        // Construct EMPP data push for CLAIM
        const claimEmppData = getOvermindEmpp(EmppAction.CLAIM);

        // Create action to send ALP tokens
        const tokenSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Reward tokens at outIdx 1 */
                {
                    sats: DEFAULT_DUST_SATS,
                    script: Script.fromAddress(address),
                    tokenId: REWARDS_TOKEN_ID,
                    atoms: REGISTRATION_REWARD_ATOMS,
                },
                /** Starter XEC to support on-chain actions at outIdx 2 */
                {
                    sats: REGISTRATION_REWARD_SATS,
                    script: Script.fromAddress(address),
                },
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: REWARDS_TOKEN_ID,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** EMPP Data push */
                {
                    type: 'DATA',
                    data: claimEmppData,
                },
            ],
        };

        // Build and broadcast the transaction
        console.info('Building and broadcasting transaction...');
        const resp = await wallet.action(tokenSendAction).build().broadcast();

        if (resp.success && resp.broadcasted.length > 0) {
            const txid = resp.broadcasted[0];
            console.info(`✅ Successfully sent registration reward!`);
            console.info(`Transaction ID: ${txid}`);
            console.info(
                `Amount: ${REGISTRATION_REWARD_ATOMS.toLocaleString()} HP + ${REGISTRATION_REWARD_SATS.toLocaleString()} XEC`,
            );

            // Ensure user action table exists
            await createUserActionTable(pool, parseInt(userId, 10));

            // Insert action into user's action table
            const tableName = `user_actions_${userId}`;
            try {
                await pool.query(
                    `INSERT INTO ${tableName} (action, txid, msg_id, emoji) VALUES ($1, $2, $3, $4)`,
                    ['claim', txid, null, null],
                );
                console.info(`✅ Logged claim action to database`);
            } catch (err) {
                console.error(
                    `⚠️  Error inserting claim action for user ${userId}:`,
                    err,
                );
                // Continue execution even if logging fails
            }
        } else {
            const errorMsg = `Failed to send reward tokens. Response: ${JSON.stringify(resp)}`;
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }
    } catch (err) {
        console.error('❌ Error:', err);
        throw err;
    } finally {
        await pool.end();
        console.info('Database connection closed.');
    }
};

// Get address from command line arguments
const address = process.argv[2];

if (!address) {
    console.error('❌ Error: Address argument is required');
    console.error('Usage: npx tsx scripts/registrationFill <address>');
    process.exit(1);
}

// Run the script
registrationFill(address).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
