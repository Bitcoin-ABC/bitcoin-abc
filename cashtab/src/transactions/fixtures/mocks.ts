// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { cashtabWalletToJSON, cashtabWalletFromJSON } from 'helpers';
import { CashtabWallet, CashtabWalletPaths } from 'wallet';
import { fromHex } from 'ecash-lib';
import { XecTxType } from 'chronik';
import { RenderedTokenType } from 'token-protocols';

const wallet: CashtabWallet = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    paths: new Map([
        [
            1899,
            {
                hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
                sk: fromHex(
                    '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
                ),
                pk: fromHex(
                    '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                ),
            },
        ],
        [
            145,
            {
                hash: 'a28f8852f868f88e71ec666c632d6f86e978f046',
                address: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
                wif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
                sk: fromHex(
                    '9747c0c6a6b4a1025b222a79ccad3df7330cbf3e6731de58500f865d0370b861',
                ),
                pk: fromHex(
                    '03939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5',
                ),
            },
        ],
        [
            245,
            {
                hash: '600efb12a6f813eccf13171a8bc62055212d8d6c',
                address: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
                wif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
                sk: fromHex(
                    'c3f637ba1e3cdd10cace41350058a3698c5bd413b69a358a2a2b955843ea043c',
                ),
                pk: fromHex(
                    '03f73fe2631da9732f2480debbc7ff8d99c5c06764e0f5095b789ff190788bee72',
                ),
            },
        ],
    ]) as CashtabWalletPaths,
    state: {
        balanceSats: 135000,
        slpUtxos: [],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: true,
                path: 1899,
                sats: 25000n,
            },
            {
                outpoint: {
                    txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: true,
                path: 1899,
                sats: 100000n,
            },
            {
                outpoint: {
                    txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: true,
                path: 1899,
                sats: 10000n,
            },
        ],
        tokens: new Map(),
        parsedTxHistory: [
            {
                txid: '0d029d72aa24838081385357738be213ef01693323dfecd090976b358be5cbb6',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                            outIdx: 1,
                        },
                        inputScript:
                            '0441475230074f4e4553484f5441d42879bb92acb8d116974af33428cd712f45a265856454e4e4f25dc8653b822347969d887d0cc842513d759cfcd92103829ac67e3e02a356b51c3b6299a7a303414c562200e1f505000000001976a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac7521038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71dead074f4e4553484f5488044147523087',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                number: 65,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        outputScript:
                            'a914288ba6fc83cb1705322d0e7f5e72bd709947992f87',
                        sats: 3000n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001410453454e44209f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794080000000000000001',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            'a914a2db8028b3d490460c8df834d254b31d5283efb487',
                        token: {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                number: 65,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 1754n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1720807732,
                size: 348,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [
                    {
                        tokenId:
                            '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        groupTokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 853000,
                    hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                    timestamp: 1720807766,
                },
                parsed: {
                    recipients: [
                        'ecash:pz3dhqpgk02fq3sv3hurf5j5kvw49ql0ks2eyjpcy0',
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                    ],
                    satoshisSent: 0,
                    stackArray: [
                        '534c5000',
                        '41',
                        '53454e44',
                        '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                        '0000000000000001',
                    ],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [
                        {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            renderedTxType: 'Agora Sale',
                            renderedTokenType: 'NFT' as RenderedTokenType,
                            tokenSatoshis: '0',
                        },
                    ],
                    replyAddress:
                        'ecash:pq5ghfhus093wpfj95887hnjh4cfj3ue9uz40ydh0e',
                },
            },
            {
                txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            outIdx: 1,
                        },
                        inputScript:
                            '41910b732d613939a83220bae192564e85f4f8d595c340ecd8a4cb4db6369e1f40cbbab0c8c05eda5c068c8d4c7baf0974ed217cad9312afc8945b5145b136225e4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                number: 65,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            outIdx: 2,
                        },
                        inputScript:
                            '419c31be3f9da26b5391fa8ff3d9eab63d773281f58a37cafcf50bddc178b5ed53b9e81c83392cd49e66e037df893c3820fd29cd2680e3aecb46c5bb3825bac8ff4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 989414n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001410453454e44209f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794080000000000000001',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            'a914288ba6fc83cb1705322d0e7f5e72bd709947992f87',
                        token: {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                number: 65,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        spentBy: {
                            txid: '0d029d72aa24838081385357738be213ef01693323dfecd090976b358be5cbb6',
                            outIdx: 0,
                        },
                        sats: 3000n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 986111n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1720807731,
                size: 422,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [
                    {
                        tokenId:
                            '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        groupTokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 853000,
                    hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                    timestamp: 1720807766,
                },
                parsed: {
                    recipients: [
                        'ecash:pq5ghfhus093wpfj95887hnjh4cfj3ue9uz40ydh0e',
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                    ],
                    satoshisSent: 0,
                    stackArray: [
                        '534c5000',
                        '41',
                        '53454e44',
                        '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                        '0000000000000001',
                    ],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [
                        {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            renderedTxType: 'SEND',
                            renderedTokenType: 'NFT' as RenderedTokenType,
                            tokenSatoshis: '0',
                        },
                    ],
                    replyAddress:
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                },
            },
            {
                txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                            outIdx: 1,
                        },
                        inputScript:
                            '410fcaa044599c5b81e3e3183262307fb38373299cf5a815b35b517e2d82a42f318d116a445ca322ac724f4b16bbc090936bce955600e12c1523339841622eaf8d4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 1,
                            atoms: 1n,
                        },
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                            outIdx: 13,
                        },
                        inputScript:
                            '41fe365a742dd691ac847bd2919cc4e15a2d5fa7753c3e9091efe101e9c507ee209c8389999f3872a74181b3abd079601144b3c7d073a2c035f41cac2c95575b4f4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 990397n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001410747454e45534953063639463235300e3139363920466f7264204632353023656e2e77696b6970656469612e6f72672f77696b692f466f72645f462d53657269657320462840cc9a384225f46225ef5179a3cb1becbbf2920f7420ab37da4a5bcf8bb101004c00080000000000000001',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                number: 65,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        spentBy: {
                            txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                            outIdx: 0,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        spentBy: {
                            txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                            outIdx: 1,
                        },
                        sats: 989414n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1720807698,
                size: 489,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        txType: 'GENESIS',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        groupTokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                    {
                        tokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        txType: 'NONE',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                isFinal: true,
                block: {
                    height: 853000,
                    hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                    timestamp: 1720807766,
                },
                parsed: {
                    recipients: [
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                    ],
                    satoshisSent: 0,
                    stackArray: [
                        '534c5000',
                        '41',
                        '47454e45534953',
                        '363946323530',
                        '3139363920466f72642046323530',
                        '656e2e77696b6970656469612e6f72672f77696b692f466f72645f462d536572696573',
                        '462840cc9a384225f46225ef5179a3cb1becbbf2920f7420ab37da4a5bcf8bb1',
                        '00',
                        '',
                        '0000000000000001',
                    ],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [
                        {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            renderedTxType: 'GENESIS',
                            renderedTokenType: 'NFT' as RenderedTokenType,
                            tokenSatoshis: '1',
                        },
                        {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            renderedTxType: 'NONE',
                            renderedTokenType:
                                'Collection' as RenderedTokenType,
                            tokenSatoshis: '0',
                        },
                    ],
                    replyAddress:
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                },
            },
            {
                txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            outIdx: 1,
                        },
                        inputScript:
                            '417a7012cfac73041156964126ebb84eb8a8941b1661e3c0d1af893e6ca6c99e007af48c2af145936eec24c14868c807fdede002a66d82cf32fd3193eaeb9711fc4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 12n,
                        },
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            outIdx: 3,
                        },
                        inputScript:
                            '4132d71a9e6e757b8952b627f0b52675af242f36065e704fda499c6b5265c2567abca501953636c5d7737af75e2d128f13e3c51880711808a13588ad992956419f4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 998206n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001810453454e4420631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        spentBy: {
                            txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            outIdx: 0,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        spentBy: {
                            txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            outIdx: 1,
                        },
                        sats: 990397n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1720807527,
                size: 897,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 853000,
                    hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                    timestamp: 1720807766,
                },
                isFinal: true,
                parsed: {
                    recipients: [
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                    ],
                    satoshisSent: 0,
                    stackArray: [
                        '534c5000',
                        '81',
                        '53454e44',
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                        '0000000000000001',
                    ],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [
                        {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            renderedTxType: 'Fan Out',
                            renderedTokenType:
                                'Collection' as RenderedTokenType,
                            tokenSatoshis: '0',
                            nftFanInputsCreated: 0,
                        },
                    ],
                    replyAddress:
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                },
            },
            {
                txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '23b0d8651893382448b103eed760c0b3c6e428a231b5629d9f22632b66defb2e',
                            outIdx: 0,
                        },
                        inputScript:
                            '4120d5d5999c3e0ebe4396aa6057b351983dc7a670bbcc9ec9c4f28dda1be8dbec831ede7f150701bd303770db01bc0d960e3d266768d133cbbf5a521707537c304121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        sats: 1000000n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001810747454e4553495303434c5308436c6173736963730b636173687461622e636f6d20a6700396f7f7b6a49bf9517192d3264d3b22d7be37838a62cd5db77fd45865e00100010208000000000000000c',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 12n,
                        },
                        spentBy: {
                            txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                            outIdx: 0,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            isMintBaton: true,
                            entryIdx: 0,
                            atoms: 0n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        spentBy: {
                            txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                            outIdx: 1,
                        },
                        sats: 998206n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1720807524,
                size: 349,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        txType: 'GENESIS',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 853000,
                    hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                    timestamp: 1720807766,
                },
                isFinal: true,
                parsed: {
                    recipients: [
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                    ],
                    satoshisSent: 0,
                    stackArray: [
                        '534c5000',
                        '81',
                        '47454e45534953',
                        '434c53',
                        '436c617373696373',
                        '636173687461622e636f6d',
                        'a6700396f7f7b6a49bf9517192d3264d3b22d7be37838a62cd5db77fd45865e0',
                        '00',
                        '02',
                        '000000000000000c',
                    ],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [
                        {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            renderedTxType: 'GENESIS',
                            renderedTokenType:
                                'Collection' as RenderedTokenType,
                            tokenSatoshis: '12',
                        },
                    ],
                    replyAddress:
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                },
            },
            {
                txid: '23b0d8651893382448b103eed760c0b3c6e428a231b5629d9f22632b66defb2e',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '9a7b012baa01fea2c9e27f0a465408e219ad0f26db23309c61d04ead363d4575',
                            outIdx: 1,
                        },
                        inputScript:
                            '41ea2d035fdfc3b77791a80ccd401fb30f54fd70512d3df23ef3d94a94dcb835701b4d220894472e650ba520739ba9a59e6158e679fbdcbf60de22c803c563e682412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '9a7b012baa01fea2c9e27f0a465408e219ad0f26db23309c61d04ead363d4575',
                            outIdx: 2,
                        },
                        inputScript:
                            '412c425d632317ee99e4da76c5d6b611a36847628bb0de4e1ecdf8c0ff1e891e443e24fcf0a3c2a31021773a814c25476b4f9ed88fd78240bac41e978a14dcf63c412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 29321411n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        spentBy: {
                            txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            outIdx: 0,
                        },
                        sats: 1000000n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 28321597n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1720807368,
                size: 360,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 852997,
                    hash: '000000000000000005b14b96d1aa2b894ed26ed6b016bfcc61f03ac811f339c7',
                    timestamp: 1720807393,
                },
                isFinal: true,
                parsed: {
                    recipients: [
                        'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ],
                    satoshisSent: 0,
                    stackArray: [],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [],
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
        ],
    },
};

