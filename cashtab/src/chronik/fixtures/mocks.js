// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const mockTxHistoryOfAllAddresses = [
    {
        txs: [
            {
                txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022024a187f6dc32082e765eeb37e1a6726e99871b3df0c385ad135ddcf73df0e79102203b81d7eb112a193e23147974432bb12116d75e995aa8c3b6a51943cc4dbd8694412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 12214100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
                    },
                    {
                        value: 546,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '88888888888',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 12213031,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                            outIdx: 67,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 304,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
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
                    height: 757174,
                    hash: '000000000000000011c5e064ac6295bb1c1e1c306019e591b9c79290c24c33ff',
                    timestamp: 1663091856,
                },
            },
            {
                txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                            outIdx: 3,
                        },
                        inputScript:
                            '47304402201623de13a2cd38d379a08dbee1cb2239571b6166bf9923ffe44ae108fd21931c022030dcd5b08a997dcaa7af505a5e513985317b2da91d2f4d4879ee941e3b8931ad412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 12218055,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
                    },
                    {
                        value: 3500,
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: 12214100,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 387,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: 1663090626,
                },
            },
            {
                txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402202267233e578abb21efa28bc606501f582f94915d3b07ceedff39750877c7211d02206cfec78f41fe58723938c199fa908f4e13ebb298cc989be30faa1e6838c22af1412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 12224078,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
                    },
                    {
                        value: 2200,
                        outputScript:
                            '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                        spentBy: {
                            txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 3300,
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: 12218055,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 303,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: 1663090626,
                },
            },
            {
                txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100f3e4140c8f1614612c07ffe4d35e697d5ffd0931d7b18b9360f5f431c6704d11022002b5fd03e7f9b849fec1c0374dc3df2f1f2dae333980bd02aaa3710b66d1eb0e412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 12230101,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 3300,
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: 2200,
                        outputScript:
                            '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                        spentBy: {
                            txid: 'ff40dc28bd694b45d782be8c1726417b8db51fd466e429cf3ee906c9dab0b650',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 12224078,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 260,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: 1663090626,
                },
            },
            {
                txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                            outIdx: 2,
                        },
                        inputScript:
                            '4830450221008f8052c8b78a4d250f4596b3a14c85fb2d253ce20d972422829dc4a68a87320702202b7d272a96996bab1914f693939dfc6300184f5f3db0acc5acfc155ba19d7642412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 12233856,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 3300,
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: 12230101,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 226,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: 1663090626,
                },
            },
            {
                txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022038c75f93d7abe8e6e63c0981203acd48c7e6df92ba52cc9399df84b0b367ee200220356508913a5f8ad94d126891fea372bb2bf66a249bdb63332a4625cb359865f8412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 12235011,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript: '6a04007461620454657374',
                    },
                    {
                        value: 700,
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: 12233856,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 245,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 755309,
                    hash: '0000000000000000115c75e7b0728b548e9f21bb9ebdcad68d36475e712ceed5',
                    timestamp: 1661972428,
                },
            },
            {
                txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100f288e71276e2389744ecb3c98bdf0c119d19966ac086c5f5908f8c3a878aa7e402203c07905536720391f472457f52f5cf6aaeb4fa02fdf59722f25768a36fd6157f412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 12243166,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 7700,
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        spentBy: {
                            txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                            outIdx: 3,
                        },
                    },
                    {
                        value: 12235011,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 226,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 743257,
                    hash: '000000000000000013259e217a18907ba956c55f839b6b15a11a79a2bf303d9f',
                    timestamp: 1654812393,
                },
            },
            {
                txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100d541ef12cc57c3b3cc95b338aec21775b27441d12eda662dcff23a46d07cc9450220467d2aae0dadcae787db33dab6adc86ec47aafea0133cc2130a62bb8247491d6412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 14743621,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 2500000,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 12243166,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 226,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 742800,
                    hash: '000000000000000009e1ed934f027563d161d1f59a00253496b0c847c2288c38',
                    timestamp: 1654543720,
                },
            },
            {
                txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022046faa2cc8efc0a06b2cfa8b80b658d4dc09bc1524cba1cb4ab456f8bc9ebf37902205074d7975824a06d6cba90dc91503f29801d9c180253bbe4ecefb42ddc82da6d412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 14746276,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
                    },
                    {
                        value: 2200,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 14743621,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 371,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 741058,
                    hash: '00000000000000000bb6dc63cd48a9b0dcf37a9b722618209dc85a79e8dc7973',
                    timestamp: 1653506978,
                },
            },
            {
                txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '63a11be653e333ae3e1075791c996d46b5f476b483c4ccf4ec33b524028d7cd5',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402204c6140c524e40653e85440aff615af47a481accc9dc8b45548d59a3ae91d3a0802200aa1667d00b16d3a80c5d4d1b4cabeee415289ef6818496f92abf9ec2db8262c412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                        value: 14748931,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                    },
                ],
                outputs: [
                    {
                        value: 2200,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 14746276,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 225,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 739747,
                    hash: '0000000000000000079aa77192cf335b2004788c2860be98c310a5187a588dd3',
                    timestamp: 1652722196,
                },
            },
        ],
        numPages: 2,
    },
    {
        txs: [],
        numPages: 0,
    },
    {
        txs: [
            {
                txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 49545,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                outputs: [
                    {
                        value: 1300,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 47790,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                            outIdx: 1,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 226,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: 1663956316,
                },
            },
            {
                txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 47562,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                outputs: [
                    {
                        value: 1200,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 45907,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                            outIdx: 1,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 226,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: 1663956316,
                },
            },
            {
                txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                            outIdx: 0,
                        },
                        inputScript:
                            '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 3300,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                outputs: [
                    {
                        value: 1100,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 1745,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 226,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: 1663956316,
                },
            },
            {
                txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 2200,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '34',
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
                            '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                    },
                    {
                        value: 546,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '5',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                            outIdx: 2,
                        },
                    },
                    {
                        value: 546,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        token: {
                            tokenId:
                                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '29',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 445,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: 1663956316,
                },
            },
            {
                txid: '050705e14d2d27e1cb59127617d54a5cccd91c4cad6ffe8c2c6eb684e9d76042',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a429b818424b74153b363e487a577142f4e9bd67530739ed6883d8a6d71ea947',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100f4734cb1a5e7a64013b5408b9d0d6bc59560b08b9e7284f8bbba217f777f772c02204625fab8a1356f96f00a463be8aa64e90f663744554df60807d1aa1e00d19c5e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 7700,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '126',
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
                            '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
                    },
                    {
                        value: 546,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '1',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 546,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        token: {
                            tokenId:
                                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '125',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: 'e94ba6040350284311a6409267c7c1193d6c5f19a9dd76975bbf7355f0c7ed1a',
                            outIdx: 2,
                        },
                    },
                    {
                        value: 6655,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 628,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: 1663955917,
                },
            },
            {
                txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                            outIdx: 0,
                        },
                        inputScript:
                            '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 3300,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                outputs: [
                    {
                        value: 1900,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 945,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 225,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: 1663955917,
                },
            },
            {
                txid: '96c9031e30dba075dd83f622ed952ef7bb75fe12abdad962e70e9904272a7532',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '08cb593e2b2d0a47649990591bf30eee51534f85658fc8ee4e98e12e1c5c5553',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204569cce381885918e300caef1e8a5388b86be871ff3e8f8f52917c26df9dde760220474e3ce3f6363a826d2772e347c296773ea838f493882e15fdc6a5181286a92c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1700,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 3300,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                outputs: [
                    {
                        value: 1800,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 2448,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '8af4664ffc7f23d64f0ddf76a6881d6a9c3bcf1b3f3e6562e8ed70ab5f58f4e6',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 372,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: 1663955917,
                },
            },
            {
                txid: 'c25516f6d82e4299849edbd730ecb55b2b0e4745d95735b43bb4d16a67f50113',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a737c1372586cf30d76d8bdcac8e96e2c321f667a77ec4bb9980e603e2a77b3d',
                            outIdx: 0,
                        },
                        inputScript:
                            '4730440220665f4bf3d94204649f8a1731285eb6e94940e38a3601504612374ec0a06ff27f02206276844772b498726e3e56145d42f2316da5646619d8288598f18e828426881f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 2200,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                outputs: [
                    {
                        value: 1700,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                            outIdx: 1,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 191,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: 1663955917,
                },
            },
            {
                txid: 'de5c518dc2d3d52268c3aeb788134ac373553b2eb239f256fa463c728af87189',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '0c67c0b670378c6ae959172eefd099247be944cdb88108d52589731f2194d675',
                            outIdx: 5,
                        },
                        inputScript:
                            '47304402204b4de25ffee112642136a6d1ad74394c7bfb984a08703d5362500a5521d346dc022053c3e887d7bb27a2525140789a7f450b0995781787ce28750dca1421b746721f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        value: 43783281,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        prevOut: {
                            txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '100',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
                    },
                    {
                        value: 546,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '99',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: 'a39c15bc372916359d79196a67f4edbacc515b0a9b8b9a9395e4eb13a9ef2a07',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 43781463,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'fcf45f6f12a4442bf206f85c87dfb7cfccdf438927fabbfe314a2c780545dcf9',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 437,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: 'Unexpected burn: Burns 1 base tokens',
                        failedColorings: [],
                        actualBurnAmount: '1',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
                block: {
                    height: 758551,
                    hash: '000000000000000004ac3b44419bb5f0e0b47937b3e7e781206270da01b4a53e',
                    timestamp: 1663947923,
                },
            },
            {
                txid: 'd34f524ca0509e83718516ce697eeed5452ea0e312bab50ce0172589275fdd84',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                            outIdx: 3,
                        },
                        inputScript:
                            '483045022100e43086bb67006f6d5140a3329001bc53dabe2da4dbe7feae34dd5f10311b15ad022045da448bc99003af6cf6d4c74ec9891c60932013dde7451abca4a6bc40b6138d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        value: 10409988,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
                    },
                    {
                        value: 1200,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                            outIdx: 1,
                        },
                    },
                    {
                        value: 10408333,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '4263f3ceb04ec33a7cdb4d076caa4f2311fbdbb50b4330693e91d4ceb2e2fd5d',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 0,
                size: 404,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 758550,
                    hash: '000000000000000009f8cdae9bb21a321896126e06413a4e8af24a182edf701e',
                    timestamp: 1663947819,
                },
            },
        ],
        numPages: 98,
    },
];

