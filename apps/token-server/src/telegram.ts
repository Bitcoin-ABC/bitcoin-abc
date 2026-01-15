// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Bot, GrammyError, HttpError, InputFile } from 'grammy';
import config from '../config';
import { Db } from 'mongodb';
import { insertBlacklistEntry, removeBlacklistEntry } from './db';
import { existsSync, renameSync } from 'fs';
import { IFs } from 'memfs';

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
    db: Db,
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
        console.error(`Error while handling update ${ctx.update.update_id}:`);
        const e = err.error;
        if (e instanceof GrammyError) {
            console.error('Error in request:', e.description);
        } else if (e instanceof HttpError) {
            console.error('Could not contact Telegram:', e);
        } else {
            console.error('Unknown error:', e);
        }
    });

    // Add event handler for admin actions
    telegramBot.on('callback_query:data', async ctx => {
        const callbackQuery = ctx.callbackQuery;
        console.log(JSON.stringify(callbackQuery, null, 2));
        // Get the message ID so the bot can reply to it in the channel
        const msgId = callbackQuery.message?.message_id;

        // Get the tokenId
        const tokenId = callbackQuery.data;

        if (!tokenId || typeof tokenId !== 'string') {
            return;
        }

        // Determine the purpose of this callback
        const isRemovalRequest = fs.existsSync(
            `${config.imageDir}/${
                config.iconSizes[config.iconSizes.length - 1]
            }/${tokenId}.png`,
        );

        const approvingUser = callbackQuery.from.id;
        if (!approvedMods.includes(approvingUser)) {
            console.log(
                `Request to ${
                    isRemovalRequest ? `delete` : `restore`
                } tokenIcon for ${tokenId} came from unauthorized telegram user ${approvingUser}, ignoring.`,
            );
            return;
        }

        // Mod taking this action
        const addedBy =
            typeof callbackQuery.from.username !== 'undefined'
                ? callbackQuery.from.username
                : approvingUser.toString();

        if (isRemovalRequest) {
            // isRemovalRequest
            // We remove token icons
            // We add this tokenId to the blacklist

            // Build blacklist metadata
            const blacklistMetadata = {
                reason: 'report from icon archon',
                timestamp: Math.round(new Date().getTime() / 1000),
                addedBy,
            };

            // Add this tokenId to blacklist
            try {
                await insertBlacklistEntry(db, tokenId, blacklistMetadata);
                console.log(`${tokenId} added to blacklist by ${addedBy}`);
            } catch (err) {
                console.error(`Error adding ${tokenId} to blacklist`, err);
            }

            // move token icons of all sizes to rejected dir
            for (const size of config.iconSizes) {
                fs.renameSync(
                    `${config.imageDir}/${size}/${tokenId}.png`,
                    `${config.rejectedDir}/${size}/${tokenId}.png`,
                );
            }
        } else {
            // !isRemovalRequest
            // We restore token icons
            // We remove this tokenId from the blacklist

            // Remove this tokenId from blacklist
            try {
                await removeBlacklistEntry(db, tokenId);
                console.log(`${tokenId} removed from blacklist by ${addedBy}`);
            } catch (err) {
                console.error(`Error removing ${tokenId} from blacklist`, err);
            }

            for (const size of config.iconSizes) {
                fs.renameSync(
                    `${config.rejectedDir}/${size}/${tokenId}.png`,
                    `${config.imageDir}/${size}/${tokenId}.png`,
                );
            }
        }

        console.log(
            `Token icon for "${tokenId}" ${
                isRemovalRequest ? `rejected` : `restored`
            } by mod.`,
        );

        // Reply to the original tg msg
        // Get msgChannel from a chat
        let msgChannel = callbackQuery.message?.chat?.id;
        // If undefined, get msgChannel from a channel
        if (typeof msgChannel === 'undefined') {
            msgChannel = callbackQuery.message?.sender_chat?.id;
        }
        if (typeof msgId !== 'undefined' && typeof msgChannel !== 'undefined') {
            if (isRemovalRequest) {
                await telegramBot.api.sendMessage(
                    msgChannel,
                    'Icon denied and removed from server',
                    {
                        reply_to_message_id: msgId,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Changed your mind? Approve it.',
                                        callback_data: tokenId,
                                    },
                                ],
                            ],
                        },
                    },
                );
            } else {
                await telegramBot.api.sendMessage(
                    msgChannel,
                    'Icon un-denied and restored to served endpoint',
                    {
                        reply_to_message_id: msgId,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Changed your mind? Reject it again.',
                                        callback_data: tokenId,
                                    },
                                ],
                            ],
                        },
                    },
                );
            }
        }
        await ctx.answerCallbackQuery({
            text: `Token icons for ${tokenId} ${
                isRemovalRequest ? `removed from ` : `restored to `
            } server`,
        });
    });

    // Return this bot with event handler
    return telegramBot;
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
            reply_markup: {
                inline_keyboard: [[{ text: 'Deny', callback_data: tokenId }]],
            },
        },
    );
};
