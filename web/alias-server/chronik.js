const config = require('./config');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

module.exports = {
    getTxHistoryPage: async function (hash160, page = 0) {
        let txHistoryPage;
        try {
            txHistoryPage = await chronik
                .script('p2pkh', hash160)
                // Get the 25 most recent transactions
                .history(page, config.txHistoryPageSize);
            return txHistoryPage;
        } catch (err) {
            console.log(`Error in getTxHistoryPage(${hash160})`, err);
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

        // Add a promise that errors to confirm this case is handled
        /*
        const failingPromise =
            module.exports.returnGetTxHistoryPagePromise('not-a-hash160');
        txHistoryPageResponsePromises.push(failingPromise);
        */

        // Use Promise.all so that an error is thrown if any single promise fails
        let remainingTxHistoryPageResponses;
        try {
            remainingTxHistoryPageResponses = await Promise.all(
                txHistoryPageResponsePromises,
            );
        } catch (err) {
            console.log(
                `Error in Promise.all(txHistoryPageResponsePromises)`,
                err,
            );
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
