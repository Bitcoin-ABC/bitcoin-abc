'use strict'
const { initializeWebsocket } = require('./src/chronik');

async function main() {
    // Initialize websocket connection
    const telegramBotWebsocket = await initializeWebsocket();

    if (
        telegramBotWebsocket &&
        telegramBotWebsocket._subs &&
        telegramBotWebsocket._subs[0]
    ) {
        const subscribedHash160 = telegramBotWebsocket._subs[0].scriptPayload;
        console.log(`Websocket subscribed to ${subscribedHash160}`);
    }
}

main();
