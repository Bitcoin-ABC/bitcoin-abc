// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import mainLogo from 'assets/logo_primary.png';
import tokenLogo from 'assets/logo_secondary.png';

// App settings not adjustable by the user
const appConfig = {
    name: 'eCash',
    ticker: 'XEC',
    logo: mainLogo,
    legacyPrefix: 'bitcoincash',
    coingeckoId: 'ecash',
    defaultFee: 2.01,
    minFee: 1,
    dustSats: 550,
    etokenSats: 546,
    cashDecimals: 2,
    fiatDecimals: 2,
    pricePrecisionDecimals: 8,
    tokenName: 'eToken',
    tokenTicker: 'eToken',
    tokenLogo: tokenLogo,
    notificationDurationShort: 3,
    notificationDurationLong: 5,
    localStorageMaxCharacters: 24,
    monitorExtension: false,
    vipSettingsTokenId:
        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa', // GRP
    vipSettingsTokenQty: '1000000',
    defaultLocale: 'en-US',
};

export default appConfig;
