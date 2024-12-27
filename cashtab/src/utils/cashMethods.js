// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const getWalletState = wallet => {
    if (!wallet || !wallet.state) {
        return {
            balanceSats: 0,
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        };
    }

    return wallet.state;
};
