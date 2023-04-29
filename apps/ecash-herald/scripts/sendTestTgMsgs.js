// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* sendTestTgMsgs.js
 *
 * npm run sendTestTgMsgs
 * Send telegram messages of all tested blocks to your dev channel
 * specified in secrets.js
 */

'use strict';
const { sendBlockSummary } = require('../src/telegram');
const secrets = require('../secrets');
const TelegramBot = require('node-telegram-bot-api');
const { dev } = secrets;
const { botId, channelId } = dev.telegram;
// Create a bot that uses 'polling' to fetch new updates
const telegramBotDev = new TelegramBot(botId, { polling: true });

const blocks = require('../test/mocks/blocks');
function returnSendBlockSummaryPromise(tgMsgStrings, telegramBot, channelId) {
    return new Promise((resolve, reject) => {
        sendBlockSummary(tgMsgStrings, telegramBot, channelId).then(
            result => {
                resolve(result);
            },
            err => {
                reject(err);
            },
        );
    });
}
async function sendTestTgMsgs() {
    // Build array of promises from all block mock tg msgs
    const testTgMsgPromises = [];
    for (let i in blocks) {
        const thisBlock = blocks[i];
        const { blockSummaryTgMsgs } = thisBlock;

        testTgMsgPromises.push(
            returnSendBlockSummaryPromise(
                blockSummaryTgMsgs,
                telegramBotDev,
                channelId,
            ),
        );
    }

    // Send 'em
    let testTgMsgsSuccess;
    try {
        testTgMsgsSuccess = await Promise.all(testTgMsgPromises);
        console.log(
            '\x1b[32m%s\x1b[0m',
            `✔ Sent ${testTgMsgsSuccess.length} telegram messages to ${testTgMsgsSuccess[0][0].chat.title}`,
        );

        // Exit in success condition
        process.exit(0);
    } catch (err) {
        console.log(
            '\x1b[31m%s\x1b[0m',
            `Error sending test Telegram messages`,
            err,
        );
        // Exit in error condition
        process.exit(1);
    }
}

sendTestTgMsgs();