export const mockFlatTxHistoryNoUnconfirmed = [
    {
        txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 2,
                },
                inputScript:
                    '473044022024a187f6dc32082e765eeb37e1a6726e99871b3df0c385ad135ddcf73df0e79102203b81d7eb112a193e23147974432bb12116d75e995aa8c3b6a51943cc4dbd8694412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12214100,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '88888888888',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                    outIdx: 1,
                },
            },
            {
                value: 12213031,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                    outIdx: 67,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 304,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
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
            height: 757174,
            hash: '000000000000000011c5e064ac6295bb1c1e1c306019e591b9c79290c24c33ff',
            timestamp: 1663091856,
        },
    },
    {
        txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 3,
                },
                inputScript:
                    '47304402201623de13a2cd38d379a08dbee1cb2239571b6166bf9923ffe44ae108fd21931c022030dcd5b08a997dcaa7af505a5e513985317b2da91d2f4d4879ee941e3b8931ad412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12218055,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
            },
            {
                value: 3500,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 12214100,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 387,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: 1663090626,
        },
    },
    {
        txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 2,
                },
                inputScript:
                    '47304402202267233e578abb21efa28bc606501f582f94915d3b07ceedff39750877c7211d02206cfec78f41fe58723938c199fa908f4e13ebb298cc989be30faa1e6838c22af1412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12224078,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
            },
            {
                value: 2200,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                    outIdx: 0,
                },
            },
            {
                value: 3300,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 12218055,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 303,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: 1663090626,
        },
    },
    {
        txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f3e4140c8f1614612c07ffe4d35e697d5ffd0931d7b18b9360f5f431c6704d11022002b5fd03e7f9b849fec1c0374dc3df2f1f2dae333980bd02aaa3710b66d1eb0e412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12230101,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 3300,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 2200,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: 'ff40dc28bd694b45d782be8c1726417b8db51fd466e429cf3ee906c9dab0b650',
                    outIdx: 0,
                },
            },
            {
                value: 12224078,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 260,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: 1663090626,
        },
    },
    {
        txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221008f8052c8b78a4d250f4596b3a14c85fb2d253ce20d972422829dc4a68a87320702202b7d272a96996bab1914f693939dfc6300184f5f3db0acc5acfc155ba19d7642412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12233856,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 3300,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 12230101,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: 1663090626,
        },
    },
    {
        txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 1,
                },
                inputScript:
                    '473044022038c75f93d7abe8e6e63c0981203acd48c7e6df92ba52cc9399df84b0b367ee200220356508913a5f8ad94d126891fea372bb2bf66a249bdb63332a4625cb359865f8412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12235011,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript: '6a04007461620454657374',
            },
            {
                value: 700,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 12233856,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 245,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 755309,
            hash: '0000000000000000115c75e7b0728b548e9f21bb9ebdcad68d36475e712ceed5',
            timestamp: 1661972428,
        },
    },
    {
        txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f288e71276e2389744ecb3c98bdf0c119d19966ac086c5f5908f8c3a878aa7e402203c07905536720391f472457f52f5cf6aaeb4fa02fdf59722f25768a36fd6157f412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12243166,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 7700,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                spentBy: {
                    txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                    outIdx: 3,
                },
            },
            {
                value: 12235011,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 743257,
            hash: '000000000000000013259e217a18907ba956c55f839b6b15a11a79a2bf303d9f',
            timestamp: 1654812393,
        },
    },
    {
        txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100d541ef12cc57c3b3cc95b338aec21775b27441d12eda662dcff23a46d07cc9450220467d2aae0dadcae787db33dab6adc86ec47aafea0133cc2130a62bb8247491d6412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 14743621,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 2500000,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                    outIdx: 0,
                },
            },
            {
                value: 12243166,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 742800,
            hash: '000000000000000009e1ed934f027563d161d1f59a00253496b0c847c2288c38',
            timestamp: 1654543720,
        },
    },
    {
        txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
                    outIdx: 1,
                },
                inputScript:
                    '473044022046faa2cc8efc0a06b2cfa8b80b658d4dc09bc1524cba1cb4ab456f8bc9ebf37902205074d7975824a06d6cba90dc91503f29801d9c180253bbe4ecefb42ddc82da6d412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 14746276,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
            },
            {
                value: 2200,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                    outIdx: 0,
                },
            },
            {
                value: 14743621,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 371,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 741058,
            hash: '00000000000000000bb6dc63cd48a9b0dcf37a9b722618209dc85a79e8dc7973',
            timestamp: 1653506978,
        },
    },
    {
        txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '63a11be653e333ae3e1075791c996d46b5f476b483c4ccf4ec33b524028d7cd5',
                    outIdx: 1,
                },
                inputScript:
                    '47304402204c6140c524e40653e85440aff615af47a481accc9dc8b45548d59a3ae91d3a0802200aa1667d00b16d3a80c5d4d1b4cabeee415289ef6818496f92abf9ec2db8262c412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 14748931,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 2200,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                    outIdx: 1,
                },
            },
            {
                value: 14746276,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 739747,
            hash: '0000000000000000079aa77192cf335b2004788c2860be98c310a5187a588dd3',
            timestamp: 1652722196,
        },
    },
    {
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 49545,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1300,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 1,
                },
            },
            {
                value: 47790,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 47562,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1200,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 1,
                },
            },
            {
                value: 45907,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                    outIdx: 0,
                },
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 0,
                },
            },
            {
                value: 1745,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '34',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '5',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 2,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '29',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 445,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '050705e14d2d27e1cb59127617d54a5cccd91c4cad6ffe8c2c6eb684e9d76042',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a429b818424b74153b363e487a577142f4e9bd67530739ed6883d8a6d71ea947',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f4734cb1a5e7a64013b5408b9d0d6bc59560b08b9e7284f8bbba217f777f772c02204625fab8a1356f96f00a463be8aa64e90f663744554df60807d1aa1e00d19c5e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1100,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 7700,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                    outIdx: 2,
                },
                inputScript:
                    '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '126',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 1,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '125',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'e94ba6040350284311a6409267c7c1193d6c5f19a9dd76975bbf7355f0c7ed1a',
                    outIdx: 2,
                },
            },
            {
                value: 6655,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 628,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
    {
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1900,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 0,
                },
            },
            {
                value: 945,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
    {
        txid: '96c9031e30dba075dd83f622ed952ef7bb75fe12abdad962e70e9904272a7532',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08cb593e2b2d0a47649990591bf30eee51534f85658fc8ee4e98e12e1c5c5553',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204569cce381885918e300caef1e8a5388b86be871ff3e8f8f52917c26df9dde760220474e3ce3f6363a826d2772e347c296773ea838f493882e15fdc6a5181286a92c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1700,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                    outIdx: 0,
                },
                inputScript:
                    '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1800,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                    outIdx: 0,
                },
            },
            {
                value: 2448,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '8af4664ffc7f23d64f0ddf76a6881d6a9c3bcf1b3f3e6562e8ed70ab5f58f4e6',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 372,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
    {
        txid: 'c25516f6d82e4299849edbd730ecb55b2b0e4745d95735b43bb4d16a67f50113',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a737c1372586cf30d76d8bdcac8e96e2c321f667a77ec4bb9980e603e2a77b3d',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220665f4bf3d94204649f8a1731285eb6e94940e38a3601504612374ec0a06ff27f02206276844772b498726e3e56145d42f2316da5646619d8288598f18e828426881f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1700,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 191,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
    {
        txid: 'de5c518dc2d3d52268c3aeb788134ac373553b2eb239f256fa463c728af87189',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0c67c0b670378c6ae959172eefd099247be944cdb88108d52589731f2194d675',
                    outIdx: 5,
                },
                inputScript:
                    '47304402204b4de25ffee112642136a6d1ad74394c7bfb984a08703d5362500a5521d346dc022053c3e887d7bb27a2525140789a7f450b0995781787ce28750dca1421b746721f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 43783281,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '100',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '99',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'a39c15bc372916359d79196a67f4edbacc515b0a9b8b9a9395e4eb13a9ef2a07',
                    outIdx: 0,
                },
            },
            {
                value: 43781463,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'fcf45f6f12a4442bf206f85c87dfb7cfccdf438927fabbfe314a2c780545dcf9',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 437,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: 'Unexpected burn: Burns 1 base tokens',
                failedColorings: [],
                actualBurnAmount: '1',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
        block: {
            height: 758551,
            hash: '000000000000000004ac3b44419bb5f0e0b47937b3e7e781206270da01b4a53e',
            timestamp: 1663947923,
        },
    },
    {
        txid: 'd34f524ca0509e83718516ce697eeed5452ea0e312bab50ce0172589275fdd84',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100e43086bb67006f6d5140a3329001bc53dabe2da4dbe7feae34dd5f10311b15ad022045da448bc99003af6cf6d4c74ec9891c60932013dde7451abca4a6bc40b6138d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 10409988,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
            },
            {
                value: 1200,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 1,
                },
            },
            {
                value: 10408333,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '4263f3ceb04ec33a7cdb4d076caa4f2311fbdbb50b4330693e91d4ceb2e2fd5d',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 404,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758550,
            hash: '000000000000000009f8cdae9bb21a321896126e06413a4e8af24a182edf701e',
            timestamp: 1663947819,
        },
    },
];

export const mockSortedTxHistoryNoUnconfirmed = [
    {
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 49545,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1300,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 1,
                },
            },
            {
                value: 47790,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 47562,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1200,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 1,
                },
            },
            {
                value: 45907,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                    outIdx: 0,
                },
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 0,
                },
            },
            {
                value: 1745,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '34',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '5',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 2,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '29',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 445,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '050705e14d2d27e1cb59127617d54a5cccd91c4cad6ffe8c2c6eb684e9d76042',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a429b818424b74153b363e487a577142f4e9bd67530739ed6883d8a6d71ea947',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f4734cb1a5e7a64013b5408b9d0d6bc59560b08b9e7284f8bbba217f777f772c02204625fab8a1356f96f00a463be8aa64e90f663744554df60807d1aa1e00d19c5e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1100,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 7700,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                    outIdx: 2,
                },
                inputScript:
                    '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '126',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 1,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '125',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'e94ba6040350284311a6409267c7c1193d6c5f19a9dd76975bbf7355f0c7ed1a',
                    outIdx: 2,
                },
            },
            {
                value: 6655,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 628,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
    {
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1900,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 0,
                },
            },
            {
                value: 945,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
    {
        txid: '96c9031e30dba075dd83f622ed952ef7bb75fe12abdad962e70e9904272a7532',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08cb593e2b2d0a47649990591bf30eee51534f85658fc8ee4e98e12e1c5c5553',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204569cce381885918e300caef1e8a5388b86be871ff3e8f8f52917c26df9dde760220474e3ce3f6363a826d2772e347c296773ea838f493882e15fdc6a5181286a92c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1700,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                    outIdx: 0,
                },
                inputScript:
                    '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1800,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                    outIdx: 0,
                },
            },
            {
                value: 2448,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '8af4664ffc7f23d64f0ddf76a6881d6a9c3bcf1b3f3e6562e8ed70ab5f58f4e6',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 372,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
    {
        txid: 'c25516f6d82e4299849edbd730ecb55b2b0e4745d95735b43bb4d16a67f50113',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a737c1372586cf30d76d8bdcac8e96e2c321f667a77ec4bb9980e603e2a77b3d',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220665f4bf3d94204649f8a1731285eb6e94940e38a3601504612374ec0a06ff27f02206276844772b498726e3e56145d42f2316da5646619d8288598f18e828426881f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1700,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 191,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
    {
        txid: 'de5c518dc2d3d52268c3aeb788134ac373553b2eb239f256fa463c728af87189',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0c67c0b670378c6ae959172eefd099247be944cdb88108d52589731f2194d675',
                    outIdx: 5,
                },
                inputScript:
                    '47304402204b4de25ffee112642136a6d1ad74394c7bfb984a08703d5362500a5521d346dc022053c3e887d7bb27a2525140789a7f450b0995781787ce28750dca1421b746721f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 43783281,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '100',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '99',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'a39c15bc372916359d79196a67f4edbacc515b0a9b8b9a9395e4eb13a9ef2a07',
                    outIdx: 0,
                },
            },
            {
                value: 43781463,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'fcf45f6f12a4442bf206f85c87dfb7cfccdf438927fabbfe314a2c780545dcf9',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 437,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: 'Unexpected burn: Burns 1 base tokens',
                failedColorings: [],
                actualBurnAmount: '1',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
        block: {
            height: 758551,
            hash: '000000000000000004ac3b44419bb5f0e0b47937b3e7e781206270da01b4a53e',
            timestamp: 1663947923,
        },
    },
    {
        txid: 'd34f524ca0509e83718516ce697eeed5452ea0e312bab50ce0172589275fdd84',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100e43086bb67006f6d5140a3329001bc53dabe2da4dbe7feae34dd5f10311b15ad022045da448bc99003af6cf6d4c74ec9891c60932013dde7451abca4a6bc40b6138d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 10409988,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
            },
            {
                value: 1200,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 1,
                },
            },
            {
                value: 10408333,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '4263f3ceb04ec33a7cdb4d076caa4f2311fbdbb50b4330693e91d4ceb2e2fd5d',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 404,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758550,
            hash: '000000000000000009f8cdae9bb21a321896126e06413a4e8af24a182edf701e',
            timestamp: 1663947819,
        },
    },
];

export const mockFlatTxHistoryWithUnconfirmed = [
    {
        txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 2,
                },
                inputScript:
                    '473044022024a187f6dc32082e765eeb37e1a6726e99871b3df0c385ad135ddcf73df0e79102203b81d7eb112a193e23147974432bb12116d75e995aa8c3b6a51943cc4dbd8694412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12214100,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '88888888888',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                    outIdx: 1,
                },
            },
            {
                value: 12213031,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                    outIdx: 67,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 304,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
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
            height: 757174,
            hash: '000000000000000011c5e064ac6295bb1c1e1c306019e591b9c79290c24c33ff',
            timestamp: 1663091856,
        },
    },
    {
        txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 3,
                },
                inputScript:
                    '47304402201623de13a2cd38d379a08dbee1cb2239571b6166bf9923ffe44ae108fd21931c022030dcd5b08a997dcaa7af505a5e513985317b2da91d2f4d4879ee941e3b8931ad412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12218055,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
            },
            {
                value: 3500,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 12214100,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 387,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: 1663090626,
        },
    },
    {
        txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 2,
                },
                inputScript:
                    '47304402202267233e578abb21efa28bc606501f582f94915d3b07ceedff39750877c7211d02206cfec78f41fe58723938c199fa908f4e13ebb298cc989be30faa1e6838c22af1412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12224078,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
            },
            {
                value: 2200,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                    outIdx: 0,
                },
            },
            {
                value: 3300,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 12218055,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 303,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: 1663090626,
        },
    },
    {
        txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f3e4140c8f1614612c07ffe4d35e697d5ffd0931d7b18b9360f5f431c6704d11022002b5fd03e7f9b849fec1c0374dc3df2f1f2dae333980bd02aaa3710b66d1eb0e412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12230101,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 3300,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 2200,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: 'ff40dc28bd694b45d782be8c1726417b8db51fd466e429cf3ee906c9dab0b650',
                    outIdx: 0,
                },
            },
            {
                value: 12224078,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 260,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: 1663090626,
        },
    },
    {
        txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221008f8052c8b78a4d250f4596b3a14c85fb2d253ce20d972422829dc4a68a87320702202b7d272a96996bab1914f693939dfc6300184f5f3db0acc5acfc155ba19d7642412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12233856,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 3300,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 12230101,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: 1663090626,
        },
    },
    {
        txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 1,
                },
                inputScript:
                    '473044022038c75f93d7abe8e6e63c0981203acd48c7e6df92ba52cc9399df84b0b367ee200220356508913a5f8ad94d126891fea372bb2bf66a249bdb63332a4625cb359865f8412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12235011,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript: '6a04007461620454657374',
            },
            {
                value: 700,
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: 12233856,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 245,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 755309,
            hash: '0000000000000000115c75e7b0728b548e9f21bb9ebdcad68d36475e712ceed5',
            timestamp: 1661972428,
        },
    },
    {
        txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f288e71276e2389744ecb3c98bdf0c119d19966ac086c5f5908f8c3a878aa7e402203c07905536720391f472457f52f5cf6aaeb4fa02fdf59722f25768a36fd6157f412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 12243166,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 7700,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                spentBy: {
                    txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                    outIdx: 3,
                },
            },
            {
                value: 12235011,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 743257,
            hash: '000000000000000013259e217a18907ba956c55f839b6b15a11a79a2bf303d9f',
            timestamp: 1654812393,
        },
    },
    {
        txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100d541ef12cc57c3b3cc95b338aec21775b27441d12eda662dcff23a46d07cc9450220467d2aae0dadcae787db33dab6adc86ec47aafea0133cc2130a62bb8247491d6412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 14743621,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 2500000,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                    outIdx: 0,
                },
            },
            {
                value: 12243166,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 742800,
            hash: '000000000000000009e1ed934f027563d161d1f59a00253496b0c847c2288c38',
            timestamp: 1654543720,
        },
    },
    {
        txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
                    outIdx: 1,
                },
                inputScript:
                    '473044022046faa2cc8efc0a06b2cfa8b80b658d4dc09bc1524cba1cb4ab456f8bc9ebf37902205074d7975824a06d6cba90dc91503f29801d9c180253bbe4ecefb42ddc82da6d412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 14746276,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
            },
            {
                value: 2200,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                    outIdx: 0,
                },
            },
            {
                value: 14743621,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 371,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 741058,
            hash: '00000000000000000bb6dc63cd48a9b0dcf37a9b722618209dc85a79e8dc7973',
            timestamp: 1653506978,
        },
    },
    {
        txid: '41e306829bca85422ac5cbf2baad3d1a4e79c3bbb8f042cf0aa7ae2df49535a5',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '63a11be653e333ae3e1075791c996d46b5f476b483c4ccf4ec33b524028d7cd5',
                    outIdx: 1,
                },
                inputScript:
                    '47304402204c6140c524e40653e85440aff615af47a481accc9dc8b45548d59a3ae91d3a0802200aa1667d00b16d3a80c5d4d1b4cabeee415289ef6818496f92abf9ec2db8262c412102c0850ac54a3915aa762c1ada2f50076b2aa4bc7d188eee9b5af6ddfa412a363f',
                value: 14748931,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
            },
        ],
        outputs: [
            {
                value: 2200,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                    outIdx: 1,
                },
            },
            {
                value: 14746276,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 739747,
            hash: '0000000000000000079aa77192cf335b2004788c2860be98c310a5187a588dd3',
            timestamp: 1652722196,
        },
    },
    {
        txid: 'fa2e8951ee2ba44bab33e38c5b903bf77657363cffe268e8ae9f4728e14b04d8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6f0f29e02308fa670e8412f4c2d84e7e46f8d3fd6436dbc8676b8af99bb34a60',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100920a6f8696b0fadd7b82f3450090cd7f198d7287551bb8f08065951c7e5f9455022004d5d8304b056f2f4a6474392665cf8dfd897ea02f18506aced86b552482e404412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008461ccf6961f300a0f8c7ec5526813b531aea5033cacef6d15ab7e033f50130102206d22a9a7bd0ec2f04ace2c0642f233fea3bbed7ee677e53416845a0bfd367044412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '17',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000e080000000000000003',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '14',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 4,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '3',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 1482,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 2,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 481,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
    },
    {
        txid: 'cd4b0008e90b2a872dc92e19cdd87f52466b801f037641193196e75ff10f6990',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0cf5a88f891b76da82c2d48d548f7e445355d6d8695ce91f1aee13e641a34183',
                    outIdx: 1,
                },
                inputScript:
                    '473044022064c39d8fa6b89fcd0961d06ee7c6976c798b2de6f33bdd58b6db56a2c45b235102204444a625e5328eee7139110c03100bdc062292f28d6de8e2b36536a39d2466df412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '4f1a2f3e24b270b57e4d6b9bc6204360cdfeb1dfeca7d92379d49a7ba55c8a5f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cff4ca28b0bd320f4aa7bd3029b0c1e48c392b42c56b7dfdca292bbb14302e5f02206bc74177a98481e49c937a6229ebd8191f653a363c95cd37b69f1300f05f6d3a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ad48dd7d1196b108e3ee0412edcbe468031dcf48244b9b4b57f6cc9e710c836602202e5a00a2c9e1e6fc8937af70fcb8018e299dd007235229e6e3d87f6af9f8761c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '228',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000d0800000000000000d7',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '13',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 3,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '215',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 1255,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 628,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
    },
    {
        txid: '7fcdf5c36d246ede7fb64fed835a2400b0700ecedfdf4e6f738e5a8026d44275',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c30541783609812c5a4066e6395488f3bcabc0cd5a21444d79868c31016b5c9f02200d1c7709f414411a3e3cd9dbf606648339fb2c309b016e490d52aa565510e151412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1700,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1200,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'c8ff3624364c59b0243f8bd341295d9afd6f12b95a2cd7e2630a206120e60bf8',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 192,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '4993ad3b9db58bef37689a304c485bdc16c6418e05d2b57c77f8b8a2fb3450e4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '053d08a11f6da2720a093b55f907a9bdb4246e8ddc032a40347d4823e6c1a046',
                    outIdx: 0,
                },
                inputScript:
                    '47304402202608525692251d17e680b7856da6abda3e92b51fbfc4fc852586355bde4fe6d30220737203dc6832383b5cc1edc45bbc972a7c18e6b3de69fd8f0cc93b0a0fbd3fa5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 5500,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 2,
                },
            },
            {
                value: 3945,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '44898363021248564c3e3b83e1852b1e764e3c9898170ea4a421ac950f5bdd4f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: 'e8bb28fd679fc66ade43a79d088f6b63a2b87d85dbdd5fcd07d7fd7e9be8b1e8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '76684ecd7296b5c97dc8a8ff41a12188ad8b50ba19f2a9c69e67bdb03be6188e',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100ed4f81298d98a4d9c16749cd50ed050dcbbba30266e7c1605f08142ca3f8b9390220298f5290847be114fa33eb931985ea9dd61c39043112db3fcdfcf1efad508247412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1000,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'c8ff3624364c59b0243f8bd341295d9afd6f12b95a2cd7e2630a206120e60bf8',
                    outIdx: 1,
                },
            },
            {
                value: 745,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 49545,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1300,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 1,
                },
            },
            {
                value: 47790,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 47562,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1200,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 1,
                },
            },
            {
                value: 45907,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                    outIdx: 0,
                },
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 0,
                },
            },
            {
                value: 1745,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '34',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '5',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 2,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '29',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 445,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1900,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 0,
                },
            },
            {
                value: 945,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
];

