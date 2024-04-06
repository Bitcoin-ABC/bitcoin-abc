// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const walletWithXecAndTokens_pre_2_1_0 = {
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
            totalBalanceInSatoshis: '951312',
            totalBalance: '9513.12',
        },
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
                tokenId:
                    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
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
                    url: 'https://cashtab.com/',
                    hash: '',
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
                        url: 'https://cashtab.com/',
                        hash: '',
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

export const walletWithXecAndTokens_pre_2_9_0 = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    // New paths key instead of hardcoded Path145, Path245, Path1899 keys
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
        // State for wallets after 2.2.0 expected to be in-node shape
        // Note: the legacy wallet had to be adapted to this state to support setting mocks
        balanceSats: 951312,
        slpUtxos: walletWithXecAndTokens_pre_2_1_0.state.slpUtxos,
        nonSlpUtxos: walletWithXecAndTokens_pre_2_1_0.state.nonSlpUtxos,
        tokens: walletWithXecAndTokens_pre_2_1_0.state.tokens,
        parsedTxHistory: walletWithXecAndTokens_pre_2_1_0.state.parsedTxHistory,
    },
};

export const walletWithXecAndTokens = {
    ...walletWithXecAndTokens_pre_2_9_0,
    paths: new Map([
        [
            1899,
            {
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
                wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
            },
        ],
        [
            145,
            {
                address: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
                hash: 'a28f8852f868f88e71ec666c632d6f86e978f046',
                wif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
            },
        ],
        [
            245,
            {
                address: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
                hash: '600efb12a6f813eccf13171a8bc62055212d8d6c',
                wif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
            },
        ],
    ]),
    state: {
        ...walletWithXecAndTokens_pre_2_9_0.state,
        tokens: new Map([
            [
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                '1',
            ],
        ]),
    },
};

