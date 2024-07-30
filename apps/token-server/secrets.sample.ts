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
            sk: Uint8Array.from(
                Buffer.from(
                    '78c6bfffd52b70404de0719962966adb34b61cf20414feebed7435b96dca479a',
                    'hex',
                ),
            ),
        },
    },
    prod: {
        botId: 'yourBotId',
        channelId: 'yourChannelId',
        approvedMods: [],
        // Actual generated wallet used for tests
        // DO NOT USE IN PROD
        // Burned private key intentionally appears in open source repo
        wallet: {
            address: 'ecash:qpm0kyq9x2clugajdycwwqqalaucn5km25zv644uxe',
            sk: Uint8Array.from(
                Buffer.from(
                    '78c6bfffd52b70404de0719962966adb34b61cf20414feebed7435b96dca479a',
                    'hex',
                ),
            ),
        },
    },
};

export default secrets;
