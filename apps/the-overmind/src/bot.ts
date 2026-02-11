// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Context, Bot, InlineKeyboard } from 'grammy';
import { Pool } from 'pg';
import * as qrcode from 'qrcode-terminal';
import {
    HdNode,
    Script,
    payment,
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    shaRmd160,
    toHex,
} from 'ecash-lib';
import {
    encodeCashAddress,
    getOutputScriptFromAddress,
    isValidCashAddress,
} from 'ecashaddrjs';
import { Wallet } from 'ecash-wallet';
import { ChronikClient } from 'chronik-client';
import {
    REWARDS_TOKEN_ID,
    REGISTRATION_REWARD_ATOMS,
    REGISTRATION_REWARD_SATS,
    BOTTLE_REPLY_AUTHOR_HP_LOSS_PER_BOTTLE,
    BOTTLE_REPLY_SENDER_HP_LOSS_PER_BOTTLE,
    CHILI_REPLY_HP_AMOUNT,
} from './constants';
import { getOvermindEmpp, EmppAction } from './empp';
import { hasWithdrawnInLast24Hours } from './chronik';
import { createUserActionTable } from './db';

/**
 * In-memory map of user ID (string) to username
 * Populated on startup and updated when users register
 * Keys are strings because pg returns BIGINT as string
 */
const usernameMap = new Map<string, string>();

/**
 * Load all usernames from database into memory
 * Should be called on app startup
 * @param pool - Database connection pool
 */
export const loadUsernames = async (pool: Pool): Promise<void> => {
    try {
        const result = await pool.query(
            'SELECT user_tg_id, username FROM users',
        );
        usernameMap.clear();
        for (const row of result.rows) {
            // Convert to string (pg returns string, pg-mem returns number)
            const userId = String(row.user_tg_id);
            const username = row.username || userId;
            usernameMap.set(userId, username);
        }
        console.info(`Loaded ${usernameMap.size} usernames into memory`);
    } catch (err) {
        console.error('Error loading usernames:', err);
    }
};

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
            link_preview_options: { is_disabled: true },
        });
    } catch (err) {
        console.error('Failed to send error notification to admin group:', err);
    }
};

/**
 * Escape special markdown characters in a username to prevent markdown parsing issues
 * @param username - Username string that may contain special markdown characters
 * @returns Escaped username safe for use in markdown messages
 */
export const escapeMarkdownUsername = (username: string): string => {
    // Escape special markdown characters: _ * [ ] ( ) ` ~
    // These characters can cause markdown parsing issues when usernames are inserted into messages
    return username
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/_/g, '\\_') // Underscore (italic)
        .replace(/\*/g, '\\*') // Asterisk (bold/italic)
        .replace(/\[/g, '\\[') // Opening bracket (link text)
        .replace(/\]/g, '\\]') // Closing bracket (link text)
        .replace(/\(/g, '\\(') // Opening parenthesis (link URL)
        .replace(/\)/g, '\\)') // Closing parenthesis (link URL)
        .replace(/`/g, '\\`') // Backtick (code)
        .replace(/~/g, '\\~'); // Tilde (strikethrough)
};

/**
 * Get usernames from in-memory map or fallback to user IDs
 * @param userIds - Array of Telegram user IDs
 * @returns Map of user ID to username (or user ID as string if username not available)
 */
const getUsernamesOrId = (userIds: number[]): Map<number, string> => {
    const resultMap = new Map<number, string>();

    for (const userId of userIds) {
        // Convert number to string for map lookup
        const username =
            usernameMap.get(userId.toString()) || userId.toString();
        resultMap.set(userId, username);
    }

    return resultMap;
};

/**
 * Register a user with The Overmind
 * Derives a wallet address for the user, stores it in the database, and sends 100 HP reward tokens
 * Registration is only allowed for users who are members of the monitored group chat
 * @param ctx - Grammy context from the command
 * @param masterNode - Master HD node derived from the mod's mnemonic
 * @param pool - Database connection pool
 * @param bot - Bot instance for checking chat membership
 * @param monitoredGroupChatId - The monitored group chat ID (required, user must be a member)
 * @param wallet - The Overmind wallet for sending reward tokens
 * @param adminChatId - Admin group chat ID for error notifications
 */
