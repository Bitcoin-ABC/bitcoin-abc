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
    strToBytes,
    WriterBytes,
} from 'ecash-lib';
import { encodeCashAddress } from 'ecashaddrjs';
import { Wallet } from 'ecash-wallet';
import { ChronikClient } from 'chronik-client';
import {
    REWARDS_TOKEN_ID,
    REGISTRATION_REWARD_ATOMS,
    REGISTRATION_REWARD_SATS,
    LOKAD_ID,
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
 * Registration is only allowed for users who are members of the monitored group chat
 * @param ctx - Grammy context from the command
 * @param masterNode - Master HD node derived from the mod's mnemonic
 * @param pool - Database connection pool
 * @param bot - Bot instance for checking chat membership
 * @param monitoredGroupChatId - The monitored group chat ID (required, user must be a member)
 */
export const register = async (
    ctx: Context,
    masterNode: HdNode,
    pool: Pool,
    bot: Bot,
    monitoredGroupChatId: string,
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
        // User must be a member, administrator, or creator (not left or kicked)
        const validStatuses = ['member', 'administrator', 'creator'];
        if (!validStatuses.includes(chatMember.status)) {
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

        // Construct EMPP data push for CLAIM: <lokadId><versionByte><actionCode><msgId>
        // For CLAIM, msgId is 0 since it's not associated with a specific message
        const lokadIdBytes = strToBytes(LOKAD_ID);
        const claimWriter = new WriterBytes(4 + 1 + 1 + 4); // lokadId + version + action + msgId
        claimWriter.putBytes(lokadIdBytes);
        claimWriter.putU8(0x00); // versionByte
        claimWriter.putU8(0x00); // CLAIM action
        claimWriter.putU32(0); // msgId = 0 for CLAIM (not associated with a message)
        const claimEmppData = claimWriter.data;

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
            `INSERT INTO ${tableName} (action, txid, msg_id, emoji) VALUES ($1, $2, $3, $4)`,
            ['claim', txid || null, null, null],
        );
    } catch (err) {
        console.error(`Error inserting claim action for user ${userId}:`, err);
        // Continue execution even if logging fails
    }

    const txMessage = txid
        ? `\n\n🎁 ${REGISTRATION_REWARD_ATOMS.toLocaleString()} reward tokens sent! Transaction: \`${txid}\``
        : '\n\n⚠️ Reward tokens are being processed.';

    await ctx.reply(
        `✅ Claim successful!` + `\n\nYour address: \`${address}\`` + txMessage,
        { parse_mode: 'Markdown' },
    );
};

/**
 * Handle messages in the monitored group chat
 * Stores messages in the database for reaction tracking
 * @param ctx - Grammy context from the message
 * @param pool - Database connection pool
 * @param monitoredGroupChatId - The monitored group chat ID
 */
export const handleMessage = async (
    ctx: Context,
    pool: Pool,
    monitoredGroupChatId: string,
): Promise<void> => {
    const chatId = ctx.chat?.id?.toString();
    if (chatId === monitoredGroupChatId && ctx.message?.message_id) {
        const msgId = ctx.message.message_id;
        const senderId = ctx.from?.id || null;
        const username = ctx.from?.username || null;

        // Extract message text content
        let messageText = '';
        if (ctx.message.text) {
            messageText = ctx.message.text;
        } else if (ctx.message.caption) {
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

        // Construct EMPP data push: <lokadId><versionByte><actionCode><msgId>
        // lokadId: 4 bytes (XOVM)
        // versionByte: 1 byte (0x00)
        // actionCode: 1 byte (0x01 for LIKE)
        // msgId: 4 bytes (u32, little-endian)
        const lokadIdBytes = strToBytes(LOKAD_ID);
        const writer = new WriterBytes(4 + 1 + 1 + 4); // lokadId + version + action + msgId
        writer.putBytes(lokadIdBytes);
        writer.putU8(0x00); // versionByte
        writer.putU8(0x01); // LIKE action
        writer.putU32(msgId);
        const likeEmppData = writer.data;

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
                await bot.api.sendMessage(
                    adminChatId,
                    `${likerUserId} [liked](https://explorer.e.cash/tx/${txid}) msg by ${messageAuthorUserId}`,
                    { parse_mode: 'Markdown' },
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

        // Construct EMPP data push for DISLIKE: <lokadId><versionByte><actionCode><msgId>
        const lokadIdBytes = strToBytes(LOKAD_ID);
        const dislikeWriter = new WriterBytes(4 + 1 + 1 + 4); // lokadId + version + action + msgId
        dislikeWriter.putBytes(lokadIdBytes);
        dislikeWriter.putU8(0x00); // versionByte
        dislikeWriter.putU8(0x02); // DISLIKE action
        dislikeWriter.putU32(msgId);
        const dislikeEmppData = dislikeWriter.data;

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
                await bot.api.sendMessage(
                    adminChatId,
                    `${dislikerUserId} [disliked](https://explorer.e.cash/tx/${txid}) msg by ${messageAuthorUserId}`,
                    { parse_mode: 'Markdown' },
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

        // Construct EMPP data push for DISLIKED: <lokadId><versionByte><actionCode><msgId>
        const lokadIdBytes = strToBytes(LOKAD_ID);
        const dislikedWriter = new WriterBytes(4 + 1 + 1 + 4); // lokadId + version + action + msgId
        dislikedWriter.putBytes(lokadIdBytes);
        dislikedWriter.putU8(0x00); // versionByte
        dislikedWriter.putU8(0x03); // DISLIKED action
        dislikedWriter.putU32(msgId);
        const dislikedEmppData = dislikedWriter.data;

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
                await bot.api.sendMessage(
                    adminChatId,
                    `${messageAuthorUserId} [penalized](https://explorer.e.cash/tx/${txid}) for msg disliked by ${dislikerUserId}`,
                    { parse_mode: 'Markdown' },
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
