// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ServerWallet } from './src/wallet';

interface Secrets {
    botId: string;
    channelId: string;
    approvedMods: number[];
    wallet: ServerWallet;
}

interface TokenServerSecrets {
    dev: Secrets;
    prod: Secrets;
}

const secrets: TokenServerSecrets = {
    dev: {
        botId: 'yourBotId',
        channelId: 'yourChannelId',
        approvedMods: [],
        wallet: {
            address: 'ecash:qpm0kyq9x2clugajdycwwqqalaucn5km25zv644uxe',
            wif: 'L1GV3dTiCiSKsjwoL8brjqyZNKVjjTQTHaHPqbC2PWSg2o6VGXvG',
        },
    },
    prod: {
        botId: 'yourBotId',
        channelId: 'yourChannelId',
        approvedMods: [],
        // Actual generated wallet used for tests
        // Not recommended to actually use it ofc...
        wallet: {
            address: 'ecash:qpm0kyq9x2clugajdycwwqqalaucn5km25zv644uxe',
            wif: 'L1GV3dTiCiSKsjwoL8brjqyZNKVjjTQTHaHPqbC2PWSg2o6VGXvG',
        },
    },
};

export default secrets;
