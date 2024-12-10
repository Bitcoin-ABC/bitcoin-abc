// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from '../config';
import { caching } from 'cache-manager';
import { initializeWebsocket } from './chronikWsHandler';
import { ChronikClient } from 'chronik-client';
import TelegramBot from 'node-telegram-bot-api';
import { MockTelegramBot } from '../test/mocks/telegramBotMock';

export const main = async (
    chronik: ChronikClient,
    telegramBot: TelegramBot | MockTelegramBot,
    telegramChannelId: string,
) => {
    // Initialize a cache
    // Store data for config.cacheTtlMsecs
    // We need to have staking reward data for the next block, which could be
    // more than 10 minutes out pre-heartbeat
    const CACHE_TTL = config.cacheTtlMsecs;
    const memoryCache = await caching('memory', {
        max: 100,
        ttl: CACHE_TTL,
    });
    // Initialize websocket connection
    try {
        return await initializeWebsocket(
            chronik,
            telegramBot,
            telegramChannelId,
            memoryCache,
        );
    } catch (err) {
        console.log(
            `Error initializing ecash-herald websocket connection`,
            err,
        );
        console.log(`Failed to start ecash-herald.`);
        return err;
    }
};
