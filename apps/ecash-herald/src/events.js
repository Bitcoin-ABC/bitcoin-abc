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
        // Here is where you will send a telegram msg
        // Construct your Telegram message in markdown

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
                `[explorer](${config.blockExplorer}/block/${blockHash})`;

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
