// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Script, slpSend, fromHex } from 'ecash-lib';
import { AgoraOneshot, AgoraOffer } from 'ecash-agora';
import cashaddr from 'ecashaddrjs';

export const nftMarketWallet = {
    state: {
        balanceSats: 987865,
        slpUtxos: [
            {
                outpoint: {
                    txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    outIdx: 2,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '0',
                    isMintBaton: true,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 2,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 3,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 4,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 5,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 6,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 7,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 8,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 9,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 10,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 11,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 12,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
                path: 1899,
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '0d029d72aa24838081385357738be213ef01693323dfecd090976b358be5cbb6',
                    outIdx: 2,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 1754,
                isFinal: true,
                path: 1899,
            },
            {
                outpoint: {
                    txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                    outIdx: 2,
                },
                blockHeight: 853000,
                isCoinbase: false,
                value: 986111,
                isFinal: true,
                path: 1899,
            },
        ],
        tokens: new Map([
            [
                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                '11',
            ],
        ]),
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
                        value: 3000,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                number: 65,
                            },
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            'a914288ba6fc83cb1705322d0e7f5e72bd709947992f87',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001410453454e44209f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794080000000000000001',
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 1754,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1720807732,
                size: 348,
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
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                        groupTokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
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
                    xecTxType: 'Received',
                    satoshisSent: 1754,
                    stackArray: [
                        '534c5000',
                        '41',
                        '53454e44',
                        '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                        '0000000000000001',
                    ],
                    recipients: [
                        'ecash:pz3dhqpgk02fq3sv3hurf5j5kvw49ql0ks2eyjpcy0',
                    ],
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
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                number: 65,
                            },
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                    {
                        prevOut: {
                            txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            outIdx: 2,
                        },
                        inputScript:
                            '419c31be3f9da26b5391fa8ff3d9eab63d773281f58a37cafcf50bddc178b5ed53b9e81c83392cd49e66e037df893c3820fd29cd2680e3aecb46c5bb3825bac8ff4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        value: 989414,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001410453454e44209f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794080000000000000001',
                    },
                    {
                        value: 3000,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: '0d029d72aa24838081385357738be213ef01693323dfecd090976b358be5cbb6',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 986111,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1720807731,
                size: 422,
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
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                        groupTokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
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
                    xecTxType: 'Sent',
                    satoshisSent: 3000,
                    stackArray: [
                        '534c5000',
                        '41',
                        '53454e44',
                        '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                        '0000000000000001',
                    ],
                    recipients: [
                        'ecash:pq5ghfhus093wpfj95887hnjh4cfj3ue9uz40ydh0e',
                    ],
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
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 1,
                        },
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                    {
                        prevOut: {
                            txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                            outIdx: 13,
                        },
                        inputScript:
                            '41fe365a742dd691ac847bd2919cc4e15a2d5fa7753c3e9091efe101e9c507ee209c8389999f3872a74181b3abd079601144b3c7d073a2c035f41cac2c95575b4f4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        value: 990397,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001410747454e45534953063639463235300e3139363920466f7264204632353023656e2e77696b6970656469612e6f72672f77696b692f466f72645f462d53657269657320462840cc9a384225f46225ef5179a3cb1becbbf2920f7420ab37da4a5bcf8bb101004c00080000000000000001',
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 989414,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        spentBy: {
                            txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                            outIdx: 1,
                        },
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                        groupTokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
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
                    xecTxType: 'Sent',
                    satoshisSent: 989960,
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
                    recipients: [],
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
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            amount: '12',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                    {
                        prevOut: {
                            txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            outIdx: 3,
                        },
                        inputScript:
                            '4132d71a9e6e757b8952b627f0b52675af242f36065e704fda499c6b5265c2567abca501953636c5d7737af75e2d128f13e3c51880711808a13588ad992956419f4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                        value: 998206,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001810453454e4420631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001',
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 990397,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        spentBy: {
                            txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                            outIdx: 1,
                        },
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
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
                    xecTxType: 'Sent',
                    satoshisSent: 996949,
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
                    recipients: [],
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
                        value: 1000000,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001810747454e4553495303434c5308436c6173736963730b636173687461622e636f6d20a6700396f7f7b6a49bf9517192d3264d3b22d7be37838a62cd5db77fd45865e00100010208000000000000000c',
                    },
                    {
                        value: 546,
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
                            amount: '12',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '0',
                            isMintBaton: true,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 998206,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        spentBy: {
                            txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                            outIdx: 1,
                        },
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
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
                    xecTxType: 'Sent',
                    satoshisSent: 999298,
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
                    recipients: [],
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
                        value: 546,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        prevOut: {
                            txid: '9a7b012baa01fea2c9e27f0a465408e219ad0f26db23309c61d04ead363d4575',
                            outIdx: 2,
                        },
                        inputScript:
                            '412c425d632317ee99e4da76c5d6b611a36847628bb0de4e1ecdf8c0ff1e891e443e24fcf0a3c2a31021773a814c25476b4f9ed88fd78240bac41e978a14dcf63c412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        value: 29321411,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                outputs: [
                    {
                        value: 1000000,
                        outputScript:
                            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                        spentBy: {
                            txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 28321597,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
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
                parsed: {
                    xecTxType: 'Received',
                    satoshisSent: 1000000,
                    stackArray: [],
                    recipients: [
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ],
                },
            },
        ],
    },
    mnemonic:
        'awake task silly salmon always lonely illegal canal narrow soda hip flat',
    paths: new Map([
        [
            1899,
            {
                address: 'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
                hash: '7ecc1fb4c9139badd227291299d0c58ad73f1f08',
                wif: 'KwtGQrgQV63tr8zHSLSYZ5Ckfdi6K8VbagnfuaaJMDF41sPocxFU',
            },
        ],
    ]),
    name: 'NFT Trading [BURNED]',
};

const nftMarketWalletPublicKey = new Uint8Array([
    3, 136, 119, 246, 173, 183, 173, 189, 183, 234, 3, 180, 49, 233, 205, 153,
    111, 5, 249, 236, 104, 75, 159, 31, 174, 61, 212, 171, 117, 108, 47, 113,
    222,
]);

// NFTs with necessary mock data
const SLP_ONE_TOKEN_NUMBER = 65;
const BASE_AGORA_OFFER_TOKEN = {
    amount: '1',
    isMintBaton: false,
    tokenId: '0000000000000000000000000000000000000000000000000000000000000000',
    tokenType: {
        number: SLP_ONE_TOKEN_NUMBER,
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
    },
};

// SATURN FIVE (Saturn V)
export const saturnFive = {
    groupTokenId:
        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
    tokenId: 'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
    listPriceSatoshis: 100000,
    sellerAddress: 'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
    cancelPk: nftMarketWalletPublicKey,
    outpoint: {
        outIdx: 1,
        txid: 'dc85418411897d28cec4a3ef817424f03006b52ae3cf9503caaa5b27a87e02c0',
    },
    groupCache: {
        genesisInfo: {
            tokenTicker: 'CLS',
            tokenName: 'Classics',
            url: 'cashtab.com',
            decimals: 0,
            hash: 'a6700396f7f7b6a49bf9517192d3264d3b22d7be37838a62cd5db77fd45865e0',
        },
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
            number: 129,
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
        ],
        genesisSupply: '12',
        timeFirstSeen: 0,
    },
    cache: {
        genesisInfo: {
            tokenTicker: 'S5',
            tokenName: 'Saturn V',
            url: 'en.wikipedia.org/wiki/Saturn_V',
            decimals: 0,
            hash: 'ce2f92283c966e1e0f98ecf79b5a9122aac5e32cb865ecf1953820710ee62969',
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
        ],
        genesisSupply: '1',
        groupTokenId:
            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
        timeFirstSeen: 0,
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        },
    },
};

