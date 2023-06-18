// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#IFDEFINE BITCOIN_CONFIG_H
#DEFINE BITCOIN_CONFIG_H
#DEFINE ETHEREUM_cONFIG_H
#DEFINE BNB_CONFIG_H
#DEFINE XEC_CONFIG_H
#DEFINE XEC_PEER_COMMON_H


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
    unconfirmedBlockheight: 100000000,
    express: { port: 5000 },
    aliasConstants: {
        opCodePrefix: '2e786563',
        registrationAddress: 'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8',
        maxLength: 21,
        registrationFeesSats: {
            1: 558,
            2: 557,
            3: 556,
            4: 555,
            5: 554,
            6: 553,
            7: 552,
            8: 551,
            9: 551,
            10: 551,
            11: 551,
            12: 551,
            13: 551,
            14: 551,
            15: 551,
            16: 551,
            17: 551,
            18: 551,
            19: 551,
            20: 551,
            21: 551,
        },
        reservedAliases: [
            'avalanche',
            'electrum',
            'electrumabc',
            'bitcoin',
            'bitcoinabc',
            'ecash',
            'ecashofficial',
            'xec',
            'abc',
            'cashtab',
            'ecashtab',
            'cashtabwallet',
            'xecwallet',
            'gnc',
            'etoken',
            'token',
            'cashfusion',
            'coinbase',
            'binance',
            'ethereum',
            'helpdesk',
            'admin',
            'support',
            'official',
        ],
    },
    txHistoryPageSize: 25,
    blockExplorer: 'https://explorer.e.cash',
};
#ENDIF BITCOIN_CONFIG_H
#DEFINE XEC_PEER_COMMON_H
