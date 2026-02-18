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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 12214100n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
                        sats: 0n,
                    },
                    {
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
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 88888888888n,
                        },
                        spentBy: {
                            txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                            outIdx: 1,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                            outIdx: 67,
                        },
                        sats: 12213031n,
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
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 12218055n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                        sats: 3500n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                            outIdx: 0,
                        },
                        sats: 12214100n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 12224078n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                        spentBy: {
                            txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                            outIdx: 0,
                        },
                        sats: 2200n,
                    },
                    {
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                        sats: 3300n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                            outIdx: 0,
                        },
                        sats: 12218055n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 12230101n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                        sats: 3300n,
                    },
                    {
                        outputScript:
                            '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                        spentBy: {
                            txid: 'ff40dc28bd694b45d782be8c1726417b8db51fd466e429cf3ee906c9dab0b650',
                            outIdx: 0,
                        },
                        sats: 2200n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                            outIdx: 0,
                        },
                        sats: 12224078n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 12233856n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                        sats: 3300n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                            outIdx: 0,
                        },
                        sats: 12230101n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 12235011n,
                    },
                ],
                outputs: [
                    {
                        outputScript: '6a04007461620454657374',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                        sats: 700n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                            outIdx: 0,
                        },
                        sats: 12233856n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 12243166n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        spentBy: {
                            txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                            outIdx: 3,
                        },
                        sats: 7700n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                            outIdx: 0,
                        },
                        sats: 12235011n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 14743621n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                            outIdx: 0,
                        },
                        sats: 2500000n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                            outIdx: 0,
                        },
                        sats: 12243166n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 14746276n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                            outIdx: 0,
                        },
                        sats: 2200n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                            outIdx: 0,
                        },
                        sats: 14743621n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        sats: 14748931n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                            outIdx: 1,
                        },
                        sats: 2200n,
                    },
                    {
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                            outIdx: 0,
                        },
                        sats: 14746276n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 49545n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                            outIdx: 1,
                        },
                        sats: 1300n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                            outIdx: 1,
                        },
                        sats: 47790n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 47562n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                            outIdx: 1,
                        },
                        sats: 1200n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                            outIdx: 1,
                        },
                        sats: 45907n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 3300n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                            outIdx: 0,
                        },
                        sats: 1100n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                            outIdx: 0,
                        },
                        sats: 1745n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 2200n,
                    },
                    {
                        prevOut: {
                            txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 34n,
                        },
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 546n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                        sats: 0n,
                    },
                    {
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
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 5n,
                        },
                        spentBy: {
                            txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                            outIdx: 2,
                        },
                        sats: 546n,
                    },
                    {
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
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 29n,
                        },
                        sats: 546n,
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
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 7700n,
                    },
                    {
                        prevOut: {
                            txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 126n,
                        },
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 546n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
                        sats: 0n,
                    },
                    {
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
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        spentBy: {
                            txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                            outIdx: 1,
                        },
                        sats: 546n,
                    },
                    {
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
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 125n,
                        },
                        spentBy: {
                            txid: 'e94ba6040350284311a6409267c7c1193d6c5f19a9dd76975bbf7355f0c7ed1a',
                            outIdx: 2,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                            outIdx: 0,
                        },
                        sats: 6655n,
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
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 3300n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                            outIdx: 0,
                        },
                        sats: 1900n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                            outIdx: 0,
                        },
                        sats: 945n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1700n,
                    },
                    {
                        prevOut: {
                            txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 3300n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                            outIdx: 0,
                        },
                        sats: 1800n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '8af4664ffc7f23d64f0ddf76a6881d6a9c3bcf1b3f3e6562e8ed70ab5f58f4e6',
                            outIdx: 0,
                        },
                        sats: 2448n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 2200n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                            outIdx: 1,
                        },
                        sats: 1700n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 43783281n,
                    },
                    {
                        prevOut: {
                            txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
                        sats: 0n,
                    },
                    {
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
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 99n,
                        },
                        spentBy: {
                            txid: 'a39c15bc372916359d79196a67f4edbacc515b0a9b8b9a9395e4eb13a9ef2a07',
                            outIdx: 0,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'fcf45f6f12a4442bf206f85c87dfb7cfccdf438927fabbfe314a2c780545dcf9',
                            outIdx: 0,
                        },
                        sats: 43781463n,
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
                        burnsMintBatons: false,
                        actualBurnAtoms: 1n,
                        intentionalBurnAtoms: 0n,
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
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 10409988n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                            outIdx: 1,
                        },
                        sats: 1200n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '4263f3ceb04ec33a7cdb4d076caa4f2311fbdbb50b4330693e91d4ceb2e2fd5d',
                            outIdx: 0,
                        },
                        sats: 10408333n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12214100n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 88888888888n,
                },
                spentBy: {
                    txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                    outIdx: 67,
                },
                sats: 12213031n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12218055n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 3500n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    outIdx: 0,
                },
                sats: 12214100n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12224078n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                    outIdx: 0,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 3300n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 0,
                },
                sats: 12218055n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12230101n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 3300n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: 'ff40dc28bd694b45d782be8c1726417b8db51fd466e429cf3ee906c9dab0b650',
                    outIdx: 0,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 0,
                },
                sats: 12224078n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12233856n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 3300n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 0,
                },
                sats: 12230101n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12235011n,
            },
        ],
        outputs: [
            {
                outputScript: '6a04007461620454657374',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 700n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 0,
                },
                sats: 12233856n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12243166n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                spentBy: {
                    txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                    outIdx: 3,
                },
                sats: 7700n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 0,
                },
                sats: 12235011n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 14743621n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                    outIdx: 0,
                },
                sats: 2500000n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 0,
                },
                sats: 12243166n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 14746276n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                    outIdx: 0,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 0,
                },
                sats: 14743621n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 14748931n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                    outIdx: 1,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 0,
                },
                sats: 14746276n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 49545n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 1,
                },
                sats: 1300n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 1,
                },
                sats: 47790n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 47562n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 1,
                },
                sats: 1200n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 1,
                },
                sats: 45907n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 0,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 0,
                },
                sats: 1745n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 34n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 5n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 29n,
                },
                sats: 546n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1100n,
            },
            {
                prevOut: {
                    txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 7700n,
            },
            {
                prevOut: {
                    txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                    outIdx: 2,
                },
                inputScript:
                    '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 126n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 125n,
                },
                spentBy: {
                    txid: 'e94ba6040350284311a6409267c7c1193d6c5f19a9dd76975bbf7355f0c7ed1a',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 0,
                },
                sats: 6655n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 0,
                },
                sats: 1900n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 0,
                },
                sats: 945n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1700n,
            },
            {
                prevOut: {
                    txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                    outIdx: 0,
                },
                inputScript:
                    '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                    outIdx: 0,
                },
                sats: 1800n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '8af4664ffc7f23d64f0ddf76a6881d6a9c3bcf1b3f3e6562e8ed70ab5f58f4e6',
                    outIdx: 0,
                },
                sats: 2448n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                    outIdx: 1,
                },
                sats: 1700n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 43783281n,
            },
            {
                prevOut: {
                    txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 100n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 99n,
                },
                spentBy: {
                    txid: 'a39c15bc372916359d79196a67f4edbacc515b0a9b8b9a9395e4eb13a9ef2a07',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'fcf45f6f12a4442bf206f85c87dfb7cfccdf438927fabbfe314a2c780545dcf9',
                    outIdx: 0,
                },
                sats: 43781463n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 1n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 10409988n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 1,
                },
                sats: 1200n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '4263f3ceb04ec33a7cdb4d076caa4f2311fbdbb50b4330693e91d4ceb2e2fd5d',
                    outIdx: 0,
                },
                sats: 10408333n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 49545n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 1,
                },
                sats: 1300n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 1,
                },
                sats: 47790n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 47562n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 1,
                },
                sats: 1200n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 1,
                },
                sats: 45907n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 0,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 0,
                },
                sats: 1745n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 34n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 5n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 29n,
                },
                sats: 546n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1100n,
            },
            {
                prevOut: {
                    txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 7700n,
            },
            {
                prevOut: {
                    txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                    outIdx: 2,
                },
                inputScript:
                    '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 126n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 125n,
                },
                spentBy: {
                    txid: 'e94ba6040350284311a6409267c7c1193d6c5f19a9dd76975bbf7355f0c7ed1a',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 0,
                },
                sats: 6655n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 0,
                },
                sats: 1900n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 0,
                },
                sats: 945n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1700n,
            },
            {
                prevOut: {
                    txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                    outIdx: 0,
                },
                inputScript:
                    '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                    outIdx: 0,
                },
                sats: 1800n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '8af4664ffc7f23d64f0ddf76a6881d6a9c3bcf1b3f3e6562e8ed70ab5f58f4e6',
                    outIdx: 0,
                },
                sats: 2448n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'f6afd5aa9d891919f8b412136107bebc970863ea24b23c76b96cee5b3577ccd5',
                    outIdx: 1,
                },
                sats: 1700n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 43783281n,
            },
            {
                prevOut: {
                    txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 100n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 99n,
                },
                spentBy: {
                    txid: 'a39c15bc372916359d79196a67f4edbacc515b0a9b8b9a9395e4eb13a9ef2a07',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'fcf45f6f12a4442bf206f85c87dfb7cfccdf438927fabbfe314a2c780545dcf9',
                    outIdx: 0,
                },
                sats: 43781463n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 1n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 10409988n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                    outIdx: 1,
                },
                sats: 1200n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '4263f3ceb04ec33a7cdb4d076caa4f2311fbdbb50b4330693e91d4ceb2e2fd5d',
                    outIdx: 0,
                },
                sats: 10408333n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12214100n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 88888888888n,
                },
                spentBy: {
                    txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                    outIdx: 67,
                },
                sats: 12213031n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12218055n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 3500n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    outIdx: 0,
                },
                sats: 12214100n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12224078n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                    outIdx: 0,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 3300n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 0,
                },
                sats: 12218055n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12230101n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 3300n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: 'ff40dc28bd694b45d782be8c1726417b8db51fd466e429cf3ee906c9dab0b650',
                    outIdx: 0,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 0,
                },
                sats: 12224078n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12233856n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 3300n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 0,
                },
                sats: 12230101n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12235011n,
            },
        ],
        outputs: [
            {
                outputScript: '6a04007461620454657374',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                sats: 700n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 0,
                },
                sats: 12233856n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 12243166n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                spentBy: {
                    txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                    outIdx: 3,
                },
                sats: 7700n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 0,
                },
                sats: 12235011n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 14743621n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                    outIdx: 0,
                },
                sats: 2500000n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 0,
                },
                sats: 12243166n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 14746276n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                    outIdx: 0,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 0,
                },
                sats: 14743621n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                sats: 14748931n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                    outIdx: 1,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 0,
                },
                sats: 14746276n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
            {
                prevOut: {
                    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008461ccf6961f300a0f8c7ec5526813b531aea5033cacef6d15ab7e033f50130102206d22a9a7bd0ec2f04ace2c0642f233fea3bbed7ee677e53416845a0bfd367044412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 17n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000e080000000000000003',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 14n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 4,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 3n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 2,
                },
                sats: 1482n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1200n,
            },
            {
                prevOut: {
                    txid: '4f1a2f3e24b270b57e4d6b9bc6204360cdfeb1dfeca7d92379d49a7ba55c8a5f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cff4ca28b0bd320f4aa7bd3029b0c1e48c392b42c56b7dfdca292bbb14302e5f02206bc74177a98481e49c937a6229ebd8191f653a363c95cd37b69f1300f05f6d3a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
            {
                prevOut: {
                    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ad48dd7d1196b108e3ee0412edcbe468031dcf48244b9b4b57f6cc9e710c836602202e5a00a2c9e1e6fc8937af70fcb8018e299dd007235229e6e3d87f6af9f8761c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 228n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000d0800000000000000d7',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 13n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 3,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 215n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 0,
                },
                sats: 1255n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1700n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'c8ff3624364c59b0243f8bd341295d9afd6f12b95a2cd7e2630a206120e60bf8',
                    outIdx: 0,
                },
                sats: 1200n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 5500n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 2,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '44898363021248564c3e3b83e1852b1e764e3c9898170ea4a421ac950f5bdd4f',
                    outIdx: 0,
                },
                sats: 3945n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'c8ff3624364c59b0243f8bd341295d9afd6f12b95a2cd7e2630a206120e60bf8',
                    outIdx: 1,
                },
                sats: 1000n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 1,
                },
                sats: 745n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 49545n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 1,
                },
                sats: 1300n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 1,
                },
                sats: 47790n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 47562n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 1,
                },
                sats: 1200n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 1,
                },
                sats: 45907n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 0,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 0,
                },
                sats: 1745n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 34n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 5n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 29n,
                },
                sats: 546n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 0,
                },
                sats: 1900n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 0,
                },
                sats: 945n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
            {
                prevOut: {
                    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008461ccf6961f300a0f8c7ec5526813b531aea5033cacef6d15ab7e033f50130102206d22a9a7bd0ec2f04ace2c0642f233fea3bbed7ee677e53416845a0bfd367044412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 17n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000e080000000000000003',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 14n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 4,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 3n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 2,
                },
                sats: 1482n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1200n,
            },
            {
                prevOut: {
                    txid: '4f1a2f3e24b270b57e4d6b9bc6204360cdfeb1dfeca7d92379d49a7ba55c8a5f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cff4ca28b0bd320f4aa7bd3029b0c1e48c392b42c56b7dfdca292bbb14302e5f02206bc74177a98481e49c937a6229ebd8191f653a363c95cd37b69f1300f05f6d3a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
            {
                prevOut: {
                    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ad48dd7d1196b108e3ee0412edcbe468031dcf48244b9b4b57f6cc9e710c836602202e5a00a2c9e1e6fc8937af70fcb8018e299dd007235229e6e3d87f6af9f8761c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 228n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000d0800000000000000d7',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 13n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 3,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 215n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 0,
                },
                sats: 1255n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1700n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'c8ff3624364c59b0243f8bd341295d9afd6f12b95a2cd7e2630a206120e60bf8',
                    outIdx: 0,
                },
                sats: 1200n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 5500n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 2,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '44898363021248564c3e3b83e1852b1e764e3c9898170ea4a421ac950f5bdd4f',
                    outIdx: 0,
                },
                sats: 3945n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'c8ff3624364c59b0243f8bd341295d9afd6f12b95a2cd7e2630a206120e60bf8',
                    outIdx: 1,
                },
                sats: 1000n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0e8940542ea369db5a9828c5b382ab59e9b33b93ae17dc9c2fabc50ea77dcbea',
                    outIdx: 1,
                },
                sats: 745n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 49545n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 1,
                },
                sats: 1300n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 1,
                },
                sats: 47790n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 47562n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 1,
                },
                sats: 1200n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 1,
                },
                sats: 45907n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '96e8fe9856fd14994ce02fda65344d2929cfc37db3a56636379b6cd2ec9f5090',
                    outIdx: 0,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'c5628a5ebac844a6e62bff2319558711c0d61423b2c222761945414b1f604c68',
                    outIdx: 0,
                },
                sats: 1745n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 2200n,
            },
            {
                prevOut: {
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                    outIdx: 2,
                },
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 34n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 5n,
                },
                spentBy: {
                    txid: '1258f779801fcb0095ba69e7956ba3a375d695af5799923bfe409bc2887ab1e8',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 29n,
                },
                sats: 546n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '98c11ba510f0870c8c9fba69827e712c8dca3695edb6893b41588322496afa18',
                    outIdx: 0,
                },
                sats: 1900n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'd11d964010240aceb9cab32c200a87d2f44330852cc1f16a5e9daeed00d3a465',
                    outIdx: 0,
                },
                sats: 945n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 39162n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'b1e65a60daf031915bf3aebcf500e14a2d86f4e77c5fa043364f8a9e5698979c',
                    outIdx: 0,
                },
                sats: 2500n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
                    outIdx: 0,
                },
                sats: 36207n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 42017n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '3b994d17cb7e7b0adcb4b680ec1197c7cafa659bb565db61ada359352a40bcdc',
                    outIdx: 2,
                },
                sats: 2400n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 0,
                },
                sats: 39162n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 44772n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '312553668f596bfd61287aec1b7f0f035afb5ddadf40b6f9d1ffcec5b7d4b684',
                    outIdx: 0,
                },
                sats: 2300n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 0,
                },
                sats: 42017n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1825562n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'dacd4bacb46caa3af4a57ac0449b2cb82c8a32c64645cd6a64041287d1ced556',
                    outIdx: 0,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '60c6ad832e8f44ea59bb15166959b45828d8aec5554a2f70491dddf82dcda837',
                    outIdx: 0,
                },
                sats: 1822907n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1190050n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'd6e5e1511b25e984f2d0850ab47ff1e9fdf8cab546fbd5f5ae36299423a9dde3',
                    outIdx: 0,
                },
                sats: 2100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '3b40671157eaa30e277819d6bc93acf76377616edbe818d475acbd2cc4b07479',
                    outIdx: 0,
                },
                sats: 1187495n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 46590n,
            },
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200e225ab4c7d20aef968d95fbf6f881f313c9b35aef891edd4192c5320f147f2502205794732b6242c3a445ee1340ca03950e2044321b9c99bf7d5805ea36cac756dc412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8832n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000000508000000000000227b',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 5n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 8,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8827n,
                },
                spentBy: {
                    txid: '328df7f6a976c67875035acb051747c443cdac55173aef11ab1c17184162e2e9',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 0,
                },
                sats: 44772n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1827380n,
            },
            {
                prevOut: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200fdb134c8a13fbd1b95ef118c247a8a911e9d52ecaafc86ebb80cc179d69c1e002200bd4dc809c998a511e09f939a3270f7a2f9babae9d75919d2fef83ed66cf7dde412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8836n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000004080000000000002280',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 4n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 7,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8832n,
                },
                spentBy: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                    outIdx: 0,
                },
                sats: 1825562n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 45507n,
            },
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c96c70b94f5386efff2a8873d35d7b4c29fafe11555cf2a3daea8f905fb0f73502203751a29b351cca9c337345388237b98312873f44976f08667ae6540423a8d012412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8839n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000003080000000000002284',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 3n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 10,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8836n,
                },
                spentBy: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '7d1929454c7e83707006e9f70000b47fc68805c3e42de6545498f39c6f96d34e',
                    outIdx: 0,
                },
                sats: 43689n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 848n,
            },
            {
                prevOut: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f8df9b24dc337b5c7b0b41f454fb535a181aa95814d01e3e2246908fda3a5d800220417d4bd3c10d59f9655ddae4229813222abd9a5b148db1a456fde4719ea8dc56412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 4800n,
            },
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dcc45ddcb243a56ddee5d050dd961d553f4f93704378ce517ad47a161c6f768b022000ef68375269494caa36c9f063ecd6181dfb77b8c4e0e09fdb0433d5a484974e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8841n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000002080000000000002287',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 2n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 9,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8839n,
                },
                spentBy: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
                    outIdx: 0,
                },
                sats: 3503n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 992n,
            },
            {
                prevOut: {
                    txid: '5bb9474c4d682171091ecba6203d3365dab6f3901936122d8035098a80596e2e',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221009b897d907bda2da570c5c273ab277b73c60d8fd39ba605829d0ec4b796fb7c20022011cc67871bf5df4693904fcdee80ac1adba332b14a4cdc9113b15f28e288adad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1191203n,
            },
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100be82f7c67c73ecf068905a44ca2147d89b8041e54a432386b25137f7bea0d0aa0220416607e30a8d8d8c08237032eeb7728f938650a70215f6615939cd2455569539412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8842n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000001080000000000002289',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 6,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8841n,
                },
                spentBy: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
                    outIdx: 0,
                },
                sats: 1190050n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 39162n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'b1e65a60daf031915bf3aebcf500e14a2d86f4e77c5fa043364f8a9e5698979c',
                    outIdx: 0,
                },
                sats: 2500n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
                    outIdx: 0,
                },
                sats: 36207n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 42017n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '3b994d17cb7e7b0adcb4b680ec1197c7cafa659bb565db61ada359352a40bcdc',
                    outIdx: 2,
                },
                sats: 2400n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 0,
                },
                sats: 39162n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 44772n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '312553668f596bfd61287aec1b7f0f035afb5ddadf40b6f9d1ffcec5b7d4b684',
                    outIdx: 0,
                },
                sats: 2300n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 0,
                },
                sats: 42017n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1825562n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'dacd4bacb46caa3af4a57ac0449b2cb82c8a32c64645cd6a64041287d1ced556',
                    outIdx: 0,
                },
                sats: 2200n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '60c6ad832e8f44ea59bb15166959b45828d8aec5554a2f70491dddf82dcda837',
                    outIdx: 0,
                },
                sats: 1822907n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1190050n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'd6e5e1511b25e984f2d0850ab47ff1e9fdf8cab546fbd5f5ae36299423a9dde3',
                    outIdx: 0,
                },
                sats: 2100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '3b40671157eaa30e277819d6bc93acf76377616edbe818d475acbd2cc4b07479',
                    outIdx: 0,
                },
                sats: 1187495n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 46590n,
            },
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200e225ab4c7d20aef968d95fbf6f881f313c9b35aef891edd4192c5320f147f2502205794732b6242c3a445ee1340ca03950e2044321b9c99bf7d5805ea36cac756dc412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8832n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000000508000000000000227b',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 5n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 8,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8827n,
                },
                spentBy: {
                    txid: '328df7f6a976c67875035acb051747c443cdac55173aef11ab1c17184162e2e9',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                    outIdx: 0,
                },
                sats: 44772n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1827380n,
            },
            {
                prevOut: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200fdb134c8a13fbd1b95ef118c247a8a911e9d52ecaafc86ebb80cc179d69c1e002200bd4dc809c998a511e09f939a3270f7a2f9babae9d75919d2fef83ed66cf7dde412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8836n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000004080000000000002280',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 4n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 7,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8832n,
                },
                spentBy: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                    outIdx: 0,
                },
                sats: 1825562n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 45507n,
            },
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c96c70b94f5386efff2a8873d35d7b4c29fafe11555cf2a3daea8f905fb0f73502203751a29b351cca9c337345388237b98312873f44976f08667ae6540423a8d012412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8839n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000003080000000000002284',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 3n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 10,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8836n,
                },
                spentBy: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '7d1929454c7e83707006e9f70000b47fc68805c3e42de6545498f39c6f96d34e',
                    outIdx: 0,
                },
                sats: 43689n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 848n,
            },
            {
                prevOut: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f8df9b24dc337b5c7b0b41f454fb535a181aa95814d01e3e2246908fda3a5d800220417d4bd3c10d59f9655ddae4229813222abd9a5b148db1a456fde4719ea8dc56412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 4800n,
            },
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dcc45ddcb243a56ddee5d050dd961d553f4f93704378ce517ad47a161c6f768b022000ef68375269494caa36c9f063ecd6181dfb77b8c4e0e09fdb0433d5a484974e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8841n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000002080000000000002287',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 2n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 9,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8839n,
                },
                spentBy: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
                    outIdx: 0,
                },
                sats: 3503n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 992n,
            },
            {
                prevOut: {
                    txid: '5bb9474c4d682171091ecba6203d3365dab6f3901936122d8035098a80596e2e',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221009b897d907bda2da570c5c273ab277b73c60d8fd39ba605829d0ec4b796fb7c20022011cc67871bf5df4693904fcdee80ac1adba332b14a4cdc9113b15f28e288adad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 1191203n,
            },
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100be82f7c67c73ecf068905a44ca2147d89b8041e54a432386b25137f7bea0d0aa0220416607e30a8d8d8c08237032eeb7728f938650a70215f6615939cd2455569539412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8842n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000001080000000000002289',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1n,
                },
                spentBy: {
                    txid: 'dcb6f31598fc406a2c1c1aeee86e9e1ae4c98f7ad82c7ca1341a68e92c31816c',
                    outIdx: 6,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8841n,
                },
                spentBy: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
                    outIdx: 0,
                },
                sats: 1190050n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 0,
                sats: 0n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
                spentBy: {
                    txid: '6a26b853ba356cdc4a927c43afe33f03d30ef2367bd1f2c190a8c2e15f77fb6d',
                    outIdx: 1,
                },
                sats: 362505204n,
            },
            {
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                spentBy: {
                    txid: 'c5621e2312eaabcfa53af46b62384f1751c509b9ff50d1bf218f92723be01bc7',
                    outIdx: 2,
                },
                sats: 200002871n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '98e47dda8c20facafff11fec7c6453f9d8afdd24281eb6129b76bfef90dd6bab',
                    outIdx: 0,
                },
                sats: 62500897n,
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
        satoshisSent: 62500897,
        stackArray: [],
        xecTxType: 'Staking Reward',
        recipients: [
            'ecash:qr689ree3wukyetgqv6xld9vghthvpq69cg04xjp57',
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
        ],
        appActions: [],
        parsedTokenEntries: [],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 517521n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '23b4ac14065f0b8bb594e35a366cb707b52c4630398439d79c4cd179d005a298',
                    outIdx: 2,
                },
                sats: 4200n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '0f4e0e3ad405a5b40a3f0cef78d55093729aa6504e420dc5ceaf1445beecbded',
                    outIdx: 0,
                },
                sats: 512866n,
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
        isFinal: true,
    },
    parsed: {
        satoshisSent: 4200,
        stackArray: [],
        xecTxType: 'Received',
        recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        appActions: [],
        parsedTokenEntries: [],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 4400000n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '692a900ae6607d2b798df2cc1e8856aa812b158880c99295041d8a8b70c88d01',
                    outIdx: 1,
                },
                sats: 22200n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '69b060294e7b49fdf45f0a6eb500a03a881a2f54c86238b54718880470629cee',
                    outIdx: 0,
                },
                sats: 4377345n,
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
        satoshisSent: 22200,
        stackArray: [],
        xecTxType: 'Sent',
        recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
        appActions: [],
        parsedTokenEntries: [],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                sats: 20105n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a042e7865630004627567321500dc1147663948f0dcfb00cc407eda41b121713ad3',
                sats: 0n,
            },
            {
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                spentBy: {
                    txid: 'fabf82bda2c0d460bade2bcd0d9845ecb12508f31074ddcc4db4928fda44f3ec',
                    outIdx: 154,
                },
                sats: 555n,
            },
            {
                outputScript:
                    '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                spentBy: {
                    txid: '8684205e5bc1ae154886f1701d2a492b67ad0ffc5e372087fcc981d69a67d407',
                    outIdx: 0,
                },
                sats: 19095n,
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
        satoshisSent: 555,
        stackArray: [
            '2e786563',
            '00',
            '62756732',
            '00dc1147663948f0dcfb00cc407eda41b121713ad3',
        ],
        xecTxType: 'Sent',
        recipients: ['ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07'],
        appActions: [
            {
                app: 'alias',
                lokadId: '2e786563',
                isValid: true,
                action: {
                    address: 'ecash:qqxuz9rkvw2g7rw0kqxvgpld5sd3y9cn45tv669kqz',
                    alias: 'bug2',
                },
            },
        ],
        parsedTokenEntries: [],
    },
};

