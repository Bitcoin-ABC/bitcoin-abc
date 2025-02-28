// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from '../config';
import secrets from '../secrets';
import axios from 'axios';
import { encodeOutputScript } from 'ecashaddrjs';
import {
    parseBlockTxs,
    getBlockTgMessage,
    getMinerFromCoinbaseTx,
    getStakerFromCoinbaseTx,
    guessRejectReason,
    summarizeTxHistory,
    HeraldParsedBlock,
} from './parse';
import {
    getCoingeckoPrices,
    jsonReviver,
    getNextStakingReward,
    CoinGeckoPrice,
    CoinGeckoResponse,
} from './utils';
import { sendBlockSummary } from './telegram';
import {
    getTokenInfoMap,
    getOutputscriptInfoMap,
    getAllBlockTxs,
    getBlocksAgoFromChaintipByTimestamp,
    OutputscriptInfo,
} from './chronik';
import knownMinersJson from '../constants/miners';
import { ChronikClient, CoinbaseData, Tx, GenesisInfo } from 'chronik-client';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { MemoryCache } from 'cache-manager';
import { MockTelegramBot } from '../test/mocks/telegramBotMock';

const miners = JSON.parse(JSON.stringify(knownMinersJson), jsonReviver);

// This is expected for TelegramBot.sendMessage but is not available in its types
// Based on Telegram API docs
export interface SendMessageResponse {
    message_id: number;
    from: {
        id: number;
        is_bot: boolean;
        first_name: string;
        username: string;
    };
    chat: {
        id: number;
        first_name: string;
        username: string;
        type: 'private';
    };
    date: number;
    text: string;
}

export interface StoredMock {
    blockTxs: Tx[];
    parsedBlock: HeraldParsedBlock;
    coingeckoResponse: CoinGeckoResponse;
    activeStakers?: CoinDanceStaker[];
    coingeckoPrices: CoinGeckoPrice[];
    tokenInfoMap: Map<string, GenesisInfo>;
    outputScriptInfoMap: Map<string, OutputscriptInfo>;
    blockSummaryTgMsgs: string[];
    blockSummaryTgMsgsApiFailure: string[];
}

export interface CoinDanceStaker {
    proof: string;
    stake: string;
    creationTimeStamp: string;
    payoutAddress: string;
}

/**
 * Callback function for a new finalized block on the eCash blockchain
 * Summarize on-chain activity in this block
 * @param chronik
 * @param telegramBot A connected telegramBot instance
 * @param channelId The channel ID where the telegram msg(s) will be sent
 * @param height blockheight
 * @param returnMocks If true, return mocks for unit tests
 * @param memoryCache
 */
export const handleBlockFinalized = async (
    chronik: ChronikClient,
    telegramBot: TelegramBot | MockTelegramBot,
    channelId: string,
    blockHash: string,
    blockHeight: number,
    memoryCache: MemoryCache,
    returnMocks = false,
): Promise<
    | StoredMock
    | Message
    | SendMessageResponse
    | boolean
    | (Message | SendMessageResponse)[]
> => {
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
            return (await telegramBot.sendMessage(
                channelId,
                errorTgMsg,
                config.tgMsgOptions,
            )) as Message | SendMessageResponse;
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
    const resp = await getCoingeckoPrices(config.priceApi);
    const coingeckoPrices = resp !== false ? resp.coingeckoPrices : false;
    const coingeckoResponse = resp !== false ? resp.coingeckoResponse : false;

    const { staker } = parsedBlock;
    let activeStakers: CoinDanceStaker[] | undefined;
    if (staker !== false) {
        // If we have a staker, get more info from API
        try {
            activeStakers = (
                await axios.get(
                    `https://coin.dance/api/stakers/${secrets.prod.stakerApiKey}`,
                )
            ).data;
        } catch (err) {
            console.error(`Error getting activeStakers`, err);
            // Do not include this info in the tg msg
        }
    }

    const blockSummaryTgMsgs = getBlockTgMessage(
        parsedBlock,
        coingeckoPrices,
        tokenInfoMap,
        outputScriptInfoMap,
        activeStakers,
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
            activeStakers,
            coingeckoPrices,
            tokenInfoMap,
            outputScriptInfoMap,
            blockSummaryTgMsgs,
            blockSummaryTgMsgsApiFailure: getBlockTgMessage(
                parsedBlock,
                false, // failed coingecko price lookup
                false, // failed chronik token ID lookup
                false, // failed balances lookup for output scripts
                undefined, // no activeStakers
            ),
        } as StoredMock;
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
};
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
export const handleBlockInvalidated = async (
    chronik: ChronikClient,
    telegramBot: TelegramBot | MockTelegramBot,
    channelId: string,
    blockHash: string,
    blockHeight: number,
    blockTimestamp: number,
    coinbaseData: CoinbaseData,
    memoryCache: MemoryCache,
) => {
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
            stakingRewardWinnerAddress = encodeOutputScript(
                stakingRewardWinner.staker,
            );
        } catch {
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
};

export const handleUtcMidnight = async (
    chronik: ChronikClient,
    telegramBot: TelegramBot,
    channelId: string,
    secondChannelId?: string,
) => {
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
        (tx: Tx) =>
            (tx.timeFirstSeen > newDayTimestamp - SECONDS_PER_DAY &&
                tx.timeFirstSeen <= newDayTimestamp) ||
            tx.isCoinbase,
    );

    // Get tokenIds of all tokens seen in this batch of txs
    const tokensToday: Set<string> = new Set();
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

    let activeStakers: CoinDanceStaker[] | undefined;
    // If we have a staker, get more info from API
    try {
        activeStakers = (
            await axios.get(
                `https://coin.dance/api/stakers/${secrets.prod.stakerApiKey}`,
            )
        ).data;
    } catch (err) {
        console.error(`Error getting activeStakers`, err);
        // Do not include this info in the tg msg
    }

    const AGORA_TOKENS_MAX_RENDER = 3;
    const NON_AGORA_TOKENS_MAX_RENDER = 0;
    const dailySummaryTgMsgs = summarizeTxHistory(
        newDayTimestamp,
        timeFirstSeenTxs,
        tokenInfoMap,
        AGORA_TOKENS_MAX_RENDER,
        NON_AGORA_TOKENS_MAX_RENDER,
        priceInfo,
        activeStakers,
    );

    // Send msg with successful price API call
    await sendBlockSummary(dailySummaryTgMsgs, telegramBot, channelId, 'daily');

    if (typeof secondChannelId !== 'undefined') {
        // Send to another channel if we got it
        await sendBlockSummary(
            dailySummaryTgMsgs,
            telegramBot,
            secondChannelId,
            'daily',
        );
    }
};