export const register = async (
    ctx: Context,
    masterNode: HdNode,
    pool: Pool,
    bot: Bot,
    monitoredGroupChatId: string,
    wallet: Wallet,
    adminChatId: string,
): Promise<void> => {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Could not identify your user ID.');
        return;
    }

    // Check if user is a member of the monitored group chat
    try {
        const chatMember = await bot.api.getChatMember(
            monitoredGroupChatId,
            userId,
        );
        // User must be a member, administrator, creator, or restricted (but still a member)
        const validStatuses = ['member', 'administrator', 'creator'];
        const isRestrictedMember =
            chatMember.status === 'restricted' &&
            'is_member' in chatMember &&
            chatMember.is_member === true;

        if (!validStatuses.includes(chatMember.status) && !isRestrictedMember) {
            console.log(
                `Registration rejected for user ${userId}: status="${chatMember.status}"`,
            );
            await ctx.reply(
                '❌ You must be a member of the monitored chat to register. Please join the main eCash telegram channel first.',
            );
            return;
        }
    } catch (err) {
        // If getChatMember fails, the user is likely not a member or bot lacks permissions
        console.error(
            `Error checking chat membership for user ${userId}:`,
            err,
        );
        await ctx.reply(
            '❌ Could not verify your membership in the monitored chat. Please ensure you are a member of the main eCash telegram channel.',
        );
        return;
    }

    // Check if user is already registered
    const existingUser = await pool.query(
        'SELECT address, hd_index, username FROM users WHERE user_tg_id = $1',
        [userId],
    );

    if (existingUser.rows.length > 0) {
        const { address } = existingUser.rows[0];
        // Update username in map in case it changed
        const username = ctx.from?.username || null;
        const displayUsername = username || userId.toString();
        usernameMap.set(userId.toString(), displayUsername);
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

    // Update in-memory username map
    const displayUsername = username || userId.toString();
    usernameMap.set(userId.toString(), displayUsername);

    // Create user action table for this user
    await createUserActionTable(pool, userId);

    // Check if address has already received REWARDS_TOKEN_ID tokens
    let hasReceivedRewards = false;
    try {
        const utxosRes = await wallet.chronik.address(address).utxos();
        const utxos = utxosRes.utxos || [];

        // Check if any UTXO contains REWARDS_TOKEN_ID
        hasReceivedRewards = utxos.some(
            utxo =>
                typeof utxo.token !== 'undefined' &&
                utxo.token.tokenId === REWARDS_TOKEN_ID,
        );
    } catch (err) {
        console.error('Error checking token history:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'register (checking token history)',
            userId,
            err,
        );
        await ctx.reply(
            '❌ Error checking your token history. Please try again later.',
        );
        return;
    }

    // Send registration reward tokens if not already received
    let txid: string | undefined;
    if (!hasReceivedRewards) {
        try {
            // Sync wallet to ensure we have latest token balance
            await wallet.sync();

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
            const resp = await wallet
                .action(tokenSendAction)
                .build()
                .broadcast();

            if (resp.success && resp.broadcasted.length > 0) {
                // Extract txid from the first broadcasted transaction
                txid = resp.broadcasted[0];
            } else {
                const errorMsg = `Failed to send reward tokens. Response: ${JSON.stringify(resp)}`;
                console.error(errorMsg);
                await sendErrorToAdmin(
                    bot,
                    adminChatId,
                    'register (sending reward tokens)',
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
                'register (sending reward tokens)',
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
            await pool.query(
                `INSERT INTO ${tableName} (action, txid, msg_id, emoji) VALUES ($1, $2, $3, $4)`,
                ['claim', txid || null, null, null],
            );
        } catch (err) {
            console.error(
                `Error inserting claim action for user ${userId}:`,
                err,
            );
            // Continue execution even if logging fails
        }
    }

    const txMessage = txid
        ? `\n\n❤️ ${REGISTRATION_REWARD_ATOMS.toLocaleString()} HP Filled! Transaction: \`${txid}\``
        : hasReceivedRewards
          ? '\n\n✅ You have already received your registration reward!'
          : '\n\n⚠️ Reward tokens are being processed.';

    const botUsername = ctx.me?.username || 'TheOvermind_bot';
    const botLink = `[@${escapeMarkdownUsername(botUsername)}](https://t.me/${botUsername})`;

    await ctx.reply(
        `✅ Registration successful!\n\n` +
            `Your address: \`${address}\`\n\n` +
            `Earn HP by sending msgs that collect emoji reactions. Lose HP by sending msgs that collect 👎 reactions. Check your status by sending a DM to ${botLink}` +
            txMessage,
        { parse_mode: 'Markdown' },
    );
};

/**
 * Check if user has respawned in the last 24 hours by checking transaction history
 * @param userAddress - User's address
 * @param botWalletAddress - Bot wallet address
 * @param chronik - Chronik client for querying blockchain
 * @returns true if user has respawned in last 24 hours, false otherwise
 */
const hasRespawnedInLast24Hours = async (
    userAddress: string,
    botWalletAddress: string,
    chronik: ChronikClient,
): Promise<boolean> => {
    try {
        // Get timestamp 24 hours ago (in seconds)
        const timeOfRequest = Math.ceil(Date.now() / 1000);
        const timestamp24HoursAgo = timeOfRequest - 86400; // 24 hours in seconds

        // Get user's transaction history
        const userOutputScript = getOutputScriptFromAddress(userAddress);
        const botOutputScript = getOutputScriptFromAddress(botWalletAddress);

        // Get transaction history (first page, should be enough for recent txs)
        const history = await chronik.address(userAddress).history(0, 25);

        // Check each transaction in history
        for (const tx of history.txs) {
            // Get transaction timestamp
            const txTimestamp =
                tx.timeFirstSeen !== 0
                    ? tx.timeFirstSeen
                    : tx.block?.timestamp || -1;

            // Skip if transaction is older than 24 hours
            if (txTimestamp < timestamp24HoursAgo && txTimestamp !== -1) {
                // Transactions are in reverse chronological order, so we can stop here
                break;
            }

            // Check if bot wallet sent this transaction (has inputs from bot wallet)
            let hasBotInput = false;
            for (const input of tx.inputs) {
                if (input.outputScript === botOutputScript) {
                    hasBotInput = true;
                    break;
                }
            }

            if (!hasBotInput) {
                continue;
            }

            // Check if user received REWARDS_TOKEN_ID tokens in this transaction
            let receivedRewardToken = false;
            for (const output of tx.outputs) {
                if (
                    output.outputScript === userOutputScript &&
                    typeof output.token !== 'undefined' &&
                    output.token.tokenId === REWARDS_TOKEN_ID
                ) {
                    receivedRewardToken = true;
                    break;
                }
            }

            if (receivedRewardToken) {
                // This is likely a respawn transaction (bot sent reward tokens to user)
                // Note: This could also be a registration, but registration only happens once
                // and users can't respawn until they're registered, so this check is valid
                return true;
            }
        }

        return false;
    } catch (err) {
        // If we can't check history, allow the respawn (fail open)
        // This prevents blocking users due to chronik errors
        console.error('Error checking respawn history:', err);
        return false;
    }
};

/**
 * Get and display health (HP balance) for a registered user
 * @param ctx - Grammy context from the command
 * @param pool - Database connection pool
 * @param chronik - Chronik client for querying blockchain
 */
export const health = async (
    ctx: Context,
    pool: Pool,
    chronik: ChronikClient,
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

    // Get token balance from blockchain
    try {
        const utxosRes = await chronik.address(address).utxos();
        const utxos = utxosRes.utxos || [];

        // Sum up token atoms for REWARDS_TOKEN_ID
        // Since this token has no decimals, atoms = balance
        let tokenBalanceAtoms = 0n;
        for (const utxo of utxos) {
            if (
                typeof utxo.token !== 'undefined' &&
                utxo.token.tokenId === REWARDS_TOKEN_ID
            ) {
                tokenBalanceAtoms += utxo.token.atoms;
            }
        }

        // Convert to number for calculations
        const balance = Number(tokenBalanceAtoms);
        const formattedBalance = balance.toLocaleString('en-US');

        // Create graphic indicator (out of 100)
        const maxIndicator = 100;
        const filledBars = Math.min(
            Math.floor((balance / maxIndicator) * 10),
            10,
        );
        const emptyBars = 10 - filledBars;
        const indicator = '🟩'.repeat(filledBars) + '🟥'.repeat(emptyBars);

        // Build message
        let message = `You have **${formattedBalance} HP**\n\n`;
        // Show actual balance if above max, otherwise show capped value
        const displayValue =
            balance > maxIndicator ? balance : Math.min(balance, maxIndicator);
        message += `${indicator} ${displayValue}/${maxIndicator}\n`;

        // Special message if above 100
        if (balance > 100) {
            message += `\n🔥 **MAXED!** You're above the maximum health threshold!`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('Error fetching token balance:', err);
        await ctx.reply(
            '❌ Error fetching your health. Please try again later.',
        );
    }
};

/**
 * Respawn user's HP back to 100
 * Checks balance (must be below 75), dislike history (max 3 in last 24hrs), and respawn cooldown (1 per day)
 * @param ctx - Grammy context from the command
 * @param pool - Database connection pool
 * @param chronik - Chronik client for querying blockchain
 * @param wallet - The Overmind wallet for sending HP tokens
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 */
export const respawn = async (
    ctx: Context,
    pool: Pool,
    chronik: ChronikClient,
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

    // Get token balance from blockchain
    let tokenBalanceAtoms = 0n;
    try {
        const utxosRes = await chronik.address(address).utxos();
        const utxos = utxosRes.utxos || [];

        // Sum up token atoms for REWARDS_TOKEN_ID
        for (const utxo of utxos) {
            if (
                typeof utxo.token !== 'undefined' &&
                utxo.token.tokenId === REWARDS_TOKEN_ID
            ) {
                tokenBalanceAtoms += utxo.token.atoms;
            }
        }
    } catch (err) {
        console.error('Error fetching token balance:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'respawn (fetching balance)',
            userId,
            err,
        );
        await ctx.reply(
            '❌ Error fetching your health. Please try again later.',
        );
        return;
    }

    const balance = Number(tokenBalanceAtoms);

    // Check if balance is 75 or above
    if (balance >= 75) {
        await ctx.reply(
            '❌ Cannot respawn. Your health must be below 75 HP to use this command.',
        );
        return;
    }

    // Check if user has respawned in the last 24 hours
    try {
        const hasRespawned = await hasRespawnedInLast24Hours(
            address,
            wallet.address,
            chronik,
        );
        if (hasRespawned) {
            await ctx.reply(
                '❌ Cannot respawn. You have already respawned in the last 24 hours. Please wait before using this command again.',
            );
            return;
        }
    } catch (err) {
        console.error('Error checking respawn history:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'respawn (checking respawn history)',
            userId,
            err,
        );
        await ctx.reply(
            '❌ Error checking your respawn history. Please try again later.',
        );
        return;
    }

    // Check dislike history - count messages by this user that received dislikes in last 24 hours
    try {
        const dislikeHistoryResult = await pool.query(
            `SELECT COUNT(*) as count 
             FROM messages 
             WHERE user_tg_id = $1 
             AND dislikes > 0 
             AND sent_at > NOW() - INTERVAL '24 hours'`,
            [userId],
        );
        const dislikeCount = parseInt(dislikeHistoryResult.rows[0].count, 10);

        if (dislikeCount > 3) {
            await ctx.reply(
                `❌ Cannot respawn. You have received dislikes on ${dislikeCount} messages in the last 24 hours (maximum allowed: 3).`,
            );
            return;
        }
    } catch (err) {
        console.error('Error checking dislike history:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'respawn (checking dislike history)',
            userId,
            err,
        );
        await ctx.reply(
            '❌ Error checking your dislike history. Please try again later.',
        );
        return;
    }

    // Calculate how much HP to send (bring balance to 100)
    const targetBalance = 100n;
    const currentBalance = tokenBalanceAtoms;
    const hpToSend = targetBalance - currentBalance;

    if (hpToSend <= 0n) {
        await ctx.reply(
            '❌ Your health is already at or above 100 HP. No respawn needed.',
        );
        return;
    }

    // Send HP from bot wallet to user
    let txid: string | undefined;
    try {
        // Sync wallet to ensure we have latest token balance
        await wallet.sync();

        // Construct EMPP data push for RESPAWN
        const respawnEmppData = getOvermindEmpp(EmppAction.RESPAWN);

        // Create action to send ALP tokens
        const tokenSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** HP tokens at outIdx 1 */
                {
                    sats: DEFAULT_DUST_SATS,
                    script: Script.fromAddress(address),
                    tokenId: REWARDS_TOKEN_ID,
                    atoms: hpToSend,
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
                    data: respawnEmppData,
                },
            ],
        };

        // Build and broadcast the transaction
        const resp = await wallet.action(tokenSendAction).build().broadcast();

        if (resp.success && resp.broadcasted.length > 0) {
            // Extract txid from the first broadcasted transaction
            txid = resp.broadcasted[0];
        } else {
            const errorMsg = `Failed to send HP respawn. Response: ${JSON.stringify(resp)}`;
            console.error(errorMsg);
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'respawn (sending HP)',
                userId,
                new Error(errorMsg),
            );
            await ctx.reply(
                '❌ Error sending HP respawn. Please try again later.',
            );
            return;
        }
    } catch (err) {
        console.error('Error sending HP respawn:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'respawn (sending HP)',
            userId,
            err,
        );
        await ctx.reply('❌ Error sending HP respawn. Please try again later.');
        return;
    }

    // Insert action into user's action table
    const tableName = `user_actions_${userId}`;
    try {
        await pool.query(
            `INSERT INTO ${tableName} (action, txid, msg_id, emoji) VALUES ($1, $2, $3, $4)`,
            ['respawn', txid || null, null, null],
        );
    } catch (err) {
        console.error(
            `Error inserting respawn action for user ${userId}:`,
            err,
        );
        // Continue execution even if logging fails
    }

    await ctx.reply(
        `✅ HP respawned! You received **${hpToSend.toString()} HP** and your health is now at 100 HP.\n\n` +
            `Transaction: \`${txid}\``,
        { parse_mode: 'Markdown' },
    );
};

