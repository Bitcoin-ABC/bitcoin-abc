// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

module.exports = {
    returnTelegramBotSendMessagePromise: async function (
        telegramBot,
        channelId,
        msg,
        options,
    ) {
        return new Promise((resolve, reject) => {
            telegramBot.sendMessage(channelId, msg, options).then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
        });
    },
};
