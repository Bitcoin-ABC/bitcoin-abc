const secrets = require('./secrets');
const TelegramBot = require('node-telegram-bot-api');

const { botId, channelId } = secrets.telegram;
// Create a bot that uses 'polling' to fetch new updates
const telegramBot = new TelegramBot(botId, { polling: true });

module.exports = {
    returnTelegramBotSendMessagePromise: async function (msg, options) {
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
