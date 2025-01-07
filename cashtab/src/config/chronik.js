// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

export const chronik = {
    urls:
        process.env.REACT_APP_TESTNET === 'true'
            ? ['https://chronik-testnet.fabien.cash']
            : /**
               * chronik servers must be indexed with agora.py plugin
               * for agora functionality (agora trading, parsing agora txs
               * in history)
               */
              [
                  'https://chronik-native1.fabien.cash',
                  'https://chronik-native2.fabien.cash',
                  'https://chronik.pay2stay.com/xec2',
              ],
    txHistoryCount: 20,
    txHistoryPageSize: 20,
};
