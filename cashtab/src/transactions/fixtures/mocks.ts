// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { cashtabWalletToJSON, cashtabWalletFromJSON } from 'helpers';
import { CashtabWallet, CashtabWalletPaths } from 'wallet';
import { fromHex } from 'ecash-lib';
import { XecTxType } from 'chronik';

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
                value: 25000,
                path: 1899,
            },
            {
                outpoint: {
                    txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: true,
                value: 100000,
                path: 1899,
            },
            {
                outpoint: {
                    txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: true,
                value: 10000,
                path: 1899,
            },
        ],
        tokens: new Map(),
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
                        value: 2200,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: '716c97bcfa9d767cb87dbf2d299d23f27bb0347049d3889a6412fb98526c3b70',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100c29ab3a7ec5f69cedd6ba073a30d77f75e9dba1e77e8797feb4e1981fe903fb0022001097bfd1a5e3450449e792dea1eb2ed3f3d4b3dda56b1f4544b6bb59691760a4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 2386,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: 'f9fd51e480dd7d40baca983e3b45d10ecc4a07a15750494f7084eaea22c8f612',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221008ab50822933076fede7979f02e4b41c1d83b1a218323a5ead5e760c5b8dd6bae02203c49ba111d198b1aa105ce68ee501e3df4d1eecf1cbae28e8d940457c998a28c4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 5500,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: 'ae89158eccd6093ada449978871de8334ea3c325e773a9003221227cbb78da1f',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221008c673fa6b7800654c76bae593d47054af7f7e55c499ae6b2ed9d706c13eea86202207a420bfe68cf013aebbefa3e1083b995df5d79c2de4d5c4d15725b0beaa49e464121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 997345,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                outputs: [
                    {
                        value: 25000,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '4eb8f2270382980e1985af7aa5a63425125f8c0d72197bb430aa72815eed76b3',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 981084,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'b7b147ad7a85b3cf1345228c290f2a575349db6414abd709feff2ac2e3f1a351',
                            outIdx: 0,
                        },
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
                    xecTxType: XecTxType.Received,
                    satoshisSent: 25000,
                    stackArray: [],
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
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
                        value: 3500,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: '352f2a055d7313b600fdb2d2924ab4b4dea470c24fe7bdaf156ac0367aca4dfa',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100e27f08f262bd57e2759e520ba163a567a5e68117cb0d046f60a9be2f7333cfac02203b5f5d94486539e3b4e878d9a1da25bc4acbe94cfd5d4d43b46b8bbf632c08cb4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 1800,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022059f32f5ced75706edbd7248819a6b9e06f99a9ddecf2f84ba128d4bc3ef375810220779ee139e20db79bea584ce82eab5c0614d26ec0f3cf47e5ec51251cfcdf21174121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 1800,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: 'cc2c0feb56671b8232e8675d9cea8a4c44fb9daf64746a06502a96eb238d1657',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100de9f59a300bd6379d1eb0f073b6e2ea4cdaaed4f3dd618f2d267a31546dc492a022003f0a5575bc263a33729c35203d41219eb3a81c9472d294b3cd910e5363fdad74121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 1800,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: '81fae250d66fd2010d31f72c17cf5c1c53f20a47f10d3597f8b5edc86521d37b',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100f7ffa0476ab950faaad4eec2572ef68fc103dae5c402ba35896d61864ff49afc022014673217f998c2b38e9fe2c65573d774c97159e7bc7ac226119235df5df9fb324121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 997348,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                outputs: [
                    {
                        value: 10000,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '0eb7807d5e228bf2b84d50e5631b51c87030de6d6bc36a9cf3cfb2c348c74b3c',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 994603,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'bc705e8fd366059799de27db6ac07e1354896fb653bb11ab8ae42b4dd08f2d5c',
                            outIdx: 0,
                        },
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
                    xecTxType: XecTxType.Received,
                    satoshisSent: 10000,
                    stackArray: [],
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
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
                        value: 5000000,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                outputs: [
                    {
                        value: 100000,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '4eb8f2270382980e1985af7aa5a63425125f8c0d72197bb430aa72815eed76b3',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 4899545,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'ef1b7ec808e1fc287147ec50bf7faa5440e84bc008b77cfbbe4355222b373c6e',
                            outIdx: 0,
                        },
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
                    xecTxType: XecTxType.Received,
                    satoshisSent: 100000,
                    stackArray: [],
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
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
                value: 25000,
                path: 1899,
                isFinal: true,
            },
            {
                outpoint: {
                    txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                value: 100000,
                path: 1899,
                isFinal: true,
            },
            {
                outpoint: {
                    txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                value: 10000,
                path: 1899,
                isFinal: true,
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
                        value: 2200,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: '716c97bcfa9d767cb87dbf2d299d23f27bb0347049d3889a6412fb98526c3b70',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100c29ab3a7ec5f69cedd6ba073a30d77f75e9dba1e77e8797feb4e1981fe903fb0022001097bfd1a5e3450449e792dea1eb2ed3f3d4b3dda56b1f4544b6bb59691760a4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 2386,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: 'f9fd51e480dd7d40baca983e3b45d10ecc4a07a15750494f7084eaea22c8f612',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221008ab50822933076fede7979f02e4b41c1d83b1a218323a5ead5e760c5b8dd6bae02203c49ba111d198b1aa105ce68ee501e3df4d1eecf1cbae28e8d940457c998a28c4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 5500,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: 'ae89158eccd6093ada449978871de8334ea3c325e773a9003221227cbb78da1f',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221008c673fa6b7800654c76bae593d47054af7f7e55c499ae6b2ed9d706c13eea86202207a420bfe68cf013aebbefa3e1083b995df5d79c2de4d5c4d15725b0beaa49e464121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 997345,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                outputs: [
                    {
                        value: 25000,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '4eb8f2270382980e1985af7aa5a63425125f8c0d72197bb430aa72815eed76b3',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 981084,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'b7b147ad7a85b3cf1345228c290f2a575349db6414abd709feff2ac2e3f1a351',
                            outIdx: 0,
                        },
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
                    xecTxType: XecTxType.Received,
                    satoshisSent: 25000,
                    stackArray: [],
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
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
                        value: 3500,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: '352f2a055d7313b600fdb2d2924ab4b4dea470c24fe7bdaf156ac0367aca4dfa',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100e27f08f262bd57e2759e520ba163a567a5e68117cb0d046f60a9be2f7333cfac02203b5f5d94486539e3b4e878d9a1da25bc4acbe94cfd5d4d43b46b8bbf632c08cb4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 1800,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022059f32f5ced75706edbd7248819a6b9e06f99a9ddecf2f84ba128d4bc3ef375810220779ee139e20db79bea584ce82eab5c0614d26ec0f3cf47e5ec51251cfcdf21174121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 1800,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: 'cc2c0feb56671b8232e8675d9cea8a4c44fb9daf64746a06502a96eb238d1657',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100de9f59a300bd6379d1eb0f073b6e2ea4cdaaed4f3dd618f2d267a31546dc492a022003f0a5575bc263a33729c35203d41219eb3a81c9472d294b3cd910e5363fdad74121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 1800,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                    {
                        prevOut: {
                            txid: '81fae250d66fd2010d31f72c17cf5c1c53f20a47f10d3597f8b5edc86521d37b',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100f7ffa0476ab950faaad4eec2572ef68fc103dae5c402ba35896d61864ff49afc022014673217f998c2b38e9fe2c65573d774c97159e7bc7ac226119235df5df9fb324121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        value: 997348,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                outputs: [
                    {
                        value: 10000,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '0eb7807d5e228bf2b84d50e5631b51c87030de6d6bc36a9cf3cfb2c348c74b3c',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 994603,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'bc705e8fd366059799de27db6ac07e1354896fb653bb11ab8ae42b4dd08f2d5c',
                            outIdx: 0,
                        },
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
                    xecTxType: XecTxType.Received,
                    satoshisSent: 10000,
                    stackArray: [],
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
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
                        value: 5000000,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                outputs: [
                    {
                        value: 100000,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '4eb8f2270382980e1985af7aa5a63425125f8c0d72197bb430aa72815eed76b3',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 4899545,
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        spentBy: {
                            txid: 'ef1b7ec808e1fc287147ec50bf7faa5440e84bc008b77cfbbe4355222b373c6e',
                            outIdx: 0,
                        },
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
                    xecTxType: XecTxType.Received,
                    satoshisSent: 100000,
                    stackArray: [],
                    recipients: [
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    ],
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
        value: 25000,
        path: 145,
    },
    {
        outpoint: {
            txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        isFinal: true,
        value: 100000,
        path: 245,
    },
    {
        outpoint: {
            txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        isFinal: true,
        value: 10000,
        path: 1899,
    },
];
utxosAtManyAddressesWallet.state.nonSlpUtxos = multiAddressUtxos;

// Create a wallet with very large utxos
const TOTAL_ECASH_SUPPLY_SATS = 2100000000000000;
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
    value: TOTAL_ECASH_SUPPLY_SATS,
    path: 1899,
};

allTheXecWallet.state.nonSlpUtxos = [largeUtxo];
(allTheXecWallet as CashtabWallet).state.balanceSats = largeUtxo.value;

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
                value: 546,
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '1000000000',
                    isMintBaton: false,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
            },
            {
                outpoint: {
                    txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                    outIdx: 1,
                },
                value: 546,
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '9999996998999999999',
                    isMintBaton: false,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
            },
            {
                outpoint: {
                    txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                    outIdx: 1,
                },
                value: 546,
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '1000000000000',
                    isMintBaton: false,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
            },
            {
                outpoint: {
                    txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                    outIdx: 1,
                },
                value: 546,
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '1',
                    isMintBaton: false,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
            },
            {
                outpoint: {
                    txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                    outIdx: 1,
                },
                value: 546,
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '2000000000000',
                    isMintBaton: false,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                path: 1899,
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
                value: 1000000,
                path: 1899,
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