export const mockSortedFlatTxHistoryWithUnconfirmed = [
    {
        txid: 'fa2e8951ee2ba44bab33e38c5b903bf77657363cffe268e8ae9f4728e14b04d8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6f0f29e02308fa670e8412f4c2d84e7e46f8d3fd6436dbc8676b8af99bb34a60',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100920a6f8696b0fadd7b82f3450090cd7f198d7287551bb8f08065951c7e5f9455022004d5d8304b056f2f4a6474392665cf8dfd897ea02f18506aced86b552482e404412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008461ccf6961f300a0f8c7ec5526813b531aea5033cacef6d15ab7e033f50130102206d22a9a7bd0ec2f04ace2c0642f233fea3bbed7ee677e53416845a0bfd367044412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '17',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000e080000000000000003',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '14',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 4,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '3',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 1482,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 2,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 481,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
    },
    {
        txid: 'cd4b0008e90b2a872dc92e19cdd87f52466b801f037641193196e75ff10f6990',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0cf5a88f891b76da82c2d48d548f7e445355d6d8695ce91f1aee13e641a34183',
                    outIdx: 1,
                },
                inputScript:
                    '473044022064c39d8fa6b89fcd0961d06ee7c6976c798b2de6f33bdd58b6db56a2c45b235102204444a625e5328eee7139110c03100bdc062292f28d6de8e2b36536a39d2466df412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '4f1a2f3e24b270b57e4d6b9bc6204360cdfeb1dfeca7d92379d49a7ba55c8a5f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cff4ca28b0bd320f4aa7bd3029b0c1e48c392b42c56b7dfdca292bbb14302e5f02206bc74177a98481e49c937a6229ebd8191f653a363c95cd37b69f1300f05f6d3a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ad48dd7d1196b108e3ee0412edcbe468031dcf48244b9b4b57f6cc9e710c836602202e5a00a2c9e1e6fc8937af70fcb8018e299dd007235229e6e3d87f6af9f8761c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '228',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000d0800000000000000d7',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '13',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 3,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '215',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 1255,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 628,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
    },
    {
        txid: '7fcdf5c36d246ede7fb64fed835a2400b0700ecedfdf4e6f738e5a8026d44275',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '09be4bad8545cb249fe8673be5e45d5d1109a8a91b6a862a6e9ad041e2f3232d',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c30541783609812c5a4066e6395488f3bcabc0cd5a21444d79868c31016b5c9f02200d1c7709f414411a3e3cd9dbf606648339fb2c309b016e490d52aa565510e151412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1700,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1200,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'c8ff3624364c59b0243f8bd341295d9afd6f12b95a2cd7e2630a206120e60bf8',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 192,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '4993ad3b9db58bef37689a304c485bdc16c6418e05d2b57c77f8b8a2fb3450e4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '053d08a11f6da2720a093b55f907a9bdb4246e8ddc032a40347d4823e6c1a046',
                    outIdx: 0,
                },
                inputScript:
                    '47304402202608525692251d17e680b7856da6abda3e92b51fbfc4fc852586355bde4fe6d30220737203dc6832383b5cc1edc45bbc972a7c18e6b3de69fd8f0cc93b0a0fbd3fa5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 5500,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 2,
                },
            },
            {
                value: 3945,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '44898363021248564c3e3b83e1852b1e764e3c9898170ea4a421ac950f5bdd4f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: 'e8bb28fd679fc66ade43a79d088f6b63a2b87d85dbdd5fcd07d7fd7e9be8b1e8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '76684ecd7296b5c97dc8a8ff41a12188ad8b50ba19f2a9c69e67bdb03be6188e',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100ed4f81298d98a4d9c16749cd50ed050dcbbba30266e7c1605f08142ca3f8b9390220298f5290847be114fa33eb931985ea9dd61c39043112db3fcdfcf1efad508247412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1000,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'c8ff3624364c59b0243f8bd341295d9afd6f12b95a2cd7e2630a206120e60bf8',
                    outIdx: 1,
                },
            },
            {
                value: 745,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 49545,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1300,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 1,
                },
            },
            {
                value: 47790,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 47562,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1200,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 1,
                },
            },
            {
                value: 45907,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                    outIdx: 0,
                },
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 0,
                },
            },
            {
                value: 1745,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '34',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '5',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 2,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '29',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 445,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            height: 758570,
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            timestamp: 1663956316,
        },
    },
    {
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                    outIdx: 0,
                },
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 1900,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 0,
                },
            },
            {
                value: 945,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 758569,
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            timestamp: 1663955917,
        },
    },
];

export const mockFlatTxHistoryWithAllUnconfirmed = [
    {
        txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220724f1f261ad1e2b6b21e065632c6da0ebe3701693205f5485b395d747645fdf502207062fda8367c20b3e090391994176bf5b40877c1b60e450d73a37255d6ee10dd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 39162,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2500,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'b1e65a60daf031915bf3aebcf500e14a2d86f4e77c5fa043364f8a9e5698979c',
                    outIdx: 0,
                },
            },
            {
                value: 36207,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 1,
                },
                inputScript:
                    '48304502210084dcee7aefac851d47e1a8dbadc4a6263fe87a661ed37541d611c8765510501f022001e606d50a8c784b0295dd7e4e5fe58f89592cf9d81f4de6daf7bdf6ee2a32a8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 42017,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2400,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '3b994d17cb7e7b0adcb4b680ec1197c7cafa659bb565db61ada359352a40bcdc',
                    outIdx: 2,
                },
            },
            {
                value: 39162,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 3,
                },
                inputScript:
                    '473044022036cd1605ab5122e9769549cf953d5638022c99dcb6c838c77eeaa958e14ba5180220466cced2c01885f83e38e26821238dd0b9697c5029e232cfe6cb5356742ebe58412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 44772,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2300,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '312553668f596bfd61287aec1b7f0f035afb5ddadf40b6f9d1ffcec5b7d4b684',
                    outIdx: 0,
                },
            },
            {
                value: 42017,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 3,
                },
                inputScript:
                    '47304402206be85d81c79a53dc6a598e08091ad6aededdc4a710601c9fb477cff9dab24c7402200ec9bf7b1f0ce605916b8308ebea3d8024280659229db43d53be05ed5a0be5f0412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1825562,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2200,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'dacd4bacb46caa3af4a57ac0449b2cb82c8a32c64645cd6a64041287d1ced556',
                    outIdx: 0,
                },
            },
            {
                value: 1822907,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '60c6ad832e8f44ea59bb15166959b45828d8aec5554a2f70491dddf82dcda837',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100b6a6027d41170d2bb917b632a4a30df60ef3b51e90a27eb701f18a63a99a4313022029ccbace732ee942f8ee5773bbc4a3e3dd046af7e9ccf5889d8c333d27e302d8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1190050,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'd6e5e1511b25e984f2d0850ab47ff1e9fdf8cab546fbd5f5ae36299423a9dde3',
                    outIdx: 0,
                },
            },
            {
                value: 1187495,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '3b40671157eaa30e277819d6bc93acf76377616edbe818d475acbd2cc4b07479',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 3,
                },
                inputScript:
                    '48304502210092f2508a5f19b67be121dc5d8fd70569d9275a11f2c1724db8c714ad4d06b14e02206e8a3101f8ceecc19b5508455e1542c65847951456cf884444e951d6e0cfb5ef412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 46590,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200e225ab4c7d20aef968d95fbf6f881f313c9b35aef891edd4192c5320f147f2502205794732b6242c3a445ee1340ca03950e2044321b9c99bf7d5805ea36cac756dc412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8832',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000000508000000000000227b',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '5',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 8,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8827',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '328df7f6a976c67875035acb051747c443cdac55173aef11ab1c17184162e2e9',
                    outIdx: 2,
                },
            },
            {
                value: 44772,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 480,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
    {
        txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c9cd91d763aeb252b889f815f7ca79e0360f0b208ce7cd95f0353d3615173805',
                    outIdx: 1,
                },
                inputScript:
                    '47304402206a807dad013e5bbb5a78bc12349c550f1867be0ec46ebe4a18ca0ffb45b84cf802206345b92bdec24663bc4fb168d6e1601781969393e93fbcad5279fa72bde08774412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1827380,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200fdb134c8a13fbd1b95ef118c247a8a911e9d52ecaafc86ebb80cc179d69c1e002200bd4dc809c998a511e09f939a3270f7a2f9babae9d75919d2fef83ed66cf7dde412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8836',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000004080000000000002280',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '4',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 7,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8832',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 1,
                },
            },
            {
                value: 1825562,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 479,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
    {
        txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100860067702a7ec139379913db22f4aaaca611e1d5cfd89df1c335bc9b72ee36d0022063892a87d269db12a7be0b24e721900b1f287ce9d1fb18431b2cc508ecebfdf7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 45507,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c96c70b94f5386efff2a8873d35d7b4c29fafe11555cf2a3daea8f905fb0f73502203751a29b351cca9c337345388237b98312873f44976f08667ae6540423a8d012412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8839',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000003080000000000002284',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '3',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 10,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8836',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 1,
                },
            },
            {
                value: 43689,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '7d1929454c7e83707006e9f70000b47fc68805c3e42de6545498f39c6f96d34e',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 481,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
    {
        txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220219fdd01482905c336ef8345973339ebe6f540fb7ff7f04d808357fd73c137b302207cb8af146cdf3ec643d85f71c9b95bc6b4fa4e0c19d5f76baf0329f4e315ab4d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 848,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f8df9b24dc337b5c7b0b41f454fb535a181aa95814d01e3e2246908fda3a5d800220417d4bd3c10d59f9655ddae4229813222abd9a5b148db1a456fde4719ea8dc56412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 4800,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dcc45ddcb243a56ddee5d050dd961d553f4f93704378ce517ad47a161c6f768b022000ef68375269494caa36c9f063ecd6181dfb77b8c4e0e09fdb0433d5a484974e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8841',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000002080000000000002287',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '2',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 9,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8839',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 1,
                },
            },
            {
                value: 3503,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 628,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
    {
        txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100c1717019de60065cae38519a85a80723fc3ee73573739381ee02fcaaa34a15fd022063059a69397ad3108c2f955c92d195a90e8f1f616e23df132abb6675ac5800c2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 992,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '5bb9474c4d682171091ecba6203d3365dab6f3901936122d8035098a80596e2e',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221009b897d907bda2da570c5c273ab277b73c60d8fd39ba605829d0ec4b796fb7c20022011cc67871bf5df4693904fcdee80ac1adba332b14a4cdc9113b15f28e288adad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1191203,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100be82f7c67c73ecf068905a44ca2147d89b8041e54a432386b25137f7bea0d0aa0220416607e30a8d8d8c08237032eeb7728f938650a70215f6615939cd2455569539412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8842',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000001080000000000002289',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 6,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8841',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
            },
            {
                value: 1190050,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 629,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
];

export const mockSortedFlatTxHistoryWithAllUnconfirmed = [
    {
        txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220724f1f261ad1e2b6b21e065632c6da0ebe3701693205f5485b395d747645fdf502207062fda8367c20b3e090391994176bf5b40877c1b60e450d73a37255d6ee10dd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 39162,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2500,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'b1e65a60daf031915bf3aebcf500e14a2d86f4e77c5fa043364f8a9e5698979c',
                    outIdx: 0,
                },
            },
            {
                value: 36207,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 1,
                },
                inputScript:
                    '48304502210084dcee7aefac851d47e1a8dbadc4a6263fe87a661ed37541d611c8765510501f022001e606d50a8c784b0295dd7e4e5fe58f89592cf9d81f4de6daf7bdf6ee2a32a8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 42017,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2400,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '3b994d17cb7e7b0adcb4b680ec1197c7cafa659bb565db61ada359352a40bcdc',
                    outIdx: 2,
                },
            },
            {
                value: 39162,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 3,
                },
                inputScript:
                    '473044022036cd1605ab5122e9769549cf953d5638022c99dcb6c838c77eeaa958e14ba5180220466cced2c01885f83e38e26821238dd0b9697c5029e232cfe6cb5356742ebe58412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 44772,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2300,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '312553668f596bfd61287aec1b7f0f035afb5ddadf40b6f9d1ffcec5b7d4b684',
                    outIdx: 0,
                },
            },
            {
                value: 42017,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 3,
                },
                inputScript:
                    '47304402206be85d81c79a53dc6a598e08091ad6aededdc4a710601c9fb477cff9dab24c7402200ec9bf7b1f0ce605916b8308ebea3d8024280659229db43d53be05ed5a0be5f0412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1825562,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2200,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'dacd4bacb46caa3af4a57ac0449b2cb82c8a32c64645cd6a64041287d1ced556',
                    outIdx: 0,
                },
            },
            {
                value: 1822907,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '60c6ad832e8f44ea59bb15166959b45828d8aec5554a2f70491dddf82dcda837',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100b6a6027d41170d2bb917b632a4a30df60ef3b51e90a27eb701f18a63a99a4313022029ccbace732ee942f8ee5773bbc4a3e3dd046af7e9ccf5889d8c333d27e302d8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1190050,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 2100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'd6e5e1511b25e984f2d0850ab47ff1e9fdf8cab546fbd5f5ae36299423a9dde3',
                    outIdx: 0,
                },
            },
            {
                value: 1187495,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '3b40671157eaa30e277819d6bc93acf76377616edbe818d475acbd2cc4b07479',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    {
        txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 3,
                },
                inputScript:
                    '48304502210092f2508a5f19b67be121dc5d8fd70569d9275a11f2c1724db8c714ad4d06b14e02206e8a3101f8ceecc19b5508455e1542c65847951456cf884444e951d6e0cfb5ef412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 46590,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200e225ab4c7d20aef968d95fbf6f881f313c9b35aef891edd4192c5320f147f2502205794732b6242c3a445ee1340ca03950e2044321b9c99bf7d5805ea36cac756dc412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8832',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000000508000000000000227b',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '5',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 8,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8827',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '328df7f6a976c67875035acb051747c443cdac55173aef11ab1c17184162e2e9',
                    outIdx: 2,
                },
            },
            {
                value: 44772,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 480,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
    {
        txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c9cd91d763aeb252b889f815f7ca79e0360f0b208ce7cd95f0353d3615173805',
                    outIdx: 1,
                },
                inputScript:
                    '47304402206a807dad013e5bbb5a78bc12349c550f1867be0ec46ebe4a18ca0ffb45b84cf802206345b92bdec24663bc4fb168d6e1601781969393e93fbcad5279fa72bde08774412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1827380,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200fdb134c8a13fbd1b95ef118c247a8a911e9d52ecaafc86ebb80cc179d69c1e002200bd4dc809c998a511e09f939a3270f7a2f9babae9d75919d2fef83ed66cf7dde412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8836',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000004080000000000002280',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '4',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 7,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8832',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 1,
                },
            },
            {
                value: 1825562,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 479,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
    {
        txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100860067702a7ec139379913db22f4aaaca611e1d5cfd89df1c335bc9b72ee36d0022063892a87d269db12a7be0b24e721900b1f287ce9d1fb18431b2cc508ecebfdf7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 45507,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c96c70b94f5386efff2a8873d35d7b4c29fafe11555cf2a3daea8f905fb0f73502203751a29b351cca9c337345388237b98312873f44976f08667ae6540423a8d012412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8839',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000003080000000000002284',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '3',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 10,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8836',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 1,
                },
            },
            {
                value: 43689,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '7d1929454c7e83707006e9f70000b47fc68805c3e42de6545498f39c6f96d34e',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 481,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
    {
        txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220219fdd01482905c336ef8345973339ebe6f540fb7ff7f04d808357fd73c137b302207cb8af146cdf3ec643d85f71c9b95bc6b4fa4e0c19d5f76baf0329f4e315ab4d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 848,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f8df9b24dc337b5c7b0b41f454fb535a181aa95814d01e3e2246908fda3a5d800220417d4bd3c10d59f9655ddae4229813222abd9a5b148db1a456fde4719ea8dc56412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 4800,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dcc45ddcb243a56ddee5d050dd961d553f4f93704378ce517ad47a161c6f768b022000ef68375269494caa36c9f063ecd6181dfb77b8c4e0e09fdb0433d5a484974e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8841',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000002080000000000002287',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '2',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 9,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8839',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 1,
                },
            },
            {
                value: 3503,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 628,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
    {
        txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100c1717019de60065cae38519a85a80723fc3ee73573739381ee02fcaaa34a15fd022063059a69397ad3108c2f955c92d195a90e8f1f616e23df132abb6675ac5800c2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 992,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '5bb9474c4d682171091ecba6203d3365dab6f3901936122d8035098a80596e2e',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221009b897d907bda2da570c5c273ab277b73c60d8fd39ba605829d0ec4b796fb7c20022011cc67871bf5df4693904fcdee80ac1adba332b14a4cdc9113b15f28e288adad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 1191203,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100be82f7c67c73ecf068905a44ca2147d89b8041e54a432386b25137f7bea0d0aa0220416607e30a8d8d8c08237032eeb7728f938650a70215f6615939cd2455569539412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8842',
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
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000001080000000000002289',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 6,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8841',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
            },
            {
                value: 1190050,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 629,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
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
    },
];