/**
 * Withdrawal workflow state
 * Maps user ID to their current withdrawal state
 */
interface WithdrawState {
    address: string;
    amount: bigint;
    userAddress: string; // User's registered address
}

const withdrawStates = new Map<number, WithdrawState>();

/**
 * Check if a user is currently in a withdrawal workflow
 * @param userId - Telegram user ID
 * @returns true if user is in withdraw workflow, false otherwise
 */
export const isInWithdrawWorkflow = (userId: number): boolean => {
    return withdrawStates.has(userId);
};

/**
 * Clear withdrawal state for a user (for testing)
 * @param userId - Telegram user ID
 */
export const clearWithdrawState = (userId: number): void => {
    withdrawStates.delete(userId);
};

/**
 * Set withdrawal state for a user (for testing)
 * @param userId - Telegram user ID
 * @param state - Withdrawal state to set
 */
export const setWithdrawState = (
    userId: number,
    state: WithdrawState,
): void => {
    withdrawStates.set(userId, state);
};

/**
 * Handle withdrawal command
 * Syntax: /withdraw <address> <amount>
 * Validates address and amount, then shows confirmation with yes/no buttons
 * @param ctx - Grammy context from the command
 * @param pool - Database connection pool
 * @param chronik - Chronik client for querying blockchain
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 */
export const withdraw = async (
    ctx: Context,
    pool: Pool,
    chronik: ChronikClient,
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

    const { address: userAddress } = userResult.rows[0];

    // Parse command arguments
    const messageText = ctx.message?.text || '';
    const parts = messageText.trim().split(/\s+/);

    // Remove the command itself (/withdraw)
    if (parts.length > 0 && parts[0].startsWith('/')) {
        parts.shift();
    }

    // Check if address and amount are provided
    if (parts.length < 2) {
        await ctx.reply(
            '❌ **Invalid syntax**\n\n' +
                'Usage: `/withdraw <address> <amount>`\n\n' +
                'Example: `/withdraw ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw 50`',
            { parse_mode: 'Markdown' },
        );
        return;
    }

    const address = parts[0].trim();
    const amountStr = parts[1].trim();

    // Validate address
    if (!isValidCashAddress(address)) {
        await ctx.reply(
            '❌ Invalid address. Please provide a valid eCash address.',
        );
        return;
    }

    // Validate amount
    let amount: number;
    try {
        amount = parseInt(amountStr, 10);
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply(
                '❌ Please provide a valid positive number for the amount.',
            );
            return;
        }
    } catch {
        await ctx.reply('❌ Please provide a valid number for the amount.');
        return;
    }

    // Get user's current HP balance
    let tokenBalanceAtoms = 0n;
    try {
        const utxosRes = await chronik.address(userAddress).utxos();
        const utxos = utxosRes.utxos || [];

        // Sum up token atoms for REWARDS_TOKEN_ID
        for (const utxo of utxos) {
            if (
                typeof utxo.token !== 'undefined' &&
                utxo.token.tokenId === REWARDS_TOKEN_ID
            ) {
                tokenBalanceAtoms += utxo.token.atoms;
            }
        }
    } catch (err) {
        console.error('Error fetching token balance:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'withdraw (fetching balance)',
            userId,
            err,
        );
        await ctx.reply(
            '❌ Error fetching your health. Please try again later.',
        );
        return;
    }

    const balance = Number(tokenBalanceAtoms);

    if (balance === 0) {
        await ctx.reply('❌ You have no HP to withdraw.');
        return;
    }

    // Validate amount is less than or equal to balance
    if (amount > balance) {
        await ctx.reply(
            `❌ Amount exceeds your balance. Your balance: ${balance.toLocaleString('en-US')} HP`,
        );
        return;
    }

    // Check if user has withdrawn in the last 24 hours
    try {
        const hasWithdrawn = await hasWithdrawnInLast24Hours(
            userAddress,
            chronik,
        );
        if (hasWithdrawn) {
            await ctx.reply(
                '❌ Cannot withdraw. You have already withdrawn in the last 24 hours. Please wait before using this command again.',
            );
            return;
        }
    } catch (err) {
        console.error('Error checking withdraw history:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'withdraw (checking withdraw history)',
            userId,
            err,
        );
        await ctx.reply(
            '❌ Error checking your withdraw history. Please try again later.',
        );
        return;
    }

    // Store state for confirmation callback
    withdrawStates.set(userId, {
        address,
        amount: BigInt(amount),
        userAddress,
    });

    // Show summary with yes/no buttons
    const summaryMessage =
        `📋 **Withdrawal Summary**\n\n` +
        `**Address:** \`${address}\`\n` +
        `**Amount:** ${amount.toLocaleString('en-US')} HP\n\n` +
        `Confirm this withdrawal?`;

    const keyboard = new InlineKeyboard()
        .text('✅ Yes', `withdraw_confirm_${userId}`)
        .text('❌ No', `withdraw_cancel_${userId}`);

    await ctx.reply(summaryMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
    });
};

/**
 * Handle withdrawal confirmation callback
 * @param ctx - Grammy context from the callback query
 * @param pool - Database connection pool
 * @param chronik - Chronik client for querying blockchain
 * @param masterNode - Master HD node for deriving user wallets
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 */
export const handleWithdrawConfirm = async (
    ctx: Context,
    pool: Pool,
    chronik: ChronikClient,
    masterNode: HdNode,
    bot: Bot,
    adminChatId: string,
): Promise<void> => {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.answerCallbackQuery({
            text: '❌ Could not identify your user ID.',
        });
        return;
    }

    const state = withdrawStates.get(userId);
    if (!state) {
        await ctx.answerCallbackQuery({
            text: '❌ Withdrawal session expired. Please start over.',
        });
        return;
    }

    await ctx.answerCallbackQuery({ text: 'Processing withdrawal...' });

    // Get user's HD index
    const userResult = await pool.query(
        'SELECT hd_index FROM users WHERE user_tg_id = $1',
        [userId],
    );

    if (userResult.rows.length === 0) {
        await ctx.editMessageText('❌ User not found. Please register first.');
        withdrawStates.delete(userId);
        return;
    }

    const { hd_index: hdIndex } = userResult.rows[0];

    // Initialize user's wallet
    let userSk;
    try {
        const userNode = masterNode.derivePath(`m/44'/1899'/${hdIndex}'/0/0`);
        userSk = userNode.seckey();
        if (!userSk) {
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'withdraw (deriving wallet)',
                userId,
                new Error('Failed to derive secret key from HD index'),
            );
            await ctx.editMessageText(
                '❌ Error deriving wallet. Please try again later.',
            );
            withdrawStates.delete(userId);
            return;
        }
    } catch (err) {
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'withdraw (deriving wallet)',
            userId,
            err,
        );
        await ctx.editMessageText(
            '❌ Error deriving wallet. Please try again later.',
        );
        withdrawStates.delete(userId);
        return;
    }
    const userWallet = Wallet.fromSk(userSk, chronik);

    // Send HP tokens
    let txid: string | undefined;
    try {
        // Sync wallet to ensure we have latest token balance
        await userWallet.sync();

        // Construct EMPP data push for WITHDRAW
        const withdrawEmppData = getOvermindEmpp(EmppAction.WITHDRAW);

        // Create action to send ALP tokens
        const tokenSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** HP tokens at outIdx 1 */
                {
                    sats: DEFAULT_DUST_SATS,
                    script: Script.fromAddress(state.address),
                    tokenId: REWARDS_TOKEN_ID,
                    atoms: state.amount,
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
                    data: withdrawEmppData,
                },
            ],
        };

        // Build and broadcast the transaction
        const resp = await userWallet
            .action(tokenSendAction)
            .build()
            .broadcast();

        if (resp.success && resp.broadcasted.length > 0) {
            txid = resp.broadcasted[0];
        } else {
            const errorMsg = `Failed to send HP withdrawal. Response: ${JSON.stringify(resp)}`;
            console.error(errorMsg);
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'withdraw (sending HP)',
                userId,
                new Error(errorMsg),
            );
            await ctx.editMessageText(
                '❌ Error sending HP withdrawal. Please try again later.',
            );
            withdrawStates.delete(userId);
            return;
        }
    } catch (err) {
        console.error('Error sending HP withdrawal:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'withdraw (sending HP)',
            userId,
            err,
        );
        await ctx.editMessageText(`❌ Error: ${errorMessage}`);
        withdrawStates.delete(userId);
        return;
    }

    // Insert action into user's action table
    const tableName = `user_actions_${userId}`;
    try {
        await pool.query(
            `INSERT INTO ${tableName} (action, txid, msg_id, emoji) VALUES ($1, $2, $3, $4)`,
            ['withdraw', txid || null, null, null],
        );
    } catch (err) {
        console.error(
            `Error inserting withdraw action for user ${userId}:`,
            err,
        );
        // Continue execution even if logging fails
    }

    // Clean up state
    withdrawStates.delete(userId);

    await ctx.editMessageText(
        `✅ **Withdrawal successful!**\n\n` +
            `**Amount:** ${state.amount.toString()} HP\n` +
            `**Address:** \`${state.address}\`\n` +
            `**Transaction:** \`${txid}\``,
        { parse_mode: 'Markdown' },
    );
};