export const invalidAliasRegistration = {
    tx: {
        ...aliasRegistration.tx,
        outputs: [
            {
                ...aliasRegistration.tx.outputs[0],
                outputScript:
                    '6a042e786563010104627567321500dc1147663948f0dcfb00cc407eda41b121713ad3',
            },
            ...aliasRegistration.tx.outputs.slice(1),
        ],
    },
    parsed: {
        appActions: [{ app: 'alias', isValid: false, lokadId: '2e786563' }],
        parsedTokenEntries: [],
        recipients: ['ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07'],
        satoshisSent: 555,
        stackArray: [
            '2e786563',
            '01',
            '62756732',
            '00dc1147663948f0dcfb00cc407eda41b121713ad3',
        ],
        xecTxType: 'Sent',
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3891539n,
            },
            {
                prevOut: {
                    txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c45951e15402b907c419f8a80bd76d374521faf885327ba3e55021345c2eb41902204cdb84e0190a5f671dd049b6b656f6b9e8b57254ec0123308345d5a634802acd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 240n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000c0800000000000000e4',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 12n,
                },
                spentBy: {
                    txid: '96ddf598c00edd493a020fea6ac382b708753cc8b7690f673685af64916089dd',
                    outIdx: 7,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 228n,
                },
                spentBy: {
                    txid: 'cd4b0008e90b2a872dc92e19cdd87f52466b801f037641193196e75ff10f6990',
                    outIdx: 2,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '648b9f3a7e9c52f7654b6bba0e00c73bcf58aeed2a9381c4ab45ee32d214284b',
                    outIdx: 0,
                },
                sats: 3889721n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
        satoshisSent: 546,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            '000000000000000c',
            '00000000000000e4',
        ],
        xecTxType: 'Received',
        recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'SEND',
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                tokenSatoshis: '12',
            },
        ],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 450747149n,
            },
            {
                prevOut: {
                    txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                    outIdx: 1,
                },
                inputScript:
                    '47304402203ba0eff663f253805a4ae75fecf5886d7dbaf6369c9e6f0bbf5c114184223fa202207992c5f1a8cb69b552b1af54a75bbab341bfcf90591e535282bd9409981d8464412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 69n,
                },
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3080000000000000011080000000000000034',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 17n,
                },
                spentBy: {
                    txid: 'fa2e8951ee2ba44bab33e38c5b903bf77657363cffe268e8ae9f4728e14b04d8',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 52n,
                },
                spentBy: {
                    txid: 'fb12358a18b6d6e563b7790f8e08ca9c9260df747c5e9113901fed04094be03d',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '23b4ac14065f0b8bb594e35a366cb707b52c4630398439d79c4cd179d005a298',
                    outIdx: 3,
                },
                sats: 450745331n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
        satoshisSent: 546,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            '0000000000000011',
            '0000000000000034',
        ],
        xecTxType: 'Sent',
        recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'SEND',
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                tokenSatoshis: '17',
            },
        ],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 1300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010747454e45534953035544540a557064617465546573741468747470733a2f2f636173687461622e636f6d2f4c0001074c000800000001cf977871',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 7777777777n,
                },
                sats: 546n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
        satoshisSent: 546,
        stackArray: [
            '534c5000',
            '01',
            '47454e45534953',
            '554454',
            '55706461746554657374',
            '68747470733a2f2f636173687461622e636f6d2f',
            '',
            '07',
            '',
            '00000001cf977871',
        ],
        xecTxType: 'Sent',
        recipients: [],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'GENESIS',
                tokenId:
                    'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                tokenSatoshis: '7777777777',
            },
        ],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 3503n,
            },
            {
                prevOut: {
                    txid: '82d8dc652779f8d6c8453d2ba5aefec91f5247489246e5672cf3c5986fa3d235',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100b7bec6d09e71bc4c124886e5953f6e7a7845c920f66feac2e9e5d16fc58a649a0220689d617c11ef0bd63dbb7ea0fa5c0d3419d6500535bda8f7a7fc3e27f27c3de6412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 9876543156n,
                },
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e4420acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f550800000000075bcd1508000000024554499f',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 123456789n,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 9753086367n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '04b16fa516fbdd64d51b8aa1a752855beb4250d99199322d89d9c4c6172a1b9f',
                    outIdx: 4,
                },
                sats: 1685n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
        satoshisSent: 546,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            '00000000075bcd15',
            '000000024554499f',
        ],
        xecTxType: 'Received',
        recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'SEND',
                tokenId:
                    'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                tokenSatoshis: '123456789',
            },
        ],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                sats: 1595n,
            },
            {
                prevOut: {
                    txid: 'c257bdccd3804de5ce1359d986488902d73e11156e544ca9eaf15d9d3878a83c',
                    outIdx: 111,
                },
                inputScript:
                    '47304402205f670a5afb2b6cb10ae86818f50c0dd9a9bc639e979a3325ab8834c5631ac81b022078ce9092a5ded4afe261f1b311e5619f1f8673ace9de5dae3441f33834ecb33a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                sats: 22600n,
            },
            {
                prevOut: {
                    txid: '8db1137ec2cdaa0c5a93c575352eaf024ce304f189c91094cc6b711be876dff4',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100cca98ffbd5034f1f07c459a2f7b694d0bfc8cd9c0f33fe0b45d5914a10b034610220592d50dd5f1fea5c1d689909e61d1d1bfad21ea6a42a01ba7d4e9428baedca06412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                sats: 170214n,
            },
            {
                prevOut: {
                    txid: '5c7e9879f94258e7128f684c0be7786d9d2355c1f3b3ded5382e3a2745d9ec53',
                    outIdx: 111,
                },
                inputScript:
                    '483045022100fefd74866d212ff97b54fb4d6e588754b13d073b06200f255d891195fc57cb0502201948da90078778ab195c8adec213cc09972a1c89f8a35d10294894bcbf313941412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                sats: 22583n,
            },
            {
                prevOut: {
                    txid: '6b86db3a0adb9963c3fbf911ad3935b611ea6224834f1664e0bdfc026fd57fc9',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100e4dde7a7d227f0631d042a1953e55400b00386050eff672832e557a4438f0f0b022060fd64cb142723578a4fd25c703d7afa0db045d981c75f770cb66b3b87ccc72a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                sats: 16250n,
            },
            {
                prevOut: {
                    txid: '81f52f89efc61072dcab4735f1a99b6648c8cc10314452185e728b383b170e30',
                    outIdx: 23,
                },
                inputScript:
                    '483045022100f057b22cbc643d6aa839d64c96eede889782e4738104dde84c5980089c75c9e702200449b7ad1e88141def532e3cd2943dfa29a9ede8a6d0b3283531dee085b867b1412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                sats: 23567578n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a0464726f7020bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c04007461624565766320746f6b656e207365727669636520686f6c64657273206169722064726f70f09fa587f09f8c90f09fa587e29da4f09f918cf09f9bacf09f9bacf09f8d97f09fa4b4',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9140352e2c246fa38fe57f6504dcff628a2ab85c9a888ac',
                sats: 550n,
            },
            {
                outputScript:
                    '76a9147d2acc561f417bf3265d465fbd76b7976cd35add88ac',
                sats: 550n,
            },
            {
                outputScript:
                    '76a91478a291a19347161a532f31cae95d492cc57965e888ac',
                spentBy: {
                    txid: 'dc5bbe05a2a0e22d4c7bd241498213208610cf56868d72268913491c3c099507',
                    outIdx: 47,
                },
                sats: 550n,
            },
            {
                outputScript:
                    '76a91478cc64d09c2c558e2c7f1baf463f4e2a6246559888ac',
                sats: 584n,
            },
            {
                outputScript:
                    '76a91471536340a5ad319f24ae433d7caa4475dd69faec88ac',
                sats: 10027n,
            },
            {
                outputScript:
                    '76a914649be1781f962c54f47273d58e31439fb452b92988ac',
                sats: 10427n,
            },
            {
                outputScript:
                    '76a914be3ce499e31ebe80c7aabf673acd854c8969ddc488ac',
                sats: 560n,
            },
            {
                outputScript:
                    '76a914e88f39383c4d264410f30d2b28cdae775c67ea8e88ac',
                spentBy: {
                    txid: '739fda27cd573dcfe22086463263c96232990473fc017ce83da7c996058e63fb',
                    outIdx: 0,
                },
                sats: 551n,
            },
            {
                outputScript:
                    '76a9145fbce9959ce7b712393138aef20b013d5a2802e688ac',
                sats: 557n,
            },
            {
                outputScript:
                    '76a91450f35e3861d60945efcd2b05f562eff14d28db1088ac',
                spentBy: {
                    txid: '558a3526d3bbc29ba8a2eb5466a7b4d6d5d544e7e83c1c15346fa03bdec1c6c1',
                    outIdx: 0,
                },
                sats: 550n,
            },
            {
                outputScript:
                    '76a914866ed8973e444d1f6533eb1858ca284ad589bc1988ac',
                sats: 10027n,
            },
            {
                outputScript:
                    '76a9140848ee10a336bba27c7ee90dc4a1c2407178a5b788ac',
                sats: 555n,
            },
            {
                outputScript:
                    '76a9149750cdddb976b8466668a73b58c0a1afbd6f4db888ac',
                sats: 550n,
            },
            {
                outputScript:
                    '76a9148ee151bf0f1637cdd2e1b41ed2cd32b0df0a932588ac',
                sats: 560n,
            },
            {
                outputScript:
                    '76a914be792ef52fb6bc5adcabeb8eb604fbbb3dc4693488ac',
                sats: 590n,
            },
            {
                outputScript:
                    '76a9142ad96e467f9354f86e0c11acfde351194a183dc888ac',
                spentBy: {
                    txid: 'a900d93eea490d121bb9cb11457ee0f86edb53d5b7a26984567b8cf1b282adbc',
                    outIdx: 10,
                },
                sats: 551n,
            },
            {
                outputScript:
                    '76a914afd2470f264252f1359d7b8093fff4fdd120c5f988ac',
                sats: 550n,
            },
            {
                outputScript:
                    '76a9148a8e920239fb5cc647855c1d634b0bbe4c4b670188ac',
                spentBy: {
                    txid: '9bd869aff043b96ea03274abf6183bcb521c1949177ed948792636c68050283c',
                    outIdx: 71,
                },
                sats: 584n,
            },
            {
                outputScript:
                    '76a91412f84f54fad4695321f61c313d2e32a0a8f8086488ac',
                sats: 569n,
            },
            {
                outputScript:
                    '76a914842b152a0bbd4647afaeceec8a6afaa90668e7c788ac',
                sats: 584n,
            },
            {
                outputScript:
                    '76a914fe971eb2960defce93503c5641d54eaad2ab6a0588ac',
                sats: 584n,
            },
            {
                outputScript:
                    '76a914685e825961b67456f440caaaaab0f94cb3354b7288ac',
                sats: 584n,
            },
            {
                outputScript:
                    '76a91476b4447a3617e918d03261353e179a583f85d2c688ac',
                sats: 584n,
            },
            {
                outputScript: 'a91418bb4f7d8881c1d1457c33a6af8e5937f7f776a887',
                sats: 584n,
            },
            {
                outputScript:
                    '76a914b366ef7c1ffd4ef452d72556634720cc8741e1dc88ac',
                spentBy: {
                    txid: 'bf41ebe360b6990ca60ab9b5fa24d9acde29b07b924d885ccd8d71e9aa1e5dc9',
                    outIdx: 0,
                },
                sats: 584n,
            },
            {
                outputScript:
                    '76a914f5e82dc01170d99a16bf9610da873df47f82aa7a88ac',
                sats: 553n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '04dfbdc61976ed57e65f2d02e2d55994ae6e963c9baea4f2c4b13c278b6fe981',
                    outIdx: 2,
                },
                sats: 569n,
            },
            {
                outputScript:
                    '76a9142ed681dc5421dd4a052f49bda55a9c345fb025e088ac',
                sats: 553n,
            },
            {
                outputScript:
                    '76a914b87d445b2dbba65c5a5bb79959b44c24593518f888ac',
                sats: 584n,
            },
            {
                outputScript: 'a9147d91dc783fb1c5b7f24befd92eedc8dabfa8ab7e87',
                sats: 553n,
            },
            {
                outputScript: 'a914f722fc8e23c5c23663aa3273f445b784b223aab587',
                sats: 584n,
            },
            {
                outputScript:
                    '76a914940840311cbe6013e59aff729ffc1d902fd74d1988ac',
                sats: 584n,
            },
            {
                outputScript:
                    '76a914d394d084607bce97fa4e661b6f2c7d2f237c89ee88ac',
                sats: 584n,
            },
            {
                outputScript:
                    '76a91470e1b34c51cd5319c5ca54da978a6422605e6b3e88ac',
                sats: 558n,
            },
            {
                outputScript:
                    '76a91440eeb036d9d6bc71cd65b91eb5bbfa5d808805ca88ac',
                spentBy: {
                    txid: '52fe7794f3aba1b6a7e50e8f65aa46c84b13d4c389e1beaba97fc49d096fe678',
                    outIdx: 4,
                },
                sats: 556n,
            },
            {
                outputScript:
                    '76a9144d55f769ce14fd44e2b63500d95016838a5d130d88ac',
                sats: 584n,
            },
            {
                outputScript:
                    '76a914a17ee8562ede98dfe9cd00f7f84d74c4c9c58ee788ac',
                spentBy: {
                    txid: '12de87fc94b76324b2ef4f8f8cbf22318146097b330904097131b56d386eee22',
                    outIdx: 11,
                },
                sats: 584n,
            },
            {
                outputScript:
                    '76a914a13fc3642d1e7293eb4b9f17ec1b6f6d7ea4aaeb88ac',
                spentBy: {
                    txid: '68ff340f746736b20d0015d3a63140bbd53dc982ce592e2bd503a7c3c32f88b9',
                    outIdx: 10,
                },
                sats: 584n,
            },
            {
                outputScript:
                    '76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac',
                sats: 576n,
            },
            {
                outputScript:
                    '76a91486a911e65753b379774448230e7e8f7aeab8fa5e88ac',
                sats: 10427n,
            },
            {
                outputScript:
                    '76a914e9364c577078f16ee2b27f2c570a4e450dd52e7a88ac',
                sats: 552n,
            },
            {
                outputScript:
                    '76a914ed917afa96833c1fea678e23374c557ed83ff6ff88ac',
                sats: 1428n,
            },
            {
                outputScript:
                    '76a91482cf48aefcd80072ef21e4a61dee8c2d70d0bcb388ac',
                sats: 1427n,
            },
            {
                outputScript:
                    '76a91444e8388bdd64c1f67905279066f044638d0e166988ac',
                sats: 9135n,
            },
            {
                outputScript:
                    '76a914d62e68453b75938616b75309c3381d14d61cb9a488ac',
                sats: 1427n,
            },
            {
                outputScript:
                    '76a91425b1d2b4610b6deed8e3d2ac76f4f112883126e488ac',
                sats: 1427n,
            },
            {
                outputScript:
                    '76a91456423795dc2fa85fa3931cdf9e58f4f8661c2b2488ac',
                sats: 921n,
            },
            {
                outputScript:
                    '76a914e03d94e59bb300b965ac234a274b1cf41c3cadd788ac',
                sats: 1843n,
            },
            {
                outputScript:
                    '76a9141e0d6a8ef2c8a0f6ceace8656059ea9dbeb11bda88ac',
                sats: 1584n,
            },
            {
                outputScript:
                    '76a914f6cd6ef1bd7add314fd9b115c3ad0dce7844930c88ac',
                sats: 1843n,
            },
            {
                outputScript:
                    '76a91488fb294f87b0f05bf6eddc1d6bfde2ba3a87bcdd88ac',
                sats: 560n,
            },
            {
                outputScript:
                    '76a914a154f00227476ec9741a416e96b69677fddf4b1d88ac',
                sats: 560n,
            },
            {
                outputScript:
                    '76a914362a3773f5685c89e4b800e4c4f9925db2ec1b5c88ac',
                sats: 1427n,
            },
            {
                outputScript:
                    '76a9146770958588049a3f39828e1ddc57f3dd77227a1188ac',
                sats: 584n,
            },
            {
                outputScript:
                    '76a914b0313745d5f7c850c9682c2711b6a14f2db9276b88ac',
                sats: 1708n,
            },
            {
                outputScript:
                    '76a914fe729aa40779f822a8c4988f49a115c8aabc0cc788ac',
                sats: 679n,
            },
            {
                outputScript:
                    '76a914ecef001f3c137c880f828d843f754a082eb5396b88ac',
                spentBy: {
                    txid: 'e3ac978ea422497972c1583687806c17c686c2be1986605b36839277d7b36cb8',
                    outIdx: 1,
                },
                sats: 1511n,
            },
            {
                outputScript:
                    '76a91463e79addfc3ad33d04ce064ade02d3c8caca8afd88ac',
                spentBy: {
                    txid: '2ba8a04167ea13f80aba2b232cdf899fd218c978b54264e5a829f96a3ce1e912',
                    outIdx: 0,
                },
                sats: 560n,
            },
            {
                outputScript:
                    '76a91489a6da1ed86c8967f03691ad9af8d93c6259137388ac',
                sats: 552n,
            },
            {
                outputScript:
                    '76a9149fa178360cab170f9423223a5b166171f54d5bc188ac',
                sats: 919n,
            },
            {
                outputScript:
                    '76a914bc37eb24817a8442b23ae9a06cc405c8fdf1e7c488ac',
                sats: 15000n,
            },
            {
                outputScript:
                    '76a914e78d304632489ba240b29986fe6afd32c77aa16388ac',
                sats: 560n,
            },
            {
                outputScript:
                    '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
                spentBy: {
                    txid: '57fcd13171861f19e68068aa6deb759126bef68a6dc0c4969870e54546931999',
                    outIdx: 1,
                },
                sats: 570n,
            },
            {
                outputScript:
                    '76a914b8820ca6b9ceb0f546e142ddd857a4974483719a88ac',
                spentBy: {
                    txid: '0acb7723b751727996b03323841c37dd03ceb2aba83e75b39af98d0cc6eb9086',
                    outIdx: 1,
                },
                sats: 921329n,
            },
            {
                outputScript:
                    '76a914ca989ff4d3df17fe4dc6eb330b469bd6d5d4814e88ac',
                sats: 5100n,
            },
            {
                outputScript:
                    '76a914ad29cdce2237f71e95fee551f04425f70b7e4c9d88ac',
                spentBy: {
                    txid: '636e0a8685063d5fdb3b9fe9c9795c5ceb25fdbb237aedab4bf346dd8520a2b9',
                    outIdx: 0,
                },
                sats: 5200n,
            },
            {
                outputScript:
                    '76a9140f57872e06e15593c8a288fcb761b13ca571d78888ac',
                spentBy: {
                    txid: 'dd02287fdadaf1b7377ec0121c00bc44563683c26eed49d31ade52a1abb63bc0',
                    outIdx: 0,
                },
                sats: 584n,
            },
            {
                outputScript:
                    '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                spentBy: {
                    txid: '978538d26607b5b6371038006c9ad8e2862d935a8375f3a8a68108e8270f7335',
                    outIdx: 2,
                },
                sats: 10266n,
            },
            {
                outputScript:
                    '76a9141e37634e6693e228801c194c45701d49a1d12e2c88ac',
                sats: 580n,
            },
            {
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                spentBy: {
                    txid: '7242d84b3db853262c53f4b068c57e5a52b67a8b6fea313e0a6f7f58df16e413',
                    outIdx: 0,
                },
                sats: 22743016n,
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
        satoshisSent: 569,
        stackArray: [
            '64726f70',
            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            '00746162',
            '65766320746f6b656e207365727669636520686f6c64657273206169722064726f70f09fa587f09f8c90f09fa587e29da4f09f918cf09f9bacf09f9bacf09f8d97f09fa4b4',
        ],
        xecTxType: 'Received',
        recipients: [
            'ecash:qqp49ckzgmar3ljh7egymnlk9z32hpwf4qf8m8l9gc',
            'ecash:qp7j4nzkraqhhuext4r9l0tkk7tke566m5phzhkktx',
            'ecash:qpu29ydpjdr3vxjn9ucu462afykv27t9aq4t0vgc3v',
            'ecash:qpuvcexsnsk9tr3v0ud6733lfc4xy3j4nqq3chf5l9',
            'ecash:qpc4xc6q5kknr8ey4epn6l92g36a6606as2zhlv5c3',
            'ecash:qpjfhctcr7tzc485wfeatr33gw0mg54e9y4kuan3jl',
            'ecash:qzlreeyeuv0taqx842lkwwkds4xgj6wacssxeqqpz4',
            'ecash:qr5g7wfc83xjv3qs7vxjk2xd4em4cel23cmmek9thu',
            'ecash:qp0me6v4nnnmwy3exyu2austqy7452qzuc2j22e0nt',
            'ecash:qpg0xh3cv8tqj300e54statzalc562xmzqwuzjntyl',
            'ecash:qzrxakyh8ezy68m9x043skx29p9dtzdury4xkq4azv',
            'ecash:qqyy3mss5vmthgnu0m5sm39pcfq8z799kun7jjcf72',
            'ecash:qzt4pnwah9mts3nxdznnkkxq5xhm6m6dhq77227t0f',
            'ecash:qz8wz5dlputr0nwjux6pa5kdx2cd7z5ny5x4tw2zpk',
            'ecash:qzl8jth497mtckku404cadsylwanm3rfxslzu6ufgg',
            'ecash:qq4djmjx07f4f7rwpsg6el0r2yv55xpaequ4h6axa6',
            'ecash:qzhay3c0yep99uf4n4acpyll7n7azgx9lykz945tm5',
            'ecash:qz9gaysz88a4e3j8s4wp6c6tpwlycjm8qy0t5wv0r6',
            'ecash:qqf0sn65lt2xj5ep7cwrz0fwx2s237qgvsntr84uqt',
            'ecash:qzzzk9f2pw75v3a04m8wezn2l25sv688cuy23pmxch',
            'ecash:qrlfw84jjcx7ln5n2q79vsw4f64d92m2q5z7v4d2da',
            'ecash:qp59aqjevxm8g4h5gr92424sl9xtxd2twgl620v7ph',
            'ecash:qpmtg3r6xct7jxxsxfsn20shnfvrlpwjccn0x53qp0',
            'ecash:pqvtknma3zqur5290se6dtuwtyml0amk4q7apqmnwx',
            'ecash:qzekdmmurl75aazj6uj4vc68yrxgws0pmsgztm4atw',
            'ecash:qr67stwqz9cdnxskh7tppk588h68lq420gvwpush28',
            'ecash:qqhddqwu2ssa6js99aymmf26ns69lvp9uqhgstr4vr',
            'ecash:qzu863zm9ka6vhz6twmejkd5fsj9jdgclqcwvvhlkq',
            'ecash:pp7erhrc87cutdljf0hajthderdtl29t0cckdef6dm',
            'ecash:prmj9lywy0zuydnr4ge88az9k7ztyga2k5zqm3zchg',
            'ecash:qz2qssp3rjlxqyl9ntlh98lurkgzl46dry8x8j7ftm',
            'ecash:qrfef5yyvpaua9l6fenpkmev05hjxlyfac99kea3re',
            'ecash:qpcwrv6v28x4xxw9ef2d49u2vs3xqhnt8c7qtax842',
            'ecash:qpqwavpkm8ttcuwdvku3addmlfwcpzq9egtnc3rwvz',
            'ecash:qpx4tamfec20638zkc6spk2sz6pc5hgnp5yhp72z28',
            'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv',
            'ecash:qzsnlsmy95089yltfw030mqmdakhaf92avqgmfwnsn',
            'ecash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rquas9fmzn',
            'ecash:qzr2jy0x2afmx7thg3yzxrn73aaw4w86tcv87dlc9m',
            'ecash:qr5nvnzhwpu0zmhzkfljc4c2fezsm4fw0gxf008tgt',
            'ecash:qrkez7h6j6pnc8l2v78zxd6v24lds0lkluen22kx9g',
            'ecash:qzpv7j9wlnvqquh0y8j2v80w3skhp59ukvfejazgkn',
            'ecash:qpzwswytm4jvraneq5neqehsg33c6rskdy0hunmn7m',
            'ecash:qrtzu6z98d6e8pskkafsnsecr52dv89e5sqggy7w5p',
            'ecash:qqjmr545vy9kmmkcu0f2cah57yfgsvfxus3qv9h336',
            'ecash:qptyydu4msh6sharjvwdl8jc7nuxv8ptysp2d46z2p',
            'ecash:qrsrm989nwespwt94s355f6trn6pc09d6uvu4zsdp8',
            'ecash:qq0q665w7ty2pakw4n5x2czea2wmavgmmgz0n7r63a',
            'ecash:qrmv6mh3h4ad6v20mxc3tsadph88s3ynpshjfcac55',
            'ecash:qzy0k220s7c0qklkahwp66lau2ar4paum549mlx7vn',
            'ecash:qzs4fuqzyarkajt5rfqka94kjemlmh6tr5sqsrh0tz',
            'ecash:qqmz5dmn7459ez0yhqqwf38ejfwm9mqmtswnrhjrcl',
            'ecash:qpnhp9v93qzf50ees28pmhzh70whwgn6zyzefhg5vl',
            'ecash:qzcrzd696hmus5xfdqkzwydk598jmwf8dvcneehcza',
            'ecash:qrl89x4yqaulsg4gcjvg7jdpzhy240qvcuwluwhshd',
            'ecash:qrkw7qql8sfhezq0s2xcg0m4fgyzadfedv6jdz8zgs',
            'ecash:qp370xkalsadx0gyecry4hsz60yv4j52l5dcy6vscq',
            'ecash:qzy6dks7mpkgjelsx6g6mxhcmy7xykgnwvm2ka7y4n',
            'ecash:qz06z7pkpj43wru5yv3r5kckv9cl2n2mcyvh00d7l3',
            'ecash:qz7r06eys9aggs4j8t56qmxyqhy0mu08cspyq02pq4',
            'ecash:qrnc6vzxxfyfhgjqk2vcdln2l5evw74pvv9ruy8fga',
            'ecash:qzvnu6lw7a85a5xrleg6lz27gakwxlpk9v55jr2p46',
            'ecash:qzugyr9xh88tpa2xu9pdmkzh5jt5fqm3ngjykg3vgy',
            'ecash:qr9f38l560030ljdcm4nxz6xn0tdt4ypfcxrgleaav',
            'ecash:qzkjnnwwygmlw854lmj4ruzyyhmskljvn52clpf7gl',
            'ecash:qq840pewqms4ty7g52y0edmpky722uwh3qvx936rje',
            'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
            'ecash:qq0rwc6wv6f7y2yqrsv5c3tsr4y6r5fw9squdmajds',
            'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
        ],
        appActions: [
            {
                action: {
                    msg: 'evc token service holders air drop🥇🌐🥇❤👌🛬🛬🍗🤴',
                    tokenId:
                        'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
                },
                isValid: true,
                app: '🪂Airdrop',
                lokadId: '64726f70',
            },
        ],
        parsedTokenEntries: [],
        replyAddress: 'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
    },
};

