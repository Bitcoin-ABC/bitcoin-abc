// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const {
    parseBlockTxs,
    getBlockTgMessage,
    getMinerFromCoinbaseTx,
    guessRejectReason,
    summarizeTxHistory,
} = require('./parse');
const {
    getCoingeckoPrices,
    jsonReviver,
    getNextStakingReward,
} = require('./utils');
const { sendBlockSummary } = require('./telegram');
const {
    getTokenInfoMap,
    getOutputscriptInfoMap,
    getAllBlockTxs,
} = require('./chronik');
const knownMinersJson = require('../constants/miners');

const miners = JSON.parse(JSON.stringify(knownMinersJson), jsonReviver);

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
                    `Error in telegramBot.sendMessage(channelId=${channelId}, msg=${errorTgMsg}, options=${config.tgMsgOptions}) called from handleBlockFinalized`,
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

        // Send a daily summary every 144 blocks
        const BLOCKS_PER_DAY = 144;
        if (blockHeight % BLOCKS_PER_DAY === 0) {
            // If this block is a multiple of 144

            const startHeight = blockHeight - BLOCKS_PER_DAY;

            const getAllBlockTxPromises = [];
            for (let i = 1; i <= BLOCKS_PER_DAY; i += 1) {
                getAllBlockTxPromises.push(
                    getAllBlockTxs(chronik, startHeight + i),
                );
            }

            const allBlockTxs = (
                await Promise.all(getAllBlockTxPromises)
            ).flat();

            // Get XEC price
            let price;
            if (typeof coingeckoPrices !== 'undefined') {
                price = coingeckoPrices[0].price;
            }

            const dailySummaryTgMsgs = summarizeTxHistory(
                blockHeight,
                allBlockTxs,
                price,
            );

            // Send msg with successful price API call
            await sendBlockSummary(
                dailySummaryTgMsgs,
                telegramBot,
                channelId,
                'daily',
            );
        }
        if (returnMocks) {
            // returnMocks is used in the script function generateMocks
            // Using it as a flag here ensures the script is always using the same function
            // as the app
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

        // Don't await, this can take some time to complete due to remote
        // caching.
        getNextStakingReward(blockHeight + 1, memoryCache);

        // Broadcast block summary telegram message(s)
        return await sendBlockSummary(
            blockSummaryTgMsgs,
            telegramBot,
            channelId,
            blockHeight,
        );
    },
    /**
     * Handle block invalidated event
     * @param {ChronikClient} chronik
     * @param {object} telegramBot
     * @param {string} channelId
     * @param {string} blockHash
     * @param {number} blockHeight
     * @param {number} blockTimestamp
     * @param {object} coinbaseData
     * @param {object} memoryCache
     */
    handleBlockInvalidated: async function (
        chronik,
        telegramBot,
        channelId,
        blockHash,
        blockHeight,
        blockTimestamp,
        coinbaseData,
        memoryCache,
    ) {
        const miner = getMinerFromCoinbaseTx(
            coinbaseData.scriptsig,
            coinbaseData.outputs,
            miners,
        );

        const reason = await guessRejectReason(
            chronik,
            blockHeight,
            coinbaseData,
            memoryCache,
        );

        const errorTgMsg =
            `Block invalidated by avalanche\n` +
            `\n` +
            `Height: ${blockHeight.toLocaleString('en-US')}\n` +
            `\n` +
            `Hash: ${blockHash}` +
            `\n` +
            `Timestamp: ${blockTimestamp}\n` +
            `Mined by ${miner}\n` +
            `Guessed reject reason: ${reason}`;

        try {
            return await telegramBot.sendMessage(
                channelId,
                errorTgMsg,
                config.tgMsgOptions,
            );
        } catch (err) {
            console.log(
                `Error in telegramBot.sendMessage(channelId=${channelId}, msg=${errorTgMsg}, options=${config.tgMsgOptions}) called from handleBlockInvalidated`,
                err,
            );
        }
    },
};