/**
 * Handle withdrawal cancellation callback
 * @param ctx - Grammy context from the callback query
 */
export const handleWithdrawCancel = async (ctx: Context): Promise<void> => {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.answerCallbackQuery({
            text: '❌ Could not identify your user ID.',
        });
        return;
    }

    withdrawStates.delete(userId);
    await ctx.answerCallbackQuery({ text: 'Withdrawal canceled' });
    await ctx.editMessageText('❌ Withdrawal canceled.');
};

/**
 * Display welcome message and explain how The Overmind works
 * @param ctx - Grammy context from the command
 * @param pool - Database connection pool
 */
export const start = async (ctx: Context, pool: Pool): Promise<void> => {
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
    const isRegistered = userResult.rows.length > 0;

    const welcomeMessage =
        `🤖 **Welcome to The Overmind!**\n\n` +
        `The Overmind is a Telegram bot that rewards and punishes users with on-chain token transactions in the main eCash telegram channel.\n\n` +
        `**How it works:**\n` +
        `• Register to get your wallet address and receive 100 HP (Hit Points) tokens\n` +
        `• Earn HP by receiving positive emoji reactions (👍, ❤️, etc.) on your messages\n` +
        `• Lose HP by receiving negative reactions (👎) on your messages\n` +
        `• All transactions are recorded on-chain for transparency\n\n` +
        `**Available Commands:**\n` +
        `• /start - Show this welcome message\n` +
        `• /register - Register and receive 100 HP + 1,000 XEC\n` +
        `• /health - Check your current HP balance\n` +
        `• /address - View your wallet address and QR code\n` +
        `• /respawn - Respawn your HP back to 100 (requires health < 75, < 3 dislikes in last 24hrs, and max 1 per day)\n` +
        `• /withdraw <address> <amount> - Withdraw HP to an address (max 1 per 24hrs)\n\n` +
        `**Token Details:**\n` +
        `• Token: HP (Hit Points)\n` +
        `• Decimals: 0 (whole numbers only)\n` +
        `• Registration reward: 100 HP\n` +
        `• Like: 1 HP sent from liker to message author\n` +
        `• Dislike: 1 HP cost for disliker, 2 HP penalty for message author\n\n` +
        (isRegistered
            ? `✅ You are registered! Use /health to check your balance or /address to view your wallet.`
            : `📝 You're not registered yet. Use /register to get started!`);

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
};

/**
 * Get and display address for a registered user with QR code
 * @param ctx - Grammy context from the command
 * @param pool - Database connection pool
 */
export const address = async (ctx: Context, pool: Pool): Promise<void> => {
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

    // Generate ASCII QR code (callback is synchronous)
    let qrCode = '';
    qrcode.generate(address, { small: true }, (qr: string) => {
        qrCode = qr;
    });

    await ctx.reply(
        `📍 **Your Address**\n\n` +
            `\`\`\`\n${address}\n\`\`\`\n\n` +
            `**QR Code:**\n` +
            `\`\`\`\n${qrCode}\n\`\`\``,
        { parse_mode: 'Markdown' },
    );
};

/**
 * Get statistics about The Overmind
 * Can only be called from the admin chat
 * @param ctx - Grammy context from the command
 * @param pool - Database connection pool
 * @param adminChatId - Admin group chat ID
 */
export const stats = async (
    ctx: Context,
    pool: Pool,
    adminChatId: string,
): Promise<void> => {
    // Check if command is called from admin chat
    const chatId = ctx.chat?.id?.toString();
    if (chatId !== adminChatId) {
        await ctx.reply('❌ This command can only be used in the admin chat.');
        return;
    }

    try {
        // Get number of registered users
        const usersResult = await pool.query(
            'SELECT COUNT(*) as count FROM users',
        );
        const userCount = parseInt(usersResult.rows[0].count, 10);

        // Get total likes and dislikes
        const reactionsResult = await pool.query(
            'SELECT COALESCE(SUM(likes), 0) as total_likes, COALESCE(SUM(dislikes), 0) as total_dislikes FROM messages',
        );
        const totalLikes = parseInt(reactionsResult.rows[0].total_likes, 10);
        const totalDislikes = parseInt(
            reactionsResult.rows[0].total_dislikes,
            10,
        );

        // Format the stats message
        const message =
            `📊 **The Overmind Statistics**\n\n` +
            `👥 **Registered Users:** ${userCount.toLocaleString('en-US')}\n` +
            `👍 **Total Likes:** ${totalLikes.toLocaleString('en-US')}\n` +
            `👎 **Total Dislikes:** ${totalDislikes.toLocaleString('en-US')}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('Error fetching statistics:', err);
        await ctx.reply(
            '❌ Error fetching statistics. Please try again later.',
        );
    }
};

/**
 * Handle messages in the monitored group chat
 * Stores messages in the database for reaction tracking
 * Also handles message replies: 🍼 and 🌶 in reply trigger HP flows (bottle: deductions to bot; chili: 10HP per 🌶 from reply sender to original author)
 * @param ctx - Grammy context from the message
 * @param pool - Database connection pool
 * @param monitoredGroupChatId - The monitored group chat ID
 * @param masterNode - Master HD node for deriving user wallets
 * @param chronik - Chronik client for blockchain operations
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 * @param botWalletAddress - The bot wallet address to receive HP tokens
 */
export const handleMessage = async (
    ctx: Context,
    pool: Pool,
    monitoredGroupChatId: string,
    masterNode: HdNode,
    chronik: ChronikClient,
    bot: Bot,
    adminChatId: string,
    botWalletAddress: string,
): Promise<void> => {
    const chatId = ctx.chat?.id?.toString();
    if (chatId === monitoredGroupChatId && ctx.message?.message_id) {
        const msgId = ctx.message.message_id;
        const senderId = ctx.from?.id || null;
        const username = ctx.from?.username || null;

        // Extract message text content
        let messageText = '';
        if (ctx.message.text !== undefined && ctx.message.text !== null) {
            messageText = ctx.message.text;
        } else if (
            ctx.message.caption !== undefined &&
            ctx.message.caption !== null
        ) {
            messageText = ctx.message.caption;
        } else if (ctx.message.sticker) {
            messageText = `[Sticker: ${ctx.message.sticker.emoji || 'sticker'}]`;
        } else if (ctx.message.photo) {
            messageText = ctx.message.caption || '[Photo]';
        } else if (ctx.message.video) {
            messageText = ctx.message.caption || '[Video]';
        } else if (ctx.message.document) {
            messageText =
                ctx.message.caption ||
                `[Document: ${ctx.message.document.file_name || 'file'}]`;
        } else {
            messageText = '[Non-text message]';
        }

        // Insert message into database (ON CONFLICT DO NOTHING in case message already exists)
        try {
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username) VALUES ($1, $2, $3, $4) ON CONFLICT (msg_id) DO NOTHING',
                [msgId, messageText, senderId, username],
            );
        } catch (err) {
            console.error(`Error storing message ${msgId} in database:`, err);
        }

        // Check if this is a reply (for bottle and/or chili processing)
        const replyToMessage = ctx.message.reply_to_message;
        if (replyToMessage && replyToMessage.message_id && senderId) {
            // Count 🍼 and 🌶 emojis in the reply message text (up to 5 each)
            const bottleEmoji = '🍼';
            const bottleMatches = messageText.match(
                new RegExp(
                    bottleEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                    'g',
                ),
            );
            const bottleCount = bottleMatches
                ? Math.min(bottleMatches.length, 5)
                : 0;

            const chiliEmoji = '🌶';
            const chiliMatches = messageText.match(
                new RegExp(
                    chiliEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                    'g',
                ),
            );
            const chiliCount = chiliMatches
                ? Math.min(chiliMatches.length, 5)
                : 0;

            const originalMessageAuthorId = replyToMessage.from?.id ?? null;

            // Check if both users are registered (needed for bottle and/or chili)
            if (originalMessageAuthorId !== null) {
                try {
                    const replySenderResult = await pool.query(
                        'SELECT user_tg_id FROM users WHERE user_tg_id = $1',
                        [senderId],
                    );
                    const authorResult = await pool.query(
                        'SELECT user_tg_id FROM users WHERE user_tg_id = $1',
                        [originalMessageAuthorId],
                    );

                    if (
                        replySenderResult.rows.length > 0 &&
                        authorResult.rows.length > 0
                    ) {
                        if (bottleCount > 0) {
                            await handleBottleReply(
                                pool,
                                masterNode,
                                chronik,
                                bot,
                                adminChatId,
                                botWalletAddress,
                                senderId,
                                originalMessageAuthorId,
                                msgId,
                                replyToMessage.message_id,
                                bottleCount,
                            );
                        }
                        if (chiliCount > 0) {
                            await handleChiliReply(
                                pool,
                                masterNode,
                                chronik,
                                bot,
                                adminChatId,
                                senderId,
                                originalMessageAuthorId,
                                msgId,
                                chiliCount,
                            );
                        }
                    } else {
                        if (bottleCount > 0 || chiliCount > 0) {
                            console.log(
                                `User ${senderId} or ${originalMessageAuthorId} is not registered, skipping reply processing`,
                            );
                        }
                    }
                } catch (err) {
                    console.error(
                        'Error checking user registration for reply processing:',
                        err,
                    );
                }
            } else {
                if (bottleCount > 0 || chiliCount > 0) {
                    console.log(
                        'Original message author unknown (reply_to_message.from missing), skipping reply processing',
                    );
                }
            }
        }
    }
};

/**
 * Handle sending 1HP token from a liker to a message author
 * Assumes both users are registered (caller should verify this)
 * @param pool - Database connection pool
 * @param masterNode - Master HD node for deriving user wallets
 * @param chronik - Chronik client for blockchain operations
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 * @param likerUserId - Telegram user ID of the person who liked the message
 * @param messageAuthorUserId - Telegram user ID of the message author
 * @param msgId - Telegram message ID for EMPP data push
 */
export const handleLike = async (
    pool: Pool,
    masterNode: HdNode,
    chronik: ChronikClient,
    bot: Bot,
    adminChatId: string,
    likerUserId: number,
    messageAuthorUserId: number,
    msgId: number,
): Promise<void> => {
    // Get liker's HD index and message author's address
    const likerResult = await pool.query(
        'SELECT hd_index FROM users WHERE user_tg_id = $1',
        [likerUserId],
    );
    const authorResult = await pool.query(
        'SELECT address FROM users WHERE user_tg_id = $1',
        [messageAuthorUserId],
    );

    if (likerResult.rows.length === 0 || authorResult.rows.length === 0) {
        console.log(
            `User ${likerUserId} or ${messageAuthorUserId} is not registered`,
        );
        return;
    }

    const likerHdIndex = likerResult.rows[0].hd_index;
    const authorAddress = authorResult.rows[0].address;

    // Don't send tokens if user is liking their own message
    if (likerUserId === messageAuthorUserId) {
        return;
    }

    // Initialize liker's wallet from their HD index
    const likerNode = masterNode.derivePath(`m/44'/1899'/${likerHdIndex}'/0/0`);
    const likerSk = likerNode.seckey();
    if (!likerSk) {
        // Not expected to happen, handle for typescript
        console.error(`Failed to derive secret key for user ${likerUserId}`);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleLike (deriving wallet)',
            likerUserId,
            new Error('Failed to derive secret key from HD index'),
        );
        return;
    }
    const likerWallet = Wallet.fromSk(likerSk, chronik);

    // Send 1HP (1 token atom) from liker's wallet to author
    try {
        // Sync liker's wallet to ensure we have latest token balance
        await likerWallet.sync();

        // Construct EMPP data push for LIKE
        const likeEmppData = getOvermindEmpp(EmppAction.LIKE, msgId);

        // Create action to send 1HP token
        const tokenSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** 1HP token at outIdx 1 */
                {
                    sats: DEFAULT_DUST_SATS,
                    script: Script.fromAddress(authorAddress),
                    tokenId: REWARDS_TOKEN_ID,
                    atoms: 1n, // 1HP
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
                    data: likeEmppData,
                },
            ],
        };

        // Build and broadcast the transaction
        const resp = await likerWallet
            .action(tokenSendAction)
            .build()
            .broadcast();

        if (!resp.success || resp.broadcasted.length === 0) {
            const errorMsg = `Failed to send 1HP to message author. Response: ${JSON.stringify(resp)}`;
            console.error(errorMsg);
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'handleLike (sending 1HP)',
                likerUserId,
                new Error(errorMsg),
            );
        } else {
            const txid = resp.broadcasted[0];
            console.log(
                `Sent 1HP from user ${likerUserId} to message author ${messageAuthorUserId}. TX: ${txid}`,
            );
            // Send notification to admin channel
            // Mb this will get too noisy, but it's a useful record, and also helps unit tests
            try {
                const usernames = getUsernamesOrId([
                    likerUserId,
                    messageAuthorUserId,
                ]);
                const likerUsername =
                    usernames.get(likerUserId) || likerUserId.toString();
                const authorUsername =
                    usernames.get(messageAuthorUserId) ||
                    messageAuthorUserId.toString();
                await bot.api.sendMessage(
                    adminChatId,
                    `${escapeMarkdownUsername(likerUsername)} [liked](https://explorer.e.cash/tx/${txid}) msg by ${escapeMarkdownUsername(authorUsername)}`,
                    {
                        parse_mode: 'Markdown',
                        link_preview_options: { is_disabled: true },
                    },
                );
            } catch (err) {
                console.error(
                    'Error sending like notification to admin channel:',
                    err,
                );
            }
        }
    } catch (err) {
        console.error('Error sending 1HP to message author:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleMsgLike (sending 1HP)',
            likerUserId,
            err,
        );
    }
};