export const mockParseAliasTxWallet = {
    mnemonic: 'string',
    name: 'string',
    paths: [
        {
            path: 1899,
            hash: 'dc1147663948f0dcfb00cc407eda41b121713ad3',
            address: 'string',
            wif: 'string',
        },
        {
            path: 145,
            hash: 'fcf21a34c255c067e24dfc183f294b50694600a6',
            address: 'string',
            wif: 'string',
        },
        {
            path: 245,
            hash: '6f4f6d5b569b7696bc18593b8593f05bf3edd3d9',
            address: 'string',
            wif: 'string',
        },
    ],
    state: {
        balanceSats: 55421422,
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const anotherMockParseTxWallet = {
    mnemonic: 'string',
    name: 'string',
    paths: [
        {
            path: 1899,
            hash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
            address: 'string',
            wif: 'string',
        },
        {
            path: 145,
            hash: '1fb76a7db96fc774cbad00e8a72890602b4be304',
            address: 'string',
            wif: 'string',
        },
        {
            path: 245,
            hash: 'a9f494266e4b3c823712f27dedcb83e30b2fe59f',
            address: 'string',
            wif: 'string',
        },
    ],
    state: {
        balanceSats: 55421422,
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const mockParseTxWallet = {
    mnemonic: 'string',
    name: 'string',
    paths: [
        {
            path: 1899,
            hash: '76458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
            address: 'string',
            wif: 'string',
        },
        {
            path: 145,
            hash: '438a162355ef683062a7fde9d08dd720397aaee8',
            address: 'string',
            wif: 'string',
        },
        {
            path: 245,
            hash: '58549b5b93428fac88e36617456cd99a411bd0eb',
            address: 'string',
            wif: 'string',
        },
    ],
    state: {
        balanceSats: 55421422,
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const mockAliasWallet = {
    mnemonic: 'string',
    name: 'string',
    paths: [
        {
            path: 1899,
            hash: 'dc1147663948f0dcfb00cc407eda41b121713ad3',
            address: 'string',
            wif: 'string',
        },
        {
            path: 145,
            hash: 'fcf21a34c255c067e24dfc183f294b50694600a6',
            address: 'string',
            wif: 'string',
        },
        {
            path: 245,
            hash: '6f4f6d5b569b7696bc18593b8593f05bf3edd3d9',
            address: 'string',
            wif: 'string',
        },
    ],
    state: {
        balanceSats: 55421422,
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const mockParseTxWalletAirdrop = {
    mnemonic: 'string',
    name: 'string',
    paths: [
        {
            path: 1899,
            hash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
            address: 'string',
            wif: 'string',
        },
        {
            path: 145,
            hash: '1fb76a7db96fc774cbad00e8a72890602b4be304',
            address: 'string',
            wif: 'string',
        },
        {
            path: 245,
            hash: 'a9f494266e4b3c823712f27dedcb83e30b2fe59f',
            address: 'string',
            wif: 'string',
        },
    ],
    state: {
        balanceSats: 55421422,
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const mockParseTxWalletEncryptedMsg = {
    mnemonic:
        'because achieve voyage useful ticket stem armed air pretty stand leaf bicycle',
    name: 'Test Encrypt Burnt Wif',
    paths: [
        {
            path: 1899,
            hash: 'ee6dc9d40f95d8e106a63385c6fa882991b9e84e',
            address: 'ecash:qrhxmjw5p72a3cgx5cect3h63q5erw0gfcvjnyv7xt',
            wif: 'Kwt39o7LZJ54nKyYU2Sz6dAZToXtFvYHtn6xKf2Nbi5E9kZfpHSH',
        },
        {
            path: 145,
            hash: 'dbff532189502b22ecf88e10bc78d42c3785240b',
            address: 'ecash:qrdl75ep39gzkghvlz8pp0rc6skr0pfypv86lqsh33',
            wif: 'L4TaWveyX8xEY7jLnS86JotV3tQkb1GqCaGxymES1i6Mkj5M77Cm',
        },
        {
            path: 245,
            hash: '278ac23f8ef6c40b98c23972cc60effdfe477326',
            address: 'ecash:qqnc4s3l3mmvgzuccguh9nrqal7lu3mnyczktjj205',
            wif: 'L3HmNCzg2fVd8q8JP8fU4mkKhFXo74Gskfp9UatMh7WJ9FTwQQix',
        },
    ],
    state: {
        balanceSats: 49545,
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const mockSwapWallet = {
    mnemonic: '',
    name: 'tx-history-tests',
    paths: [
        {
            path: 1899,
            hash: 'a7d744e1246a20f26238e0510fb82d8df84cc82d',
            address: 'ecash:qznaw38py34zpunz8rs9zrac9kxlsnxg95z8yz0zy4',
            wif: '',
        },
        {
            path: 145,
            hash: '46d48362f35519ff656a3a5ca8cd43755efa74d1',
            address: 'ecash:qprdfqmz7d23nlm9dga9e2xdgd64a7n56yg00sa75k',
            wif: '',
        },
        {
            path: 245,
            hash: '056d6d7e88f008de89ee53fa8b6fe10ffe10271f',
            address: 'ecash:qqzk6mt73rcq3h5faefl4zm0uy8luyp8ru2he6f2vx',
            wif: '',
        },
    ],
    state: {
        balanceSats: 1997,
        tokens: [],
        slpUtxos: [],
        nonSlpUtxos: [],
        parsedTxHistory: [],
    },
};

export const legacyTxHistoryTokenInfoById = {
    'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd': {
        tokenTicker: 'ST',
        tokenName: 'ST',
        tokenDocumentUrl: 'developer.bitcoin.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
    },
    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1': {
        tokenTicker: 'CTP',
        tokenName: 'Cash Tab Points',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
    },
    '1f6a65e7a4bde92c0a012de2bcf4007034504a765377cdf08a3ee01d1eaa6901': {
        tokenTicker: '🍔',
        tokenName: 'Burger',
        tokenDocumentUrl:
            'https://c4.wallpaperflare.com/wallpaper/58/564/863/giant-hamburger-wallpaper-preview.jpg',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '1f6a65e7a4bde92c0a012de2bcf4007034504a765377cdf08a3ee01d1eaa6901',
    },
    'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d': {
        tokenTicker: 'TAP',
        tokenName: 'Thoughts and Prayers',
        tokenDocumentUrl: '',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
    },
    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e': {
        tokenTicker: 'TBC',
        tokenName: 'tabcash',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    },
    'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb': {
        tokenTicker: 'NAKAMOTO',
        tokenName: 'NAKAMOTO',
        tokenDocumentUrl: '',
        tokenDocumentHash: '',
        decimals: 8,
        tokenId:
            'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
    },
    '22f4ba40312ea3e90e1bfa88d2aa694c271d2e07361907b6eb5568873ffa62bf': {
        tokenTicker: 'CLA',
        tokenName: 'Cashtab Local Alpha',
        tokenDocumentUrl: 'boomertakes.com',
        tokenDocumentHash: '',
        decimals: 5,
        tokenId:
            '22f4ba40312ea3e90e1bfa88d2aa694c271d2e07361907b6eb5568873ffa62bf',
    },
    'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0': {
        tokenTicker: 'SA',
        tokenName: 'Spinner Alpha',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
    },
    '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875': {
        tokenTicker: 'LVV',
        tokenName: 'Lambda Variant Variants',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
    },
    '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4': {
        tokenTicker: 'CGEN',
        tokenName: 'Cashtab Genesis',
        tokenDocumentUrl: 'https://boomertakes.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
    },
    'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba': {
        tokenTicker: 'TBS',
        tokenName: 'TestBits',
        tokenDocumentUrl: 'https://thecryptoguy.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
    },
    'aa7202397a06097e8ff36855aa72c0ee032659747e5bd7cbcd3099fc3a62b6b6': {
        tokenTicker: 'CTL',
        tokenName: 'Cashtab Token Launch Launch Token',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'aa7202397a06097e8ff36855aa72c0ee032659747e5bd7cbcd3099fc3a62b6b6',
    },
    '9e9738e9ac3ff202736bf7775f875ebae6f812650df577a947c20c52475e43da': {
        tokenTicker: 'CUTT',
        tokenName: 'Cashtab Unit Test Token',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 2,
        tokenId:
            '9e9738e9ac3ff202736bf7775f875ebae6f812650df577a947c20c52475e43da',
    },
    'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a': {
        tokenTicker: 'POW',
        tokenName: 'ProofofWriting.com Token',
        tokenDocumentUrl: 'https://www.proofofwriting.com/26',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
    },
    '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1': {
        tokenTicker: 'HONK',
        tokenName: 'HONK HONK',
        tokenDocumentUrl: 'THE REAL HONK SLP TOKEN',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
    },
    '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9': {
        tokenTicker: '001',
        tokenName: '01',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
    },
    '6fb6122742cac8fd1df2d68997fdfa4c077bc22d9ef4a336bfb63d24225f9060': {
        tokenTicker: '002',
        tokenName: '2',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '6fb6122742cac8fd1df2d68997fdfa4c077bc22d9ef4a336bfb63d24225f9060',
    },
    '2936188a41f22a3e0a47d13296147fb3f9ddd2f939fe6382904d21a610e8e49c': {
        tokenTicker: '002',
        tokenName: '2',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '2936188a41f22a3e0a47d13296147fb3f9ddd2f939fe6382904d21a610e8e49c',
    },
    'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b': {
        tokenTicker: 'test',
        tokenName: 'test',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 1,
        tokenId:
            'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
    },
    'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c': {
        tokenTicker: 'Service',
        tokenName: 'Evc token',
        tokenDocumentUrl: 'https://cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
    },
    '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d': {
        tokenTicker: 'WDT',
        tokenName:
            'Test Token With Exceptionally Long Name For CSS And Style Revisions',
        tokenDocumentUrl:
            'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
        tokenDocumentHash:
            '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
        decimals: 7,
        tokenId:
            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
    },
    '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b': {
        tokenTicker: 'COVID',
        tokenName: 'COVID-19',
        tokenDocumentUrl: 'https://en.wikipedia.org/wiki/COVID-19',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
    },
    '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc': {
        tokenTicker: 'CLT',
        tokenName: 'Cashtab Local Tests',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
    },
    '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96': {
        tokenTicker: 'CPG',
        tokenName: 'Cashtab Prod Gamma',
        tokenDocumentUrl: 'thecryptoguy.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
    },
    '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6': {
        tokenTicker: 'CLNSP',
        tokenName: 'ComponentLongNameSpeedLoad',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
    },
    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55': {
        tokenTicker: 'CTB',
        tokenName: 'CashTabBits',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
    },
    'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f': {
        tokenTicker: 'XGB',
        tokenName: 'Garmonbozia',
        tokenDocumentUrl: 'https://twinpeaks.fandom.com/wiki/Garmonbozia',
        tokenDocumentHash: '',
        decimals: 8,
        tokenId:
            'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
    },
    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3': {
        tokenTicker: 'NOCOVID',
        tokenName: 'Covid19 Lifetime Immunity',
        tokenDocumentUrl:
            'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
    },
    'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc': {
        tokenTicker: 'CTD',
        tokenName: 'Cashtab Dark',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
    },
    '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a': {
        tokenTicker: 'XBIT',
        tokenName: 'eBits',
        tokenDocumentUrl: 'https://boomertakes.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
    },
    '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8': {
        tokenTicker: 'CLB',
        tokenName: 'Cashtab Local Beta',
        tokenDocumentUrl: 'boomertakes.com',
        tokenDocumentHash: '',
        decimals: 2,
        tokenId:
            '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
    },
    '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168': {
        tokenTicker: 'coin',
        tokenName: 'johncoin',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168',
    },
    '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25': {
        tokenTicker: 'CFL',
        tokenName: 'Cashtab Facelift',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
    },
    'd376ebcd518067c8e10c0505865cf7336160b47807e6f1a95739ba90ae838840': {
        tokenTicker: 'CFL',
        tokenName: 'Cashtab Facelift',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'd376ebcd518067c8e10c0505865cf7336160b47807e6f1a95739ba90ae838840',
    },
    'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0': {
        tokenTicker: 'KAT',
        tokenName: 'KA_Test',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
    },
    'b39fdb53e21d67fa5fd3a11122f1452f15884047f2b80e8efe633c3b520b7a39': {
        tokenTicker: 'SCΩΩG',
        tokenName: 'Scoogi Omega',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'b39fdb53e21d67fa5fd3a11122f1452f15884047f2b80e8efe633c3b520b7a39',
    },
    '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577': {
        tokenTicker: 'OMI',
        tokenName: 'Omicron',
        tokenDocumentUrl: 'cdc.gov',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
    },
    '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917': {
        tokenTicker: 'CTL2',
        tokenName: 'Cashtab Token Launch Launch Token v2',
        tokenDocumentUrl: 'thecryptoguy.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
    },
    '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524': {
        tokenTicker: 'CBB',
        tokenName: 'Cashtab Beta Bits',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
    },
    '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8': {
        tokenTicker: 'IFP',
        tokenName: 'Infrastructure Funding Proposal Token',
        tokenDocumentUrl: 'ifp.cash',
        tokenDocumentHash:
            'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553',
        decimals: 8,
        tokenId:
            '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
    },
    'e4e1a2fb071fa71ca727e08ed1d8ea52a9531c79d1e5f1ebf483c66b71a8621c': {
        tokenTicker: 'CPA',
        tokenName: 'Cashtab Prod Alpha',
        tokenDocumentUrl: 'thecryptoguy.com',
        tokenDocumentHash: '',
        decimals: 8,
        tokenId:
            'e4e1a2fb071fa71ca727e08ed1d8ea52a9531c79d1e5f1ebf483c66b71a8621c',
    },
    '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6': {
        tokenTicker: 'CMA',
        tokenName: 'CashtabMintAlpha',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 5,
        tokenId:
            '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
    },
    '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55': {
        tokenTicker: 'CKA',
        tokenName: 'Chronik Alpha',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 8,
        tokenId:
            '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
    },
    '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6': {
        tokenTicker: 'CTLv3',
        tokenName: 'Cashtab Token Launch Launch Token v3',
        tokenDocumentUrl: 'coinex.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
    },
    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48': {
        tokenTicker: 'DVV',
        tokenName: 'Delta Variant Variants',
        tokenDocumentUrl: 'https://cashtabapp.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
    },
    'bfddfcfc9fb9a8d61ed74fa94b5e32ccc03305797eea461658303df5805578ef': {
        tokenTicker: 'Sending Token',
        tokenName: 'Sending Token',
        tokenDocumentUrl: 'developer.bitcoin.com',
        tokenDocumentHash: '',
        decimals: 9,
        tokenId:
            'bfddfcfc9fb9a8d61ed74fa94b5e32ccc03305797eea461658303df5805578ef',
    },
    '55180a2527901ed4d7ef8f4d61d38d3543b0e7ac3aba04e7f4d3165c3320a6da': {
        tokenTicker: 'cARRRl',
        tokenName: 'Dachshund Pirate Token',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '55180a2527901ed4d7ef8f4d61d38d3543b0e7ac3aba04e7f4d3165c3320a6da',
    },
    '6a9305a13135625f4b533256e8d2e21a7343005331e1839348a39040f61e09d3': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Alpha',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '6a9305a13135625f4b533256e8d2e21a7343005331e1839348a39040f61e09d3',
    },
    '48090bcd94cf53289ce84e1d4aeb8035f6ea7d80d37baa6343d0f71e7d67a3ef': {
        tokenTicker: 'WP5',
        tokenName: 'Webpack 5',
        tokenDocumentUrl: 'boomertakes.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '48090bcd94cf53289ce84e1d4aeb8035f6ea7d80d37baa6343d0f71e7d67a3ef',
    },
    '27277911435164c511c7dbc3ef00ba5ce9edf8c1ccab93681cb0ad984b801ef1': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Alpha',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '27277911435164c511c7dbc3ef00ba5ce9edf8c1ccab93681cb0ad984b801ef1',
    },
    'a3add503bba986398b39fa2200ce658423a597b4f7fe9de04a2da4501f8b05a3': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Gamma',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'a3add503bba986398b39fa2200ce658423a597b4f7fe9de04a2da4501f8b05a3',
    },
    '8b402aab7682e1cef3da83bf754ae722cc95c3118dfe6e2149267f9a9e2ecc63': {
        tokenTicker: 'AUG5',
        tokenName: 'August 5',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '8b402aab7682e1cef3da83bf754ae722cc95c3118dfe6e2149267f9a9e2ecc63',
    },
    '2502bdc75d3afdce0742505d53e6d50cefb1268d7c2a835c06b701702b79e1b8': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Epsilon',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            '2502bdc75d3afdce0742505d53e6d50cefb1268d7c2a835c06b701702b79e1b8',
    },
    'f29939b961d8f3b27d7826e3f22451fcf9273ac84421312a20148b1e083a5bb0': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Beta',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'f29939b961d8f3b27d7826e3f22451fcf9273ac84421312a20148b1e083a5bb0',
    },
    'edb693529851379bcbd75008f78940df8232510e6a1c64d8dc81693ae2a53f66': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Eta',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'edb693529851379bcbd75008f78940df8232510e6a1c64d8dc81693ae2a53f66',
    },
    'c70d5f036368e184d2a52389b2f4c2471855aebaccbd418db24d4515ce062dbe': {
        tokenTicker: 'SCOOG',
        tokenName: 'Scoogi Zeta',
        tokenDocumentUrl: 'cashtab.com',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'c70d5f036368e184d2a52389b2f4c2471855aebaccbd418db24d4515ce062dbe',
    },
    'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7': {
        tokenTicker: 'SRM',
        tokenName: 'Server Redundancy Mint',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 0,
        tokenId:
            'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
    },
    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484': {
        tokenTicker: 'Alita',
        tokenName: 'Alita',
        tokenDocumentUrl: 'alita.cash',
        tokenDocumentHash: '',
        decimals: 4,
        tokenId:
            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
    },
    'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50': {
        tokenTicker: 'UDT',
        tokenName: 'UpdateTest',
        tokenDocumentUrl: 'https://cashtab.com/',
        tokenDocumentHash: '',
        decimals: 7,
        tokenId:
            'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
    },
};
const calculatedTxHistoryTokenInfoById = new Map();
const legacyTxHistoryTokenInfoByIdTokenIds = Object.keys(
    legacyTxHistoryTokenInfoById,
);
for (const tokenId of legacyTxHistoryTokenInfoByIdTokenIds) {
    const legacyGenesisInfo = JSON.parse(
        JSON.stringify(legacyTxHistoryTokenInfoById[tokenId]),
    );
    // Remove the tokenId key which we do not need stored at the value
    delete legacyGenesisInfo.tokenId;
    calculatedTxHistoryTokenInfoById.set(tokenId, legacyGenesisInfo);
}
export const txHistoryTokenInfoById = calculatedTxHistoryTokenInfoById;

