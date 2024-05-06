// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const config = require('../config');
const { parseBlock, getBlockTgMessage } = require('./parse');
const { getCoingeckoPrices } = require('./utils');
const { sendBlockSummary } = require('./telegram');
const { getTokenInfoMap, getOutputscriptInfoMap } = require('./chronik');

module.exports = {
    handleBlockConnected: async function (
        chronik,
        telegramBot,
        channelId,
        blockHash,
        returnMocks = false,
    ) {
        /* BlockConnected callback
         * Get block details of blockhash from chronik
         * Parse block details for information interesting in a telegram msg with parseBlock()
         * Process parsedBlock into an HTML formatted telegram message with getBlockTgMessage()
         * Send your Telegram msg
         */

        // Get some info about this block
        let blockDetails = false;
        let blockheight;
        try {
            blockDetails = await chronik.block(blockHash);
            // See blocks.js 'blockDetails' objects for shape of chronik.block return object
            blockheight = blockDetails.blockInfo.height;
        } catch (err) {
            console.log(`Error in chronik.block(${blockHash})`, err);
        }

        // If you can't get blockDetails from chronik,
        // send a Telegram msg with only the block hash
        if (!blockDetails) {
            // Default Telegram message if error getting block details
            const errorTgMsg =
                `New Block Found\n` +
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

        const parsedBlock = parseBlock(blockDetails);
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
                blockDetails,
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
            blockheight,
        );
    },
};