const saturnFiveEnforcedOutputs = [
    {
        value: BigInt(0),
        script: slpSend(saturnFive.groupTokenId, SLP_ONE_TOKEN_NUMBER, [
            0,
            BigInt(1),
        ]),
    },
    {
        value: saturnFive.listPriceSatoshis,
        script: Script.p2pkh(
            fromHex(cashaddr.decode(saturnFive.sellerAddress, true).hash),
        ),
    },
];
const saturnFiveOneshot = new AgoraOneshot({
    enforcedOutputs: saturnFiveEnforcedOutputs,
    cancelPk: saturnFive.cancelPk,
});
export const saturnFiveAgoraOffer = new AgoraOffer({
    variant: {
        type: 'ONESHOT',
        params: saturnFiveOneshot,
    },
    outpoint: saturnFive.outpoint,
    txBuilderInput: {
        prevOut: saturnFive.outpoint,
        signData: {
            value: 546,
            redeemScript: saturnFiveOneshot.script(),
        },
    },
    token: { ...BASE_AGORA_OFFER_TOKEN, tokenId: saturnFive.tokenId },
});

// Flags
export const transvaal = {
    groupTokenId:
        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
    tokenId: 'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
    listPriceSatoshis: 6487200,
    sellerAddress: 'ecash:pqwc89dgxj293aqzh8k30dd2t8stckhzmqklh8l2zp',
    cancelPk: new Uint8Array(33),
    outpoint: {
        outIdx: 1,
        txid: '337617019dbe046ba8e3597b8240e3f9d303a504ca88b98346fded8784794347',
    },
    groupCache: {
        genesisInfo: {
            tokenTicker: 'FLAGS',
            tokenName: 'Flags',
            url: 'cashtab.com',
            decimals: 0,
            hash: '10b8a6aa2fa7b6dd9ebae9018851bf25bd84c14c80de3ee2bfd0badef668b90c',
        },
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
            number: 129,
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '190',
        timeFirstSeen: 0,
    },
    cache: {
        genesisInfo: {
            tokenTicker: 'TT3',
            tokenName: 'Transvaal Take 3',
            url: 'https://en.wikipedia.org/wiki/South_African_Republic',
            decimals: 0,
            hash: '77d7ee52d03d81a5b7b9acee2f7854a7f9fb287f94103c8fddb388742a24fe7c',
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '1',
        groupTokenId:
            '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
        timeFirstSeen: 0,
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        },
    },
};
const transvaalEnforcedOutputs = [
    {
        value: BigInt(0),
        script: slpSend(transvaal.groupTokenId, SLP_ONE_TOKEN_NUMBER, [
            0,
            BigInt(1),
        ]),
    },
    {
        value: transvaal.listPriceSatoshis,
        script: Script.p2pkh(
            fromHex(cashaddr.decode(transvaal.sellerAddress, true).hash),
        ),
    },
];
const transvaalOneshot = new AgoraOneshot({
    enforcedOutputs: transvaalEnforcedOutputs,
    cancelPk: transvaal.cancelPk,
});
export const transvaalAgoraOffer = new AgoraOffer({
    variant: {
        type: 'ONESHOT',
        params: transvaalOneshot,
    },
    outpoint: transvaal.outpoint,
    txBuilderInput: {
        prevOut: transvaal.outpoint,
        signData: {
            value: 546,
            redeemScript: transvaalOneshot.script(),
        },
    },
    token: { ...BASE_AGORA_OFFER_TOKEN, tokenId: transvaal.tokenId },
});

