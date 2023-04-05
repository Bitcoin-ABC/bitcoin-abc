'use strict';
const config = require('./config');
const secrets = require('./secrets');
const {
    initializeWebsocket,
    parseWebsocketMessage,
} = require('./src/websocket');
const { initializeDb } = require('./src/db');
const log = require('./src/log');
const express = require('express');
var cors = require('cors');
const requestIp = require('request-ip');
const TelegramBot = require('node-telegram-bot-api');

// Fire up your Telegram bot on app startup
// Need to do it here so you can mock it in unit tests
const { botId, channelId } = secrets.telegram;
// Create a bot that uses 'polling' to fetch new updates
const telegramBot = new TelegramBot(botId, {
    polling: true,
});

async function main(telegramBot, channelId) {
    // Initialize db connection
    const db = await initializeDb();

    // Initialize websocket connection
    const aliasWebsocket = await initializeWebsocket(
        db,
        telegramBot,
        channelId,
    );
    if (aliasWebsocket && aliasWebsocket._subs && aliasWebsocket._subs[0]) {
        const subscribedHash160 = aliasWebsocket._subs[0].scriptPayload;
        log(`Websocket subscribed to ${subscribedHash160}`);
    }

    // Run parseWebsocketMessage on startup mocking a block found
    parseWebsocketMessage(db, telegramBot, channelId);

    // Set up your API endpoints
    const app = express();
    app.use(express.json());
    app.use(requestIp.mw());
    app.use(cors());

    app.get('/aliases', async function (req, res) {
        // Get IP address from before cloudflare proxy
        const ip = req.clientIp;
        log(`/aliases from IP: ${ip}, host ${req.headers.host}`);
        let aliases;
        try {
            aliases = await db
                .collection(config.database.collections.validAliases)
                .find()
                .project({ _id: 0, txid: 0, blockheight: 0 })
                .toArray();
            return res.status(200).json(aliases);
        } catch (error) {
            return res.status(500).json({ error });
        }
    });

    app.listen(config.express.port);
}

main(telegramBot, channelId);
