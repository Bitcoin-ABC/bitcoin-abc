// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { validWalletJson } from 'validation/fixtures/mocks';
import CashtabCache from 'config/CashtabCache';

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
        xecAmount: 625008.97,
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
        xecAmount: 42,
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
        xecAmount: 222,
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
        xecAmount: 5.55,
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
        xecAmount: 5.46,
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
        assumedTokenDecimals: false,
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
        xecAmount: 5.46,
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
        assumedTokenDecimals: false,
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
        xecAmount: 0,
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
        assumedTokenDecimals: false,
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
        xecAmount: 5.46,
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
        assumedTokenDecimals: false,
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
        xecAmount: 5.69,
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
        xecAmount: 12,
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
        xecAmount: 11,
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
        xecAmount: 0,
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
        assumedTokenDecimals: false,
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
        xecAmount: 0,
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
        assumedTokenDecimals: false,
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
        xecAmount: 5.46,
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
        assumedTokenDecimals: false,
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
        xecAmount: 10,
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
        xecAmount: 0,
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
        xecAmount: 0,
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
        xecAmount: 0,
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
        xecAmount: 0,
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
        xecAmount: 0,
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
        xecAmount: 0,
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
        xecAmount: 0,
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
        xecAmount: 0,
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
        xecAmount: 0,
    },
};

/**
 * Mock chronik.token(tokenId) and chronik.tx(tokenId) for
 * several slpv1 tokens
 *
 * The below mocks
 * chronikSlpTokens, chronikTokenMocks, and mockLargeTokenCache are all related
 *
 * chronikSlpUtxos - large array of slp tokens as Cashtab would store them (less the address, not needed in these tests)
 * chronikTokenMocks - mock chronik calls required to get token info
 * mockLargeTokenCache - expected token cache for a wallet with all of these tokens
 * keyValueBalanceArray - key value array of expected tokens => tokenBalance map
 *
 * Useful for testing wallet structure org functions
 */