export const argentina = {
    groupTokenId:
        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
    tokenId: 'c64ff2282ccb00ee21e1c02a4801e53c246250459d03b7c824305538ebab73d3',
    listPriceSatoshis: 30000,
    sellerAddress: 'ecash:pzq3s6ghhvxxn9a4m0vartygt2ukxqrm5g8u0uwt9m',
    cancelPk: new Uint8Array(33),
    outpoint: {
        outIdx: 1,
        txid: '394d0464d623bdc6267c7e8766d4e56aab7e1d5ecf5f56d7fb29d3787b7035d7',
    },
    groupCache: {
        genesisInfo: {
            tokenTicker: 'FLAGS',
            tokenName: 'Flags',
            url: 'cashtab.com',
            decimals: 0,
            hash: '10b8a6aa2fa7b6dd9ebae9018851bf25bd84c14c80de3ee2bfd0badef668b90c',
        },
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
            number: 129,
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '190',
        timeFirstSeen: 0,
    },
    cache: {
        genesisInfo: {
            tokenTicker: 'ARG',
            tokenName: 'Argentina',
            url: 'https://en.wikipedia.org/wiki/Argentina',
            decimals: 0,
            hash: '0fff95599be8fbcafeccc403b7255931174b178e9742c823ce42901515eae4cb',
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '1',
        groupTokenId:
            '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
        timeFirstSeen: 0,
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        },
    },
};
const argentinaEnforcedOutputs = [
    {
        value: BigInt(0),
        script: slpSend(argentina.groupTokenId, SLP_ONE_TOKEN_NUMBER, [
            0,
            BigInt(1),
        ]),
    },
    {
        value: argentina.listPriceSatoshis,
        script: Script.p2pkh(
            fromHex(cashaddr.decode(argentina.sellerAddress, true).hash),
        ),
    },
];
const argentinaOneshot = new AgoraOneshot({
    enforcedOutputs: argentinaEnforcedOutputs,
    cancelPk: argentina.cancelPk,
});
export const argentinaAgoraOffer = new AgoraOffer({
    variant: {
        type: 'ONESHOT',
        params: argentinaOneshot,
    },
    outpoint: argentina.outpoint,
    txBuilderInput: {
        prevOut: argentina.outpoint,
        signData: {
            value: 546,
            redeemScript: argentinaOneshot.script(),
        },
    },
    token: { ...BASE_AGORA_OFFER_TOKEN, tokenId: argentina.tokenId },
});

