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
