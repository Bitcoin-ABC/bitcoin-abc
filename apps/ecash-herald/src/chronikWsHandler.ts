// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, WsEndpoint, WsMsgClient } from 'chronik-client';
import { handleBlockFinalized, handleBlockInvalidated } from './events';
import TelegramBot from 'node-telegram-bot-api';
import { MemoryCache } from 'cache-manager';
import { MockTelegramBot } from '../test/mocks/telegramBotMock';

export const parseWebsocketMessage = async (
    chronik: ChronikClient,
    wsMsg: WsMsgClient,
    telegramBot: TelegramBot | MockTelegramBot,
    channelId: string,
    memoryCache: MemoryCache,
) => {
    // Get height and msg type
    // Note 1: herald only subscribes to blocks, so only MsgBlockClient is expected here
    // Note 2: blockTimestamp and coinbaseData might be undefined, they are
    //         introduced in chronik v0.30.0 and client version 1.3.0

    const { type } = wsMsg;
    if (type === 'Error') {
        // Do nothing on ws error msgs
        return false;
    }
    const { msgType } = wsMsg;

    switch (msgType) {
        case 'BLK_FINALIZED': {
            const { blockHeight, blockHash } = wsMsg;
            return handleBlockFinalized(
                chronik,
                telegramBot,
                channelId,
                blockHash,
                blockHeight,
                memoryCache,
            );
        }
        case 'BLK_INVALIDATED': {
            // coinbaseData is defined for BLK_INVALIDATED
            const { blockHeight, blockHash, blockTimestamp, coinbaseData } =
                wsMsg;
            return handleBlockInvalidated(
                chronik,
                telegramBot,
                channelId,
                blockHash,
                blockHeight,
                blockTimestamp,
                coinbaseData!,
                memoryCache,
            );
        }
        default:
            // Do nothing for other events
            return false;
    }
};

export const initializeWebsocket = async (
    chronik: ChronikClient,
    telegramBot: TelegramBot | MockTelegramBot,
    channelId: string,
    memoryCache: MemoryCache,
): Promise<WsEndpoint> => {
    // Subscribe to chronik websocket
    const ws = chronik.ws({
        onMessage: async msg => {
            await parseWebsocketMessage(
                chronik,
                msg,
                telegramBot,
                channelId,
                memoryCache,
            );
        },
    });
    // Wait for WS to be connected:
    await ws.waitForOpen();
    console.log(`Listening for chronik block msgs`);
    // Subscribe to blocks
    ws.subscribeToBlocks();
    return ws;
};
