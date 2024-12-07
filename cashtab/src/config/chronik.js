// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

export const chronik = {
    urls:
        process.env.REACT_APP_TESTNET === 'true'
            ? ['https://chronik-testnet.fabien.cash']
            : [
                  'https://chronik-native1.fabien.cash', // indexed for agora.py plugin
                  'https://chronik.pay2stay.com/xec2', // indexed for agora.py plugin
                  'https://chronik-native2.fabien.cash', // NOT indexed for agora.py
              ],
    txHistoryCount: 10,
    txHistoryPageSize: 10,
};