// We make this SLP Partial offer to prove we filter it out if one happens to
// somehow exist
// It's not expected for Partial offer to possibly be indexed by group token id,
// but one could reasonably be expected to be indexed by makerPk
export const mockPartial = {
    groupTokenId:
        '0123456789012345678901234567890123456789012345678901234567890123',
    tokenId: '0023456789012345678901234567890123456789012345678901234567890123',
    listPriceSatoshis: 50000,
    sellerAddress: 'ecash:pzq3s6ghhvxxn9a4m0vartygt2ukxqrm5g8u0uwt9m',
    cancelPk: new Uint8Array(33),
    outpoint: {
        outIdx: 1,
        txid: '394d0464d623bdc6267c7e8766d4e56aab7e1d5ecf5f56d7fb29d3787b7035d7',
    },
    groupCache: {
        genesisInfo: {
            tokenTicker: 'TEST',
            tokenName: 'Test',
            url: 'cashtab.com',
            decimals: 0,
            hash: '0123456789012345678901234567890123456789012345678901234567890123',
        },
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
            number: 129,
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '222',
        timeFirstSeen: 0,
    },
    cache: {
        genesisInfo: {
            tokenTicker: 'ALPHA',
            tokenName: 'Alpha',
            url: 'https://en.wikipedia.org/wiki/Alpha',
            decimals: 0,
            hash: '0023456789012345678901234567890123456789012345678901234567890123',
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '1000',
        groupTokenId:
            '0123456789012345678901234567890123456789012345678901234567890123',
        timeFirstSeen: 0,
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        },
    },
};
const mockPartialEnforcedOutputs = [
    {
        value: BigInt(0),
        script: slpSend(mockPartial.groupTokenId, SLP_ONE_TOKEN_NUMBER, [
            0,
            BigInt(1),
        ]),
    },
    {
        value: mockPartial.listPriceSatoshis,
        script: Script.p2pkh(
            fromHex(cashaddr.decode(mockPartial.sellerAddress, true).hash),
        ),
    },
];
const mockPartialOneshot = new AgoraOneshot({
    enforcedOutputs: mockPartialEnforcedOutputs,
    cancelPk: mockPartial.cancelPk,
});
export const mockPartialAgoraOffer = new AgoraOffer({
    variant: {
        type: 'PARTIAL',
        params: mockPartialOneshot,
    },
    outpoint: mockPartial.outpoint,
    txBuilderInput: {
        prevOut: mockPartial.outpoint,
        signData: {
            value: 546,
            redeemScript: mockPartialOneshot.script(),
        },
    },
    token: { ...BASE_AGORA_OFFER_TOKEN, tokenId: mockPartial.tokenId },
});

