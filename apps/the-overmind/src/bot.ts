// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Context, Bot } from 'grammy';
import { Pool } from 'pg';
import {
    HdNode,
    Script,
    payment,
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    shaRmd160,
    toHex,
} from 'ecash-lib';
import { encodeCashAddress } from 'ecashaddrjs';
import { Wallet } from 'ecash-wallet';
import {
    REWARDS_TOKEN_ID,
    REGISTRATION_REWARD_ATOMS,
    REGISTRATION_REWARD_SATS,
} from './constants';
import { createUserActionTable } from './db';

/**
 * Send an error notification to the admin group chat
 * @param bot - Bot instance for sending messages
 * @param adminChatId - Admin group chat ID
 * @param action - Name of the bot action that failed
 * @param userId - Telegram user ID who triggered the action
 * @param error - Error object or message
 */
export const sendErrorToAdmin = async (
    bot: Bot,
    adminChatId: string,
    action: string,
    userId: number | undefined,
    error: unknown,
): Promise<void> => {
    try {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        const username = userId ? `User ID: ${userId}` : 'Unknown user';
        const message =
            `🚨 **Bot Action Error**\n\n` +
            `**Action:** ${action}\n` +
            `**User:** ${username}\n` +
            `**Error:** \`${errorMessage}\`\n` +
            (errorStack ? `\n\`\`\`\n${errorStack}\n\`\`\`` : '');

        await bot.api.sendMessage(adminChatId, message, {
            parse_mode: 'Markdown',
        });
    } catch (err) {
        console.error('Failed to send error notification to admin group:', err);
    }
};

/**
 * Register a user with The Overmind
 * Derives a wallet address for the user and stores it in the database
 * @param ctx - Grammy context from the command
 * @param masterNode - Master HD node derived from the mod's mnemonic
 * @param pool - Database connection pool
 */
export const register = async (
    ctx: Context,
    masterNode: HdNode,
    pool: Pool,
): Promise<void> => {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Could not identify your user ID.');
        return;
    }

    // Check if user is already registered
    const existingUser = await pool.query(
        'SELECT address, hd_index, username FROM users WHERE user_tg_id = $1',
        [userId],
    );

    if (existingUser.rows.length > 0) {
        const { address } = existingUser.rows[0];
        await ctx.reply(
            `✅ You are already registered!\n\n` + `Address: \`${address}\``,
            { parse_mode: 'Markdown' },
        );
        return;
    }

    // Find the next available HD index
    const maxIndexResult = await pool.query(
        'SELECT COALESCE(MAX(hd_index), 0) as max_index FROM users',
    );
    const nextIndex = (maxIndexResult.rows[0].max_index as number) + 1;

    // Derive the wallet address at m/44'/1899'/{nextIndex}'/0/0
    // Bot wallet is at m/44'/1899'/0'/0/0 (account 0)
    // Each user gets their own account number equal to their hd_index
    const userNode = masterNode.derivePath(`m/44'/1899'/${nextIndex}'/0/0`);
    const pubkey = userNode.pubkey();
    const pkh = shaRmd160(pubkey);
    const address = encodeCashAddress('ecash', 'p2pkh', toHex(pkh));

    // Get username if available
    const username = ctx.from?.username || null;

    // Store user in database
    await pool.query(
        'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4) ON CONFLICT (user_tg_id) DO NOTHING',
        [userId, address, nextIndex, username],
    );

    // Create user action table for this user
    await createUserActionTable(pool, userId);

    await ctx.reply(
        `✅ Registration successful!\n\n` +
            `Your address: \`${address}\`\n` +
            `User number: ${nextIndex}\n\n` +
            `You can now receive tokens and interact with The Overmind.\n` +
            `Use /claim to claim your reward tokens!`,
        { parse_mode: 'Markdown' },
    );
};

/**
 * Claim reward tokens for a registered user
 * Checks if the user's address has already received REWARDS_TOKEN_ID tokens
 * If not, sends the registration reward tokens
 * @param ctx - Grammy context from the command
 * @param pool - Database connection pool
 * @param wallet - The Overmind wallet for sending reward tokens
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 */
export const claim = async (
    ctx: Context,
    pool: Pool,
    wallet: Wallet,
    bot: Bot,
    adminChatId: string,
): Promise<void> => {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Could not identify your user ID.');
        return;
    }

    // Check if user is registered
    const userResult = await pool.query(
        'SELECT address FROM users WHERE user_tg_id = $1',
        [userId],
    );

    if (userResult.rows.length === 0) {
        await ctx.reply(
            '❌ You must register first! Use /register to create your wallet address.',
        );
        return;
    }

    const { address } = userResult.rows[0];

    // Check if address has already received REWARDS_TOKEN_ID tokens
    try {
        const utxosRes = await wallet.chronik.address(address).utxos();
        const utxos = utxosRes.utxos || [];

        // Check if any UTXO contains REWARDS_TOKEN_ID
        const hasReceivedRewards = utxos.some(
            utxo =>
                typeof utxo.token !== 'undefined' &&
                utxo.token.tokenId === REWARDS_TOKEN_ID,
        );

        if (hasReceivedRewards) {
            await ctx.reply(
                '❌ You have already claimed your reward tokens!\n\n' +
                    `Your address: \`${address}\``,
                { parse_mode: 'Markdown' },
            );
            return;
        }
    } catch (err) {
        console.error('Error checking token history:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'claim (checking token history)',
            userId,
            err,
        );
        await ctx.reply(
            '❌ Error checking your token history. Please try again later.',
        );
        return;
    }

    // Send registration reward tokens
    let txid: string | undefined;
    try {
        // Sync wallet to ensure we have latest token balance
        await wallet.sync();

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
            ],
        };

        // Build and broadcast the transaction
        const resp = await wallet.action(tokenSendAction).build().broadcast();

        if (resp.success && resp.broadcasted.length > 0) {
            // Extract txid from the first broadcasted transaction
            // The broadcast method returns an array of txids
            txid = resp.broadcasted[0];
        } else {
            const errorMsg = `Failed to send reward tokens. Response: ${JSON.stringify(resp)}`;
            console.error(errorMsg);
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'claim (sending reward tokens)',
                userId,
                new Error(errorMsg),
            );
            await ctx.reply(
                '❌ Error sending reward tokens. Please try again later.',
            );
            return;
        }
    } catch (err) {
        console.error('Error sending reward tokens:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'claim (sending reward tokens)',
            userId,
            err,
        );
        await ctx.reply(
            '❌ Error sending reward tokens. Please try again later.',
        );
        return;
    }

    // Insert action into user's action table
    const tableName = `user_actions_${userId}`;
    try {
        // Ensure table exists (in case user was registered before this feature)
        await createUserActionTable(pool, userId);
        await pool.query(
            `INSERT INTO ${tableName} (action, txid, post_id) VALUES ($1, $2, $3)`,
            ['claim', txid || null, null],
        );
    } catch (err) {
        console.error(`Error inserting claim action for user ${userId}:`, err);
        // Continue execution even if logging fails
    }

    const txMessage = txid
        ? `\n\n🎁 10,000 reward tokens sent! Transaction: \`${txid}\``
        : '\n\n⚠️ Reward tokens are being processed.';

    await ctx.reply(
        `✅ Claim successful!` + `\n\nYour address: \`${address}\`` + txMessage,
        { parse_mode: 'Markdown' },
    );
};
