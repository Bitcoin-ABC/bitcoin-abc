// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
// @generated

const wallet = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    Path245: {
        publicKey:
            '03f73fe2631da9732f2480debbc7ff8d99c5c06764e0f5095b789ff190788bee72',
        hash160: '600efb12a6f813eccf13171a8bc62055212d8d6c',
        cashAddress: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
        fundingWif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
    },
    Path145: {
        publicKey:
            '03939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5',
        hash160: 'a28f8852f868f88e71ec666c632d6f86e978f046',
        cashAddress: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
        fundingWif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
    },
    Path1899: {
        publicKey:
            '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
        hash160: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
        cashAddress: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
        fundingWif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '135000',
            totalBalance: '1350',
        },
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
    Path245: {
        publicKey:
            '03f73fe2631da9732f2480debbc7ff8d99c5c06764e0f5095b789ff190788bee72',
        hash160: '600efb12a6f813eccf13171a8bc62055212d8d6c',
        cashAddress: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
        fundingWif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
    },
    Path145: {
        publicKey:
            '03939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5',
        hash160: 'a28f8852f868f88e71ec666c632d6f86e978f046',
        cashAddress: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
        fundingWif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
    },
    Path1899: {
        publicKey:
            '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
        hash160: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
        cashAddress: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
        fundingWif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '135000',
            totalBalance: '1350',
        },
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
        address: wallet.Path145.cashAddress,
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
        address: wallet.Path245.cashAddress,
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
        address: wallet.Path1899.cashAddress,
    },
];
utxosAtManyAddressesWallet.state.nonSlpUtxos = multiAddressUtxos;

// Create a wallet that has a corrupted private key
// Not expected to ever happen in Cashtab
const walletWithInvalidPrivateKey = JSON.parse(JSON.stringify(wallet));
// Take a portion of a valid fundingWif to keep base58 chars
walletWithInvalidPrivateKey.Path1899.fundingWif =
    wallet.Path145.fundingWif.slice(0, 20);

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
allTheXecWallet.state.balances.totalBalanceInSatoshis =
    largeUtxo.value.toString();
allTheXecWallet.state.balances.totalBalance = (
    largeUtxo.value / 100
).toString();

module.exports = {
    wallet,
    walletWithCoinbaseUtxos,
    utxosAtManyAddressesWallet,
    walletWithInvalidPrivateKey,
    allTheXecWallet,
};