export const freshWalletWithOneIncomingCashtabMsg = {
    mnemonic: 'some words that would give it all away',
    name: '[Burned] useWallet Mock',
    paths: new Map([
        [
            1899,
            {
                address: 'ecash:qrfjv9kglpyazkdsyf0nd9nvewzagf0xsvv84u226e',
                hash: 'd32616c8f849d159b0225f36966ccb85d425e683',
                wif: 'nope',
            },
        ],
        [
            145,
            {
                address: 'ecash:qqdukdf3cdgn0nes83x4ln87hd0mpqvh7uky87rj0a',
                hash: '1bcb3531c35137cf303c4d5fccfebb5fb08197f7',
                wif: 'nope',
            },
        ],
        [
            245,
            {
                address: 'ecash:qqqtqscqym24ps40v5n2wl88n9zlgu3hqyjzt84eay',
                hash: '00b0430026d550c2af6526a77ce79945f4723701',
                wif: 'nope',
            },
        ],
    ]),
    state: {
        balanceSats: 1000000,
        slpUtxos: [],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: 'f11648484c5ac6bf65c04632208d60e809014ed288171cb96e059d0ed7678fde',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: '1000000',
                network: 'XEC',
                address: 'ecash:qrfjv9kglpyazkdsyf0nd9nvewzagf0xsvv84u226e',
            },
        ],
        tokens: new Map(),
        parsedTxHistory: [
            {
                txid: 'f11648484c5ac6bf65c04632208d60e809014ed288171cb96e059d0ed7678fde',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'da90c08e3d4afe2ab0446a1f72a3b60cf5308c55cdb3f57a5eaefd373f42e83f',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100d8350abb126e2ff6c841dcfb3902b175d46b59f141a23c40deeb7dcac1f219e7022072ee779da16bf15a8032093f03693ea98f2bbc6557dca7b48cf1f308ffb8173a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '012eba73fbc4d0383cda231b5b0c51f802569658844ab3700eb77d4475db4c32',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100989f2cd7b8994a0af144a5033d6959779bd7466226901656a35aac231ceb53f602202606fa0f2de1d82abcfac3180c7b111529792243eff23fc6455a29c92532552e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '05415fd9f02813318f760daf5aac625b61a4f60f1e1797d24e409f674549b678',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100e09950e7c9a956dd3125f741164802ef7de74a4c8c3c617f1eacdeefd9527ae502202c0cb5f8839ddfb88bf11e5f337cb0220e0228a5a663eb10b22e5567bddb2e404121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '169505',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '4585655d04f1b1da78c3bb39f90f3ab9891b930880882e2bd6ee452b58109b40',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204d2a2e8aec45ba90295fd09661d1504a8f3f0fe2be42b450c67be34212cfacb402201a438dbee9e1da4712885558925a5d49ce600da2ec25fc55240059e65ce193494121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '5500',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '7ca455f6d19b89ae2a01159b52804d8c80c1b3f4f6f1467a71f90d2639e4dcc2',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022074585d51f69f3a1afd5df2de6c4d630b6d89861454274909373dfbf5f5a63bc0022010abb2dc05e79505dc054f87467a494c28320a2ae4338f30c10e8f645b06c3784121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'ca1083d45081872129c9e2d2f463f1537749ec9aaddcccea8fcd21c6ad78ae09',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402201bb538c5da8e8f4f5fbf5d98b4d8dc8f6870d05e93fed6eead7a535f6b59338302204e0b18a4136fe6842ee01a9439aa8e6b9a089e4116aa4381f0d0281bc853348f4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '60f70d556549933674bfafef147e3d921c3f446b31e1ac74c55b6e17067bbd8f',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100a9c9c91b48f7fdd781cd132e36c84767541ef738e405ea04e71e2f2d4b54165f02206524b3cb82a2f738906dc91a367c994122dff98c1f187e32ec676989ab3a85874121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '5b2b00f6c5d7d3406885e047caf1dd88e9b6f56058142991c3f78fd1a9a35259',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022048e22c07d4f68235ca8e129c74fabbad7c9b5e17ce36d76d312f4fb08d1496c30220639024f26673e0b46247b419f1605ffea2a195eaa4123b2ab5e3360d926469164121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'cfd2dd5b8a43fe984782d5c548aec943425ee0d2fc09b7a262e504d77956d53b',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402200a629b21dbba359dfa5376bc0c64c984041389e2a64c248d4bfe06f3634143860220331d15a53b4313b19c9ad717c33d7f1a7fbb82768545fc225b9bef2d541685084121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '5500',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '563fc7eec5d7e3bd07ad2e41682afda2939ed983470464457492b23cc523d5cf',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204f6ac84bfb08b9d194c9cffaa1d28cf62d4003c4f2db08c8d9dc23cd2ba2d53b0220605658e5e00499894b74aa6de304c76a6906c66a687541f33f0205403967e04a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '0a2585f1df1bc178ceac3a62158db2a1d5d136cca67690c081402c72845f9409',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402205126713ba8abf10b9ef384262dc808c23b072df9051b1bd266ead92571a32c7002201a20d649eec51d1f859bd843e3afee4bd15a52c42ae497bb161c34fef6301b174121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '600',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '2eadd98c7a0bf9edbddbdaa6423e2b8b2405f38428a35de6985aba1848bcf5f7',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100a4f9b2e2175b0bbae6c3de2f89b2585ac6c82b63ac55e2bebb6d9b70a72daf1102204c00d2a9b6ced89eadde34980444ffb755b494082c9b11fc6d21c821ee8ba0b04121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '941ef3bd803f4267eecbdcb76ddb3116b3c781a2a97b6a9bde80b5573e70e205',
                            outIdx: 1,
                        },
                        inputScript:
                            '4730440220009194b5caf2d28216f69c0e98b1ee106779a6de485a1ba69dd5fd635d2a23e4022002cfb688783df6b4988309c55eaf31ce346b4b5db9330335f7a3acd3b6f85f514121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '94a30a43b9e1c507121456528ef25f39c51c81e3bbf204ffd08e0c4f4a460ba9',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100c4654eada3fdde6a3a3e12c09f40ab30c587ed5daf533a550ac8adba5a3f3089022039c6d938474e81fff50f677a3444f87ef35140ce0d09e7a8ba02ee5b08c667174121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1700',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '9d30a8aa240891d966b1b16771500719e4452f1f8f60564f4276fa5305553cb5',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221008d98777056f9c8b1bb4e3f2fefdbeca1ac9d65d738276e271334ead8f088de060220606388b42a5e7c3eb590ad840e6596b5e48cf5b418bdfaee47c7b2b87b4082af4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'f9865e9014f966e612bcc84e8c234dea9c59afbd25507934a6e2c893feff1af7',
                            outIdx: 1,
                        },
                        inputScript:
                            '4730440220468ea9ee32fe1400fffcb6c1a934c3789213e46d16747dc8746f4b9465b11e7c022003192f77afec1bcecf7ad46ddde813301b383b07177440786e9b1bae9946fb3c4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '470883dd586d4cea4ba5ce78379ef92eb5bb4fd4d59f6dd549da3d8692afb21c',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100ed8bdeedb7decc83d0cf71212a4fe4c21cb4ec091040b27ef15ca716aeb66957022006d12aeb15fc76f15642853dde0b35ae2a5a3efe24cfa275e049fba17690a3914121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'c91999a9755e5236003f4dff60f874bd0330d3cdfdf65e22f10a00ea054289e6',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100a940abcc3bfd26eff3b6d254750ac19361d734a42282164c432d66b62139e8c502207a28c61e435ee42dae5b1964cc457aeeb316717b51ec0cf1af0e1b4e0a5b5a474121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1000',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '2188f495eedfa0bfe96c7aedad66582900c2969c71f5c530e1ac8b55ca7ed326',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204dd6870b836e9482a7b68decdc9447f50a2f9df4f9c4d0b6446e28878386f2c60220654b4131261d41fb5b931a89be777c2716d32b77f0b85ce662ce2cade32ac3264121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '87c3f038d5754f6feb7f117dcb2fa85a015270025e919591a303429709da2023',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100f36c72b34d0350bf1bee5acea403981d41307e0da65a7405501c6631e24abc510220389ecf6b00d46e9af27d2e2463d74a2453d14da076ec94df83e2f63bbb430f0d4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '0e906814d55e889a97f46424497b7564cb2ce1659a03b0ac7c71d4d4b3143b75',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022070d354ca81b378bb1408102755ee19f112dc84e7c97dc44224ce0ec61cf9da5e02200e601eff33e36fc5e96aef74f28d6329201cb8670250fd09501221c67a5eeb034121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '221e9f39e8138c0755d8f5b4fe2445a3d645a98310773cd9afae46e4e9ce35f1',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402205ae9a030a48fad096f465f9a2d564d5f88a83b2207e2bcf9f96522a4eeca3927022050fb4fb6ca418b3559dde7cf0f6412f82dbcee7710de2c895b5989fdca75a8f84121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '900',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '38353c86f9765f23bbe144cdadf5edbc1f24c12212614977ef1569e60e1cfb78',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402207a47b86a75c91022a5f54f2f39d1d2952a8623b8cbdad40ca1d8d25e13f1027502204b5b021a65276886e4f31ce5dfab2eb7979595aecd2b244ca88047453f57e04e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'a29c3cc45360bbce9459d1e4b86b79ac199016b82ab3574ec380edc83d85d947',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100bf4d11242dd28d5ec4de42388d8fafc6bcaa812a20a728f0e86e5b5e51c0005e022041b6bf9034412e9e2377ebf1ea61ef358c05be1a42829b08032bf03be28c9fa04121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '497990',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'a78d8acd9925ee2e86a6fede4fcb7bebabacbdd92285e8d195fe86a2459a1ac1',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204f6c5b9e7a8b610bce1eb32c2362fb428137f6797a0a8f463a1043eab51c3dfe02203f5f0c7816573ca5266fb4a5fddb2d29e76d8c79cde8ab8198acaab9ac206dbf4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '700',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'd11677c4606a8674a5bfa0e4e6f50aeaa3ff54f3e241e02fdcedde30a08a06fd',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100b13a13af99fcb0946431f7407b35d2ec513c2fc100c6ea5b9c787cd21513461b02207a6549f50789f5027fbef437d7cd74785fbc01f6976eee5b99a60b0515a325ab4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022029e166c7c52719ae6dd4b0e54102f796041c3dec3edb61a87d6cca8acb31b67302206696df121a4b71251c99c1ad9d80f4acb302d44be2ecd860e76f6241675c50264121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2500',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '1bc75da40fc86396873499114418dafec6f6541a09879c5727996fbf938feeec',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100cd99ca822e8cceedff64c67577c4ba55ae1db654c28b9982926269a7b2e1847c022020054e903352d1079c19513d990da774ab12d98860c241c50066bc4f6b37357f4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '5500',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '4ff71400743a3271151352875612d150f690ac1ab6c3d062ce22785935d92444',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402200b570f4c81ef54cfc9d77d1fcd615b90063243f99aa665a53a4fa1b6204fb83802200d83088d8dc9690932d4a22e33556221ad1f44dc596b3d31cbff38b2c6a29c0a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '58e4c28a6318d677a49d2bfc0d99fcc069a13dc95881a8403f43da65f0f1ee9f',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100dc7147775fd80ccb6e75710ae2f226249d3a99017ddae7a0163900595967765f02205d84c411885d90a31b41360e8b0a8aa0a70be079c5c5a643db238a52d978835e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        value: '1000000',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04007461623a6865726520697320612043617368746162204d736720666f722075736520696e204361736874616220696e746567726174696f6e207465737473',
                    },
                    {
                        value: '1000000',
                        outputScript:
                            '76a914d32616c8f849d159b0225f36966ccb85d425e68388ac',
                    },
                    {
                        value: '713065',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                    },
                ],
                lockTime: 0,
                timeFirstSeen: '1707161386',
                size: 4576,
                isCoinbase: false,
                network: 'XEC',
                parsed: {
                    incoming: true,
                    xecAmount: '10000',
                    isEtokenTx: false,
                    airdropFlag: false,
                    airdropTokenId: '',
                    opReturnMessage:
                        'here is a Cashtab Msg for use in Cashtab integration tests',
                    isCashtabMessage: true,
                    isEncryptedMessage: false,
                    replyAddress:
                        'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                    aliasFlag: false,
                },
            },
        ],
    },
};