/**
 * Handle sending HP tokens when a message is disliked
 * The disliker sends 1 HP to the bot wallet
 * The message author sends 2 HP to the bot wallet
 * Assumes both users are registered (caller should verify this)
 * @param pool - Database connection pool
 * @param masterNode - Master HD node for deriving user wallets
 * @param chronik - Chronik client for blockchain operations
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 * @param botWalletAddress - The bot wallet address to receive HP tokens
 * @param dislikerUserId - Telegram user ID of the person who disliked the message
 * @param messageAuthorUserId - Telegram user ID of the message author
 * @param msgId - Telegram message ID for EMPP data push
 */
export const handleDislike = async (
    pool: Pool,
    masterNode: HdNode,
    chronik: ChronikClient,
    bot: Bot,
    adminChatId: string,
    botWalletAddress: string,
    dislikerUserId: number,
    messageAuthorUserId: number,
    msgId: number,
): Promise<void> => {
    // Get users' HD indices
    const dislikerResult = await pool.query(
        'SELECT hd_index FROM users WHERE user_tg_id = $1',
        [dislikerUserId],
    );
    const authorResult = await pool.query(
        'SELECT hd_index FROM users WHERE user_tg_id = $1',
        [messageAuthorUserId],
    );

    if (dislikerResult.rows.length === 0 || authorResult.rows.length === 0) {
        console.log(
            `User ${dislikerUserId} or ${messageAuthorUserId} is not registered`,
        );
        return;
    }

    const dislikerHdIndex = dislikerResult.rows[0].hd_index;
    const authorHdIndex = authorResult.rows[0].hd_index;

    // Don't process if user is disliking their own message
    if (dislikerUserId === messageAuthorUserId) {
        return;
    }

    // Initialize disliker's wallet
    const dislikerNode = masterNode.derivePath(
        `m/44'/1899'/${dislikerHdIndex}'/0/0`,
    );
    const dislikerSk = dislikerNode.seckey();
    if (!dislikerSk) {
        // Not expected to happen, handle for typescript
        console.error(`Failed to derive secret key for user ${dislikerUserId}`);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleDislike (deriving disliker wallet)',
            dislikerUserId,
            new Error('Failed to derive secret key from HD index'),
        );
        return;
    }
    const dislikerWallet = Wallet.fromSk(dislikerSk, chronik);

    // Initialize message author's wallet
    const authorNode = masterNode.derivePath(
        `m/44'/1899'/${authorHdIndex}'/0/0`,
    );
    const authorSk = authorNode.seckey();
    if (!authorSk) {
        // Not expected to happen, handle for typescript
        console.error(
            `Failed to derive secret key for user ${messageAuthorUserId}`,
        );
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleDislike (deriving author wallet)',
            messageAuthorUserId,
            new Error('Failed to derive secret key from HD index'),
        );
        return;
    }
    const authorWallet = Wallet.fromSk(authorSk, chronik);

    // Disliker sends 1 HP to bot wallet
    try {
        await dislikerWallet.sync();

        // Construct EMPP data push for DISLIKE
        const dislikeEmppData = getOvermindEmpp(EmppAction.DISLIKE, msgId);

        const dislikerTokenSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** 1HP token at outIdx 1 */
                {
                    sats: DEFAULT_DUST_SATS,
                    script: Script.fromAddress(botWalletAddress),
                    tokenId: REWARDS_TOKEN_ID,
                    atoms: 1n, // 1HP
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
                    data: dislikeEmppData,
                },
            ],
        };

        const dislikerResp = await dislikerWallet
            .action(dislikerTokenSendAction)
            .build()
            .broadcast();

        if (!dislikerResp.success || dislikerResp.broadcasted.length === 0) {
            const errorMsg = `Failed to send 1HP from disliker to bot. Response: ${JSON.stringify(dislikerResp)}`;
            console.error(errorMsg);
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'handleDislike (disliker sending 1HP)',
                dislikerUserId,
                new Error(errorMsg),
            );
        } else {
            const txid = dislikerResp.broadcasted[0];
            console.log(
                `Disliker ${dislikerUserId} sent 1HP to bot wallet. TX: ${txid}`,
            );
            // Send notification to admin channel
            try {
                const usernames = getUsernamesOrId([
                    dislikerUserId,
                    messageAuthorUserId,
                ]);
                const dislikerUsername =
                    usernames.get(dislikerUserId) || dislikerUserId.toString();
                const authorUsername =
                    usernames.get(messageAuthorUserId) ||
                    messageAuthorUserId.toString();
                await bot.api.sendMessage(
                    adminChatId,
                    `${escapeMarkdownUsername(dislikerUsername)} [disliked](https://explorer.e.cash/tx/${txid}) msg by ${escapeMarkdownUsername(authorUsername)}`,
                    {
                        parse_mode: 'Markdown',
                        link_preview_options: { is_disabled: true },
                    },
                );
            } catch (err) {
                console.error(
                    'Error sending dislike notification to admin channel:',
                    err,
                );
            }
        }
    } catch (err) {
        console.error('Error sending 1HP from disliker to bot:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleDislike (disliker sending 1HP)',
            dislikerUserId,
            err,
        );
    }

    // Message author sends 2 HP to bot wallet
    try {
        await authorWallet.sync();

        // Construct EMPP data push for DISLIKED
        const dislikedEmppData = getOvermindEmpp(EmppAction.DISLIKED, msgId);

        const authorTokenSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** 2HP token at outIdx 1 */
                {
                    sats: DEFAULT_DUST_SATS,
                    script: Script.fromAddress(botWalletAddress),
                    tokenId: REWARDS_TOKEN_ID,
                    atoms: 2n, // 2HP
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
                    data: dislikedEmppData,
                },
            ],
        };

        const authorResp = await authorWallet
            .action(authorTokenSendAction)
            .build()
            .broadcast();

        if (!authorResp.success || authorResp.broadcasted.length === 0) {
            const errorMsg = `Failed to send 2HP from message author to bot. Response: ${JSON.stringify(authorResp)}`;
            console.error(errorMsg);
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'handleDislike (author sending 2HP)',
                messageAuthorUserId,
                new Error(errorMsg),
            );
        } else {
            const txid = authorResp.broadcasted[0];
            console.log(
                `Message author ${messageAuthorUserId} sent 2HP to bot wallet. TX: ${txid}`,
            );
            // Send notification to admin channel
            try {
                const usernames = getUsernamesOrId([
                    messageAuthorUserId,
                    dislikerUserId,
                ]);
                const authorUsername =
                    usernames.get(messageAuthorUserId) ||
                    messageAuthorUserId.toString();
                const dislikerUsername =
                    usernames.get(dislikerUserId) || dislikerUserId.toString();
                await bot.api.sendMessage(
                    adminChatId,
                    `${escapeMarkdownUsername(authorUsername)} [penalized](https://explorer.e.cash/tx/${txid}) for msg disliked by ${escapeMarkdownUsername(dislikerUsername)}`,
                    {
                        parse_mode: 'Markdown',
                        link_preview_options: { is_disabled: true },
                    },
                );
            } catch (err) {
                console.error(
                    'Error sending penalty notification to admin channel:',
                    err,
                );
            }
        }
    } catch (err) {
        console.error('Error sending 2HP from message author to bot:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleDislike (author sending 2HP)',
            messageAuthorUserId,
            err,
        );
    }
};