export const onSpecAirdropTxNoMsg = {
    tx: {
        txid: '298c3d1a5bd00bd86d92d48ec5695c25a0a86093964d9f53eb19b46dc472b9f5',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1238b76f12c0a4e2c54f5f80951464396f40685256f0ffc3e30a450995e5da43',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a6886a347a977b31fb3cf4a0b0ef85e58bd60d7af9db27d4d260f71c9b5f22c30220436ceaca789bc8ab631633434eb0b64b93ae6ebeac94d3ddbd12d3916a57fc8441210343b0a63fb80795016f064481f0380836adf7cde6ad32a662ddf551876b303a93',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                sats: 16194930n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a0464726f7020fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa4cad415454454e54494f4e204752554d50592050454f504c452120f09f98be20596f752063616e206e6f77206465706f736974202447525020746f207468652065546f6b656e20626f7420617420742e6d652f6543617368506c617920746f20746f7020757020796f757220436173696e6f20437265646974732120316d2024475250203d2031204372656469742e20506c617920436173696e6f2067616d657320616e642077696e205845432120',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9145561e7d054bb4d81d862fdc674525c2dc337ac6d88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91417b83cbad4814a5c6400e418ec69f29963a2805888ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9142e153c4fc63dcabf0e8949b20ddab2c3df7704ed88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9149966d31280b53f1c2b85f975918eb3023b281f8688ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914bfd3a8b912a7988809090de56651d47451528ba188ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9147ff46e0807b0d3a5797dd65beae6cfcc2d01e56e88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914585ecb807269977bc21a1a2cd5d7c4ff1150e94988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9140db07d6b795f5fe5f47e53aab25aac078d229f8188ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9143f23e265a57078ac8e675f78bd552a95943ca7e888ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914a33b3460d43b9e27a165185b2863b1f64d418d8288ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914e006de0508dcbf24ae0455ca3b5665ed0545553c88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9145f1ec6dd2d02c1fa32b184818be5611ae674df0388ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914445c0c740419357dd03c93a351c69eedf433be4688ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914eafcfdecd98cde993e3be01a9ad1158fd3eb773988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914023a7087ee9bfabc77548fc5f0a359ae9bacf7bc88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914eded3588169234400f7556a40baf808e1ec8ebf588ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9141a33684209d978e8bc143c6fcdb7f56e3243dcee88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914486cbf0bfba3b7d0aae10bec7f0d4226e6e10f9688ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91480c72defab2c99cf19341cc0e2992c659d42198788ac',
                spentBy: {
                    txid: '46eed31f3d61c5a0a7023c4626c061afc158de9d3855ab304abefd7bb4f7de0d',
                    outIdx: 109,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914a15db8a24f9b3740383927a1d787ba77b34b63a888ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91423a1340dbbe6dedf1cd31cdf11f85b3442cfd82888ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9141e464c8d283976ddc13fa6756736f8f3a0069f7888ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914f2d85c4f3fb78c1d9727dea73690c72815756e2b88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914d8723ad3becc44356267e8d0313692c493fe2bdf88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914161cae938ec121bd9970304766865991fe80a63088ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91490ec469ca54ce9616282dea980a39f0e4b9a6ab988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914b386b1f59b5f03b45471df214d47f7ab5d48003088ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914d2ea9ba1a091c2adf0116da4d2c3ddc3cf7124a988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91451379ab611287658c9e1c0f98f0929addd5a2f1d88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91432fc3341b83f902a360cbbf91a08ea99c293733d88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91459f93839ba24abd6996b75a39486691dd40660be88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91473ef17c5b9f551eae3f3b4fadf61f93cae5e6aea88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91469003998c2c32ac81951b88416a9a15df3a1992988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9145dd0411fa601ab82fcd68894c95934619a49920688ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914534c4407eeea7e4b8c3ed7dae5cb4a2539beed9988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91447f86f44721c8d0bac263602717fc10b0da49b9f88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91485149cd55457401ad4645c54b86caa0ce0d4f05f88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914f0af3a1411ed4989bf5c44641c3a86d473afe45188ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914973d953e15d62383b24ebe3d73d01e7b83bd989788ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9144de2fb39f09d14492f4d40e0fb670a42af505c6b88ac',
                spentBy: {
                    txid: '11a58a92afc39a6d7bd413a11864d0d34f21ab72b63028293d1004ff76e74950',
                    outIdx: 0,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914fd7f54f496cadb0b6d3cc206ee098bab29bd5bbf88ac',
                spentBy: {
                    txid: '51518eb20ca45eaa07925e6d502da8b5be5ad411272863be9a2280e46d6505f7',
                    outIdx: 11,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914b55d27e509500af85243622343ca9e3d54a0438a88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914547abbaaa1c5e92ecde551c1bfdb9a2e5454b83088ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9140f69a9314698156aee8bdb96a36f1e08f1ba168d88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91468506abb4ce69c0e596c80bebe456f3be7f904fd88ac',
                spentBy: {
                    txid: '39ef9f76d052d4b3fa5f4aa19b5597b1b55ab71e361c665eef371a501a1282be',
                    outIdx: 9,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91447ab6772a47d55b7649b83f105fd5cdc3eaa22a988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914b74cc1418fad22fe0eb0bef57082d9836a29340c88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914e33f7fa6b1c03d68a28758c1ef3a5fa7322cafbb88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914a30153ad73ba57b6f37c210435e407bb7a368a5d88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9141404dc7b54ab7768837729e2efe052105a4c405988ac',
                spentBy: {
                    txid: '6ab45eb0770ca387bcd76e3ffc0439958dc2bb7b87437234c722a3c615ca2071',
                    outIdx: 0,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91496cdae0c820426ae831216d629383dda7ee5adab88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91412c4c82aac6896d96ede38eb916b5819a46c803a88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9147bdf4e819215ccfe937a633ae28ae2e9d3aadc0688ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9146e2b68c87b86ed79b86a09c62c4762d7e431bcca88ac',
                spentBy: {
                    txid: 'c95c7f6f4baa7d91fd3aa24f9b73b4e04ef840ac970ae82e2d386f81eeec2cf0',
                    outIdx: 22,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914e7a5f062e50a35d639fc1773738839119e61475d88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914a34960963da7e02e1f0357325985475bda969def88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9149d8689dc0813da4f520225eebb8b80c8352ec4a588ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914bd4cdb9bc9dbe21e2b9bdd3395be350d8abbe16d88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9142d755595516b0f625c51d223bc84a5adfc77b20688ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914dd01dbc55b0fe9e33ceb700b4c4452010bdb5a1688ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9140839c285a8d5b52934c28d4a45a1835dd45f0a5388ac',
                spentBy: {
                    txid: 'cd68979654b1ecee37a33c321b6cb7f2966be6af02232855f46c2aef231463cb',
                    outIdx: 1,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9143dd8ebcdf0e4d65712a723f2235675316687716388ac',
                spentBy: {
                    txid: 'f8123bf1175047b9d5ebd5d7cacbb378aaa8f58a55ed400893f192f28606a0d3',
                    outIdx: 3,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914974a7bb26ac2f62bf60a675f5f0024a689c03d7d88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                spentBy: {
                    txid: '27f2d0454f78b90be92eea7d557486ebc07d7ea1004fa7dbc0e7f89e835a4c6e',
                    outIdx: 3,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914dceb306a73582e52c43025f7eed5827a6d9e92e088ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                spentBy: {
                    txid: 'c62c16c68df7d69d5d1524ac250e30473dacdbf13c131fb1978911674f045665',
                    outIdx: 17,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9140620a7df2e0637bc8d3dfa663c979c15a671dfe488ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914837604effd470faaba3e044e0a7c4e6a8a7ee8c688ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9142def2114338f0be9a26956378efce60e17b580b388ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91482b15f681a94fe9f6ac29ddee214d3dd88f55bfc88ac',
                spentBy: {
                    txid: '920853c238299614bc03270839f1b815c9763385485e04be18a861039c07b606',
                    outIdx: 14,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91478f43ee6b1e577329c0fc9cb47f7435954eae81f88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914c1a7d12dddc6a3072df09cf5e0a00ece198cc8c188ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914bccecb7e3e5d3fccbee3211494ad3214f91cc74f88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914fbc9461beec0d783052c20c994ffb44e46041d5188ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914a94b8176d28cb5b5c301f10bb45bdb3d6e0c277d88ac',
                spentBy: {
                    txid: 'b2c0183a724aa141568e9c116b684eb94e8be326c92cf588d83296916974017f',
                    outIdx: 1,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9142ec5281864fc989dab543b054631c9703809689e88ac',
                spentBy: {
                    txid: '962f5149fbca6c739886cb839901b0de5926119430ce268b7aa1be0c073ad84c',
                    outIdx: 6,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914581bd5bc835cc788bd90a4f6f0c9c21eb173572e88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91428cabb69be3e20707574d7a0ddc65a801b6ae59988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914b8b3c22d82784c27e0224fd8a8ff549a67e955a388ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914b8af3f36894ee7e6563c672714f9eb47cc83a9e188ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914fa49f98fb25e8b84ce210d06f052aed88c2c4f9888ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9146134463df4436bf8c662b64917610f63fa5d89ef88ac',
                spentBy: {
                    txid: 'd8a9729473589d3c30d26e672c2c49e1a58fc380765ddbcde8628ab93293af11',
                    outIdx: 3,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '3c844ed9f76207027a47dd2170a590a1f8d8a8ff9b797da4f050ad6394adf52a',
                    outIdx: 1,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914b3f80c88220f138201702a4d0c033b248059fcdc88ac',
                spentBy: {
                    txid: '7d5cf7814e3225587e522e03da0589b806de0498a779e8b0d1cb273c9f257b87',
                    outIdx: 0,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914ad7eb2c8b88fa2e3f5158b398a49bf277401984e88ac',
                spentBy: {
                    txid: '50974e99e87dec3b575497b9592a89d9ae0f2dc129f26d567582e4d0aaf27741',
                    outIdx: 0,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9146b475c3b68ff8411e5c43271edc4e4f26dfc802a88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a914ee8cbaa5642d1c5d1af1503edda6a55044e8106e88ac',
                spentBy: {
                    txid: 'ca0229e4287f534526e811545e43c01bc011d2451acebd18aacbb74fe8d055ea',
                    outIdx: 2,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9147e3f074aae3cc99a6f48b928008eb9458615b6a988ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9140816fa82ce5021871afb6fbdc9470714fbf7c7ed88ac',
                sats: 2105n,
            },
            {
                outputScript:
                    '76a91412e01685eea02225ae3d3d528b184ae0db52314388ac',
                spentBy: {
                    txid: 'fc4013c0a37cde3de2238f61c5212a7d115382aae5e0cb28b80c1d935e9233f5',
                    outIdx: 0,
                },
                sats: 2105n,
            },
            {
                outputScript:
                    '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                spentBy: {
                    txid: '96f072b8db666b8eb59c0f43373b65c50fd5ac5042ea1e7d822161b45c2219a1',
                    outIdx: 0,
                },
                sats: 15987628n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1711102052,
        size: 3645,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 836935,
            hash: '000000000000000008e74d35ca49974c15ca67e1209fa7e23bea15450dd64336',
            timestamp: 1711102691,
        },
    },
    sendingHash: '2a96944d06700882bbd984761d9c9e4215f2d78e',
    parsed: {
        appActions: [
            {
                action: {
                    msg: 'ATTENTION GRUMPY PEOPLE! 😾 You can now deposit $GRP to the eToken bot at t.me/eCashPlay to top up your Casino Credits! 1m $GRP = 1 Credit. Play Casino games and win XEC! ',
                    tokenId:
                        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                },
                isValid: true,
                app: '🪂Airdrop',
                lokadId: '64726f70',
            },
        ],
        parsedTokenEntries: [],
        recipients: [
            'ecash:qp2kre7s2ja5mqwcvt7uvazjtskuxdavd5e5vrcxel',
            'ecash:qqtms0966jq55hryqrjp3mrf72vk8g5qtqpwysa6na',
            'ecash:qqhp20z0cc7u40cw39ymyrw6ktpa7acya55l0hgyrd',
            'ecash:qzvkd5cjsz6n78ptshuhtyvwkvprk2qlsc4yrkjum8',
            'ecash:qzla829ez2ne3zqfpyx72ej36369z55t5y75969dkn',
            'ecash:qpllgmsgq7cd8fte0ht9h6hxelxz6q09dcpuhyzzr9',
            'ecash:qpv9ajuqwf5ew77zrgdze4whcnl3z58ffyulr5hxmz',
            'ecash:qqxmqltt0904le050ef64vj64src6g5lsy9t0vws7c',
            'ecash:qqlj8cn954c83tywva0h3024922eg098aq90dtfspf',
            'ecash:qz3nkdrq6saeufapv5v9k2rrk8my6svdsg9wj4s4hl',
            'ecash:qrsqdhs9prwt7f9wq32u5w6kvhks23248sz7x0vz03',
            'ecash:qp03a3ka95pvr73jkxzgrzl9vydwvaxlqv4nuyqll2',
            'ecash:qpz9crr5qsvn2lws8jf6x5wxnmklgva7gcx4qsn5sw',
            'ecash:qr40el0vmxxdaxf780sp4xk3zk8a86mh8ypwtuycl9',
            'ecash:qqpr5uy8a6dl40rh2j8utu9rtxhfht8hhstayxwwfm',
            'ecash:qrk76dvgz6frgsq0w4t2gza0sz8paj8t75yz9dg9aa',
            'ecash:qqdrx6zzp8vh369uzs7xlndh74hrys7uachl0rwq7d',
            'ecash:qpyxe0ctlw3m0592uy97clcdggnwdcg0jctx6mfrz4',
            'ecash:qzqvwt004vkfnncexswvpc5e93je6ssesuzzjzad2z',
            'ecash:qzs4mw9zf7dnwspc8yn6r4u8hfmmxjmr4qa2pvqwvr',
            'ecash:qq36zdqdh0ndahcu6vwd7y0ctv6y9n7c9qwg9xyccn',
            'ecash:qq0yvnyd9quhdhwp87n82eeklre6qp5l0qcy78a7x6',
            'ecash:qredshz087mcc8vhyl02wd5scu5p2atw9vxhhp6t7d',
            'ecash:qrv8ywknhmxygdtzvl5dqvfkjtzf8l3tmukugtcl6d',
            'ecash:qqtpet5n3mqjr0vewqcywe5xtxglaq9xxqukk4u9q0',
            'ecash:qzgwc35u54xwjctzst02nq9rnu8yhxn2hyu2mn9e97',
            'ecash:qzecdv04nd0s8dz5w80jzn2877446jqqxq8d2rppc4',
            'ecash:qrfw4xap5zgu9t0sz9k6f5krmhpu7ufy4ynpmajugh',
            'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
            'ecash:qpgn0x4kzy58vkxfu8q0nrcf9xka6k30r534m2j2ca',
            'ecash:qqe0cv6phqleq23kpjaljxsga2vu9ymn85q3uuvpdu',
            'ecash:qpvljwpehgj2h45edd6689yxdywagpnqhcd5fngx3n',
            'ecash:qpe77979h864r6hr7w604hmply72uhn2agr5z20769',
            'ecash:qp5sqwvcctpj4jqe2xugg94f59wl8gve9yvt7h4vj0',
            'ecash:qpwaqsgl5cq6hqhu66yffj2ex3se5jvjqcmn6tp9gn',
            'ecash:qpf5c3q8am48ujuv8mta4ewtfgjnn0hdnyx7nqk7y8',
            'ecash:qprlsm6ywgwg6zavycmqyutlcy9smfymnupv08w52e',
            'ecash:qzz3f8x423t5qxk5v3w9fwrv4gxwp48stu7zk0lhxv',
            'ecash:qrc27ws5z8k5nzdlt3zxg8p6sm288tly2y3m6nwxww',
            'ecash:qztnm9f7zhtz8qajf6lr6u7sreac80vcju4tk6j75z',
            'ecash:qrdd7dxda8rhflwkxsxd9yt2nww96470gv48s4f9j0',
            'ecash:qpx797ee7zw3gjf0f4qwp7m8pfp275zudvk3ym56ad',
            'ecash:qr7h7485jm9dkzmd8npqdmsf3w4jn02mhu7n4g6whr',
            'ecash:qz646fl9p9gq47zjgd3zxs72nc74fgzr3gw9u8p7tc',
            'ecash:qp284wa258z7jtkdu4gur07mngh9g49cxqxs2pmdgc',
            'ecash:qq8kn2f3g6vp26hw30dedgm0rcy0rwsk35ln6cazck',
            'ecash:qp59q64mfnnfcrjedjqta0j9dua707gyl5q5p2a5py',
            'ecash:qpr6kemj5374tdmynwplzp0atnwra23z4y7mt4d46q',
            'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
            'ecash:qzm5es2p37kj9lswkzl02uyzmxpk52f5psl90kzl6t',
            'ecash:qr3n7laxk8qr669zsavvrme6t7nnyt90hvy5esczyf',
            'ecash:qz3sz5adwwa90dhn0sssgd0yq7ah5d52t56s78jsfa',
            'ecash:qq2qfhrm2j4hw6yrwu579mlq2gg95nzqty3fpaxcpk',
            'ecash:qztvmtsvsgzzdt5rzgtdv2fc8hd8aedd4v8rxttrt0',
            'ecash:qqfvfjp2435fdktwmcuwhytttqv6gmyq8gq4a6tsj2',
            'ecash:qpaa7n5pjg2uel5n0f3n4c52ut5a82kuqcunkfhuhj',
            'ecash:qphzk6xg0wrw67dcdgyuvtz8vtt7gvduegnh0l7gcn',
            'ecash:qrn6turzu59rt43elsthxuug8ygeuc28t5ux5hqnl0',
            'ecash:qz35jcyk8kn7qtslqdtnykv9gada495aauxyeljy8s',
            'ecash:qzwcdzwupqfa5n6jqgj7awutsryr2tky553a8ddw9p',
            'ecash:qz75ekume8d7y83tn0wn89d7x5xc4wlpd5wkjutg7a',
            'ecash:qqkh24v4294s7cju28fz80yy5kklcaajqcajx2tv7k',
            'ecash:qrwsrk79tv87nceuadcqknzy2gqshk66zchyqqakmd',
            'ecash:qqyrns594r2m22f5c2x553dpsdwaghc22vkfgfhqn5',
            'ecash:qq7a367d7rjdv4cj5u3lyg6kw5ckdpm3vv8hkvlk26',
            'ecash:qzt557ajdtp0v2lkpfn47hcqyjngnspa055p5p0k3e',
            'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
            'ecash:qrwwkvr2wdvzu5kyxqjl0mk4sfaxm85juq4wa28f2e',
            'ecash:qrunq208tyej03dcvn4x39hvlkj0l7m2hqz0s0zjys',
            'ecash:qqrzpf7l9crr00yd8haxv0yhns26vuwluszxw5x0wv',
            'ecash:qpuy0lnswzlvs4nm86qs74pl97qvc0srhc665724p7',
            'ecash:qzphvp80l4rsl2468czyuznufe4g5lhgccw7fd7qw6',
            'ecash:qqk77gg5xw8sh6dzd9tr0rhuuc8p0dvqkvvp76ut5u',
            'ecash:qzptzhmgr220a8m2c2waacs560wc3a2mlsxt0wkmsc',
            'ecash:qpu0g0hxk8jhwv5uplyuk3lhgdv4f6hgrusukd6cwl',
            'ecash:qrq605fdmhr2xped7zw0tc9qpm8pnrxgcyrwkrjedn',
            'ecash:qz7vajm78ewnln97uvs3f99dxg20j8x8fu2a6jt5fk',
            'ecash:qrauj3smamqd0qc99ssvn98lk38yvpqa2y8stcekhf',
            'ecash:qz55hqtk62xttdwrq8cshdzmmv7kurp80580x8h5zl',
            'ecash:qzvnu6lw7a85a5xrleg6lz27gakwxlpk9v55jr2p46',
            'ecash:qqhv22qcvn7f38dt2sas2333e9crsztgncmtgdrcm2',
            'ecash:qpvph4dusdwv0z9ajzj0duxfcg0tzu6h9cyaag2pwn',
            'ecash:qq5v4wmfhclzqur4wnt6phwxt2qpk6h9nyesy04fn0',
            'ecash:qzut8s3dsfuycflqyf8a328l2jdx06245vra9q3458',
            'ecash:qzu270ek398w0ejk83njw98eadrueqafuy098ueasq',
            'ecash:qrayn7v0kf0ghpxwyyxsduzj4mvgctz0nqysm47axp',
            'ecash:qpsng33a73pkh7xxv2myj9mppa3l5hvfaunm762526',
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            'ecash:qzelsrygyg838qspwq4y6rqr8vjgqk0umsa2rsz35w',
            'ecash:qzkhavkghz869cl4zk9nnzjfhunhgqvcfce9c7mvdc',
            'ecash:qp45whpmdrlcgy09cse8rmwyunexmlyq9gaduqlm6p',
            'ecash:qrhgew49vsk3chg679grahdx54gyf6qsdcurky8xms',
            'ecash:qplr7p624c7vnxn0fzujsqywh9zcv9dk4ytfcrvql0',
            'ecash:qqypd75zeegzrpc6ldhmmj28qu20ha78a57269a645',
            'ecash:qqfwq959a6szyfdw85749zccftsdk533gv3lc4mfrp',
        ],
        satoshisSent: 199975,
        stackArray: [
            '64726f70',
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            '415454454e54494f4e204752554d50592050454f504c452120f09f98be20596f752063616e206e6f77206465706f736974202447525020746f207468652065546f6b656e20626f7420617420742e6d652f6543617368506c617920746f20746f7020757020796f757220436173696e6f20437265646974732120316d2024475250203d2031204372656469742e20506c617920436173696e6f2067616d657320616e642077696e205845432120',
        ],
        xecTxType: 'Sent',
    },
};

export const offSpecAirdropTx = {
    tx: {
        ...onSpecAirdropTxNoMsg.tx,
        outputs: [
            {
                ...onSpecAirdropTxNoMsg.tx.outputs[0],
                outputScript:
                    '6a0464726f701ffb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87',
            },
            ...onSpecAirdropTxNoMsg.tx.outputs.slice(1),
        ],
    },
    sendingHash: '2a96944d06700882bbd984761d9c9e4215f2d78e',
    parsed: {
        appActions: [
            {
                app: '🪂Airdrop',
                isValid: false,
                lokadId: '64726f70',
            },
        ],
        parsedTokenEntries: [],
        recipients: [
            'ecash:qp2kre7s2ja5mqwcvt7uvazjtskuxdavd5e5vrcxel',
            'ecash:qqtms0966jq55hryqrjp3mrf72vk8g5qtqpwysa6na',
            'ecash:qqhp20z0cc7u40cw39ymyrw6ktpa7acya55l0hgyrd',
            'ecash:qzvkd5cjsz6n78ptshuhtyvwkvprk2qlsc4yrkjum8',
            'ecash:qzla829ez2ne3zqfpyx72ej36369z55t5y75969dkn',
            'ecash:qpllgmsgq7cd8fte0ht9h6hxelxz6q09dcpuhyzzr9',
            'ecash:qpv9ajuqwf5ew77zrgdze4whcnl3z58ffyulr5hxmz',
            'ecash:qqxmqltt0904le050ef64vj64src6g5lsy9t0vws7c',
            'ecash:qqlj8cn954c83tywva0h3024922eg098aq90dtfspf',
            'ecash:qz3nkdrq6saeufapv5v9k2rrk8my6svdsg9wj4s4hl',
            'ecash:qrsqdhs9prwt7f9wq32u5w6kvhks23248sz7x0vz03',
            'ecash:qp03a3ka95pvr73jkxzgrzl9vydwvaxlqv4nuyqll2',
            'ecash:qpz9crr5qsvn2lws8jf6x5wxnmklgva7gcx4qsn5sw',
            'ecash:qr40el0vmxxdaxf780sp4xk3zk8a86mh8ypwtuycl9',
            'ecash:qqpr5uy8a6dl40rh2j8utu9rtxhfht8hhstayxwwfm',
            'ecash:qrk76dvgz6frgsq0w4t2gza0sz8paj8t75yz9dg9aa',
            'ecash:qqdrx6zzp8vh369uzs7xlndh74hrys7uachl0rwq7d',
            'ecash:qpyxe0ctlw3m0592uy97clcdggnwdcg0jctx6mfrz4',
            'ecash:qzqvwt004vkfnncexswvpc5e93je6ssesuzzjzad2z',
            'ecash:qzs4mw9zf7dnwspc8yn6r4u8hfmmxjmr4qa2pvqwvr',
            'ecash:qq36zdqdh0ndahcu6vwd7y0ctv6y9n7c9qwg9xyccn',
            'ecash:qq0yvnyd9quhdhwp87n82eeklre6qp5l0qcy78a7x6',
            'ecash:qredshz087mcc8vhyl02wd5scu5p2atw9vxhhp6t7d',
            'ecash:qrv8ywknhmxygdtzvl5dqvfkjtzf8l3tmukugtcl6d',
            'ecash:qqtpet5n3mqjr0vewqcywe5xtxglaq9xxqukk4u9q0',
            'ecash:qzgwc35u54xwjctzst02nq9rnu8yhxn2hyu2mn9e97',
            'ecash:qzecdv04nd0s8dz5w80jzn2877446jqqxq8d2rppc4',
            'ecash:qrfw4xap5zgu9t0sz9k6f5krmhpu7ufy4ynpmajugh',
            'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
            'ecash:qpgn0x4kzy58vkxfu8q0nrcf9xka6k30r534m2j2ca',
            'ecash:qqe0cv6phqleq23kpjaljxsga2vu9ymn85q3uuvpdu',
            'ecash:qpvljwpehgj2h45edd6689yxdywagpnqhcd5fngx3n',
            'ecash:qpe77979h864r6hr7w604hmply72uhn2agr5z20769',
            'ecash:qp5sqwvcctpj4jqe2xugg94f59wl8gve9yvt7h4vj0',
            'ecash:qpwaqsgl5cq6hqhu66yffj2ex3se5jvjqcmn6tp9gn',
            'ecash:qpf5c3q8am48ujuv8mta4ewtfgjnn0hdnyx7nqk7y8',
            'ecash:qprlsm6ywgwg6zavycmqyutlcy9smfymnupv08w52e',
            'ecash:qzz3f8x423t5qxk5v3w9fwrv4gxwp48stu7zk0lhxv',
            'ecash:qrc27ws5z8k5nzdlt3zxg8p6sm288tly2y3m6nwxww',
            'ecash:qztnm9f7zhtz8qajf6lr6u7sreac80vcju4tk6j75z',
            'ecash:qrdd7dxda8rhflwkxsxd9yt2nww96470gv48s4f9j0',
            'ecash:qpx797ee7zw3gjf0f4qwp7m8pfp275zudvk3ym56ad',
            'ecash:qr7h7485jm9dkzmd8npqdmsf3w4jn02mhu7n4g6whr',
            'ecash:qz646fl9p9gq47zjgd3zxs72nc74fgzr3gw9u8p7tc',
            'ecash:qp284wa258z7jtkdu4gur07mngh9g49cxqxs2pmdgc',
            'ecash:qq8kn2f3g6vp26hw30dedgm0rcy0rwsk35ln6cazck',
            'ecash:qp59q64mfnnfcrjedjqta0j9dua707gyl5q5p2a5py',
            'ecash:qpr6kemj5374tdmynwplzp0atnwra23z4y7mt4d46q',
            'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
            'ecash:qzm5es2p37kj9lswkzl02uyzmxpk52f5psl90kzl6t',
            'ecash:qr3n7laxk8qr669zsavvrme6t7nnyt90hvy5esczyf',
            'ecash:qz3sz5adwwa90dhn0sssgd0yq7ah5d52t56s78jsfa',
            'ecash:qq2qfhrm2j4hw6yrwu579mlq2gg95nzqty3fpaxcpk',
            'ecash:qztvmtsvsgzzdt5rzgtdv2fc8hd8aedd4v8rxttrt0',
            'ecash:qqfvfjp2435fdktwmcuwhytttqv6gmyq8gq4a6tsj2',
            'ecash:qpaa7n5pjg2uel5n0f3n4c52ut5a82kuqcunkfhuhj',
            'ecash:qphzk6xg0wrw67dcdgyuvtz8vtt7gvduegnh0l7gcn',
            'ecash:qrn6turzu59rt43elsthxuug8ygeuc28t5ux5hqnl0',
            'ecash:qz35jcyk8kn7qtslqdtnykv9gada495aauxyeljy8s',
            'ecash:qzwcdzwupqfa5n6jqgj7awutsryr2tky553a8ddw9p',
            'ecash:qz75ekume8d7y83tn0wn89d7x5xc4wlpd5wkjutg7a',
            'ecash:qqkh24v4294s7cju28fz80yy5kklcaajqcajx2tv7k',
            'ecash:qrwsrk79tv87nceuadcqknzy2gqshk66zchyqqakmd',
            'ecash:qqyrns594r2m22f5c2x553dpsdwaghc22vkfgfhqn5',
            'ecash:qq7a367d7rjdv4cj5u3lyg6kw5ckdpm3vv8hkvlk26',
            'ecash:qzt557ajdtp0v2lkpfn47hcqyjngnspa055p5p0k3e',
            'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
            'ecash:qrwwkvr2wdvzu5kyxqjl0mk4sfaxm85juq4wa28f2e',
            'ecash:qrunq208tyej03dcvn4x39hvlkj0l7m2hqz0s0zjys',
            'ecash:qqrzpf7l9crr00yd8haxv0yhns26vuwluszxw5x0wv',
            'ecash:qpuy0lnswzlvs4nm86qs74pl97qvc0srhc665724p7',
            'ecash:qzphvp80l4rsl2468czyuznufe4g5lhgccw7fd7qw6',
            'ecash:qqk77gg5xw8sh6dzd9tr0rhuuc8p0dvqkvvp76ut5u',
            'ecash:qzptzhmgr220a8m2c2waacs560wc3a2mlsxt0wkmsc',
            'ecash:qpu0g0hxk8jhwv5uplyuk3lhgdv4f6hgrusukd6cwl',
            'ecash:qrq605fdmhr2xped7zw0tc9qpm8pnrxgcyrwkrjedn',
            'ecash:qz7vajm78ewnln97uvs3f99dxg20j8x8fu2a6jt5fk',
            'ecash:qrauj3smamqd0qc99ssvn98lk38yvpqa2y8stcekhf',
            'ecash:qz55hqtk62xttdwrq8cshdzmmv7kurp80580x8h5zl',
            'ecash:qzvnu6lw7a85a5xrleg6lz27gakwxlpk9v55jr2p46',
            'ecash:qqhv22qcvn7f38dt2sas2333e9crsztgncmtgdrcm2',
            'ecash:qpvph4dusdwv0z9ajzj0duxfcg0tzu6h9cyaag2pwn',
            'ecash:qq5v4wmfhclzqur4wnt6phwxt2qpk6h9nyesy04fn0',
            'ecash:qzut8s3dsfuycflqyf8a328l2jdx06245vra9q3458',
            'ecash:qzu270ek398w0ejk83njw98eadrueqafuy098ueasq',
            'ecash:qrayn7v0kf0ghpxwyyxsduzj4mvgctz0nqysm47axp',
            'ecash:qpsng33a73pkh7xxv2myj9mppa3l5hvfaunm762526',
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            'ecash:qzelsrygyg838qspwq4y6rqr8vjgqk0umsa2rsz35w',
            'ecash:qzkhavkghz869cl4zk9nnzjfhunhgqvcfce9c7mvdc',
            'ecash:qp45whpmdrlcgy09cse8rmwyunexmlyq9gaduqlm6p',
            'ecash:qrhgew49vsk3chg679grahdx54gyf6qsdcurky8xms',
            'ecash:qplr7p624c7vnxn0fzujsqywh9zcv9dk4ytfcrvql0',
            'ecash:qqypd75zeegzrpc6ldhmmj28qu20ha78a57269a645',
            'ecash:qqfwq959a6szyfdw85749zccftsdk533gv3lc4mfrp',
        ],
        satoshisSent: 199975,
        stackArray: [
            '64726f70',
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87',
        ],
        xecTxType: 'Sent',
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                sats: 48445n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04657461624ca1040f3cc3bc507126c239cde840befd974bdac054f9b9f2bfd4ff32b5f59ca554c4f3fb2d11d30eae3e5d3f61625ff7812ba14f8c901c30ee7e03dea57681a8f7ab8c64d42ce505921b4d67507452537cbe7525281714857c75d7a441b65030b7ea646b59ed0c34adc9f739661620cf7678963db3cac78afd7f49ad0d63aad404b07730255ded82ea3a939c63ee040ae9fac9336bb8d84d7b3380665ffa514a45f4',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'aca8ec27a6fc4dc45b1c2e2a6175e84d81ffdd54c7f97711654a100ade4e80bc',
                    outIdx: 0,
                },
                sats: 1200n,
            },
            {
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                spentBy: {
                    txid: '610f8a6f8e7266af18feda7a5672d379314eb05cb7ce6690a1f1d5bff1051dad',
                    outIdx: 1,
                },
                sats: 46790n,
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
        satoshisSent: 1200,
        stackArray: [
            '65746162',
            '040f3cc3bc507126c239cde840befd974bdac054f9b9f2bfd4ff32b5f59ca554c4f3fb2d11d30eae3e5d3f61625ff7812ba14f8c901c30ee7e03dea57681a8f7ab8c64d42ce505921b4d67507452537cbe7525281714857c75d7a441b65030b7ea646b59ed0c34adc9f739661620cf7678963db3cac78afd7f49ad0d63aad404b07730255ded82ea3a939c63ee040ae9fac9336bb8d84d7b3380665ffa514a45f4',
        ],
        xecTxType: 'Sent',
        recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
        appActions: [
            { app: 'Cashtab Encrypted (deprecated)', lokadId: '65746162' },
        ],
        parsedTokenEntries: [],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                sats: 36207n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04657461624c9104eaa5cbe6e13db7d91f35dca5d270c944a9a3e8c7738c56d12069312f589c7f193e67ea3d2f6d1f300f404c33c19e48dc3ac35145c8152624b7a8e22278e9133862425da2cc44f7297c8618ffa78dd09054a4a5490afd2b62139f19fa7b8516cbae692488fa50e79101d55e7582b3a662c3a5cc737044ef392f8c1fde63b8385886aed37d1b68e887284262f298fe74c0',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                spentBy: {
                    txid: '610f8a6f8e7266af18feda7a5672d379314eb05cb7ce6690a1f1d5bff1051dad',
                    outIdx: 0,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '3efa1835682ecc60d2476f1c608eb6f5ae9040610193111a2c312453cd7db4ef',
                    outIdx: 0,
                },
                sats: 34652n,
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
        satoshisSent: 1100,
        stackArray: [
            '65746162',
            '04eaa5cbe6e13db7d91f35dca5d270c944a9a3e8c7738c56d12069312f589c7f193e67ea3d2f6d1f300f404c33c19e48dc3ac35145c8152624b7a8e22278e9133862425da2cc44f7297c8618ffa78dd09054a4a5490afd2b62139f19fa7b8516cbae692488fa50e79101d55e7582b3a662c3a5cc737044ef392f8c1fde63b8385886aed37d1b68e887284262f298fe74c0',
        ],
        xecTxType: 'Received',
        recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        appActions: [
            { app: 'Cashtab Encrypted (deprecated)', lokadId: '65746162' },
        ],
        parsedTokenEntries: [],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 2300n,
            },
            {
                prevOut: {
                    txid: '1efe359a0bfa83c409433c487b025fb446a3a9bfa51a718c8dd9a56401656e33',
                    outIdx: 2,
                },
                inputScript:
                    '47304402206a2f53497eb734ea94ca158951aa005f6569c184675a497d33d061b78c66c25b02201f826fa71be5943ce63740d92a278123974e44846c3766c5cb58ef5ad307ba36412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 2n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '49f825370128056333af945eb4f4d9712171c9e88954deb189ca6f479564f2ee',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100efa3c767b749abb2dc958932348e2b19b845964e581c9f6de706cd43dac3f087022059afad6ff3c1e49cc0320499381e78eab922f18b00e0409228ad417e0220bf5d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 999875n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c8750800000000000f41b9',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 999865n,
                },
                spentBy: {
                    txid: '657646f7a4e7237fca4ed8231c27d95afc8086f678244d5560be2230d920ff70',
                    outIdx: 1,
                },
                sats: 546n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 12n,
                intentionalBurnAtoms: 0n,
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
        satoshisSent: 546,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            '00000000000f41b9',
        ],
        xecTxType: 'Sent',
        recipients: [],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'BURN',
                tokenId:
                    '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                tokenSatoshis: '12',
            },
        ],
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 2200n,
            },
            {
                prevOut: {
                    txid: '905cc5662cad77df56c3770863634ce498dde9d4772dc494d33b7ce3f36fa66c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dce5b3b516bfebd40bd8d4b4ff9c43c685d3c9dde1def0cc0667389ac522cf2502202651f95638e48c210a04082e6053457a539aef0f65a2e9c2f61e3faf96c1dfd8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 5235120760000000n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44207443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d0800129950892eb779',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 5235120758765433n,
                },
                spentBy: {
                    txid: '9c0c01c1e8cc3c6d816a3b41d09d65fda69de082b74b6ede7832ed05527ec744',
                    outIdx: 1,
                },
                sats: 546n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 1234567n,
                intentionalBurnAtoms: 0n,
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
        satoshisSent: 546,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            '00129950892eb779',
        ],
        xecTxType: 'Sent',
        recipients: [],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'BURN',
                tokenId:
                    '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                tokenSatoshis: '1234567',
            },
        ],
    },
};

export const swapTx = {
    tx: {
        txid: 'baed6358b9ea2e354e384d2e31a576ffa25fcceaf796e711e8306f9c8086b00f',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '8b55a382501b538296cd13269b341f7a964366a705a45f89f56e0d783240f3a4',
                    outIdx: 2,
                },
                inputScript:
                    '41256f3c091df7dea2bb9d74241b47116364d7b0035dfe1c5d1d398d8e92e99f4d5f3dd747f8e81ca99ddaf5630399ef18e26b6a3bf9b763cdd25225e68f7bbd2d41210304222c88e9936a195762fc4ee41a082e906a0e8434df43a03bfcdf1f9d2c1b8d',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91493472d56ba91581ed473225a765dd14a2db5d9d888ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '8b55a382501b538296cd13269b341f7a964366a705a45f89f56e0d783240f3a4',
                    outIdx: 3,
                },
                inputScript:
                    '418ab02f08273afd67c4db840f09429d7c76c0a71b28dbaef5c63f277944a168819d72bedd14e78b327a237f6070b0519ef8456efbfe206bae0c60d3b5f328faea412103df543832906a1f5fc8f201bb99454f350b1906375d522f735bd357cbda11ab5b',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9149ea00e6c2ef24026719421e4790e1a694c94381b88ac',
                sats: 2565n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a045357500001010101209e0a9d4720782cf661beaea6c5513f1972e0f3b1541ba4c83f4c87ef65f843dc0453454c4c0631323831323301002039c6db26912f34352d50fdfd8d75d1c16cb8a669f3ae05000a6c8c74d14839a50101063132383132330437383035',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91493472d56ba91581ed473225a765dd14a2db5d9d888ac',
                spentBy: {
                    txid: '47f7a2189eb65e9a2288f81640351cc80ada49288b09973bcaa7aef1e423faa8',
                    outIdx: 1,
                },
                sats: 2656n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1712535539,
        size: 439,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 839523,
            hash: '00000000000000000c61b358a9681170b9387790370bf3ca18a402bc50264fc0',
            timestamp: 1712536759,
        },
    },
    parsed: {
        satoshisSent: 0,
        stackArray: [
            '53575000',
            '01',
            '01',
            '9e0a9d4720782cf661beaea6c5513f1972e0f3b1541ba4c83f4c87ef65f843dc',
            '53454c4c',
            '313238313233',
            '00',
            '39c6db26912f34352d50fdfd8d75d1c16cb8a669f3ae05000a6c8c74d14839a5',
            '01',
            '313238313233',
            '37383035',
        ],
        xecTxType: 'Received',
        appActions: [{ app: 'SWaP', lokadId: '53575000' }],
        parsedTokenEntries: [],
        recipients: ['ecash:qzf5wt2kh2g4s8k5wv395aja699zmdwemq05vg6h92'],
        replyAddress: 'ecash:qzf5wt2kh2g4s8k5wv395aja699zmdwemq05vg6h92',
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
                sequenceNo: 4294967294,
                outputScript:
                    '76a91403c63d3a52cde136da8858e9d0ffaa810cb6639288ac',
                sats: 7146n,
            },
        ],
        outputs: [
            {
                outputScript: '6a0450415900000008d980190d13019567',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914f66d2760b20dc7a47d9cf1a2b2f49749bf7093f688ac',
                sats: 1800n,
            },
            {
                outputScript:
                    '76a91401bfce4ff373b108bd65b4da08de621ade85adb588ac',
                spentBy: {
                    txid: '566a7c12364e3f362fbc738bf209527d3074ce0a2d19b797d3ca34a3482e3386',
                    outIdx: 0,
                },
                sats: 3876n,
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
        satoshisSent: 1800,
        stackArray: ['50415900', '00', '00', 'd980190d13019567'],
        xecTxType: 'Received',
        appActions: [
            {
                action: { data: '', nonce: 'd980190d13019567' },
                isValid: true,
                app: 'PayButton',
                lokadId: '50415900',
            },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qqqmlnj07demzz9avk6d5zx7vgddapddk5k05jys53'],
        replyAddress: 'ecash:qqpuv0f62tx7zdk63pvwn58l42qsednrjgnt0czndd',
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
                sequenceNo: 4294967294,
                outputScript:
                    '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
                sats: 3403110n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04504159000008f09f9882f09f918d0869860643e4dc4c88',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                spentBy: {
                    txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                    outIdx: 0,
                },
                sats: 3392102n,
            },
            {
                outputScript:
                    '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                spentBy: {
                    txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                    outIdx: 0,
                },
                sats: 9490n,
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
        satoshisSent: 3401592,
        stackArray: ['50415900', '00', 'f09f9882f09f918d', '69860643e4dc4c88'],
        xecTxType: 'Sent',
        recipients: [
            'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
            'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
        ],
        appActions: [
            {
                action: {
                    data: '😂👍',
                    nonce: '69860643e4dc4c88',
                },
                isValid: true,
                lokadId: '50415900',
                app: 'PayButton',
            },
        ],
        parsedTokenEntries: [],
    },
};

// No data no payment id
const PayButtonEmptyTx = structuredClone(PayButtonYesDataYesNonce.tx);
// Create a tx with 00 in paymentId and nonce spaces
PayButtonEmptyTx.outputs[0].outputScript = '6a0450415900000000';
export const PayButtonEmpty = {
    tx: PayButtonEmptyTx,
    parsed: {
        satoshisSent: 3401592,
        stackArray: ['50415900', '00', '00', '00'],
        xecTxType: 'Sent',
        recipients: [
            'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
            'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
        ],
        appActions: [
            {
                action: {
                    data: '',
                    nonce: '',
                },
                isValid: true,
                lokadId: '50415900',
                app: 'PayButton',
            },
        ],
        parsedTokenEntries: [],
    },
};
// data and no payment id
const PayButtonYesDataNoNonceTx = structuredClone(PayButtonYesDataYesNonce.tx);
// Create a tx with 00 in paymentId and nonce spaces
PayButtonYesDataNoNonceTx.outputs[0].outputScript =
    '6a0450415900000e6f6e6c792064617461206865726500';
export const PayButtonYesDataNoNonce = {
    tx: PayButtonYesDataNoNonceTx,
    parsed: {
        satoshisSent: 3401592,
        stackArray: ['50415900', '00', '6f6e6c7920646174612068657265', '00'],
        xecTxType: 'Sent',
        recipients: [
            'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
            'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
        ],
        appActions: [
            {
                action: {
                    data: 'only data here',
                    nonce: '',
                },
                app: 'PayButton',
                isValid: true,
                lokadId: '50415900',
            },
        ],
        parsedTokenEntries: [],
    },
};

// Off spec paybutton tx
const PayButtonOffSpecTx = structuredClone(PayButtonYesDataYesNonce.tx);
// Create a tx with 3 pushes instead of expected 4
PayButtonOffSpecTx.outputs[0].outputScript = '6a04504159000008f09f9882f09f918d';
export const PayButtonOffSpec = {
    tx: PayButtonOffSpecTx,
    parsed: {
        satoshisSent: 3401592,
        stackArray: ['50415900', '00', 'f09f9882f09f918d'],
        xecTxType: 'Sent',
        recipients: [
            'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
            'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
        ],
        appActions: [
            {
                app: 'PayButton',
                isValid: false,
                lokadId: '50415900',
            },
        ],
        parsedTokenEntries: [],
    },
};

// Unsupported version paybutton tx
const PayButtonBadVersionTx = structuredClone(PayButtonYesDataYesNonce.tx);
// Force a version 1 tx
PayButtonBadVersionTx.outputs[0].outputScript =
    '6a0450415900010108f09f9882f09f918d0869860643e4dc4c88';
export const PayButtonBadVersion = {
    tx: PayButtonBadVersionTx,
    parsed: {
        satoshisSent: 3401592,
        stackArray: ['50415900', '01', 'f09f9882f09f918d', '69860643e4dc4c88'],
        xecTxType: 'Sent',
        recipients: [
            'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
            'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
        ],
        appActions: [
            {
                app: 'PayButton',
                isValid: false,
                lokadId: '50415900',
            },
        ],
        parsedTokenEntries: [],
    },
};

export const NFToaAuthYesNonce = {
    tx: {
        txid: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                    outIdx: 0,
                },
                inputScript:
                    '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                sequenceNo: 4294967294,
                outputScript:
                    // random sender
                    '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                sats: 10000n,
            },
        ],
        outputs: [
            // OP_RETURN NFToa Proof of Access
            {
                outputScript:
                    '6a044e465400134c6f67696e20746f2047617564696f2041707008eb0c601b84975437',
                sats: 0n,
            },
            // recipient = your address
            {
                outputScript:
                    '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                sats: 550n,
            },
        ],
        lockTime: 0,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    parsed: {
        satoshisSent: 550,
        replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
        stackArray: [
            '4e465400',
            '4c6f67696e20746f2047617564696f20417070',
            'eb0c601b84975437',
        ],
        xecTxType: 'Received',
        appActions: [
            {
                app: 'NFToa',
                lokadId: '4e465400',
                isValid: true,
                action: {
                    data: 'Login to Gaudio App',
                    nonce: 'eb0c601b84975437',
                },
            },
        ],
        parsedTokenEntries: [],
        recipients: [],
    },
};