export const stakingRwd = {
    tx: {
        txid: 'c8b0783e36ab472f26108007ffa522ee82b79db3777c84b0448f5b9ef35be895',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '0000000000000000000000000000000000000000000000000000000000000000',
                    outIdx: 4294967295,
                },
                inputScript:
                    '03f07d0c0439e5546508edc754ac9b2939000c736f6c6f706f6f6c2e6f7267',
                value: 0,
                sequenceNo: 0,
            },
        ],
        outputs: [
            {
                value: 362505204,
                outputScript:
                    '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
                spentBy: {
                    txid: '6a26b853ba356cdc4a927c43afe33f03d30ef2367bd1f2c190a8c2e15f77fb6d',
                    outIdx: 1,
                },
            },
            {
                value: 200002871,
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                spentBy: {
                    txid: 'c5621e2312eaabcfa53af46b62384f1751c509b9ff50d1bf218f92723be01bc7',
                    outIdx: 2,
                },
            },
            {
                value: 62500897,
                outputScript:
                    // Manually set for unit test
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '98e47dda8c20facafff11fec7c6453f9d8afdd24281eb6129b76bfef90dd6bab',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 182,
        isCoinbase: true,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 818672,
            hash: '000000000000000009520291eb09aacd13b7bb802f329b584dafbc036a15b4cb',
            timestamp: 1700062633,
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '625008.97',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'N/A',
    },
};

export const incomingXec = {
    tx: {
        txid: 'ac83faac54059c89c41dea4c3d6704e4f74fb82e4ad2fb948e640f1d19b760de',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '783428349b7b040b473ca9720ddbb2eda6fe28db16883ae47f3113b7a0977915',
                    outIdx: 1,
                },
                inputScript:
                    '48304502210094c497d6a0ce9ca6d79819467a1bb3953084b2e003ac7edac3b4f0634800baab02205729e229bd96d3a35cece712e3e9ec2d3f610a43d7712928f806983f209fbd72412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 517521,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 4200,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '23b4ac14065f0b8bb594e35a366cb707b52c4630398439d79c4cd179d005a298',
                    outIdx: 2,
                },
            },
            {
                value: 512866,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0f4e0e3ad405a5b40a3f0cef78d55093729aa6504e420dc5ceaf1445beecbded',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 739911,
            hash: '00000000000000000a6da230a41e268bb42ad7f4e9f939b6875c4fb2293bcd6f',
            timestamp: 1652812528,
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '42',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};

export const outgoingXec = {
    tx: {
        txid: 'b82a67f929d256c9beb04a850ad735f3b322156cc9df2e37cadc130cc4fab660',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bb161d20f884ce45374fa3f9f1452290a2e52e93c8b552f559fad8ccd1ca33cc',
                    outIdx: 5,
                },
                inputScript:
                    '473044022054a6b2065a0b0bbe70048e782aa9be048cc8bee0a241d08d0b98fcd74505a90202201ed5224f34c9ff73dc0c581390247686af521476a977a58e55ed33c4afd177c2412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 4400000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 22200,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '692a900ae6607d2b798df2cc1e8856aa812b158880c99295041d8a8b70c88d01',
                    outIdx: 1,
                },
            },
            {
                value: 4377345,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '69b060294e7b49fdf45f0a6eb500a03a881a2f54c86238b54718880470629cee',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 739925,
            hash: '00000000000000001456e79aafc77f5cfecd77cda1252698d8f03e04b0a299d1',
            timestamp: 1652824018,
        },
    },
    parsed: {
        incoming: false,
        xecAmount: '222',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
    },
};

export const aliasRegistration = {
    tx: {
        txid: 'f64608b13daf977008cfb96eb97082014c11cad5575956591a7ac9832d4fca9c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '9e06c1e03220a04abe2207ffcc3ce6600c11ad45890dd298ff24c92baba6b457',
                    outIdx: 2,
                },
                inputScript:
                    '48304502210087cd61371447a4e8426b86ea9c8643a94a378701c436e7d88b46eb64886a2c9d02201943c4b17eed65e37153659edff07aede69c1695254fe811180d616809daacf74121028bd858b877988795ed097c6e6230363450a3ceda58b15b0a76f0113d933c10a6',
                value: 20105,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a042e7865630004627567321500dc1147663948f0dcfb00cc407eda41b121713ad3',
            },
            {
                value: 555,
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                spentBy: {
                    txid: 'fabf82bda2c0d460bade2bcd0d9845ecb12508f31074ddcc4db4928fda44f3ec',
                    outIdx: 154,
                },
            },
            {
                value: 19095,
                outputScript:
                    '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                spentBy: {
                    txid: '8684205e5bc1ae154886f1701d2a492b67ad0ffc5e372087fcc981d69a67d407',
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
            height: 812499,
            hash: '00000000000000000d135cbee30d24ae913e68b4de2ffd776ab30e35c92cd338',
            timestamp: 1696335276,
        },
    },
    parsed: {
        incoming: false,
        xecAmount: '5.55',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: 'bug2',
        replyAddress: 'ecash:qrwpz3mx89y0ph8mqrxyqlk6gxcjzuf66vc4ajscad',
    },
};

