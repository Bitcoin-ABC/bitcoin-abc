// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import mainLogo from 'assets/logo_primary.png';
import tokenLogo from 'assets/logo_secondary.png';

interface AppConfig {
    name: string;
    ticker: string;
    derivationPath: number;
    logo: string; // path to png file
    prefix: string;
    coingeckoId: string;
    fiatUpdateIntervalMs: number;
    defaultFee: number;
    minFee: number;
    dustSats: number;
    cashDecimals: number;
    fiatDecimals: number;
    pricePrecisionDecimals: number;
    tokenName: string;
    tokenTicker: string;
    tokenLogo: string; // path to png file
    localStorageMaxCharacters: number;
    monitorExtension: false;
    vipTokens: {
        grumpy: {
            tokenId: string;
            // decimalized string, i.e. one million GRP tokens
            vipBalance: string;
        };
        cachet: {
            tokenId: string;
            // decimalized string, i.e. one thousand CACHET tokens
            vipBalance: string;
        };
    };
    defaultLocale: string;
}
// App settings not adjustable by the user
const appConfig: AppConfig = {
    name: 'eCash',
    ticker: process.env.REACT_APP_TESTNET === 'true' ? 'tXEC' : 'XEC',
    derivationPath: 1899,
    logo: mainLogo,
    prefix: process.env.REACT_APP_TESTNET === 'true' ? 'ectest' : 'ecash',
    coingeckoId: 'ecash',
    fiatUpdateIntervalMs: 90000,
    defaultFee: 2010, // satoshis per kb
    minFee: 1000, // satoshis per kb
    dustSats: 546,
    cashDecimals: 2,
    fiatDecimals: 2,
    pricePrecisionDecimals: 8,
    tokenName: 'eToken',
    tokenTicker: 'eToken',
    tokenLogo: tokenLogo,
    localStorageMaxCharacters: 24,
    monitorExtension: false,
    vipTokens: {
        grumpy: {
            tokenId:
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            // decimalized string, i.e. one million GRP tokens
            vipBalance: '1000000',
        },
        cachet: {
            tokenId:
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
            // decimalized string, i.e. one thousand CACHET tokens
            vipBalance: '1000',
        },
    },
    defaultLocale: 'en-US',
};

export default appConfig;
