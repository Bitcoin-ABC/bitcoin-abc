// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import mainLogo from 'assets/logo_primary.png';
import tokenLogo from 'assets/logo_secondary.png';
import { cashtabSettings } from 'config/cashtabSettings';

// App settings not adjustable by the user
const appConfig = {
    name: 'eCash',
    ticker: 'XEC',
    logo: mainLogo,
    legacyPrefix: 'bitcoincash',
    coingeckoId: 'ecash',
    defaultFee: 2.01,
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
    defaultCashtabState: { contactList: [], settings: cashtabSettings },
};

export default appConfig;
