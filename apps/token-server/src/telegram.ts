// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import TelegramBot, { ParseMode } from 'node-telegram-bot-api';
import config from '../config';

/**
 * telegram.ts
 * Methods for working with a Telegram bot
 * In token-server, the Telegram bot is used to manage token icon rejections and other admin actions
 */

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
    fs: any,
): TelegramBot => {
    // Initialize telegram bot
    const telegramBot = new TelegramBot(botId, {
        polling: true,
    });

    // Add event handler for admin actions
    telegramBot.on('callback_query', function onCallbackQuery(callbackQuery) {
        console.log(JSON.stringify(callbackQuery, null, 2));
        // Get the message ID so the bot can reply to it in the channel
        const msgId = callbackQuery.message?.message_id;

        // Get the tokenId
        const tokenId = callbackQuery.data;

        // Determine the purpose of this callback
        const isRemovalRequest = fs.existsSync(
            `${config.imageDir}/${
                config.iconSizes[config.iconSizes.length - 1]
            }/${tokenId}.png`,
        );

        const approvingUser = callbackQuery.from.id;
        if (!approvedMods.includes(approvingUser)) {
            return console.log(
                `Request to ${
                    isRemovalRequest ? `delete` : `restore`
                } tokenIcon for ${tokenId} came from unauthorized telegram user ${approvingUser}, ignoring.`,
            );
        }

        if (isRemovalRequest) {
            // If this is a removal request, move all sizes to rejected dir
            for (const size of config.iconSizes) {
                fs.renameSync(
                    `${config.imageDir}/${size}/${tokenId}.png`,
                    `${config.rejectedDir}/${size}/${tokenId}.png`,
                );
            }
        } else {
            // Else we are restoring them
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
                telegramBot.sendMessage(
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
                telegramBot.sendMessage(
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
        return telegramBot.answerCallbackQuery(callbackQuery.id, {
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
    initialQty: string;
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
    bot: TelegramBot,
    channel: string,
    tokenInfo: TokenInfo,
) => {
    const { tokenId, name, ticker } = tokenInfo;

    // Tg msg markdown
    const msg =
        `${name} (${ticker})\n\n` +
        `[Explorer](https://explorer.e.cash/tx/${tokenId})`;

    let options = {
        caption: msg,
        parse_mode: 'Markdown' as ParseMode,
        reply_markup: {
            inline_keyboard: [[{ text: 'Deny', callback_data: tokenId }]],
        },
    };

    return bot.sendPhoto(
        channel,
        `${config.imageDir}/${
            config.iconSizes[config.iconSizes.length - 1]
        }/${tokenId}.png`,
        options,
    );
};
