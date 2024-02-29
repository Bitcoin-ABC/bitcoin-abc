// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const generateSendOpReturnMockUtxos = [
    {
        outpoint: {
            txid: '906f7dd233a4e0d5ca03f238fe1ab75c0346ebe9ebbd8421da37ec55cd957391',
            outIdx: 2,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
        },
        slpToken: {
            amount: '49995000',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'bitcoincash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqqkm80dnl6',
        tokenQty: '49995',
        tokenId:
            '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
        decimals: 3,
    },
];

export const covidUtxosChange = [
    {
        outpoint: {
            txid: '5c1e71223ee8b7064029f2add09c0b0a18e2695f09fea588821f608934d130ca',
            outIdx: 2,
        },
        blockHeight: 769077,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        },
        slpToken: {
            amount: '1',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        tokenQty: '1',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 0,
    },
    {
        outpoint: {
            txid: '079728289a1db6ca0ff1d558891bf33efeb0667bc57e9ebe949c3cf40ce33568',
            outIdx: 2,
        },
        blockHeight: 782686,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        },
        slpToken: {
            amount: '9999999688',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        tokenQty: '9999999688',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 0,
    },
];

export const covidUtxosNoChange = [
    {
        outpoint: {
            txid: '0d943c72c3cbfaf7d1a5b889e62a6ef6e11a3df3a64792bea4499515e884b80a',
            outIdx: 2,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        },
        slpToken: {
            amount: '9999999500',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        tokenQty: '9999999500',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 0,
    },
];

export const mockSendDecimals = [
    {
        slpToken: {
            amount: '106000000000000',
            isMintBaton: false,
        },
        tokenQty: '10600000000000',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 1,
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
    {
        slpToken: {
            amount: '106000000000000',
            isMintBaton: false,
        },
        tokenQty: '10600000000000',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 1,
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
];

export const mockSendDecimalsFoo = [
    {
        slpToken: {
            amount: '106',
            isMintBaton: false,
        },
        tokenQty: '10.6',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 1,
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
    {
        slpToken: {
            amount: '106',
            isMintBaton: false,
        },
        tokenQty: '10.6',
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
        decimals: 1,
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
];

export const mockBurnOpReturnTokenUtxos = [
    {
        outpoint: {
            txid: 'e1f75fd838056396dbaaa5431ae1f7a471b1e1d63f5467b99411f32ba3a54968',
            outIdx: 1,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '4209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88',
        },
        slpToken: {
            amount: '50000000',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'bitcoincash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqqkm80dnl6',
        tokenQty: '500000',
        tokenId:
            '4209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88',
        decimals: 2,
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
        value: '546',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
        },
        slpToken: {
            amount: '88800888888',
            isMintBaton: false,
        },
        network: 'XEC',
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        tokenQty: '888.00888888',
        tokenId:
            '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
        decimals: 8,
    },
];
