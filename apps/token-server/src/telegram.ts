// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    Bot,
    Context,
    GrammyError,
    HttpError,
    InlineKeyboard,
    InputFile,
} from 'grammy';
import config from '../config';
import { Pool } from 'pg';
import {
    countBlacklistedTokensByMinterAddress,
    countTokensByMinterAddress,
} from './cashtabTokens';
import {
    denyTokenIcon,
    FsLikeModeration,
    iconExistsInServedDir,
    restoreTokenIcon,
} from './iconModeration';
import { IFs } from 'memfs';
import { isValidTokenId } from './validation';

const logTelegramError = (context: string, err: unknown): void => {
    console.error(`Telegram bot error (${context}):`, err);
    if (err instanceof GrammyError) {
        console.error('Telegram API error:', err.description);
    } else if (err instanceof HttpError) {
        console.error('Telegram HTTP error:', err);
    }
};

const safeAnswerCallbackQuery = async (
    ctx: Context,
    context: string,
    options?: { text?: string; show_alert?: boolean },
): Promise<void> => {
    try {
        await ctx.answerCallbackQuery(options);
    } catch (err) {
        logTelegramError(`answerCallbackQuery (${context})`, err);
    }
};

/**
 * telegram.ts
 * Methods for working with a Telegram bot
 * In token-server, the Telegram bot is used to manage token icon rejections and other admin actions
 */

/**
 * We need a type for Fs because it is a param
 * It needs to be a param because we use memfs in testing
 */
type FsLikeTg = FsLikeModeration;

const modAddedBy = (user: { id: number; username?: string }): string =>
    typeof user.username !== 'undefined' ? user.username : user.id.toString();

const parseCommandTokenId = (text: string): string | undefined => {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) {
        return undefined;
    }
    const tokenId = parts[1];
    return isValidTokenId(tokenId) ? tokenId : undefined;
};

/**
 * Initialize telegram bot for token-server
 * The telegram bot is used to notify an admin when a new token icon has been uploaded
 * The admin may reject the icon, which will remove the image files from the served directory
 * The admin may then un-reject the icon, which will restore the image files to the served directory
 * Token icons are rejected for impersonating another asset or being a scam
 * @param botId bot id of your telegram bot for token-server
 * @param approvedMods An array of numbers of ids of approved mods
 * @param fs file system (node fs in prod, memfs in testing)
 * @returns
 */
