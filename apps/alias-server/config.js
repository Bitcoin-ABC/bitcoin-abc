// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = {
    chronik: 'https://chronik.fabien.cash', // URL of chronik instance
    avalancheCheckWaitInterval: 500, // half a second
    avalancheCheckCount: 100, // max number of times you'll check if a block is avalanche finalized
    database: {
        name: 'ecashAliases',
        collections: {
            validAliases: 'validAliasTxs',
            pendingAliases: 'pendingAliasTxs',
            serverState: 'serverState',
        },
        connectionUrl: 'mongodb://localhost:27017',
    },
    pendingExpirationBlocks: 6,
    // Prevent the app from processing tx history before aliases active
    initialServerState: {
        processedConfirmedTxs: 45587,
        processedBlockheight: 785000,
    },
    unconfirmedBlockheight: 100000000,
    express: { port: 5000 },
    txHistoryPageSize: 25,
    blockExplorer: 'https://explorer.e.cash',
};