/**
 * Handle sending HP tokens when a message reply contains the 🍼 emoji
 * The sender of the message being replied to loses 10HP per 🍼 (up to 5) to the bot wallet
 * The user who typed the 🍼 emoji loses 3HP per 🍼 (up to 5) to the bot wallet
 * Assumes both users are registered (caller should verify this)
 * @param pool - Database connection pool
 * @param masterNode - Master HD node for deriving user wallets
 * @param chronik - Chronik client for blockchain operations
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 * @param botWalletAddress - The bot wallet address to receive HP tokens
 * @param replySenderUserId - Telegram user ID of the person who sent the reply
 * @param originalMessageAuthorUserId - Telegram user ID of the original message author
 * @param replyMsgId - Telegram message ID of the reply for EMPP data push
 * @param originalMsgId - Telegram message ID of the original message being replied to
 * @param bottleCount - Number of 🍼 emojis in the reply (capped at 5)
 */
export const handleBottleReply = async (
    pool: Pool,
    masterNode: HdNode,
    chronik: ChronikClient,
    bot: Bot,
    adminChatId: string,
    botWalletAddress: string,
    replySenderUserId: number,
    originalMessageAuthorUserId: number,
    replyMsgId: number,
    originalMsgId: number,
    bottleCount: number,
): Promise<void> => {
    // Cap bottle count at 5
    const cappedBottleCount = Math.min(bottleCount, 5);

    // Get users' HD indices
    const replySenderResult = await pool.query(
        'SELECT hd_index FROM users WHERE user_tg_id = $1',
        [replySenderUserId],
    );
    const authorResult = await pool.query(
        'SELECT hd_index FROM users WHERE user_tg_id = $1',
        [originalMessageAuthorUserId],
    );

    if (replySenderResult.rows.length === 0 || authorResult.rows.length === 0) {
        console.log(
            `User ${replySenderUserId} or ${originalMessageAuthorUserId} is not registered`,
        );
        return;
    }

    const replySenderHdIndex = replySenderResult.rows[0].hd_index;
    const authorHdIndex = authorResult.rows[0].hd_index;

    // Don't process if user is replying to their own message
    if (replySenderUserId === originalMessageAuthorUserId) {
        return;
    }

    // Initialize reply sender's wallet
    const replySenderNode = masterNode.derivePath(
        `m/44'/1899'/${replySenderHdIndex}'/0/0`,
    );
    const replySenderSk = replySenderNode.seckey();
    if (!replySenderSk) {
        console.error(
            `Failed to derive secret key for user ${replySenderUserId}`,
        );
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleBottleReply (deriving reply sender wallet)',
            replySenderUserId,
            new Error('Failed to derive secret key from HD index'),
        );
        return;
    }
    const replySenderWallet = Wallet.fromSk(replySenderSk, chronik);

    // Initialize original message author's wallet
    const authorNode = masterNode.derivePath(
        `m/44'/1899'/${authorHdIndex}'/0/0`,
    );
    const authorSk = authorNode.seckey();
    if (!authorSk) {
        console.error(
            `Failed to derive secret key for user ${originalMessageAuthorUserId}`,
        );
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleBottleReply (deriving author wallet)',
            originalMessageAuthorUserId,
            new Error('Failed to derive secret key from HD index'),
        );
        return;
    }
    const authorWallet = Wallet.fromSk(authorSk, chronik);

    // Sync both wallets to get latest UTXOs
    try {
        await replySenderWallet.sync();
        await authorWallet.sync();
    } catch (err) {
        console.error('Error syncing wallets for bottle reply:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleBottleReply (syncing wallets)',
            replySenderUserId,
            err,
        );
        return;
    }

    // Get HP balances from wallet UTXOs
    let replySenderBalance = 0n;
    let authorBalance = 0n;
    for (const utxo of replySenderWallet.utxos) {
        if (
            typeof utxo.token !== 'undefined' &&
            utxo.token.tokenId === REWARDS_TOKEN_ID
        ) {
            replySenderBalance += utxo.token.atoms;
        }
    }
    for (const utxo of authorWallet.utxos) {
        if (
            typeof utxo.token !== 'undefined' &&
            utxo.token.tokenId === REWARDS_TOKEN_ID
        ) {
            authorBalance += utxo.token.atoms;
        }
    }

    // Cap bottle count based on reply sender's balance
    // If they only have enough HP for 1 bottle, they can only do a 1-bottle reply
    const maxBottlesByReplySenderBalance = Math.floor(
        Number(replySenderBalance) / BOTTLE_REPLY_SENDER_HP_LOSS_PER_BOTTLE,
    );
    const effectiveBottleCount = Math.min(
        cappedBottleCount,
        maxBottlesByReplySenderBalance,
    );

    // If reply sender doesn't have enough HP for even 1 bottle, skip
    if (effectiveBottleCount === 0) {
        console.log(
            `Reply sender ${replySenderUserId} has insufficient HP (${replySenderBalance}) for bottle reply`,
        );
        return;
    }

    // Calculate HP amounts (scaled by effective bottle count)
    // Author loses HP per bottle, but cap at their current balance
    const authorHpLossRequested = BigInt(
        effectiveBottleCount * BOTTLE_REPLY_AUTHOR_HP_LOSS_PER_BOTTLE,
    );
    const authorHpLoss =
        authorHpLossRequested > authorBalance
            ? authorBalance
            : authorHpLossRequested;

    // Reply sender loses HP per bottle (already capped by effectiveBottleCount)
    const replySenderHpLoss = BigInt(
        effectiveBottleCount * BOTTLE_REPLY_SENDER_HP_LOSS_PER_BOTTLE,
    );

    // Skip if author has no HP to send
    if (authorHpLoss === 0n) {
        console.log(
            `Original message author ${originalMessageAuthorUserId} has no HP to lose`,
        );
        return;
    }

    // Original message author sends HP to bot wallet
    try {
        // Construct EMPP data push for BOTTLE_REPLIED
        const bottleRepliedEmppData = getOvermindEmpp(
            EmppAction.BOTTLE_REPLIED,
            originalMsgId,
        );

        const authorTokenSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** HP tokens at outIdx 1 */
                {
                    sats: DEFAULT_DUST_SATS,
                    script: Script.fromAddress(botWalletAddress),
                    tokenId: REWARDS_TOKEN_ID,
                    atoms: authorHpLoss,
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
                    data: bottleRepliedEmppData,
                },
            ],
        };

        const authorResp = await authorWallet
            .action(authorTokenSendAction)
            .build()
            .broadcast();

        if (!authorResp.success || authorResp.broadcasted.length === 0) {
            const errorMsg = `Failed to send ${authorHpLoss}HP from original message author to bot. Response: ${JSON.stringify(authorResp)}`;
            console.error(errorMsg);
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'handleBottleReply (author sending HP)',
                originalMessageAuthorUserId,
                new Error(errorMsg),
            );
        } else {
            const txid = authorResp.broadcasted[0];
            console.log(
                `Original message author ${originalMessageAuthorUserId} sent ${authorHpLoss}HP to bot wallet. TX: ${txid}`,
            );
            // Send notification to admin channel
            try {
                const usernames = getUsernamesOrId([
                    originalMessageAuthorUserId,
                    replySenderUserId,
                ]);
                const authorUsername =
                    usernames.get(originalMessageAuthorUserId) ||
                    originalMessageAuthorUserId.toString();
                const replySenderUsername =
                    usernames.get(replySenderUserId) ||
                    replySenderUserId.toString();
                await bot.api.sendMessage(
                    adminChatId,
                    `${escapeMarkdownUsername(authorUsername)} [lost ${authorHpLoss}HP](https://explorer.e.cash/tx/${txid}) from bottle reply by ${escapeMarkdownUsername(replySenderUsername)}`,
                    {
                        parse_mode: 'Markdown',
                        link_preview_options: { is_disabled: true },
                    },
                );
            } catch (err) {
                console.error(
                    'Error sending bottle reply notification to admin channel:',
                    err,
                );
            }
        }
    } catch (err) {
        console.error(
            'Error sending HP from original message author to bot:',
            err,
        );
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleBottleReply (author sending HP)',
            originalMessageAuthorUserId,
            err,
        );
    }

    // Reply sender sends HP to bot wallet
    try {
        // Construct EMPP data push for BOTTLE_REPLY
        const bottleReplyEmppData = getOvermindEmpp(
            EmppAction.BOTTLE_REPLY,
            replyMsgId,
        );

        const replySenderTokenSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** HP tokens at outIdx 1 */
                {
                    sats: DEFAULT_DUST_SATS,
                    script: Script.fromAddress(botWalletAddress),
                    tokenId: REWARDS_TOKEN_ID,
                    atoms: replySenderHpLoss,
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
                    data: bottleReplyEmppData,
                },
            ],
        };

        const replySenderResp = await replySenderWallet
            .action(replySenderTokenSendAction)
            .build()
            .broadcast();

        if (
            !replySenderResp.success ||
            replySenderResp.broadcasted.length === 0
        ) {
            const errorMsg = `Failed to send ${replySenderHpLoss}HP from reply sender to bot. Response: ${JSON.stringify(replySenderResp)}`;
            console.error(errorMsg);
            await sendErrorToAdmin(
                bot,
                adminChatId,
                'handleBottleReply (reply sender sending HP)',
                replySenderUserId,
                new Error(errorMsg),
            );
        } else {
            const txid = replySenderResp.broadcasted[0];
            console.log(
                `Reply sender ${replySenderUserId} sent ${replySenderHpLoss}HP to bot wallet. TX: ${txid}`,
            );
            // Send notification to admin channel
            try {
                const usernames = getUsernamesOrId([
                    replySenderUserId,
                    originalMessageAuthorUserId,
                ]);
                const replySenderUsername =
                    usernames.get(replySenderUserId) ||
                    replySenderUserId.toString();
                const authorUsername =
                    usernames.get(originalMessageAuthorUserId) ||
                    originalMessageAuthorUserId.toString();
                await bot.api.sendMessage(
                    adminChatId,
                    `${escapeMarkdownUsername(replySenderUsername)} [lost ${replySenderHpLoss}HP](https://explorer.e.cash/tx/${txid}) from bottle reply to ${escapeMarkdownUsername(authorUsername)}`,
                    {
                        parse_mode: 'Markdown',
                        link_preview_options: { is_disabled: true },
                    },
                );
            } catch (err) {
                console.error(
                    'Error sending bottle reply notification to admin channel:',
                    err,
                );
            }
        }
    } catch (err) {
        console.error('Error sending HP from reply sender to bot:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleBottleReply (reply sender sending HP)',
            replySenderUserId,
            err,
        );
    }
};

