const config = require('./config');
const log = require('./log');
const { getAllAliasTxs, getValidAliasRegistrations } = require('./alias');
const { getAllTxHistory } = require('./chronik');
const { getValidAliasTxsToBeAddedToDb, getAliasBytecount } = require('./utils');
const { returnTelegramBotSendMessagePromise } = require('./telegram');
const { chronik } = require('./chronik');
const axios = require('axios');

module.exports = {
    initializeWebsocket: async function (db) {
        // Subscribe to chronik websocket
        const ws = chronik.ws({
            onMessage: async msg => {
                await module.exports.parseWebsocketMessage(db, msg);
            },
            onReconnect: e => {
                // Fired before a reconnect attempt is made:
                log('Websocket disconnected. Reconnecting...');
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
            case 'BlockConnected':
                typeof wsMsg.blockHash !== 'undefined'
                    ? log(`New block found: ${wsMsg.blockHash}`)
                    : log(`Checking for new aliases on startup`);
                const aliasTxHistory = await getAllTxHistory(
                    config.aliasConstants.registrationHash160,
                );
                const allAliasTxs = getAllAliasTxs(
                    aliasTxHistory,
                    config.aliasConstants,
                );
                const { validAliasTxs, pendingAliasTxs } =
                    getValidAliasRegistrations(allAliasTxs);
                log(`${validAliasTxs.length} valid alias registrations`);
                log(`${pendingAliasTxs.length} pending alias registrations`);

                // Get the valid aliases already in the db
                let validAliasesInDb;
                try {
                    validAliasesInDb = await db
                        .collection(config.database.collections.validAliases)
                        .find()
                        .sort({ blockheight: 1 })
                        .project({ _id: 0 })
                        .toArray();
                    log(`${validAliasesInDb.length} valid aliases in database`);
                } catch (error) {
                    log(`Error in determining validAliasesInDb`, error);
                }

                const validAliasTxsToBeAddedToDb =
                    getValidAliasTxsToBeAddedToDb(
                        validAliasesInDb,
                        validAliasTxs,
                    );
                log(`validAliasTxsToBeAddedToDb`, validAliasTxsToBeAddedToDb);

                if (validAliasTxsToBeAddedToDb.length > 0) {
                    // Update with real data
                    try {
                        const validAliasTxsCollectionInsertResult = await db
                            .collection(
                                config.database.collections.validAliases,
                            )
                            .insertMany(validAliasTxsToBeAddedToDb);
                        log(
                            `Inserted ${validAliasTxsCollectionInsertResult.insertedCount} aliases into ${config.database.collections.validAliases}`,
                        );
                    } catch (err) {
                        log(
                            `A MongoBulkWriteException occurred adding validAliasTxs to the db, but there are successfully processed documents.`,
                        );
                        /*
                        let ids = err.result.result.insertedIds;
                        for (let id of Object.values(ids)) {
                            log(`Processed a document with id ${id._id}`);
                        }
                        */
                        log(
                            `Number of documents inserted: ${err.result.result.nInserted}`,
                        );
                        log(`Error:`, err);
                    }

                    // Get the XEC price to use in the Telegram msgs
                    let coingeckoPriceResponse;
                    let xecPrice;
                    try {
                        coingeckoPriceResponse = await axios.get(
                            `https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd`,
                        );
                        xecPrice = coingeckoPriceResponse.data.ecash.usd;
                        log(`xecPrice`, xecPrice);
                    } catch (err) {
                        log(`Error getting XEC price from Coingecko API`, err);
                        xecPrice = false;
                    }

                    // Send msgs to Telegram channel about newly registered aliases
                    const tgBotMsgPromises = [];
                    for (
                        let i = 0;
                        i < validAliasTxsToBeAddedToDb.length;
                        i += 1
                    ) {
                        // Get interesting info for a telegram message
                        const { alias, address, txid } =
                            validAliasTxsToBeAddedToDb[i];

                        // Get alias byte count
                        const aliasBytecount = getAliasBytecount(alias);

                        const aliasPriceSats =
                            config.aliasConstants.registrationFeesSats[
                                aliasBytecount
                            ];
                        // Construct your Telegram message in markdown
                        const tgMsg =
                            `A new ${aliasBytecount}-byte alias has been registered for ` +
                            (xecPrice
                                ? `$${(
                                      (aliasPriceSats / 100) *
                                      xecPrice
                                  ).toLocaleString('en-US', {
                                      maximumFractionDigits: 2,
                                  })} USD`
                                : `${(
                                      aliasPriceSats / 100
                                  ).toLocaleString()} XEC`) +
                            `!\n` +
                            `\n` +
                            `"${alias}"\n` +
                            `\n` +
                            `[address](${config.blockExplorer}/address/${address}) | [tx](${config.blockExplorer}/tx/${txid})`;
                        // Configure msg parse settings
                        let tgMsgOptions = {
                            parse_mode: 'markdown',
                            disable_web_page_preview: true,
                        };
                        const tgBotMsgPromise =
                            returnTelegramBotSendMessagePromise(
                                tgMsg,
                                tgMsgOptions,
                            );
                        tgBotMsgPromises.push(tgBotMsgPromise);
                    }
                    /* 
                    Send msgs in a batch to handle nodejs async threads
                    Note: you will still run into rate limit issues if 
                    you are trying to send more than 25 msgs at once
                    */
                    let tgMsgBatchSuccess;
                    try {
                        tgMsgBatchSuccess = await Promise.all(tgBotMsgPromises);
                        log(
                            `Successfully sent ${tgBotMsgPromises.length} messages to channel`,
                        );
                    } catch (err) {
                        log(
                            `Error sending Telegram Bot message for aliases`,
                            err,
                        );
                    }
                }
                break;
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