export const initializeTelegramBot = (
    botId: string,
    approvedMods: number[],
    fs: FsLikeTg | IFs,
    pool: Pool,
): Bot => {
    // Initialize telegram bot
    const telegramBot = new Bot(botId);

    if (telegramBot.isRunning()) {
        console.log('Telegram bot is already running, skip initialization');
        return telegramBot;
    }

    console.log('Telegram bot is not running, initializing...');

    // Install the error handler first
    telegramBot.catch(err => {
        const ctx = err.ctx;
        console.error(
            `Error while handling Telegram update ${ctx.update.update_id}:`,
            err.error,
        );
        logTelegramError(`update ${ctx.update.update_id}`, err.error);
    });

    // Add event handler for admin actions
    telegramBot.on('callback_query', async ctx => {
        const callbackQuery = ctx.callbackQuery;
        const msgId = callbackQuery.message?.message_id;
        const tokenId = callbackQuery.data;
        const approvingUser = callbackQuery.from.id;

        console.log(
            `Telegram callback_query ${callbackQuery.id} from user ${approvingUser} for tokenId ${tokenId ?? '(missing)'}`,
        );

        if (!tokenId || typeof tokenId !== 'string') {
            console.error(
                `Invalid callback_query.data from user ${approvingUser}:`,
                callbackQuery.data,
            );
            await safeAnswerCallbackQuery(ctx, 'invalid callback data', {
                text: 'Invalid callback data',
                show_alert: true,
            });
            return;
        }

        const isRemovalRequest = iconExistsInServedDir(fs, tokenId);

        if (!approvedMods.includes(approvingUser)) {
            console.error(
                `Unauthorized token icon ${
                    isRemovalRequest ? 'deny' : 'restore'
                } request for ${tokenId} from telegram user ${approvingUser}`,
            );
            await safeAnswerCallbackQuery(ctx, 'unauthorized user', {
                text: 'You are not authorized to moderate token icons.',
                show_alert: true,
            });
            return;
        }

        const addedBy = modAddedBy(callbackQuery.from);

        // Answer immediately so Telegram does not expire the callback query
        await safeAnswerCallbackQuery(ctx, 'acknowledged', {
            text: `Processing token icon ${isRemovalRequest ? 'deny' : 'restore'} for ${tokenId}`,
        });

        let moderationSucceeded = false;
        if (isRemovalRequest) {
            moderationSucceeded = await denyTokenIcon(
                pool,
                fs,
                tokenId,
                addedBy,
            );
            if (moderationSucceeded) {
                console.log(`${tokenId} added to blacklist by ${addedBy}`);
            } else {
                console.error(`Failed to deny token icon ${tokenId}`);
            }
        } else {
            moderationSucceeded = await restoreTokenIcon(pool, fs, tokenId);
            if (moderationSucceeded) {
                console.log(`${tokenId} removed from blacklist by ${addedBy}`);
            } else {
                console.error(`Failed to restore token icon ${tokenId}`);
            }
        }

        if (!moderationSucceeded) {
            return;
        }

        console.log(
            `Token icon for "${tokenId}" ${
                isRemovalRequest ? `rejected` : `restored`
            } by mod.`,
        );

        let msgChannel = callbackQuery.message?.chat?.id;
        if (typeof msgChannel === 'undefined') {
            msgChannel = callbackQuery.message?.sender_chat?.id;
        }
        if (typeof msgId !== 'undefined' && typeof msgChannel !== 'undefined') {
            try {
                if (isRemovalRequest) {
                    const restoreKeyboard = new InlineKeyboard().text(
                        'Changed your mind? Approve it.',
                        tokenId,
                    );
                    await telegramBot.api.sendMessage(
                        msgChannel,
                        'Icon denied and removed from server',
                        {
                            reply_to_message_id: msgId,
                            reply_markup: restoreKeyboard,
                        },
                    );
                } else {
                    const rejectKeyboard = new InlineKeyboard().text(
                        'Changed your mind? Reject it again.',
                        tokenId,
                    );
                    await telegramBot.api.sendMessage(
                        msgChannel,
                        'Icon un-denied and restored to served endpoint',
                        {
                            reply_to_message_id: msgId,
                            reply_markup: rejectKeyboard,
                        },
                    );
                }
            } catch (err) {
                logTelegramError(
                    `sendMessage after token icon ${
                        isRemovalRequest ? 'deny' : 'restore'
                    } for ${tokenId}`,
                    err,
                );
            }
        } else {
            console.error(
                `Missing Telegram message context for token icon callback on ${tokenId} (msgId=${msgId}, msgChannel=${msgChannel})`,
            );
        }
    });

    const handleModerationCommand = async (
        ctx: Context,
        action: 'deny' | 'restore',
    ): Promise<void> => {
        const message = ctx.message;
        if (!message || !('text' in message)) {
            return;
        }

        const userId = message.from?.id;
        if (typeof userId === 'undefined') {
            return;
        }

        const text = message.text;
        if (typeof text !== 'string') {
            return;
        }

        const tokenId = parseCommandTokenId(text);
        console.log(
            `Telegram /${action} from user ${userId} for tokenId ${tokenId ?? '(missing or invalid)'}`,
        );

        if (!approvedMods.includes(userId)) {
            console.error(
                `Unauthorized /${action} for ${tokenId ?? '(missing)'} from telegram user ${userId}`,
            );
            await ctx.reply('You are not authorized to moderate token icons.');
            return;
        }

        if (!tokenId) {
            await ctx.reply(`Usage: /${action} <tokenId>`);
            return;
        }

        const addedBy = modAddedBy(message.from ?? { id: userId });

        if (action === 'deny') {
            const denied = await denyTokenIcon(pool, fs, tokenId, addedBy);
            if (!denied) {
                await ctx.reply(
                    `Failed to deny ${tokenId}. Icon may not exist on server.`,
                );
                return;
            }
            console.log(`${tokenId} denied by ${addedBy} via /deny`);
            await ctx.reply('Icon denied and removed from server');
            return;
        }

        const restored = await restoreTokenIcon(pool, fs, tokenId);
        if (!restored) {
            await ctx.reply(
                `Failed to restore ${tokenId}. Icon may not be in rejected storage.`,
            );
            return;
        }
        console.log(`${tokenId} restored by ${addedBy} via /restore`);
        await ctx.reply('Icon un-denied and restored to served endpoint');
    };

    telegramBot.command('deny', async ctx => {
        await handleModerationCommand(ctx, 'deny');
    });

    telegramBot.command('restore', async ctx => {
        await handleModerationCommand(ctx, 'restore');
    });

    // Return this bot with event handler
    return telegramBot;
};

/**
 * Clear any webhook before long polling so updates are not split between consumers.
 * @param bot initialized telegram bot
 */
export const prepareTelegramBotForPolling = async (bot: Bot): Promise<void> => {
    try {
        const webhookInfo = await bot.api.getWebhookInfo();
        if (webhookInfo.url) {
            console.warn(
                `Telegram bot has webhook set to ${webhookInfo.url}; clearing it to use polling`,
            );
            await bot.api.deleteWebhook();
        }
    } catch (err) {
        logTelegramError('getWebhookInfo on startup', err);
        throw err;
    }
};

