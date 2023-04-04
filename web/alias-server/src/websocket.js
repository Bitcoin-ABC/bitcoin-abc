'use strict';
const config = require('../config');
const log = require('./log');
const { chronik } = require('./chronik');

module.exports = {
    initializeWebsocket: async function (db, telegramBot, channelId) {
        // Subscribe to chronik websocket
        const ws = chronik.ws({
            onMessage: async msg => {
                await module.exports.parseWebsocketMessage(
                    db,
                    telegramBot,
                    channelId,
                    msg,
                );
            },
        });
        // Wait for WS to be connected:
        await ws.waitForOpen();
        log(`Connected to websocket`);
        // Subscribe to scripts (on Lotus, current ABC payout address):
        // Will give a message on avg every 2 minutes
        ws.subscribe('p2pkh', config.aliasConstants.registrationHash160);
        return ws;
    },
    parseWebsocketMessage: async function (
        db,
        telegramBot,
        channelId,
        wsMsg = { type: 'BlockConnected' },
    ) {
        log(`parseWebsocketMessage called on`, wsMsg);
        // Determine type of tx
        const { type } = wsMsg;
        log(`msg type: ${type}`);
        // type can be AddedToMempool, BlockConnected, or Confirmed
        // For now, we are only interested in "Confirmed", as only these are valid
        // We will want to look at AddedToMempool to process pending alias registrations later
        switch (type) {
            case 'BlockConnected': {
                /*
                 * BlockConnected callback
                 *
                 * This is where alias-server queries the blockchain for new transactions and
                 * parses those transactions to determine if any are valid alias registrations
                 *
                 * The database may only be updated if we have a known blockhash and height with
                 * isFinalBlock = true confirmed by avalanche
                 *
                 * A number of error conditions may cause parseWebsocketMessage to exit before any update to
                 * the database occurs.
                 *
                 * If alias-server determines a blockhash and height with isFinalBlock === true,
                 * valid alias registrations will be processed up to and including that blockheight
                 *
                 * Otherwise parseWebsocketMessage will exit before any updates are made to the database
                 *
                 * Note: websockets disconnect and reconnect frequently. It cannot be assumed that
                 * every found block will triggger parseWebsocketMessage. So, parseWebsocketMessage must be designed such that
                 * it will always update for all unseen valid alias registrations.
                 *
                 */
                typeof wsMsg.blockHash !== 'undefined'
                    ? log(`New block found: ${wsMsg.blockHash}`)
                    : log(`Checking for new aliases on startup`);

                // TODO Get the valid aliases already in the db

                // TODO get server state
                // processedConfirmedTxs - count of processed confirmed txs
                // processedBlockheight - highest blockheight seen by the server

                // TODO get set of transactions not yet processed by the server
                // If app startup, this is full tx history of alias registration address

                // TODO parse tx history for latest valid alias registrations
                // with valid format and fee

                // TODO update database with latest valid alias information

                // TODO update server state
                // TODO If you have new aliases to add to the db, add them + send a tg msg
                // TODO If not, exit loop

                if (typeof wsMsg.blockHash !== 'undefined') {
                    log(
                        `Alias registrations updated to block ${wsMsg.blockHash}`,
                    );
                    return `Alias registrations updated to block ${wsMsg.blockHash}`;
                }
                return `Alias registrations updated on app startup`;
            }
            case 'AddedToMempool':
                log(`New tx: ${wsMsg.txid}`);
                break;
            case 'Confirmed':
                log(`New confirmed tx: ${wsMsg.txid}`);
                break;
            default:
                log(`New websocket message of unknown type:`, wsMsg);
        }
    },
};