export const chronikSlpUtxos = [
    {
        outpoint: {
            txid: '525457276f1b6984170c9b35a8312d4988fce495723eabadd2afcdb3b872b2f1',
            outIdx: 1,
        },
        blockHeight: 680782,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
            tokenType: [Object],
            amount: '1',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'b35c502f388cdfbdd6841b7a73e973149b3c8deca76295a3e4665939e0562796',
            outIdx: 2,
        },
        blockHeight: 681191,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
            tokenType: [Object],
            amount: '1',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '7987f68aa70d29ac0e0ac31d74354a8b1cd515c9893f6a5cdc7a3bf505e08b05',
            outIdx: 1,
        },
        blockHeight: 685181,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
            tokenType: [Object],
            amount: '1',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '9e8483407944d9b75c331ebd6178b0cabc3e8c3b5bb0492b7b2256c8740f655a',
            outIdx: 1,
        },
        blockHeight: 709251,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
            tokenType: [Object],
            amount: '1000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '18c0360f0db5399223cbed48f55c4cee9d9914c8a4a7dedcf9172a36201e9896',
            outIdx: 1,
        },
        blockHeight: 717055,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
            tokenType: [Object],
            amount: '10',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '0bd0c49135b94b99989ec3b0396020a96fcbe2925bb25c40120dc047c0a097ec',
            outIdx: 1,
        },
        blockHeight: 726826,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168',
            tokenType: [Object],
            amount: '2',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '8f645ce7b231a3ea81168229c1b6a1157e8a58fb8a8a127a80efc2ed39c4f72e',
            outIdx: 1,
        },
        blockHeight: 727176,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
            tokenType: [Object],
            amount: '5000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '3703d46c5c52b0e55f3bd549e14c5617a47f802413f4acf7a27545437eb51a38',
            outIdx: 1,
        },
        blockHeight: 741200,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
            tokenType: [Object],
            amount: '100000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '40d4c93e82b82f5768e93a0da9c3c065856733d136876a90182590c8e115d1c4',
            outIdx: 1,
        },
        blockHeight: 757311,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
            tokenType: [Object],
            amount: '116',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
            outIdx: 2,
        },
        blockHeight: 758209,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
            tokenType: [Object],
            amount: '311',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '28428450ffa24dae7427ba8456fd5465b0da478fd183be845a27fdc0205df45f',
            outIdx: 1,
        },
        blockHeight: 758645,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            tokenType: [Object],
            amount: '4588000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '9a3522b610d153934b951cd6dd91676e5e4f3020531bd8a2e8015193c383029e',
            outIdx: 1,
        },
        blockHeight: 758887,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            tokenType: [Object],
            amount: '229400000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            outIdx: 1,
        },
        blockHeight: 759037,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            tokenType: [Object],
            amount: '7777777777',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'e3752bd648b2234957690ae408b08fe4eaf95912aa1b9790dc569c99e2a1f37a',
            outIdx: 1,
        },
        blockHeight: 759839,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            tokenType: [Object],
            amount: '229400000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
            outIdx: 1,
        },
        blockHeight: 760076,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            tokenType: [Object],
            amount: '123456789',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '8b8a15bbcc69df215ac45bab882d8f122f3e09405c3ac093d12cd2dd79a141ec',
            outIdx: 1,
        },
        blockHeight: 764737,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
            tokenType: [Object],
            amount: '1699',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '54cd8c25ff891a80f8276150244f052db7649a477eae2600ff17b49104258ee3',
            outIdx: 2,
        },
        blockHeight: 767640,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
            tokenType: [Object],
            amount: '99999998',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '9d2b752d3d0bb0b6ffeab531b8c3ca0b2af56c116ad13fe7e799b0ab96348b29',
            outIdx: 1,
        },
        blockHeight: 767649,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
            tokenType: [Object],
            amount: '100000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '7c75493d6e710173192ed1892273376ef54b755880cd5cb4aec3e2db309a1cce',
            outIdx: 2,
        },
        blockHeight: 768787,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
            tokenType: [Object],
            amount: '1',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'a4e4438f1e5d2c680c5ad877a9c2e75b5eea05f7fc8a17e0cdb348f315e7dc49',
            outIdx: 1,
        },
        blockHeight: 769675,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
            tokenType: [Object],
            amount: '200',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '019609426f88a9c2f13de980c7f7b2828c868fc6d53b1673421096b701ceae1a',
            outIdx: 2,
        },
        blockHeight: 770363,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            tokenType: [Object],
            amount: '9900',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '48ec9f7a4b7dfd5fbd419a70b748ded04e167778784e65a39c8edeb496b1f1de',
            outIdx: 1,
        },
        blockHeight: 770363,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
            tokenType: [Object],
            amount: '82',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '07646eddeaa7c97431f3cf62c7ba4714473f4c7a6611740b9cac5d86c00f9a38',
            outIdx: 2,
        },
        blockHeight: 770387,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            tokenType: [Object],
            amount: '9989',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'c39cd34c68ccb43cf640dd09f639c1e0b46d47224722ce5f26151ace40c663b3',
            outIdx: 2,
        },
        blockHeight: 772042,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
            tokenType: [Object],
            amount: '42300000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'd24e98159db1772819a76f1249f7190a9edb9924d0f7c5336b260f68b245a83a',
            outIdx: 2,
        },
        blockHeight: 774343,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
            tokenType: [Object],
            amount: '999882000000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'feafd053d4166601d42949a768b9c3e8ee1f27912fc84b6190aeb022fba7fa39',
            outIdx: 2,
        },
        blockHeight: 776118,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
            tokenType: [Object],
            amount: '999999878',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '886da7de5f0143c8be863962e7345ea615cee30caec7532824641d0fd40cc5f2',
            outIdx: 1,
        },
        blockHeight: 780736,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [Object],
            amount: '2',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '886da7de5f0143c8be863962e7345ea615cee30caec7532824641d0fd40cc5f2',
            outIdx: 2,
        },
        blockHeight: 780736,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [Object],
            amount: '23',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'ce95a91b9d7ddc6efc6273f70d398cb18aeafe99fd75de6301406786d4d8be54',
            outIdx: 2,
        },
        blockHeight: 780736,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [Object],
            amount: '65',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'c04ae7f139eb16023a70d1bb39b1ae8745667edb09833e994a5b4d48976a111d',
            outIdx: 2,
        },
        blockHeight: 782774,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
            tokenType: [Object],
            amount: '3',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'f2859d3d19e741bb40e9207cc1109db730ca69c458c6c204d14c2ebe7603c966',
            outIdx: 2,
        },
        blockHeight: 783389,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            tokenType: [Object],
            amount: '123456844',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'e71fe380b0dd838f4ef1c5bb4d5d33fc9d8932c3f9096211f6069805828e7f63',
            outIdx: 2,
        },
        blockHeight: 783638,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
            tokenType: [Object],
            amount: '8988',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'ff5f864cfe257905e18f1db2dfd7f31b483e0ecdfe9a91391d21dd44a28e1803',
            outIdx: 2,
        },
        blockHeight: 783638,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [Object],
            amount: '995921',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
            outIdx: 1,
        },
        blockHeight: 783693,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
            tokenType: [Object],
            amount: '100',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
            outIdx: 1,
        },
        blockHeight: 783694,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
            tokenType: [Object],
            amount: '100',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
            outIdx: 1,
        },
        blockHeight: 783695,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
            tokenType: [Object],
            amount: '100',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'c2c6b5a7b37e983c4e193900fcde2b8139ef4c3db2fd9689c354f6ea65354f15',
            outIdx: 2,
        },
        blockHeight: 784246,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
            tokenType: [Object],
            amount: '999998999',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '27dee7774fdf4d5a268e498e6d9665bff2251a7049ef71b6d5671f395d8bd694',
            outIdx: 1,
        },
        blockHeight: 784262,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [Object],
            amount: '1',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '29793cfa3c533063211ad15f0567e6b815aab555aa8356388e2c96561d971644',
            outIdx: 2,
        },
        blockHeight: 784460,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
            tokenType: [Object],
            amount: '2100',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'f6090755d5dcf233c1cf749c1433eabc0fb0722601101e981df67d44219325e6',
            outIdx: 2,
        },
        blockHeight: 787547,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            tokenType: [Object],
            amount: '2998978719999999999',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'e4d80b015e75fe2e54b5ef10571ce78c17086f96a7876d466f92d8c2a8c92b64',
            outIdx: 2,
        },
        blockHeight: 792712,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            tokenType: [Object],
            amount: '999824',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '6ffcc83e76226bd32821cc6862ce9b363b22594247a4e73ccf3701b0023592b2',
            outIdx: 2,
        },
        blockHeight: 800716,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            tokenType: [Object],
            amount: '999977636',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'fb70df00c07749082756054522d3f08691fd9caccd0e0abf736df23d22845a6e',
            outIdx: 2,
        },
        blockHeight: 800716,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            tokenType: [Object],
            amount: '5235120528888890',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '8f6676b602a9f074f10a7561fb7256bbce3b103a119f809a05485e42489d2233',
            outIdx: 2,
        },
        blockHeight: 802851,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
            tokenType: [Object],
            amount: '75',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'b7f225b4c4e055a35c1e08ce5eea7c1f3cf53c44662d6d95b631504634b1a3d9',
            outIdx: 2,
        },
        blockHeight: 802851,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
            tokenType: [Object],
            amount: '652',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '8a172dd9cd9eda533cdc731449c4d8728ab1924b843e5d5d2eda63535f7473d4',
            outIdx: 2,
        },
        blockHeight: 803616,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
            tokenType: [Object],
            amount: '78',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '1127651ed9d822cd4ba3ff30211d064116575fdb692c1352e59cab841e8caf4d',
            outIdx: 2,
        },
        blockHeight: 803741,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
            tokenType: [Object],
            amount: '43',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'a490c805218091549b2d802d6f0391c880cacd5145d0c516f62433637e49bd15',
            outIdx: 1,
        },
        blockHeight: 824524,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            tokenType: [Object],
            amount: '330000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'f4f21422dbf0ad5fe455994ee4d791a9d2e127fdfb46aa87abc3c250312fbbd0',
            outIdx: 2,
        },
        blockHeight: 824524,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
            tokenType: [Object],
            amount: '24999698951',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'd7c43e4eb6d341ac69b52f89125887b17d00a16872c01a9d47b39fd4e55d50cf',
            outIdx: 1,
        },
        blockHeight: 825739,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
            tokenType: [Object],
            amount: '1000000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '2c791301f75284f8ae86707ab87f24f2394e4b92d81a4f59bed52b56eaf452e3',
            outIdx: 1,
        },
        blockHeight: 825842,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
            tokenType: [Object],
            amount: '5344445',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
            outIdx: 1,
        },
        blockHeight: 832625,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
            tokenType: [Object],
            amount: '1000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'a96f605eaf8b97889a73c5ee0e36597239f7fb17833a28076d2f3ca863f7ccfc',
            outIdx: 1,
        },
        blockHeight: 832788,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            tokenType: [Object],
            amount: '10000000000000000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '423e24bf0715cfb80727e5e7a6ff7b9e37cb2f555c537ab06fdc7fd9b3a0ba3a',
            outIdx: 1,
        },
        blockHeight: 833612,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            tokenType: [Object],
            amount: '10000000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '5167318214db9876a4095cae6d1d3b3e7a9af5467ee0e8344715ac12a2a871a9',
            outIdx: 1,
        },
        blockHeight: 834541,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
            tokenType: [Object],
            amount: '9899',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '8d0c0b705122e197e47c338f017bef3456ae27deb5da93aaf2da0d480d1cea49',
            outIdx: 2,
        },
        blockHeight: 835070,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [Object],
            amount: '3325',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            outIdx: 1,
        },
        blockHeight: 835482,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            tokenType: [Object],
            amount: '21000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'e93ea2ae7e4c7026e3fc55b431ff5c92173c5e24119c477981f1942e100be990',
            outIdx: 2,
        },
        blockHeight: 835635,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [Object],
            amount: '39',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'f18a297d1f2ab656ca284655704e07cf8ea269739f4d3af64c2dbd18bfe4d8ee',
            outIdx: 1,
        },
        blockHeight: 836041,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
            tokenType: [Object],
            amount: '94',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: 'f37027d1560c62a845d15025e418bdd1d0b127bf6fcfb83dfd9e872eb66d0d09',
            outIdx: 2,
        },
        blockHeight: 836041,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
            tokenType: [Object],
            amount: '4',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '2358817d41cf41568e7431c2b4eec8e0dc882f6db0fcf824b5bc4b80c522a358',
            outIdx: 1,
        },
        blockHeight: 836444,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [Object],
            amount: '22',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '583f0379a82249f86e1c19fef574ae3a499aa8d4b1980884ddf1c15d8bd50db3',
            outIdx: 1,
        },
        blockHeight: 836456,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
            tokenType: [Object],
            amount: '1',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '5b115c352a487503755bbb93582ff39e1095d698fa303c7dd31bbf19c4bbf39a',
            outIdx: 1,
        },
        blockHeight: 836457,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [Object],
            amount: '11',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '914827ddc2087db0e8ca8aed3c2a701f5873ea2f96f3837d6dce6f24ab53f854',
            outIdx: 1,
        },
        blockHeight: 836458,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [Object],
            amount: '1',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
            outIdx: 1,
        },
        blockHeight: 836820,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
            tokenType: [Object],
            amount: '55000000000',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '0b1f0ecfe27292fb9f7031400d27d42b15ff13950635333c1a2774ba6e7eaa83',
            outIdx: 1,
        },
        blockHeight: 837493,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
            tokenType: [Object],
            amount: '844601876543211',
            isMintBaton: false,
        },
    },
    {
        outpoint: {
            txid: '2f9b8eca06f9e753769b450a2929d9956d70eee8047daf629591fc5ed29d8aa5',
            outIdx: 2,
        },
        blockHeight: 837494,
        isCoinbase: false,
        value: 546,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [Object],
            amount: '885',
            isMintBaton: false,
        },
    },
];
export const chronikTokenMocks = {
    'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd': {
        token: {
            tokenId:
                'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'ST',
                tokenName: 'ST',
                url: 'developer.bitcoin.com',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 625949,
                hash: '00000000000000000071fae486bb8a703faacb1fdcc613bd024ac1c0870e16d8',
                timestamp: 1583919726,
            },
        },
        tx: {
            txid: 'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'ac18fee0b9e2cb96fff3e1387f619f3fa010d5ac61a7f26f00b5d8ccb35dfa15',
                        outIdx: 13,
                    },
                    inputScript:
                        '483045022100da06aaec82dccaea628d08909b01820382f6d746970e31716c9cd14d191dd54902204ad630ec7727d6b2ad183dfa6585baa1fd2fe6fed642d8adabfa3eda495969cc412103317bf85b65f7443e4c0308064a2104a617bfe0467b4e8b6f3b01a8f4e78aaa7d',
                    value: 7055848,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91459b025ac71f8d6efc7e08fcad47cfab7c063c23a88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495302535402535415646576656c6f7065722e626974636f696e2e636f6d4c000100010208000000000000018f',
                },
                {
                    value: 546,
                    outputScript:
                        '76a9142ba1f72161a53720df933ea9b2116351c4162abd88ac',
                    token: {
                        tokenId:
                            'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '399',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '634ddf7468ff8fb493dcd1324f47452c0f668507863058182f861dce85a0dd1a',
                        outIdx: 1,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a9142ba1f72161a53720df933ea9b2116351c4162abd88ac',
                    token: {
                        tokenId:
                            'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '0',
                        isMintBaton: true,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '691b1af9b93a91f6c1974269d3167bfe440f304c610e099ca5ce4d24da60afa1',
                        outIdx: 1,
                    },
                },
                {
                    value: 7054427,
                    outputScript:
                        '76a91459b025ac71f8d6efc7e08fcad47cfab7c063c23a88ac',
                    spentBy: {
                        txid: '634ddf7468ff8fb493dcd1324f47452c0f668507863058182f861dce85a0dd1a',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 328,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
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
                height: 625949,
                hash: '00000000000000000071fae486bb8a703faacb1fdcc613bd024ac1c0870e16d8',
                timestamp: 1583919726,
            },
        },
        calculated: {
            genesisSupply: '399',
            genesisOutputScripts: [
                '76a9142ba1f72161a53720df933ea9b2116351c4162abd88ac',
            ],
            genesisMintBatons: 1,
        },
    },
    'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d': {
        token: {
            tokenId:
                'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'TAP',
                tokenName: 'Thoughts and Prayers',
                url: '',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 580703,
                hash: '000000000000000000d4d1d3ecb1a6134e3e4bb2ffd457f267e5e44139f2505f',
                timestamp: 1556742931,
            },
        },
        tx: {
            txid: 'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '7b4717e7c27033516a13811549b9fcccc56c20de0cb195ab04525334c5e5d308',
                        outIdx: 3,
                    },
                    inputScript:
                        '4730440220790564ba25ea20d058d7175b36659d8635fd9df0e6b025cabebbe63a6b1ff93102200e31ed7c18b594cd4a141b7e44bca5374eb1d357139aebeeccc1317c2666f8e3412102975d8bd9f427a3af5391d701e7eeb39087e9b2be70c166c84864b3ac5bc72ab4',
                    value: 314238,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9148b416c67003eb796880cbc0ad08d5130774974bc88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953035441501454686f756768747320616e6420507261796572734c004c00010001020800000000000f4240',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914458ea8631f32b296df9ab677b6e8a7e422e7161e88ac',
                    token: {
                        tokenId:
                            'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '29f125b70e67a336078e1e5ed87934da07d92a15e3a5884bc3efdee861327dc9',
                        outIdx: 1,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a914458ea8631f32b296df9ab677b6e8a7e422e7161e88ac',
                    token: {
                        tokenId:
                            'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
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
                    value: 312819,
                    outputScript:
                        '76a914d74575d2af329d25f44863d6c50675d26ad440ac88ac',
                    spentBy: {
                        txid: '29f125b70e67a336078e1e5ed87934da07d92a15e3a5884bc3efdee861327dc9',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 580702,
            timeFirstSeen: 0,
            size: 326,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
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
                height: 580703,
                hash: '000000000000000000d4d1d3ecb1a6134e3e4bb2ffd457f267e5e44139f2505f',
                timestamp: 1556742931,
            },
        },
        calculated: {
            genesisSupply: '1000000',
            genesisOutputScripts: [
                '76a914458ea8631f32b296df9ab677b6e8a7e422e7161e88ac',
            ],
            genesisMintBatons: 1,
        },
    },
    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e': {
        token: {
            tokenId:
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
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
        },
        tx: {
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
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
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
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
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
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
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
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
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
        },
        calculated: {
            genesisSupply: '100',
            genesisOutputScripts: [
                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            ],
            genesisMintBatons: 1,
        },
    },
    'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a': {
        token: {
            tokenId:
                'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'POW',
                tokenName: 'ProofofWriting.com Token',
                url: 'https://www.proofofwriting.com/26',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 685949,
                hash: '0000000000000000436e71d5291d2fb067decc838dcb85a99ff6da1d28b89fad',
                timestamp: 1620712051,
            },
        },
        tx: {
            txid: 'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '33938d6bd403e4ffef94de3e9e2ba487f095dcba3544ac8fad4a93808cea0116',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100dad1d237b541b4a4d29197dbb01fa9755c2e17bbafb42855f38442b428f0df6b02205772d3fb00b7a053b07169e1534770c091fce42b9e1d63199f46ff89856b3fc6412102ceb4a6eca1eec20ff8e7780326932e8d8295489628c7f2ec9acf8f37f639235e',
                    value: 49998867,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495303504f571850726f6f666f6657726974696e672e636f6d20546f6b656e2168747470733a2f2f7777772e70726f6f666f6677726974696e672e636f6d2f32364c0001004c000800000000000f4240',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
                    token: {
                        tokenId:
                            'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '69238630eb9e6a9864bf6970ff5d326800cea41a819feebecfe1a6f0ed651f5c',
                        outIdx: 1,
                    },
                },
                {
                    value: 49997563,
                    outputScript:
                        '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
                    spentBy: {
                        txid: '3c665488929f852d93a5dfb6e4b4df7bc8f7a25fb4a2480d39e3de7a30437f69',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 329,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
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
                height: 685949,
                hash: '0000000000000000436e71d5291d2fb067decc838dcb85a99ff6da1d28b89fad',
                timestamp: 1620712051,
            },
        },
        calculated: {
            genesisSupply: '1000000',
            genesisOutputScripts: [
                '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b': {
        token: {
            tokenId:
                'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'test',
                tokenName: 'test',
                url: 'https://cashtab.com/',
                decimals: 1,
                hash: '',
            },
            block: {
                height: 717055,
                hash: '0000000000000000113b17f038ac607eb5ef3c5636bf47088f692695b229d1cf',
                timestamp: 1639066280,
            },
        },
        tx: {
            txid: 'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c717c4536760db5c9a444ce1c61dee3c692e78d05e62b880cac3f649630bfc63',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220633ab93a41745a538c85f71adf934f32b5db2304df9b29af72808ac4f4951b7b022003dc12649727b2c9897c32eadc25255ca9aad1035a24156ae13834dd8c8c557a4121034cdb43b7a1277c4d818dc177aaea4e0bed5d464d240839d5488a278b716facd5',
                    value: 998991395,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953047465737404746573741468747470733a2f2f636173687461622e636f6d2f4c0001014c0008000000000000000a',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    token: {
                        tokenId:
                            'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '01e95bbde7013640637b4862812fece434bcfd7a97de852f30ef545add22498b',
                        outIdx: 1,
                    },
                },
                {
                    value: 998990326,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    spentBy: {
                        txid: '0cfd62634b11ef341fc760bd9ede68f51ed4dfeef5b4b6a42a70620104d5bdaf',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 296,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
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
                height: 717055,
                hash: '0000000000000000113b17f038ac607eb5ef3c5636bf47088f692695b229d1cf',
                timestamp: 1639066280,
            },
        },
        calculated: {
            genesisSupply: '1.0',
            genesisOutputScripts: [
                '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168': {
        token: {
            tokenId:
                '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'coin',
                tokenName: 'johncoin',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 723121,
                hash: '00000000000000000ef48c91305f1054ae11c13e07eea788faa1f955aa4620fe',
                timestamp: 1642724690,
            },
        },
        tx: {
            txid: '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5f7c1cdb36ab90951a1c3d2b35eebf1d27bea1a8925fcef6eb4da4be588e27d1',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402206eaea3002652d5aabec115ed05277034afb2f145e290edaba04ea21f08decc5402205ffcf324eb8d224db589609f51223f426c67e469687fb569dac8e16a0fd2b6c541210235fc1c027cad5ad3972fe9f23b1cc6fb35e68155a9b4eacb0da7ccce7abb8231',
                    value: 9622,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914a76859a9ce3fdbe80cdc306f71074f08d9e4822f88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495304636f696e086a6f686e636f696e1468747470733a2f2f636173687461622e636f6d2f4c0001004c000800000000000000c3',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914c1aadc99f96fcfcfe5642ca29a53e701f0b801c388ac',
                    token: {
                        tokenId:
                            '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '195',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '0bd0c49135b94b99989ec3b0396020a96fcbe2925bb25c40120dc047c0a097ec',
                        outIdx: 1,
                    },
                },
                {
                    value: 8553,
                    outputScript:
                        '76a914c1aadc99f96fcfcfe5642ca29a53e701f0b801c388ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 300,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168',
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
                height: 723121,
                hash: '00000000000000000ef48c91305f1054ae11c13e07eea788faa1f955aa4620fe',
                timestamp: 1642724690,
            },
        },
        calculated: {
            genesisSupply: '195',
            genesisOutputScripts: [
                '76a914c1aadc99f96fcfcfe5642ca29a53e701f0b801c388ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0': {
        token: {
            tokenId:
                'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'KAT',
                tokenName: 'KA_Test',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 727176,
                hash: '00000000000000000a37233b9ed0520368c58437fc4ce5edbda386a4619440f5',
                timestamp: 1645146139,
            },
        },
        tx: {
            txid: 'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '159b70d26940f6bf968c086eb526982421169889f3492b0d025ac3cd777ec1cd',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022020a2a23fd89f4b4d5e4869cb46a760cb577f61d18f895318f2f125bcdc550d1202203bbe0471194c64d33964eddf601fcfbb58b1c5553b2acbade9dc08394c4ad5b841210303329ad4e5b324a95fb05f4e4d6dbcb36b90ef87dc958bd3af49de1b016ed9da',
                    value: 110000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914a528a001f9f027aae05085928d0b23172fd4b5a188ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034b4154074b415f546573741468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000005f5e100',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914a528a001f9f027aae05085928d0b23172fd4b5a188ac',
                    token: {
                        tokenId:
                            'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '100000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '8f645ce7b231a3ea81168229c1b6a1157e8a58fb8a8a127a80efc2ed39c4f72e',
                        outIdx: 1,
                    },
                },
                {
                    value: 108931,
                    outputScript:
                        '76a914a528a001f9f027aae05085928d0b23172fd4b5a188ac',
                    spentBy: {
                        txid: '8f645ce7b231a3ea81168229c1b6a1157e8a58fb8a8a127a80efc2ed39c4f72e',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 298,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
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
                height: 727176,
                hash: '00000000000000000a37233b9ed0520368c58437fc4ce5edbda386a4619440f5',
                timestamp: 1645146139,
            },
        },
        calculated: {
            genesisSupply: '100000000',
            genesisOutputScripts: [
                '76a914a528a001f9f027aae05085928d0b23172fd4b5a188ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8': {
        token: {
            tokenId:
                '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'IFP',
                tokenName: 'Infrastructure Funding Proposal Token',
                url: 'ifp.cash',
                decimals: 8,
                hash: 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553',
            },
            block: {
                height: 650236,
                hash: '0000000000000000029d56ae91f48538121ce5e64c656053a1ddfda72249338d',
                timestamp: 1598560882,
            },
        },
        tx: {
            txid: '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '13ba1f7dd1051ef254358ac94924b52e584b2e96b9d8c7a4c92defff0302bfc6',
                        outIdx: 0,
                    },
                    inputScript:
                        '48304502210083c37da94557747a11ff069a68cde4b3859fc22ab56dbfef0dbf28a6af805999022063e8041b9a42bd8f68b474d124f797e879855282347ed13e04f3ad18129ce33f412102bfc0d9d71891a7bd89b4a89f4675fd341a054561438f186e6bfd1007d818666a',
                    value: 551610,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91462e332f00918c58c3d8e9c66e6d47b33c549203f88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e455349530349465025496e6672617374727563747572652046756e64696e672050726f706f73616c20546f6b656e086966702e6361736820b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f55301084c0008000775f05a074000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a9146e68110cc00a5d5f1c6c796c1a54f26b364cf06988ac',
                    token: {
                        tokenId:
                            '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '2100000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'a00c5a27f07ed26b116f219d6e666ad171e1420d27f108417a51ac6fa9b03c03',
                        outIdx: 0,
                    },
                },
                {
                    value: 550715,
                    outputScript:
                        '76a91462e332f00918c58c3d8e9c66e6d47b33c549203f88ac',
                    spentBy: {
                        txid: 'fadf79b051e33dcfeea92f497a60c6ce36cd2a8ad230f879fb135eae08c1a0c4',
                        outIdx: 15,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 348,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
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
                height: 650236,
                hash: '0000000000000000029d56ae91f48538121ce5e64c656053a1ddfda72249338d',
                timestamp: 1598560882,
            },
        },
        calculated: {
            genesisSupply: '21000000.00000000',
            genesisOutputScripts: [
                '76a9146e68110cc00a5d5f1c6c796c1a54f26b364cf06988ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6': {
        token: {
            tokenId:
                '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CTLv3',
                tokenName: 'Cashtab Token Launch Launch Token v3',
                url: 'coinex.com',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 684994,
                hash: '0000000000000000384706dfb07ac54ff08d0b143bebc51b130dac5caa7c4eae',
                timestamp: 1620160484,
            },
        },
        tx: {
            txid: '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100888814e0ea95c9513fe58293b8e71ee34bb321b8502075168428d7aa1ec5c4b80220200da569892cd8514c2c20d0d914cb24fd09ea23fe186d56c691aa5e1ad3800f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 1497154381,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e455349530543544c7633244361736874616220546f6b656e204c61756e6368204c61756e636820546f6b656e2076330a636f696e65782e636f6d4c0001004c0008000000000000014d',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '333',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '34caddbb70b152f555366d6719d7fcc7c263a2c77b8981819c1a0bfd7cce8e98',
                        outIdx: 1,
                    },
                },
                {
                    value: 1497153077,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'e0d6d7d46d5fc6aaa4512a7aca9223c6d7ca30b8253dee1b40b8978fe7dc501e',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 320,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
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
                height: 684994,
                hash: '0000000000000000384706dfb07ac54ff08d0b143bebc51b130dac5caa7c4eae',
                timestamp: 1620160484,
            },
        },
        calculated: {
            genesisSupply: '333',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0': {
        token: {
            tokenId:
                'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'SA',
                tokenName: 'Spinner Alpha',
                url: 'https://cashtabapp.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 700677,
                hash: '000000000000000000b31f812d4eacbe21ac1b6b55542cdc92de2634b263c8b7',
                timestamp: 1629467912,
            },
        },
        tx: {
            txid: 'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '431f527f657b399d8753fb63aee6c806ca0f8907d93606c46b36a33dcb5cb5b9',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100d1f85f02b397b6b5646449d797da19506d49cb6e80670e01ad82a213db97464402204a5b5d5e422f63a967959913417b996839b5ff6c56a7ced882cb10fb16e1ff1f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 3491579877,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e455349530253410d5370696e6e657220416c7068611768747470733a2f2f636173687461626170702e636f6d2f4c0001004c0008000000000000014d',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '333',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                        outIdx: 1,
                    },
                },
                {
                    value: 3491578808,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '562d7f91e21f124c3aaa826e08f6a59f49343a7c0411ff077f5aacfd858f0ec4',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 307,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
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
                height: 700677,
                hash: '000000000000000000b31f812d4eacbe21ac1b6b55542cdc92de2634b263c8b7',
                timestamp: 1629467912,
            },
        },
        calculated: {
            genesisSupply: '333',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484': {
        token: {
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'Alita',
                tokenName: 'Alita',
                url: 'alita.cash',
                decimals: 4,
                hash: '',
            },
            block: {
                height: 756373,
                hash: '00000000000000000d62f1b66c08f0976bcdec2f08face2892ae4474b50100d9',
                timestamp: 1662611972,
            },
        },
        tx: {
            txid: '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '72eeff7b43dc066164d92e4c3fece47af3a40e89d46e893df1647cd29dd9f1e3',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022075166617aa473e86c72f34a5576029eb8766a035b481864ebc75759155efcce00220147e2d7e662123bd728fac700f109a245a0278959f65fc402a1e912e0a5732004121034cdb43b7a1277c4d818dc177aaea4e0bed5d464d240839d5488a278b716facd5',
                    value: 1000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                },
                {
                    prevOut: {
                        txid: '46b6f61ca026e243d55668bf304df6a21e1fcb2113943cc6bd1fdeceaae85612',
                        outIdx: 2,
                    },
                    inputScript:
                        '4830450221009e98db4b91441190bb7e4745b9f249201d0b54c81c0a816af5f3491ffb21a7e902205a4d1347a5a9133c14e4f55319af00f1df836eba6552f30b44640e9373f4cabf4121034cdb43b7a1277c4d818dc177aaea4e0bed5d464d240839d5488a278b716facd5',
                    value: 750918004,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495305416c69746105416c6974610a616c6974612e636173684c0001044c00080000befe6f672000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    token: {
                        tokenId:
                            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '210000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '2c336374c05f1c8f278d2a1d5f3195a17fe1bc50189ff67c9769a6afcd908ea9',
                        outIdx: 1,
                    },
                },
                {
                    value: 750917637,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    spentBy: {
                        txid: 'ca70157d5cf6275e0a36adbc3fabf671e3987f343cb35ec4ee7ed5c8d37b3233',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 436,
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
                height: 756373,
                hash: '00000000000000000d62f1b66c08f0976bcdec2f08face2892ae4474b50100d9',
                timestamp: 1662611972,
            },
        },
        calculated: {
            genesisSupply: '21000000000.0000',
            genesisOutputScripts: [
                '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50': {
        token: {
            tokenId:
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'UDT',
                tokenName: 'UpdateTest',
                url: 'https://cashtab.com/',
                decimals: 7,
                hash: '',
            },
            block: {
                height: 759037,
                hash: '00000000000000000bc95bfdd45e71585f27139e71b56dd5bc86ef05d35b502f',
                timestamp: 1664226709,
            },
        },
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
        calculated: {
            genesisSupply: '777.7777777',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55': {
        token: {
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CTB',
                tokenName: 'CashTabBits',
                url: 'https://cashtabapp.com/',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 662874,
                hash: '000000000000000055df35f930c6e9ef6f4c51f1df6650d53eb3390cb92503fa',
                timestamp: 1606935101,
            },
        },
        tx: {
            txid: 'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f887b8cc01da80969a3f5cfe72c2b3ed3b7352b0153d1df0e8c4208ffafb3dad',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402203eb4229f825fc4ff6cebe4768821cb8b65c55a39577ed17438f29207785dcbc4022075793f39aa7448c5a56ab5d1317fa822ccac1b010bb0a63c7adbad025d53a43c4121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
                    value: 100000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034354420b43617368546162426974731768747470733a2f2f636173687461626170702e636f6d2f4c0001090102088ac7230489e80000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    token: {
                        tokenId:
                            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10000000000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'f517a560df3b7939bce51faddff4c3bac25fff3e94edbf93546cbeda738bf8f3',
                        outIdx: 1,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    token: {
                        tokenId:
                            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
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
                    value: 98358,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: '6a4c8bfa2e3ca345795dc3bde84d647390e9e1f2ff96e535cd2754d8ea5a3539',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 339,
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
                height: 662874,
                hash: '000000000000000055df35f930c6e9ef6f4c51f1df6650d53eb3390cb92503fa',
                timestamp: 1606935101,
            },
        },
        calculated: {
            genesisSupply: '10000000000.000000000',
            genesisOutputScripts: [
                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            ],
            genesisMintBatons: 1,
        },
    },
    '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917': {
        token: {
            tokenId:
                '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CTL2',
                tokenName: 'Cashtab Token Launch Launch Token v2',
                url: 'thecryptoguy.com',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 684993,
                hash: '00000000000000004c2f629c06444ec73fd059e1ee55e99d5e4b7bbff24f176a',
                timestamp: 1620160437,
            },
        },
        tx: {
            txid: '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220058d0e566c59804ac96c4a05dc7ab49f387b6046175c97a8c829994d280428050220220159d839b46539ce8b8d08577f970169032f59a993437719f491f945a45b13412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 1497155685,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e455349530443544c32244361736874616220546f6b656e204c61756e6368204c61756e636820546f6b656e2076321074686563727970746f6775792e636f6d4c0001004c000800000000000007d0',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '2000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '9f4c66b82f5b41f474f9670311e834667c0207a81f9e31a65731a7731e86c3ee',
                        outIdx: 1,
                    },
                },
                {
                    value: 1497154381,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 324,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
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
                height: 684993,
                hash: '00000000000000004c2f629c06444ec73fd059e1ee55e99d5e4b7bbff24f176a',
                timestamp: 1620160437,
            },
        },
        calculated: {
            genesisSupply: '2000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb': {
        token: {
            tokenId:
                'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'NAKAMOTO',
                tokenName: 'NAKAMOTO',
                url: '',
                decimals: 8,
                hash: '',
            },
            block: {
                height: 555671,
                hash: '000000000000000000aeb2168da809c07ede4de5ec2109df43bf49ef13805ddc',
                timestamp: 1541634138,
            },
        },
        tx: {
            txid: 'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: 'c6c9c6a2044029831ab4469c88c230f79778aae2265a0ad0f8df3cde724bb5b3',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402202fff3979f9cf0a5052655c8699081a77a653903de41547928db0b94601aa082502207cdb909e3a7b2b7f8a3eb80243a1bd2fd8ad9449a0ec30242ae4b187436d11a0412103b30e7096c6e3a3b45e5aba4ad8fe48a1fdd7c04de0de55a43095e7560b52e19d',
                    value: 546,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
                },
                {
                    prevOut: {
                        txid: '263795185b3623a1bc1dea322b0544d8851f0432b3dbc3f66a7a5109de1758d2',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022011a39acbbb80c4723822d434445fc4b3d72ad0212902fdb183a5408af00e158c02200eb3778b1af9f3a8fe28b6670f5fe543fb4c190f79f349273860125be05269b2412103b30e7096c6e3a3b45e5aba4ad8fe48a1fdd7c04de0de55a43095e7560b52e19d',
                    value: 65084,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953084e414b414d4f544f084e414b414d4f544f4c004c0001084c0008000775f05a074000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
                    token: {
                        tokenId:
                            'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '2100000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '5f4c275fe00896031757fb8f771cf9ff64ef90112ff2d8cd75c3d792338f7767',
                        outIdx: 1,
                    },
                },
                {
                    value: 64650,
                    outputScript:
                        '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
                    spentBy: {
                        txid: '4bc56e2c0358dbfa169e0feadf8edade0b76773f3bfad3f44b042e9bc5cd5d7f',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 555670,
            timeFirstSeen: 0,
            size: 432,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
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
                height: 555671,
                hash: '000000000000000000aeb2168da809c07ede4de5ec2109df43bf49ef13805ddc',
                timestamp: 1541634138,
            },
        },
        calculated: {
            genesisSupply: '21000000.00000000',
            genesisOutputScripts: [
                '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f': {
        token: {
            tokenId:
                'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'XGB',
                tokenName: 'Garmonbozia',
                url: 'https://twinpeaks.fandom.com/wiki/Garmonbozia',
                decimals: 8,
                hash: '',
            },
            block: {
                height: 685147,
                hash: '00000000000000000955aad3a91d39a54197e5eb567660a41cb25c08430a991a',
                timestamp: 1620241359,
            },
        },
        tx: {
            txid: 'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '6cabd1d33ef0b992fa30be127f1a0323766fba6ed46a0c27e881c707c116f476',
                        outIdx: 0,
                    },
                    inputScript:
                        '4730440220288fe3c2dda913b7f9c002f944bd946e4a9c98bd5f94d7295fdc1e5bad64cca202200f80b8c84ac71105c01b94c88aec7a8327afed540333a7108dc07346d3b19e3c41210302850962f13b498608a38f82ce5a037da70d659bec50af746816d44e9e732e02',
                    value: 995151,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953035847420b4761726d6f6e626f7a69612d68747470733a2f2f7477696e7065616b732e66616e646f6d2e636f6d2f77696b692f4761726d6f6e626f7a69614c0001084c0008000000174876e800',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
                    token: {
                        tokenId:
                            'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '100000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'f2d492da069429866c8ed59fd0d5283b8a8da881414633ac35979a2891030c57',
                        outIdx: 1,
                    },
                },
                {
                    value: 993847,
                    outputScript:
                        '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
                    spentBy: {
                        txid: '8c31247864b54642d8f6ef2a9e6a444a828beaa51e9afb3cdbc6e4cac9b39a89',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 327,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
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
                height: 685147,
                hash: '00000000000000000955aad3a91d39a54197e5eb567660a41cb25c08430a991a',
                timestamp: 1620241359,
            },
        },
        calculated: {
            genesisSupply: '1000.00000000',
            genesisOutputScripts: [
                '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1': {
        token: {
            tokenId:
                '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'HONK',
                tokenName: 'HONK HONK',
                url: 'THE REAL HONK SLP TOKEN',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 576633,
                hash: '000000000000000001400c74bf6ea59af97680bb6ee5b8918f0296795191dc56',
                timestamp: 1554290938,
            },
        },
        tx: {
            txid: '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: 'e14a57668e7aa92f9931750649c828adc7aff1289ef4f458108d097c4663c684',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022045cd384954a2e3f0446e72345b87e117b1e553970a33c3ad135f5f2911bf804502205f07693f399b7922bd16f3318c392887234c89aff8b76ecb3fed0d18f6abfdd9412102fde03670ccc6950b76029ef131280b604df9b44d4520cd9df9023aade2082b07',
                    value: 99141,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914726e13d2a9f4de19146a69d8a464d96674bc4ec288ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495304484f4e4b09484f4e4b20484f4e4b17544845205245414c20484f4e4b20534c5020544f4b454e4c0001004c0008000000174876e800',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91453c0098567382f003437a016edcc47de1436746988ac',
                    token: {
                        tokenId:
                            '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '100000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'd9f1c4833aa9b6e91d589c46783ec4c7e6225b754d1c0d8cd06a7d65bc71e696',
                        outIdx: 1,
                    },
                },
                {
                    value: 98290,
                    outputScript:
                        '76a9145afb7e1a1216788d7c69c509269d75b8750e750688ac',
                    spentBy: {
                        txid: '5691fa7fbf62db3964d9bc01ef27cdb392a5051b2c225054dc502b4bfadd377e',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 576632,
            timeFirstSeen: 0,
            size: 304,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
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
                height: 576633,
                hash: '000000000000000001400c74bf6ea59af97680bb6ee5b8918f0296795191dc56',
                timestamp: 1554290938,
            },
        },
        calculated: {
            genesisSupply: '100000000000',
            genesisOutputScripts: [
                '76a91453c0098567382f003437a016edcc47de1436746988ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c': {
        token: {
            tokenId:
                'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'Service',
                tokenName: 'Evc token',
                url: 'https://cashtab.com',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 715115,
                hash: '000000000000000008685ec611c9ab59dd1062431e3b40a7e27c0320c4993f68',
                timestamp: 1637890451,
            },
        },
        tx: {
            txid: 'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '974929a5a09fe45c891414c8daaa75518e0490d9b4e0c736c5100699a84422f0',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100d09d803b134f5e320a1487817342b56a017e11a69c2fa106814e3107d8c47fd30220300af9b456fa43049c41dca21d564c434504864c6fc4a3a36941ddaaddcba5b0412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                    value: 97862,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495307536572766963650945766320746f6b656e1368747470733a2f2f636173687461622e636f6d4c0001004c0008000000161e70f600',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    token: {
                        tokenId:
                            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '95000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '46da16acb51c912164e7bed0cc515ab6d8898e6d4d3e821d4ee7442587a9a50e',
                        outIdx: 1,
                    },
                },
                {
                    value: 96793,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    spentBy: {
                        txid: 'd21ae699093349473539b13808618561a350d0c39acc00f3704ba474ad851370',
                        outIdx: 0,
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
                        'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
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
                height: 715115,
                hash: '000000000000000008685ec611c9ab59dd1062431e3b40a7e27c0320c4993f68',
                timestamp: 1637890451,
            },
        },
        calculated: {
            genesisSupply: '95000000000',
            genesisOutputScripts: [
                '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6': {
        token: {
            tokenId:
                '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CLNSP',
                tokenName: 'ComponentLongNameSpeedLoad',
                url: 'https://cashtabapp.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 685168,
                hash: '00000000000000001cd7cfe38ef8173732989f73bd4818e13db2b909c4cea007',
                timestamp: 1620249731,
            },
        },
        tx: {
            txid: '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'e0d6d7d46d5fc6aaa4512a7aca9223c6d7ca30b8253dee1b40b8978fe7dc501e',
                        outIdx: 1,
                    },
                    inputScript:
                        '4730440220608c220025c34683b650ad8b33c3ee891f677f4b3162cec94c865e1e766094340220789e91fffcf5ffb15508429befd5c299f9e86cd49cf203649cbbe384a9998586412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 1496725917,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495305434c4e53501a436f6d706f6e656e744c6f6e674e616d6553706565644c6f61641768747470733a2f2f636173687461626170702e636f6d2f4c0001004c00080000000000000064',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
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
                        txid: '979f7741bb99ef43d7cf55ac5f070408fcb95dfce5818eb44f49e5b759a36d11',
                        outIdx: 1,
                    },
                },
                {
                    value: 1496724613,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '28669d88822a1e0c202fb68d6abc36c3b5acc9f1df3c6990d045b119e4b7cc4d',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 322,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
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
                height: 685168,
                hash: '00000000000000001cd7cfe38ef8173732989f73bd4818e13db2b909c4cea007',
                timestamp: 1620249731,
            },
        },
        calculated: {
            genesisSupply: '100',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a': {
        token: {
            tokenId:
                '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'XBIT',
                tokenName: 'eBits',
                url: 'https://boomertakes.com/',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 680776,
                hash: '00000000000000003667d7cd150a1a29c78f5fab9360ab3c0e32eba99f9e2c08',
                timestamp: 1617733350,
            },
        },
        tx: {
            txid: '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'cac6ff7ff285f4ae709ca58aad490f51f079c043dfa7f7ecf32086d756fc18a7',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022062337ef2c17772572dc32f5ba7fb2a272c49009bc947edf8caeacb142ae74999022068752a66f9f653251355231bf9134a9c2309ffbb2070fdcbbf5f16270b45b48b4121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
                    value: 83438,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495304584249540565426974731868747470733a2f2f626f6f6d657274616b65732e636f6d2f4c00010901020800038d7ea4c68000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    token: {
                        tokenId:
                            '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1000000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'ffb660d9ef11879a5c8fce3b11e56819289caf0db49b36b5bb9f90d535ebbc6f',
                        outIdx: 1,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    token: {
                        tokenId:
                            '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
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
                    value: 81796,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: 'ffb660d9ef11879a5c8fce3b11e56819289caf0db49b36b5bb9f90d535ebbc6f',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 335,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
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
                height: 680776,
                hash: '00000000000000003667d7cd150a1a29c78f5fab9360ab3c0e32eba99f9e2c08',
                timestamp: 1617733350,
            },
        },
        calculated: {
            genesisSupply: '1000000.000000000',
            genesisOutputScripts: [
                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            ],
            genesisMintBatons: 1,
        },
    },
    '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524': {
        token: {
            tokenId:
                '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CBB',
                tokenName: 'Cashtab Beta Bits',
                url: 'https://cashtabapp.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 700469,
                hash: '00000000000000000bb5f9bb8e292c0017c34e05708f74eae3ae09ff18f6bc89',
                timestamp: 1629339994,
            },
        },
        tx: {
            txid: '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5bb0ffba07c4c86bc058806fbe1eba76c6af21a1eb5907b7058f1b5f40125017',
                        outIdx: 1,
                    },
                    inputScript:
                        '4730440220478f8eb48e1ff3dd410a97d4033afd23d7ee39ec0ac0450dc6b9160ffe67c84102201b49185a7deb2701956d13601b67802c897a0bf5f0c261f8d259fdafc711ddf3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 140758876,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034342421143617368746162204265746120426974731768747470733a2f2f636173687461626170702e636f6d2f4c0001004c0008000000003b9aca00',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '8ccb8b0eb8f93fcfa4978c60f8aee14bc7e6b4d965d8cb55093f9604f3242d57',
                        outIdx: 1,
                    },
                },
                {
                    value: 140757807,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'c6457243bc0ff473b1a442b2f75155fcc020575bad69c45cd8edffa05cb6710a',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 311,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
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
                height: 700469,
                hash: '00000000000000000bb5f9bb8e292c0017c34e05708f74eae3ae09ff18f6bc89',
                timestamp: 1629339994,
            },
        },
        calculated: {
            genesisSupply: '1000000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3': {
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'NOCOVID',
                tokenName: 'Covid19 Lifetime Immunity',
                url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 680063,
                hash: '000000000000000012ad3d6dfb3505616ab9c3cb3772abac0448ddfc25043df4',
                timestamp: 1617304616,
            },
        },
        tx: {
            txid: '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'd849fbb04ce77870deaf0e2d9a67146b055f6d8bba18285f5c5f662e20d23199',
                        outIdx: 3,
                    },
                    inputScript:
                        '48304502210089d46c2873cc9d92927e7043e803c9ac1a705508e89de49af25869d7d12879d90220364ee750ac252487dae7bfb71e8de89085f486290654c3acc2efe4f1a08e99654121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
                    value: 86422,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953074e4f434f56494419436f7669643139204c69666574696d6520496d6d756e6974794c5168747470733a2f2f7777772e77686f2e696e742f656d657267656e636965732f64697365617365732f6e6f76656c2d636f726f6e6176697275732d323031392f636f7669642d31392d76616363696e65734c00010001020800000000000f4240',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'cac6ff7ff285f4ae709ca58aad490f51f079c043dfa7f7ecf32086d756fc18a7',
                        outIdx: 1,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
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
                    value: 84780,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: 'cac6ff7ff285f4ae709ca58aad490f51f079c043dfa7f7ecf32086d756fc18a7',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 417,
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
                height: 680063,
                hash: '000000000000000012ad3d6dfb3505616ab9c3cb3772abac0448ddfc25043df4',
                timestamp: 1617304616,
            },
        },
        calculated: {
            genesisSupply: '1000000',
            genesisOutputScripts: [
                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            ],
            genesisMintBatons: 1,
        },
    },
    'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7': {
        token: {
            tokenId:
                'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'SRM',
                tokenName: 'Server Redundancy Mint',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 757433,
                hash: '000000000000000006f6ed1242ab08be563c8ea6898a38fa09b986e9507b8003',
                timestamp: 1663251085,
            },
        },
        tx: {
            txid: 'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '40d4c93e82b82f5768e93a0da9c3c065856733d136876a90182590c8e115d1c4',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022052d51327fd080fb9c8a55b853a6ebc7528b5ad769291405996e5a57bf9e2bfba02201c0855b2544e9689ecc0e154aae6dc451c7a3b5ddf92847905436213cd87dbc8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 5828,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e455349530353524d1653657276657220526564756e64616e6379204d696e741468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000000000005',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
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
                        txid: 'c04ae7f139eb16023a70d1bb39b1ae8745667edb09833e994a5b4d48976a111d',
                        outIdx: 1,
                    },
                },
                {
                    value: 4759,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'e5aa45cea8268f873b00134a1981e92e5022e5c15e3ef273be8552b349e01651',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 313,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
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
                height: 757433,
                hash: '000000000000000006f6ed1242ab08be563c8ea6898a38fa09b986e9507b8003',
                timestamp: 1663251085,
            },
        },
        calculated: {
            genesisSupply: '5',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc': {
        token: {
            tokenId:
                'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
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
        },
        tx: {
            txid: 'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '85e9379d5b9b371aa7f9464376290fbc6a40083ec14883460b649898f6d7c60b',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100ed92efcd0c3fd8e241888d85751dc09856a2dbb73038ef6097a1cce91302741e022036c2941b90fbf4607b5a00c872a109630d26beda74763ca9c33f9e7703350053412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 10000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034354440c43617368746162204461726b1468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000000002710',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
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
                        txid: '0283492a729cfb7999684e733f2ee76bc4f652b9047ff47dbe3534b8f5960697',
                        outIdx: 1,
                    },
                },
                {
                    value: 8931,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '28e406370381e1ef6764bbbb21cf7974e95b84b2c49d204ab9f471d88334af90',
                        outIdx: 5,
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
                        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
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
                height: 726043,
                hash: '00000000000000000182db32e000171006b7b7820181676b5fd8f29cc90d2b9c',
                timestamp: 1644455332,
            },
        },
        calculated: {
            genesisSupply: '10000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4': {
        token: {
            tokenId:
                '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'NCBT',
                tokenName: 'newChatBotTest',
                url: 'alias.etokens.cash',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 783693,
                hash: '000000000000000008db6b50a881d28867d152ada018afb4b995d3b64a1e17eb',
                timestamp: 1679073789,
            },
        },
        tx: {
            txid: '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '668baf5dc81fab21cbbcd1f3f82851ee65725e941ebb5f45b56b7c6b744488d5',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100beb34be709c4060a4c343e899ec8ae5840954c41a0cefc1cfb31d212671f102f022044b1abde3005393e3247ee903646e9c1ecfe2a79b30768f2fde3abe4db485173412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 6212297,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953044e4342540e6e657743686174426f745465737412616c6961732e65746f6b656e732e636173684c0001004c00080000000000000064',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '100',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 6211296,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'c2c6b5a7b37e983c4e193900fcde2b8139ef4c3db2fd9689c354f6ea65354f15',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 305,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
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
                height: 783693,
                hash: '000000000000000008db6b50a881d28867d152ada018afb4b995d3b64a1e17eb',
                timestamp: 1679073789,
            },
        },
        calculated: {
            genesisSupply: '100',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516': {
        token: {
            tokenId:
                'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'NCBT',
                tokenName: 'newChatBotTest',
                url: 'alias.etokens.cash',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 783694,
                hash: '00000000000000000bf1b32605951ddcf4d4d9d240f73f19b4f505b8d935fb1b',
                timestamp: 1679074454,
            },
        },
        tx: {
            txid: 'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f3963fe5f36b9735a89ee8a13c51b909839457b50926daf89a2b56cf9f9fba13',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022006360a62732061dc50a6ccee96ff432f8306482eccdfa04a381d69e92ec9ba090220754d5cdc43e321e4ab4875f9df6759b7c6202c90f8ca56b38186f8a5e7104c66412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 9030220,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953044e4342540e6e657743686174426f745465737412616c6961732e65746f6b656e732e636173684c0001004c00080000000000000064',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '100',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 9029219,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '19cc36305423ddf2fefd400663a9938b5cb342a82ebd00f6251ee8bb5c58c855',
                        outIdx: 0,
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
                        'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
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
                height: 783694,
                hash: '00000000000000000bf1b32605951ddcf4d4d9d240f73f19b4f505b8d935fb1b',
                timestamp: 1679074454,
            },
        },
        calculated: {
            genesisSupply: '100',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29': {
        token: {
            tokenId:
                'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'NCBT',
                tokenName: 'newChatBotTest',
                url: 'alias.etokens.cash',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 783695,
                hash: '000000000000000015ade1e6be40db716077affda1e9c38d163a63981d4fab41',
                timestamp: 1679077205,
            },
        },
        tx: {
            txid: 'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9c0c01c1e8cc3c6d816a3b41d09d65fda69de082b74b6ede7832ed05527ec744',
                        outIdx: 3,
                    },
                    inputScript:
                        '47304402202425b99ebe499a5e8cada7375526251409d7800bf4bd128ca6494e7fa2ee6709022064c3b22d0611d7585c56cd8e8e655b74ed9bbbc8ab9a2277524dacc7a6939726412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 15250788,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953044e4342540e6e657743686174426f745465737412616c6961732e65746f6b656e732e636173684c0001004c00080000000000000064',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '100',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 15249787,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '03d227c6ae528bd6644487f394f5ddb065eea5c2ff97cae9b032d6efc46edea8',
                        outIdx: 0,
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
                        'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
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
                height: 783695,
                hash: '000000000000000015ade1e6be40db716077affda1e9c38d163a63981d4fab41',
                timestamp: 1679077205,
            },
        },
        calculated: {
            genesisSupply: '100',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577': {
        token: {
            tokenId:
                '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'OMI',
                tokenName: 'Omicron',
                url: 'cdc.gov',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 717653,
                hash: '000000000000000004cc2d26068bcd8dcab87841b0ce6b5150f4f8b6ccff6d10',
                timestamp: 1639430827,
            },
        },
        tx: {
            txid: '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'de3f45ae6172bd5d84872d45191889587c4acb1ee44c76a811ec7a65487b1052',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402203d613e2f0c10a37c9305130b896d9b00755c24b21c91d3115ed6f240fde78de102202c730ebfb3d109cd6c3f8fe89941c40a88e890a99d932a261eb71c144683d30e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 206527138,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034f4d49074f6d6963726f6e076364632e676f764c0001004c0008000000003b9aca00',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '702e1b64aed21bc764c83f638407f7f73245604d8d9c36f03e048a8005b8ccfd',
                        outIdx: 1,
                    },
                },
                {
                    value: 206526069,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'f83ed4755d3356181a3a0f2a1b8181f7616d76149ce8bcccc751eb4a8c3b91f2',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 285,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
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
                height: 717653,
                hash: '000000000000000004cc2d26068bcd8dcab87841b0ce6b5150f4f8b6ccff6d10',
                timestamp: 1639430827,
            },
        },
        calculated: {
            genesisSupply: '1000000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8': {
        token: {
            tokenId:
                '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CLB',
                tokenName: 'Cashtab Local Beta',
                url: 'boomertakes.com',
                decimals: 2,
                hash: '',
            },
            block: {
                height: 688194,
                hash: '00000000000000003d718f77c7b914230be2357a1863542d9ce99994836e5eac',
                timestamp: 1622049539,
            },
        },
        tx: {
            txid: '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '03010e17e77b038ced51869a077cc7e79d20b0c3322c909ed5ebc39d96d1a1a6',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402202215015f8d4ff32bf16d579c3db882c6d33ad32cddd05c846f13a1c89e04ec8e02203581865f2d9a0c5107467dcdc38b831156b831ab2d259cc6f234828f78151921412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 29074919,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495303434c421243617368746162204c6f63616c20426574610f626f6f6d657274616b65732e636f6d4c0001024c000800000000000008ae',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '2222',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '123a31b903c9a7de544a443a02f73e0cbee6304931704e55d0583a8aca8df48e',
                        outIdx: 1,
                    },
                },
                {
                    value: 29073850,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'd83677da1b3ade24e9fdcc2a47e3ba87e1fbe1de9e13075d79d16819952a8789',
                        outIdx: 2,
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
                        '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
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
                height: 688194,
                hash: '00000000000000003d718f77c7b914230be2357a1863542d9ce99994836e5eac',
                timestamp: 1622049539,
            },
        },
        calculated: {
            genesisSupply: '22.22',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8': {
        token: {
            tokenId:
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'VSP',
                tokenName: 'Vespene Gas',
                url: 'https://simple.wikipedia.org/wiki/StarCraft#Gameplay',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 763087,
                hash: '0000000000000000015abcebc15e74036598855a9fdd976868ad99bb23b87a89',
                timestamp: 1666631359,
            },
        },
        tx: {
            txid: '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'ac8be4ed7289014eb615cf8aa122cbd94283fe566142052d7ac8c6fab241fb51',
                        outIdx: 2,
                    },
                    inputScript:
                        '46304302200db47adc26bbb4ae4584ae455c5f078a4d2f624e898fab3159c74473677bc8b2021f371ea6c9acd051c96eaba2b229d06a0247dad2acf6cf0694792d22280dfe8e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 1253,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953035653500b56657370656e65204761733468747470733a2f2f73696d706c652e77696b6970656469612e6f72672f77696b692f5374617243726166742347616d65706c61794c0001094c000829a2241af62c0000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '3000000000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'fc1ada187e9f5da7616f481c79cd0fa3aafa3d4094288db6806e7508f76b5fcd',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 299,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
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
                height: 763087,
                hash: '0000000000000000015abcebc15e74036598855a9fdd976868ad99bb23b87a89',
                timestamp: 1666631359,
            },
        },
        calculated: {
            genesisSupply: '3000000000.000000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875': {
        token: {
            tokenId:
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'LVV',
                tokenName: 'Lambda Variant Variants',
                url: 'https://cashtabapp.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 700722,
                hash: '0000000000000000260ee4c3b4f4ddde127bc0105d685c0ef31775b612627222',
                timestamp: 1629500864,
            },
        },
        tx: {
            txid: '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'a5d17c2df7244939f73101bb55a0aeb91f53bb7117efb04047b7db645e145933',
                        outIdx: 1,
                    },
                    inputScript:
                        '4830450221008100fd6256019f3c8709ffe685fedec9dbf452951a44dcd1b928d0c9095b3d1b02204a756b30558ae60a673c28163e3c10bd1152d41be093aa7ad1d32f5886bc66e6412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 138443635,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034c5656174c616d6264612056617269616e742056617269616e74731768747470733a2f2f636173687461626170702e636f6d2f4c0001004c000800000000000f4240',
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
                        amount: '1000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'ef80e1ceeada69a9639c320c1fba47ea4417cd3aad1be1635c3472ce28aaef33',
                        outIdx: 1,
                    },
                },
                {
                    value: 138442566,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '87faad4f282002da1a9d74059dbebfa41aff3df27a66b5fd01184c5f8afdf283',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 318,
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
                height: 700722,
                hash: '0000000000000000260ee4c3b4f4ddde127bc0105d685c0ef31775b612627222',
                timestamp: 1629500864,
            },
        },
        calculated: {
            genesisSupply: '1000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48': {
        token: {
            tokenId:
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'DVV',
                tokenName: 'Delta Variant Variants',
                url: 'https://cashtabapp.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 700469,
                hash: '00000000000000000bb5f9bb8e292c0017c34e05708f74eae3ae09ff18f6bc89',
                timestamp: 1629339994,
            },
        },
        tx: {
            txid: '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '846c8e4045e8ba51ce3fed18bf2270ecfd5a448cb78adf6f22cae3bf89394075',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100b0469fe06b1f961932edb02186baa703c65b796ffdc44ee8a81eb5d2ea532b44022075f34517bbbc68200e4d7fc7a5f2fbcebb8cc101044bda8b49ed47d9355e4a03412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 1121620547,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034456561644656c74612056617269616e742056617269616e74731768747470733a2f2f636173687461626170702e636f6d2f4c0001004c0008000000003b9ac9ff',
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
                        amount: '999999999',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'e9675fb89a91fd2644e098d5865dcd8de1549d18577247d55813a9f8b383eb12',
                        outIdx: 1,
                    },
                },
                {
                    value: 1121619478,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '9eb3f392e7efd073cbe58e4d57d4c4cf755527074f935238493b0d357cc70b8d',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 317,
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
                height: 700469,
                hash: '00000000000000000bb5f9bb8e292c0017c34e05708f74eae3ae09ff18f6bc89',
                timestamp: 1629339994,
            },
        },
        calculated: {
            genesisSupply: '999999999',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d': {
        token: {
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'WDT',
                tokenName:
                    'Test Token With Exceptionally Long Name For CSS And Style Revisions',
                url: 'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
                decimals: 7,
                hash: '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
            },
            block: {
                height: 659948,
                hash: '000000000000000002e096ec3fda458dab941cd2ab40a7be10d54e88c9b06f37',
                timestamp: 1604423892,
            },
        },
        tx: {
            txid: '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '14bd7a307aacb93675660b6fa957b0c8ab001d500cb07756524330f1863e9f9f',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402202cf16a38ccb1df93e60bc23b3113c05086f1a52522a98f4dcb38c3c48d7f734d02207f42466cbf73c3885b24536253f1e8262804b7774c5d867738a5c71e4464722741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
                    value: 46641,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
                },
                {
                    prevOut: {
                        txid: 'c44685e8f36e84838d11502438438c997fe79645ffe27b51e3395ef6b9a4b6e2',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402205278c22d848b7368365cfd08e64a6060e061fa9995161fef50086ad81cb2367502205f0af031e2f1bfcffd47348832e2127428abdea4f9dc0440b1dd387d84e74e8741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
                    value: 313547,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
                },
                {
                    prevOut: {
                        txid: '2441ce6b4b213afbf432e7ffd59cd597a14c2bbca0fe1a641095b5f634af7d40',
                        outIdx: 0,
                    },
                    inputScript:
                        '4730440220603fd0df5350ab5213384b57abe575ecad1627470b95a14a61c1d6d6a346056c02205505e66fee9be7ac73a8d1c8d08212dc4ac44e2e7ffd909e6790a7cd26fd68e941210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
                    value: 31355,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495303574454435465737420546f6b656e205769746820457863657074696f6e616c6c79204c6f6e67204e616d6520466f722043535320416e64205374796c65205265766973696f6e734068747470733a2f2f7777772e496d706f737369626c794c6f6e6757656273697465446964596f755468696e6b576562446576576f756c64426546756e2e6f72672085b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc0107010208000000e8d4a51000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91419884c453167cf3011a3363b4b1ebd926bde059f88ac',
                    token: {
                        tokenId:
                            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
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
                        txid: 'ed7a0eb9f80ffcad92a20a9b8eb673561bde8ce143cec05fe4635020842a4c54',
                        outIdx: 56,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a91419884c453167cf3011a3363b4b1ebd926bde059f88ac',
                    token: {
                        tokenId:
                            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '0',
                        isMintBaton: true,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '67605f3d18135b52d95a4877a427d100c14f2610c63ee84eaf4856f883a0b70e',
                        outIdx: 2,
                    },
                },
                {
                    value: 389686,
                    outputScript:
                        '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
                    spentBy: {
                        txid: 'ed7a0eb9f80ffcad92a20a9b8eb673561bde8ce143cec05fe4635020842a4c54',
                        outIdx: 55,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 761,
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
                height: 659948,
                hash: '000000000000000002e096ec3fda458dab941cd2ab40a7be10d54e88c9b06f37',
                timestamp: 1604423892,
            },
        },
        calculated: {
            genesisSupply: '100000.0000000',
            genesisOutputScripts: [
                '76a91419884c453167cf3011a3363b4b1ebd926bde059f88ac',
            ],
            genesisMintBatons: 1,
        },
    },
    'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d': {
        token: {
            tokenId:
                'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'DNR',
                tokenName: 'Denarius',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 767340,
                hash: '00000000000000000aa6f475f0ef63c88c19d56217972534fb5cb6f98586845a',
                timestamp: 1669201819,
            },
        },
        tx: {
            txid: 'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bfda9787b92a3093070f65f501b8ea87e79b54e3c0a48d0f2425dfa7f85713fb',
                        outIdx: 6,
                    },
                    inputScript:
                        '47304402202fcd960b6e450dedc8c7863cf43921edab63559ef07b855388ffe8a7dc926e3302203c738c9737cfd5fa6f9df69c341e6007c09a49cabfce8db34606d5b4530ce6c1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 2981229,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495303444e520844656e61726975731468747470733a2f2f636173687461622e636f6d2f4c0001004c000800000000000002f1',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '753',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '5f06207dea4762524dbe2d84900cc78711d079f2b2e909867ec5e9abdeb850aa',
                        outIdx: 1,
                    },
                },
                {
                    value: 2980228,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'fa373dbcbac25cfc409b062d9974425a82621c05cecaeaebfd7e0a5a2dc23317',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 299,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
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
                height: 767340,
                hash: '00000000000000000aa6f475f0ef63c88c19d56217972534fb5cb6f98586845a',
                timestamp: 1669201819,
            },
        },
        calculated: {
            genesisSupply: '753',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc': {
        token: {
            tokenId:
                '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CLT',
                tokenName: 'Cashtab Local Tests',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 720056,
                hash: '00000000000000001539b8b8d9e7d9459eb16ad84d387fc13326a34d7e09633d',
                timestamp: 1640867749,
            },
        },
        tx: {
            txid: '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5538f30465c7c2a9c38ec70f060530153e665b4d336f2cde4b247989c8f2b813',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100df3fe6fcf7b2afa0d5650e4c526f122e4ed032c3f8dff2b62b950f597c7def0b02201b0ce1ae4a4abe460ccf4801986eee825ea9d2bcff91e95f3d4f66e8a0c06837412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    value: 1350,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495303434c541343617368746162204c6f63616c2054657374731468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000c350',
                },
                {
                    value: 546,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    token: {
                        tokenId:
                            '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '50000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '9c6363fb537d529f512a12d292ea9682fe7159e6bf5ebfec5b7067b401d2dba4',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 277,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
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
                height: 720056,
                hash: '00000000000000001539b8b8d9e7d9459eb16ad84d387fc13326a34d7e09633d',
                timestamp: 1640867749,
            },
        },
        calculated: {
            genesisSupply: '50000',
            genesisOutputScripts: [
                '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba': {
        token: {
            tokenId:
                'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'TBS',
                tokenName: 'TestBits',
                url: 'https://thecryptoguy.com/',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 662989,
                hash: '000000000000000022f3b95ea9544c77938f232601b87a82b5c375b81e0123ae',
                timestamp: 1607034208,
            },
        },
        tx: {
            txid: 'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9b4361b24c756ff7a74ea5261be565acade0b246fb85422086ac273c1e4ee7d5',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220033fd897a0c6ae88eac326562de260264e3197b336508b584d81f244e5a47b7a022013f78b1f954eab4027e377745315f9c35811ec2802fc4d7c4280312aa9e7eee94121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
                    value: 94032,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953035442530854657374426974731968747470733a2f2f74686563727970746f6775792e636f6d2f4c0001090102088ac7230489e80000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    token: {
                        tokenId:
                            'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10000000000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
                        outIdx: 1,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    token: {
                        tokenId:
                            'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
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
                    value: 92390,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 338,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
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
                height: 662989,
                hash: '000000000000000022f3b95ea9544c77938f232601b87a82b5c375b81e0123ae',
                timestamp: 1607034208,
            },
        },
        calculated: {
            genesisSupply: '10000000000.000000000',
            genesisOutputScripts: [
                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            ],
            genesisMintBatons: 1,
        },
    },
    '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25': {
        token: {
            tokenId:
                '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CFL',
                tokenName: 'Cashtab Facelift',
                url: 'https://cashtab.com/',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 726826,
                hash: '000000000000000007ba9fcd82bc10d70a55d4d74cb041cf234699c746d1c635',
                timestamp: 1644953895,
            },
        },
        tx: {
            txid: '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f66bbeff49edc36dff6de0c2bf97ac4e94c3c328261ea43b5351a7d0a54d75ab',
                        outIdx: 2,
                    },
                    inputScript:
                        '4730440220365f13f47afacb3329e4dc0dbc2e68a2accb94fc08475828e4f320b93e08a36702201d3ffdb7fcd3c3240f8c0d609bcb36b446e4b4253fa7284d14eac1c3b5139844412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 9095,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e455349530343464c104361736874616220466163656c6966741468747470733a2f2f636173687461622e636f6d2f4c0001094c0008000009184e72a000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'fefacb25eccd9c1c575da278b265c444f840e9261b041898fbf7f5cd85fb40a4',
                        outIdx: 1,
                    },
                },
                {
                    value: 8026,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'f78ee9844a4584d6f13efbf2e40f0e488f25089aa047e61f54063894d01a3a17',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 307,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
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
                height: 726826,
                hash: '000000000000000007ba9fcd82bc10d70a55d4d74cb041cf234699c746d1c635',
                timestamp: 1644953895,
            },
        },
        calculated: {
            genesisSupply: '10000.000000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6': {
        token: {
            tokenId:
                '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CMA',
                tokenName: 'CashtabMintAlpha',
                url: 'https://cashtabapp.com/',
                decimals: 5,
                hash: '',
            },
            block: {
                height: 685170,
                hash: '000000000000000025782a5b5b44efb49f9c3f86ef7355dc36010afc6624e3fd',
                timestamp: 1620250206,
            },
        },
        tx: {
            txid: '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '13f063c9720d2c1a4c01d67a710a20a20ccf1d2b2312a87bfe7f0ee5c4794c46',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402201c12e609e94a9d852d553a58c5685a0398713757f274cb72f0bcb3c49abbd369022072c33f3237859575b4d616a3857704285c1027fb8cdb0d55c0580a4be60474ad412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 994663,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495303434d4110436173687461624d696e74416c7068611768747470733a2f2f636173687461626170702e636f6d2f4c0001054c0008000000000054c563',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '5555555',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '9989f6f4941d7cf3206b327d957b022b41bf7e449a11fd5dd5cf1e9bc93f1ecf',
                        outIdx: 1,
                    },
                },
                {
                    value: 993359,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '92566b9ae391bf2de6c99457fa56ab5f93af66634af563dbe0e1022ebc05ecd4',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 310,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
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
                height: 685170,
                hash: '000000000000000025782a5b5b44efb49f9c3f86ef7355dc36010afc6624e3fd',
                timestamp: 1620250206,
            },
        },
        calculated: {
            genesisSupply: '55.55555',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5': {
        token: {
            tokenId:
                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'IWF',
                tokenName: 'Insanity Wolf',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 832625,
                hash: '00000000000000001677f56a57d820e02079e4a3ed62d7aeb0acbf7fa937b8bb',
                timestamp: 1708546646,
            },
        },
        tx: {
            txid: 'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '8fc76031471a09072d3de5bbc5b0a50887639882df500d4ef6c939c69c4594c2',
                        outIdx: 3,
                    },
                    inputScript:
                        '4830450221009fe4253fe41a5badda24212d6af2120a52cae193629d216cbf830f693f2f57050220359de2e48f8506b7633341c52228c4249d00ec4e3504ee283827cee869fbc309412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 3317,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034957460d496e73616e69747920576f6c661468747470733a2f2f636173687461622e636f6d2f4c0001004c000800000000000003e8',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 2157,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 305,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
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
                height: 832625,
                hash: '00000000000000001677f56a57d820e02079e4a3ed62d7aeb0acbf7fa937b8bb',
                timestamp: 1708546646,
            },
        },
        calculated: {
            genesisSupply: '1000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14': {
        token: {
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'GYP',
                tokenName: 'Gypsum',
                url: 'https://cashtab.com/',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 832778,
                hash: '000000000000000002113ac0f6519d1a51a933bb5c8f665875d5ff5ead6e0274',
                timestamp: 1708641780,
            },
        },
        tx: {
            txid: 'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'ef1ddcac70e02ad6caf2dc37f0a337d349c8abaf32312b55e7dfaa6085643b06',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022002d7028ecd2a1ece84ce03160fdb5e93784b954c31382ffd3e78c75aca4ef16302205f81fdb6993f63b963f1a0590d4e32e51b5ad8383ad09ee4182ffd2966673a7a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 998111,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953034759500647797073756d1468747470733a2f2f636173687461622e636f6d2f4c0001094c00088ac7230489e80000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10000000000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                        outIdx: 1,
                    },
                },
                {
                    value: 996966,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 297,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
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
                height: 832778,
                hash: '000000000000000002113ac0f6519d1a51a933bb5c8f665875d5ff5ead6e0274',
                timestamp: 1708641780,
            },
        },
        calculated: {
            genesisSupply: '10000000000.000000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa': {
        token: {
            tokenId:
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
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
        calculated: {
            genesisSupply: '10000000000.00',
            genesisOutputScripts: [
                '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823': {
        token: {
            tokenId:
                '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'TRIB',
                tokenName: 'eCash Herald',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        },
        tx: {
            txid: '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'b6b9ae8ea74be20c82307df38d9ba3994e77613b1fe26b25d5688fcbd4f468f8',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402204297897dbf74589a2e4872c488144d98a03f446878f7e4d22833bf221faf127002201c33519f5e3f662ac3e0da53ff35ef40057d482bfb75310c0c05d402b208dfdf412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 9039904,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495304545249420c654361736820486572616c641468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000000002710',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
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
                        txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                        outIdx: 1,
                    },
                },
                {
                    value: 9038903,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'ff2d098a14929713f392d46963c5b09c2fa5f38f84793f04e55e94f3bc7eac23',
                        outIdx: 0,
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
                        '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
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
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        },
        calculated: {
            genesisSupply: '10000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109': {
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'BEAR',
                tokenName: 'BearNip',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        },
        tx: {
            txid: '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '0e737a2f6373649341b406334341202a5ddbbdb389c55da40570b641dc23d036',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022055444db90f98b462ca29a6f51981da4015623ddc34dc1f575852426ccb785f0402206e786d4056be781ca1720a0a915b040e0a9e8716b8e4d30b0779852c191fdeb3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 6231556,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '4444',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                        outIdx: 1,
                    },
                },
                {
                    value: 6230555,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 299,
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
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        },
        calculated: {
            genesisSupply: '4444',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896': {
        token: {
            tokenId:
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'BULL',
                tokenName: 'Bull',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 835482,
                hash: '0000000000000000133bf16cb7fdab5c6ff64a874632eb2fe80265e34a6ad99f',
                timestamp: 1710174132,
            },
        },
        tx: {
            txid: '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f211007def30735a245bdaa6f9efe429c999e02713f6ce6328478da3444b7248',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402207801a307548c5ecccd6e37043bda5e96cb9d27c93e4e60deaff4344605f138b202201a7fd155a42171c4b3331425b3e708df4e9606edfd221b2e500e3fb6bb541f2b412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 981921,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e455349530442554c4c0442756c6c1468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000001406f40',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '21000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 981078,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '4d8c8d06b724493f5ab172a18d9bf9f4d8419c09bc5a93fe780902b21dab75ba',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 296,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
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
                height: 835482,
                hash: '0000000000000000133bf16cb7fdab5c6ff64a874632eb2fe80265e34a6ad99f',
                timestamp: 1710174132,
            },
        },
        calculated: {
            genesisSupply: '21000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96': {
        token: {
            tokenId:
                '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CPG',
                tokenName: 'Cashtab Prod Gamma',
                url: 'thecryptoguy.com',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 688495,
                hash: '000000000000000028aa42a7c622846b742465dfaaf41d29f955c1b8ee890c9e',
                timestamp: 1622237370,
            },
        },
        tx: {
            txid: '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'd83677da1b3ade24e9fdcc2a47e3ba87e1fbe1de9e13075d79d16819952a8789',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022026270f7aea8af1edf82758749f1e1c68accbb3a2719e9c37a49b55f098a4c22302206f5be10f536837f0001f555e968a7a977186d5acfa405e0e47b9df033815ccee412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 26811307,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e455349530343504712436173687461622050726f642047616d6d611074686563727970746f6775792e636f6d4c0001004c00080000000000000064',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
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
                        txid: 'fb50eac73a4fd5e2a701e0dbf4e575cea9c083e061b1db722e057164c7317e5b',
                        outIdx: 1,
                    },
                },
                {
                    value: 26810238,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '5f0ab0ecfb8807dfdbc97eb421b940cef3c1c70a4c99fd96c39414de42f32338',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 305,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
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
                height: 688495,
                hash: '000000000000000028aa42a7c622846b742465dfaaf41d29f955c1b8ee890c9e',
                timestamp: 1622237370,
            },
        },
        calculated: {
            genesisSupply: '100',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7': {
        token: {
            tokenId:
                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'ABC',
                tokenName: 'ABC',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 832725,
                hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                timestamp: 1708607039,
            },
        },
        tx: {
            txid: 'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9866faa3294afc3f4dd5669c67ee4d0ded42db25d08728fe07166e9cda9ee8f9',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100fb14b5f82605972478186c91ff6fab2051b46abd2a8aa9774b3e9276715daf39022046a62933cc3acf59129fbf373ef05480342312bc33aaa8bf7fb5a0495b5dc80e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 1617,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e4553495303414243034142431468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000000c',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
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
                        txid: '41fd4cb3ce0162e44cfd5a446b389afa6b35461d466d55321be412a518c56d63',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 261,
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
                height: 832725,
                hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                timestamp: 1708607039,
            },
        },
        calculated: {
            genesisSupply: '12',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f': {
        token: {
            tokenId:
                '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: '1711020786',
            genesisInfo: {
                tokenTicker: 'CAFF',
                tokenName: 'Coffee',
                url: 'https://cashtab.com/',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 836820,
                hash: '00000000000000000afa24f7d3cab51184e1469cecd61bf472d3a3fcc907bc19',
                timestamp: 1711021281,
            },
        },
        tx: {
            txid: '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1dcefe4f3afa79c312641d57497b0db7bc9ef85f4e119a3e6c9968ce1507443c',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022018a26c1aaade553fd448ef86c8511bc8e603b755267588ed2406789c5e5fbc69022011a48bcb93c1ec7384b23c4a9b5b3c8a059bf3cb427a02935bc6e4ab77c810df412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 2214,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953044341464606436f666665651468747470733a2f2f636173687461622e636f6d2f4c0001094c00080000000cce416600',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '55000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 1369,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711020786,
            size: 298,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
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
                height: 836820,
                hash: '00000000000000000afa24f7d3cab51184e1469cecd61bf472d3a3fcc907bc19',
                timestamp: 1711021281,
            },
        },
        calculated: {
            genesisSupply: '55.000000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4': {
        token: {
            tokenId:
                '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CGEN',
                tokenName: 'Cashtab Genesis',
                url: 'https://boomertakes.com/',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 684837,
                hash: '00000000000000001d065fdd22416c4e8e99803964f4fb9c91af6feb5ead5ff3',
                timestamp: 1620082584,
            },
        },
        tx: {
            txid: '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '11ae0a8c62deeadbffe82ddea823e731dba7172a672bd98628bf8bd3c0e15b50',
                        outIdx: 3,
                    },
                    inputScript:
                        '473044022009777275694aab45f8c5589308b8f525c4b9b7f0b0a4b80b01531988313e92fc02206e7f0afa725f407f59f85482f26ea20a70c5fe533c0592c95733a4418054c025412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 1497156989,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953044347454e0f436173687461622047656e657369731868747470733a2f2f626f6f6d657274616b65732e636f6d2f4c0001094c000800038d7ea4c68000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1000000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '4f5af8d3dc9d1fb3dc803a80589cab62c78235264aa90e4f8066b7960804cd74',
                        outIdx: 1,
                    },
                },
                {
                    value: 1497155685,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 311,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
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
                height: 684837,
                hash: '00000000000000001d065fdd22416c4e8e99803964f4fb9c91af6feb5ead5ff3',
                timestamp: 1620082584,
            },
        },
        calculated: {
            genesisSupply: '1000000.000000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
};
export const keyValueBalanceArray = [
    ['bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd', '1'],
    ['dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d', '1'],
    ['50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e', '1'],
    [
        'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
        '1200',
    ],
    ['e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b', '1.0'],
    ['44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168', '2'],
    [
        'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
        '5000',
    ],
    [
        '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
        '1.00000000',
    ],
    ['77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6', '116'],
    ['da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0', '311'],
    [
        '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
        '504680.0000',
    ],
    [
        'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
        '777.7777777',
    ],
    [
        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
        '.246913633',
    ],
    [
        '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
        '1699',
    ],
    [
        'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
        '.99999998',
    ],
    [
        'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
        '424.00000000',
    ],
    ['7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1', '1'],
    [
        'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
        '19889',
    ],
    ['157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6', '82'],
    [
        '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
        '999882.000000000',
    ],
    [
        '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
        '999999878',
    ],
    [
        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
        '996012',
    ],
    ['b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7', '3'],
    [
        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
        '8988',
    ],
    ['70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4', '100'],
    ['ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516', '100'],
    ['f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29', '100'],
    [
        '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
        '999998999',
    ],
    [
        '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
        '21.00',
    ],
    [
        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
        '2998978719.999999999',
    ],
    [
        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
        '999824',
    ],
    [
        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
        '999977636',
    ],
    [
        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
        '523512085.8888890',
    ],
    ['b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d', '727'],
    ['6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc', '121'],
    [
        'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
        '24.999698951',
    ],
    [
        '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
        '1.000000000',
    ],
    [
        '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
        '53.44445',
    ],
    [
        'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
        '1000',
    ],
    [
        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
        '10000000000.000000000',
    ],
    [
        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
        '100000000.00',
    ],
    [
        '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
        '9899',
    ],
    [
        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
        '4283',
    ],
    [
        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
        '21000000',
    ],
    ['666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96', '94'],
    ['b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7', '5'],
    [
        '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
        '55.000000000',
    ],
    [
        '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
        '844601.876543211',
    ],
];

