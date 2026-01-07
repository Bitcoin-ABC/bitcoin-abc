// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import 'dotenv/config';

import { Bot } from 'grammy';
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { HdNode, mnemonicToSeed } from 'ecash-lib';
import { Wallet } from 'ecash-wallet';
import { initDb, initSchema } from './src/db';
import {
    register,
    claim,
    health,
    handleMessage,
    handleMessageReaction,
} from './src/bot';

/**
 * Main startup function
 */
const startup = async () => {
    console.info('Starting The Overmind...');

    // Load environment variables
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramBotToken) {
        throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
    }

    const modMnemonic = process.env.MOD_MNEMONIC;
    if (!modMnemonic) {
        throw new Error('MOD_MNEMONIC environment variable is required');
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    const adminGroupChatId = process.env.ADMIN_GROUP_CHAT_ID;
    if (!adminGroupChatId) {
        throw new Error('ADMIN_GROUP_CHAT_ID environment variable is required');
    }

    const monitoredGroupChatId = process.env.MONITORED_GROUP_CHAT_ID;
    if (!monitoredGroupChatId) {
        throw new Error(
            'MONITORED_GROUP_CHAT_ID environment variable is required',
        );
    }

    // Initialize database
    const pool = await initDb(databaseUrl);
    console.info('Database initialized');

    // Initialize database schema
    await initSchema(pool);

    // Initialize Telegram bot
    const bot = new Bot(telegramBotToken);
    console.info('Telegram bot initialized');

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
    console.info(`Wallet balance: ${walletBalance} sats`);

    // Set up bot command handlers
    bot.command('register', async ctx => {
        await register(ctx, master, pool, bot, monitoredGroupChatId);
    });
    bot.command('claim', async ctx => {
        await claim(ctx, pool, wallet, bot, adminGroupChatId);
    });
    bot.command('health', async ctx => {
        await health(ctx, pool, chronik);
    });
    console.info('Bot command handlers registered');

    // Set up message handler for monitored group chat
    bot.on('message', async ctx => {
        await handleMessage(ctx, pool, monitoredGroupChatId);
    });
    console.info('Message handler registered for monitored group chat');

    // Set up reaction handler for monitored group chat
    // Note: Bot must be an administrator in the monitored group chat to receive reaction updates
    bot.on('message_reaction', async ctx => {
        await handleMessageReaction(
            ctx,
            pool,
            monitoredGroupChatId,
            master,
            chronik,
            bot,
            adminGroupChatId,
            wallet.address,
        );
    });
    console.info('Reaction handler registered for monitored group chat');

    // Start bot polling with allowed updates including message_reaction
    // Note: Bot must be an administrator in the monitored group chat to receive reaction updates
    await bot.start({
        allowed_updates: [
            'message',
            'message_reaction',
            'message_reaction_count',
        ],
    });
    console.info('Bot started and polling for updates');

    console.info('🎉 The Overmind startup completed successfully!');

    // Graceful shutdown handler
    const shutdown = async () => {
        console.info('Shutting down The Overmind...');
        try {
            // Stop bot polling
            await bot.stop();
            console.info('Bot stopped');
        } catch (e) {
            console.error('Error stopping bot:', e);
        }
        try {
            // Close database pool
            await pool.end();
            console.info('Database connection closed');
        } catch (e) {
            console.error('Error closing database pool:', e);
        }
        process.exit(0);
    };

    // Handle shutdown signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};

// Start the application
startup().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