export const NFToaMsgNoNonce = {
    tx: {
        txid: 'dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                    outIdx: 0,
                },
                inputScript:
                    '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                sequenceNo: 4294967294,
                outputScript:
                    // random sender
                    '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                sats: 10000n,
            },
        ],
        outputs: [
            // OP_RETURN NFToa message (no nonce)
            {
                outputScript:
                    '6a044e4654001648656c6c6f20576f726c642066726f6d204e46546f61',
                sats: 0n,
            },
            // recipient = your address
            {
                outputScript:
                    '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                sats: 550n,
            },
        ],
        lockTime: 0,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    parsed: {
        satoshisSent: 550,
        replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
        stackArray: [
            '4e465400',
            '48656c6c6f20576f726c642066726f6d204e46546f61',
        ],
        xecTxType: 'Received',
        appActions: [
            {
                app: 'NFToa',
                lokadId: '4e465400',
                isValid: true,
                action: {
                    data: 'Hello World from NFToa',
                    nonce: '',
                },
            },
        ],
        parsedTokenEntries: [],
        recipients: [],
    },
};

export const NFToaOffSpec = {
    tx: {
        txid: '0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                    outIdx: 0,
                },
                inputScript:
                    '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                sequenceNo: 4294967294,
                outputScript:
                    '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                sats: 10000n,
            },
        ],
        outputs: [
            // malformed NFToa OP_RETURN
            {
                outputScript: '6a044e465400',
                sats: 550n,
            },
            // still sent to your address
            {
                outputScript:
                    '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                sats: 0n,
            },
        ],
        lockTime: 0,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    parsed: {
        satoshisSent: 550,
        replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
        stackArray: ['4e465400'],
        xecTxType: 'Received',
        appActions: [
            {
                app: 'NFToa',
                lokadId: '4e465400',
                isValid: false,
            },
        ],
        recipients: [],
        parsedTokenEntries: [],
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
                sequenceNo: 4294967294,
                outputScript:
                    '76a914eff9a0ba847ae97697a9f97c05887aba2b41060e88ac',
                sats: 81319n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a1774657374696e672061206d736720666f72206572726f72',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914731fbd873b3603e8dafd62923b954d38571e10fc88ac',
                spentBy: {
                    txid: 'b817870c8ae5ec94d639089e37763daee271f412ab478705a29b036ba0b00f3d',
                    outIdx: 55,
                },
                sats: 80213n,
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'dc06ab36c9a7e365f319c0e918324af9778cb29b82c07ff87e2ec80eb6e4e6fe',
                    outIdx: 9,
                },
                sats: 600n,
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
        satoshisSent: 600,
        stackArray: ['74657374696e672061206d736720666f72206572726f72'],
        xecTxType: 'Received',
        appActions: [
            {
                action: {
                    decoded: 'testing a msg for error',
                    stack: '74657374696e672061206d736720666f72206572726f72',
                },
                lokadId: '',
                app: 'none',
            },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qpe3l0v88vmq86x6l43fywu4f5u9w8sslsga0tcn4t'],
        replyAddress: 'ecash:qrhlng96s3awja5h48uhcpvg02azksgxpce6nvshln',
    },
};

export const unknownAppTx = {
    tx: {
        txid: '4cd528a95263714b8f748d58df30c44956158825924e3385b5c5c511129d1b3a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '9ca28926f8ec125dce0b7084468bd595b27bd73991b48461ac994cacff47a21d',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100b50fac4b810ac6b10ce35f25fcc1a6b1f87b1209e8ee5973732d983395199de102204f860238b12ba3e7adfc432e331405f751fef1aa494c2d0122b7aaa522158933412102188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914d18b7b500f17c5db64303fec630f9dbb85aa959688ac',
                sats: 3725n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a4cd43336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914d18b7b500f17c5db64303fec630f9dbb85aa959688ac',
                spentBy: {
                    txid: 'e5b4912fa19d93db9b6b9586ad9ab3a7f9bc3514325c71e36816e4b047a9f6b8',
                    outIdx: 0,
                },
                sats: 3308n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 416,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 826662,
            hash: '00000000000000001d45441094ec7a93f42f3beb564684aba68250b016feefb4',
            timestamp: 1704961725,
        },
    },
    parsed: {
        satoshisSent: 3308,
        stackArray: [
            '3336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
        ],
        xecTxType: 'Sent',
        recipients: [],
        appActions: [
            {
                action: {
                    decoded:
                        '36ae3d-MERON-WIN"},{"name":"wala","message":"659fa11370e316f2ea36ae3d-WALA-WIN"}],"terms":[{"name":"refereePubKey","type":"bytes","value":"02188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93"}]}}}}',
                    stack: '3336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
                },
                app: 'none',
                lokadId: '',
            },
        ],
        parsedTokenEntries: [],
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
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 49756n,
                },
                outputScript:
                    '76a914575116c8adf5817c99fc5bdac8db18d10c25703d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                    outIdx: 2,
                },
                inputScript:
                    '4152ed9a66a0c40759e400a1484df1a1d2b152c9d6917abf3beaf974f21a935d60853490ae5a07c237531016ceae6c1f01cce9cf2a1417b2b2bcbbc4737ea2fe35412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                sats: 1000n,
            },
            {
                prevOut: {
                    txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                    outIdx: 3,
                },
                inputScript:
                    '412a65517b4df68bb03ba2b7cd85e70af662503bbc8be209e7fbf18bb0950ff7e0d589f0b3e8119b5e67314fbedd856968890556593d97db58c78e86d2417f27d7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                sats: 1000n,
            },
            {
                prevOut: {
                    txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                    outIdx: 4,
                },
                inputScript:
                    '412c9a66d04d341b1f0c3a15689265729a18f5605269909ad9f7b842ea03d96f8540e1b5b272ddc9db5f2d392a8e0569428a7ba4b5d99bbc707168898399f00da7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                sats: 1000n,
            },
            {
                prevOut: {
                    txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                    outIdx: 5,
                },
                inputScript:
                    '41f2ffdbd5f3694669d448899d3f6d939a8165d70cba6be2eaa8416847d56d4630a7b3ac8a35641705e4eb583b391a46c204920641dd85e2b7e04dd18553422651412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                sats: 1000n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a503d534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd038a02000000003e3000000000948f00000000',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 650n,
                },
                sats: 546n,
            },
            {
                outputScript: 'a914b0bfb87508e5203803490c2f3891d040f772ba0f87',
                token: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 12350n,
                },
                sats: 1960n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 36756n,
                },
                sats: 546n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
        satoshisSent: 546,
        stackArray: [
            '50',
            '534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd038a02000000003e3000000000948f00000000',
        ],
        xecTxType: 'Received',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                tokenSatoshis: '650',
            },
        ],
        recipients: [
            'ecash:pzctlwr4prjjqwqrfyxz7wy36pq0wu46pud7n9ffz3',
            'ecash:qpt4z9kg4h6czlyel3da4jxmrrgscfts859gzp2zuu',
        ],
        replyAddress: 'ecash:qpt4z9kg4h6czlyel3da4jxmrrgscfts859gzp2zuu',
    },
};

export const SlpNftParentFanTx = {
    tx: {
        txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100a5e4824f76bad8f224412fca2442c11598d6dd29848b67ae0e8c6f74a5a80b2c022049ee636ac6b951eba8273f300bcab8ffc31525f4d96ca738cfbb62e73769bf3a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 4n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '73c8333ffbf94d14a52c0284a67a7e0cb71dac08d6ae9da989f7c3b97339df7f',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100dfe70b028211bf747a9d634f03f6f024264f75ef37f9dd4b40c8d8dfddfeff9702205ccb832e674c5c865353707fc46c5b4206dd807797d6b64f146441fa2d85bf94412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 32771801n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001810453454e442012a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3080000000000000001080000000000000001080000000000000001080000000000000001',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
                    txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                    outIdx: 1,
                },
                sats: 32769023n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1713825841,
        size: 567,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
            height: 841414,
            hash: '00000000000000000e074b0e1067d96e33a0b4df2a352dab1abbb6f28645563a',
            timestamp: 1713826095,
        },
    },
    parsed: {
        recipients: [],
        satoshisSent: 32771207,
        stackArray: [
            '534c5000',
            '81',
            '53454e44',
            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
            '0000000000000001',
            '0000000000000001',
            '0000000000000001',
            '0000000000000001',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                nftFanInputsCreated: 4,
                renderedTokenType: 'Collection',
                renderedTxType: 'Fan Out',
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                tokenSatoshis: '0',
            },
        ],
    },
    // 3 The Four Half-Coins of Jin-qua (4HC)
    cache: [
        [
            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                timeFirstSeen: 1713551159,
                genesisInfo: {
                    tokenTicker: '4HC',
                    tokenName: 'The Four Half-Coins of Jin-qua',
                    url: 'en.wikipedia.org/wiki/Tai-Pan_(novel)',
                    decimals: 0,
                    hash: '2a6585a404fae1c33a43322b723b9dbd926cb07244ae9bea888add8f471511e0',
                },
                block: {
                    height: 840791,
                    hash: '00000000000000000be1576bcb0bf1c035bba940d5c696d7bb8a0d53c16076c5',
                    timestamp: 1713551526,
                },
                genesisSupply: '4',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
            },
        ],
    ],
};

export const SlpNftMint = {
    tx: {
        txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100939d517c889174bdcaf9755390165ce1e2ba7f47d1490dbf48bbf2f4146c84360220172aeb2fe8eca8a0c59e68ca6b2ab1a8fd0bdded8410212c5d34d936cadcf734412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                    outIdx: 5,
                },
                inputScript:
                    '483045022100da6101ab8d02141d6745b3985d4c1ba5481cb2c470acff8d40e66fa654e3f14402200906d6a511dda0c5bc243f82217a03fe40c3cfc0a407b2d1e6f971de1ae70316412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 32769023n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001410747454e45534953035746430c57752046616e672043686f690b636173687461622e636f6d20ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a297308385501004c00080000000000000001',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
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
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 32768070n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1713828197,
        size: 474,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
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
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
            {
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
    },
    parsed: {
        recipients: [],
        satoshisSent: 32768616,
        stackArray: [
            '534c5000',
            '41',
            '47454e45534953',
            '574643',
            '57752046616e672043686f69',
            '636173687461622e636f6d',
            'ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a2973083855',
            '00',
            '',
            '0000000000000001',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'NFT',
                renderedTxType: 'GENESIS',
                tokenId:
                    'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                tokenSatoshis: '1',
            },
            {
                renderedTokenType: 'Collection',
                renderedTxType: 'NONE', // this type occurs when we burn a 1-qty collection token to mint an NFT
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                tokenSatoshis: '0',
            },
        ],
    },
    // 1 Wu Fang Choi (WFC)
    cache: [
        [
            'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                timeFirstSeen: 1713828197,
                genesisInfo: {
                    tokenTicker: 'WFC',
                    tokenName: 'Wu Fang Choi',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: 'ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a2973083855',
                },
                block: {
                    height: 841418,
                    hash: '000000000000000015c94349a2ec777da460e8d8d48a220bbf9d6a6e6e9df66f',
                    timestamp: 1713829166,
                },
                genesisSupply: '1',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
            },
        ],
    ],
};

export const SlpParentGenesisTxMock = {
    tx: {
        txid: 'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100eb2e68c7d02eda2dd64c22a079d832c5c85f34f1ced264cd3b37658d4cd0b89e02203e204cd625a05c8ba59291567bc14d0bfa193a9a37cbc00aec804a224dc910d1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 32766028n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001810747454e455349530348534d0b54686520486569736d616e2c68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f486569736d616e5f54726f7068792073229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb97601004c00080000000000000059',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 89n,
                },
                spentBy: {
                    txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                    outIdx: 1,
                },
                sats: 32764762n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1714048251,
        size: 358,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
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
            height: 841852,
            hash: '00000000000000000cea344b4130a2de214200266ad0d67253eea01eeb34a48d',
            timestamp: 1714048284,
        },
    },
    parsed: {
        recipients: [],
        satoshisSent: 32765308,
        stackArray: [
            '534c5000',
            '81',
            '47454e45534953',
            '48534d',
            '54686520486569736d616e',
            '68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f486569736d616e5f54726f706879',
            '73229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb976',
            '00',
            '',
            '0000000000000059',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'Collection',
                renderedTxType: 'GENESIS',
                tokenId:
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                tokenSatoshis: '89',
            },
        ],
    },
    cache: [
        [
            'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                timeFirstSeen: 1714048251,
                genesisInfo: {
                    tokenTicker: 'HSM',
                    tokenName: 'The Heisman',
                    url: 'https://en.wikipedia.org/wiki/Heisman_Trophy',
                    decimals: 0,
                    hash: '73229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb976',
                },
                block: {
                    height: 841852,
                    hash: '00000000000000000cea344b4130a2de214200266ad0d67253eea01eeb34a48d',
                    timestamp: 1714048284,
                },
                genesisSupply: '89',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
            },
        ],
    ],
};

export const oneOutputReceivedTx = {
    tx: {
        txid: '0edd96775cc1dbc4c36dbf5f1773f937de3bdadd572265ad78bae931fec3f431',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'cd5731b4f5ec4ff2e12fe3187e37ce3dc544f5419df8f6c36f649e1236d7dcee',
                    outIdx: 0,
                },
                inputScript:
                    '41246058dcfab4114536db638d064612e12e0cfff613b568535c278e544ec68ec3e02ffc94d09a0ffe0f4e6fd9ff9608b01aad46cad3765059c3fe45ea09898abe4121029bd5d9d9565b734188493dfd3b0fe985ccd55bb6bc1544cf6ed25a46076f045f',
                sequenceNo: 4294967294,
                outputScript:
                    '76a914bb3f3669824acaf67902cbc8477f75ae5b139a0f88ac',
                sats: 45553900000n,
            },
            {
                prevOut: {
                    txid: '3719ef3aa2739da328a1a2916a422931fb7b0fa897183f3fd8f3c26864285e34',
                    outIdx: 0,
                },
                inputScript:
                    '415d1ee0074f11a0adf5c35039167a731d008656eb0a33b5eec9144dd8614419e88866779cce3da0de8c9f839ddbb8d8ee8d24c82526a8900730ea8af8ef102c6d4121020b5c467c0276678df5f50cc932e81abf259f40477f815ed11f4d0fecab39f2d6',
                sequenceNo: 4294967294,
                outputScript:
                    '76a91409c388abff6922c7e97ef8ea58e9697b6637910c88ac',
                sats: 100000000n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a914601efc2aa406fe9eaedd41d2b5d95d1f4db9041d88ac',
                spentBy: {
                    txid: 'b9aab1e26381457b390ad689c7577962cef1ec48de3a83d87db68968afb7e4cf',
                    outIdx: 54,
                },
                sats: 45653899320n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1714138690,
        size: 326,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 842022,
            hash: '00000000000000000c331ba563d903d20ff670b18afd0d6cd4aadca854d294a6',
            timestamp: 1714139968,
        },
    },
    parsed: {
        appActions: [],
        parsedTokenEntries: [],
        recipients: [],
        replyAddress: 'ecash:qzan7dnfsf9v4aneqt9us3mlwkh9kyu6pufd42k3cf',
        satoshisSent: 45653899320,
        stackArray: [],
        xecTxType: 'Received',
    },
};

export const eCashChatAuthenticationTx = {
    tx: {
        txid: '61838af28ae42e3b6a5fd037e112fe0df936dabf2a6417091abce6a3d830b078',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'f9323576b17aebd302272652ee9990b2a1347da7e3270d19b8d32ae60a0dec2f',
                    outIdx: 0,
                },
                inputScript:
                    '413fb023c886471d0f7eefcd3e5bf2cdbc0f537edd20b9f515d32da7c80b519b7cdc2da3e6696220addd232ebd8c10d53c092965d6bcce262b1a8745a61a18f3a54121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                sats: 3377n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a0461757468140644ad85a538657c033e36ce5a3c8cf26076591f',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914b20298c1b5d6a82a61f6c8cd708fa87a1ce1a97a88ac',
                sats: 550n,
            },
            {
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                sats: 2314n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1723372560,
        size: 255,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 857308,
            hash: '000000000000000020801fb91e3685a03a8d8f967cd048f58059bda0800a8402',
            timestamp: 1723373699,
        },
        parsed: {
            xecTxType: 'Sent',
            satoshisSent: 550,
            stackArray: [
                '61757468',
                '0644ad85a538657c033e36ce5a3c8cf26076591f',
            ],
            recipients: ['ecash:qzeq9xxpkht2s2np7myv6uy04papecdf0g0zly33v5'],
        },
    },
    sendingHash: '14582d09f61c6580b8a2b6c8af8d6a13c9128b6f',
    parsed: {
        appActions: [{ isValid: true, lokadId: '61757468', app: 'Auth' }],
        parsedTokenEntries: [],
        recipients: ['ecash:qzeq9xxpkht2s2np7myv6uy04papecdf0g0zly33v5'],
        satoshisSent: 550,
        stackArray: ['61757468', '0644ad85a538657c033e36ce5a3c8cf26076591f'],
        xecTxType: 'Sent',
    },
};

export const MsgFromEcashChat = {
    tx: {
        txid: 'a3b3e23eb564920c10b1b6278a1e00dcec0c8b1593fc0d7f2e514cf20416255c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5eff401088014f551d5fce6340d9fa09ff3082b58cf5a3d8e20c5c14a0b4200e',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100b7af7b05bb2fd4c743724175ddb4ed00030954f35adabe5e4dd77c1cb3125a7e02204186b77fcb0ce296a2ece2a0aa942933401bc269ea19f85434cdffe21bfea85d412103def4b1f77431c9825632ac5da7433b6eaa5281a90aabd9b597af4f16f6cccf51',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                sats: 3000n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04636861741a68656c6c6f2066726f6d206543617368204368617420f09f918d',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                sats: 1000n,
            },
            {
                outputScript:
                    '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                sats: 1461n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1711788850,
        size: 268,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    },
    parsed: {
        satoshisSent: 1000,
        xecTxType: 'Received',
        stackArray: [
            '63686174',
            '68656c6c6f2066726f6d206543617368204368617420f09f918d',
        ],
        appActions: [
            {
                action: {
                    msg: 'hello from eCash Chat 👍',
                },
                isValid: true,
                lokadId: '63686174',
                app: 'eCashChat',
            },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y'],
        replyAddress: 'ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y',
    },
};
export const offSpecEcashChat = {
    tx: {
        ...MsgFromEcashChat.tx,
        outputs: [
            {
                ...MsgFromEcashChat.tx.outputs[0],
                outputScript: '6a0463686174',
            },
            ...MsgFromEcashChat.tx.outputs.slice(1),
        ],
    },
    parsed: {
        appActions: [{ app: 'eCashChat', isValid: false, lokadId: '63686174' }],
        parsedTokenEntries: [],
        recipients: ['ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y'],
        replyAddress: 'ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y',
        satoshisSent: 1000,
        stackArray: ['63686174'],
        xecTxType: 'Received',
    },
};

export const SlpV1Mint = {
    tx: {
        txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    outIdx: 2,
                },
                inputScript:
                    '473044022038242777df76cf81fea627fad7c8a4f67ddb2dd68defcdb8d45dbc7e0f90c62102206f5c9a5b79f10cb6ac93d46a084666b810d12871c02182f9097b1ac72643dab6412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: true,
                    entryIdx: 0,
                    atoms: 0n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '89b922392753498ea1c6f8f29c9c9c2d7768fcaa36c34b931dbdcedf094cd283',
                    outIdx: 0,
                },
                inputScript:
                    '47304402206d2c4bada7e705e12f7e8e21b2bfb7a6cf0b02dcb7ffc6b21f1a866dc0e7c7a10220667c1d970506cdae180a78888cf10cf9ada6800b4db22f06a8f4ae5c40aeea16412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 3300n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c50000101044d494e5420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10102080000000000000064',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 100n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: true,
                    entryIdx: 0,
                    atoms: 0n,
                },
                spentBy: {
                    txid: 'dd9018d0037fee4094c2445b23ed9eef65d456db3f2b9c053ad39ee6505fca44',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 2280n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1711861819,
        size: 472,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'MINT',
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
            height: 838323,
            hash: '000000000000000011466b30b743ea02424347838273e890d6a9f1afbc16f66e',
            timestamp: 1711868662,
        },
    },
    parsed: {
        satoshisSent: 3372,
        stackArray: [
            '534c5000',
            '01',
            '4d494e54',
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
            '02',
            '0000000000000064',
        ],
        xecTxType: 'Sent',
        recipients: [],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'MINT',
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenSatoshis: '100',
            },
        ],
    },
};

export const agoraAdSetupTxSlpNft = {
    tx: {
        txid: '972fd1322542740835a3f7e6d0917e5ac1ab6f20c5bfb40edbfb4ca73a144194',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c886d9d73b0c2592fb2df95cf0bb832c8077ff8adec132ee3cff5ba576f4ed1e',
                    outIdx: 1,
                },
                inputScript:
                    '419d3ac0b32abebc181c55e5a45c25d5050f73ba1269348829f4d5677131e3c627f73a552bf003de5d86423ce3f47fd4fd116eba837be72a3cef6f002158b0482a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
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
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '03672250bda1410ffa9b1c2cf3dc8c456bcb7a54e8dff0a7686bcce6ba82cf1b',
                    outIdx: 2,
                },
                inputScript:
                    '41f444904158cb70106321dc09161d7bf3dde584e541c73d21f46a19c176c10e1c3ea79252e52878a0f11f5c6b896d8adc5c75d1c6039e750c31ab07114d2f3bca412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 1748n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000001',
                sats: 0n,
            },
            {
                outputScript: 'a91463b7313157fb1d054919364c837d8af927fa569987',
                token: {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
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
                    txid: 'c7fe7ac1f29c34e0795786b609622f6439cfde52246f31cba89aa0b28c8542ee',
                    outIdx: 0,
                },
                sats: 860n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 1012n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729632267,
        size: 422,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
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
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 867731,
            hash: '000000000000000023e84eda63a1c6cce9c8e1d8b6484ee3dba0bf13b38d9116',
            timestamp: 1729632495,
        },
    },
    parsed: {
        satoshisSent: 860,
        stackArray: [
            '534c5000',
            '41',
            '53454e44',
            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            '0000000000000001',
        ],
        xecTxType: 'Sent',
        recipients: ['ecash:pp3mwvf32la36p2frymyeqma3tuj07jknyhljj09qd'],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'NFT',
                renderedTxType: 'Agora Offer',
                tokenId:
                    'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                tokenSatoshis: '1',
            },
        ],
    },
    // 1 Nile Kinnick
    cache: [
        [
            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                timeFirstSeen: 1713828197,
                genesisInfo: {
                    tokenTicker: 'NK',
                    tokenName: 'Nile Kinnick',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: 'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                },
                block: {
                    height: 841418,
                    hash: '000000000000000015c94349a2ec777da460e8d8d48a220bbf9d6a6e6e9df66f',
                    timestamp: 1713829166,
                },
                genesisSupply: '1',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
            },
        ],
    ],
};

