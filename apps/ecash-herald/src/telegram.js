// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const secrets = require('../secrets');
const TelegramBot = require('node-telegram-bot-api');

const { botId, channelId } = secrets.prod.telegram;
// Create a bot that uses 'polling' to fetch new updates
const telegramBot = new TelegramBot(botId, { polling: true });

module.exports = {
    telegramBot,
    channelId,
};
