// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const wallet = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    paths: [
        {
            path: 1899,
            hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
            address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
        },
        {
            path: 145,
            hash: 'a28f8852f868f88e71ec666c632d6f86e978f046',
            address: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
            wif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
        },
        {
            path: 245,
            hash: '600efb12a6f813eccf13171a8bc62055212d8d6c',
            address: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
            wif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
        },
    ],
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
                value: '25000',
                network: 'XEC',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            },
            {
                outpoint: {
                    txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: '100000',
                network: 'XEC',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            },
            {
                outpoint: {
                    txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: '10000',
                network: 'XEC',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            },
        ],
        tokens: [],
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
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '716c97bcfa9d767cb87dbf2d299d23f27bb0347049d3889a6412fb98526c3b70',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100c29ab3a7ec5f69cedd6ba073a30d77f75e9dba1e77e8797feb4e1981fe903fb0022001097bfd1a5e3450449e792dea1eb2ed3f3d4b3dda56b1f4544b6bb59691760a4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '2386',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'f9fd51e480dd7d40baca983e3b45d10ecc4a07a15750494f7084eaea22c8f612',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221008ab50822933076fede7979f02e4b41c1d83b1a218323a5ead5e760c5b8dd6bae02203c49ba111d198b1aa105ce68ee501e3df4d1eecf1cbae28e8d940457c998a28c4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '5500',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'ae89158eccd6093ada449978871de8334ea3c325e773a9003221227cbb78da1f',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221008c673fa6b7800654c76bae593d47054af7f7e55c499ae6b2ed9d706c13eea86202207a420bfe68cf013aebbefa3e1083b995df5d79c2de4d5c4d15725b0beaa49e464121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '997345',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '25000',
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                    {
                        value: '981084',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1695157689',
                size: 670,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '250',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    decryptionSuccess: false,
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    aliasFlag: false,
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
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '3500',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '352f2a055d7313b600fdb2d2924ab4b4dea470c24fe7bdaf156ac0367aca4dfa',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100e27f08f262bd57e2759e520ba163a567a5e68117cb0d046f60a9be2f7333cfac02203b5f5d94486539e3b4e878d9a1da25bc4acbe94cfd5d4d43b46b8bbf632c08cb4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '1800',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022059f32f5ced75706edbd7248819a6b9e06f99a9ddecf2f84ba128d4bc3ef375810220779ee139e20db79bea584ce82eab5c0614d26ec0f3cf47e5ec51251cfcdf21174121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '1800',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'cc2c0feb56671b8232e8675d9cea8a4c44fb9daf64746a06502a96eb238d1657',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100de9f59a300bd6379d1eb0f073b6e2ea4cdaaed4f3dd618f2d267a31546dc492a022003f0a5575bc263a33729c35203d41219eb3a81c9472d294b3cd910e5363fdad74121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '1800',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '81fae250d66fd2010d31f72c17cf5c1c53f20a47f10d3597f8b5edc86521d37b',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100f7ffa0476ab950faaad4eec2572ef68fc103dae5c402ba35896d61864ff49afc022014673217f998c2b38e9fe2c65573d774c97159e7bc7ac226119235df5df9fb324121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '997348',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '10000',
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                    {
                        value: '994603',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1695157684',
                size: 817,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '100',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    decryptionSuccess: false,
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    aliasFlag: false,
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
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '5000000',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '100000',
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                    {
                        value: '4899545',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1695157676',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '1000',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    decryptionSuccess: false,
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    aliasFlag: false,
                },
            },
        ],
    },
};

