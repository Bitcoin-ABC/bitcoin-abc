// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabSettings } from 'config/cashtabSettings';

export const walletWithXecAndTokens = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    paths: [
        {
            // New shape of path info
            path: 1899,
            address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
            wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
        },
        {
            path: 145,
            address: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
            hash: 'a28f8852f868f88e71ec666c632d6f86e978f046',
            wif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
        },
        {
            path: 245,
            address: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
            hash: '600efb12a6f813eccf13171a8bc62055212d8d6c',
            wif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
        },
    ],
    state: {
        balanceSats: 951312,
        slpUtxos: [
            {
                outpoint: {
                    txid: '3b0760858b0b20ff50d0db67793892d29d2466b86a0116f7e232792da0c22330',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: 546,
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                tokenQty: '1',
                tokenId:
                    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                decimals: 0,
                isFinal: true,
                token: {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '1',
                    isMintBaton: false,
                },
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '218a1e058ed0fda76573eabf43ad3ded7e7192e42621893a60aaa152ba7f66fe',
                    outIdx: 2,
                },
                blockHeight: 815549,
                isCoinbase: false,
                value: 951312,
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                isFinal: true,
            },
        ],
        tokens: [
            {
                tokenId:
                    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                balance: '1',
                info: {
                    tokenTicker: 'BEAR',
                    tokenName: 'BearNip',
                    tokenDocumentUrl: 'https://cashtab.com/',
                    tokenDocumentHash: '',
                    decimals: 0,
                    success: true,
                },
            },
        ],
        parsedTxHistory: [
            {
                txid: '3b0760858b0b20ff50d0db67793892d29d2466b86a0116f7e232792da0c22330',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '119310063bb553f02efc3112ea171b251aae968f25a91d42dcd855958134e3be',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100b8699595913167f3abd5c6dde588fe9dd89e56e811436d0cc02e81a6623a93c1022043954f663eb37a4e0a7cb28bd8ff857d0913cc771832b0e7ccf2b2fbaa9f3ae0412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '30993d9a96b1ca91a7726450e6524c41c52cef1b75cb0b5b2e196dfa5b3bb1c6',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402205d3d1e7f83609498d7d7c18cfaa8f4c940c3e12608334b946744c423465cc9f002202199ac5b760c4eb27ee1bf28e94d8e42a6932709d73b387a760269ce2d73aa58412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 2200,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                            outIdx: 1,
                        },
                        inputScript:
                            '4730440220649bd38855be5a18bc3b373eec33d9420b9fde009548c79bcccd67a4bef37359022075f64385c0c40670bc03b268554dc7280f0b9dbffbf22c2cb4c76da4898ed1a0412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '888',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109080000000000000001080000000000000377',
                    },
                    {
                        value: 546,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        token: {
                            tokenId:
                                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        token: {
                            tokenId:
                                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '887',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: '7004e450f904fc46c75e86deb48c57438e8efd8142e7bac7efe225d775c5f135',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 1319,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '8f076ddab7bcbf37ec993e9b39e75ad1878e35654f380ea9f6f1ebd500711b27',
                            outIdx: 25,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 627,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
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
                parsed: {
                    incoming: true,
                    xecAmount: '5.46',
                    isEtokenTx: true,
                    etokenAmount: '1',
                    isTokenBurn: false,
                    tokenEntries: [
                        {
                            tokenId:
                                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
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
                    genesisInfo: {
                        tokenTicker: 'BEAR',
                        tokenName: 'BearNip',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 0,
                        success: true,
                    },
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: '',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                },
            },
            {
                txid: '218a1e058ed0fda76573eabf43ad3ded7e7192e42621893a60aaa152ba7f66fe',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '9f25f4e161472920f624ed6579ccdaf8d096263ab31e157deaa9c987269ead8a',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402201cfc6d40bb6a6ee8faae9a3d373742009fa30c6c02a0fcfe055079b62a65d582022013497e2ae6b417262680990ea5d03fe67ac25f7a2a79121fb9b0f633adf458274121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 952320,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a042e78656300066e6577746f6e15003a5fb236934ec078b4507c303d3afd82067f8fc1',
                    },
                    {
                        value: 553,
                        outputScript:
                            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                        spentBy: {
                            txid: '9cfd8cbe3235d04d6478f8b95f6206c7bf32029b36138a3cc28c3168042f602f',
                            outIdx: 83,
                        },
                    },
                    {
                        value: 951312,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '1898c151a8dc84edfbd8f254458226f13422220b5cd7f0ab4e956929218dd38a',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 268,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 815549,
                    hash: '00000000000000000ea3601057ba423805f91d9d813a41a91ae908b68ff6cbce',
                    timestamp: 1698187386,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '5.53',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'newton',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: true,
                },
            },
            {
                txid: '9f25f4e161472920f624ed6579ccdaf8d096263ab31e157deaa9c987269ead8a',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '42c39baded510db31aebaf9172d307afa199dd734a6189ea4bc3530438d715ca',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022040513dc15ce7601f937ea83a94a90fd55da07b6a2a95a344a3df63d34489985e022072bd23d71ab5502ee2f254cc58aa0bc2f499370f693f77b1bbb87fe3aaee66d44121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 953326,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a042e786563000d646f657374686973636c65617215003a5fb236934ec078b4507c303d3afd82067f8fc1',
                    },
                    {
                        value: 551,
                        outputScript:
                            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                        spentBy: {
                            txid: '4eb00ceabdebb4f6a4fd66d19f9f573c45fe5eb966cdd421eee07ba371771b6d',
                            outIdx: 222,
                        },
                    },
                    {
                        value: 952320,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '218a1e058ed0fda76573eabf43ad3ded7e7192e42621893a60aaa152ba7f66fe',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 275,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 814357,
                    hash: '000000000000000009004fa50065ef6deb091f0d075cf1ef01811d0706c9a8c2',
                    timestamp: 1697463218,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '5.51',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'doesthisclear',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: true,
                },
            },
            {
                txid: '42c39baded510db31aebaf9172d307afa199dd734a6189ea4bc3530438d715ca',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '5aa64624e493502d083089f5a58069887bc99a6d5569b27df7c7570e024bbf20',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402206feb284b4583db2ba6bd0a03cda7ac1571faec3f0f6ab996e4c8b2592726e626022066fe0a6d8887ba64ea7ac9a7472bc6e8ede63baeea3f7f7250e4aadfd9dfebf84121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 954332,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a042e7865630008776f726b736e6f7715003a5fb236934ec078b4507c303d3afd82067f8fc1',
                    },
                    {
                        value: 551,
                        outputScript:
                            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                        spentBy: {
                            txid: 'c7c58e59639f29c726752c57f19403f3855f25b758640a96adae4710e27b2eae',
                            outIdx: 17,
                        },
                    },
                    {
                        value: 953326,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '9f25f4e161472920f624ed6579ccdaf8d096263ab31e157deaa9c987269ead8a',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 270,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 813934,
                    hash: '00000000000000001533643253107df49b2291beb9d5cd5c7f4f51bf26572e53',
                    timestamp: 1697216026,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '5.51',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'worksnow',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: true,
                },
            },
            {
                txid: '5aa64624e493502d083089f5a58069887bc99a6d5569b27df7c7570e024bbf20',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'b26c42ba0cc48f0d3af442b445f19c267189f84dbeb7e366ec7c921f5195aca7',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402202bfc9d29d53f3e2a721472469d0c16726badb0534044e101b990b2413d6d37c80220321cfe15eeea3014012c082693f3ff49f6892b5fe96bc0b980195c7090af1d9a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 955341,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a042e7865630005746573743415003a5fb236934ec078b4507c303d3afd82067f8fc1',
                    },
                    {
                        value: 554,
                        outputScript:
                            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                        spentBy: {
                            txid: 'c7c58e59639f29c726752c57f19403f3855f25b758640a96adae4710e27b2eae',
                            outIdx: 5,
                        },
                    },
                    {
                        value: 954332,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '42c39baded510db31aebaf9172d307afa199dd734a6189ea4bc3530438d715ca',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 267,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 813923,
                    hash: '0000000000000000166ee88a29775a1098813f4316a5afbe835d21e0d74fda24',
                    timestamp: 1697211295,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '5.54',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'test4',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: true,
                },
            },
            {
                txid: 'b26c42ba0cc48f0d3af442b445f19c267189f84dbeb7e366ec7c921f5195aca7',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'f86f20336955bca4e15588d81d029ad2c0dfa498b8be6aced2b63ba3bea1be0a',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100952173ce8b1a2f5cc30be77cd32c6b285ff3f96d36ba0296082ca551204c578502201afcad7d0b2426e1c168c1a1b4a98c637a4c808a6c8fd35c298e9cb7cf6cdc474121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 956351,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a042e78656300047465737415003a5fb236934ec078b4507c303d3afd82067f8fc1',
                    },
                    {
                        value: 555,
                        outputScript:
                            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                        spentBy: {
                            txid: 'c7c58e59639f29c726752c57f19403f3855f25b758640a96adae4710e27b2eae',
                            outIdx: 2,
                        },
                    },
                    {
                        value: 955341,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '5aa64624e493502d083089f5a58069887bc99a6d5569b27df7c7570e024bbf20',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 267,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 813922,
                    hash: '00000000000000000a1807a17ebcda93947db968e9a112b54ec70237d1a76288',
                    timestamp: 1697211196,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '5.55',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'test',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: true,
                },
            },
            {
                txid: 'f86f20336955bca4e15588d81d029ad2c0dfa498b8be6aced2b63ba3bea1be0a',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'f17814a75dad000557f19a3a3f6fcc124ab7880292c9fad4c64dc034d5e46551',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022024d33fa299f1ce126fe5271e26c9fc9e60b10924e2f4aa5fda8bbd46547f0503022077bff168765403d1282f73b7cffd9643b9dd6854e7dbb3ba1f5897bd4a9f63304121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 957361,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a042e78656300047465737415003a5fb236934ec078b4507c303d3afd82067f8fc1',
                    },
                    {
                        value: 555,
                        outputScript:
                            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                        spentBy: {
                            txid: 'c7c58e59639f29c726752c57f19403f3855f25b758640a96adae4710e27b2eae',
                            outIdx: 3,
                        },
                    },
                    {
                        value: 956351,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: 'b26c42ba0cc48f0d3af442b445f19c267189f84dbeb7e366ec7c921f5195aca7',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 266,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 813922,
                    hash: '00000000000000000a1807a17ebcda93947db968e9a112b54ec70237d1a76288',
                    timestamp: 1697211196,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '5.55',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'test',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: true,
                },
            },
            {
                txid: 'f17814a75dad000557f19a3a3f6fcc124ab7880292c9fad4c64dc034d5e46551',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '7eacd3b752003fe761e359cac3d98b1faf4f1dd411150eabc89da8208a312b0e',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100e27a4f1c3521ae72c3b1970846616e3ac9f6048066e4566c2d03c1132fb414f50220750243534faa1603bade7c498d8e4390960a59451c858207f80f300f6a57c4534121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 958370,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a042e7865630005616c69617315003a5fb236934ec078b4507c303d3afd82067f8fc1',
                    },
                    {
                        value: 554,
                        outputScript:
                            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                        spentBy: {
                            txid: '8bda10d3e08120a0916c0bcc853d2ee0c0d8f7e03a45011d8cafb8fd0c400e50',
                            outIdx: 145,
                        },
                    },
                    {
                        value: 957361,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: 'f86f20336955bca4e15588d81d029ad2c0dfa498b8be6aced2b63ba3bea1be0a',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 268,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 813615,
                    hash: '000000000000000006b8990c77dd7a0d3a850a052b6f0bd60b82d44d1ffa7a55',
                    timestamp: 1697025138,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '5.54',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'alias',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: true,
                },
            },
            {
                txid: '7eacd3b752003fe761e359cac3d98b1faf4f1dd411150eabc89da8208a312b0e',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '8b3cb0e6c38ee01f9e1e98d611895ff2cd09ad9b4fea73f76f951be815278c26',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022076ae9639a9cfac3a4189c30eb1ac68daa75850407a2303cb297cc4b1a44a17db0220277681c0346c1b11eb312795c911619935aae6d50d4d03ef5e7dcc916fa28a3d4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 959379,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a042e7865630005616c69617315003a5fb236934ec078b4507c303d3afd82067f8fc1',
                    },
                    {
                        value: 554,
                        outputScript:
                            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                        spentBy: {
                            txid: '8bda10d3e08120a0916c0bcc853d2ee0c0d8f7e03a45011d8cafb8fd0c400e50',
                            outIdx: 144,
                        },
                    },
                    {
                        value: 958370,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: 'f17814a75dad000557f19a3a3f6fcc124ab7880292c9fad4c64dc034d5e46551',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 267,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 813615,
                    hash: '000000000000000006b8990c77dd7a0d3a850a052b6f0bd60b82d44d1ffa7a55',
                    timestamp: 1697025138,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '5.54',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'alias',
                    isCashtabMessage: false,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: true,
                },
            },
            {
                txid: '8b3cb0e6c38ee01f9e1e98d611895ff2cd09ad9b4fea73f76f951be815278c26',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '727a08ebbaef244d136ffb4ab8db256475db8a83cb2acbdfafa42617019d7dc7',
                            outIdx: 3,
                        },
                        inputScript:
                            '473044022037e2b4ac09f71432e97d71938dac7b5f0abcd84a8ea995708b0d58c38fcc743302207570250fe9f8b98b8f7079aafb1c53e796584efd910ed9f7e1f75f491f95e7564121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                        value: 962056,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript: '6a04007461620b7374696c6c20776f726b73',
                    },
                    {
                        value: 2200,
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        spentBy: {
                            txid: 'ba69815ef87cb48585a40968d6ff7764cbef4f021fdd015c5eb25afe75feb0a1',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 959379,
                        outputScript:
                            '76a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac',
                        spentBy: {
                            txid: '7eacd3b752003fe761e359cac3d98b1faf4f1dd411150eabc89da8208a312b0e',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 252,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 812408,
                    hash: '00000000000000000b2dfec91630d335b0233fb323a7acbb297b586d1d0d0678',
                    timestamp: 1696282475,
                },
                parsed: {
                    incoming: false,
                    xecAmount: '22',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage: 'still works',
                    isCashtabMessage: true,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                    aliasFlag: false,
                },
            },
        ],
    },
};

export const nonDefaultContactList = [
    {
        address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        name: 'test',
    },
];

export const nonDefaultCashtabCache = {
    tokens: new Map([
        [
            '1f6a65e7a4bde92c0a012de2bcf4007034504a765377cdf08a3ee01d1eaa6901',
            {
                decimals: 0,
                tokenDocumentHash: '',
                tokenDocumentUrl: '',
                tokenName: 'Burger',
                tokenTicker: '🍔',
            },
        ],
    ]),
};

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
            value: 546,
            sequenceNo: 4294967295,
            token: {
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                amount: '6',
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
            value: 3300,
            sequenceNo: 4294967295,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
        },
    ],
    outputs: [
        {
            value: 0,
            outputScript:
                '6a04534c500001010453454e4420b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7080000000000000001080000000000000005',
        },
        {
            value: 546,
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            token: {
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                amount: '1',
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            value: 546,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            token: {
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                amount: '5',
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            value: 1787,
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
            actualBurnAmount: '0',
            intentionalBurn: '0',
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