// Build a mock token cache from these chronik mocks
const largeTokenCache = new CashtabCache().tokens;
for (const tokenId of Object.keys(chronikTokenMocks)) {
    const { token, calculated } = chronikTokenMocks[tokenId];
    const { timeFirstSeen, genesisInfo, tokenType } = token;
    const { genesisSupply, genesisOutputScripts, genesisMintBatons } =
        calculated;
    const cachedInfo = {
        timeFirstSeen,
        genesisInfo,
        tokenType,
        genesisSupply,
        genesisOutputScripts,
        genesisMintBatons,
    };
    if ('block' in token) {
        cachedInfo.block = token.block;
    }
    largeTokenCache.set(tokenId, cachedInfo);
}
export const mockLargeTokenCache = largeTokenCache;

/**
 * getTxHistory mocks
 * Mock a wallet with tx history at two different paths to confirm expected behavior
 */

export const mockTxHistoryWalletJson = {
    ...validWalletJson,
    paths: [
        [
            1899,
            {
                address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                hash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                wif: 'string',
            },
        ],
        [
            145,
            {
                address: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
                hash: '0d94ba179ec21c42417a71a77873b3619363d8ea',
                wif: 'string',
            },
        ],
    ],
};
export const mockPath1899History = [
    {
        txid: '66c3321dcaf4eba9e05b6167e9714c4a7b660917c2f5d29d65a519944d4c62e7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '7171e77e21a57df5193fe387aa5e3d646dd5438c18c80a5a997fd3c2300fc679',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fbe76f31450482a18941ed90fee302662e5e6184d9d84fda6f2a4df9b1d1697a022041432311f5563007d46ade3536fb5988b9c97e2e8aeeec59c15c3efb5c4d0f70412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 1676077,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '24eae444d765406d8362da437d66a7cf50b95685198692bd2253bafd4bd003a0',
                    outIdx: 2,
                },
            },
            {
                value: 1674751,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794721,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
    },
    {
        txid: 'acc7bf16ee329a9a6c40cdaa5fca01fdfc44f143393346821b4bc58557cfb70c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '16c72330503bc3e6435ab45ca34f4ac1e2f88701db9c8c42efa21236514ba9ed',
                    outIdx: 7,
                },
                inputScript:
                    '473044022066325bcd7ba631d13d08f202714626fa7ec353febc985051d56a68edc19b0f900220016d4cb2308fa378ee04b101411cbfba88d99fd5e6d8b12170e17bca3d671c79412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 442567277,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 3300,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: 442563522,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '08fa8a346851d44fd4b6765c65008670ccadf8dabcae59686814279a449ada06',
                    outIdx: 2,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794713,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
    },
    {
        txid: '521468e91cf3d3b32d03e60c68ac12ff94606bd535267971d886f6febb225f9d',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3b13ffef338f913da39f5be9c1a363a87b5a6724f41b623f324c4e1b0c96e012',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100dba6667c91a695a7b1b509c901a7ce1fc7c859f2ad4e636729efc697e09177b802206fd4a2d53eaf96e010abdc562d2cc3a19f5ee5427a868105b9814f17eb6a6d72412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 988104,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '24eae444d765406d8362da437d66a7cf50b95685198692bd2253bafd4bd003a0',
                    outIdx: 1,
                },
            },
            {
                value: 986778,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794691,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
    },
    {
        txid: '19488e3cccbbc685a1016567b2acc2b52012a541b25ed4fee43f914f788eda5e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '16c72330503bc3e6435ab45ca34f4ac1e2f88701db9c8c42efa21236514ba9ed',
                    outIdx: 4,
                },
                inputScript:
                    '47304402202f1e5ef2f5f17d3c9f7b65094e903c39db01533ae24898492d30b329b98b3b4a022066cf37253c016fde0ce3b57c5a645605cfdbc10623970e97f68e66592275dc88412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 440000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: 438445,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '49e2dd75d2309fee1a8c69d31090ad0f5bdd60eaf32bf1eea1ed276dab33e26f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794683,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
    },
    {
        txid: '914827ddc2087db0e8ca8aed3c2a701f5873ea2f96f3837d6dce6f24ab53f854',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b115c352a487503755bbb93582ff39e1095d698fa303c7dd31bbf19c4bbf39a',
                    outIdx: 2,
                },
                inputScript:
                    '4730440220268dcf8d1be3fb33cdcd79b644acb12cdbf100040a51abf828a02fe17c34a03a0220141dce2d7292a49d82f13642e854f27326607dd8e3c13f7905632d373a56c70a412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
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
                    amount: '9',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                prevOut: {
                    txid: 'b3ca2414e646fbc53c6d789a242ea9afc1e84ec1e62ed8f5d58ab93d43207b66',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100c7106fb50492ac6726a6cae234ac7424842daee2285fb5a3c8005262a9fdbb06022061c24760989da27c0e3f372646243334d6048894a49aae3459a3f9ebabdc41d0412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 1100,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                prevOut: {
                    txid: '848af498277a4250bde6951849df0e66b9bc5a3b8766efbd43d3e660b773edc5',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c1eca663e5c9f06db6f3844254ff197bbbd106897ffef37300d9ce65b17f4ece02203f80564ba7e4d833db4ef6097c69dcb9ae9abce3cc2ab2c75f17a4c23059abfa412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 3181522,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109080000000000000001080000000000000008',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
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
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '94bf7fb1b2d37fed71085f9f32415f7426ed7cde692b9a9320ff6c811aa2db74',
                    outIdx: 0,
                },
            },
            {
                value: 3180811,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '20c513c9ae5f3966f8dae10c7e0681505756a5a0b4e4f707b366cdf51663c386',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794373,
        size: 628,
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
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
    },
];
export const mockPath145History = [
    {
        txid: '490a06b01b8d1793b81b5230ce2045132af0f0ec9cc7be860bb72e6a727d5bd4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '811a943532212685dce70bab73ba4facb06aced2f3752f5115176d4c970ef90b',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221008a6bb3c19db22b601ca5110415e0be8c56877b58741f7d6f50c57a8bd96f988d0220507a171d02a4fa7facc463bf62ce673a69d0d28fe3b6728a683c2ffc7a93418d4121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '999900000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
            {
                prevOut: {
                    txid: 'cfe4f1458af2be9f76e7a45c47a9c450aded46d3e5b41d97dfd3c56b2c16c7ca',
                    outIdx: 2,
                },
                inputScript:
                    '48304502210096482807afee1009914e934326930379ea308402643e786a1ac35786160cca37022070fe57cff80dba8475598c30b9515afa5e14caebf1ba1c7599554b9f9f7c89354121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 44907604,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000007aef40a000800038d5fad5b8e00',
            },
            {
                value: 546,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '33000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '999867000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 44906091,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'd711c97ff4fe19df3419c570b082bfefc99e5b3d093c0ca8e8397404573c98f3',
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
                    '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
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
            height: 833081,
            hash: '0000000000000000158bbff44ccbfe7b4dcfa9cbd48d58a225c0cf92e199f2e9',
            timestamp: 1708821393,
        },
    },
    {
        txid: '8bf2566feb21f4681fbf97155d78b388b9fc1fd6a6e4bc0e21324db5a9e7a7ac',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '7e1a29815174e7bb1af2275d8d15a31f3b6f9a6567d8489da1da406f85c809bf',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c2bc2700a443a772b07794660142c1eec7965c8f52e41c549ebba5dfeb2bc509022076884bfa70da9479414e572c450a8b6c667cf499f3367d4ed2ad786a5be2fbc54121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 45114487,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 100383,
                outputScript:
                    '76a914f5b3312155fe3781140dee0e84023f64cf73a6b588ac',
            },
            {
                value: 45013649,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'fa984e50466e064068368e0d456e5a8a774adc6005ece87a32337b779eb4c422',
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
            height: 827549,
            hash: '00000000000000000645c0726241fa2c04155544314090a1ddf3ac6e2fdc724b',
            timestamp: 1705492712,
        },
    },
    {
        txid: 'c28d33a9865ca5e063f457b626754a4cb65966b6b0c9e81b77ceef4b24b47c86',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'abf9d2a474685bf36bd34adb9773255c2c4ee3659a48b93eba19227c66f0179c',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008a4a4be8d5ee42c42af259946c4124827e04b3f01b5ea3947089b61108b2ce8c022002d9b52778dc30fd69b9ca11c527ea9fbdce649c654c5a169b8b5c25060e52c74121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 45419254,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 101053,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                value: 45317746,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: '6d182b409b9969ba0a15e65a63ee0162f9003850bdc8ad99b88fc6e855ef3c76',
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
            height: 827330,
            hash: '000000000000000014f2dc077361008081ac360ad6ccdaf4668786687a8df971',
            timestamp: 1705365441,
        },
    },
    {
        txid: 'abf9d2a474685bf36bd34adb9773255c2c4ee3659a48b93eba19227c66f0179c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '333851525d62f6e41d9445c488a88ef2c706d094248341d68369c24f2b38d4c6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100a9f318a6516e98c7eef150c697cfd227e6387a36727351a5448ab597819647db022003ee62af32cd383c6df39cc29a7c79b73e7a3734eae9252aaafbe02fe2c648ea4121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 45520841,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 101132,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                value: 45419254,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'c28d33a9865ca5e063f457b626754a4cb65966b6b0c9e81b77ceef4b24b47c86',
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
            height: 827330,
            hash: '000000000000000014f2dc077361008081ac360ad6ccdaf4668786687a8df971',
            timestamp: 1705365441,
        },
    },
    {
        txid: '7e1a29815174e7bb1af2275d8d15a31f3b6f9a6567d8489da1da406f85c809bf',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6d182b409b9969ba0a15e65a63ee0162f9003850bdc8ad99b88fc6e855ef3c76',
                    outIdx: 1,
                },
                inputScript:
                    '47304402203b88cbdb66bcf921259eb1a9c33345048de4aaab35b8e51d80067812232c791e02207f30aaaf1e4548f97a168a6f210f085e8521982cdfd9055a6fe6c7769b29d7484121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 45216157,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 101215,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                value: 45114487,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: '8bf2566feb21f4681fbf97155d78b388b9fc1fd6a6e4bc0e21324db5a9e7a7ac',
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
            height: 827330,
            hash: '000000000000000014f2dc077361008081ac360ad6ccdaf4668786687a8df971',
            timestamp: 1705365441,
        },
    },
];
export const tokensInHistory = {
    '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8': {
        token: {
            tokenId:
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'VSP',
                tokenName: 'Vespene Gas',
                url: 'https://simple.wikipedia.org/wiki/StarCraft#Gameplay',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 763087,
                hash: '0000000000000000015abcebc15e74036598855a9fdd976868ad99bb23b87a89',
                timestamp: 1666631359,
            },
        },
        tx: {
            txid: '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'ac8be4ed7289014eb615cf8aa122cbd94283fe566142052d7ac8c6fab241fb51',
                        outIdx: 2,
                    },
                    inputScript:
                        '46304302200db47adc26bbb4ae4584ae455c5f078a4d2f624e898fab3159c74473677bc8b2021f371ea6c9acd051c96eaba2b229d06a0247dad2acf6cf0694792d22280dfe8e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 1253,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953035653500b56657370656e65204761733468747470733a2f2f73696d706c652e77696b6970656469612e6f72672f77696b692f5374617243726166742347616d65706c61794c0001094c000829a2241af62c0000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '3000000000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'fc1ada187e9f5da7616f481c79cd0fa3aafa3d4094288db6806e7508f76b5fcd',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 299,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
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
                height: 763087,
                hash: '0000000000000000015abcebc15e74036598855a9fdd976868ad99bb23b87a89',
                timestamp: 1666631359,
            },
        },
        calculated: {
            genesisSupply: '3000000000.000000000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109': {
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timefirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'BEAR',
                tokenName: 'BearNip',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        },
        tx: {
            txid: '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '0e737a2f6373649341b406334341202a5ddbbdb389c55da40570b641dc23d036',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022055444db90f98b462ca29a6f51981da4015623ddc34dc1f575852426ccb785f0402206e786d4056be781ca1720a0a915b040e0a9e8716b8e4d30b0779852c191fdeb3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 6231556,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '4444',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                        outIdx: 1,
                    },
                },
                {
                    value: 6230555,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 299,
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
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        },
        calculated: {
            genesisSupply: '4444',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    },
};
// Build a mock token cache from these chronik mocks
export const mockParseTxTokenCache = new CashtabCache([
    [
        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CTB',
                tokenName: 'CashTabBits',
                url: 'https://cashtabapp.com/',
                decimals: 9,
                hash: '',
            },
            block: {
                height: 662874,
                hash: '000000000000000055df35f930c6e9ef6f4c51f1df6650d53eb3390cb92503fa',
                timestamp: 1606935101,
            },
            // We do not need to mock genesisSupply, genesisOutputScripts, or genesisMintBatons (yet)
            // for parseChronikTx
        },
    ],
    [
        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'WDT',
                tokenName:
                    'Test Token With Exceptionally Long Name For CSS And Style Revisions',
                url: 'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
                decimals: 7,
                hash: '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
            },
            block: {
                height: 659948,
                hash: '000000000000000002e096ec3fda458dab941cd2ab40a7be10d54e88c9b06f37',
                timestamp: 1604423892,
            },
        },
    ],
    [
        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'LVV',
                tokenName: 'Lambda Variant Variants',
                url: 'https://cashtabapp.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 700722,
                hash: '0000000000000000260ee4c3b4f4ddde127bc0105d685c0ef31775b612627222',
                timestamp: 1629500864,
            },
        },
    ],
    [
        'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'UDT',
                tokenName: 'UpdateTest',
                url: 'https://cashtab.com/',
                decimals: 7,
                hash: '',
            },
            block: {
                height: 759037,
                hash: '00000000000000000bc95bfdd45e71585f27139e71b56dd5bc86ef05d35b502f',
                timestamp: 1664226709,
            },
        },
    ],
    [
        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'NOCOVID',
                tokenName: 'Covid19 Lifetime Immunity',
                url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 680063,
                hash: '000000000000000012ad3d6dfb3505616ab9c3cb3772abac0448ddfc25043df4',
                timestamp: 1617304616,
            },
        },
    ],
]).tokens;