export const incomingEtoken = {
    tx: {
        txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '51c18b220c2ff1d3ead60c3031316f15ed1c7fa43fbfe563c8227e107f218751',
                    outIdx: 1,
                },
                inputScript:
                    '473044022004db23a179194d5e2d8446159859a3e55521239c807f14d4666c772d1493a7d402206d6ea22a4fb8ef20cd6159d200a7292a3ff0181c8d596e7a3e1b9027e6912103412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3891539,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c45951e15402b907c419f8a80bd76d374521faf885327ba3e55021345c2eb41902204cdb84e0190a5f671dd049b6b656f6b9e8b57254ec0123308345d5a634802acd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '240',
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
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000c0800000000000000e4',
            },
            {
                value: 546,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '12',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '96ddf598c00edd493a020fea6ac382b708753cc8b7690f673685af64916089dd',
                    outIdx: 7,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '228',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'cd4b0008e90b2a872dc92e19cdd87f52466b801f037641193196e75ff10f6990',
                    outIdx: 2,
                },
            },
            {
                value: 3889721,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '648b9f3a7e9c52f7654b6bba0e00c73bcf58aeed2a9381c4ab45ee32d214284b',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 480,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            height: 739924,
            hash: '000000000000000010d2929cd5721cd975ea4425a39c5cb12cfcf5e20f52628a',
            timestamp: 1652822224,
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            decimals: 0,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenName: 'Covid19 Lifetime Immunity',
            tokenTicker: 'NOCOVID',
        },
        etokenAmount: '12',
        airdropFlag: false,
        airdropTokenId: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};

export const outgoingEtoken = {
    tx: {
        txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'bf7a7d1a063751d8f9c67e88523b3e6ffe8bb133e54ebf3cf500b859adfe16e0',
                    outIdx: 1,
                },
                inputScript:
                    '473044022047077b516d8554aba4deb36c66b789b5136bf16657bf1675ae866fd8a62834f5022035a7bd45422e0d0c343ac832a5efb0c05269ebe591ea400a33c23849cfa7c3a0412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 450747149,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                prevOut: {
                    txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                    outIdx: 1,
                },
                inputScript:
                    '47304402203ba0eff663f253805a4ae75fecf5886d7dbaf6369c9e6f0bbf5c114184223fa202207992c5f1a8cb69b552b1af54a75bbab341bfcf90591e535282bd9409981d8464412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '69',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3080000000000000011080000000000000034',
            },
            {
                value: 546,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '17',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'fa2e8951ee2ba44bab33e38c5b903bf77657363cffe268e8ae9f4728e14b04d8',
                    outIdx: 1,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '52',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'fb12358a18b6d6e563b7790f8e08ca9c9260df747c5e9113901fed04094be03d',
                    outIdx: 1,
                },
            },
            {
                value: 450745331,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '23b4ac14065f0b8bb594e35a366cb707b52c4630398439d79c4cd179d005a298',
                    outIdx: 3,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 479,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            height: 739925,
            hash: '00000000000000001456e79aafc77f5cfecd77cda1252698d8f03e04b0a299d1',
            timestamp: 1652824018,
        },
    },
    parsed: {
        incoming: false,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        tokenEntries: [
            {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
            decimals: 0,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenName: 'Covid19 Lifetime Immunity',
            tokenTicker: 'NOCOVID',
        },
        etokenAmount: '17',
        airdropFlag: false,
        airdropTokenId: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
    },
};