/**
 * Handle sending 10HP per 🌶 from reply sender to original message author when the reply contains 🌶
 * Counts 🌶 in the reply message (up to 5 chilis = 50 HP max)
 * Assumes both users are registered (caller should verify this)
 * @param pool - Database connection pool
 * @param masterNode - Master HD node for deriving user wallets
 * @param chronik - Chronik client for blockchain operations
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 * @param replySenderUserId - Telegram user ID of the person who sent the reply
 * @param originalMessageAuthorUserId - Telegram user ID of the original message author
 * @param replyMsgId - Telegram message ID of the reply for EMPP data push
 * @param chiliCount - Number of 🌶 emojis in the reply message (capped at 5)
 */
export const handleChiliReply = async (
    pool: Pool,
    masterNode: HdNode,
    chronik: ChronikClient,
    bot: Bot,
    adminChatId: string,
    replySenderUserId: number,
    originalMessageAuthorUserId: number,
    replyMsgId: number,
    chiliCount: number,
): Promise<void> => {
    const cappedChiliCount = Math.min(chiliCount, 5);

    const replySenderResult = await pool.query(
        'SELECT hd_index FROM users WHERE user_tg_id = $1',
        [replySenderUserId],
    );
    const authorResult = await pool.query(
        'SELECT address FROM users WHERE user_tg_id = $1',
        [originalMessageAuthorUserId],
    );

    if (replySenderResult.rows.length === 0 || authorResult.rows.length === 0) {
        console.log(
            `User ${replySenderUserId} or ${originalMessageAuthorUserId} is not registered`,
        );
        return;
    }

    const replySenderHdIndex = replySenderResult.rows[0].hd_index;
    const authorAddress = authorResult.rows[0].address;

    if (replySenderUserId === originalMessageAuthorUserId) {
        return;
    }

    const replySenderNode = masterNode.derivePath(
        `m/44'/1899'/${replySenderHdIndex}'/0/0`,
    );
    const replySenderSk = replySenderNode.seckey();
    if (!replySenderSk) {
        console.error(
            `Failed to derive secret key for user ${replySenderUserId}`,
        );
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleChiliReply (deriving wallet)',
            replySenderUserId,
            new Error('Failed to derive secret key from HD index'),
        );
        return;
    }
    const replySenderWallet = Wallet.fromSk(replySenderSk, chronik);

    try {
        await replySenderWallet.sync();
    } catch (err) {
        console.error('Error syncing wallet for chili reply:', err);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleChiliReply (syncing wallet)',
            replySenderUserId,
            err,
        );
        return;
    }

    let replySenderBalance = 0n;
    for (const utxo of replySenderWallet.utxos) {
        if (
            typeof utxo.token !== 'undefined' &&
            utxo.token.tokenId === REWARDS_TOKEN_ID
        ) {
            replySenderBalance += utxo.token.atoms;
        }
    }

    const maxChilisByBalance = Math.floor(
        Number(replySenderBalance) / CHILI_REPLY_HP_AMOUNT,
    );
    const effectiveChiliCount = Math.min(cappedChiliCount, maxChilisByBalance);

    if (effectiveChiliCount === 0) {
        console.log(
            `Reply sender ${replySenderUserId} has insufficient HP (${replySenderBalance}) for chili reply`,
        );
        return;
    }

    const chiliHpAmount = BigInt(effectiveChiliCount * CHILI_REPLY_HP_AMOUNT);

    const chiliReplyEmppData = getOvermindEmpp(
        EmppAction.CHILI_REPLY,
        replyMsgId,
    );

    const tokenSendAction: payment.Action = {
        outputs: [
            { sats: 0n },
            {
                sats: DEFAULT_DUST_SATS,
                script: Script.fromAddress(authorAddress),
                tokenId: REWARDS_TOKEN_ID,
                atoms: chiliHpAmount,
            },
        ],
        tokenActions: [
            {
                type: 'SEND',
                tokenId: REWARDS_TOKEN_ID,
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
            {
                type: 'DATA',
                data: chiliReplyEmppData,
            },
        ],
    };

    const resp = await replySenderWallet
        .action(tokenSendAction)
        .build()
        .broadcast();

    if (!resp.success || resp.broadcasted.length === 0) {
        const errorMsg = `Failed to send ${chiliHpAmount}HP from reply sender to author. Response: ${JSON.stringify(resp)}`;
        console.error(errorMsg);
        await sendErrorToAdmin(
            bot,
            adminChatId,
            'handleChiliReply (sending HP)',
            replySenderUserId,
            new Error(errorMsg),
        );
        return;
    }

    const txid = resp.broadcasted[0];
    console.log(
        `Reply sender ${replySenderUserId} sent ${chiliHpAmount}HP to original message author ${originalMessageAuthorUserId}. TX: ${txid}`,
    );
    try {
        const usernames = getUsernamesOrId([
            replySenderUserId,
            originalMessageAuthorUserId,
        ]);
        const replySenderUsername =
            usernames.get(replySenderUserId) || replySenderUserId.toString();
        const authorUsername =
            usernames.get(originalMessageAuthorUserId) ||
            originalMessageAuthorUserId.toString();
        await bot.api.sendMessage(
            adminChatId,
            `${escapeMarkdownUsername(replySenderUsername)} [sent ${chiliHpAmount}HP](https://explorer.e.cash/tx/${txid}) to ${escapeMarkdownUsername(authorUsername)} for chili reply 🌶`,
            {
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            },
        );
    } catch (err) {
        console.error(
            'Error sending chili reply notification to admin channel:',
            err,
        );
    }
};

