const config = require('../config');
const { telegramBot, channelId } = require('../telegram');

const blocks = require('../test/mocks/blocks');
function returnTelegramBotSendMessagePromise(msg, options) {
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
}
async function sendTestTgMsgs() {
    // Build array of promises from all block mock tg msgs
    const testTgMsgPromises = [];
    const blockNames = Object.keys(blocks);
    for (let i = 0; i < blockNames.length; i += 1) {
        const thisBlock = blocks[blockNames[i]];
        const { tgHtml } = thisBlock;

        testTgMsgPromises.push(
            returnTelegramBotSendMessagePromise(tgHtml, config.tgMsgOptions),
        );
    }

    // Send 'em
    let testTgMsgsSuccess;
    try {
        testTgMsgsSuccess = await Promise.all(testTgMsgPromises);
        process.exit();
    } catch (err) {
        console.log(`Error sending test Telegram messages`);
        console.log(err);
        process.exit(1);
    }
}

sendTestTgMsgs();
