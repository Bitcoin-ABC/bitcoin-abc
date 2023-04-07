// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const config = require('../config');
const { parseBlock, getBlockTgMessage } = require('./parse');
module.exports = {
    handleBlockConnected: async function (
        chronik,
        telegramBot,
        channelId,
        blockHash,
    ) {
        /* BlockConnected callback
         * Get block details of blockhash from chronik
         * Parse block details for information interesting in a telegram msg with parseBlock()
         * Process parsedBlock into an HTML formatted telegram message with getBlockTgMessage()
         * Send your Telegram msg
         */

        // Get some info about this block
        let blockDetails = false;
        try {
            blockDetails = await chronik.block(blockHash);
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
        const tgMsg = getBlockTgMessage(parsedBlock);

        try {
            return await telegramBot.sendMessage(
                channelId,
                tgMsg,
                config.tgMsgOptions,
            );
        } catch (err) {
            console.log(
                `Error in telegramBot.sendMessage(channelId=${channelId}, msg=${tgMsg}, options=${config.tgMsgOptions})`,
                err,
            );
        }
        return false;
    },
};