/**
 * Handle emoji reactions to messages in the monitored group chat
 * Updates likes/dislikes counts and logs reaction details
 * @param ctx - Grammy context from the reaction
 * @param pool - Database connection pool
 * @param monitoredGroupChatId - The monitored group chat ID
 * @param masterNode - Master HD node for deriving user wallets
 * @param chronik - Chronik client for blockchain operations
 * @param bot - Bot instance for sending admin notifications
 * @param adminChatId - Admin group chat ID for error notifications
 * @param botWalletAddress - The bot wallet address to receive HP tokens on dislikes
 */
export const handleMessageReaction = async (
    ctx: Context,
    pool: Pool,
    monitoredGroupChatId: string,
    masterNode: HdNode,
    chronik: ChronikClient,
    bot: Bot,
    adminChatId: string,
    botWalletAddress: string,
): Promise<void> => {
    try {
        const reaction = ctx.messageReaction;
        if (!reaction) {
            return;
        }

        // Only process reactions in the monitored group chat
        const chatId = ctx.chat?.id?.toString();
        if (chatId !== monitoredGroupChatId) {
            return;
        }

        const msgId = reaction.message_id;
        const senderId = ctx.from?.id;

        if (!msgId || !senderId) {
            return;
        }

        // Check if the reacting user is registered
        let isRegistered = false;
        try {
            const userResult = await pool.query(
                'SELECT user_tg_id FROM users WHERE user_tg_id = $1',
                [senderId],
            );
            isRegistered = userResult.rows.length > 0;
        } catch (err) {
            console.error(
                `Error checking if user ${senderId} is registered:`,
                err,
            );
        }

        // Check if user is reacting to their own message
        let messageSenderId: number | null = null;
        try {
            const messageResult = await pool.query(
                'SELECT user_tg_id FROM messages WHERE msg_id = $1',
                [msgId],
            );
            if (
                messageResult.rows.length > 0 &&
                messageResult.rows[0].user_tg_id
            ) {
                // Convert to number if it's a string or BigInt from the database
                const dbValue = messageResult.rows[0].user_tg_id;
                messageSenderId =
                    typeof dbValue === 'number'
                        ? dbValue
                        : typeof dbValue === 'bigint'
                          ? Number(dbValue)
                          : parseInt(String(dbValue), 10);
            }
        } catch (err) {
            console.error(`Error fetching message sender for ${msgId}:`, err);
        }

        // Compare as numbers to handle BigInt from database
        const isSelfReaction =
            messageSenderId !== null &&
            !isNaN(messageSenderId) &&
            Number(messageSenderId) === Number(senderId);

        // Get old and new reactions
        const oldReactions = (reaction.old_reaction || []) as Array<
            | string
            | { type: 'emoji'; emoji: string }
            | { type: 'custom_emoji'; custom_emoji_id: string }
        >;
        const newReactions = (reaction.new_reaction || []) as Array<
            | string
            | { type: 'emoji'; emoji: string }
            | { type: 'custom_emoji'; custom_emoji_id: string }
        >;

        // Skip if we're only removing reactions (new_reaction is empty or smaller than old)
        if (
            newReactions.length === 0 ||
            newReactions.length < oldReactions.length
        ) {
            // This is a reaction removal, skip it
            return;
        }

        // Process all newly added reactions
        // Find reactions that are in new_reaction but not in old_reaction
        type ReactionType =
            | string
            | { type: 'emoji'; emoji: string }
            | { type: 'custom_emoji'; custom_emoji_id: string };
        const getReactionKey = (r: ReactionType): string => {
            if (typeof r === 'string') {
                return r;
            } else if (r.type === 'emoji' && r.emoji) {
                return r.emoji;
            } else if (r.type === 'custom_emoji' && r.custom_emoji_id) {
                return r.custom_emoji_id;
            }
            return '';
        };

        const oldReactionKeys = new Set(
            oldReactions.map(getReactionKey).filter(key => key !== ''),
        );

        // Count likes and dislikes in the loop, then update once at the end
        // Thumbs down 👎 is a dislike, all other emojis are likes
        let likesCount = 0;
        let dislikesCount = 0;

        // Process each new reaction that wasn't in old_reaction
        for (const newReaction of newReactions) {
            const reactionKey = getReactionKey(newReaction);
            if (!reactionKey || oldReactionKeys.has(reactionKey)) {
                // Skip if this reaction was already present
                continue;
            }

            const emoji = reactionKey;

            // Log reaction details (always log, even for self-reactions and unregistered users)
            if (isSelfReaction) {
                console.log(
                    `User ${senderId} reacted with ${emoji} to msg ${msgId} (their own msg)`,
                );
                // Skip database updates if user is reacting to their own message
                continue;
            } else {
                const sendingUserId = messageSenderId || 'unknown';
                console.log(
                    `User ${senderId} reacted with ${emoji} to msg ${msgId} sent by ${sendingUserId}`,
                );
            }

            // Skip database updates if user is not registered
            if (!isRegistered) {
                console.log(
                    `User ${senderId} is not registered, skipping database updates`,
                );
                continue;
            }

            // Skip database updates if message doesn't exist
            if (messageSenderId === null) {
                console.log(
                    `Message ${msgId} not found in database, skipping database updates`,
                );
                continue;
            }

            // Count likes and dislikes
            if (emoji === '👎') {
                dislikesCount++;
                // Handle dislike: disliker sends 1HP to bot, author sends 2HP to bot
                // Only call if both users are registered (we already checked isRegistered and messageSenderId)
                if (isRegistered && messageSenderId !== null) {
                    // Check if message author is also registered
                    const authorResult = await pool.query(
                        'SELECT user_tg_id FROM users WHERE user_tg_id = $1',
                        [messageSenderId],
                    );
                    if (authorResult.rows.length > 0) {
                        await handleDislike(
                            pool,
                            masterNode,
                            chronik,
                            bot,
                            adminChatId,
                            botWalletAddress,
                            senderId,
                            messageSenderId,
                            msgId,
                        );
                    }
                }
            } else {
                likesCount++;
                // Send 1HP to message author when user likes the message
                // Only call if both users are registered (we already checked isRegistered and messageSenderId)
                if (isRegistered && messageSenderId !== null) {
                    // Check if message author is also registered
                    const authorResult = await pool.query(
                        'SELECT user_tg_id FROM users WHERE user_tg_id = $1',
                        [messageSenderId],
                    );
                    if (authorResult.rows.length > 0) {
                        await handleLike(
                            pool,
                            masterNode,
                            chronik,
                            bot,
                            adminChatId,
                            senderId,
                            messageSenderId,
                            msgId,
                        );
                    }
                }
            }

            // Insert action into user's action table
            // Table is created when user registers, so it should always exist for registered users
            const tableName = `user_actions_${senderId}`;
            try {
                await pool.query(
                    `INSERT INTO ${tableName} (action, txid, msg_id, emoji) VALUES ($1, $2, $3, $4)`,
                    ['reaction', null, msgId, emoji],
                );
            } catch (err) {
                console.error(
                    `Error inserting reaction action for user ${senderId}:`,
                    err,
                );
            }
        }

        // Update likes and dislikes count in database once
        if (likesCount > 0 || dislikesCount > 0) {
            try {
                await pool.query(
                    'UPDATE messages SET likes = likes + $1, dislikes = dislikes + $2 WHERE msg_id = $3',
                    [likesCount, dislikesCount, msgId],
                );
            } catch (err) {
                console.error(
                    `Error updating reaction count for message ${msgId}:`,
                    err,
                );
            }
        }
    } catch (err) {
        console.error('Error handling emoji reaction:', err);
    }
};
