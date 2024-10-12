// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

export const chronik = {
    urls:
        process.env.REACT_APP_TESTNET === 'true'
            ? ['https://chronik-testnet.fabien.cash']
            : [
                  'https://chronik.pay2stay.com/xec2',
                  'https://chronik-native1.fabien.cash',
                  'https://chronik-native2.fabien.cash',
              ],
    txHistoryCount: 20,
    txHistoryPageSize: 20,
};
