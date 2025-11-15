// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import mainLogo from 'assets/logo_primary.png';
import tokenLogo from 'assets/logo_secondary.png';
import { FEE_SATS_PER_KB_XEC_MINIMUM } from 'constants/transactions';

interface AppConfig {
    name: string;
    ticker: string;
    derivationPath: number;
    logo: string; // path to png file
    prefix: string;
    coingeckoId: string;
    fiatUpdateIntervalMs: number;
    satsPerKb: number;
    dustSats: number;
    cashDecimals: number;
    fiatDecimals: number;
    pricePrecisionDecimals: number;
    tokenName: string;
    tokenTicker: string;
    tokenLogo: string; // path to png file
    localStorageMaxCharacters: number;
    monitorExtension: boolean;
    scriptIntegerBits: bigint;
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
        xecx: {
            tokenId: string;
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
    satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
    dustSats: 546,
    cashDecimals: 2,
    fiatDecimals: 2,
    pricePrecisionDecimals: 8,
    tokenName: 'eToken',
    tokenTicker: 'eToken',
    tokenLogo: tokenLogo,
    localStorageMaxCharacters: 24,
    monitorExtension: true,
    scriptIntegerBits: 64n,
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
        xecx: {
            tokenId:
                'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
            // 50,000 XECX (vipBalance is NOT token satoshis)
            vipBalance: '50000',
        },
    },
    defaultLocale: 'en-US',
};

export default appConfig;