// Mocks for caching market-listed NFT
export const transvaalCacheMocks = {
    token: {
        tokenId:
            'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        },
        timeFirstSeen: 1720011598,
        genesisInfo: {
            tokenTicker: 'TT3',
            tokenName: 'Transvaal Take 3',
            url: 'https://en.wikipedia.org/wiki/South_African_Republic',
            decimals: 0,
            hash: '77d7ee52d03d81a5b7b9acee2f7854a7f9fb287f94103c8fddb388742a24fe7c',
        },
        block: {
            height: 851692,
            hash: '000000000000000000249e7811d0d2c7993b2937ccf3c63048915270f2634476',
            timestamp: 1720012233,
        },
    },
    tx: {
        txid: 'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a041ad156aef884e1105dd336b8706668d92d7c57d825d516dba925eec6d02fd',
                    outIdx: 4,
                },
                inputScript:
                    '4138c4cff3f131d88c4e5fba05a167f6f97a407cf31a18db0d51edeff88f9cba335e9008f5e4fe7835a6f58b5026c3ecca324f3b0cb66cd4a18be33bc9497d661d41210303c463774d543f31cb8daedc2610e25f62f6e59868e01533a71765896de2c71d',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 1,
                },
                outputScript:
                    '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
            },
            {
                prevOut: {
                    txid: '322d2d6a5c29c1cd76abe42fd99efc40bec5a589cc66945ecc13ff44a8cf5261',
                    outIdx: 2,
                },
                inputScript:
                    '415243db55d77bec4e135a67b020a30b00a82835f3a06f36f38f98c03f960d77fa56741685514687433602c23ad651580f6250236280fe2bc16023863886eb23e341210303c463774d543f31cb8daedc2610e25f62f6e59868e01533a71765896de2c71d',
                value: 1239962,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001410747454e4553495303545433105472616e737661616c2054616b6520333468747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f536f7574685f4166726963616e5f52657075626c69632077d7ee52d03d81a5b7b9acee2f7854a7f9fb287f94103c8fddb388742a24fe7c01004c00080000000000000001',
            },
            {
                value: 546,
                outputScript:
                    '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                token: {
                    tokenId:
                        'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'bc83e442270acb0d3206de2af7a1f07b52a6090a7d4b7b008fd0fdbc14a234ca',
                    outIdx: 0,
                },
            },
            {
                value: 1238946,
                outputScript:
                    '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                spentBy: {
                    txid: 'bc83e442270acb0d3206de2af7a1f07b52a6090a7d4b7b008fd0fdbc14a234ca',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1720011598,
        size: 505,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
                groupTokenId:
                    '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
            },
            {
                tokenId:
                    '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'NONE',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 851692,
            hash: '000000000000000000249e7811d0d2c7993b2937ccf3c63048915270f2634476',
            timestamp: 1720012233,
        },
    },
};
