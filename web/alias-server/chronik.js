const config = require('./config');
const log = require('./log');
const { getAllAliasTxs, getValidAliasRegistrations } = require('./alias.js');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

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
                const aliasTxHistory = await module.exports.getAllTxHistory(
                    config.aliasConstants.registrationHash160,
                );
                const allAliasTxs = getAllAliasTxs(
                    aliasTxHistory,
                    config.aliasConstants,
                );
                const { validAliasTxs, pendingAliasTxs } =
                    getValidAliasRegistrations(allAliasTxs);

                // Update with real data
                if (validAliasTxs.length > 0) {
                    try {
                        const validAliasTxsCollectionInsertResult = await db
                            .collection(
                                config.database.collections.validAliases,
                            )
                            .insertMany(validAliasTxs);
                        console.log(
                            'validAliasTxsCollection inserted documents =>',
                            validAliasTxsCollectionInsertResult,
                        );
                    } catch (err) {
                        log(
                            `A MongoBulkWriteException occurred adding validAliasTxs to the db, but there are successfully processed documents.`,
                        );
                        let ids = err.result.result.insertedIds;
                        for (let id of Object.values(ids)) {
                            log(`Processed a document with id ${id._id}`);
                        }
                        log(
                            `Number of documents inserted: ${err.result.result.nInserted}`,
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
    getTxHistoryPage: async function (hash160, page = 0) {
        let txHistoryPage;
        try {
            txHistoryPage = await chronik
                .script('p2pkh', hash160)
                // Get the 25 most recent transactions
                .history(page, config.txHistoryPageSize);
            return txHistoryPage;
        } catch (err) {
            log(`Error in getTxHistoryPage(${hash160})`, err);
        }
    },
    returnGetTxHistoryPagePromise: async function (hash160, page = 0) {
        /* 
        Unlike getTxHistoryPage, this function will reject and 
        fail Promise.all() if there is an error in the chronik call
        */
        return new Promise((resolve, reject) => {
            chronik
                .script('p2pkh', hash160)
                .history(page, config.txHistoryPageSize)
                .then(
                    result => {
                        resolve(result);
                    },
                    err => {
                        reject(err);
                    },
                );
        });
    },
    getAllTxHistory: async function (hash160) {
        let allTxHistory = [];
        const txHistoryFirstPageResponse =
            await module.exports.getTxHistoryPage(hash160);
        const { txs, numPages } = txHistoryFirstPageResponse;

        // Add first page of results to allTxHistory
        allTxHistory = allTxHistory.concat(txs);

        // Iterate through remaining pages to get remaining tx history
        // Start with i=1, as you already have data from page 0
        // Note: Since 0 is a page number, 3 pages of data ends with pageNumber i=2
        const txHistoryPageResponsePromises = [];
        for (let i = 1; i < numPages; i += 1) {
            const txHistoryPageResponsePromise =
                module.exports.returnGetTxHistoryPagePromise(hash160, i);
            txHistoryPageResponsePromises.push(txHistoryPageResponsePromise);
        }

        // Use Promise.all so that an error is thrown if any single promise fails
        let remainingTxHistoryPageResponses;
        try {
            remainingTxHistoryPageResponses = await Promise.all(
                txHistoryPageResponsePromises,
            );
        } catch (err) {
            log(`Error in Promise.all(txHistoryPageResponsePromises)`, err);
            // Return false; you won't have all the tx history if this happens
            return false;
        }

        // Iterate over results to complete allTxHistory
        for (let i = 0; i < remainingTxHistoryPageResponses.length; i += 1) {
            const { txs } = remainingTxHistoryPageResponses[i];
            allTxHistory = allTxHistory.concat(txs);
        }

        return allTxHistory;
    },
};