export const freshWalletWithOneIncomingCashtabMsgTxs = [
    {
        txid: 'f11648484c5ac6bf65c04632208d60e809014ed288171cb96e059d0ed7678fde',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'da90c08e3d4afe2ab0446a1f72a3b60cf5308c55cdb3f57a5eaefd373f42e83f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100d8350abb126e2ff6c841dcfb3902b175d46b59f141a23c40deeb7dcac1f219e7022072ee779da16bf15a8032093f03693ea98f2bbc6557dca7b48cf1f308ffb8173a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '012eba73fbc4d0383cda231b5b0c51f802569658844ab3700eb77d4475db4c32',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100989f2cd7b8994a0af144a5033d6959779bd7466226901656a35aac231ceb53f602202606fa0f2de1d82abcfac3180c7b111529792243eff23fc6455a29c92532552e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '05415fd9f02813318f760daf5aac625b61a4f60f1e1797d24e409f674549b678',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100e09950e7c9a956dd3125f741164802ef7de74a4c8c3c617f1eacdeefd9527ae502202c0cb5f8839ddfb88bf11e5f337cb0220e0228a5a663eb10b22e5567bddb2e404121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '169505',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '4585655d04f1b1da78c3bb39f90f3ab9891b930880882e2bd6ee452b58109b40',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204d2a2e8aec45ba90295fd09661d1504a8f3f0fe2be42b450c67be34212cfacb402201a438dbee9e1da4712885558925a5d49ce600da2ec25fc55240059e65ce193494121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '5500',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '7ca455f6d19b89ae2a01159b52804d8c80c1b3f4f6f1467a71f90d2639e4dcc2',
                    outIdx: 1,
                },
                inputScript:
                    '473044022074585d51f69f3a1afd5df2de6c4d630b6d89861454274909373dfbf5f5a63bc0022010abb2dc05e79505dc054f87467a494c28320a2ae4338f30c10e8f645b06c3784121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'ca1083d45081872129c9e2d2f463f1537749ec9aaddcccea8fcd21c6ad78ae09',
                    outIdx: 1,
                },
                inputScript:
                    '47304402201bb538c5da8e8f4f5fbf5d98b4d8dc8f6870d05e93fed6eead7a535f6b59338302204e0b18a4136fe6842ee01a9439aa8e6b9a089e4116aa4381f0d0281bc853348f4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '60f70d556549933674bfafef147e3d921c3f446b31e1ac74c55b6e17067bbd8f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100a9c9c91b48f7fdd781cd132e36c84767541ef738e405ea04e71e2f2d4b54165f02206524b3cb82a2f738906dc91a367c994122dff98c1f187e32ec676989ab3a85874121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5b2b00f6c5d7d3406885e047caf1dd88e9b6f56058142991c3f78fd1a9a35259',
                    outIdx: 0,
                },
                inputScript:
                    '473044022048e22c07d4f68235ca8e129c74fabbad7c9b5e17ce36d76d312f4fb08d1496c30220639024f26673e0b46247b419f1605ffea2a195eaa4123b2ab5e3360d926469164121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'cfd2dd5b8a43fe984782d5c548aec943425ee0d2fc09b7a262e504d77956d53b',
                    outIdx: 0,
                },
                inputScript:
                    '47304402200a629b21dbba359dfa5376bc0c64c984041389e2a64c248d4bfe06f3634143860220331d15a53b4313b19c9ad717c33d7f1a7fbb82768545fc225b9bef2d541685084121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '5500',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '563fc7eec5d7e3bd07ad2e41682afda2939ed983470464457492b23cc523d5cf',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204f6ac84bfb08b9d194c9cffaa1d28cf62d4003c4f2db08c8d9dc23cd2ba2d53b0220605658e5e00499894b74aa6de304c76a6906c66a687541f33f0205403967e04a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '0a2585f1df1bc178ceac3a62158db2a1d5d136cca67690c081402c72845f9409',
                    outIdx: 0,
                },
                inputScript:
                    '47304402205126713ba8abf10b9ef384262dc808c23b072df9051b1bd266ead92571a32c7002201a20d649eec51d1f859bd843e3afee4bd15a52c42ae497bb161c34fef6301b174121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '600',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '2eadd98c7a0bf9edbddbdaa6423e2b8b2405f38428a35de6985aba1848bcf5f7',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a4f9b2e2175b0bbae6c3de2f89b2585ac6c82b63ac55e2bebb6d9b70a72daf1102204c00d2a9b6ced89eadde34980444ffb755b494082c9b11fc6d21c821ee8ba0b04121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '941ef3bd803f4267eecbdcb76ddb3116b3c781a2a97b6a9bde80b5573e70e205',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220009194b5caf2d28216f69c0e98b1ee106779a6de485a1ba69dd5fd635d2a23e4022002cfb688783df6b4988309c55eaf31ce346b4b5db9330335f7a3acd3b6f85f514121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '94a30a43b9e1c507121456528ef25f39c51c81e3bbf204ffd08e0c4f4a460ba9',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100c4654eada3fdde6a3a3e12c09f40ab30c587ed5daf533a550ac8adba5a3f3089022039c6d938474e81fff50f677a3444f87ef35140ce0d09e7a8ba02ee5b08c667174121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1700',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '9d30a8aa240891d966b1b16771500719e4452f1f8f60564f4276fa5305553cb5',
                    outIdx: 0,
                },
                inputScript:
                    '4830450221008d98777056f9c8b1bb4e3f2fefdbeca1ac9d65d738276e271334ead8f088de060220606388b42a5e7c3eb590ad840e6596b5e48cf5b418bdfaee47c7b2b87b4082af4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'f9865e9014f966e612bcc84e8c234dea9c59afbd25507934a6e2c893feff1af7',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220468ea9ee32fe1400fffcb6c1a934c3789213e46d16747dc8746f4b9465b11e7c022003192f77afec1bcecf7ad46ddde813301b383b07177440786e9b1bae9946fb3c4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '470883dd586d4cea4ba5ce78379ef92eb5bb4fd4d59f6dd549da3d8692afb21c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100ed8bdeedb7decc83d0cf71212a4fe4c21cb4ec091040b27ef15ca716aeb66957022006d12aeb15fc76f15642853dde0b35ae2a5a3efe24cfa275e049fba17690a3914121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'c91999a9755e5236003f4dff60f874bd0330d3cdfdf65e22f10a00ea054289e6',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100a940abcc3bfd26eff3b6d254750ac19361d734a42282164c432d66b62139e8c502207a28c61e435ee42dae5b1964cc457aeeb316717b51ec0cf1af0e1b4e0a5b5a474121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1000',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '2188f495eedfa0bfe96c7aedad66582900c2969c71f5c530e1ac8b55ca7ed326',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204dd6870b836e9482a7b68decdc9447f50a2f9df4f9c4d0b6446e28878386f2c60220654b4131261d41fb5b931a89be777c2716d32b77f0b85ce662ce2cade32ac3264121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '87c3f038d5754f6feb7f117dcb2fa85a015270025e919591a303429709da2023',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f36c72b34d0350bf1bee5acea403981d41307e0da65a7405501c6631e24abc510220389ecf6b00d46e9af27d2e2463d74a2453d14da076ec94df83e2f63bbb430f0d4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '0e906814d55e889a97f46424497b7564cb2ce1659a03b0ac7c71d4d4b3143b75',
                    outIdx: 0,
                },
                inputScript:
                    '473044022070d354ca81b378bb1408102755ee19f112dc84e7c97dc44224ce0ec61cf9da5e02200e601eff33e36fc5e96aef74f28d6329201cb8670250fd09501221c67a5eeb034121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '221e9f39e8138c0755d8f5b4fe2445a3d645a98310773cd9afae46e4e9ce35f1',
                    outIdx: 1,
                },
                inputScript:
                    '47304402205ae9a030a48fad096f465f9a2d564d5f88a83b2207e2bcf9f96522a4eeca3927022050fb4fb6ca418b3559dde7cf0f6412f82dbcee7710de2c895b5989fdca75a8f84121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '900',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '38353c86f9765f23bbe144cdadf5edbc1f24c12212614977ef1569e60e1cfb78',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207a47b86a75c91022a5f54f2f39d1d2952a8623b8cbdad40ca1d8d25e13f1027502204b5b021a65276886e4f31ce5dfab2eb7979595aecd2b244ca88047453f57e04e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'a29c3cc45360bbce9459d1e4b86b79ac199016b82ab3574ec380edc83d85d947',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100bf4d11242dd28d5ec4de42388d8fafc6bcaa812a20a728f0e86e5b5e51c0005e022041b6bf9034412e9e2377ebf1ea61ef358c05be1a42829b08032bf03be28c9fa04121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '497990',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'a78d8acd9925ee2e86a6fede4fcb7bebabacbdd92285e8d195fe86a2459a1ac1',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204f6c5b9e7a8b610bce1eb32c2362fb428137f6797a0a8f463a1043eab51c3dfe02203f5f0c7816573ca5266fb4a5fddb2d29e76d8c79cde8ab8198acaab9ac206dbf4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '700',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd11677c4606a8674a5bfa0e4e6f50aeaa3ff54f3e241e02fdcedde30a08a06fd',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100b13a13af99fcb0946431f7407b35d2ec513c2fc100c6ea5b9c787cd21513461b02207a6549f50789f5027fbef437d7cd74785fbc01f6976eee5b99a60b0515a325ab4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1100',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                    outIdx: 0,
                },
                inputScript:
                    '473044022029e166c7c52719ae6dd4b0e54102f796041c3dec3edb61a87d6cca8acb31b67302206696df121a4b71251c99c1ad9d80f4acb302d44be2ecd860e76f6241675c50264121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2500',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '1bc75da40fc86396873499114418dafec6f6541a09879c5727996fbf938feeec',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cd99ca822e8cceedff64c67577c4ba55ae1db654c28b9982926269a7b2e1847c022020054e903352d1079c19513d990da774ab12d98860c241c50066bc4f6b37357f4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '5500',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '4ff71400743a3271151352875612d150f690ac1ab6c3d062ce22785935d92444',
                    outIdx: 0,
                },
                inputScript:
                    '47304402200b570f4c81ef54cfc9d77d1fcd615b90063243f99aa665a53a4fa1b6204fb83802200d83088d8dc9690932d4a22e33556221ad1f44dc596b3d31cbff38b2c6a29c0a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '58e4c28a6318d677a49d2bfc0d99fcc069a13dc95881a8403f43da65f0f1ee9f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100dc7147775fd80ccb6e75710ae2f226249d3a99017ddae7a0163900595967765f02205d84c411885d90a31b41360e8b0a8aa0a70be079c5c5a643db238a52d978835e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                value: '1000000',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04007461623a6865726520697320612043617368746162204d736720666f722075736520696e204361736874616220696e746567726174696f6e207465737473',
            },
            {
                value: '1000000',
                outputScript:
                    '76a914d32616c8f849d159b0225f36966ccb85d425e68388ac',
            },
            {
                value: '713065',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1707161386',
        size: 4576,
        isCoinbase: false,
        network: 'XEC',
        parsed: {
            incoming: true,
            xecAmount: '10000',
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage:
                'here is a Cashtab Msg for use in Cashtab integration tests',
            isCashtabMessage: true,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
            aliasFlag: false,
        },
    },
];

