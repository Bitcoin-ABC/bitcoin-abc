// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

interface TokenServerConfig {
    port: Number;
    chronikUrls: string[];
}

const config: TokenServerConfig = {
    port: 3333,
    chronikUrls: [
        'https://chronik-native.fabien.cash',
        'https://chronik.pay2stay.com/xec',
        'https://chronik.be.cash/xec2',
    ],
};

export default config;