/**
 * Start long polling for Telegram updates.
 * Logs startup failures from the polling loop.
 * @param bot initialized telegram bot
 */
export const startTelegramBotPolling = (bot: Bot): void => {
    bot.start({
        allowed_updates: ['callback_query', 'message'],
        onStart: botInfo => {
            console.log(`Telegram bot @${botInfo.username} started polling`);
        },
    }).catch(err => {
        logTelegramError('polling loop', err);
    });
};

export interface TokenInfo {
    name: string;
    ticker: string;
    decimals: number;
    url: string;
    genesisQty: string;
    tokenId: string;
    minterAddress: string;
    tokenType: string;
    supplyType: string;
}

export interface TokenIconAlertStats {
    tokensMinted: number;
    blacklistedTokens: number;
}

const EXPLORER_BASE_URL = 'https://explorer.e.cash';

/**
 * Escape text for Telegram HTML (parse_mode: 'HTML').
 */
export const escapeTelegramHtml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Abbreviate a minter address for display in Telegram captions.
 */
export const previewMinterAddress = (address: string): string => {
    const addressWithoutPrefix = address.includes(':')
        ? address.split(':')[1]
        : address;

    return `${addressWithoutPrefix.slice(0, 2)}...${addressWithoutPrefix.slice(
        -3,
    )}`;
};

const formatSupplyTypeLabel = (supplyType: string): string => {
    if (supplyType === 'VARIABLE') {
        return 'variable supply';
    }
    if (supplyType === 'FIXED') {
        return 'fixed supply';
    }
    return supplyType.toLowerCase();
};

/**
 * Map protocol token type strings to human-readable labels for Telegram captions.
 */
export const formatTokenTypeLabel = (tokenType: string): string => {
    switch (tokenType) {
        case 'ALP_TOKEN_TYPE_STANDARD':
            return 'ALP';
        case 'SLP_TOKEN_TYPE_FUNGIBLE':
            return 'SLP';
        case 'SLP_TOKEN_TYPE_NFT1_GROUP':
            return 'NFT Group';
        case 'SLP_TOKEN_TYPE_NFT1_CHILD':
            return 'NFT';
        case 'SLP_TOKEN_TYPE_MINT_VAULT':
            return 'Mint Vault';
        default:
            return 'Other';
    }
};

/**
 * Build the Telegram caption for a new token icon moderation alert.
 */
export const buildNewTokenIconCaption = (
    tokenInfo: TokenInfo,
    stats: TokenIconAlertStats,
): string => {
    const { tokenId, name, ticker, minterAddress, tokenType, supplyType } =
        tokenInfo;

    const tokenLine = `<a href="${EXPLORER_BASE_URL}/tx/${tokenId}">${escapeTelegramHtml(name)}</a>${
        ticker !== '' ? ` (${escapeTelegramHtml(ticker)})` : ''
    }`;

    const minterPreview = previewMinterAddress(minterAddress);

    return [
        tokenLine,
        `Minter: <a href="${EXPLORER_BASE_URL}/address/${minterAddress}">${escapeTelegramHtml(minterPreview)}</a>`,
        `${stats.tokensMinted} tokens minted, ${stats.blacklistedTokens} blacklisted`,
        `${escapeTelegramHtml(formatTokenTypeLabel(tokenType))}, ${formatSupplyTypeLabel(supplyType)}`,
        `<code>${tokenId}</code>`,
    ].join('\n');
};

/**
 * Send a msg to the admin when a new token icon is uploaded
 * token icons are auto-approved but may be rejected by a moderator
 * @param bot listening telegram bot
 * @param channel destination channelID for msg
 * @param pool database pool for minter stats
 * @param tokenInfo
 */
export const alertNewTokenIcon = async (
    bot: Bot,
    channel: string,
    pool: Pool,
    tokenInfo: TokenInfo,
) => {
    const { tokenId, minterAddress } = tokenInfo;

    const [tokensMinted, blacklistedTokens] = await Promise.all([
        countTokensByMinterAddress(pool, minterAddress),
        countBlacklistedTokensByMinterAddress(pool, minterAddress),
    ]);

    const caption = buildNewTokenIconCaption(tokenInfo, {
        tokensMinted,
        blacklistedTokens,
    });

    const denyKeyboard = new InlineKeyboard().text('Deny', tokenId);

    return bot.api.sendPhoto(
        channel,
        new InputFile(
            `${config.imageDir}/${
                config.iconSizes[config.iconSizes.length - 1]
            }/${tokenId}.png`,
        ),
        {
            caption,
            parse_mode: 'HTML',
            reply_markup: denyKeyboard,
        },
    );
};