// 8880046b7b34da75f405abf8e76237082ed83f6a6293b378f83629320bf57097
// buy from 76458db0ed96fe9863fc1ccec9fa2cfab884b0f6
// sale for 95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d
export const agoraOneshotBuyTx = {
    tx: {
        txid: '8880046b7b34da75f405abf8e76237082ed83f6a6293b378f83629320bf57097',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c7fe7ac1f29c34e0795786b609622f6439cfde52246f31cba89aa0b28c8542ee',
                    outIdx: 1,
                },
                inputScript:
                    '2102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd879540c4da30dce1304b58ad7e2b8f87729d2b7c5f7c2390e8bbc33bebcc7c80503c992801df01dad963adb737892e0d3499875b99477f65786c45e9146610a219fe104c5aee42858cb2a09aa8cb316f2452decf39642f6209b6865779e0349cf2c17afec70100000001ac2202000000000000ffffffffc996989ea840ccd9e2f0324dc0accbe26a32c3c8bd5d710ce18f68acaafdb3d300000000c10000004422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac7a3d160c000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac514cb0634c6b0000000000000000406a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df30800000000000000000800000000000000013ea74b04000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba668abac',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1n,
                },
                outputScript: 'a914dec4855b83573e56312d9f3852697a48c09ee6b087',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: 'd8a564b6aa82861ea16864ef83d0ec81ecf8cb13c0a59c2737a444c7b880368d',
                    outIdx: 3,
                },
                inputScript:
                    '414964793d1de39477192d9ee1491c49973303b18b594b249cfb0b9b752826f0ccc9da5ebf1dde9de63f5e5825b3e7257f48e1310920e30e28e83beada1f21be58412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 19360n,
            },
            {
                prevOut: {
                    txid: '4fdcf99a029298ca1e3a692c4485711d22e7eb6aeb76d58354666e0a87260a4a',
                    outIdx: 1,
                },
                inputScript:
                    '41c60f1f0f70dd45780f5b5a48e7e8e823ab04ae5f2b652c68d36856d7999e65423c88f4315bde6eeebe1c263e27b5275453a52c33962eddd704ec63330482cbde412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 11007n,
            },
            {
                prevOut: {
                    txid: '9191385318562f9b9491cb51dd336054ff48086effdb603ce4d070ec27b0a310',
                    outIdx: 1,
                },
                inputScript:
                    '418a65da44dc054c90c718cafe5a8eb1a58a40f1c2864a356152eadb6ad439f66f7e457f09821fb53b07bd50d68baa64abed6134f98d18c2da4050496c54341a4c412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 5235n,
            },
            {
                prevOut: {
                    txid: 'e85c851664f633ac3888908be544d379b6a300ecd7e3ba3b7d8895ff4bcd2907',
                    outIdx: 1,
                },
                inputScript:
                    '41db37e18dda29041f7f931bb895777ec8bea1f6341dc48a144a2deac2545519892c19c050bfe8eb32143a5860ef4343079cb0b6705f2b72e8555f3b96badd3e82412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 4201n,
            },
            {
                prevOut: {
                    txid: '2bec8ef2b93a4cc859d2b5eef36516d5e559ed6c8ba14437ebd910d7110e8e7b',
                    outIdx: 2,
                },
                inputScript:
                    '41f5ad3937e27b09550dfac33838bb0acfe61bf69378c3fbd6fb145ce48cf0cd9fc7e2b4abfcb17616dedecd33e84a860c5f2ceea50ea0e59a59e7fa4e87b478ce412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 19901n,
            },
            {
                prevOut: {
                    txid: '528fc61b8fe7131dcba81c99a4604c409aafe6faaf4286e21da07cae92bdf586',
                    outIdx: 2,
                },
                inputScript:
                    '41346e924f1a559129de3bb6f8bfb9358aae0401ab6dcc49c9e974bed7b94b246f001ec19ed7c682d945426882abce9f5bebdd984845b2c127c0f2549fcee5aec9412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 12964n,
            },
            {
                prevOut: {
                    txid: '5963aebb41910aee8014cbbf2e2fb487dcbecb8b4a66b26e07f5b6542355bbf7',
                    outIdx: 1,
                },
                inputScript:
                    '41f5295566cdf6a64102474a4cf1a90c0be1f734a01a7c553d28d79543de93991633b67473c7cd859f14f4682942ea08b8f399abc3d9aba4d3017931ae61f677d4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 274781657n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000000080000000000000001',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 72066878n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
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
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 202784122n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729713477,
        size: 1654,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
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
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
    },
    sendingHash: '76458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
    parsed: {
        recipients: ['ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'],
        satoshisSent: 72066878,
        stackArray: [
            '534c5000',
            '41',
            '53454e44',
            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            '0000000000000000',
            '0000000000000001',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'NFT',
                renderedTxType: 'Agora Buy',
                tokenId:
                    'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                tokenSatoshis: '1',
            },
        ],
    },
    cache: agoraAdSetupTxSlpNft.cache,
};
export const agoraOneshotSaleTx = {
    tx: agoraOneshotBuyTx.tx,
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
    parsed: {
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'NFT',
                renderedTxType: 'Agora Sale',
                tokenId:
                    'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                tokenSatoshis: '1',
            },
        ],
        recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
        replyAddress: 'ecash:pr0vfp2msdtnu4339k0ns5nf0fyvp8hxkqxcuyfhrp',
        satoshisSent: 72066878,
        stackArray: [
            '534c5000',
            '41',
            '53454e44',
            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            '0000000000000000',
            '0000000000000001',
        ],
        xecTxType: 'Received',
    },
    cache: agoraOneshotBuyTx.cache,
};

// e9d594e054bf9a7cead11cdc31953f0e45782c97c6298513f41b70eb408aa1a8
export const agoraPartialCancelTx = {
    tx: {
        txid: 'e9d594e054bf9a7cead11cdc31953f0e45782c97c6298513f41b70eb408aa1a8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '58ec58688cef1d0abe2ee30c15f84af51833e61e998841fac3ecbcadafc31233',
                    outIdx: 2,
                },
                inputScript:
                    '41fd18138ab17386e9599e54d9d5f1994d1c4add3af860b1ece44b71d04bc7e7cd799e1234e2959236cd38558713d7fdb797a894c527906b0235a38519ad63fbea4121024f624d04900c2e3b7ea6014cb257f525b6d229db274bceeadbb1f06c07776e82',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                sats: 975251n,
            },
            {
                prevOut: {
                    txid: '0c580a7dbfb7f160f0e4623faa24eb0475b2220704c8c46f279a479a477433f8',
                    outIdx: 1,
                },
                inputScript:
                    '0441475230075041525449414c4113bb98283dc7a2f69957940bb3a45f4ec6050b61bcc1b1134d786727e379c8793107bf0d0b0e051665ab3eed2cca34901646cf564a1ab52cb32668da229eef0b41004d5f014c766a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8080000000000000000030276a4000000000000e815000000000000a24a2600000000004b4a343a024f624d04900c2e3b7ea6014cb257f525b6d229db274bceeadbb1f06c07776e8208948eff7f00000000ab7b63817b6ea2697603a24a26a269760376a4009700887d94527901377f75789263587e780376a400965580bc030000007e7e68587e52790376a400965580bc030000007e7e825980bc7c7e0200007e7b02e7159302e8159656807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702dd007f5c7f7701207f547f75044b4a343a886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 855738679296n,
                },
                outputScript: 'a914cb61d733f8e99b1b40d40a53a59aca8a08368a6f87',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f808000000c73e000000',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 855738679296n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                sats: 973723n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729789538,
        size: 760,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 867971,
            hash: '000000000000000013f3d459ae121dc1494e7e9fe57c2e60cf393184d7ab6dc9',
            timestamp: 1729793460,
        },
    },
    parsed: {
        recipients: [],
        satoshisSent: 974269,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            '000000c73e000000',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'Agora Cancel',
                tokenId:
                    '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                tokenSatoshis: '855738679296',
            },
        ],
    },
    cache: [
        [
            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'VSP',
                    tokenName: 'Vespene Gas',
                    url: 'https://simple.wikipedia.org/wiki/StarCraft#Gameplay',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: 0,
                genesisSupply: '3000000000.000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 763087,
                    hash: '0000000000000000015abcebc15e74036598855a9fdd976868ad99bb23b87a89',
                    timestamp: 1666631359,
                },
            },
        ],
    ],
};

// 3ada11ca38e5da8bfda9b045ab7412cecff5b788aad8e49673183010e725099e
export const partialBuyBull = {
    tx: {
        txid: '3ada11ca38e5da8bfda9b045ab7412cecff5b788aad8e49673183010e725099e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '20469a4316506e0fea99ad0673d6663f2f546c0aad84b741e08c4d0f9248b18c',
                    outIdx: 1,
                },
                inputScript:
                    '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404799ed59b763768b8e7385a35c0a357e624e1725154d4c3240f38edc021527b267881f2078be11f89221f6c8036c156274742dae00ce8a88bb6ee527bc18dc744422020000000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d420100000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d32018cb148920f4d8ce041b784ad0a6c542f3f66d67306ad99ea0f6e5016439a462001000000d97b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffca3033eea929796cc020b87c909e38d37943502aa69486f2d97d56daa454e28df3282c4ec1000000046de4ff17514d5b014c766a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f89608000000000000000000013b62100000000000298f0000000000006de4ff1700000000f3282c4e03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba608f06cff7f00000000ab7b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 2000n,
                },
                plugins: {
                    agora: {
                        groups: [
                            '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        ],
                        data: [
                            '5041525449414c',
                            '00',
                            '01',
                            '3b62100000000000',
                            '298f000000000000',
                            '6de4ff1700000000',
                            'f3282c4e',
                        ],
                    },
                },
                outputScript: 'a914563178ea073228709397a2c98baf10677e683e6687',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: 'bfce47f2403031f5465982b821e8e14c78deff2dd5986ca0c21cebb5ed946b4d',
                    outIdx: 2,
                },
                inputScript:
                    '41866f21d34e5b061cf7cb9ce4a6ce4df037628b72765db893675eae909ddad9d7ea7593d1a510fee1d80887699410b4330e9214efd5668dd51644d7ffce498ac94121039f0061726e4fed07061f705d34707b7f9c2f175bfa2ca7fe7df0a81e9efe1e8b',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                sats: 2898252n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896080000000000000000080000000000000659080000000000000177',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '5d934ade992707fe126bcd393ad4358b2c10118b635df4b97e3e3f30ca7cc781',
                    outIdx: 1,
                },
                sats: 2812672n,
            },
            {
                outputScript: 'a91451d609999740085f16cfbee2f9791d6ae6ac678d87',
                plugins: {
                    agora: {
                        groups: [
                            '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        ],
                        data: [
                            '5041525449414c',
                            '00',
                            '01',
                            '3b62100000000000',
                            '298f000000000000',
                            '6de4ff1700000000',
                            'f3282c4e',
                        ],
                    },
                },
                token: {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1625n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                token: {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 375n,
                },
                spentBy: {
                    txid: 'f0e450b41d1c15b32478efb668bc562fa341a40fa799db7747228350295f84d4',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                spentBy: {
                    txid: '3a7a8971392e74fd542498c055509ace4f4853b981d87d73ba045f77100dad1e',
                    outIdx: 1,
                },
                sats: 82509n,
            },
        ],
        lockTime: 1311516915,
        timeFirstSeen: 1730860384,
        size: 1256,
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
            height: 869782,
            hash: '0000000000000000178954cd24752cd8fb8aa980c36012a16cec251d8c2f68d6',
            timestamp: 1730861016,
        },
    },
    sendingHash: '2aba37d6365d3e570cadf3ed65e58ae4ad751a30',
    parsed: {
        recipients: [
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            'ecash:ppgavzvejaqqshcke7lw97ter44wdtr835rs9eedxc',
        ],
        satoshisSent: 2813218,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            '0000000000000000',
            '0000000000000659',
            '0000000000000177',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'Agora Buy',
                tokenId:
                    '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                tokenSatoshis: '375',
            },
        ],
    },
    cache: [
        [
            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'BULL',
                    tokenName: 'Bull',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: 0,
                genesisSupply: '21000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 835482,
                    hash: '0000000000000000133bf16cb7fdab5c6ff64a874632eb2fe80265e34a6ad99f',
                    timestamp: 1710174132,
                },
            },
        ],
    ],
};

export const partialSellBull = {
    tx: partialBuyBull.tx,
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88',
    parsed: {
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'Agora Sale',
                tokenId:
                    '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                tokenSatoshis: '375',
            },
        ],
        recipients: [
            'ecash:ppgavzvejaqqshcke7lw97ter44wdtr835rs9eedxc',
            'ecash:qq4t5d7kxewnu4cv4he76e093tj26ag6xql82hcgru',
        ],
        replyAddress: 'ecash:pptrz782quezsuynj73vnza0zpnhu6p7vcj7g5qlfr',
        satoshisSent: 2812672,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            '0000000000000000',
            '0000000000000659',
            '0000000000000177',
        ],
        xecTxType: 'Received',
    },
    cache: partialBuyBull.cache,
};

// 1e68af94c0117223511e3d7f7b6f0f6c2ffa07972844ff6d04f7f37d36ad5b50
export const agoraPartialCancelTwo = {
    tx: {
        txid: '1e68af94c0117223511e3d7f7b6f0f6c2ffa07972844ff6d04f7f37d36ad5b50',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'ea28b2d3db0d4972eb56f2f20473fe821a6d46f328ecc5e97c4c3e353ff22a52',
                    outIdx: 3,
                },
                inputScript:
                    '415ece5326f001de92ce37d34b6ada073c3f60b52231b8291e1d4900c4813b93379dfc3e11ed417c58fce9fc1ead27b5754d4d2c8ff3d6949e694a9529afea0f4c412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 661543961n,
            },
            {
                prevOut: {
                    txid: '44aa224b6eb5058717d1403d7376ef48e0eae2e4065303f0f9452782aad9f541',
                    outIdx: 2,
                },
                inputScript:
                    '0441475230075041525449414c4195484212249b53096fa43b1dc39559f9671cd305b4715c063c486b2fc30eec194685f027c560742da8746b61aacfb05dd039d8e519fa7ca065d7fe3188fa63df41004d5a014c766a04534c500001010453454e4420b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc0800000000000000000001f588410000000000f980000000000000f588410000000000bbbcb84f03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba608bbd1b77e00000000ab7b63817b6ea2697603f58841a2697603f588419700887d94527901377f75789263587e7803f58841965880bc007e7e68587e527903f58841965880bc007e7e825980bc7c7e01007e7b03f880009303f980009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d8007f5c7f7701207f547f7504bbbcb84f886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 495n,
                },
                outputScript: 'a914b069fa99f084a259a6a31cc8cf33edb8a853fbb587',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e4420b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc0800000000000001ef',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 495n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 661543206n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729825975,
        size: 755,
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
    },
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
    parsed: {
        recipients: ['ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'],
        satoshisSent: 0,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
            '00000000000001ef',
        ],
        xecTxType: 'Received',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'Agora Cancel',
                tokenId:
                    'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                tokenSatoshis: '495',
            },
        ],
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    },
    cache: [
        [
            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CTD',
                    tokenName: 'Cashtab Dark',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: 0,
                genesisSupply: '10000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 726043,
                    hash: '00000000000000000182db32e000171006b7b7820181676b5fd8f29cc90d2b9c',
                    timestamp: 1644455332,
                },
            },
        ],
    ],
};

// Canceling an agora oneshot NFT listing slp1
// a57b6b00b328f0c6a916f6469dcc4e05ab202e7eca82f4cda5dbd736064910d9
export const AgoraOneshotCancelTx = {
    tx: {
        txid: 'a57b6b00b328f0c6a916f6469dcc4e05ab202e7eca82f4cda5dbd736064910d9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '9dad6def1241cea3ef1942e53ed0a34163da41fc726feb304fbd4d27482ce063',
                    outIdx: 1,
                },
                inputScript:
                    '419b8ec92ca5701691d9f5e75d525532cbec6ed9d9ed81f8f982b5af76090289d001ce2022ec82ba096c99beb00b0d9b0a92f2ef8da269a7967e6856170796beac41004cb0634c6b0000000000000000406a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df308000000000000000008000000000000000164594e05000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd879568abac',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1n,
                },
                outputScript: 'a91451a5d608ff31c1585d7aba3a2afcd2ae02898abd87',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '9cf904c798295bfee43670162dc816e25d129ae9a0b13a41f11560cf7dbbb5b8',
                    outIdx: 3,
                },
                inputScript:
                    '41ccbca2638a68145ecc38c8a96c058dff2619b8d495360e0b5866de555f1c6b621ef147df1a9e0f5bee006d1db94e1e2670915265d38f3ba801114037ed0d441d412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 1153n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000001',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
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
        ],
        lockTime: 0,
        timeFirstSeen: 1729720346,
        size: 535,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
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
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
    },
    parsed: {
        recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
        satoshisSent: 0,
        stackArray: [
            '534c5000',
            '41',
            '53454e44',
            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            '0000000000000001',
        ],
        xecTxType: 'Received',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'NFT',
                renderedTxType: 'Agora Cancel',
                tokenId:
                    'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                tokenSatoshis: '1',
            },
        ],
        replyAddress: 'ecash:ppg6t4sglucuzkza02ar52hu62hq9zv2h5jjktp2kp',
    },
    cache: agoraAdSetupTxSlpNft.cache,
};

// 6c6b32e7d68f5743dceec779c61ebe45dc1e8ca7562821ae974c71ef8d2450a7
export const agoraPartialBuxBuyTx = {
    tx: {
        txid: '6c6b32e7d68f5743dceec779c61ebe45dc1e8ca7562821ae974c71ef8d2450a7',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'f696ae69fb2d7f7253f1fc98aba1a6312c92e98dd691d9825f633aaf7b0f2417',
                    outIdx: 1,
                },
                inputScript:
                    '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1400c2c91f9168505022957e651ce0d876ec90a483dec8eb83f9a2897cd0b1640962dcab03e0df52f086db75351d10c01386ff2dcf4e774ee09b5dcf6b96ced6b254422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688acc5728209000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac4d280117240f7baf3a635f82d991d68de9922c31a6a1ab98fcf153727f2dfb69ae96f601000000cf7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffb0f7a847759b44cb4dd22554924cf5dae4d946b5aa04372b20eb218d43210b4243840647c10000000422ad0024514d51014c766a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50800000000000000000000c6100000000000000e0000000000000060368f020000000043840647037f1729ee682b22da2b5dd8a11779ec7b80739c4b5d4b48f83c35d83fbb40a21208c09ef87f00000000ab7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 500000n,
                },
                outputScript: 'a9149c2c40a0a571b35e2e6cca5c224d0c948096a36b87',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '20d870129eab4418cf8917731ba9f240d5ac6a938d0570af2912f3ed77162d34',
                    outIdx: 2,
                },
                inputScript:
                    '41fb428d1c14340d4ef10c55202db803232018f0ae41777503c4a9cb78b4659fad4540f27314c74b9247a1c88937c5594ef908f5e916dddd5b054f290c5a8807a4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 32055n,
            },
            {
                prevOut: {
                    txid: '2cd92dbce9696b704ae7235e31d0840d728ad11217631dee849d49624f91ffd4',
                    outIdx: 0,
                },
                inputScript:
                    '4102e2c50dc6e3c3d8151c950075bc997dbe4762b1c59bcbe3cdd124566d1925bcecb466d21d32133b68fb8579b79e538f4b8dd61832374f2f713f328c3fc850ab412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 3300n,
            },
            {
                prevOut: {
                    txid: '874d3ddb44d022952d3686d39d219c7fdf21327eaa852d2d249102bec026ec4a',
                    outIdx: 3,
                },
                inputScript:
                    '412f68bc4b72f9df1435d4046719b793556295fbe02d80c8752acf587afac49d09f160ba04f2dfd5c1fa9ae5e294e31d5b8efc331074cefa08bfe7e2106e46b34a412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 202656827n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5080000000000000000080000000000057ba508000000000002257b',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                sats: 43144579n,
            },
            {
                outputScript: 'a914502ed21ca74bde03d7fb672ed9c996eab92e72fd87',
                token: {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 359333n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 140667n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '40c5a257a9797bf9cb44f0f1fe7ee08d732a151c70f1a038487bac4a431b7787',
                    outIdx: 1,
                },
                sats: 159544005n,
            },
        ],
        lockTime: 1191609411,
        timeFirstSeen: 1729812060,
        size: 1518,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
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
            height: 867988,
            hash: '000000000000000029b0040b966ade65e7217457758ef4c1a9f524bacc30baf5',
            timestamp: 1729813559,
        },
    },
    sendingHash: '76458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
    parsed: {
        recipients: [
            'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
            'ecash:ppgza5su5a9auq7hldnjakwfjm4tjtnjl54xmlf83s',
        ],
        satoshisSent: 43145125,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
            '0000000000000000',
            '0000000000057ba5',
            '000000000002257b',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'Agora Buy',
                tokenId:
                    '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                tokenSatoshis: '140667',
            },
        ],
    },
    cache: [
        [
            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'BUX',
                    tokenName: 'Badger Universal Token',
                    url: 'https://bux.digital',
                    decimals: 4,
                    hash: '',
                },
                timeFirstSeen: 0,
                genesisSupply: '0.0000',
                genesisOutputScripts: [
                    'a91420d151c5ab4ca4154407626069eaafd8ce6306fc87',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 726564,
                    hash: '000000000000000010ea35897b2b7373261fdfbca3d02e4f9a6eeb79dc914315',
                    timestamp: 1644797123,
                },
            },
        ],
    ],
};

export const agoraPartialBuxSellTx = {
    tx: agoraPartialBuxBuyTx.tx,
    sendingHash: 'dee50f576362377dd2f031453c0bb09009acaf81',
    parsed: {
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'Agora Sale',
                tokenId:
                    '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                tokenSatoshis: '140667',
            },
        ],
        recipients: [
            'ecash:ppgza5su5a9auq7hldnjakwfjm4tjtnjl54xmlf83s',
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
        ],
        replyAddress: 'ecash:pzwzcs9q54cmxh3wdn99cgjdpj2gp94rdvy2wuu50y',
        satoshisSent: 43144579,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
            '0000000000000000',
            '0000000000057ba5',
            '000000000002257b',
        ],
        xecTxType: 'Received',
    },
    cache: agoraPartialBuxBuyTx.cache,
};

export const SlpNftParentMintTx = {
    tx: {
        txid: 'af8d9508e488e7c9462cb9bb9d9b68f246cec6394676d1f660331bfe1f4e1fd2',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                    outIdx: 2,
                },
                inputScript:
                    '413bcbae418f71ecbc9b5a2ecbe9d7d7bd61a7473399ccfe4176e62fe51fe4cdba2dc8cb42088207ee4daf8c4a618e7e4a9773f969e681c8e2b552b13fc8ddc8e8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: true,
                    entryIdx: 0,
                    atoms: 0n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '607b7bb1a4d95efbeee42d98fc7b3b2fd3ed3dcfc6aea192f56839b405982889',
                    outIdx: 2,
                },
                inputScript:
                    '41f5fe8b075e9f9ab3b3c69b8e5621c9de49c4daffb698097149bdb57f4d472e0d1a9692df4d07ec64d4102c10a76bdc6bc6ef9df630061b34a1d19f50f1e97ef4412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 71580707n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c50000181044d494e54205a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f86200102080000000000000001',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
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
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: true,
                    entryIdx: 0,
                    atoms: 0n,
                },
                spentBy: {
                    txid: '5d934ade992707fe126bcd393ad4358b2c10118b635df4b97e3e3f30ca7cc781',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 71579701n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1730953527,
        size: 460,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'MINT',
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
            height: 869927,
            hash: '00000000000000001d5912840b0d830c3d491f273b15ac9f5bcd0234456dfb5a',
            timestamp: 1730954146,
        },
    },
    sendingHash: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    parsed: {
        recipients: [],
        satoshisSent: 71580793,
        stackArray: [
            '534c5000',
            '81',
            '4d494e54',
            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
            '02',
            '0000000000000001',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'Collection',
                renderedTxType: 'MINT',
                tokenId:
                    '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                tokenSatoshis: '1',
            },
        ],
    },
    cache: [
        [
            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                genesisInfo: {
                    tokenTicker: 'MASCOTS',
                    tokenName: 'Mascots',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '2d0f7be21838551f43872cddda2213659f6603d0aec566dd8f917e49e172f27d',
                },
                timeFirstSeen: 1716324228,
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 845656,
                    hash: '00000000000000001c7f33318a0ac58f2256696b302c2047ab73315943c0c6d7',
                    timestamp: 1716327571,
                },
            },
        ],
    ],
};

// 29b79f0f4302c43f6e6dd565e7e5829cf7f8a8fe1e95a58e3e87620a24c5bef9
export const alpBurnTx = {
    tx: {
        txid: '29b79f0f4302c43f6e6dd565e7e5829cf7f8a8fe1e95a58e3e87620a24c5bef9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '061459eea0e569392f0622c20e5917b5ca94ae38a77405cd3a5f01b41bba688b',
                    outIdx: 2,
                },
                inputScript:
                    '41eed3688821e81f77edcf70e877d6b270acbd1714b82ea9b58fe0239e3dfccd73da5a1dd5d2906a40624d172e1a4273eda5e2feb902d74b73e264f9ef469c0a99412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 99999n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: 'efb84d4aa3aec5636ae5fcbbc560d4c1bafbe1e9ed00661380bce4a9db2360e0',
                    outIdx: 1,
                },
                inputScript:
                    '41bfbaae1e96b3a3d7fbbe24c2cd9ac07e48b7340e24635a8005be1b94563bc0e020d073d8a88e9af4a5a067ff9dcd6601f35611399d70f2958ff7ce22770792a7412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 2812672n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a5030534c503200044255524e3f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101000000000031534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11019e8601000000',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 99998n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 2812202n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1732374561,
        size: 470,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 1n,
                intentionalBurnAtoms: 1n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 872299,
            hash: '000000000000000022478fad1745dbd1c8f57ad77b6627ba459720c2653cd086',
            timestamp: 1732375055,
        },
    },
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
    parsed: {
        recipients: [],
        satoshisSent: 2812748,
        stackArray: [
            '50',
            '534c503200044255524e3f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11010000000000',
            '534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11019e8601000000',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'BURN',
                tokenId:
                    '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                tokenSatoshis: '1',
            },
        ],
    },
    cache: [
        [
            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
            {
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                genesisInfo: {
                    tokenTicker: 'TB',
                    tokenName: 'Tiberium',
                    url: 'cashtab.com',
                    decimals: 0,
                    authPubkey:
                        '03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                },
                timeFirstSeen: 1732368999,
                genesisSupply: '100000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 872286,
                    hash: '00000000000000000714f249ab1ecd41eef595260c4f9e79fa49e7dc1bd45767',
                    timestamp: 1732369043,
                },
            },
        ],
    ],
};

// cf7f6c07bd838dbc7f7b05f5f879d498789d087e6c76dde91fdedeb802230587
export const alpAgoraListingTx = {
    tx: {
        txid: 'cf7f6c07bd838dbc7f7b05f5f879d498789d087e6c76dde91fdedeb802230587',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '59a60227b112221130f11fd890100ba623944f8243cc8322e7f4c8fd17ab6ee2',
                    outIdx: 2,
                },
                inputScript:
                    '41063618b40515cc62f4c2802f4f76ae729cfe31351f419634560bff37fbb8fa3dce1efb084e12a5e983beb893e945854470f409c1ec1c8c48b2baf7f5d80cb5e1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 98082n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: 'cbded16a00885493d76e6534d932a58083f1918be220b8604897181c6b611609',
                    outIdx: 1,
                },
                inputScript:
                    '41c143430106e44093436317fb23c3eb96e453ea500e47ea4d1952fdb917c4423abc52a51f0163e193704c6879fd0ff005423ae60ff4f75c7ff234cb6d45ef0391412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1024n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a504b41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba631534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
                sats: 0n,
            },
            {
                outputScript: 'a91410596364db3336ec723ce7eaa296e7fa7dbe070687',
                plugins: {
                    agora: {
                        groups: [
                            '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            '54116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                            '46116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        ],
                        data: [
                            '5041525449414c',
                            '00',
                            '01',
                            'a454000000000000',
                            '9006000000000000',
                            'a454000000000000',
                            '6f678257',
                        ],
                    },
                },
                token: {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 99106n,
                },
                spentBy: {
                    txid: 'a6d65d619bbb03c4490498f7fe1d5413e92df064915a3533a09e8a4ba1762255',
                    outIdx: 1,
                },
                sats: 546n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1732642801,
        size: 461,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
            height: 872745,
            hash: '000000000000000017dce1ee0a66873715acd1987aa18d018cc94e2943c2608b',
            timestamp: 1732642958,
        },
    },
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
    parsed: {
        recipients: ['ecash:pqg9jcmymvendmrj8nn74g5kula8m0s8qce724yjtn'],
        satoshisSent: 546,
        stackArray: [
            '50',
            '41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
            '534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
        ],
        xecTxType: 'Sent',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'Agora Offer',
                tokenId:
                    '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                tokenSatoshis: '99106',
            },
        ],
    },
    cache: [
        [
            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
            {
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                genesisInfo: {
                    tokenTicker: 'TB',
                    tokenName: 'Tiberium',
                    url: 'cashtab.com',
                    decimals: 0,
                    data: [],
                    authPubkey:
                        '03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                },
                timeFirstSeen: 1732368999,
                genesisSupply: '100000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 872286,
                    hash: '00000000000000000714f249ab1ecd41eef595260c4f9e79fa49e7dc1bd45767',
                    timestamp: 1732369043,
                },
            },
        ],
    ],
};

