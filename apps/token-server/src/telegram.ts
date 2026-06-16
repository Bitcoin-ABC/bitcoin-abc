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
import { insertBlacklistEntry, removeBlacklistEntry } from './db';
import { existsSync, renameSync } from 'fs';
import { IFs } from 'memfs';

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
interface FsLikeTg {
    existsSync: typeof existsSync;
    renameSync: typeof renameSync;
}

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

        const isRemovalRequest = fs.existsSync(
            `${config.imageDir}/${
                config.iconSizes[config.iconSizes.length - 1]
            }/${tokenId}.png`,
        );

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

        const addedBy =
            typeof callbackQuery.from.username !== 'undefined'
                ? callbackQuery.from.username
                : approvingUser.toString();

        // Answer immediately so Telegram does not expire the callback query
        await safeAnswerCallbackQuery(ctx, 'acknowledged', {
            text: `Processing token icon ${isRemovalRequest ? 'deny' : 'restore'} for ${tokenId}`,
        });

        try {
            if (isRemovalRequest) {
                const blacklistMetadata = {
                    reason: 'report from icon archon',
                    timestamp: Math.round(new Date().getTime() / 1000),
                    addedBy,
                };

                try {
                    await insertBlacklistEntry(
                        pool,
                        tokenId,
                        blacklistMetadata,
                    );
                    console.log(`${tokenId} added to blacklist by ${addedBy}`);
                } catch (err) {
                    console.error(`Error adding ${tokenId} to blacklist`, err);
                }

                for (const size of config.iconSizes) {
                    const sourcePath = `${config.imageDir}/${size}/${tokenId}.png`;
                    const destPath = `${config.rejectedDir}/${size}/${tokenId}.png`;
                    try {
                        fs.renameSync(sourcePath, destPath);
                    } catch (err) {
                        console.error(
                            `Error moving token icon from ${sourcePath} to ${destPath}`,
                            err,
                        );
                        throw err;
                    }
                }
            } else {
                try {
                    await removeBlacklistEntry(pool, tokenId);
                    console.log(
                        `${tokenId} removed from blacklist by ${addedBy}`,
                    );
                } catch (err) {
                    console.error(
                        `Error removing ${tokenId} from blacklist`,
                        err,
                    );
                }

                for (const size of config.iconSizes) {
                    const sourcePath = `${config.rejectedDir}/${size}/${tokenId}.png`;
                    const destPath = `${config.imageDir}/${size}/${tokenId}.png`;
                    try {
                        fs.renameSync(sourcePath, destPath);
                    } catch (err) {
                        console.error(
                            `Error moving token icon from ${sourcePath} to ${destPath}`,
                            err,
                        );
                        throw err;
                    }
                }
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
            if (
                typeof msgId !== 'undefined' &&
                typeof msgChannel !== 'undefined'
            ) {
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
        } catch (err) {
            logTelegramError(
                `token icon ${isRemovalRequest ? 'deny' : 'restore'} for ${tokenId}`,
                err,
            );
        }
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

interface TokenInfo {
    name: string;
    ticker: string;
    decimals: number;
    url: string;
    genesisQty: string;
    tokenId: string;
}

/**
 * Send a msg to the admin when a new token icon is uploaded
 * token icons are auto-approved but may be rejected by a moderator
 * @param bot listening telegram bot
 * @param channel destination channelID for msg
 * @param tokenInfo
 */
export const alertNewTokenIcon = async (
    bot: Bot,
    channel: string,
    tokenInfo: TokenInfo,
) => {
    const { tokenId, name, ticker } = tokenInfo;

    // Tg msg markdown
    // TODO add token type (may need to pass more info from Cashtab)
    const msg = `[${name}](https://explorer.e.cash/tx/${tokenId})${
        ticker !== '' ? ` (${ticker})` : ''
    }`;

    const denyKeyboard = new InlineKeyboard().text('Deny', tokenId);

    return bot.api.sendPhoto(
        channel,
        new InputFile(
            `${config.imageDir}/${
                config.iconSizes[config.iconSizes.length - 1]
            }/${tokenId}.png`,
        ),
        {
            caption: msg,
            parse_mode: 'Markdown',
            reply_markup: denyKeyboard,
        },
    );
};