export const genesisTx = {
    tx: {
        txid: 'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100ab2a1e04a156e9cc5204e11e77ba399347f3b7ea3e05d45897c7fb7c6854a7ff022065c7e096e0526a0af223ce32e5e162aa577c42f7da231c13e28ebc3532396f20412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 1300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e45534953035544540a557064617465546573741468747470733a2f2f636173687461622e636f6d2f4c0001074c000800000001cf977871',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '7777777777',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 268,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
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
            height: 759037,
            hash: '00000000000000000bc95bfdd45e71585f27139e71b56dd5bc86ef05d35b502f',
            timestamp: 1664226709,
        },
    },
    parsed: {
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        isTokenBurn: false,
        etokenAmount: '777.7777777',
        tokenEntries: [
            {
                tokenId:
                    'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
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
        genesisInfo: {
            decimals: 7,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl: 'https://cashtab.com/',
            tokenName: 'UpdateTest',
            tokenTicker: 'UDT',
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
};

export const incomingEtokenNineDecimals = {
    tx: {
        txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 3,
                },
                inputScript:
                    '4830450221009d649476ad963306a5210d9df2dfd7e2bb604be43d6cdfe359638d96239973eb02200ac6e71575f0f111dad2fbbeb2712490cc709ffe03eda7de33acc8614b2c0979412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3503,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '82d8dc652779f8d6c8453d2ba5aefec91f5247489246e5672cf3c5986fa3d235',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100b7bec6d09e71bc4c124886e5953f6e7a7845c920f66feac2e9e5d16fc58a649a0220689d617c11ef0bd63dbb7ea0fa5c0d3419d6500535bda8f7a7fc3e27f27c3de6412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '9876543156',
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
                    '6a04534c500001010453454e4420acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f550800000000075bcd1508000000024554499f',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '123456789',
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
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '9753086367',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 1685,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '04b16fa516fbdd64d51b8aa1a752855beb4250d99199322d89d9c4c6172a1b9f',
                    outIdx: 4,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 481,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
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
            height: 760076,
            hash: '00000000000000000bf1ee10a21cc4b784ea48840fa00237e41f69a027c6a86c',
            timestamp: 1664840266,
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        etokenAmount: '0.123456789',
        tokenEntries: [
            {
                tokenId:
                    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
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
            decimals: 9,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenName: 'CashTabBits',
            tokenTicker: 'CTB',
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};

export const legacyAirdropTx = {
    tx: {
        txid: '6e3baf279770c3ed84981c414f433e654cdc1b12df3024051f0f7c215a13dca9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '806abb677534eaa3b61ca050b65d4159d64e442699dd5460be87786f973bc079',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207acf2b13eb099b42edf2d985afc4da3123a76e3120a66cd2e915fdd93b9ce243022055529f4f4db28c2d3b3ce98fd55dd539c92f0790d36cf8a63a4fbb89eb602b2a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                value: 1595,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
            },
            {
                prevOut: {
                    txid: 'c257bdccd3804de5ce1359d986488902d73e11156e544ca9eaf15d9d3878a83c',
                    outIdx: 111,
                },
                inputScript:
                    '47304402205f670a5afb2b6cb10ae86818f50c0dd9a9bc639e979a3325ab8834c5631ac81b022078ce9092a5ded4afe261f1b311e5619f1f8673ace9de5dae3441f33834ecb33a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                value: 22600,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
            },
            {
                prevOut: {
                    txid: '8db1137ec2cdaa0c5a93c575352eaf024ce304f189c91094cc6b711be876dff4',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100cca98ffbd5034f1f07c459a2f7b694d0bfc8cd9c0f33fe0b45d5914a10b034610220592d50dd5f1fea5c1d689909e61d1d1bfad21ea6a42a01ba7d4e9428baedca06412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                value: 170214,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
            },
            {
                prevOut: {
                    txid: '5c7e9879f94258e7128f684c0be7786d9d2355c1f3b3ded5382e3a2745d9ec53',
                    outIdx: 111,
                },
                inputScript:
                    '483045022100fefd74866d212ff97b54fb4d6e588754b13d073b06200f255d891195fc57cb0502201948da90078778ab195c8adec213cc09972a1c89f8a35d10294894bcbf313941412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                value: 22583,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
            },
            {
                prevOut: {
                    txid: '6b86db3a0adb9963c3fbf911ad3935b611ea6224834f1664e0bdfc026fd57fc9',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100e4dde7a7d227f0631d042a1953e55400b00386050eff672832e557a4438f0f0b022060fd64cb142723578a4fd25c703d7afa0db045d981c75f770cb66b3b87ccc72a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                value: 16250,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
            },
            {
                prevOut: {
                    txid: '81f52f89efc61072dcab4735f1a99b6648c8cc10314452185e728b383b170e30',
                    outIdx: 23,
                },
                inputScript:
                    '483045022100f057b22cbc643d6aa839d64c96eede889782e4738104dde84c5980089c75c9e702200449b7ad1e88141def532e3cd2943dfa29a9ede8a6d0b3283531dee085b867b1412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                value: 23567578,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a0464726f7020bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c04007461624565766320746f6b656e207365727669636520686f6c64657273206169722064726f70f09fa587f09f8c90f09fa587e29da4f09f918cf09f9bacf09f9bacf09f8d97f09fa4b4',
            },
            {
                value: 550,
                outputScript:
                    '76a9140352e2c246fa38fe57f6504dcff628a2ab85c9a888ac',
            },
            {
                value: 550,
                outputScript:
                    '76a9147d2acc561f417bf3265d465fbd76b7976cd35add88ac',
            },
            {
                value: 550,
                outputScript:
                    '76a91478a291a19347161a532f31cae95d492cc57965e888ac',
                spentBy: {
                    txid: 'dc5bbe05a2a0e22d4c7bd241498213208610cf56868d72268913491c3c099507',
                    outIdx: 47,
                },
            },
            {
                value: 584,
                outputScript:
                    '76a91478cc64d09c2c558e2c7f1baf463f4e2a6246559888ac',
            },
            {
                value: 10027,
                outputScript:
                    '76a91471536340a5ad319f24ae433d7caa4475dd69faec88ac',
            },
            {
                value: 10427,
                outputScript:
                    '76a914649be1781f962c54f47273d58e31439fb452b92988ac',
            },
            {
                value: 560,
                outputScript:
                    '76a914be3ce499e31ebe80c7aabf673acd854c8969ddc488ac',
            },
            {
                value: 551,
                outputScript:
                    '76a914e88f39383c4d264410f30d2b28cdae775c67ea8e88ac',
                spentBy: {
                    txid: '739fda27cd573dcfe22086463263c96232990473fc017ce83da7c996058e63fb',
                    outIdx: 0,
                },
            },
            {
                value: 557,
                outputScript:
                    '76a9145fbce9959ce7b712393138aef20b013d5a2802e688ac',
            },
            {
                value: 550,
                outputScript:
                    '76a91450f35e3861d60945efcd2b05f562eff14d28db1088ac',
                spentBy: {
                    txid: '558a3526d3bbc29ba8a2eb5466a7b4d6d5d544e7e83c1c15346fa03bdec1c6c1',
                    outIdx: 0,
                },
            },
            {
                value: 10027,
                outputScript:
                    '76a914866ed8973e444d1f6533eb1858ca284ad589bc1988ac',
            },
            {
                value: 555,
                outputScript:
                    '76a9140848ee10a336bba27c7ee90dc4a1c2407178a5b788ac',
            },
            {
                value: 550,
                outputScript:
                    '76a9149750cdddb976b8466668a73b58c0a1afbd6f4db888ac',
            },
            {
                value: 560,
                outputScript:
                    '76a9148ee151bf0f1637cdd2e1b41ed2cd32b0df0a932588ac',
            },
            {
                value: 590,
                outputScript:
                    '76a914be792ef52fb6bc5adcabeb8eb604fbbb3dc4693488ac',
            },
            {
                value: 551,
                outputScript:
                    '76a9142ad96e467f9354f86e0c11acfde351194a183dc888ac',
                spentBy: {
                    txid: 'a900d93eea490d121bb9cb11457ee0f86edb53d5b7a26984567b8cf1b282adbc',
                    outIdx: 10,
                },
            },
            {
                value: 550,
                outputScript:
                    '76a914afd2470f264252f1359d7b8093fff4fdd120c5f988ac',
            },
            {
                value: 584,
                outputScript:
                    '76a9148a8e920239fb5cc647855c1d634b0bbe4c4b670188ac',
                spentBy: {
                    txid: '9bd869aff043b96ea03274abf6183bcb521c1949177ed948792636c68050283c',
                    outIdx: 71,
                },
            },
            {
                value: 569,
                outputScript:
                    '76a91412f84f54fad4695321f61c313d2e32a0a8f8086488ac',
            },
            {
                value: 584,
                outputScript:
                    '76a914842b152a0bbd4647afaeceec8a6afaa90668e7c788ac',
            },
            {
                value: 584,
                outputScript:
                    '76a914fe971eb2960defce93503c5641d54eaad2ab6a0588ac',
            },
            {
                value: 584,
                outputScript:
                    '76a914685e825961b67456f440caaaaab0f94cb3354b7288ac',
            },
            {
                value: 584,
                outputScript:
                    '76a91476b4447a3617e918d03261353e179a583f85d2c688ac',
            },
            {
                value: 584,
                outputScript: 'a91418bb4f7d8881c1d1457c33a6af8e5937f7f776a887',
            },
            {
                value: 584,
                outputScript:
                    '76a914b366ef7c1ffd4ef452d72556634720cc8741e1dc88ac',
                spentBy: {
                    txid: 'bf41ebe360b6990ca60ab9b5fa24d9acde29b07b924d885ccd8d71e9aa1e5dc9',
                    outIdx: 0,
                },
            },
            {
                value: 553,
                outputScript:
                    '76a914f5e82dc01170d99a16bf9610da873df47f82aa7a88ac',
            },
            {
                value: 569,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '04dfbdc61976ed57e65f2d02e2d55994ae6e963c9baea4f2c4b13c278b6fe981',
                    outIdx: 2,
                },
            },
            {
                value: 553,
                outputScript:
                    '76a9142ed681dc5421dd4a052f49bda55a9c345fb025e088ac',
            },
            {
                value: 584,
                outputScript:
                    '76a914b87d445b2dbba65c5a5bb79959b44c24593518f888ac',
            },
            {
                value: 553,
                outputScript: 'a9147d91dc783fb1c5b7f24befd92eedc8dabfa8ab7e87',
            },
            {
                value: 584,
                outputScript: 'a914f722fc8e23c5c23663aa3273f445b784b223aab587',
            },
            {
                value: 584,
                outputScript:
                    '76a914940840311cbe6013e59aff729ffc1d902fd74d1988ac',
            },
            {
                value: 584,
                outputScript:
                    '76a914d394d084607bce97fa4e661b6f2c7d2f237c89ee88ac',
            },
            {
                value: 558,
                outputScript:
                    '76a91470e1b34c51cd5319c5ca54da978a6422605e6b3e88ac',
            },
            {
                value: 556,
                outputScript:
                    '76a91440eeb036d9d6bc71cd65b91eb5bbfa5d808805ca88ac',
                spentBy: {
                    txid: '52fe7794f3aba1b6a7e50e8f65aa46c84b13d4c389e1beaba97fc49d096fe678',
                    outIdx: 4,
                },
            },
            {
                value: 584,
                outputScript:
                    '76a9144d55f769ce14fd44e2b63500d95016838a5d130d88ac',
            },
            {
                value: 584,
                outputScript:
                    '76a914a17ee8562ede98dfe9cd00f7f84d74c4c9c58ee788ac',
                spentBy: {
                    txid: '12de87fc94b76324b2ef4f8f8cbf22318146097b330904097131b56d386eee22',
                    outIdx: 11,
                },
            },
            {
                value: 584,
                outputScript:
                    '76a914a13fc3642d1e7293eb4b9f17ec1b6f6d7ea4aaeb88ac',
                spentBy: {
                    txid: '68ff340f746736b20d0015d3a63140bbd53dc982ce592e2bd503a7c3c32f88b9',
                    outIdx: 10,
                },
            },
            {
                value: 576,
                outputScript:
                    '76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac',
            },
            {
                value: 10427,
                outputScript:
                    '76a91486a911e65753b379774448230e7e8f7aeab8fa5e88ac',
            },
            {
                value: 552,
                outputScript:
                    '76a914e9364c577078f16ee2b27f2c570a4e450dd52e7a88ac',
            },
            {
                value: 1428,
                outputScript:
                    '76a914ed917afa96833c1fea678e23374c557ed83ff6ff88ac',
            },
            {
                value: 1427,
                outputScript:
                    '76a91482cf48aefcd80072ef21e4a61dee8c2d70d0bcb388ac',
            },
            {
                value: 9135,
                outputScript:
                    '76a91444e8388bdd64c1f67905279066f044638d0e166988ac',
            },
            {
                value: 1427,
                outputScript:
                    '76a914d62e68453b75938616b75309c3381d14d61cb9a488ac',
            },
            {
                value: 1427,
                outputScript:
                    '76a91425b1d2b4610b6deed8e3d2ac76f4f112883126e488ac',
            },
            {
                value: 921,
                outputScript:
                    '76a91456423795dc2fa85fa3931cdf9e58f4f8661c2b2488ac',
            },
            {
                value: 1843,
                outputScript:
                    '76a914e03d94e59bb300b965ac234a274b1cf41c3cadd788ac',
            },
            {
                value: 1584,
                outputScript:
                    '76a9141e0d6a8ef2c8a0f6ceace8656059ea9dbeb11bda88ac',
            },
            {
                value: 1843,
                outputScript:
                    '76a914f6cd6ef1bd7add314fd9b115c3ad0dce7844930c88ac',
            },
            {
                value: 560,
                outputScript:
                    '76a91488fb294f87b0f05bf6eddc1d6bfde2ba3a87bcdd88ac',
            },
            {
                value: 560,
                outputScript:
                    '76a914a154f00227476ec9741a416e96b69677fddf4b1d88ac',
            },
            {
                value: 1427,
                outputScript:
                    '76a914362a3773f5685c89e4b800e4c4f9925db2ec1b5c88ac',
            },
            {
                value: 584,
                outputScript:
                    '76a9146770958588049a3f39828e1ddc57f3dd77227a1188ac',
            },
            {
                value: 1708,
                outputScript:
                    '76a914b0313745d5f7c850c9682c2711b6a14f2db9276b88ac',
            },
            {
                value: 679,
                outputScript:
                    '76a914fe729aa40779f822a8c4988f49a115c8aabc0cc788ac',
            },
            {
                value: 1511,
                outputScript:
                    '76a914ecef001f3c137c880f828d843f754a082eb5396b88ac',
                spentBy: {
                    txid: 'e3ac978ea422497972c1583687806c17c686c2be1986605b36839277d7b36cb8',
                    outIdx: 1,
                },
            },
            {
                value: 560,
                outputScript:
                    '76a91463e79addfc3ad33d04ce064ade02d3c8caca8afd88ac',
                spentBy: {
                    txid: '2ba8a04167ea13f80aba2b232cdf899fd218c978b54264e5a829f96a3ce1e912',
                    outIdx: 0,
                },
            },
            {
                value: 552,
                outputScript:
                    '76a91489a6da1ed86c8967f03691ad9af8d93c6259137388ac',
            },
            {
                value: 919,
                outputScript:
                    '76a9149fa178360cab170f9423223a5b166171f54d5bc188ac',
            },
            {
                value: 15000,
                outputScript:
                    '76a914bc37eb24817a8442b23ae9a06cc405c8fdf1e7c488ac',
            },
            {
                value: 560,
                outputScript:
                    '76a914e78d304632489ba240b29986fe6afd32c77aa16388ac',
            },
            {
                value: 570,
                outputScript:
                    '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
                spentBy: {
                    txid: '57fcd13171861f19e68068aa6deb759126bef68a6dc0c4969870e54546931999',
                    outIdx: 1,
                },
            },
            {
                value: 921329,
                outputScript:
                    '76a914b8820ca6b9ceb0f546e142ddd857a4974483719a88ac',
                spentBy: {
                    txid: '0acb7723b751727996b03323841c37dd03ceb2aba83e75b39af98d0cc6eb9086',
                    outIdx: 1,
                },
            },
            {
                value: 5100,
                outputScript:
                    '76a914ca989ff4d3df17fe4dc6eb330b469bd6d5d4814e88ac',
            },
            {
                value: 5200,
                outputScript:
                    '76a914ad29cdce2237f71e95fee551f04425f70b7e4c9d88ac',
                spentBy: {
                    txid: '636e0a8685063d5fdb3b9fe9c9795c5ceb25fdbb237aedab4bf346dd8520a2b9',
                    outIdx: 0,
                },
            },
            {
                value: 584,
                outputScript:
                    '76a9140f57872e06e15593c8a288fcb761b13ca571d78888ac',
                spentBy: {
                    txid: 'dd02287fdadaf1b7377ec0121c00bc44563683c26eed49d31ade52a1abb63bc0',
                    outIdx: 0,
                },
            },
            {
                value: 10266,
                outputScript:
                    '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                spentBy: {
                    txid: '978538d26607b5b6371038006c9ad8e2862d935a8375f3a8a68108e8270f7335',
                    outIdx: 2,
                },
            },
            {
                value: 580,
                outputScript:
                    '76a9141e37634e6693e228801c194c45701d49a1d12e2c88ac',
            },
            {
                value: 22743016,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                spentBy: {
                    txid: '7242d84b3db853262c53f4b068c57e5a52b67a8b6fea313e0a6f7f58df16e413',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 3393,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 759800,
            hash: '00000000000000000f1afd00cb83bd94abb0bec8712e9ed90a2cac1e7a27e84a',
            timestamp: 1664667368,
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '5.69',
        isEtokenTx: false,
        aliasFlag: false,
        airdropFlag: true,
        airdropTokenId:
            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
        opReturnMessage: 'evc token service holders air drop🥇🌐🥇❤👌🛬🛬🍗🤴',
        isCashtabMessage: true,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
    },
};

export const outgoingEncryptedMsg = {
    tx: {
        txid: '7ac10096c8a7b32fe338dc938bcf2e1341b99f841687e690d88241107ce4b84b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '45411aa786288b679d1c1874f7b126d5ea0c83380304950d364b5b8279a460de',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100d4a93c615a7af48f422c273a530ac7f2b78d31a2d4515f11b2f416fce4f4f380022075c22c73190a7de805f219ca8d294777440b558551fea6b59c6c84ec529b16f94121038c4c26730d97cdeb18e69dff6c47cebb23e6f305c950923cd6110f35ab9006d0',
                value: 48445,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04657461624ca1040f3cc3bc507126c239cde840befd974bdac054f9b9f2bfd4ff32b5f59ca554c4f3fb2d11d30eae3e5d3f61625ff7812ba14f8c901c30ee7e03dea57681a8f7ab8c64d42ce505921b4d67507452537cbe7525281714857c75d7a441b65030b7ea646b59ed0c34adc9f739661620cf7678963db3cac78afd7f49ad0d63aad404b07730255ded82ea3a939c63ee040ae9fac9336bb8d84d7b3380665ffa514a45f4',
            },
            {
                value: 1200,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'aca8ec27a6fc4dc45b1c2e2a6175e84d81ffdd54c7f97711654a100ade4e80bc',
                    outIdx: 0,
                },
            },
            {
                value: 46790,
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                spentBy: {
                    txid: '610f8a6f8e7266af18feda7a5672d379314eb05cb7ce6690a1f1d5bff1051dad',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 404,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 760192,
            hash: '0000000000000000085f5e0372ca7d42c37e5f93db753440331b3cfc1be23052',
            timestamp: 1664910499,
        },
    },
    parsed: {
        incoming: false,
        xecAmount: '12',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        opReturnMessage: 'Encrypted Cashtab Msg',
        isCashtabMessage: true,
        isEncryptedMessage: true,
        replyAddress: 'ecash:qrhxmjw5p72a3cgx5cect3h63q5erw0gfcvjnyv7xt',
    },
};

export const incomingEncryptedMsg = {
    tx: {
        txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100e9fce8984a9f0cb76642c6df63a83150aa31d1071b62debe89ecadd4d45e727e02205a87fcaad0dd188860db8053caf7d6a21ed7807dbcd1560c251f9a91a4f36815412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 36207,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04657461624c9104eaa5cbe6e13db7d91f35dca5d270c944a9a3e8c7738c56d12069312f589c7f193e67ea3d2f6d1f300f404c33c19e48dc3ac35145c8152624b7a8e22278e9133862425da2cc44f7297c8618ffa78dd09054a4a5490afd2b62139f19fa7b8516cbae692488fa50e79101d55e7582b3a662c3a5cc737044ef392f8c1fde63b8385886aed37d1b68e887284262f298fe74c0',
            },
            {
                value: 1100,
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                spentBy: {
                    txid: '610f8a6f8e7266af18feda7a5672d379314eb05cb7ce6690a1f1d5bff1051dad',
                    outIdx: 0,
                },
            },
            {
                value: 34652,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '3efa1835682ecc60d2476f1c608eb6f5ae9040610193111a2c312453cd7db4ef',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 388,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 760192,
            hash: '0000000000000000085f5e0372ca7d42c37e5f93db753440331b3cfc1be23052',
            timestamp: 1664910499,
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '11',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        opReturnMessage: 'Encrypted Cashtab Msg',
        isCashtabMessage: true,
        isEncryptedMessage: true,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};

export const tokenBurn = {
    tx: {
        txid: '312553668f596bfd61287aec1b7f0f035afb5ddadf40b6f9d1ffcec5b7d4b684',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 0,
                },
                inputScript:
                    '473044022025c68cf0ab9c1a4d6b35b2b58f7e397722f469412841eb09d38d1973dc5ef7120220712e1f3c8740fff2af75c1062a773eef167550ee008deaef9089537cd17c35f0412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 2300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '1efe359a0bfa83c409433c487b025fb446a3a9bfa51a718c8dd9a56401656e33',
                    outIdx: 2,
                },
                inputScript:
                    '47304402206a2f53497eb734ea94ca158951aa005f6569c184675a497d33d061b78c66c25b02201f826fa71be5943ce63740d92a278123974e44846c3766c5cb58ef5ad307ba36412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '2',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '49f825370128056333af945eb4f4d9712171c9e88954deb189ca6f479564f2ee',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100efa3c767b749abb2dc958932348e2b19b845964e581c9f6de706cd43dac3f087022059afad6ff3c1e49cc0320499381e78eab922f18b00e0409228ad417e0220bf5d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '999875',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e44204db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c8750800000000000f41b9',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '999865',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '657646f7a4e7237fca4ed8231c27d95afc8086f678244d5560be2230d920ff70',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 550,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: 'Unexpected burn: Burns 12 base tokens',
                failedColorings: [],
                actualBurnAmount: '12',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
        block: {
            height: 760213,
            hash: '000000000000000010150c61dcde7dffb6af223a7f3f45be599d43ae972cbf67',
            timestamp: 1664921460,
        },
    },
    parsed: {
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        isTokenBurn: true,
        etokenAmount: '12',
        tokenEntries: [
            {
                tokenId:
                    '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: 'Unexpected burn: Burns 12 base tokens',
                failedColorings: [],
                actualBurnAmount: '12',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        genesisInfo: {
            tokenTicker: 'LVV',
            tokenName: 'Lambda Variant Variants',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 0,
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
};

export const tokenBurnDecimals = {
    tx: {
        txid: 'dacd4bacb46caa3af4a57ac0449b2cb82c8a32c64645cd6a64041287d1ced556',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207122751937862fad68c3e293982cf7afb91967d20da63a0c23bf0565b625b775022054f39f41a43438a0df7fbe6a78521f572613bc08d6a43b6d248bcb6a434e2b52412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '905cc5662cad77df56c3770863634ce498dde9d4772dc494d33b7ce3f36fa66c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dce5b3b516bfebd40bd8d4b4ff9c43c685d3c9dde1def0cc0667389ac522cf2502202651f95638e48c210a04082e6053457a539aef0f65a2e9c2f61e3faf96c1dfd8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '5235120760000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e44207443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d0800129950892eb779',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '5235120758765433',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '9c0c01c1e8cc3c6d816a3b41d09d65fda69de082b74b6ede7832ed05527ec744',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 403,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: 'Unexpected burn: Burns 1234567 base tokens',
                failedColorings: [],
                actualBurnAmount: '1234567',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
        block: {
            height: 760216,
            hash: '00000000000000000446cfe07eb99bca0ba33a23465e1b0248be96efed74c89d',
            timestamp: 1664923585,
        },
    },
    parsed: {
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        etokenAmount: '0.1234567',
        isTokenBurn: true,
        tokenEntries: [
            {
                tokenId:
                    '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: 'Unexpected burn: Burns 1234567 base tokens',
                failedColorings: [],
                actualBurnAmount: '1234567',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        genesisInfo: {
            tokenTicker: 'WDT',
            tokenName:
                'Test Token With Exceptionally Long Name For CSS And Style Revisions',
            tokenDocumentUrl:
                'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
            tokenDocumentHash:
                '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
            decimals: 7,
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
};

export const incomingEtokenTwo = {
    tx: {
        txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 3,
                },
                inputScript:
                    '4830450221009d649476ad963306a5210d9df2dfd7e2bb604be43d6cdfe359638d96239973eb02200ac6e71575f0f111dad2fbbeb2712490cc709ffe03eda7de33acc8614b2c0979412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 3503,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
            {
                prevOut: {
                    txid: '82d8dc652779f8d6c8453d2ba5aefec91f5247489246e5672cf3c5986fa3d235',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100b7bec6d09e71bc4c124886e5953f6e7a7845c920f66feac2e9e5d16fc58a649a0220689d617c11ef0bd63dbb7ea0fa5c0d3419d6500535bda8f7a7fc3e27f27c3de6412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '9876543156',
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
                    '6a04534c500001010453454e4420acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f550800000000075bcd1508000000024554499f',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '123456789',
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
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '9753086367',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 1685,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '04b16fa516fbdd64d51b8aa1a752855beb4250d99199322d89d9c4c6172a1b9f',
                    outIdx: 4,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 481,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
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
            height: 760076,
            hash: '00000000000000000bf1ee10a21cc4b784ea48840fa00237e41f69a027c6a86c',
            timestamp: 1664840266,
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        etokenAmount: '0.123456789',
        isTokenBurn: false,
        tokenEntries: [
            {
                tokenId:
                    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
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
            tokenTicker: 'CTB',
            tokenName: 'CashTabBits',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 9,
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    },
};

export const swapTx = {
    tx: {
        txid: '2f030de7c8f80a1ecac3645092dd22f0943c34d54cb734e12d7dfda0641fdfcf',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '4e771bc4bbd377f05b467b0e070ff330f03112b9effb61af5568e174850afa1b',
                    outIdx: 1,
                },
                inputScript:
                    '41ff62002b741b8b4831484f9a214c72972965765dc398cccb2f9756a910415f89a28c3560b772a73cb6f987057a7204105cb8afab30a46e74308a134d15ceb48b4121038a124bbf306b5bd19e8d10a396a96ae18abe79229820f30e81989fd645cf0525',
                value: 546,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91480ad93eff2bd02e6383ba62476ffd729d1b2660d88ac',
            },
            {
                prevOut: {
                    txid: 'ffbe78a817d157a0debf3c6ee5e14cea8a2bd1cd0feaf8c368292b694110d7f4',
                    outIdx: 1,
                },
                inputScript:
                    '41a112ff6b2b9d288f507b48e042390b8b285bf761e617885eb9a536259c1bd1bec673325cebbf913d90ad0ec3237eac29e6592198cb52dcd6cf6786f784f5889e41210247295c2401b8846ddd915ba9808e0962241003baecd0242b3888d1b3182c2154',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '10000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91475c5980aa6eeada103b45f82e37163e9047903af88ac',
            },
            {
                prevOut: {
                    txid: '6684cb754ec82e4d9b9b068ab2191af8cfd0998da9f753c16fabb293664e45af',
                    outIdx: 0,
                },
                inputScript:
                    '41bb8866a6cd6975ec9fdd8c45860c6cee5f83c52c801f830b3a97a69b6a02762c73a71ef91ce519224eb7e62fc4eb895587231a258a8f368f007c6377e7ca0028412102744cf89c996b8ec7ea887a1c4d0e0f98a2c82f8a1e4956ed12d8c8dc8bb2f6e4',
                value: 101670,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914205c792fff2ffc891e986246760ee1079fa5a36988ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e442054dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484080000000000002710',
            },
            {
                value: 546,
                outputScript:
                    '76a914205c792fff2ffc891e986246760ee1079fa5a36988ac',
                token: {
                    tokenId:
                        '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '10000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '7d3e61946d7573ee58d8d2d1d05366604b7eb5db64d8a1e22201f12f5836f864',
                    outIdx: 1,
                },
            },
            {
                value: 100546,
                outputScript:
                    '76a91480ad93eff2bd02e6383ba62476ffd729d1b2660d88ac',
                spentBy: {
                    txid: '561d26cc733822b2c518f6917bc84eeb78c505dc07e4f86379e93518f2c63514',
                    outIdx: 0,
                },
            },
            {
                value: 1000,
                outputScript:
                    '76a914a7d744e1246a20f26238e0510fb82d8df84cc82d88ac',
                spentBy: {
                    txid: 'b1db3cfab9ae782c9d85a52ea3271109d7270dbaa589b6cc19c72b9f7d23840b',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 599,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
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
            height: 767064,
            hash: '0000000000000000018dacde348577244cca129a8787f1594ef3e2dff9831153',
            timestamp: 1669029608,
        },
    },
    parsed: {
        incoming: true,
        xecAmount: '10',
        isEtokenTx: false,
        aliasFlag: false,
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qzq2myl0727s9e3c8wnzgahl6u5arvnxp5fs9sem4x',
    },
};

export const aliasOffSpec = {
    tx: {
        txid: '7b265a49e0bd5fe0c5e4b4aec634a25dd85656766a035b6e436c415538c43d90',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1be4bb9f820d60a82f6eb86a32ca9442700f180fc94469bca2ded9129f5dce88',
                    outIdx: 2,
                },
                inputScript:
                    '47304402205af9cf7ddb8412803b8e884dbd5cb02535ffc266fd5c6afb3e48e7425e7b215b0220799688d330130e4c7c7ffa33d9310e0bbc6fd820bbe26f7f47f52c17d79d6d4d4121022658400e1f93f3f491b6b8e98c0af1f45e30dd6a328894b7ea0569e0182c1e77',
                value: 3962985,
                sequenceNo: 4294967294,
                outputScript:
                    '76a914bc4932372bf33d57b3a21b2b2636919bc83a87a788ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript: '6a042e7865630d616e64616e6f746865726f6e65',
            },
            {
                value: 551,
                outputScript:
                    '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
                spentBy: {
                    txid: '33805053250ab648e231ea61a70fc4027765c184c112cc0b83f05f7c9db6a4c5',
                    outIdx: 12,
                },
            },
            {
                value: 3961979,
                outputScript:
                    '76a914bc4932372bf33d57b3a21b2b2636919bc83a87a788ac',
                spentBy: {
                    txid: 'f299dfce0030f9a0cf6d104b95182d973cf46111cfb3daaebb62b44c25d3f134',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 254,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 778616,
            hash: '00000000000000000fc2761e52b21752aee12a0f36b339f669a195b00a4a172e',
            timestamp: 1675967591,
        },
    },
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: true,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'off-spec alias registration',
        replyAddress: 'ecash:qz7yjv3h90en64an5gdjkf3kjxdusw585u9j5rqxcg',
        xecAmount: '0',
    },
};

export const PayButtonNoDataYesNonce = {
    tx: {
        txid: 'f2ca747f0780c6cda32a43418b4dd55112b709577f64436d80ab1a38e4f2787a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '00bfb4625325fe6e6a3ce34eb3ed7214167644e2eca892db207a44ea3262effc',
                    outIdx: 2,
                },
                inputScript:
                    '411b57cfa0bcc8e1f1c02f0dfed248688bf1e337e75d9c2775324e55b5d6d2085260303c3f77437d7bc0f1533ea816e7c8e4b77175ff3c9e61ce2e21b5e1dc95014121027a70b0f8b59cbb83a64cacbf4fca79e5c9a4f655f325d0936ed4eebced3cb8aa',
                value: 7146,
                sequenceNo: 4294967294,
                outputScript:
                    '76a91403c63d3a52cde136da8858e9d0ffaa810cb6639288ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript: '6a0450415900000008d980190d13019567',
            },
            {
                value: 1800,
                outputScript:
                    '76a914f66d2760b20dc7a47d9cf1a2b2f49749bf7093f688ac',
            },
            {
                value: 3876,
                outputScript:
                    '76a91401bfce4ff373b108bd65b4da08de621ade85adb588ac',
                spentBy: {
                    txid: '566a7c12364e3f362fbc738bf209527d3074ce0a2d19b797d3ca34a3482e3386',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 245,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 828922,
            hash: '0000000000000000018b4f795d767bce0438dedf67d2904e35da7d746065af1a',
            timestamp: 1706323334,
        },
    },
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'PayButton (d980190d13019567)',
        replyAddress: 'ecash:qqpuv0f62tx7zdk63pvwn58l42qsednrjgnt0czndd',
        xecAmount: '0',
    },
};

export const PayButtonYesDataYesNonce = {
    tx: {
        txid: '952dd66d7145330d8d3b2f09abbee33344e8aa65b7483cfaa9d278ec55379e29',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '37a740f89ab6c212f211150f35fb1e12cd80f287b825126eed262999ea4264b8',
                    outIdx: 0,
                },
                inputScript:
                    '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                value: 3403110,
                sequenceNo: 4294967294,
                outputScript:
                    '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04504159000008f09f9882f09f918d0869860643e4dc4c88',
            },
            {
                value: 3392102,
                outputScript:
                    '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                spentBy: {
                    txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                    outIdx: 0,
                },
            },
            {
                value: 9490,
                outputScript:
                    '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                spentBy: {
                    txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 253,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 828920,
            hash: '00000000000000000d6a683b11a6bdaab4b79b15f100daa9361d02207667de1d',
            timestamp: 1706323234,
        },
    },
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'PayButton (69860643e4dc4c88): 😂👍',
        replyAddress: 'ecash:qrnz3uf0r6g3e8eqashwkxz8uw30lt2les5yk8l5d7',
        xecAmount: '0',
    },
};

// No data no payment id
const PayButtonEmptyTx = JSON.parse(
    JSON.stringify(PayButtonYesDataYesNonce.tx),
);
// Create a tx with 00 in paymentId and nonce spaces
PayButtonEmptyTx.outputs[0].outputScript = '6a0450415900000000';
export const PayButtonEmpty = {
    tx: PayButtonEmptyTx,
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'PayButton',
        replyAddress: 'ecash:qrnz3uf0r6g3e8eqashwkxz8uw30lt2les5yk8l5d7',
        xecAmount: '0',
    },
};
// data and no payment id
const PayButtonYesDataNoNonceTx = JSON.parse(
    JSON.stringify(PayButtonYesDataYesNonce.tx),
);
// Create a tx with 00 in paymentId and nonce spaces
PayButtonYesDataNoNonceTx.outputs[0].outputScript =
    '6a0450415900000e6f6e6c792064617461206865726500';
export const PayButtonYesDataNoNonce = {
    tx: PayButtonYesDataNoNonceTx,
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'PayButton: only data here',
        replyAddress: 'ecash:qrnz3uf0r6g3e8eqashwkxz8uw30lt2les5yk8l5d7',
        xecAmount: '0',
    },
};

// Off spec paybutton tx
const PayButtonOffSpecTx = JSON.parse(
    JSON.stringify(PayButtonYesDataYesNonce.tx),
);
// Create a tx with 3 pushes instead of expected 4
PayButtonOffSpecTx.outputs[0].outputScript = '6a04504159000008f09f9882f09f918d';
export const PayButtonOffSpec = {
    tx: PayButtonOffSpecTx,
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'off-spec PayButton tx',
        replyAddress: 'ecash:qrnz3uf0r6g3e8eqashwkxz8uw30lt2les5yk8l5d7',
        xecAmount: '0',
    },
};

// Unsupported version paybutton tx
const PayButtonBadVersionTx = JSON.parse(
    JSON.stringify(PayButtonYesDataYesNonce.tx),
);
// Force a version 1 tx
PayButtonBadVersionTx.outputs[0].outputScript =
    '6a0450415900010108f09f9882f09f918d0869860643e4dc4c88';
export const PayButtonBadVersion = {
    tx: PayButtonBadVersionTx,
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'Unsupported version PayButton tx: 01',
        replyAddress: 'ecash:qrnz3uf0r6g3e8eqashwkxz8uw30lt2les5yk8l5d7',
        xecAmount: '0',
    },
};

export const MsgFromElectrum = {
    tx: {
        txid: 'd0c4c5b86016b7a021470180cb4afd1f8456fcf683a19d8b061b2225abd71be4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '7e439e4a1dde6f4380ed1afddbd5f484db80b00f26c85b3f10f6ccb245da5800',
                    outIdx: 4,
                },
                inputScript:
                    '416d2f67c38b81b6fdd13f4cb2c2d0a9194800e98b80a1054ca83b1ea3d739e70f9c4e2c8a61050b40161a0d741db9a6e71d155cf61623b9279739b50446d3ec6a4121026769c23182aaa572c16c82121caff660a7c13befd0d20c263e577ca01c4f029e',
                value: 81319,
                sequenceNo: 4294967294,
                outputScript:
                    '76a914eff9a0ba847ae97697a9f97c05887aba2b41060e88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a1774657374696e672061206d736720666f72206572726f72',
            },
            {
                value: 80213,
                outputScript:
                    '76a914731fbd873b3603e8dafd62923b954d38571e10fc88ac',
                spentBy: {
                    txid: 'b817870c8ae5ec94d639089e37763daee271f412ab478705a29b036ba0b00f3d',
                    outIdx: 55,
                },
            },
            {
                value: 600,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'dc06ab36c9a7e365f319c0e918324af9778cb29b82c07ff87e2ec80eb6e4e6fe',
                    outIdx: 9,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1709353270,
        size: 253,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 833968,
            hash: '000000000000000020f276cf59fc4e53672500ca5b5896502d0a50500174c27c',
            timestamp: 1709354653,
        },
    },
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: 'testing a msg for error',
        replyAddress: 'ecash:qrhlng96s3awja5h48uhcpvg02azksgxpce6nvshln',
        xecAmount: '0',
    },
};