const walletWithCoinbaseUtxos = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    paths: [
        {
            path: 1899,
            hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
            address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
        },
        {
            path: 145,
            hash: 'a28f8852f868f88e71ec666c632d6f86e978f046',
            address: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
            wif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
        },
        {
            path: 245,
            hash: '600efb12a6f813eccf13171a8bc62055212d8d6c',
            address: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
            wif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
        },
    ],
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
                value: '25000',
                network: 'XEC',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            },
            {
                outpoint: {
                    txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                value: '100000',
                network: 'XEC',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            },
            {
                outpoint: {
                    txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                value: '10000',
                network: 'XEC',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            },
        ],
        tokens: [],
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
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '716c97bcfa9d767cb87dbf2d299d23f27bb0347049d3889a6412fb98526c3b70',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100c29ab3a7ec5f69cedd6ba073a30d77f75e9dba1e77e8797feb4e1981fe903fb0022001097bfd1a5e3450449e792dea1eb2ed3f3d4b3dda56b1f4544b6bb59691760a4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '2386',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'f9fd51e480dd7d40baca983e3b45d10ecc4a07a15750494f7084eaea22c8f612',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221008ab50822933076fede7979f02e4b41c1d83b1a218323a5ead5e760c5b8dd6bae02203c49ba111d198b1aa105ce68ee501e3df4d1eecf1cbae28e8d940457c998a28c4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '5500',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'ae89158eccd6093ada449978871de8334ea3c325e773a9003221227cbb78da1f',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221008c673fa6b7800654c76bae593d47054af7f7e55c499ae6b2ed9d706c13eea86202207a420bfe68cf013aebbefa3e1083b995df5d79c2de4d5c4d15725b0beaa49e464121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '997345',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '25000',
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                    {
                        value: '981084',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1695157689',
                size: 670,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '250',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    decryptionSuccess: false,
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    aliasFlag: false,
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
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '3500',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '352f2a055d7313b600fdb2d2924ab4b4dea470c24fe7bdaf156ac0367aca4dfa',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100e27f08f262bd57e2759e520ba163a567a5e68117cb0d046f60a9be2f7333cfac02203b5f5d94486539e3b4e878d9a1da25bc4acbe94cfd5d4d43b46b8bbf632c08cb4121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '1800',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022059f32f5ced75706edbd7248819a6b9e06f99a9ddecf2f84ba128d4bc3ef375810220779ee139e20db79bea584ce82eab5c0614d26ec0f3cf47e5ec51251cfcdf21174121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '1800',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'cc2c0feb56671b8232e8675d9cea8a4c44fb9daf64746a06502a96eb238d1657',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100de9f59a300bd6379d1eb0f073b6e2ea4cdaaed4f3dd618f2d267a31546dc492a022003f0a5575bc263a33729c35203d41219eb3a81c9472d294b3cd910e5363fdad74121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '1800',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '81fae250d66fd2010d31f72c17cf5c1c53f20a47f10d3597f8b5edc86521d37b',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100f7ffa0476ab950faaad4eec2572ef68fc103dae5c402ba35896d61864ff49afc022014673217f998c2b38e9fe2c65573d774c97159e7bc7ac226119235df5df9fb324121020d867a730bb6b55078d4eaf36fbf06d2a3867f81c20ad54925bcdd02ec914cbb',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '997348',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '10000',
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                    {
                        value: '994603',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1695157684',
                size: 817,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '100',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    decryptionSuccess: false,
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    aliasFlag: false,
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
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                        value: '5000000',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '100000',
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                    {
                        value: '4899545',
                        outputScript:
                            '76a9147f6df05119aa77f34cc54c8c3c0698bb5505f9f388ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1695157676',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '1000',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    decryptionSuccess: false,
                    replyAddress:
                        'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
                    aliasFlag: false,
                },
            },
        ],
    },
};