export const paywallPaymentTx = {
    tx: {
        txid: 'e9692335fdb3b75f2e319cbda1396f7f32c02c3d172e58148abeb2952c7e2460',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100a58e1087f128d676d4b5839c795df15b88b87b47b0c8f382d39811ee5df21cf6022022727ede00178347e0ab0dd3df91959378c25a29f902a4f8b4f1c79ddd7cf15241210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                sats: 550n,
            },
            {
                prevOut: {
                    txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100856c2d015d7384a094d0c17dde0ec29ee37ddf64c914a6c1d12c9bd92724bc52022027d9f6525c49786e5454615e605d1af0aa4fa0860eea39e927316042ba3557f141210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                sats: 27419n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a0470617977204d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                spentBy: {
                    txid: '84d75fe93ab918e74e58c1a12a982d0cc8d1db1bb102f02068772723891711b3',
                    outIdx: 0,
                },
                sats: 15000n,
            },
            {
                outputScript:
                    '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                sats: 12056n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1716474827,
        size: 454,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 845901,
            hash: '00000000000000001da9291a7aa6fa8f9fa5f99413faa951e3f5777a082f911e',
            timestamp: 1716475087,
        },
        parsed: {
            xecTxType: 'Sent',
            satoshisSent: 27056,
            stackArray: [
                '70617977',
                '34643761363265626237663036666437613836663836313238303835336536666365336331313763373335393866653238343139303236306162643564646334',
            ],
            recipients: [],
        },
    },
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
    parsed: {
        appActions: [
            {
                action: {
                    sharedArticleTxid:
                        '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                },
                isValid: true,
                app: 'Paywall',
                lokadId: '70617977',
            },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew'],
        replyAddress: 'ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew',
        satoshisSent: 0,
        stackArray: [
            '70617977',
            '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
        ],
        xecTxType: 'Received',
    },
};
export const offSpecPaywallPaymentTx = {
    tx: {
        ...paywallPaymentTx.tx,
        outputs: [
            {
                ...paywallPaymentTx.tx.outputs[0],
                outputScript: '6a0470617977', // no data after the paywall lokad ID
            },
            ...paywallPaymentTx.tx.outputs.slice(1),
        ],
    },
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
    parsed: {
        appActions: [{ app: 'Paywall', isValid: false, lokadId: '70617977' }],
        parsedTokenEntries: [],
        recipients: ['ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew'],
        replyAddress: 'ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew',
        satoshisSent: 0,
        stackArray: ['70617977'],
        xecTxType: 'Received',
    },
};

/**
 * An ALP send tx to the firma minting address with
 * a solana receive address encoded in a separate EMPP push
 */
export const firmaRedeemTx = {
    tx: {
        txid: 'c2ca0b8669abda46688bf34ab6da313a03a2bfb56af99c4aad8c244fc25b6aaa',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '2dbb137fdb0bbff00b368892f7ef27c262ef2077cfcdfa74fc37f79b7225af14',
                    outIdx: 3,
                },
                inputScript:
                    '41e4b59e83b9117fe0700cf7637be60cbded713a8f0eaa09538d76f7ce46429ac29baddd682d106716e616fc6965562a471ce980423c379efd2f10177db701f7c1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 49920n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: 'c025a30635a0dcf09a286f1a8ba7994fe7f40d7272ff5eb1c6bb7d64b98f8f64',
                    outIdx: 0,
                },
                inputScript:
                    '412d017b40fe2eca6cfa6a78e9d9dfb9061250af3b7c41ca8dea00b312319d2b849d16a8bb01a400363c780d0fe60954313d61846c7c01fda331b1c2e594375e88412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 12852047n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302102700000000f09b0000000024534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
            },
            {
                sats: 546n,
                outputScript:
                    '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 10000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 39920n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 12851003n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1747169763,
        size: 498,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
        isFinal: true,
        block: {
            height: 896729,
            hash: '000000000000000013206bc393f6de124f937013b16456963f7156ba21e7bbf5',
            timestamp: 1747169847,
        },
    },
    sendingHash: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    parsedSend: {
        appActions: [
            {
                action: {
                    solAddr: '6JKwz43wDTgk5n8eNCJrtsnNtkDdKd1XUZAvB9WkiEQ4',
                },
                app: 'Solana Address',
                isValid: true,
                lokadId: '534f4c30',
            },
        ],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenSatoshis: '10000',
            },
        ],
        recipients: ['ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5'],
        satoshisSent: 546,
        stackArray: [
            '50',
            '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302102700000000f09b00000000',
            '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
        ],
        xecTxType: 'Sent',
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
        isFinal: true,
        token: {
            tokenId:
                'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
            tokenType: [],
            isMintBaton: false,
            atoms: 1n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'b35c502f388cdfbdd6841b7a73e973149b3c8deca76295a3e4665939e0562796',
            outIdx: 2,
        },
        blockHeight: 681191,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
            tokenType: [],
            isMintBaton: false,
            atoms: 1n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '7987f68aa70d29ac0e0ac31d74354a8b1cd515c9893f6a5cdc7a3bf505e08b05',
            outIdx: 1,
        },
        blockHeight: 685181,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
            tokenType: [],
            isMintBaton: false,
            atoms: 1n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '9e8483407944d9b75c331ebd6178b0cabc3e8c3b5bb0492b7b2256c8740f655a',
            outIdx: 1,
        },
        blockHeight: 709251,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
            tokenType: [],
            isMintBaton: false,
            atoms: 1000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '18c0360f0db5399223cbed48f55c4cee9d9914c8a4a7dedcf9172a36201e9896',
            outIdx: 1,
        },
        blockHeight: 717055,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
            tokenType: [],
            isMintBaton: false,
            atoms: 10n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '0bd0c49135b94b99989ec3b0396020a96fcbe2925bb25c40120dc047c0a097ec',
            outIdx: 1,
        },
        blockHeight: 726826,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '44929ff3b1fc634f982fede112cf12b21199a2ebbcf718412a38de9177d77168',
            tokenType: [],
            isMintBaton: false,
            atoms: 2n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '8f645ce7b231a3ea81168229c1b6a1157e8a58fb8a8a127a80efc2ed39c4f72e',
            outIdx: 1,
        },
        blockHeight: 727176,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
            tokenType: [],
            isMintBaton: false,
            atoms: 5000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '3703d46c5c52b0e55f3bd549e14c5617a47f802413f4acf7a27545437eb51a38',
            outIdx: 1,
        },
        blockHeight: 741200,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
            tokenType: [],
            isMintBaton: false,
            atoms: 100000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '40d4c93e82b82f5768e93a0da9c3c065856733d136876a90182590c8e115d1c4',
            outIdx: 1,
        },
        blockHeight: 757311,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
            tokenType: [],
            isMintBaton: false,
            atoms: 116n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
            outIdx: 2,
        },
        blockHeight: 758209,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
            tokenType: [],
            isMintBaton: false,
            atoms: 311n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '28428450ffa24dae7427ba8456fd5465b0da478fd183be845a27fdc0205df45f',
            outIdx: 1,
        },
        blockHeight: 758645,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            tokenType: [],
            isMintBaton: false,
            atoms: 4588000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '9a3522b610d153934b951cd6dd91676e5e4f3020531bd8a2e8015193c383029e',
            outIdx: 1,
        },
        blockHeight: 758887,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            tokenType: [],
            isMintBaton: false,
            atoms: 229400000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            outIdx: 1,
        },
        blockHeight: 759037,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            tokenType: [],
            isMintBaton: false,
            atoms: 7777777777n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'e3752bd648b2234957690ae408b08fe4eaf95912aa1b9790dc569c99e2a1f37a',
            outIdx: 1,
        },
        blockHeight: 759839,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            tokenType: [],
            isMintBaton: false,
            atoms: 229400000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
            outIdx: 1,
        },
        blockHeight: 760076,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            tokenType: [],
            isMintBaton: false,
            atoms: 123456789n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '8b8a15bbcc69df215ac45bab882d8f122f3e09405c3ac093d12cd2dd79a141ec',
            outIdx: 1,
        },
        blockHeight: 764737,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
            tokenType: [],
            isMintBaton: false,
            atoms: 1699n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '54cd8c25ff891a80f8276150244f052db7649a477eae2600ff17b49104258ee3',
            outIdx: 2,
        },
        blockHeight: 767640,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
            tokenType: [],
            isMintBaton: false,
            atoms: 99999998n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '9d2b752d3d0bb0b6ffeab531b8c3ca0b2af56c116ad13fe7e799b0ab96348b29',
            outIdx: 1,
        },
        blockHeight: 767649,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
            tokenType: [],
            isMintBaton: false,
            atoms: 100000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '7c75493d6e710173192ed1892273376ef54b755880cd5cb4aec3e2db309a1cce',
            outIdx: 2,
        },
        blockHeight: 768787,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
            tokenType: [],
            isMintBaton: false,
            atoms: 1n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'a4e4438f1e5d2c680c5ad877a9c2e75b5eea05f7fc8a17e0cdb348f315e7dc49',
            outIdx: 1,
        },
        blockHeight: 769675,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
            tokenType: [],
            isMintBaton: false,
            atoms: 200n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '019609426f88a9c2f13de980c7f7b2828c868fc6d53b1673421096b701ceae1a',
            outIdx: 2,
        },
        blockHeight: 770363,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            tokenType: [],
            isMintBaton: false,
            atoms: 9900n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '48ec9f7a4b7dfd5fbd419a70b748ded04e167778784e65a39c8edeb496b1f1de',
            outIdx: 1,
        },
        blockHeight: 770363,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
            tokenType: [],
            isMintBaton: false,
            atoms: 82n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '07646eddeaa7c97431f3cf62c7ba4714473f4c7a6611740b9cac5d86c00f9a38',
            outIdx: 2,
        },
        blockHeight: 770387,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            tokenType: [],
            isMintBaton: false,
            atoms: 9989n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'c39cd34c68ccb43cf640dd09f639c1e0b46d47224722ce5f26151ace40c663b3',
            outIdx: 2,
        },
        blockHeight: 772042,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
            tokenType: [],
            isMintBaton: false,
            atoms: 42300000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'd24e98159db1772819a76f1249f7190a9edb9924d0f7c5336b260f68b245a83a',
            outIdx: 2,
        },
        blockHeight: 774343,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
            tokenType: [],
            isMintBaton: false,
            atoms: 999882000000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'feafd053d4166601d42949a768b9c3e8ee1f27912fc84b6190aeb022fba7fa39',
            outIdx: 2,
        },
        blockHeight: 776118,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
            tokenType: [],
            isMintBaton: false,
            atoms: 999999878n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '886da7de5f0143c8be863962e7345ea615cee30caec7532824641d0fd40cc5f2',
            outIdx: 1,
        },
        blockHeight: 780736,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [],
            isMintBaton: false,
            atoms: 2n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '886da7de5f0143c8be863962e7345ea615cee30caec7532824641d0fd40cc5f2',
            outIdx: 2,
        },
        blockHeight: 780736,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [],
            isMintBaton: false,
            atoms: 23n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'ce95a91b9d7ddc6efc6273f70d398cb18aeafe99fd75de6301406786d4d8be54',
            outIdx: 2,
        },
        blockHeight: 780736,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [],
            isMintBaton: false,
            atoms: 65n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'c04ae7f139eb16023a70d1bb39b1ae8745667edb09833e994a5b4d48976a111d',
            outIdx: 2,
        },
        blockHeight: 782774,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
            tokenType: [],
            isMintBaton: false,
            atoms: 3n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'f2859d3d19e741bb40e9207cc1109db730ca69c458c6c204d14c2ebe7603c966',
            outIdx: 2,
        },
        blockHeight: 783389,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            tokenType: [],
            isMintBaton: false,
            atoms: 123456844n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'e71fe380b0dd838f4ef1c5bb4d5d33fc9d8932c3f9096211f6069805828e7f63',
            outIdx: 2,
        },
        blockHeight: 783638,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
            tokenType: [],
            isMintBaton: false,
            atoms: 8988n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'ff5f864cfe257905e18f1db2dfd7f31b483e0ecdfe9a91391d21dd44a28e1803',
            outIdx: 2,
        },
        blockHeight: 783638,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [],
            isMintBaton: false,
            atoms: 995921n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
            outIdx: 1,
        },
        blockHeight: 783693,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
            tokenType: [],
            isMintBaton: false,
            atoms: 100n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
            outIdx: 1,
        },
        blockHeight: 783694,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
            tokenType: [],
            isMintBaton: false,
            atoms: 100n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
            outIdx: 1,
        },
        blockHeight: 783695,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
            tokenType: [],
            isMintBaton: false,
            atoms: 100n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'c2c6b5a7b37e983c4e193900fcde2b8139ef4c3db2fd9689c354f6ea65354f15',
            outIdx: 2,
        },
        blockHeight: 784246,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
            tokenType: [],
            isMintBaton: false,
            atoms: 999998999n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '27dee7774fdf4d5a268e498e6d9665bff2251a7049ef71b6d5671f395d8bd694',
            outIdx: 1,
        },
        blockHeight: 784262,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: [],
            isMintBaton: false,
            atoms: 1n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '29793cfa3c533063211ad15f0567e6b815aab555aa8356388e2c96561d971644',
            outIdx: 2,
        },
        blockHeight: 784460,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
            tokenType: [],
            isMintBaton: false,
            atoms: 2100n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'f6090755d5dcf233c1cf749c1433eabc0fb0722601101e981df67d44219325e6',
            outIdx: 2,
        },
        blockHeight: 787547,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            tokenType: [],
            isMintBaton: false,
            atoms: 2998978719999999999n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'e4d80b015e75fe2e54b5ef10571ce78c17086f96a7876d466f92d8c2a8c92b64',
            outIdx: 2,
        },
        blockHeight: 792712,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            tokenType: [],
            isMintBaton: false,
            atoms: 999824n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '6ffcc83e76226bd32821cc6862ce9b363b22594247a4e73ccf3701b0023592b2',
            outIdx: 2,
        },
        blockHeight: 800716,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            tokenType: [],
            isMintBaton: false,
            atoms: 999977636n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'fb70df00c07749082756054522d3f08691fd9caccd0e0abf736df23d22845a6e',
            outIdx: 2,
        },
        blockHeight: 800716,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            tokenType: [],
            isMintBaton: false,
            atoms: 5235120528888890n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '8f6676b602a9f074f10a7561fb7256bbce3b103a119f809a05485e42489d2233',
            outIdx: 2,
        },
        blockHeight: 802851,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
            tokenType: [],
            isMintBaton: false,
            atoms: 75n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'b7f225b4c4e055a35c1e08ce5eea7c1f3cf53c44662d6d95b631504634b1a3d9',
            outIdx: 2,
        },
        blockHeight: 802851,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
            tokenType: [],
            isMintBaton: false,
            atoms: 652n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '8a172dd9cd9eda533cdc731449c4d8728ab1924b843e5d5d2eda63535f7473d4',
            outIdx: 2,
        },
        blockHeight: 803616,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
            tokenType: [],
            isMintBaton: false,
            atoms: 78n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '1127651ed9d822cd4ba3ff30211d064116575fdb692c1352e59cab841e8caf4d',
            outIdx: 2,
        },
        blockHeight: 803741,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
            tokenType: [],
            isMintBaton: false,
            atoms: 43n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'a490c805218091549b2d802d6f0391c880cacd5145d0c516f62433637e49bd15',
            outIdx: 1,
        },
        blockHeight: 824524,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            tokenType: [],
            isMintBaton: false,
            atoms: 330000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'f4f21422dbf0ad5fe455994ee4d791a9d2e127fdfb46aa87abc3c250312fbbd0',
            outIdx: 2,
        },
        blockHeight: 824524,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
            tokenType: [],
            isMintBaton: false,
            atoms: 24999698951n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'd7c43e4eb6d341ac69b52f89125887b17d00a16872c01a9d47b39fd4e55d50cf',
            outIdx: 1,
        },
        blockHeight: 825739,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
            tokenType: [],
            isMintBaton: false,
            atoms: 1000000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '2c791301f75284f8ae86707ab87f24f2394e4b92d81a4f59bed52b56eaf452e3',
            outIdx: 1,
        },
        blockHeight: 825842,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
            tokenType: [],
            isMintBaton: false,
            atoms: 5344445n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
            outIdx: 1,
        },
        blockHeight: 832625,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
            tokenType: [],
            isMintBaton: false,
            atoms: 1000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'a96f605eaf8b97889a73c5ee0e36597239f7fb17833a28076d2f3ca863f7ccfc',
            outIdx: 1,
        },
        blockHeight: 832788,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            tokenType: [],
            isMintBaton: false,
            atoms: 10000000000000000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '423e24bf0715cfb80727e5e7a6ff7b9e37cb2f555c537ab06fdc7fd9b3a0ba3a',
            outIdx: 1,
        },
        blockHeight: 833612,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            tokenType: [],
            isMintBaton: false,
            atoms: 10000000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '5167318214db9876a4095cae6d1d3b3e7a9af5467ee0e8344715ac12a2a871a9',
            outIdx: 1,
        },
        blockHeight: 834541,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
            tokenType: [],
            isMintBaton: false,
            atoms: 9899n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '8d0c0b705122e197e47c338f017bef3456ae27deb5da93aaf2da0d480d1cea49',
            outIdx: 2,
        },
        blockHeight: 835070,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [],
            isMintBaton: false,
            atoms: 3325n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            outIdx: 1,
        },
        blockHeight: 835482,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            tokenType: [],
            isMintBaton: false,
            atoms: 21000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'e93ea2ae7e4c7026e3fc55b431ff5c92173c5e24119c477981f1942e100be990',
            outIdx: 2,
        },
        blockHeight: 835635,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [],
            isMintBaton: false,
            atoms: 39n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'f18a297d1f2ab656ca284655704e07cf8ea269739f4d3af64c2dbd18bfe4d8ee',
            outIdx: 1,
        },
        blockHeight: 836041,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
            tokenType: [],
            isMintBaton: false,
            atoms: 94n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: 'f37027d1560c62a845d15025e418bdd1d0b127bf6fcfb83dfd9e872eb66d0d09',
            outIdx: 2,
        },
        blockHeight: 836041,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
            tokenType: [],
            isMintBaton: false,
            atoms: 4n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '2358817d41cf41568e7431c2b4eec8e0dc882f6db0fcf824b5bc4b80c522a358',
            outIdx: 1,
        },
        blockHeight: 836444,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [],
            isMintBaton: false,
            atoms: 22n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '583f0379a82249f86e1c19fef574ae3a499aa8d4b1980884ddf1c15d8bd50db3',
            outIdx: 1,
        },
        blockHeight: 836456,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
            tokenType: [],
            isMintBaton: false,
            atoms: 1n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '5b115c352a487503755bbb93582ff39e1095d698fa303c7dd31bbf19c4bbf39a',
            outIdx: 1,
        },
        blockHeight: 836457,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [],
            isMintBaton: false,
            atoms: 11n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '914827ddc2087db0e8ca8aed3c2a701f5873ea2f96f3837d6dce6f24ab53f854',
            outIdx: 1,
        },
        blockHeight: 836458,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [],
            isMintBaton: false,
            atoms: 1n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
            outIdx: 1,
        },
        blockHeight: 836820,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
            tokenType: [],
            isMintBaton: false,
            atoms: 55000000000n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '0b1f0ecfe27292fb9f7031400d27d42b15ff13950635333c1a2774ba6e7eaa83',
            outIdx: 1,
        },
        blockHeight: 837493,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
            tokenType: [],
            isMintBaton: false,
            atoms: 844601876543211n,
        },
        sats: 546n,
    },
    {
        outpoint: {
            txid: '2f9b8eca06f9e753769b450a2929d9956d70eee8047daf629591fc5ed29d8aa5',
            outIdx: 2,
        },
        blockHeight: 837494,
        isCoinbase: false,
        isFinal: true,
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: [],
            isMintBaton: false,
            atoms: 885n,
        },
        sats: 546n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91459b025ac71f8d6efc7e08fcad47cfab7c063c23a88ac',
                    sats: 7055848n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495302535402535415646576656c6f7065722e626974636f696e2e636f6d4c000100010208000000000000018f',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 399n,
                    },
                    spentBy: {
                        txid: '634ddf7468ff8fb493dcd1324f47452c0f668507863058182f861dce85a0dd1a',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
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
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    spentBy: {
                        txid: '691b1af9b93a91f6c1974269d3167bfe440f304c610e099ca5ce4d24da60afa1',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91459b025ac71f8d6efc7e08fcad47cfab7c063c23a88ac',
                    spentBy: {
                        txid: '634ddf7468ff8fb493dcd1324f47452c0f668507863058182f861dce85a0dd1a',
                        outIdx: 0,
                    },
                    sats: 7054427n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9148b416c67003eb796880cbc0ad08d5130774974bc88ac',
                    sats: 314238n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953035441501454686f756768747320616e6420507261796572734c004c00010001020800000000000f4240',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000n,
                    },
                    spentBy: {
                        txid: '29f125b70e67a336078e1e5ed87934da07d92a15e3a5884bc3efdee861327dc9',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
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
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914d74575d2af329d25f44863d6c50675d26ad440ac88ac',
                    spentBy: {
                        txid: '29f125b70e67a336078e1e5ed87934da07d92a15e3a5884bc3efdee861327dc9',
                        outIdx: 0,
                    },
                    sats: 312819n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    sats: 91048n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100n,
                    },
                    spentBy: {
                        txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
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
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                        outIdx: 0,
                    },
                    sats: 89406n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
                    sats: 49998867n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495303504f571850726f6f666f6657726974696e672e636f6d20546f6b656e2168747470733a2f2f7777772e70726f6f666f6677726974696e672e636f6d2f32364c0001004c000800000000000f4240',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000n,
                    },
                    spentBy: {
                        txid: '69238630eb9e6a9864bf6970ff5d326800cea41a819feebecfe1a6f0ed651f5c',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
                    spentBy: {
                        txid: '3c665488929f852d93a5dfb6e4b4df7bc8f7a25fb4a2480d39e3de7a30437f69',
                        outIdx: 0,
                    },
                    sats: 49997563n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    sats: 998991395n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953047465737404746573741468747470733a2f2f636173687461622e636f6d2f4c0001014c0008000000000000000a',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 10n,
                    },
                    spentBy: {
                        txid: '01e95bbde7013640637b4862812fece434bcfd7a97de852f30ef545add22498b',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    spentBy: {
                        txid: '0cfd62634b11ef341fc760bd9ede68f51ed4dfeef5b4b6a42a70620104d5bdaf',
                        outIdx: 0,
                    },
                    sats: 998990326n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914a76859a9ce3fdbe80cdc306f71074f08d9e4822f88ac',
                    sats: 9622n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495304636f696e086a6f686e636f696e1468747470733a2f2f636173687461622e636f6d2f4c0001004c000800000000000000c3',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 195n,
                    },
                    spentBy: {
                        txid: '0bd0c49135b94b99989ec3b0396020a96fcbe2925bb25c40120dc047c0a097ec',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914c1aadc99f96fcfcfe5642ca29a53e701f0b801c388ac',
                    sats: 8553n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914a528a001f9f027aae05085928d0b23172fd4b5a188ac',
                    sats: 110000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034b4154074b415f546573741468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000005f5e100',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100000000n,
                    },
                    spentBy: {
                        txid: '8f645ce7b231a3ea81168229c1b6a1157e8a58fb8a8a127a80efc2ed39c4f72e',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914a528a001f9f027aae05085928d0b23172fd4b5a188ac',
                    spentBy: {
                        txid: '8f645ce7b231a3ea81168229c1b6a1157e8a58fb8a8a127a80efc2ed39c4f72e',
                        outIdx: 0,
                    },
                    sats: 108931n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91462e332f00918c58c3d8e9c66e6d47b33c549203f88ac',
                    sats: 551610n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530349465025496e6672617374727563747572652046756e64696e672050726f706f73616c20546f6b656e086966702e6361736820b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f55301084c0008000775f05a074000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2100000000000000n,
                    },
                    spentBy: {
                        txid: 'a00c5a27f07ed26b116f219d6e666ad171e1420d27f108417a51ac6fa9b03c03',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91462e332f00918c58c3d8e9c66e6d47b33c549203f88ac',
                    spentBy: {
                        txid: 'fadf79b051e33dcfeea92f497a60c6ce36cd2a8ad230f879fb135eae08c1a0c4',
                        outIdx: 15,
                    },
                    sats: 550715n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1497154381n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530543544c7633244361736874616220546f6b656e204c61756e6368204c61756e636820546f6b656e2076330a636f696e65782e636f6d4c0001004c0008000000000000014d',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 333n,
                    },
                    spentBy: {
                        txid: '34caddbb70b152f555366d6719d7fcc7c263a2c77b8981819c1a0bfd7cce8e98',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'e0d6d7d46d5fc6aaa4512a7aca9223c6d7ca30b8253dee1b40b8978fe7dc501e',
                        outIdx: 1,
                    },
                    sats: 1497153077n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 3491579877n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530253410d5370696e6e657220416c7068611768747470733a2f2f636173687461626170702e636f6d2f4c0001004c0008000000000000014d',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 333n,
                    },
                    spentBy: {
                        txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '562d7f91e21f124c3aaa826e08f6a59f49343a7c0411ff077f5aacfd858f0ec4',
                        outIdx: 0,
                    },
                    sats: 3491578808n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    sats: 1000n,
                },
                {
                    prevOut: {
                        txid: '46b6f61ca026e243d55668bf304df6a21e1fcb2113943cc6bd1fdeceaae85612',
                        outIdx: 2,
                    },
                    inputScript:
                        '4830450221009e98db4b91441190bb7e4745b9f249201d0b54c81c0a816af5f3491ffb21a7e902205a4d1347a5a9133c14e4f55319af00f1df836eba6552f30b44640e9373f4cabf4121034cdb43b7a1277c4d818dc177aaea4e0bed5d464d240839d5488a278b716facd5',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    sats: 750918004n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495305416c69746105416c6974610a616c6974612e636173684c0001044c00080000befe6f672000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 210000000000000n,
                    },
                    spentBy: {
                        txid: '2c336374c05f1c8f278d2a1d5f3195a17fe1bc50189ff67c9769a6afcd908ea9',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    spentBy: {
                        txid: 'ca70157d5cf6275e0a36adbc3fabf671e3987f343cb35ec4ee7ed5c8d37b3233',
                        outIdx: 0,
                    },
                    sats: 750917637n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1300n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953035544540a557064617465546573741468747470733a2f2f636173687461622e636f6d2f4c0001074c000800000001cf977871',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 7777777777n,
                    },
                    sats: 546n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    sats: 100000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034354420b43617368546162426974731768747470733a2f2f636173687461626170702e636f6d2f4c0001090102088ac7230489e80000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 10000000000000000000n,
                    },
                    spentBy: {
                        txid: 'f517a560df3b7939bce51faddff4c3bac25fff3e94edbf93546cbeda738bf8f3',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
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
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: '6a4c8bfa2e3ca345795dc3bde84d647390e9e1f2ff96e535cd2754d8ea5a3539',
                        outIdx: 0,
                    },
                    sats: 98358n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1497155685n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530443544c32244361736874616220546f6b656e204c61756e6368204c61756e636820546f6b656e2076321074686563727970746f6775792e636f6d4c0001004c000800000000000007d0',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2000n,
                    },
                    spentBy: {
                        txid: '9f4c66b82f5b41f474f9670311e834667c0207a81f9e31a65731a7731e86c3ee',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
                        outIdx: 0,
                    },
                    sats: 1497154381n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '263795185b3623a1bc1dea322b0544d8851f0432b3dbc3f66a7a5109de1758d2',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022011a39acbbb80c4723822d434445fc4b3d72ad0212902fdb183a5408af00e158c02200eb3778b1af9f3a8fe28b6670f5fe543fb4c190f79f349273860125be05269b2412103b30e7096c6e3a3b45e5aba4ad8fe48a1fdd7c04de0de55a43095e7560b52e19d',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
                    sats: 65084n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953084e414b414d4f544f084e414b414d4f544f4c004c0001084c0008000775f05a074000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2100000000000000n,
                    },
                    spentBy: {
                        txid: '5f4c275fe00896031757fb8f771cf9ff64ef90112ff2d8cd75c3d792338f7767',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
                    spentBy: {
                        txid: '4bc56e2c0358dbfa169e0feadf8edade0b76773f3bfad3f44b042e9bc5cd5d7f',
                        outIdx: 0,
                    },
                    sats: 64650n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
                    sats: 995151n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953035847420b4761726d6f6e626f7a69612d68747470733a2f2f7477696e7065616b732e66616e646f6d2e636f6d2f77696b692f4761726d6f6e626f7a69614c0001084c0008000000174876e800',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100000000000n,
                    },
                    spentBy: {
                        txid: 'f2d492da069429866c8ed59fd0d5283b8a8da881414633ac35979a2891030c57',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
                    spentBy: {
                        txid: '8c31247864b54642d8f6ef2a9e6a444a828beaa51e9afb3cdbc6e4cac9b39a89',
                        outIdx: 1,
                    },
                    sats: 993847n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914726e13d2a9f4de19146a69d8a464d96674bc4ec288ac',
                    sats: 99141n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495304484f4e4b09484f4e4b20484f4e4b17544845205245414c20484f4e4b20534c5020544f4b454e4c0001004c0008000000174876e800',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100000000000n,
                    },
                    spentBy: {
                        txid: 'd9f1c4833aa9b6e91d589c46783ec4c7e6225b754d1c0d8cd06a7d65bc71e696',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9145afb7e1a1216788d7c69c509269d75b8750e750688ac',
                    spentBy: {
                        txid: '5691fa7fbf62db3964d9bc01ef27cdb392a5051b2c225054dc502b4bfadd377e',
                        outIdx: 1,
                    },
                    sats: 98290n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 97862n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495307536572766963650945766320746f6b656e1368747470733a2f2f636173687461622e636f6d4c0001004c0008000000161e70f600',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 95000000000n,
                    },
                    spentBy: {
                        txid: '46da16acb51c912164e7bed0cc515ab6d8898e6d4d3e821d4ee7442587a9a50e',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    spentBy: {
                        txid: 'd21ae699093349473539b13808618561a350d0c39acc00f3704ba474ad851370',
                        outIdx: 0,
                    },
                    sats: 96793n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1496725917n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495305434c4e53501a436f6d706f6e656e744c6f6e674e616d6553706565644c6f61641768747470733a2f2f636173687461626170702e636f6d2f4c0001004c00080000000000000064',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100n,
                    },
                    spentBy: {
                        txid: '979f7741bb99ef43d7cf55ac5f070408fcb95dfce5818eb44f49e5b759a36d11',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '28669d88822a1e0c202fb68d6abc36c3b5acc9f1df3c6990d045b119e4b7cc4d',
                        outIdx: 0,
                    },
                    sats: 1496724613n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    sats: 83438n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495304584249540565426974731868747470733a2f2f626f6f6d657274616b65732e636f6d2f4c00010901020800038d7ea4c68000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000000000000n,
                    },
                    spentBy: {
                        txid: 'ffb660d9ef11879a5c8fce3b11e56819289caf0db49b36b5bb9f90d535ebbc6f',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
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
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: 'ffb660d9ef11879a5c8fce3b11e56819289caf0db49b36b5bb9f90d535ebbc6f',
                        outIdx: 0,
                    },
                    sats: 81796n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 140758876n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034342421143617368746162204265746120426974731768747470733a2f2f636173687461626170702e636f6d2f4c0001004c0008000000003b9aca00',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000000n,
                    },
                    spentBy: {
                        txid: '8ccb8b0eb8f93fcfa4978c60f8aee14bc7e6b4d965d8cb55093f9604f3242d57',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'c6457243bc0ff473b1a442b2f75155fcc020575bad69c45cd8edffa05cb6710a',
                        outIdx: 0,
                    },
                    sats: 140757807n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    sats: 86422n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953074e4f434f56494419436f7669643139204c69666574696d6520496d6d756e6974794c5168747470733a2f2f7777772e77686f2e696e742f656d657267656e636965732f64697365617365732f6e6f76656c2d636f726f6e6176697275732d323031392f636f7669642d31392d76616363696e65734c00010001020800000000000f4240',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000n,
                    },
                    spentBy: {
                        txid: 'cac6ff7ff285f4ae709ca58aad490f51f079c043dfa7f7ecf32086d756fc18a7',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
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
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: 'cac6ff7ff285f4ae709ca58aad490f51f079c043dfa7f7ecf32086d756fc18a7',
                        outIdx: 0,
                    },
                    sats: 84780n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 5828n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530353524d1653657276657220526564756e64616e6379204d696e741468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000000000005',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 5n,
                    },
                    spentBy: {
                        txid: 'c04ae7f139eb16023a70d1bb39b1ae8745667edb09833e994a5b4d48976a111d',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'e5aa45cea8268f873b00134a1981e92e5022e5c15e3ef273be8552b349e01651',
                        outIdx: 0,
                    },
                    sats: 4759n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034354440c43617368746162204461726b1468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000000002710',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 10000n,
                    },
                    spentBy: {
                        txid: '0283492a729cfb7999684e733f2ee76bc4f652b9047ff47dbe3534b8f5960697',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '28e406370381e1ef6764bbbb21cf7974e95b84b2c49d204ab9f471d88334af90',
                        outIdx: 5,
                    },
                    sats: 8931n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 6212297n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953044e4342540e6e657743686174426f745465737412616c6961732e65746f6b656e732e636173684c0001004c00080000000000000064',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'c2c6b5a7b37e983c4e193900fcde2b8139ef4c3db2fd9689c354f6ea65354f15',
                        outIdx: 0,
                    },
                    sats: 6211296n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 9030220n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953044e4342540e6e657743686174426f745465737412616c6961732e65746f6b656e732e636173684c0001004c00080000000000000064',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '19cc36305423ddf2fefd400663a9938b5cb342a82ebd00f6251ee8bb5c58c855',
                        outIdx: 0,
                    },
                    sats: 9029219n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 15250788n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953044e4342540e6e657743686174426f745465737412616c6961732e65746f6b656e732e636173684c0001004c00080000000000000064',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '03d227c6ae528bd6644487f394f5ddb065eea5c2ff97cae9b032d6efc46edea8',
                        outIdx: 0,
                    },
                    sats: 15249787n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 206527138n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034f4d49074f6d6963726f6e076364632e676f764c0001004c0008000000003b9aca00',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000000n,
                    },
                    spentBy: {
                        txid: '702e1b64aed21bc764c83f638407f7f73245604d8d9c36f03e048a8005b8ccfd',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'f83ed4755d3356181a3a0f2a1b8181f7616d76149ce8bcccc751eb4a8c3b91f2',
                        outIdx: 1,
                    },
                    sats: 206526069n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 29074919n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495303434c421243617368746162204c6f63616c20426574610f626f6f6d657274616b65732e636f6d4c0001024c000800000000000008ae',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2222n,
                    },
                    spentBy: {
                        txid: '123a31b903c9a7de544a443a02f73e0cbee6304931704e55d0583a8aca8df48e',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'd83677da1b3ade24e9fdcc2a47e3ba87e1fbe1de9e13075d79d16819952a8789',
                        outIdx: 2,
                    },
                    sats: 29073850n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1253n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953035653500b56657370656e65204761733468747470733a2f2f73696d706c652e77696b6970656469612e6f72672f77696b692f5374617243726166742347616d65706c61794c0001094c000829a2241af62c0000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 3000000000000000000n,
                    },
                    spentBy: {
                        txid: 'fc1ada187e9f5da7616f481c79cd0fa3aafa3d4094288db6806e7508f76b5fcd',
                        outIdx: 1,
                    },
                    sats: 546n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 138443635n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034c5656174c616d6264612056617269616e742056617269616e74731768747470733a2f2f636173687461626170702e636f6d2f4c0001004c000800000000000f4240',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000n,
                    },
                    spentBy: {
                        txid: 'ef80e1ceeada69a9639c320c1fba47ea4417cd3aad1be1635c3472ce28aaef33',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '87faad4f282002da1a9d74059dbebfa41aff3df27a66b5fd01184c5f8afdf283',
                        outIdx: 0,
                    },
                    sats: 138442566n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1121620547n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034456561644656c74612056617269616e742056617269616e74731768747470733a2f2f636173687461626170702e636f6d2f4c0001004c0008000000003b9ac9ff',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 999999999n,
                    },
                    spentBy: {
                        txid: 'e9675fb89a91fd2644e098d5865dcd8de1549d18577247d55813a9f8b383eb12',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '9eb3f392e7efd073cbe58e4d57d4c4cf755527074f935238493b0d357cc70b8d',
                        outIdx: 0,
                    },
                    sats: 1121619478n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
                    sats: 46641n,
                },
                {
                    prevOut: {
                        txid: 'c44685e8f36e84838d11502438438c997fe79645ffe27b51e3395ef6b9a4b6e2',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402205278c22d848b7368365cfd08e64a6060e061fa9995161fef50086ad81cb2367502205f0af031e2f1bfcffd47348832e2127428abdea4f9dc0440b1dd387d84e74e8741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
                    sats: 313547n,
                },
                {
                    prevOut: {
                        txid: '2441ce6b4b213afbf432e7ffd59cd597a14c2bbca0fe1a641095b5f634af7d40',
                        outIdx: 0,
                    },
                    inputScript:
                        '4730440220603fd0df5350ab5213384b57abe575ecad1627470b95a14a61c1d6d6a346056c02205505e66fee9be7ac73a8d1c8d08212dc4ac44e2e7ffd909e6790a7cd26fd68e941210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
                    sats: 31355n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495303574454435465737420546f6b656e205769746820457863657074696f6e616c6c79204c6f6e67204e616d6520466f722043535320416e64205374796c65205265766973696f6e734068747470733a2f2f7777772e496d706f737369626c794c6f6e6757656273697465446964596f755468696e6b576562446576576f756c64426546756e2e6f72672085b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc0107010208000000e8d4a51000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000000000n,
                    },
                    spentBy: {
                        txid: 'ed7a0eb9f80ffcad92a20a9b8eb673561bde8ce143cec05fe4635020842a4c54',
                        outIdx: 56,
                    },
                    sats: 546n,
                },
                {
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
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    spentBy: {
                        txid: '67605f3d18135b52d95a4877a427d100c14f2610c63ee84eaf4856f883a0b70e',
                        outIdx: 2,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
                    spentBy: {
                        txid: 'ed7a0eb9f80ffcad92a20a9b8eb673561bde8ce143cec05fe4635020842a4c54',
                        outIdx: 55,
                    },
                    sats: 389686n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2981229n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495303444e520844656e61726975731468747470733a2f2f636173687461622e636f6d2f4c0001004c000800000000000002f1',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 753n,
                    },
                    spentBy: {
                        txid: '5f06207dea4762524dbe2d84900cc78711d079f2b2e909867ec5e9abdeb850aa',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'fa373dbcbac25cfc409b062d9974425a82621c05cecaeaebfd7e0a5a2dc23317',
                        outIdx: 0,
                    },
                    sats: 2980228n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 1350n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495303434c541343617368746162204c6f63616c2054657374731468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000c350',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 50000n,
                    },
                    spentBy: {
                        txid: '9c6363fb537d529f512a12d292ea9682fe7159e6bf5ebfec5b7067b401d2dba4',
                        outIdx: 1,
                    },
                    sats: 546n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    sats: 94032n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953035442530854657374426974731968747470733a2f2f74686563727970746f6775792e636f6d2f4c0001090102088ac7230489e80000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 10000000000000000000n,
                    },
                    spentBy: {
                        txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
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
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    spentBy: {
                        txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
                        outIdx: 0,
                    },
                    sats: 92390n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 9095n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530343464c104361736874616220466163656c6966741468747470733a2f2f636173687461622e636f6d2f4c0001094c0008000009184e72a000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 10000000000000n,
                    },
                    spentBy: {
                        txid: 'fefacb25eccd9c1c575da278b265c444f840e9261b041898fbf7f5cd85fb40a4',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'f78ee9844a4584d6f13efbf2e40f0e488f25089aa047e61f54063894d01a3a17',
                        outIdx: 0,
                    },
                    sats: 8026n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 994663n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495303434d4110436173687461624d696e74416c7068611768747470733a2f2f636173687461626170702e636f6d2f4c0001054c0008000000000054c563',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 5555555n,
                    },
                    spentBy: {
                        txid: '9989f6f4941d7cf3206b327d957b022b41bf7e449a11fd5dd5cf1e9bc93f1ecf',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '92566b9ae391bf2de6c99457fa56ab5f93af66634af563dbe0e1022ebc05ecd4',
                        outIdx: 0,
                    },
                    sats: 993359n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 3317n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034957460d496e73616e69747920576f6c661468747470733a2f2f636173687461622e636f6d2f4c0001004c000800000000000003e8',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                        outIdx: 0,
                    },
                    sats: 2157n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 998111n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953034759500647797073756d1468747470733a2f2f636173687461622e636f6d2f4c0001094c00088ac7230489e80000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 10000000000000000000n,
                    },
                    spentBy: {
                        txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                        outIdx: 0,
                    },
                    sats: 996966n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                    sats: 50000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495303475250064752554d50591868747470733a2f2f6269742e6c792f4772756d7079446f634c0001024c0008000000e8d4a51000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000000000n,
                    },
                    spentBy: {
                        txid: '94cc23c0a01ee35b8b9380b739f1f8d8f6d0e2c09a7785f3d63b928afd23357f',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                    spentBy: {
                        txid: '94cc23c0a01ee35b8b9380b739f1f8d8f6d0e2c09a7785f3d63b928afd23357f',
                        outIdx: 0,
                    },
                    sats: 48931n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 9039904n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495304545249420c654361736820486572616c641468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000000002710',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 10000n,
                    },
                    spentBy: {
                        txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'ff2d098a14929713f392d46963c5b09c2fa5f38f84793f04e55e94f3bc7eac23',
                        outIdx: 0,
                    },
                    sats: 9038903n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 6231556n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 4444n,
                    },
                    spentBy: {
                        txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                        outIdx: 0,
                    },
                    sats: 6230555n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 981921n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530442554c4c0442756c6c1468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000001406f40',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 21000000n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '4d8c8d06b724493f5ab172a18d9bf9f4d8419c09bc5a93fe780902b21dab75ba',
                        outIdx: 0,
                    },
                    sats: 981078n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 26811307n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e455349530343504712436173687461622050726f642047616d6d611074686563727970746f6775792e636f6d4c0001004c00080000000000000064',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100n,
                    },
                    spentBy: {
                        txid: 'fb50eac73a4fd5e2a701e0dbf4e575cea9c083e061b1db722e057164c7317e5b',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '5f0ab0ecfb8807dfdbc97eb421b940cef3c1c70a4c99fd96c39414de42f32338',
                        outIdx: 0,
                    },
                    sats: 26810238n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1617n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495303414243034142431468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000000c',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 12n,
                    },
                    spentBy: {
                        txid: '41fd4cb3ce0162e44cfd5a446b389afa6b35461d466d55321be412a518c56d63',
                        outIdx: 0,
                    },
                    sats: 546n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2214n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953044341464606436f666665651468747470733a2f2f636173687461622e636f6d2f4c0001094c00080000000cce416600',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 55000000000n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1369n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1497156989n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953044347454e0f436173687461622047656e657369731868747470733a2f2f626f6f6d657274616b65732e636f6d2f4c0001094c000800038d7ea4c68000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1000000000000000n,
                    },
                    spentBy: {
                        txid: '4f5af8d3dc9d1fb3dc803a80589cab62c78235264aa90e4f8066b7960804cd74',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
                        outIdx: 0,
                    },
                    sats: 1497155685n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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