export const AlpTx = {
    tx: {
        txid: '791c460c6d5b513283b98b92b83f0e6fa662fc279f39fd00bd27047370ba4647',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '927bf59fee669509ffee3f3cad5d283694adaf8e44e37e2ae62df53e51116052',
                    outIdx: 1,
                },
                inputScript:
                    '41482340e636feab0d15efb309e72eac0f559d0b85eb1799e0a1419430e95448a6a5c1e3961c92861e653dde4428e6e3a79c90d10911b045e7469f7beeae62fc56c1210378d370d2cd269a77ac2f37c28d98b392e5b9892f3b3406bfec8794c82244b039',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    amount: '49756',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a914575116c8adf5817c99fc5bdac8db18d10c25703d88ac',
            },
            {
                prevOut: {
                    txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                    outIdx: 2,
                },
                inputScript:
                    '4152ed9a66a0c40759e400a1484df1a1d2b152c9d6917abf3beaf974f21a935d60853490ae5a07c237531016ceae6c1f01cce9cf2a1417b2b2bcbbc4737ea2fe35412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                value: 1000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
            },
            {
                prevOut: {
                    txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                    outIdx: 3,
                },
                inputScript:
                    '412a65517b4df68bb03ba2b7cd85e70af662503bbc8be209e7fbf18bb0950ff7e0d589f0b3e8119b5e67314fbedd856968890556593d97db58c78e86d2417f27d7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                value: 1000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
            },
            {
                prevOut: {
                    txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                    outIdx: 4,
                },
                inputScript:
                    '412c9a66d04d341b1f0c3a15689265729a18f5605269909ad9f7b842ea03d96f8540e1b5b272ddc9db5f2d392a8e0569428a7ba4b5d99bbc707168898399f00da7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                value: 1000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
            },
            {
                prevOut: {
                    txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                    outIdx: 5,
                },
                inputScript:
                    '41f2ffdbd5f3694669d448899d3f6d939a8165d70cba6be2eaa8416847d56d4630a7b3ac8a35641705e4eb583b391a46c204920641dd85e2b7e04dd18553422651412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                value: 1000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a503d534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd038a02000000003e3000000000948f00000000',
            },
            {
                value: 546,
                outputScript:
                    '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                token: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    amount: '650',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 1960,
                outputScript: 'a914b0bfb87508e5203803490c2f3891d040f772ba0f87',
                token: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    amount: '12350',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a914575116c8adf5817c99fc5bdac8db18d10c25703d88ac',
                token: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    amount: '36756',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710439161,
        size: 888,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
            height: 835924,
            hash: '00000000000000000cb5f7d96ddff0d04096c405a0361196bcbe60622ea0e44f',
            timestamp: 1710440413,
        },
    },
    parsed: {
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        incoming: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        isEtokenTx: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qpt4z9kg4h6czlyel3da4jxmrrgscfts859gzp2zuu',
        xecAmount: '0',
    },
};