// Create a wallet with utxos at multiple addresses
const utxosAtManyAddressesWallet = JSON.parse(JSON.stringify(wallet));
const multiAddressUtxos = [
    {
        outpoint: {
            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '25000',
        network: 'XEC',
        address: wallet.paths.find(pathInfo => pathInfo.path === 145).address,
    },
    {
        outpoint: {
            txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '100000',
        network: 'XEC',
        address: wallet.paths.find(pathInfo => pathInfo.path === 245).address,
    },
    {
        outpoint: {
            txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        value: '10000',
        network: 'XEC',
        address: wallet.paths.find(pathInfo => pathInfo.path === 1899).address,
    },
];
utxosAtManyAddressesWallet.state.nonSlpUtxos = multiAddressUtxos;

// Create a wallet that has a corrupted private key
// Not expected to ever happen in Cashtab
const walletWithInvalidPrivateKey = JSON.parse(JSON.stringify(wallet));
// Take a portion of a valid wif to keep base58 chars
const badWifPath1899Info = walletWithInvalidPrivateKey.paths.find(
    pathInfo => pathInfo.path === 1899,
);
badWifPath1899Info.wif = badWifPath1899Info.wif.slice(0, 20);

// Create a wallet with very large utxos
const TOTAL_ECASH_SUPPLY_SATS = 2100000000000000;
const allTheXecWallet = JSON.parse(JSON.stringify(wallet));
const largeUtxo = {
    outpoint: {
        txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
        outIdx: 0,
    },
    blockHeight: -1,
    isCoinbase: false,
    value: TOTAL_ECASH_SUPPLY_SATS,
    network: 'XEC',
    address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
};

allTheXecWallet.state.nonSlpUtxos = [largeUtxo];
allTheXecWallet.state.balanceSats = largeUtxo.value;

const walletWithTokensNNG = {
    mnemonic:
        'industry limit sense cruel neglect loud chase usual advance method talk come',
    name: 'SLP V1 Send',
    paths: [
        {
            path: 245,
            hash: '3d97ee01c3d021c3efcf529c3136f7b8b86c1ed0',
            address: 'ecash:qq7e0mspc0gzrsl0eaffcvfk77utsmq76qnat0vlkj',
            wif: 'L4GFvCRSz8fbS64W7teTjnGbV5A8iPdz1GyPqHvAj8vxzqZjwZbw',
        },
        {
            path: 145,
            hash: '33a070d3931a4993207771ae1aa92aa05491e8b2',
            address: 'ecash:qqe6quxnjvdynyeqwac6ux4f92s9fy0gkg6ek2jtfh',
            wif: 'L5GHzdq3qfTmUKLxZ3fuvfu9yvgsQH3wWcXU2BfD3qp88RTXF88M',
        },
        {
            path: 1899,
            hash: 'c38232a045a85c84e5733d60e867dcee9ad4b18d',
            address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
            wif: 'KyEQdr8GzqtwzHHB8kiaWLiUCWYGgz76t7gF2z9aSjWnsVikJZUX',
        },
    ],
    state: {
        balanceSats: 1000000,
        slpUtxos: [
            {
                outpoint: {
                    txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                    outIdx: 1,
                },
                value: '546',
                slpToken: {
                    amount: '1000000000',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                tokenId:
                    'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                decimals: 9,
            },
            {
                outpoint: {
                    txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                    outIdx: 1,
                },
                value: '546',
                slpToken: {
                    amount: '9999996998999999999',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                tokenId:
                    'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                decimals: 9,
            },
            {
                outpoint: {
                    txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                    outIdx: 1,
                },
                value: '546',
                slpToken: {
                    amount: '1000000000000',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                tokenId:
                    'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                decimals: 9,
            },
            {
                outpoint: {
                    txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                    outIdx: 1,
                },
                value: '546',
                slpToken: {
                    amount: '1',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                tokenId:
                    'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                decimals: 9,
            },
            {
                outpoint: {
                    txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                    outIdx: 1,
                },
                value: '546',
                slpToken: {
                    amount: '2000000000000',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                tokenId:
                    'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                decimals: 9,
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
                value: '1000000',
                network: 'XEC',
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
            },
        ],
        tokens: [
            {
                tokenId:
                    'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                balance: '10000000000',
                info: {
                    tokenTicker: 'GYP',
                    tokenName: 'Gypsum',
                    tokenDocumentUrl: 'https://cashtab.com/',
                    tokenDocumentHash: '',
                    decimals: 9,
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    success: true,
                },
            },
        ],
        parsedTxHistory: [
            {
                txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100ceb9944c14afe98973ef992f7354176c4d69a450c54f7ef001a9f9d3467b245102200110a92afff6cf428e4485aa4caea9ae8f85736a0c080b7368a5c18eed6683a2412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '996966',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100cb80f3f550b156e831e4e218ee6f8bb81b0e7facccaf16e3099ca6d4b31859a7022041356550cc13c0b9aa637b37a782702be0920a7268e0b0c52341fe4a8edf9a60412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '9999996998999999999',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac72049d05e05ff',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '9999996998999999999',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '995283',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639492',
                size: 472,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '9999996998.999999999',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 3,
                        },
                        inputScript:
                            '473044022003bf568be89d447bfdfab1b6f2586133e0e27569b16f9ac3e8d93eeea1746be702200da28593898fed7032b41426149818323bd0e5abb22cbcd60adaf2574a05405d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '134890212',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402206694f3dc30bf4ff2013d7f6902d85053a063f85e2c4ce68f1ea6a25a0380fedc02205e0c1be8c0d141fc5dc8761d86060e276e5fdf2339c8240b63cf3d291175fc9d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '9999996999000000000',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14080000000000000001088ac72049d05e05ff',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '9999996998999999999',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '134888529',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639472',
                size: 479,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '1e-9',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                            outIdx: 3,
                        },
                        inputScript:
                            '483045022100d2394ffc424b491b82a27e82a5d99153795d255f2f4c40031dfbc214d486b9e402203f9c6b748a212e9bf937984182f884281a87270a864306446194e01d2671d8b3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '1617',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'a8652388d3a5d1fcaec435a89f1af19afa32b479815b0e4292eec0db9c1a454b',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100fd0dd11fb3162a397b42f54488de9f29f28b6176384baba2889124cba35793fe02202f45d16263187aa4c068b2d8e0f8475f3cc518d8f57185d68b48d0f416c131fc412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '134890576',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022065afcffea352cfb775f9a3bcd3d1d25b3dc2c5773298ba37019d36e8ae96473502203b0385838652155b3f4fe1dc507dbff522423517d9f1160fbab9134f0a34073b412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '9999997000000000000',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000003b9aca00088ac72049d05e0600',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '1000000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '9999996999000000000',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '134890212',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639461',
                size: 628,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '1',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402207d312fb88dba8ad2285178826ca57b30e3a64727e1e7a9c473111a549e92f6950220770fd156fb196afcb63ad6d3d266ce46c13bcc7bfb381372113bc95967b0b771412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '2157',
                        sequenceNo: 4294967295,
                        slpBurn: {
                            token: {
                                amount: '0',
                                isMintBaton: false,
                            },
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                        },
                    },
                    {
                        prevOut: {
                            txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100acda27b39cf752fbb41e860d7551cfc27ea44cda9a279ba3bc0080545db7d8c3022020ca59757f9dc049f4b4ef10a1a294092712f2e99a77ab21a206732a56896b71412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '9999999000000000000',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000001d1a94a2000088ac7204a0bf8d000',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '2000000000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '9999997000000000000',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 2,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639456',
                size: 446,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '2000',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '05fc5fc58afe190f75f1b502463e2f95ecbded0ccf10a37fe5bd0f66b8e3003a',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100d84dbf4ef413763051f2468b7eaeef52419a8e050666f140e4bab7c2529838660220635665b1c9ca17de5aa249152723c6fba413ab81fe0b16f8c5f658037ddcd27a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '3300',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022036b77275317f10df4a52d1b2eb053d0808b6afe354537e6d70f44b613a4c774e02206c0276b5c0fe5f1b35721c578671026141e61e10feeba13fd9b5b65eeb5daa04412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '10000000000000000000',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000e8d4a51000088ac7221bb542f000',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '1000000000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '9999999000000000000',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '1617',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639443',
                size: 480,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '1000',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: 'a8652388d3a5d1fcaec435a89f1af19afa32b479815b0e4292eec0db9c1a454b',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '9dcfef911a3c212c88d77d84e47d347d55b888b849e44c38abde5b1464b643dd',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221008ecf23a33c61d21d32ca524d0b39a49967a13d8dca238d629a86648865c7edd702200e39a3fde4b23521dc3d9dd2278246f4cb3811ea924a5945aaf983a1b4ede9dd412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '135891031',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1000000',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                    },
                    {
                        value: '134890576',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 1,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1708639237',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '10000',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    aliasFlag: false,
                },
            },
        ],
    },
};

const walletWithTokensInNode = {
    mnemonic:
        'industry limit sense cruel neglect loud chase usual advance method talk come',
    name: 'SLP V1 Send',
    paths: [
        {
            path: 1899,
            hash: 'c38232a045a85c84e5733d60e867dcee9ad4b18d',
            address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
            wif: 'KyEQdr8GzqtwzHHB8kiaWLiUCWYGgz76t7gF2z9aSjWnsVikJZUX',
        },
        {
            path: 245,
            hash: '3d97ee01c3d021c3efcf529c3136f7b8b86c1ed0',
            address: 'ecash:qq7e0mspc0gzrsl0eaffcvfk77utsmq76qnat0vlkj',
            wif: 'L4GFvCRSz8fbS64W7teTjnGbV5A8iPdz1GyPqHvAj8vxzqZjwZbw',
        },
        {
            path: 145,
            hash: '33a070d3931a4993207771ae1aa92aa05491e8b2',
            address: 'ecash:qqe6quxnjvdynyeqwac6ux4f92s9fy0gkg6ek2jtfh',
            wif: 'L5GHzdq3qfTmUKLxZ3fuvfu9yvgsQH3wWcXU2BfD3qp88RTXF88M',
        },
    ],
    state: {
        balanceSats: 1000000,
        slpUtxos: [
            {
                outpoint: {
                    txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                    outIdx: 1,
                },
                value: '546',
                token: {
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '1000000000',
                    isMintBaton: false,
                },
                // Note: the address is not provided by NNG or in-node, and is added by Cashtab
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
            },
            {
                outpoint: {
                    txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                    outIdx: 1,
                },
                value: '546',
                token: {
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '9999996998999999999',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
            },
            {
                outpoint: {
                    txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                    outIdx: 1,
                },
                value: '546',
                token: {
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '1000000000000',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
            },
            {
                outpoint: {
                    txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                    outIdx: 1,
                },
                value: '546',
                token: {
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '1',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
            },
            {
                outpoint: {
                    txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                    outIdx: 1,
                },
                value: '546',
                token: {
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    amount: '2000000000000',
                    isMintBaton: false,
                },
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
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
                value: '1000000',
                network: 'XEC',
                address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
            },
        ],
        tokens: [
            {
                tokenId:
                    'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                balance: '10000000000',
                info: {
                    tokenTicker: 'GYP',
                    tokenName: 'Gypsum',
                    tokenDocumentUrl: 'https://cashtab.com/',
                    tokenDocumentHash: '',
                    decimals: 9,
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    success: true,
                },
            },
        ],
        parsedTxHistory: [
            {
                txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100ceb9944c14afe98973ef992f7354176c4d69a450c54f7ef001a9f9d3467b245102200110a92afff6cf428e4485aa4caea9ae8f85736a0c080b7368a5c18eed6683a2412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '996966',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100cb80f3f550b156e831e4e218ee6f8bb81b0e7facccaf16e3099ca6d4b31859a7022041356550cc13c0b9aa637b37a782702be0920a7268e0b0c52341fe4a8edf9a60412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '9999996998999999999',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac72049d05e05ff',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '9999996998999999999',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '995283',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639492',
                size: 472,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '9999996998.999999999',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 3,
                        },
                        inputScript:
                            '473044022003bf568be89d447bfdfab1b6f2586133e0e27569b16f9ac3e8d93eeea1746be702200da28593898fed7032b41426149818323bd0e5abb22cbcd60adaf2574a05405d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '134890212',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402206694f3dc30bf4ff2013d7f6902d85053a063f85e2c4ce68f1ea6a25a0380fedc02205e0c1be8c0d141fc5dc8761d86060e276e5fdf2339c8240b63cf3d291175fc9d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '9999996999000000000',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14080000000000000001088ac72049d05e05ff',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '9999996998999999999',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '134888529',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639472',
                size: 479,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '1e-9',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                            outIdx: 3,
                        },
                        inputScript:
                            '483045022100d2394ffc424b491b82a27e82a5d99153795d255f2f4c40031dfbc214d486b9e402203f9c6b748a212e9bf937984182f884281a87270a864306446194e01d2671d8b3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '1617',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'a8652388d3a5d1fcaec435a89f1af19afa32b479815b0e4292eec0db9c1a454b',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100fd0dd11fb3162a397b42f54488de9f29f28b6176384baba2889124cba35793fe02202f45d16263187aa4c068b2d8e0f8475f3cc518d8f57185d68b48d0f416c131fc412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '134890576',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022065afcffea352cfb775f9a3bcd3d1d25b3dc2c5773298ba37019d36e8ae96473502203b0385838652155b3f4fe1dc507dbff522423517d9f1160fbab9134f0a34073b412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '9999997000000000000',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000003b9aca00088ac72049d05e0600',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '1000000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '9999996999000000000',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '134890212',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639461',
                size: 628,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '1',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402207d312fb88dba8ad2285178826ca57b30e3a64727e1e7a9c473111a549e92f6950220770fd156fb196afcb63ad6d3d266ce46c13bcc7bfb381372113bc95967b0b771412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '2157',
                        sequenceNo: 4294967295,
                        slpBurn: {
                            token: {
                                amount: '0',
                                isMintBaton: false,
                            },
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                        },
                    },
                    {
                        prevOut: {
                            txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100acda27b39cf752fbb41e860d7551cfc27ea44cda9a279ba3bc0080545db7d8c3022020ca59757f9dc049f4b4ef10a1a294092712f2e99a77ab21a206732a56896b71412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '9999999000000000000',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000001d1a94a2000088ac7204a0bf8d000',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '2000000000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '9999997000000000000',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 2,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639456',
                size: 446,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '2000',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '05fc5fc58afe190f75f1b502463e2f95ecbded0ccf10a37fe5bd0f66b8e3003a',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100d84dbf4ef413763051f2468b7eaeef52419a8e050666f140e4bab7c2529838660220635665b1c9ca17de5aa249152723c6fba413ab81fe0b16f8c5f658037ddcd27a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '3300',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022036b77275317f10df4a52d1b2eb053d0808b6afe354537e6d70f44b613a4c774e02206c0276b5c0fe5f1b35721c578671026141e61e10feeba13fd9b5b65eeb5daa04412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '10000000000000000000',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000e8d4a51000088ac7221bb542f000',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                        slpToken: {
                            amount: '1000000000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '9999999000000000000',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '1617',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                },
                timeFirstSeen: '1708639443',
                size: 480,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '1000',
                    isTokenBurn: false,
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    },
                    genesisInfo: {
                        tokenTicker: 'GYP',
                        tokenName: 'Gypsum',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 9,
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            },
            {
                txid: 'a8652388d3a5d1fcaec435a89f1af19afa32b479815b0e4292eec0db9c1a454b',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '9dcfef911a3c212c88d77d84e47d347d55b888b849e44c38abde5b1464b643dd',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221008ecf23a33c61d21d32ca524d0b39a49967a13d8dca238d629a86648865c7edd702200e39a3fde4b23521dc3d9dd2278246f4cb3811ea924a5945aaf983a1b4ede9dd412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '135891031',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1000000',
                        outputScript:
                            '76a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac',
                    },
                    {
                        value: '134890576',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                            outIdx: 1,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1708639237',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '10000',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    aliasFlag: false,
                },
            },
        ],
    },
};

module.exports = {
    wallet,
    walletWithCoinbaseUtxos,
    utxosAtManyAddressesWallet,
    walletWithInvalidPrivateKey,
    allTheXecWallet,
    walletWithTokensNNG,
    walletWithTokensInNode,
};