const txHistorySupportingTokenCache = {
    aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1: {
        token: {
            tokenId:
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 1711776546,
            genesisInfo: {
                tokenTicker: 'CACHET',
                tokenName: 'Cachet',
                url: 'https://cashtab.com/',
                decimals: 2,
                hash: '',
            },
            block: {
                height: 838192,
                hash: '0000000000000000132232769161d6211f7e6e20cf63b26e5148890aacd26962',
                timestamp: 1711779364,
            },
        },
        tx: {
            txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'dd3eafefb1941fd67d8a29b7dd057ac48ec11712887e2ae7c008a7c72d0cd9fc',
                        outIdx: 0,
                    },
                    inputScript:
                        '4830450221009bb1fb7d49d9ac64b79ea041be2e2efa5a8709a470930b04c27c9fc46ed1906302206a0a9daf5e64e934a3467951dd2da37405969d4434d4006ddfea3ed39ff4e0ae412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2200n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e4553495306434143484554064361636865741468747470733a2f2f636173687461622e636f6d2f4c0001020102080000000000989680',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 10000000n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    spentBy: {
                        txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '343356b9d4acd59065f90b1ace647c1f714f1fd4c411e2cf77081a0246c7416d',
                        outIdx: 3,
                    },
                    sats: 773n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711776546,
            size: 335,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
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
                height: 838192,
                hash: '0000000000000000132232769161d6211f7e6e20cf63b26e5148890aacd26962',
                timestamp: 1711779364,
            },
        },
        calculated: {
            genesisSupply: '100000.00',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 1,
        },
    },
    cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145: {
        token: {
            tokenId:
                'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
            tokenType: {
                protocol: 'ALP',
                type: 'ALP_TOKEN_TYPE_STANDARD',
                number: 0,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CRD',
                tokenName: 'Credo In Unum Deo',
                url: 'https://crd.network/token',
                decimals: 4,
                data: {},
                authPubkey:
                    '0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10',
            },
            block: {
                height: 795680,
                hash: '00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73',
                timestamp: 1686305735,
            },
        },
        tx: {
            txid: 'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: 'dd2020be54ad3dccf98548512e6f735cac002434bbddb61f19cbe6f3f1de04da',
                        outIdx: 0,
                    },
                    inputScript:
                        '4130ef71df9d2daacf48d05a0361e103e087b636f4d68af8decd769227caf198003991629bf7057fa1572fc0dd3581115a1b06b5c0eafc88555e58521956fe5cbc410768999600fc71a024752102d8cb55aaf01f84335130bf7b3751267e5cf3398a60e5162ff93ec8d77f14850fac',
                    sequenceNo: 4294967295,
                    outputScript:
                        'a91464275fca443d169d23d077c85ad1bb7a31b6e05987',
                    sats: 4000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a504c63534c5032000747454e455349530343524411437265646f20496e20556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914bbb6c4fecc56ecce35958f87c2367cd3f5e88c2788ac',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    spentBy: {
                        txid: 'ff06c312bef229f6f27989326d9be7e0e142aaa84538967b104b262af69f7f00',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 777777,
            timeFirstSeen: 0,
            size: 308,
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
                height: 795680,
                hash: '00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73',
                timestamp: 1686305735,
            },
        },
        calculated: {
            genesisSupply: '0.0000',
            genesisOutputScripts: [],
            genesisMintBatons: 1,
        },
    },
};
// Build a mock token cache from these chronik mocks
const supportingTokenCache = new CashtabCache().tokens;
for (const tokenId of Object.keys(txHistorySupportingTokenCache)) {
    const { token, calculated } = txHistorySupportingTokenCache[tokenId];
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
    supportingTokenCache.set(tokenId, cachedInfo);
}
export const mockTxHistorySupportingTokenCache = supportingTokenCache;

/**
 * getTxHistory mocks
 * Mock a wallet with tx history at two different paths to confirm expected behavior
 */

export const mockTxHistoryWalletJson = {
    ...validWalletJson,
    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    hash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 1676077n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '24eae444d765406d8362da437d66a7cf50b95685198692bd2253bafd4bd003a0',
                    outIdx: 2,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 1674751n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 442567277n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 3300n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '08fa8a346851d44fd4b6765c65008670ccadf8dabcae59686814279a449ada06',
                    outIdx: 2,
                },
                sats: 442563522n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 988104n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '24eae444d765406d8362da437d66a7cf50b95685198692bd2253bafd4bd003a0',
                    outIdx: 1,
                },
                sats: 1100n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 986778n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 440000n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 1100n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '49e2dd75d2309fee1a8c69d31090ad0f5bdd60eaf32bf1eea1ed276dab33e26f',
                    outIdx: 0,
                },
                sats: 438445n,
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
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 9n,
                },
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: 'b3ca2414e646fbc53c6d789a242ea9afc1e84ec1e62ed8f5d58ab93d43207b66',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100c7106fb50492ac6726a6cae234ac7424842daee2285fb5a3c8005262a9fdbb06022061c24760989da27c0e3f372646243334d6048894a49aae3459a3f9ebabdc41d0412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 1100n,
            },
            {
                prevOut: {
                    txid: '848af498277a4250bde6951849df0e66b9bc5a3b8766efbd43d3e660b773edc5',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100c1eca663e5c9f06db6f3844254ff197bbbd106897ffef37300d9ce65b17f4ece02203f80564ba7e4d833db4ef6097c69dcb9ae9abce3cc2ab2c75f17a4c23059abfa412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 3181522n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109080000000000000001080000000000000008',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 8n,
                },
                spentBy: {
                    txid: '94bf7fb1b2d37fed71085f9f32415f7426ed7cde692b9a9320ff6c811aa2db74',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '20c513c9ae5f3966f8dae10c7e0681505756a5a0b4e4f707b366cdf51663c386',
                    outIdx: 0,
                },
                sats: 3180811n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 999900000000000n,
                },
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: 'cfe4f1458af2be9f76e7a45c47a9c450aded46d3e5b41d97dfd3c56b2c16c7ca',
                    outIdx: 2,
                },
                inputScript:
                    '48304502210096482807afee1009914e934326930379ea308402643e786a1ac35786160cca37022070fe57cff80dba8475598c30b9515afa5e14caebf1ba1c7599554b9f9f7c89354121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                sats: 44907604n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000007aef40a000800038d5fad5b8e00',
                sats: 0n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 33000000000n,
                },
                sats: 546n,
            },
            {
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
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 999867000000000n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'd711c97ff4fe19df3419c570b082bfefc99e5b3d093c0ca8e8397404573c98f3',
                    outIdx: 0,
                },
                sats: 44906091n,
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
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                sats: 45114487n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a914f5b3312155fe3781140dee0e84023f64cf73a6b588ac',
                sats: 100383n,
            },
            {
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'fa984e50466e064068368e0d456e5a8a774adc6005ece87a32337b779eb4c422',
                    outIdx: 0,
                },
                sats: 45013649n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                sats: 45419254n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
                sats: 101053n,
            },
            {
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: '6d182b409b9969ba0a15e65a63ee0162f9003850bdc8ad99b88fc6e855ef3c76',
                    outIdx: 0,
                },
                sats: 45317746n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                sats: 45520841n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
                sats: 101132n,
            },
            {
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'c28d33a9865ca5e063f457b626754a4cb65966b6b0c9e81b77ceef4b24b47c86',
                    outIdx: 0,
                },
                sats: 45419254n,
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
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                sats: 45216157n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
                sats: 101215n,
            },
            {
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: '8bf2566feb21f4681fbf97155d78b388b9fc1fd6a6e4bc0e21324db5a9e7a7ac',
                    outIdx: 0,
                },
                sats: 45114487n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1253n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953035653500b56657370656e65204761733468747470733a2f2f73696d706c652e77696b6970656469612e6f72672f77696b692f5374617243726166742347616d65706c61794c0001094c000829a2241af62c0000',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 3000000000000000000n,
                    },
                    spentBy: {
                        txid: 'fc1ada187e9f5da7616f481c79cd0fa3aafa3d4094288db6806e7508f76b5fcd',
                        outIdx: 1,
                    },
                    sats: 546n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
            timeFirstSeen: 0,
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
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 6231556n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
                    sats: 0n,
                },
                {
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
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 4444n,
                    },
                    spentBy: {
                        txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                        outIdx: 0,
                    },
                    sats: 6230555n,
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
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
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
// Original mockTxHistoryTokenCache will be replaced with filtered version below

const originalExpectedParsedTxHistory = [
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
                sats: 1676077n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 1100n,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '24eae444d765406d8362da437d66a7cf50b95685198692bd2253bafd4bd003a0',
                    outIdx: 2,
                },
            },
            {
                sats: 1674751n,
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
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            satoshisSent: 1100,
            stackArray: [],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [],
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
                sats: 442567277n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                sats: 3300n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                sats: 442563522n,
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
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            satoshisSent: 3300,
            stackArray: [],
            xecTxType: 'Received',
            replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            appActions: [],
            parsedTokenEntries: [],
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
                sats: 988104n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 1100n,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                spentBy: {
                    txid: '24eae444d765406d8362da437d66a7cf50b95685198692bd2253bafd4bd003a0',
                    outIdx: 1,
                },
            },
            {
                sats: 986778n,
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
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            satoshisSent: 1100,
            stackArray: [],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [],
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
                sats: 440000n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                sats: 1100n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                sats: 438445n,
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
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            satoshisSent: 1100,
            stackArray: [],
            xecTxType: 'Received',
            replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            appActions: [],
            parsedTokenEntries: [],
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
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 9n,
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
                sats: 1100n,
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
                sats: 3181522n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109080000000000000001080000000000000008',
            },
            {
                sats: 546n,
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
                    atoms: 1n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
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
                    atoms: 8n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '94bf7fb1b2d37fed71085f9f32415f7426ed7cde692b9a9320ff6c811aa2db74',
                    outIdx: 0,
                },
            },
            {
                sats: 3180811n,
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
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                '0000000000000001',
                '0000000000000008',
            ],
            xecTxType: 'Received',
            replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenSatoshis: '1',
                },
            ],
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
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 999900000000000n,
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
                sats: 44907604n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000007aef40a000800038d5fad5b8e00',
            },
            {
                sats: 546n,
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
                    atoms: 33000000000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
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
                    atoms: 999867000000000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 44906091n,
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
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
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
            recipients: ['ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y'],
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                '00000007aef40a00',
                '00038d5fad5b8e00',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenSatoshis: '33000000000',
                },
            ],
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
                sats: 45114487n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                sats: 100383n,
                outputScript:
                    '76a914f5b3312155fe3781140dee0e84023f64cf73a6b588ac',
            },
            {
                sats: 45013649n,
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
            recipients: ['ecash:qr6mxvfp2hlr0qg5phhqapqz8ajv7uaxk55z9332rl'],
            satoshisSent: 100383,
            stackArray: [],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [],
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
                sats: 45419254n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                sats: 101053n,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                sats: 45317746n,
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
            recipients: ['ecash:qpp6zklxvwrqynkhlp75qszgcw0mdu8uuu55gjkvax'],
            satoshisSent: 101053,
            stackArray: [],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [],
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
                sats: 45520841n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                sats: 101132n,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                sats: 45419254n,
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
            recipients: ['ecash:qpp6zklxvwrqynkhlp75qszgcw0mdu8uuu55gjkvax'],
            satoshisSent: 101132,
            stackArray: [],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [],
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
                sats: 45216157n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                sats: 101215n,
                outputScript:
                    '76a91443a15be66386024ed7f87d404048c39fb6f0fce788ac',
            },
            {
                sats: 45114487n,
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
            recipients: ['ecash:qpp6zklxvwrqynkhlp75qszgcw0mdu8uuu55gjkvax'],
            satoshisSent: 101215,
            stackArray: [],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [],
        },
    },
];

// Create expected results that only include transactions from path 1899
const path1899TxIds = mockPath1899History.map(tx => tx.txid);
const expectedParsedTxHistoryPath1899 = originalExpectedParsedTxHistory.filter(
    tx => path1899TxIds.includes(tx.txid),
);

export const expectedParsedTxHistory = expectedParsedTxHistoryPath1899;

// Create a new mock cache that only includes tokens from path 1899 transactions
const path1899TokenIds = new Set();
for (const tx of mockPath1899History) {
    for (const tokenEntry of tx.tokenEntries || []) {
        path1899TokenIds.add(tokenEntry.tokenId);
    }
}

// Create a new filtered token cache
const mockTxHistoryTokenCachePath1899 = new CashtabCache().tokens;
for (const [tokenId, tokenInfo] of txHistoryTokenCache) {
    if (path1899TokenIds.has(tokenId)) {
        mockTxHistoryTokenCachePath1899.set(tokenId, tokenInfo);
    }
}

export const mockTxHistoryTokenCache = mockTxHistoryTokenCachePath1899;

const tokenInfoErrorParsedTxHistory = [...expectedParsedTxHistory];

export const noCachedInfoParsedTxHistory = tokenInfoErrorParsedTxHistory;

export const NftParentGenesisTx = {
    txid: '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '3dff51c3a8a78dcd56ef77dcf041aa5167e719ebd6d8c4f6cacb6e06d0b851f4',
                outIdx: 3,
            },
            inputScript:
                '483045022100b8fdd47dd19070801a6e5ef306463fa0b21e88405fcb381a7983f13b268128f102202434a3ca71f00b9d8a98c170679cd90cf0b81c9c416c8b24e957adfb9c6e3ec3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
            sequenceNo: 4294967295,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            sats: 32773546n,
        },
    ],
    outputs: [
        {
            outputScript:
                '6a04534c500001810747454e45534953033448431e54686520466f75722048616c662d436f696e73206f66204a696e2d71756125656e2e77696b6970656469612e6f72672f77696b692f5461692d50616e5f286e6f76656c29202a6585a404fae1c33a43322b723b9dbd926cb07244ae9bea888add8f471511e001004c00080000000000000004',
            sats: 0n,
        },
        {
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            token: {
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                isMintBaton: false,
                entryIdx: 0,
                atoms: 4n,
            },
            spentBy: {
                txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                outIdx: 0,
            },
            sats: 546n,
        },
        {
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            spentBy: {
                txid: '6ee862c41f8cf37bfd30b7a2e5ddf6bbad60b87753c6b810dd76527d97c10de4',
                outIdx: 1,
            },
            sats: 32772256n,
        },
    ],
    lockTime: 0,
    timeFirstSeen: 1713551159,
    size: 370,
    isCoinbase: false,
    tokenEntries: [
        {
            tokenId:
                '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
        height: 840791,
        hash: '00000000000000000be1576bcb0bf1c035bba940d5c696d7bb8a0d53c16076c5',
        timestamp: 1713551526,
    },
};
export const NftChildGenesisTx = {
    txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                outIdx: 1,
            },
            inputScript:
                '483045022100939d517c889174bdcaf9755390165ce1e2ba7f47d1490dbf48bbf2f4146c84360220172aeb2fe8eca8a0c59e68ca6b2ab1a8fd0bdded8410212c5d34d936cadcf734412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
            sequenceNo: 4294967295,
            token: {
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                isMintBaton: false,
                entryIdx: 1,
                atoms: 1n,
            },
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            sats: 546n,
        },
        {
            prevOut: {
                txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                outIdx: 5,
            },
            inputScript:
                '483045022100da6101ab8d02141d6745b3985d4c1ba5481cb2c470acff8d40e66fa654e3f14402200906d6a511dda0c5bc243f82217a03fe40c3cfc0a407b2d1e6f971de1ae70316412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
            sequenceNo: 4294967295,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            sats: 32769023n,
        },
    ],
    outputs: [
        {
            outputScript:
                '6a04534c500001410747454e45534953035746430c57752046616e672043686f690b636173687461622e636f6d20ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a297308385501004c00080000000000000001',
            sats: 0n,
        },
        {
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            token: {
                tokenId:
                    'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
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
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            sats: 32768070n,
        },
    ],
    lockTime: 0,
    timeFirstSeen: 1713828197,
    size: 474,
    isCoinbase: false,
    tokenEntries: [
        {
            tokenId:
                'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
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
                '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
        },
        {
            tokenId:
                '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
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
    block: {
        height: 841418,
        hash: '000000000000000015c94349a2ec777da460e8d8d48a220bbf9d6a6e6e9df66f',
        timestamp: 1713829166,
    },
};
export const eCashChatArticleReplyTx = {
    tx: {
        txid: '91288c4675dae4815ef263d840e427b60e7195ab8354aeb156d00f2f5c015cd4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '59daaab81418dff6acc6379d246d98348fdd2e7e10548877ffde73d5cf8d41ea',
                    outIdx: 1,
                },
                inputScript:
                    '4145602aed278898b9892332953d7eb9212b8f4f842a3e761139baa5ec95d353d94ab3abcb7d62b79e190c6aca93e304555a87398fabda5b9141faec1596b9bcc84121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                sats: 600n,
            },
            {
                prevOut: {
                    txid: '752ef889a8aff586d926344eb45dee03f56f57a0b08416f8a284903201f60fe6',
                    outIdx: 1,
                },
                inputScript:
                    '41ec6df6abd70cdb718c19623173901a9471e9f52a5a4cd99d8093c4d5371bc2b0ce107866f1825a04646e6f7b51c883236eaefea50366e7c7074c140695f580014121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                sats: 600n,
            },
            {
                prevOut: {
                    txid: '72f506669350eedc4b7643b6d3ca2c933137d303315a15c46042c31302c440f6',
                    outIdx: 2,
                },
                inputScript:
                    '4131c3b37d72362a79618771e7ad737e462c0804367809fb79d2bac39b116663297a559327e747be37e70979ba2f2e6ea184bf616e1b11df72a27f8eaafabbc9c24121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                sats: 508087n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04626c6f6704726c6f6720fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b79922674c70697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                spentBy: {
                    txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                    outIdx: 0,
                },
                sats: 550n,
            },
            {
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                spentBy: {
                    txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                    outIdx: 1,
                },
                sats: 507394n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1721558302,
        size: 668,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 854251,
            hash: '000000000000000000188bb36a8189d5612210ba2c6d1b8afa0f9d27e70ffe6f',
            timestamp: 1721558514,
        },
        parsed: {
            xecTxType: 'Sent',
            satoshisSent: 507944,
            stackArray: [
                '626c6f67',
                '726c6f67',
                'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                '697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
            ],
            recipients: [],
        },
    },
    parsed: {
        appActions: [
            {
                action: {
                    msg: "is your wife the girlfriend from part 1? If so then she's your soulmate, better hang onto her like your XEC bags",
                    replyArticleTxid:
                        'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                },
                app: 'eCashChat Article Reply',
                isValid: true,
                lokadId: '626c6f67',
            },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm'],
        replyAddress: 'ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm',
        satoshisSent: 0,
        stackArray: [
            '626c6f67',
            '726c6f67',
            'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
            '697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
        ],
        xecTxType: 'Received',
    },
};
export const offSpecEcashChatArticleReplyTx = {
    tx: {
        ...eCashChatArticleReplyTx.tx,
        outputs: [
            {
                ...eCashChatArticleReplyTx.tx.outputs[0],
                outputScript: '6a04626c6f6704726c6f67', // no data after the article reply lokad ID i.e. stackArray !== 4
            },
            ...eCashChatArticleReplyTx.tx.outputs.slice(1),
        ],
    },
    parsed: {
        appActions: [
            {
                app: 'eCashChat Article Reply',
                isValid: false,
                lokadId: '626c6f67',
            },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm'],
        replyAddress: 'ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm',
        satoshisSent: 0,
        stackArray: ['626c6f67', '726c6f67'],
        xecTxType: 'Received',
    },
};
export const eCashChatArticleTx = {
    tx: {
        txid: 'ab32d18a8f52d57c31c0197a45a4f10ed9299df25d996ccd2b1792506d569836',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'cafc6799c3fd6712d2f94b4360c90c73edcb49c0d1030989b3b07223c4fc4aac',
                    outIdx: 2,
                },
                inputScript:
                    '41f6b48f09d3d69002cb49049269d2e16c752b59357bf08c9a4a8513a69d6c87636db7acf09a6714663276d543584045b0796e76bfa3d67bd21a2fa680a89a375d412102f9e8383fe6fc81852f60909f5feb8a314949c3d2c9013c5e67563e3ba03e60ad',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                sats: 133153n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04626c6f672863666338633134326661323336303566366336343765333437636262613261356633363064383937',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                spentBy: {
                    txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                    outIdx: 0,
                },
                sats: 550n,
            },
            {
                outputScript:
                    '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                spentBy: {
                    txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                    outIdx: 1,
                },
                sats: 132050n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1721543189,
        size: 275,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 854224,
            hash: '000000000000000017faf86eb0dc5a051ccc069b90c55653749311eca64c29e4',
            timestamp: 1721543497,
        },
        parsed: {
            xecTxType: 'Sent',
            satoshisSent: 132600,
            stackArray: [
                '626c6f67',
                '63666338633134326661323336303566366336343765333437636262613261356633363064383937',
            ],
            recipients: [],
        },
    },
    parsed: {
        appActions: [
            { app: 'eCashChat Article', isValid: true, lokadId: '626c6f67' },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f'],
        replyAddress: 'ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f',
        satoshisSent: 0,
        stackArray: [
            '626c6f67',
            '63666338633134326661323336303566366336343765333437636262613261356633363064383937',
        ],
        xecTxType: 'Received',
    },
};
export const offSpecEcashChatArticleTx = {
    tx: {
        ...eCashChatArticleTx.tx,
        outputs: [
            {
                ...eCashChatArticleTx.tx.outputs[0],
                outputScript: '6a04626c6f67', // no data after the article lokad ID
            },
            ...eCashChatArticleTx.tx.outputs.slice(1),
        ],
    },
    parsed: {
        appActions: [
            { app: 'eCashChat Article', isValid: false, lokadId: '626c6f67' },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f'],
        replyAddress: 'ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f',
        satoshisSent: 0,
        stackArray: ['626c6f67'],
        xecTxType: 'Received',
    },
};

export const CashtabMsg = {
    tx: {
        txid: '1ce6c307b4083fcfc065287a00f0a582cf88bf33de34845db4c49387d4532b8a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '01d4b064a4e17f77e5712cb13b488e65d39b33b54475b78debee1fe1d9d9acb1',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100eccfc2e23d49fb7e72a35123c807f4feef2f379313673295f36611d725e877b002207b1df4c142c590a54d371fe2f04c05769ecf778e0d28fc50a671e5c5d8b277854121028c1fc90b3fa6e5be985032b061b5ca6db41a6878a9c8b442747b820ca74010db',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                sats: 3001592n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04007461624cbe4d6572636920706f7572206c65207072697820657420626f6e6e6520636f6e74696e756174696f6e2064616e7320766f732070726f6a6574732064652064c3a976656c6f70706575722e2e2e204a27616920c3a974c3a92063656e737572c3a92073c3bb722074c3a96cc3a96772616d6d65206a7573717527617520313520417672696c20323032342e2052c3a97061726572206c6520627567206f6273657276c3a920737572206c6120706167652065546f6b656e204661756365743f',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9143c28745097b1e32b343c50a8d4a7697fe7ad8aff88ac',
                sats: 550n,
            },
            {
                outputScript:
                    '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                sats: 3000609n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1712616513,
        size: 433,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 839618,
            hash: '00000000000000000e63e39951cc745db046aa7f57f811b68846ade8ad100293',
            timestamp: 1712616969,
        },
    },
    sendingHash: '3c28745097b1e32b343c50a8d4a7697fe7ad8aff',
    parsed: {
        appActions: [
            {
                action: {
                    msg: "Merci pour le prix et bonne continuation dans vos projets de développeur... J'ai été censuré sûr télégramme jusqu'au 15 Avril 2024. Réparer le bug observé sur la page eToken Faucet?",
                },
                app: 'Cashtab Msg',
                isValid: true,
                lokadId: '00746162',
            },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr'],
        replyAddress: 'ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr',
        satoshisSent: 550,
        stackArray: [
            '00746162',
            '4d6572636920706f7572206c65207072697820657420626f6e6e6520636f6e74696e756174696f6e2064616e7320766f732070726f6a6574732064652064c3a976656c6f70706575722e2e2e204a27616920c3a974c3a92063656e737572c3a92073c3bb722074c3a96cc3a96772616d6d65206a7573717527617520313520417672696c20323032342e2052c3a97061726572206c6520627567206f6273657276c3a920737572206c6120706167652065546f6b656e204661756365743f',
        ],
        xecTxType: 'Received',
    },
};
export const offSpecCashtabMsg = {
    tx: {
        ...CashtabMsg.tx,
        outputs: [
            {
                ...CashtabMsg.tx.outputs[0],
                outputScript: '6a0400746162',
            },
            ...CashtabMsg.tx.outputs.slice(1),
        ],
    },
    sendingHash: '3c28745097b1e32b343c50a8d4a7697fe7ad8aff',
    parsed: {
        appActions: [
            { app: 'Cashtab Msg', isValid: false, lokadId: '00746162' },
        ],
        parsedTokenEntries: [],
        recipients: ['ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr'],
        replyAddress: 'ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr',
        satoshisSent: 550,
        stackArray: ['00746162'],
        xecTxType: 'Received',
    },
};

export const xecxTx = {
    tx: {
        txid: 'ca7057d9d878e17d105a732d723c84e10156c61627c9e4330e15a0dfe5ab37a5',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c8922424162ce2b2b19a902ecc7d2de3e20b5f138dd9ddcca0c9b3d41f9f2a25',
                    outIdx: 2,
                },
                inputScript:
                    '41287a47a0238eb4e55b92061f3205e5c067f00e6a88df11e60ceb55aa6efa5da97d9418e2e52a0c1b69eba5983a8ad837b0cbe05aefe51d5237bdf3a11e72a2e0412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31250500n,
            },
            {
                prevOut: {
                    txid: '38c1bcddb2037490d541286074820e8acd6563c743b659d09d123117c99d6ef4',
                    outIdx: 2,
                },
                inputScript:
                    '415b4594a93e4ea80231f25da079f27f6928264a5c37f281a2b59f7850c0d3a0a7ba9c856791dadc6b0e73aa22430581821b69caace9661c54dd45d7687fad1ef3412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31250355n,
            },
            {
                prevOut: {
                    txid: 'd8626173ca854bd56571632d8cb76667c7acad2594fec9d0015fe0866aca5c30',
                    outIdx: 2,
                },
                inputScript:
                    '41e4c223342bb6987464f4702aafff4dfd1421edddfbb9ab57a7a98339d93191dad2549db9f715260279786eebf48431fd120d18e1c8baa977de11efb7fe1f7b01412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31250022n,
            },
            {
                prevOut: {
                    txid: 'd3c3b54460b1a45b75a3e506101ebfac20ed21722650dfe47473994b50dcce19',
                    outIdx: 2,
                },
                inputScript:
                    '41faf5ed17630b62563d8d4e1f342a51c1715deba8cd69bb755056b345e3448ae70fac12b8740c53d17e8e8e9211c6d406026a5512e658da30260ebc207fe7f976412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31250542n,
            },
            {
                prevOut: {
                    txid: '747684142194ccf7ba1cd384e50324425051fee5ce516362fec85d1ab1af1f0d',
                    outIdx: 2,
                },
                inputScript:
                    '412546d55291fd069a4c12249cb06c011e16b890844824f279159122cbf8657868e7aaf6dc2239c17874cd50bb50fdc306c4224e5e2651ebaa0a831ee3a86a1285412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31251452n,
            },
            {
                prevOut: {
                    txid: '4c6b1092c4b1525dda296a0d18bc378489058ac775ddfcdeeb3eb107e1f57c2b',
                    outIdx: 2,
                },
                inputScript:
                    '41d8b94143ad17fae0cd9eb5b57c197fd62d750a8d83627bf9d021c800608bca6771844298cccfc4d94da7b592c44ff8a653f2ff238fc1ea17828eac56d05ce309412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31251576n,
            },
            {
                prevOut: {
                    txid: '80575750ecf408a2960e78d1fc23d8e55ecd6af66296484800ed8ae7b28e6147',
                    outIdx: 2,
                },
                inputScript:
                    '4148447f966b2000c31d5cfc31c6382cb116b891f643f03b8d9fd7eb25d8a827d01d0ca8129d3b7412255901214ec6fb6fbeca178aedc293797e8d03eabd4d6829412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31258084n,
            },
            {
                prevOut: {
                    txid: 'e5e53ddc5225bb22c5a8c5c0c45b1f0ff3063c3b607bdef680b824eca433c99d',
                    outIdx: 2,
                },
                inputScript:
                    '417f7cc74f9421db8a11196faadc29bdca794efd2bc016f9fb46ba5340877c74c46c4d46efa9cb7115256d16fc1e6af1a5265d0b064fb70ec7a74128bb68b7b630412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31250892n,
            },
            {
                prevOut: {
                    txid: '6eb3fbee6778614a0993e61897b42c12bbbe36712b4cc8326ac31544c4441b31',
                    outIdx: 2,
                },
                inputScript:
                    '41f07a227801c780217f0bc3f68e9927c0f278182ffc754ca6b167b0413a1cf98cf4d1838a40668482e1dfb7761ccf0ddc7e5a05ac2f55002a075f79e7dc147914412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31256658n,
            },
            {
                prevOut: {
                    txid: '2ce51ebf25366f99ee73c62d49e212894c697560a6ea483576a3d2629e551459',
                    outIdx: 2,
                },
                inputScript:
                    '413ab633abeacde057b424a607fbbc477f29d8bea944d23d944889e808d8388cb43386c0b62edc8b278e6daa45f0446e90f8f9c750a975a934d911ec0a752b4fbe412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                sequenceNo: 4294967295,
                outputScript:
                    '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                sats: 31252018n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a501f584543580008c43400000000000e21fdc39e01000000000000000000000000',
                sats: 0n,
            },
            {
                outputScript:
                    '76a914bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c88ac',
                sats: 31250371n,
            },
            {
                outputScript:
                    '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
                sats: 279681010n,
            },
            {
                outputScript:
                    '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                sats: 1578922n,
            },
            {
                outputScript:
                    '76a914da3621d8d4a1c462b9f5cd2c9cb10850edbd3e4788ac',
                spentBy: {
                    txid: '084d313be0c552839dbac91b47ceb792fec42ec5c121946366e0f352df16644f',
                    outIdx: 1,
                },
                sats: 2038n,
            },
            {
                outputScript:
                    '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                sats: 1585n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 1516n,
            },
            {
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                sats: 1516n,
            },
            {
                outputScript:
                    '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                sats: 1280n,
            },
            {
                outputScript:
                    '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                sats: 791n,
            },
            {
                outputScript:
                    '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                sats: 632n,
            },
            {
                outputScript:
                    '76a91451691a770b8f2ab95590fbf89d22a290c57a4bd988ac',
                sats: 601n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1735257601,
        size: 1837,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        isFinal: false,
        block: {
            height: 877018,
            hash: '000000000000000032d206581206d957112345b362f84578f2e67c5f4730a1bb',
            timestamp: 1735257732,
        },
    },
    sendingHash: 'bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c',
    parsed: {
        appActions: [
            {
                action: {
                    eligibleTokenSatoshis: 1781404606734,
                    excludedHoldersCount: 0,
                    ineligibleTokenSatoshis: 0,
                    minBalanceTokenSatoshisToReceivePaymentThisRound: 3458056,
                },
                app: 'XECX',
                isValid: true,
                lokadId: '58454358',
            },
        ],
        parsedTokenEntries: [],
        recipients: [
            'ecash:qzd5s72xhgjvr4sjfzafjt3a2vcstn4pfvs4c84egx',
            'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
            'ecash:qrdrvgwc6jsugc4e7hxje893ppgwm0f7gua8n7t3z9',
            'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            'ecash:qp54xhk40f3fewpkp80pa9v28jr6940fmv38nxlahf',
            'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
            'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
            'ecash:qpgkjxnhpw8j4w24jral38fz52gv27jtmytxuxnkg3',
        ],
        replyAddress: 'ecash:qqfzls0nhjf7ukgpsmtlly2s2dueq54c5ulydy0h79',
        satoshisSent: 31250371,
        stackArray: [
            '50',
            '584543580008c43400000000000e21fdc39e01000000000000000000000000',
        ],
        xecTxType: 'Received',
    },
};

