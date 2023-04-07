// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('./config');
const { ChronikClient } = require('chronik-client');
// Initialize chronik on app startup
const chronik = new ChronikClient(config.chronik);
// Initialize telegram bot on app startup
const { telegramBot, channelId } = require('./src/telegram');
const { main } = require('./src/main');

main(chronik, config.ifpAddress, telegramBot, channelId);