export const requiredUtxoThisToken = {
    outpoint: {
        txid: '423e24bf0715cfb80727e5e7a6ff7b9e37cb2f555c537ab06fdc7fd9b3a0ba3a',
        outIdx: 1,
    },
    blockHeight: 833612,
    isCoinbase: false,
    value: 546,
    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    isFinal: true,
    token: {
        tokenId:
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        amount: '10000000000',
        isMintBaton: false,
    },
};

export const vipTokenChronikTokenMocks = {
    token: {
        tokenId:
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: '0',
        genesisInfo: {
            tokenTicker: 'GRP',
            tokenName: 'GRUMPY',
            url: 'https://bit.ly/GrumpyDoc',
            decimals: 2,
            hash: '',
        },
        block: {
            height: 713853,
            hash: '0000000000000000006a051e51b50e44d3394ab49c9db896c2484770ed613fb2',
            timestamp: 1637109257,
        },
    },
    tx: {
        txid: 'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'b8af3a4ad68cc300e1f9d331762a1a62c0c344c3b3fb554af6a35e634907feab',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204db8555a3141e86b979257feadc41e903a779a61971e2e63a386f1084c52ff2a022010d7f7f9d41b474ff5c4bd979916e2cd29627a2d6194fcc6af6485a979091cbe412103632f603f43ae61afece65288d7d92e55188783edb74e205be974b8cd1cd36a1e',
                value: 50000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e4553495303475250064752554d50591868747470733a2f2f6269742e6c792f4772756d7079446f634c0001024c0008000000e8d4a51000',
            },
            {
                value: 546,
                outputScript:
                    '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                token: {
                    tokenId:
                        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '1000000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '94cc23c0a01ee35b8b9380b739f1f8d8f6d0e2c09a7785f3d63b928afd23357f',
                    outIdx: 1,
                },
            },
            {
                value: 48931,
                outputScript:
                    '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                spentBy: {
                    txid: '94cc23c0a01ee35b8b9380b739f1f8d8f6d0e2c09a7785f3d63b928afd23357f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 301,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
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
            height: 713853,
            hash: '0000000000000000006a051e51b50e44d3394ab49c9db896c2484770ed613fb2',
            timestamp: 1637109257,
        },
    },
};

