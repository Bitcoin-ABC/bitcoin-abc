// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const axios = require('axios');
const cashaddr = require('ecashaddrjs');
const {
    parseBlockTxs,
    getBlockTgMessage,
    getMinerFromCoinbaseTx,
    getStakerFromCoinbaseTx,
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
    getBlocksAgoFromChaintipByTimestamp,
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

        const stakingRewardWinner = getStakerFromCoinbaseTx(
            blockHeight,
            coinbaseData.outputs,
        );
        let stakingRewardWinnerAddress = 'unknown';
        if (stakingRewardWinner !== false) {
            try {
                stakingRewardWinnerAddress = cashaddr.encodeOutputScript(
                    stakingRewardWinner.staker,
                );
            } catch (err) {
                // Use the script
                stakingRewardWinnerAddress = `script ${stakingRewardWinner.staker}`;
            }
        }

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
            `Staking reward winner: ${stakingRewardWinnerAddress}\n` +
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
    handleUtcMidnight: async function (chronik, telegramBot, channelId) {
        // It is a new day
        // Send the daily summary

        // Get a datestring
        // e.g. Wed Oct 23 2024
        const dateString = new Date().toDateString();

        // Get timestamp for UTC midnight
        // Will always be divisible by 1000 as will always be a midnight UTC date
        const MS_PER_S = 1000;
        const newDayTimestamp = new Date(dateString).getTime() / MS_PER_S;

        const SECONDS_PER_DAY = 86400;

        const { startBlockheight, chaintip } =
            await getBlocksAgoFromChaintipByTimestamp(
                chronik,
                newDayTimestamp,
                SECONDS_PER_DAY,
            );

        const getAllBlockTxPromises = [];
        for (let i = startBlockheight; i <= chaintip; i += 1) {
            getAllBlockTxPromises.push(getAllBlockTxs(chronik, i));
        }

        const allBlockTxs = (await Promise.all(getAllBlockTxPromises)).flat();

        // We only want txs in the specified window
        // NB coinbase txs have timeFirstSeen of 0. We include all of them as the block
        // timestamps are in the window
        const timeFirstSeenTxs = allBlockTxs.filter(
            tx =>
                (tx.timeFirstSeen > newDayTimestamp - SECONDS_PER_DAY &&
                    tx.timeFirstSeen <= newDayTimestamp) ||
                tx.isCoinbase,
        );

        // Get tokenIds of all tokens seen in this batch of txs
        const tokensToday = new Set();
        for (const tx of timeFirstSeenTxs) {
            const { tokenEntries } = tx;
            for (const tokenEntry of tokenEntries) {
                const { tokenId, groupTokenId } = tokenEntry;
                tokensToday.add(tokenId);
                if (typeof groupTokenId !== 'undefined') {
                    // We want the groupTokenId info even if we only have child txs in this window
                    tokensToday.add(groupTokenId);
                }
            }
        }
        // Get all the token info of tokens from today
        const tokenInfoMap = await getTokenInfoMap(chronik, tokensToday);

        // Get XEC price and market info
        let priceInfo;
        try {
            priceInfo = (
                await axios.get(
                    `https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
                )
            ).data.ecash;
        } catch (err) {
            console.error(`Error getting daily summary price info`, err);
        }

        const dailySummaryTgMsgs = summarizeTxHistory(
            newDayTimestamp,
            timeFirstSeenTxs,
            tokenInfoMap,
            priceInfo,
        );

        // Send msg with successful price API call
        await sendBlockSummary(
            dailySummaryTgMsgs,
            telegramBot,
            channelId,
            'daily',
        );
    },
};