const txHistoryTokenCache = new CashtabCache().tokens;
for (const tokenId of Object.keys(tokensInHistory)) {
    const { token, calculated } = tokensInHistory[tokenId];
    const { timeFirstSeen, genesisInfo, tokenType } = token;
    const { genesisSupply, genesisOutputScripts, genesisMintBatons } =
        calculated;
    const cachedInfo = {
        timeFirstSeen,
        genesisInfo,
        tokenType,
        genesisSupply,
        genesisOutputScripts,
        genesisMintBatons,
    };
    if ('block' in token) {
        cachedInfo.block = token.block;
    }
    txHistoryTokenCache.set(tokenId, cachedInfo);
}
export const mockTxHistoryTokenCache = txHistoryTokenCache;

export const expectedParsedTxHistory = [
    {
        txid: '66c3321dcaf4eba9e05b6167e9714c4a7b660917c2f5d29d65a519944d4c62e7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '7171e77e21a57df5193fe387aa5e3d646dd5438c18c80a5a997fd3c2300fc679',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100fbe76f31450482a18941ed90fee302662e5e6184d9d84fda6f2a4df9b1d1697a022041432311f5563007d46ade3536fb5988b9c97e2e8aeeec59c15c3efb5c4d0f70412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 1676077,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '24eae444d765406d8362da437d66a7cf50b95685198692bd2253bafd4bd003a0',
                    outIdx: 2,
                },
            },
            {
                value: 1674751,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794721,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
        parsed: {
            incoming: false,
            xecAmount: 11,
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            aliasFlag: false,
        },
    },
    {
        txid: 'acc7bf16ee329a9a6c40cdaa5fca01fdfc44f143393346821b4bc58557cfb70c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '16c72330503bc3e6435ab45ca34f4ac1e2f88701db9c8c42efa21236514ba9ed',
                    outIdx: 7,
                },
                inputScript:
                    '473044022066325bcd7ba631d13d08f202714626fa7ec353febc985051d56a68edc19b0f900220016d4cb2308fa378ee04b101411cbfba88d99fd5e6d8b12170e17bca3d671c79412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 442567277,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 3300,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: 442563522,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '08fa8a346851d44fd4b6765c65008670ccadf8dabcae59686814279a449ada06',
                    outIdx: 2,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794713,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
        parsed: {
            incoming: true,
            xecAmount: 33,
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            aliasFlag: false,
        },
    },
    {
        txid: '521468e91cf3d3b32d03e60c68ac12ff94606bd535267971d886f6febb225f9d',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3b13ffef338f913da39f5be9c1a363a87b5a6724f41b623f324c4e1b0c96e012',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100dba6667c91a695a7b1b509c901a7ce1fc7c859f2ad4e636729efc697e09177b802206fd4a2d53eaf96e010abdc562d2cc3a19f5ee5427a868105b9814f17eb6a6d72412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 988104,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '24eae444d765406d8362da437d66a7cf50b95685198692bd2253bafd4bd003a0',
                    outIdx: 1,
                },
            },
            {
                value: 986778,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794691,
        size: 226,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
        parsed: {
            incoming: false,
            xecAmount: 11,
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            aliasFlag: false,
        },
    },
    {
        txid: '19488e3cccbbc685a1016567b2acc2b52012a541b25ed4fee43f914f788eda5e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '16c72330503bc3e6435ab45ca34f4ac1e2f88701db9c8c42efa21236514ba9ed',
                    outIdx: 4,
                },
                inputScript:
                    '47304402202f1e5ef2f5f17d3c9f7b65094e903c39db01533ae24898492d30b329b98b3b4a022066cf37253c016fde0ce3b57c5a645605cfdbc10623970e97f68e66592275dc88412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 440000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 1100,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: 438445,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '49e2dd75d2309fee1a8c69d31090ad0f5bdd60eaf32bf1eea1ed276dab33e26f',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794683,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
        parsed: {
            incoming: true,
            xecAmount: 11,
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            aliasFlag: false,
        },
    },
    {
        txid: '914827ddc2087db0e8ca8aed3c2a701f5873ea2f96f3837d6dce6f24ab53f854',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5b115c352a487503755bbb93582ff39e1095d698fa303c7dd31bbf19c4bbf39a',
                    outIdx: 2,
                },
                inputScript:
                    '4730440220268dcf8d1be3fb33cdcd79b644acb12cdbf100040a51abf828a02fe17c34a03a0220141dce2d7292a49d82f13642e854f27326607dd8e3c13f7905632d373a56c70a412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
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
                    amount: '9',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                prevOut: {
                    txid: 'b3ca2414e646fbc53c6d789a242ea9afc1e84ec1e62ed8f5d58ab93d43207b66',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100c7106fb50492ac6726a6cae234ac7424842daee2285fb5a3c8005262a9fdbb06022061c24760989da27c0e3f372646243334d6048894a49aae3459a3f9ebabdc41d0412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 1100,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                prevOut: {
                    txid: '848af498277a4250bde6951849df0e66b9bc5a3b8766efbd43d3e660b773edc5',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c1eca663e5c9f06db6f3844254ff197bbbd106897ffef37300d9ce65b17f4ece02203f80564ba7e4d833db4ef6097c69dcb9ae9abce3cc2ab2c75f17a4c23059abfa412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 3181522,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109080000000000000001080000000000000008',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
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
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '8',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '94bf7fb1b2d37fed71085f9f32415f7426ed7cde692b9a9320ff6c811aa2db74',
                    outIdx: 0,
                },
            },
            {
                value: 3180811,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '20c513c9ae5f3966f8dae10c7e0681505756a5a0b4e4f707b366cdf51663c386',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1710794373,
        size: 628,
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
        block: {
            height: 836458,
            hash: '000000000000000011a4069425835dd50ffd7eed5e7fd2e6e464e3996d74cf71',
            timestamp: 1710799378,
        },
        parsed: {
            incoming: true,
            xecAmount: 5.46,
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
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            assumedTokenDecimals: false,
        },
    },
    {
        txid: '490a06b01b8d1793b81b5230ce2045132af0f0ec9cc7be860bb72e6a727d5bd4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '811a943532212685dce70bab73ba4facb06aced2f3752f5115176d4c970ef90b',
                    outIdx: 2,
                },
                inputScript:
                    '4830450221008a6bb3c19db22b601ca5110415e0be8c56877b58741f7d6f50c57a8bd96f988d0220507a171d02a4fa7facc463bf62ce673a69d0d28fe3b6728a683c2ffc7a93418d4121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '999900000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
            {
                prevOut: {
                    txid: 'cfe4f1458af2be9f76e7a45c47a9c450aded46d3e5b41d97dfd3c56b2c16c7ca',
                    outIdx: 2,
                },
                inputScript:
                    '48304502210096482807afee1009914e934326930379ea308402643e786a1ac35786160cca37022070fe57cff80dba8475598c30b9515afa5e14caebf1ba1c7599554b9f9f7c89354121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 44907604,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000007aef40a000800038d5fad5b8e00',
            },
            {
                value: 546,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '33000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '999867000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 44906091,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'd711c97ff4fe19df3419c570b082bfefc99e5b3d093c0ca8e8397404573c98f3',
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
                    '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
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
            height: 833081,
            hash: '0000000000000000158bbff44ccbfe7b4dcfa9cbd48d58a225c0cf92e199f2e9',
            timestamp: 1708821393,
        },
        parsed: {
            incoming: false,
            xecAmount: 5.46,
            isEtokenTx: true,
            etokenAmount: '33',
            isTokenBurn: false,
            tokenEntries: [
                {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
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
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
            assumedTokenDecimals: false,
        },
    },
    {
        txid: '8bf2566feb21f4681fbf97155d78b388b9fc1fd6a6e4bc0e21324db5a9e7a7ac',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '7e1a29815174e7bb1af2275d8d15a31f3b6f9a6567d8489da1da406f85c809bf',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c2bc2700a443a772b07794660142c1eec7965c8f52e41c549ebba5dfeb2bc509022076884bfa70da9479414e572c450a8b6c667cf499f3367d4ed2ad786a5be2fbc54121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 45114487,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 100383,
                outputScript:
                    '76a914f5b3312155fe3781140dee0e84023f64cf73a6b588ac',
            },
            {
                value: 45013649,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'fa984e50466e064068368e0d456e5a8a774adc6005ece87a32337b779eb4c422',
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
            height: 827549,
            hash: '00000000000000000645c0726241fa2c04155544314090a1ddf3ac6e2fdc724b',
            timestamp: 1705492712,
        },
        parsed: {
            incoming: false,
            xecAmount: 1003.83,
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
            aliasFlag: false,
        },
    },
    {
        txid: 'c28d33a9865ca5e063f457b626754a4cb65966b6b0c9e81b77ceef4b24b47c86',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'abf9d2a474685bf36bd34adb9773255c2c4ee3659a48b93eba19227c66f0179c',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008a4a4be8d5ee42c42af259946c4124827e04b3f01b5ea3947089b61108b2ce8c022002d9b52778dc30fd69b9ca11c527ea9fbdce649c654c5a169b8b5c25060e52c74121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 45419254,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 101053,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                value: 45317746,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: '6d182b409b9969ba0a15e65a63ee0162f9003850bdc8ad99b88fc6e855ef3c76',
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
            height: 827330,
            hash: '000000000000000014f2dc077361008081ac360ad6ccdaf4668786687a8df971',
            timestamp: 1705365441,
        },
        parsed: {
            incoming: false,
            xecAmount: 1010.53,
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
            aliasFlag: false,
        },
    },
    {
        txid: 'abf9d2a474685bf36bd34adb9773255c2c4ee3659a48b93eba19227c66f0179c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '333851525d62f6e41d9445c488a88ef2c706d094248341d68369c24f2b38d4c6',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100a9f318a6516e98c7eef150c697cfd227e6387a36727351a5448ab597819647db022003ee62af32cd383c6df39cc29a7c79b73e7a3734eae9252aaafbe02fe2c648ea4121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 45520841,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 101132,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                value: 45419254,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'c28d33a9865ca5e063f457b626754a4cb65966b6b0c9e81b77ceef4b24b47c86',
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
            height: 827330,
            hash: '000000000000000014f2dc077361008081ac360ad6ccdaf4668786687a8df971',
            timestamp: 1705365441,
        },
        parsed: {
            incoming: false,
            xecAmount: 1011.32,
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
            aliasFlag: false,
        },
    },
    {
        txid: '7e1a29815174e7bb1af2275d8d15a31f3b6f9a6567d8489da1da406f85c809bf',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6d182b409b9969ba0a15e65a63ee0162f9003850bdc8ad99b88fc6e855ef3c76',
                    outIdx: 1,
                },
                inputScript:
                    '47304402203b88cbdb66bcf921259eb1a9c33345048de4aaab35b8e51d80067812232c791e02207f30aaaf1e4548f97a168a6f210f085e8521982cdfd9055a6fe6c7769b29d7484121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 45216157,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 101215,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                value: 45114487,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: '8bf2566feb21f4681fbf97155d78b388b9fc1fd6a6e4bc0e21324db5a9e7a7ac',
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
            height: 827330,
            hash: '000000000000000014f2dc077361008081ac360ad6ccdaf4668786687a8df971',
            timestamp: 1705365441,
        },
        parsed: {
            incoming: false,
            xecAmount: 1012.15,
            isEtokenTx: false,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            replyAddress: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
            aliasFlag: false,
        },
    },
];

const tokenInfoErrorParsedTxHistory = JSON.parse(
    JSON.stringify(expectedParsedTxHistory),
);
for (const tx of tokenInfoErrorParsedTxHistory) {
    if ('assumedTokenDecimals' in tx.parsed) {
        // If we had cached token info before, we do not have it now
        tx.parsed.assumedTokenDecimals = true;
    }
    if (tx.parsed.etokenAmount === '33') {
        // Update amount for the one assumed tx where decimals is not really 0
        tx.parsed.etokenAmount = '33000000000';
    }
}

export const noCachedInfoParsedTxHistory = tokenInfoErrorParsedTxHistory;
