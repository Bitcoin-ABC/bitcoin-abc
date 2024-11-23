// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const mockBurnOpReturnTokenUtxos = [
    {
        outpoint: {
            txid: 'e1f75fd838056396dbaaa5431ae1f7a471b1e1d63f5467b99411f32ba3a54968',
            outIdx: 1,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: 546,
        address: 'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
        isFinal: true,
        token: {
            tokenId:
                '4209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            amount: '50000000',
            isMintBaton: false,
        },
    },
];

export const mockBurnAllTokenUtxos = [
    {
        outpoint: {
            txid: '049cec7bc6ad1a3d636763c6c70fd83bc19df14be43a378a9d00eccb483349a4',
            outIdx: 1,
        },
        blockHeight: 757204,
        isCoinbase: false,
        value: 546,
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        isFinal: true,
        token: {
            tokenId:
                '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            amount: '88800888888',
            isMintBaton: false,
        },
    },
];
