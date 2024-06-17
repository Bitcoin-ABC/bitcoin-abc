// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = {
    chronik: [
        'https://chronik-native1.fabien.cash',
        'https://chronik-native2.fabien.cash',
    ],
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
