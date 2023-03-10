const config = require('./config');
const { telegramBot, channelId } = require('./telegram');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);
const { parseBlock, getBlockTgMessage } = require('./parse');
const parse = require('./parse');

module.exports = {
    initializeWebsocket: async function () {
        // Subscribe to chronik websocket
        const ws = chronik.ws({
            onMessage: async msg => {
                await module.exports.parseWebsocketMessage(msg);
            },
            onReconnect: e => {
                // Fired before a reconnect attempt is made:
                console.log('Websocket disconnected. Reconnecting...');
            },
        });
        // Wait for WS to be connected:
        await ws.waitForOpen();
        console.log(`Connected to websocket`);
        // Subscribe to scripts (on Lotus, current ABC payout address):
        // Will give a message on avg every 2 minutes
        ws.subscribe('p2pkh', config.ifpHash160);
        return ws;
    },
    parseWebsocketMessage: async function (wsMsg) {
        console.log(`New chronik websocket message`, wsMsg);
        // Determine type of tx
        const { type } = wsMsg;

        // type can be AddedToMempool, BlockConnected, or Confirmed

        switch (type) {
            case 'BlockConnected':
                // Here is where you will send a telegram msg
                // Construct your Telegram message in markdown
                const { blockHash } = wsMsg;

                // Get some info about this block
                let blockDetails;
                let parsedBlock;
                let generatedTgMsg;
                try {
                    blockDetails = await chronik.block(blockHash);
                    parsedBlock = parseBlock(blockDetails);
                    generatedTgMsg = getBlockTgMessage(parsedBlock);
                } catch (err) {
                    blockDetails = false;
                    console.log(`Error in chronik.block(${blockHash})`, err);
                }

                // Construct your Telegram message in markdown
                const tgMsg = blockDetails
                    ? generatedTgMsg
                    : `New Block Found\n` +
                      `\n` +
                      `${blockHash}\n` +
                      `\n` +
                      `[explorer](${config.blockExplorer}/block/${blockHash})`;

                // Configure msg parse settings
                let tgMsgOptions = {
                    parse_mode: 'markdown',
                    disable_web_page_preview: true,
                };
                let blockFoundMessageSuccess;
                try {
                    blockFoundMessageSuccess = await telegramBot.sendMessage(
                        channelId,
                        tgMsg,
                        tgMsgOptions,
                    );
                } catch (err) {
                    console.log(`Error in telegramBot.send(${wsMsg})`, err);
                }
                break;
            case 'AddedToMempool':
                console.log(`New tx: ${wsMsg.txid}`);
                break;
            case 'Confirmed':
                console.log(`New confirmed tx: ${wsMsg.txid}`);
                break;
            default:
                console.log(`New websocket message of unknown type:`, wsMsg);
        }
    },
};
