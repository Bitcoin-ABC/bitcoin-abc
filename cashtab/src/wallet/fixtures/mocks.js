// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import CashtabSettings from 'config/CashtabSettings';
import CashtabCache from 'config/CashtabCache';

export const nonDefaultContactList = [
    {
        address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        name: 'test',
    },
];

export const nonDefaultCashtabCache = new CashtabCache([
    [
        '1f6a65e7a4bde92c0a012de2bcf4007034504a765377cdf08a3ee01d1eaa6901',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: '0',
            genesisInfo: {
                tokenTicker: '🍔',
                tokenName: 'Burger',
                url: 'https://c4.wallpaperflare.com/wallpaper/58/564/863/giant-hamburger-wallpaper-preview.jpg',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 619053,
                hash: '0000000000000000005b1e5a9a6db0570e8836cd8515e9c390ceb6ae174a2bae',
                timestamp: 1579759858,
            },
            genesisSupply: '1000000',
            genesisMintBatons: 1,
            genesisOutputScripts: [
                '76a9140cc24aac9b8196c706aee203c0df1e062d8c4d9b88ac',
            ],
        },
    ],
]);

// Create a CashtabSettings object at default settings except fiat currency is gbp
export const cashtabSettingsGbp = new CashtabSettings('gbp');

// in-node shape
export const mockIncomingTokenTxDetails = {
    txid: '6ca8ace20c3a54679944f6a0bacf1bfc45d9558040bfa505a17f81aef312b55d',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '965aea37b511b763224dd6bcb17639d3bfce52051fbc14431aac0e295929b4c8',
                outIdx: 2,
            },
            inputScript:
                '483045022100df9dd02d4dc55cb55e57c9dfd4cb36f2ebb6917bd31370e06ac7f3060b8c527802204f7e43934aaadb7799c96a1bad6f42804dcfa5d24422dec3ffacde8d8df2059e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
            sats: 546n,
            sequenceNo: 4294967295,
            token: {
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 6n,
                isMintBaton: false,
                entryIdx: 0,
            },
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
        },
        {
            prevOut: {
                txid: '2fdc62afe089efb603cbb8c794628f284fbacb359c70d957dc19ca358b108af9',
                outIdx: 0,
            },
            inputScript:
                '473044022076f3399f433167b449c2007a4e838fc457102c2b236b7cd6428481fe7d38ef6d022063d9389f09a8dfd5cfb1f6b607aad3784de601280591c2c88ec5fb75482e9dfc412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
            sats: 3300n,
            sequenceNo: 4294967295,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a04534c500001010453454e4420b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7080000000000000001080000000000000005',
        },
        {
            sats: 546n,
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            token: {
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1n,
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            sats: 546n,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            token: {
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 5n,
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            sats: 1787n,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            spentBy: {
                txid: '6f7e5f6035e31e9a17d1e3503f057eb58534d493076ba72a426cc29d020423d1',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    timeFirstSeen: 1709836909,
    size: 480,
    isCoinbase: false,
    tokenEntries: [
        {
            tokenId:
                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            txType: 'SEND',
            isInvalid: false,
            burnSummary: '',
            failedColorings: [],
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    block: {
        height: 834919,
        hash: '00000000000000000ab28ac33e21a717a0deea4101b86360c8f366ba8f4137c9',
        timestamp: 1709839460,
    },
};