export const invalidXecxTx = {
    tx: {
        ...xecxTx.tx,
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a501f584543580108c43400000000000e21fdc39e01000000000000000000000000',
            },
            ...xecxTx.tx.outputs.slice(1),
        ],
    },
    sendingHash: xecxTx.sendingHash,
    parsed: {
        appActions: [
            {
                action: {
                    decoded: Buffer.from(
                        '0108c43400000000000e21fdc39e01000000000000000000000000',
                        'hex',
                    ).toString('utf8'),
                    stack: '0108c43400000000000e21fdc39e01000000000000000000000000',
                },
                app: 'XECX',
                isValid: false,
                lokadId: '58454358',
            },
        ],
        parsedTokenEntries: [],
        recipients: [
            'ecash:qzd5s72xhgjvr4sjfzafjt3a2vcstn4pfvs4c84egx',
            'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
            'ecash:qrdrvgwc6jsugc4e7hxje893ppgwm0f7gua8n7t3z9',
            'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            'ecash:qp54xhk40f3fewpkp80pa9v28jr6940fmv38nxlahf',
            'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
            'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
            'ecash:qpgkjxnhpw8j4w24jral38fz52gv27jtmytxuxnkg3',
        ],
        replyAddress: 'ecash:qqfzls0nhjf7ukgpsmtlly2s2dueq54c5ulydy0h79',
        satoshisSent: 31250371,
        stackArray: [
            '50',
            '584543580108c43400000000000e21fdc39e01000000000000000000000000',
        ],
        xecTxType: 'Received',
    },
};

export const firmaYieldTx = {
    tx: {
        txid: '3c56595af9eb142e18390ae07ccd6f6174e9b15e835208990da3a0ab2c66bed5',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd199723b2ea022ea299d8785fcdedc4b8ee475e10a7f3402f3fad30ef380d5e2',
                    outIdx: 9,
                },
                inputScript:
                    '4125417d7c6b7ccc81eff94159e99cb533734433f38c3ee3b9a63e8cfbded5bd8114aad3331ada877d8aeea243f685485cc67690d49237075c55e1fc9082b034f1412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 14n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
            },
            {
                prevOut: {
                    txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                    outIdx: 1,
                },
                inputScript:
                    '41bc863737ec0613f49d39b3370a9c5974faa1eac5fa69a3b1a8d777bb4fcc7f2d138603ce959e3adfe504f0ce7231bf6ffb904e8d7cd28e04c4f69ebc9cfc77fa412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 200487n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
            },
            {
                prevOut: {
                    txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                    outIdx: 3,
                },
                inputScript:
                    '41aa40b355198a16381cc924539adf2843c57310d126ff82ce7b6829ed51b424a65cede15a08d66cad297e83d5ff1eb1f3d56abde79a16819d118b9953fc87c220412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                sats: 31249702n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a504c79534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
            },
            {
                sats: 546n,
                outputScript:
                    '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 199789n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914a5417349420ec53b27522fed1a63b1672c0f28ff88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 195n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914ee487276a59ab3ce397ca6894fac6698aba1b69688ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 185n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 105n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '17fac4d29bb5e2ed5615f35ace4568adbb39555d871abde3cd9f2afd17980a8d',
                    outIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914ec135a17f346b3f9daedf788cffbc3441ff0425388ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 82n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 43n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914a68be843583d8c053f64f1dbc800e8e78ec4fc7788ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 25n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 15n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 15n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 13n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 7n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 7n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 20n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 31242653n,
                outputScript:
                    '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                spentBy: {
                    txid: 'fa9b61637a7366d349cbfb3eab8df48a49f7df8f841572fac7ecb940704ba2e4',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1740524404,
        size: 1043,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
        isFinal: true,
        block: {
            height: 885661,
            hash: '000000000000000016bfc7ceeaa54b9c4a3000cb0c7527c1f5620cf1d83b1437',
            timestamp: 1740524423,
        },
    },
    // TODO confusing in mocks.js
    // sendingHash is actually the hash of the active wallet
    // So we can parse a "received" tx if this is from the received side
    sendingHash: '38d2e1501a485814e2849552093bb0588ed9acbb',
    receivingHash: 'a5417349420ec53b27522fed1a63b1672c0f28ff',
    parsedSend: {
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenSatoshis: '200481',
            },
        ],
        recipients: [
            'ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5',
            'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
            'ecash:qrhysunk5kdt8n3e0jngjnavv6v2hgdkjcmsudvl92',
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            'ecash:qrkpxksh7drt87w6ahmc3nlmcdzpluzz2vpjvwuuxy',
            'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
            'ecash:qzngh6zrtq7ccpflvncahjqqarnca38uwumh845f6p',
            'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
            'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
            'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
            'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
        ],
        satoshisSent: 6552,
        stackArray: [
            '50',
            '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
        ],
        xecTxType: 'Sent',
    },
    parsedReceive: {
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenSatoshis: '195',
            },
        ],
        recipients: [
            'ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5',
            'ecash:qrhysunk5kdt8n3e0jngjnavv6v2hgdkjcmsudvl92',
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            'ecash:qrkpxksh7drt87w6ahmc3nlmcdzpluzz2vpjvwuuxy',
            'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
            'ecash:qzngh6zrtq7ccpflvncahjqqarnca38uwumh845f6p',
            'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
            'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
            'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
            'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            'ecash:qqud9c2srfy9s98zsj24yzfmkpvgakdvhv6xx7umh5',
        ],
        replyAddress: 'ecash:qqud9c2srfy9s98zsj24yzfmkpvgakdvhv6xx7umh5',
        satoshisSent: 546,
        stackArray: [
            '50',
            '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
        ],
        xecTxType: 'Received',
    },
};

export const alpSendWithCashtabMsgTx = {
    tx: {
        txid: '8c484fd8580bc030f05adb778464de576a08ca5bce7e461c70c0cb995ff2495e',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'e94e27fb988ea48d10f796ad273bfa51441586f66e2bf3f674d80c8a8e32e031',
                    outIdx: 1,
                },
                inputScript:
                    '4182b03fb30b96ce85aec409d15c031d3892680497a5a56a0691c0b50c7183cded761e054895c74c735f3ecac7f633e42faf3a65e44a87fe94b68a387f17281000412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 5000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '8aff0d409782607a9e1b608b418c2ba00c58a690ec53018b5c37a9313b577ffa',
                    outIdx: 1,
                },
                inputScript:
                    '417b615dcf6287ffa9450305ff26683a57e1df2b5ab4372c17986a9c89fe6e4bee87284152e81c715388474ff93fba3ccabe24aedec7eaf485ed447ce3e67cbcce412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 10000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '6b99fbccc91cc19c2a37e34bff69ac4d9725dc22e52d89554f88af94de00e712',
                    outIdx: 197,
                },
                inputScript:
                    '41ce421d9ca5baafa8dd6f48c2ec4bc2a9b3953589c20fbc81fd4d06b170291a1128b504c338bde45a2362384371129c58982b11506fe9b7697e619712ef8f5204412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 123311n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a5037534c5032000453454e4469fdb3d4559c236fcad29505fd53ffb3e1193cf96f7cb0e60aeb59af702295d1021027000000008813000000001e0074616263617368746162206d736720696e20616e20414c502073656e64',
            },
            {
                sats: 546n,
                outputScript:
                    '76a914110e3b40d115011988a5935c613a58a093b417ab88ac',
                token: {
                    tokenId:
                        'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 10000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 5000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 122678n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1769896178,
        size: 633,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
        isFinal: true,
        block: {
            height: 934372,
            hash: '00000000000000002064856461a73736498a7947b3ce61340585c6f5e40aee5b',
            timestamp: 1769896202,
        },
    },
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
    receivingHash: '110e3b40d115011988a5935c613a58a093b417ab',
    parsedSend: {
        appActions: [
            {
                action: {
                    msg: 'cashtab msg in an ALP send',
                },
                app: 'Cashtab Msg',
                isValid: true,
                lokadId: '00746162',
            },
        ],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                tokenSatoshis: '10000',
            },
        ],
        recipients: ['ecash:qqgsuw6q6y2szxvg5kf4ccf6tzsf8dqh4vlcd636sl'],
        satoshisSent: 546,
        stackArray: [
            '50',
            '534c5032000453454e4469fdb3d4559c236fcad29505fd53ffb3e1193cf96f7cb0e60aeb59af702295d102102700000000881300000000',
            '0074616263617368746162206d736720696e20616e20414c502073656e64',
        ],
        xecTxType: 'Sent',
    },
    parsedReceive: {
        appActions: [
            {
                action: {
                    msg: 'cashtab msg in an ALP send',
                },
                app: 'Cashtab Msg',
                isValid: true,
                lokadId: '00746162',
            },
        ],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                tokenSatoshis: '10000',
            },
        ],
        recipients: ['ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'],
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        satoshisSent: 546,
        stackArray: [
            '50',
            '534c5032000453454e4469fdb3d4559c236fcad29505fd53ffb3e1193cf96f7cb0e60aeb59af702295d102102700000000881300000000',
            '0074616263617368746162206d736720696e20616e20414c502073656e64',
        ],
        xecTxType: 'Received',
    },
};

export const cachetSendToEdjTx = {
    tx: {
        txid: 'c7a434022c7c3c9385b22ae0c1469a0eff6d625417b6e7ff6f58166edf05841b',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c968b465a4c5ef4519ebdeb58524ea6c642add35120b6fccd47f394fb6b8e6b5',
                    outIdx: 1,
                },
                inputScript:
                    '414350360b32145102ea79e4f535a6f92da328e8c1eaf8ad5ba75fbc199b0b673c6d268f760839323882d79416d7d216226f6d3b7c4e7c135fa79d64e1915d9671412102eb09e912aca38a5c8b55b15b814f3e0a32b9992e629e85bd094da39979cab96d',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 10000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a9140f4a11f54fd2fab2b508bdb3a3972fa313af143488ac',
            },
            {
                prevOut: {
                    txid: 'e535264a652ccd14ad395d51045823184a6395e1d5a205d0aabc16eb44144102',
                    outIdx: 3,
                },
                inputScript:
                    '417fb259316b5519202e2e48efc337ff15066f38ae20bd193c2193dc3917698fbbc464e540091468428b0aca568d316c13248b1a57256aa1ac2a56ec8b390ba4f8412102eb09e912aca38a5c8b55b15b814f3e0a32b9992e629e85bd094da39979cab96d',
                sats: 8723n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140f4a11f54fd2fab2b508bdb3a3972fa313af143488ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10800000000000003e8080000000000002328',
            },
            {
                sats: 546n,
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 1000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a9140f4a11f54fd2fab2b508bdb3a3972fa313af143488ac',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 9000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 7710n,
                outputScript:
                    '76a9140f4a11f54fd2fab2b508bdb3a3972fa313af143488ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1771369231,
        size: 467,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
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
        isFinal: true,
    },
    parsed: {
        satoshisSent: 546,
        stackArray: [
            '534c5000',
            '01',
            '53454e44',
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
            '00000000000003e8',
            '0000000000002328',
        ],
        xecTxType: 'Sent',
        recipients: ['ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5'],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'SLP',
                renderedTxType: 'SEND',
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenSatoshis: '1000',
            },
        ],
    },
    /** Wallet hash for sender (0f4a11f54fd2fab2b508bdb3a3972fa313af1434) */
    sendingHash: '0f4a11f54fd2fab2b508bdb3a3972fa313af1434',
};

export const edjSendTx = {
    tx: {
        txid: '35cd644d4afd04d9e8cb1dd3477299656910c650b2397e3567b7e1e30ae28de5',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0b7d7a982e4f50b9244594a9ed0da488904f56850866034730d04f95a180eebf',
                    outIdx: 2,
                },
                inputScript:
                    '41c191e6eb9f205cee16657ba3a956d93cb600c076aeba3b918d14dbb794cd73f937284701bfb366034f145cf46291de481d415ceca447388616aee5966f236012412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 2000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '093d06604c52eb564a623eb76f71306583961275baed4cb655d2ef9bdd35e8ae',
                    outIdx: 2,
                },
                inputScript:
                    '4163523d65fce1e66d23ffee72994c303c49a821f1c6808d24b3f0ea70f62ee4358b710242b8f7f1489ee77f02422fef9ad20af47320370db1fb37331d33cef935412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 49900n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '80cdad6793581616546d588697d7077aec6e9b1fae54e7747c30445a2b15b3f0',
                    outIdx: 3,
                },
                inputScript:
                    '41f33c6103a2511d8ce2b2aed073948467aaf667e3dfd0e598fdbeeaeec538a8b1ab50b1620be1ef89a218bfb1f0b332d5a6c2a984d72c4a06ca27010a9d1576cc412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 42973850n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a5037534c5032000453454e44847d7722207ca58c839f0796fb568e22b73b6788dc68c3e0e1e8981b17071f4102102700000000aca300000000',
            },
            {
                sats: 546n,
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 10000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '0c962cfdcab05b4fbbb50fbec6c367cefb3a8fe0c4f21f3ba4591d86e9870380',
                    outIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 41900n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 42973248n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1771030097,
        size: 602,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
        isFinal: true,
        block: {
            height: 936254,
            hash: '000000000000000053ddb6315989a8722de986db44c510465f9d1dc43166f357',
            timestamp: 1771030370,
        },
    },
    parsed: {
        satoshisSent: 546,
        stackArray: [
            '50',
            '534c5032000453454e44847d7722207ca58c839f0796fb568e22b73b6788dc68c3e0e1e8981b17071f4102102700000000aca300000000',
        ],
        xecTxType: 'Sent',
        recipients: ['ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5'],
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                tokenSatoshis: '10000',
            },
        ],
    },
    /** Wallet hash for sender (95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d) */
    sendingHash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
};

export const edjPayoutTx = {
    tx: {
        txid: 'c5a063835f29b62256a02a80b8a131b2a4cd20d69fc838013f867b38d4fce819',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '105e21345097411ef103eb13d31b6b74b3f486f8027c2004bce4de0bde77d775',
                    outIdx: 5,
                },
                inputScript:
                    '41c1f853126f5cfc8fe783563f7abef797c331255a7736c75af3ba9b1c709096b16dcdf3ee89c0fe541c5e7b76b440aca1df707db600a1e36f899342bfcdc928414121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 99993802267n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
            {
                prevOut: {
                    txid: 'bf057c77bb03274b67864024400c9ef7557804f3da03e504a5d322971afb4439',
                    outIdx: 3,
                },
                inputScript:
                    '412eab0609bbe71cf88af0fc1d3b4644e85bbaa3aaf1a06266bc6a4705177df5da70c29fab375b985ec799132f1836fa8de7fd4b392d028377ee98c065ce68c00d4121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                sats: 754n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
            {
                prevOut: {
                    txid: 'f53b31223bfcc46d7144923f84113c5291432f9bbac92d3d7b8ae79d525b7047',
                    outIdx: 3,
                },
                inputScript:
                    '4168fef94a04ad1ef744e2d7c3afc44c26abe04e4504df1569536ec1655e510f2608c823104e24211fbfd54795fe4be9d195ac3179b34172e77051bf4198680de84121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                sats: 109073884n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a504c73534c5032000453454e44847d7722207ca58c839f0796fb568e22b73b6788dc68c3e0e1e8981b17071f410c881300000000a00f00000000160800000000e80300000000e80300000000d00700000000e80300000000e80300000000d00700000000d00700000000f40100000000d90118481700',
            },
            {
                sats: 546n,
                outputScript:
                    '76a914286eabaf796ec8be1265c79f57b6c93114c0387f88ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 5000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91459b8f0f91b24792154b85f3fe2503160d840598688ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 4000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 2070n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914d81ad40ed53da4375cd4fd5e6d05936df985b68888ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 1000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91404dda0a1de831ac9f51d58dad4a6ed491383e72988ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 1000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 2000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91484d1d94729b016516b88926ace165bf50ca2075b88ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 1000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a9148614d64f2b03d2dd25bd5ca796ecca726292134588ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 1000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914f7ecc10ddef23b211a6d3ca8051f42a9ef68805c88ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 2000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91442b9f0f923ddb327ef4d10adf0b6d5044d5e533388ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 2000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914267f8d6bedba41f8f636f0fa756eafac8a17124588ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 500n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                token: {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 99993780697n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '0c962cfdcab05b4fbbb50fbec6c367cefb3a8fe0c4f21f3ba4591d86e9870380',
                    outIdx: 1,
                },
            },
            {
                sats: 109067629n,
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                spentBy: {
                    txid: 'f6a4748ec6f567edfc42ae2176656d6085f39622640b565869eb89009d5cba52',
                    outIdx: 2,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1771106402,
        size: 1003,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
        isFinal: true,
        block: {
            height: 936387,
            hash: '000000000000000061c6384cbae4e1c0e9a4206e2339b1e57801b4732ae2e271',
            timestamp: 1771106980,
        },
    },
    parsed: {
        satoshisSent: 546,
        stackArray: [
            '50',
            '534c5032000453454e44847d7722207ca58c839f0796fb568e22b73b6788dc68c3e0e1e8981b17071f410c881300000000a00f00000000160800000000e80300000000e80300000000d00700000000e80300000000e80300000000d00700000000d00700000000f40100000000d90118481700',
        ],
        xecTxType: 'Received',
        recipients: [
            'ecash:qpvm3u8ervj8jg25hp0nlcjsx9sdsszescqyqwuy4j',
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            'ecash:qrvp44qw6576gd6u6n74umg9jdklnpdk3q42nllafs',
            'ecash:qqzdmg9pm6p34j04r4vd449xa4y38ql89yauzdvysq',
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            'ecash:qzzdrk289xcpv5tt3zfx4nskt06segs8tv0k8cvm6j',
            'ecash:qzrpf4j09vpa9hf9h4w209hvefex9ysng5yectwda9',
            'ecash:qrm7esgdmmerkgg6d572spglg25776yqtsczgtwz06',
            'ecash:qpptnu8ey0wmxfl0f5g2mu9k65zy6hjnxv0ylj6ayx',
            'ecash:qqn8lrttakayr78kxmc05atw47kg59cjg5ktys8sds',
            'ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5',
        ],
        replyAddress: 'ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5',
        appActions: [],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                tokenSatoshis: '5000',
            },
        ],
    },
    /** Wallet hash for recipient (286eabaf796ec8be1265c79f57b6c93114c0387f) */
    receivingHash: '286eabaf796ec8be1265c79f57b6c93114c0387f',
};

export const edjFirmaPayoutTx = {
    tx: {
        txid: '62cbd0419cb896b43d062487d73fc66f9fd1e0dbf465d309fe26541385ff8936',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '9128128e6b7a5fde33362b931e6e4b6c74ccb4a353bc8d036a191b8cba5b07ce',
                    outIdx: 1,
                },
                inputScript:
                    '410be2f99b8bb84305405332bf23141cb79e9dc96ac76eb58bead7e4b9d64d960aea2fd4b7bc5483404b4b6b005e0fdc335382ecbf83f4428eb165f3d12efc32a44121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 11n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
            {
                prevOut: {
                    txid: 'bf094d0e36adbf9abff09e305e382affb89958df68c79ca5d98b3e162e660c54',
                    outIdx: 2,
                },
                inputScript:
                    '410b660e0cda30f26e90e32b8b1aa6a820bac9c9acf238a2689397275349f45721009b3c6f694d5c243539e53b059433f5e5a979435393954f9ea7951579e889564121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 49537n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
            {
                prevOut: {
                    txid: 'c4adc31eed0f47e774e03f5e99903eb736785bb567b33b29851e558b9947a51a',
                    outIdx: 2,
                },
                inputScript:
                    '4107aa943983a0f6bcbf5649965b8f1a9c75742f5fa80fa6c1c1522ce8f986a4f661019bf3da55e367151f28f4bb2226800c05a7d6944d51de6cfb0d9e6700c3aa4121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 52860n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
            {
                prevOut: {
                    txid: 'ee80070dfda7f4f0ca3cf5aa4d5cc1c6e6be802837f8deabbc3fc620d6f33ce2',
                    outIdx: 24,
                },
                inputScript:
                    '410add4c528f71958faa48c303d2f9df569d0a3013d56a908732947cc60c5f4485c888fec5f908409acb24f5e626eef9911809338377fbb59ee7227745c010c09a4121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 106n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
            {
                prevOut: {
                    txid: '0a4f46313d5e5594588b13308b5354384c7538d81d050dc8fa686600c8287396',
                    outIdx: 2,
                },
                inputScript:
                    '41586d5eb9f1252f36afedfa2f25dc6d713cf4852b44a4fa55db67c6cf3547bc732104bf88d8746959b64108d6a2487cd24063d413cc84ca8bba96a3762e9a7b074121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 47048n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302822a02000000b81d0000000034f09f8f8667000000543a02000000000089000000956c1d56c0ef15ed31fa69ff2c5773020b18adc1ec763eeb46f4774bf83c8fca',
            },
            {
                sats: 546n,
                outputScript:
                    '76a914c9ff3dc758c72bdd1fac4a557799a16c465668c688ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 141954n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 7608n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 701n,
                outputScript:
                    '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1771452003,
        size: 937,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
        isFinal: true,
        block: {
            height: 936949,
            hash: '000000000000000015ef9f68e4def4ed0009d901f050632d672779cd444c6c8c',
            timestamp: 1771452363,
        },
    },
    parsed: {
        satoshisSent: 546,
        stackArray: [
            '50',
            '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302822a02000000b81d00000000',
            'f09f8f8667000000543a02000000000089000000956c1d56c0ef15ed31fa69ff2c5773020b18adc1ec763eeb46f4774bf83c8fca',
        ],
        xecTxType: 'Received',
        recipients: ['ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5'],
        replyAddress: 'ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5',
        appActions: [
            {
                lokadId: 'f09f8f86',
                app: 'EDJ.com Payout',
                isValid: true,
                action: {
                    numTxs: 103,
                    potAtoms: 146004n,
                    winnerOddsBps: 137,
                    winnerTxid:
                        '956c1d56c0ef15ed31fa69ff2c5773020b18adc1ec763eeb46f4774bf83c8fca',
                },
            },
        ],
        parsedTokenEntries: [
            {
                renderedTokenType: 'ALP',
                renderedTxType: 'SEND',
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenSatoshis: '141954',
            },
        ],
    },
    /** Wallet hash for winner (c9ff3dc758c72bdd1fac4a557799a16c465668c6) */
    receivingHash: 'c9ff3dc758c72bdd1fac4a557799a16c465668c6',
};