export const easterEggTokenChronikTokenDetails = {
    tokenId: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    timeFirstSeen: '0',
    genesisInfo: {
        tokenTicker: 'TBC',
        tokenName: 'tabcash',
        url: 'https://cashtabapp.com/',
        decimals: 0,
        hash: '',
    },
    block: {
        height: 674143,
        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
        timestamp: 1613859311,
    },
};

export const easterEggTokenChronikGenesisTx = {
    txid: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
                outIdx: 2,
            },
            inputScript:
                '483045022100e28006843eb071ec6d8dd105284f2ca625a28f4dc85418910b59a5ab13fc6c2002205921fb12b541d1cd1a63e7e012aca5735df3398525f64bac04337d21029413614121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
            value: 91048,
            sequenceNo: 4294967295,
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
        },
    ],
    outputs: [
        {
            value: 0,
            outputScript:
                '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
        },
        {
            value: 546,
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                amount: '100',
                isMintBaton: false,
                entryIdx: 0,
            },
            spentBy: {
                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                outIdx: 1,
            },
        },
        {
            value: 546,
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                amount: '0',
                isMintBaton: true,
                entryIdx: 0,
            },
        },
        {
            value: 89406,
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            spentBy: {
                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    timeFirstSeen: 0,
    size: 336,
    isCoinbase: false,
    tokenEntries: [
        {
            tokenId:
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
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
        height: 674143,
        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
        timestamp: 1613859311,
    },
};

export const validSavedWallets_pre_2_1_0 = [
    {
        mnemonic:
            'giggle release model music congress choice library bottom story hole tiger document',
        name: 'alpha',
        Path245: {
            publicKey:
                '03ed5126bf336af98c614167168de75076cfc566177876a8f638d90135eb6758c8',
            hash160: 'e4a99c3b667511399056be4a90993a0ebb77b5b7',
            cashAddress: 'ecash:qrj2n8pmve63zwvs26ly4yye8g8tkaa4ku3umdavhp',
            fundingWif: 'L16kPC4749KuGpmzNAg1gUJLbB6Q9DeL6XNJZRzZEPApRYvCwcBH',
        },
        Path145: {
            publicKey:
                '02503651ff13c1aa8bbb77e7ee2ed6a5e412f4088c344c8fde3c2d929df1832e3e',
            hash160: 'b69091895b2e25e902a676456ec051b86a2d8983',
            cashAddress: 'ecash:qzmfpyvftvhzt6gz5emy2mkq2xux5tvfsvz5798p70',
            fundingWif: 'L2ZprxokgYLCaHGLpbJptKueQZRTHVjTurn4kb6PkDRZeHytjQy6',
        },
        Path1899: {
            publicKey:
                '03504b4c2eb4f41b554dbbc7c734a9c59849a346b7d8d1cc0e98666ad71538d5eb',
            hash160: 'a15108d07a1891e35953817b6d92ab77bbc62ac3',
            cashAddress: 'ecash:qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep',
            fundingWif: 'L4PMeJxHDWMJurbU4yhWtEn4qy3kYcPJKpG9f5yrqJcJzCY8cKnU',
        },
        state: {
            balances: {},
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        },
    },
    {
        mnemonic:
            'guilt cricket congress vessel tumble tennis off rapid parade eyebrow loop young',
        name: 'bravo',
        Path245: {
            publicKey:
                '0397c403805267f9e5d0e3ae0e0fd09151edda9c256539996250ea2d07f0e49d2b',
            hash160: 'af657c9aa1eb6a573eced4bbfdc8ebb756e2a9fd',
            cashAddress: 'ecash:qzhk2ly6584k54e7em2thlwgawm4dc4fl5eslkgm7u',
            fundingWif: 'KxBCkRKGiYxHVQyGFaQJMM1Y1ApJtupR82JWik317gPRC58FLmEV',
        },
        Path145: {
            publicKey:
                '0266058962ae3e68199c8352f55e028e7740b2b39a6e01e4fdac6f787332c2c90e',
            hash160: '063f8dba9f543f694bc2c045e3a6d62e430c8158',
            cashAddress: 'ecash:qqrrlrd6na2r762tctqytcax6chyxryptqjx7wfpun',
            fundingWif: 'L1wHwQr5sFgC6zr86NPRqUTccjscLr9N4rwfXjWdgszqmNBSPfEs',
        },
        Path1899: {
            publicKey:
                '03a63f0a273fb25370866bc4554a4d0e6b63fb4df7e11ddbd0885d194a474d8ee7',
            hash160: 'a55e283f54d91b77616ce72c2b117a4bf77e8fe3',
            cashAddress: 'ecash:qzj4u2pl2nv3kampdnnjc2c30f9lwl50uvvg4nfkfz',
            fundingWif: 'KwyN1LbHeWS2XfP7E7V4kEJmgwhB13VUfDidtpkwzSD77KBKaRpi',
        },
        state: {
            balances: {},
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        },
    },
    {
        mnemonic:
            'level render host glory brand hip multiply token pigeon vintage word term',
        name: 'charlie',
        Path245: {
            publicKey:
                '0242993d73596e744e8d51840ed77a012c07d30b47be42cb1584f882114be0b136',
            hash160: '68946da96b143de027be006deac4cf7f1012bbf8',
            cashAddress: 'ecash:qp5fgmdfdv2rmcp8hcqxm6kyeal3qy4mlqc8s2tme8',
            fundingWif: 'L4H4BBgfNK4S9LrZaDg5XDPzZmmevxA6qSH1AfRGVf6meDERVnet',
        },
        Path145: {
            publicKey:
                '0223f160df25af9c4eeec492372b27f43548b2b305059d0d0d4ab2c828afbe9cc4',
            hash160: '4cb5f392830a8515591dde5c970603cb8747743d',
            cashAddress: 'ecash:qpxttuujsv9g292erh09e9cxq09cw3m585h96jn4wu',
            fundingWif: 'Kz7CZqAckHkPSJ15bcPKqzMwBAArhUquFAmfq9UBqKNkgyZz4dxz',
        },
        Path1899: {
            publicKey:
                '03be84e190407f1549da4863ebcc4a9f2ae27d8484d404d1286034d94677ce3d12',
            hash160: 'fb85cd3ca04fb8579983624451413f5fdfd1bebb',
            cashAddress: 'ecash:qractnfu5p8ms4uesd3yg52p8a0al5d7hvpnus5vsy',
            fundingWif: 'Kwjipw1HNsv5o7xcGPL6oBpYudCgFfKt44fC49r87n924acnoytj',
        },
        state: {
            balances: {},
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        },
    },
    {
        mnemonic:
            'quality pretty cricket item tail avocado sound north salute era stool island',
        name: 'delta',
        Path245: {
            publicKey:
                '028eb5f461f40d4d59388973787a8d354a8a0651f19014b8b01fe628394525fa27',
            hash160: '184d10e2817e25b21a7e9edcd0a6684365a6ed7b',
            cashAddress: 'ecash:qqvy6y8zs9lztvs6060de59xdppktfhd0vqd9270d2',
            fundingWif: 'KxVVuyb4VZsT9EKCJ84s8fLkAoPwqoUDZTG3i7gENFiBkLrYN2J4',
        },
        Path145: {
            publicKey:
                '0375ffef70063f2f90db5e3392c780d8afc3d34882935d731ecd026f5438fa1c85',
            hash160: 'e2e04af76098d4237f055de9eaa159e2de808f92',
            cashAddress: 'ecash:qr3wqjhhvzvdggmlq4w7n64pt83daqy0jg8me2q8fp',
            fundingWif: 'L1hhvHyRvbGgCJa4ncRktWbdsJiANRca9mR9Yp4x11vVxQ89a36S',
        },
        Path1899: {
            publicKey:
                '02d54b79e41b60e8c0e4e2315843e4707e9905486e5b8df4fe45dd5331a4e5c80c',
            hash160: '52a54e9ca3ed7f3afa163df948b6c2a1e340c7a4',
            cashAddress: 'ecash:qpf22n5u50kh7wh6zc7ljj9kc2s7xsx85sdsjvxeyf',
            fundingWif: 'L5eyTTvwEsJPHCr6hmNt2c1PRwjiyu7wLkdKw5X2prduRdzSQhTV',
        },
        state: {
            balances: {},
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        },
    },
    {
        mnemonic:
            'forest spike doctor harsh dutch trash powder wool topple tortoise file that',
        name: 'echo',
        Path245: {
            publicKey:
                '03b3f3d7a8da74742956c4f45566eb5692cc887e3121027be6ba6e771b8bef4801',
            hash160: 'fe1666692e5ee9aaefe847fc010bc2c61d7ab363',
            cashAddress: 'ecash:qrlpvenf9e0wn2h0aprlcqgtctrp674nvvg92cn35t',
            fundingWif: 'L5bVvbc1gLhxCxvZ2FapBpAfs5JX1EB7KaRkHFq8yejzPpBEq1sN',
        },
        Path145: {
            publicKey:
                '028e7b40e388c683dbabbe237970fcbdb42e796ed81b937a6e6163f0bd4e20bdea',
            hash160: 'e9e04e7a62212ebc5eb2958d9998455247862a8b',
            cashAddress: 'ecash:qr57qnn6vgsja0z7k22cmxvcg4fy0p323vzjk7wt73',
            fundingWif: 'L1LWFja6VTsaiGvHamFTPE1CxPdnR3dYxCPTnjdBhsr9rQcjzmGe',
        },
        Path1899: {
            publicKey:
                '02e1323cc997925c0dd119700e37c12f2a8c608724b814216ee1d30d911a298c91',
            hash160: '60194f10f15d9a8ffd20618e418d6ab47a46fa3c',
            cashAddress: 'ecash:qpspjncs79we4rlaypscusvdd26853h68s2ach6ket',
            fundingWif: 'KwVChvBpEjmY1Yqt7fkeb5ZqzWW6QDn7CWDCkcnNizVi3CVCPTKK',
        },
        state: {
            balances: {},
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
            parsedTxHistory: [],
        },
    },
];

const validSavedWalletsBuilder_pre_2_9_0 = [];
for (const unmigratedWallet of validSavedWallets_pre_2_1_0) {
    // Clone legacy wallet
    const migratedWallet = JSON.parse(JSON.stringify(unmigratedWallet));
    // Build new paths array
    migratedWallet.paths = [
        {
            path: 1899,
            hash: unmigratedWallet.Path1899.hash160,
            address: unmigratedWallet.Path1899.cashAddress,
            wif: unmigratedWallet.Path1899.fundingWif,
        },
        {
            path: 145,
            hash: unmigratedWallet.Path145.hash160,
            address: unmigratedWallet.Path145.cashAddress,
            wif: unmigratedWallet.Path145.fundingWif,
        },
        {
            path: 245,
            hash: unmigratedWallet.Path245.hash160,
            address: unmigratedWallet.Path245.cashAddress,
            wif: unmigratedWallet.Path245.fundingWif,
        },
    ];

    // Remove hardcoded paths
    delete migratedWallet['Path1899'];
    delete migratedWallet['Path145'];
    delete migratedWallet['Path245'];

    // Remove legacy state.balances
    delete migratedWallet['state']['balances'];

    // Replace state.balances with state.balanceSats
    migratedWallet.state.balanceSats =
        'totalBalanceInSatoshis' in unmigratedWallet.state.balances
            ? parseInt(unmigratedWallet.state.balances.totalBalanceInSatoshis)
            : 0;

    validSavedWalletsBuilder_pre_2_9_0.push(migratedWallet);
}

export const validSavedWallets_pre_2_9_0 = validSavedWalletsBuilder_pre_2_9_0;

const validSavedWalletsBuilder = [];
for (const unmigratedWallet of validSavedWalletsBuilder_pre_2_9_0) {
    // Clone legacy wallet
    const migratedWallet = { ...unmigratedWallet };
    // Build new paths array
    migratedWallet.paths = new Map([
        [
            1899,
            {
                hash: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 1899,
                ).hash,
                address: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 1899,
                ).address,
                wif: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 1899,
                ).wif,
            },
        ],
        [
            145,
            {
                hash: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 145,
                ).hash,
                address: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 145,
                ).address,
                wif: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 145,
                ).wif,
            },
        ],
        [
            245,
            {
                hash: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 245,
                ).hash,
                address: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 245,
                ).address,
                wif: unmigratedWallet.paths.find(
                    pathInfo => pathInfo.path === 245,
                ).wif,
            },
        ],
    ]);
    // Build new state.tokens map
    // These are empty wallets so it's empty
    migratedWallet.state.tokens = new Map();

    validSavedWalletsBuilder.push(migratedWallet);
}

