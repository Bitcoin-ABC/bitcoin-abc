// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const { parseBlockTxs, getBlockTgMessage } = require('./parse');
const { getCoingeckoPrices } = require('./utils');
const { sendBlockSummary } = require('./telegram');
const {
    getTokenInfoMap,
    getOutputscriptInfoMap,
    getAllBlockTxs,
} = require('./chronik');

module.exports = {
    /**
     * Callback function for a new finalized block on the eCash blockchain
     * Summarize on-chain activity in this block
     * @param {ChronikClient} chronik
     * @param {object} telegramBot A connected telegramBot instance
     * @param {number} channelId The channel ID where the telegram msg(s) will be sent
     * @param {number} height blockheight
     * @param {boolean} returnMocks If true, return mocks for unit tests
     * @param {object} memoryCache
     */
    handleBlockFinalized: async function (
        chronik,
        telegramBot,
        channelId,
        blockHash,
        blockHeight,
        memoryCache,
        returnMocks = false,
    ) {
        // Set to cache that this block has finalized
        // This will call off the "Block not confirmed by avalanche" msg
        await memoryCache.set(`${blockHeight}${blockHash}`, 'BLK_FINALIZED');
        // Get block txs
        // TODO blockTxs are paginated, need a function to get them all
        let blockTxs;
        try {
            blockTxs = await getAllBlockTxs(chronik, blockHeight);
        } catch (err) {
            console.log(`Error in getAllBlockTxs(${blockHeight})`, err);

            // Default Telegram message if chronik API error
            const errorTgMsg =
                `New Block Found\n` +
                `\n` +
                `${blockHeight.toLocaleString('en-US')}\n` +
                `\n` +
                `${blockHash}\n` +
                `\n` +
                `<a href="${config.blockExplorer}/block/${blockHash}">explorer</a>`;

            try {
                return await telegramBot.sendMessage(
                    channelId,
                    errorTgMsg,
                    config.tgMsgOptions,
                );
            } catch (err) {
                console.log(
                    `Error in telegramBot.sendMessage(channelId=${channelId}, msg=${errorTgMsg}, options=${config.tgMsgOptions})`,
                    err,
                );
                return false;
            }
        }

        const parsedBlock = parseBlockTxs(blockHash, blockHeight, blockTxs);

        // Get token genesis info for token IDs in this block
        const { tokenIds, outputScripts } = parsedBlock;

        const tokenInfoMap = await getTokenInfoMap(chronik, tokenIds);

        const outputScriptInfoMap = await getOutputscriptInfoMap(
            chronik,
            outputScripts,
        );

        // Get price info for tg msg, if available
        const { coingeckoResponse, coingeckoPrices } = await getCoingeckoPrices(
            config.priceApi,
        );
        const blockSummaryTgMsgs = getBlockTgMessage(
            parsedBlock,
            coingeckoPrices,
            tokenInfoMap,
            outputScriptInfoMap,
        );

        // returnMocks is used in the script function generateMocks
        // Using it as a flag here ensures the script is always using the same function
        // as the app
        if (returnMocks) {
            // Note you need coingeckoResponse so you can mock the axios response for coingecko
            return {
                blockTxs,
                parsedBlock,
                coingeckoResponse,
                coingeckoPrices,
                tokenInfoMap,
                outputScriptInfoMap,
                blockSummaryTgMsgs,
                blockSummaryTgMsgsApiFailure: getBlockTgMessage(
                    parsedBlock,
                    false, // failed coingecko price lookup
                    false, // failed chronik token ID lookup
                ),
            };
        }

        // Broadcast block summary telegram message(s)
        return await sendBlockSummary(
            blockSummaryTgMsgs,
            telegramBot,
            channelId,
            blockHeight,
        );
    },
    /**
     * Handle block connected event
     * @param {object} telegramBot
     * @param {string} channelId
     * @param {string} blockHash
     * @param {number} blockHeight
     * @param {object} memoryCache
     */
    handleBlockConnected: async function (
        telegramBot,
        channelId,
        blockHash,
        blockHeight,
        memoryCache,
    ) {
        // Set to cache that this block has connected
        await memoryCache.set(`${blockHeight}${blockHash}`, 'BLK_CONNECTED');

        await new Promise(resolve =>
            setTimeout(resolve, config.waitForFinalizationMsecs),
        );

        const cacheStatusAfterFinalizationWait = await memoryCache.get(
            `${blockHeight}${blockHash}`,
        );

        if (cacheStatusAfterFinalizationWait === 'BLK_FINALIZED') {
            // If the block in finalized by now, take no action
            return;
        }

        console.log(
            `Block ${blockHeight} not finalized after ${
                config.waitForFinalizationMsecs / 1000
            }s.`,
        );
        // Default Telegram message if chronik API error
        const errorTgMsg =
            `Block connected, but not finalized by Avalanche after ${
                config.waitForFinalizationMsecs / 1000
            }s\n` +
            `\n` +
            `${blockHeight.toLocaleString('en-US')}\n` +
            `\n` +
            `${blockHash}`;

        try {
            return await telegramBot.sendMessage(
                channelId,
                errorTgMsg,
                config.tgMsgOptions,
            );
        } catch (err) {
            console.log(
                `Error in telegramBot.sendMessage(channelId=${channelId}, msg=${errorTgMsg}, options=${config.tgMsgOptions})`,
                err,
            );
        }
    },
};