const walletWithCoinbaseUtxos: CashtabWallet = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    paths: new Map([
        [
            1899,
            {
                hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
                sk: fromHex(
                    '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
                ),
                pk: fromHex(
                    '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                ),
            },
        ],
        [
            145,
            {
                hash: 'a28f8852f868f88e71ec666c632d6f86e978f046',
                address: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
                wif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
                sk: fromHex(
                    '9747c0c6a6b4a1025b222a79ccad3df7330cbf3e6731de58500f865d0370b861',
                ),
                pk: fromHex(
                    '03939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5',
                ),
            },
        ],
        [
            245,
            {
                hash: '600efb12a6f813eccf13171a8bc62055212d8d6c',
                address: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
                wif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
                sk: fromHex(
                    'c3f637ba1e3cdd10cace41350058a3698c5bd413b69a358a2a2b955843ea043c',
                ),
                pk: fromHex(
                    '03f73fe2631da9732f2480debbc7ff8d99c5c06764e0f5095b789ff190788bee72',
                ),
            },
        ],
    ]) as CashtabWalletPaths,
    state: {
        balanceSats: 135000,
        slpUtxos: [],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                path: 1899,
                isFinal: true,
                sats: 25000n,
            },
            {
                outpoint: {
                    txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                path: 1899,
                isFinal: true,
                sats: 100000n,
            },
            {
                outpoint: {
                    txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                path: 1899,
                isFinal: true,
                sats: 10000n,
            },
        ],
        tokens: new Map([]),
        parsedTxHistory: [
            {
                txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'fcf45f6f12a4442bf206f85c87dfb7cfccdf438927fabbfe314a2c780545dcf9',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100aeb44fc17984a006f4b8e49f9dc16ff76e271f55fe75fe4f2709c5f5a91c92ff02205f47bc1ca7710b995ad6cae9a22c80069e2ac9e6669626f772b2e3c0c5ff6f084121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 2200n,
                    },
                    {
                        prevOut: {
                            txid: '716c97bcfa9d767cb87dbf2d299d23f27bb0347049d3889a6412fb98526c3b70',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100c29ab3a7ec5f69cedd6ba073a30d77f75e9dba1e77e8797feb4e1981fe903fb0022001097bfd1a5e3450449e792dea1eb2ed3f3d4b3dda56b1f4544b6bb59691760a4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 2386n,
                    },
                    {
                        prevOut: {
                            txid: 'f9fd51e480dd7d40baca983e3b45d10ecc4a07a15750494f7084eaea22c8f612',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221008ab50822933076fede7979f02e4b41c1d83b1a218323a5ead5e760c5b8dd6bae02203c49ba111d198b1aa105ce68ee501e3df4d1eecf1cbae28e8d940457c998a28c4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 5500n,
                    },
                    {
                        prevOut: {
                            txid: 'ae89158eccd6093ada449978871de8334ea3c325e773a9003221227cbb78da1f',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221008c673fa6b7800654c76bae593d47054af7f7e55c499ae6b2ed9d706c13eea86202207a420bfe68cf013aebbefa3e1083b995df5d79c2de4d5c4d15725b0beaa49e464121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 997345n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '4eb8f2270382980e1985af7aa5a63425125f8c0d72197bb430aa72815eed76b3',
                            outIdx: 0,
                        },
                        sats: 25000n,
                    },
                    {
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'b7b147ad7a85b3cf1345228c290f2a575349db6414abd709feff2ac2e3f1a351',
                            outIdx: 0,
                        },
                        sats: 981084n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 670,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 810531,
                    hash: '00000000000000001257eb97003265a3635ed133f1e7fe04e21d40b0237621a1',
                    timestamp: 1695161321,
                },
                parsed: {
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
                    satoshisSent: 25000,
                    stackArray: [],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [],
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                },
            },
            {
                txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '308a5c6d9cbe530def55baeea6c34e6b6e53facf52fafe12f9ee8e1abe6a8029',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100c1f4f37c3dd32f45b0a5042a52f65f9995bd29efc4900def1c4e66e2b951635002204576d13c7b408b2448f0e59c72d00980736fc6ef36caaea5d0985d85cf0c002a4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 3500n,
                    },
                    {
                        prevOut: {
                            txid: '352f2a055d7313b600fdb2d2924ab4b4dea470c24fe7bdaf156ac0367aca4dfa',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100e27f08f262bd57e2759e520ba163a567a5e68117cb0d046f60a9be2f7333cfac02203b5f5d94486539e3b4e878d9a1da25bc4acbe94cfd5d4d43b46b8bbf632c08cb4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 1800n,
                    },
                    {
                        prevOut: {
                            txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022059f32f5ced75706edbd7248819a6b9e06f99a9ddecf2f84ba128d4bc3ef375810220779ee139e20db79bea584ce82eab5c0614d26ec0f3cf47e5ec51251cfcdf21174121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 1800n,
                    },
                    {
                        prevOut: {
                            txid: 'cc2c0feb56671b8232e8675d9cea8a4c44fb9daf64746a06502a96eb238d1657',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100de9f59a300bd6379d1eb0f073b6e2ea4cdaaed4f3dd618f2d267a31546dc492a022003f0a5575bc263a33729c35203d41219eb3a81c9472d294b3cd910e5363fdad74121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 1800n,
                    },
                    {
                        prevOut: {
                            txid: '81fae250d66fd2010d31f72c17cf5c1c53f20a47f10d3597f8b5edc86521d37b',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100f7ffa0476ab950faaad4eec2572ef68fc103dae5c402ba35896d61864ff49afc022014673217f998c2b38e9fe2c65573d774c97159e7bc7ac226119235df5df9fb324121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 997348n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '0eb7807d5e228bf2b84d50e5631b51c87030de6d6bc36a9cf3cfb2c348c74b3c',
                            outIdx: 0,
                        },
                        sats: 10000n,
                    },
                    {
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'bc705e8fd366059799de27db6ac07e1354896fb653bb11ab8ae42b4dd08f2d5c',
                            outIdx: 0,
                        },
                        sats: 994603n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 817,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 810531,
                    hash: '00000000000000001257eb97003265a3635ed133f1e7fe04e21d40b0237621a1',
                    timestamp: 1695161321,
                },
                parsed: {
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
                    satoshisSent: 10000,
                    stackArray: [],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [],
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                },
            },
            {
                txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '18f3911d00eba0a611044cc86e614b2a0dda89c06d693b56b9fb48d25ad41b56',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100d7331695defe22f9f5b432500ae67250b27dd48e2ae19585905b0e552811d3aa0220687269ba5473285dcba4039d3df01cd3047b4123a55d66334ca560ff93abeab74121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        sats: 5000000n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '4eb8f2270382980e1985af7aa5a63425125f8c0d72197bb430aa72815eed76b3',
                            outIdx: 1,
                        },
                        sats: 100000n,
                    },
                    {
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'ef1b7ec808e1fc287147ec50bf7faa5440e84bc008b77cfbbe4355222b373c6e',
                            outIdx: 0,
                        },
                        sats: 4899545n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 226,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 810531,
                    hash: '00000000000000001257eb97003265a3635ed133f1e7fe04e21d40b0237621a1',
                    timestamp: 1695161321,
                },
                parsed: {
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
                    satoshisSent: 100000,
                    stackArray: [],
                    xecTxType: 'Received' as XecTxType,
                    appActions: [],
                    parsedTokenEntries: [],
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                },
            },
        ],
    },
};