export const validSavedWallets = validSavedWalletsBuilder;

export const mockCacheWalletWithXecAndTokens = {
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    genesisInfo: {
        tokenTicker: 'BEAR',
        tokenName: 'BearNip',
        url: 'https://cashtab.com/',
        decimals: 0,
        hash: '',
    },
    timeFirstSeen: 0,
    genesisSupply: '4444',
    genesisOutputScripts: [
        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    ],
    genesisMintBatons: 0,
    block: {
        height: 782665,
        hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
        timestamp: 1678408305,
    },
};

// tokenId b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc
export const mockCachedInfoCashtabDark = {
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    timeFirstSeen: 0,
    genesisInfo: {
        tokenTicker: 'CTD',
        tokenName: 'Cashtab Dark',
        url: 'https://cashtab.com/',
        decimals: 0,
        hash: '',
    },
    block: {
        height: 726043,
        hash: '00000000000000000182db32e000171006b7b7820181676b5fd8f29cc90d2b9c',
        timestamp: 1644455332,
    },
    genesisSupply: '10000',
    genesisMintBatons: 0,
    genesisOutputScripts: [
        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    ],
};

export const populatedContactList = [
    {
        address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        name: 'alpha',
    },
    {
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        name: 'beta',
    },
    {
        address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
        name: 'gamma',
    },
];