// Create a wallet with utxos at multiple addresses
const utxosAtManyAddressesWallet = cashtabWalletFromJSON(
    JSON.parse(JSON.stringify(cashtabWalletToJSON(wallet))),
);
const multiAddressUtxos = [
    {
        outpoint: {
            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        isFinal: true,
        path: 145,
        sats: 25000n,
    },
    {
        outpoint: {
            txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        isFinal: true,
        path: 245,
        sats: 100000n,
    },
    {
        outpoint: {
            txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        isFinal: true,
        path: 1899,
        sats: 10000n,
    },
];
utxosAtManyAddressesWallet.state.nonSlpUtxos = multiAddressUtxos;

// Create a wallet with very large utxos
const TOTAL_ECASH_SUPPLY_SATS = 2100000000000000n;
const allTheXecWallet = cashtabWalletFromJSON(
    JSON.parse(JSON.stringify(cashtabWalletToJSON(wallet))),
);
const largeUtxo = {
    outpoint: {
        txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
        outIdx: 0,
    },
    blockHeight: -1,
    isCoinbase: false,
    isFinal: true,
    sats: TOTAL_ECASH_SUPPLY_SATS,
    path: 1899,
};

allTheXecWallet.state.nonSlpUtxos = [largeUtxo];
(allTheXecWallet as CashtabWallet).state.balanceSats = Number(largeUtxo.sats);

const walletWithTokensInNode: CashtabWallet = {
    mnemonic:
        'industry limit sense cruel neglect loud chase usual advance method talk come',
    name: 'SLP V1 Send',
    paths: new Map([
        [
            1899,
            {
                hash: 'c38232a045a85c84e5733d60e867dcee9ad4b18d',
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                wif: 'KyEQdr8GzqtwzHHB8kiaWLiUCWYGgz76t7gF2z9aSjWnsVikJZUX',
                sk: fromHex(
                    '3c0898e4d10337cb51a651fe3ff6653a5683cbe9ce1698094463e48372e9bbfb',
                ),
                pk: fromHex(
                    '03b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921',
                ),
            },
        ],
        [
            245,
            {
                hash: '3d97ee01c3d021c3efcf529c3136f7b8b86c1ed0',
                address: 'ecash:qq7e0mspc0gzrsl0eaffcvfk77utsmq76qnat0vlkj',
                wif: 'L4GFvCRSz8fbS64W7teTjnGbV5A8iPdz1GyPqHvAj8vxzqZjwZbw',
                sk: fromHex(
                    'd22c0fc1ca98add975c4574878c8b9e3a979af0d40b93f7f5dc3e03cf94f856d',
                ),
                pk: fromHex(
                    '02d4b1b5ee228995225af776e6f2425a2980b8718c23c560fe792c6403044f8454',
                ),
            },
        ],
        [
            145,
            {
                hash: '33a070d3931a4993207771ae1aa92aa05491e8b2',
                address: 'ecash:qqe6quxnjvdynyeqwac6ux4f92s9fy0gkg6ek2jtfh',
                wif: 'L5GHzdq3qfTmUKLxZ3fuvfu9yvgsQH3wWcXU2BfD3qp88RTXF88M',
                sk: fromHex(
                    'f007266ad2f28d93601e0cdaf32ce765b4c7c1f4d4a30bd4988435b510fa18ba',
                ),
                pk: fromHex(
                    '02ac09ff67b81aa631ff3e110f167af90f528d8c51b53feeb84eeb59c676da54d3',
                ),
            },
        ],
    ]) as CashtabWalletPaths,
    state: {
        balanceSats: 1000000,
        slpUtxos: [
            {
                outpoint: {
                    txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 1000000000n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 9999996998999999999n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 1000000000000n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 1n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 2000000000000n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
                sats: 546n,
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: 'a8652388d3a5d1fcaec435a89f1af19afa32b479815b0e4292eec0db9c1a454b',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: false,
                path: 1899,
                sats: 1000000n,
            },
        ],
        tokens: new Map([
            [
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                '10000000000',
            ],
        ]),
        parsedTxHistory: [],
    },
};

module.exports = {
    wallet,
    walletWithCoinbaseUtxos,
    utxosAtManyAddressesWallet,
    allTheXecWallet,
    walletWithTokensInNode,
};
