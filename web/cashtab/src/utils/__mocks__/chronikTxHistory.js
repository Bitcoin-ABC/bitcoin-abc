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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12214100',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '88888888888',
                            isMintBaton: false,
                        },
                        spentBy: {
                            txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '12213031',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                            outIdx: 67,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'GENESIS',
                        tokenId:
                            '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    },
                    genesisInfo: {
                        tokenTicker: 'CKA',
                        tokenName: 'Chronik Alpha',
                        tokenDocumentUrl: 'https://cashtab.com/',
                        tokenDocumentHash: '',
                        decimals: 8,
                    },
                },
                block: {
                    height: 757174,
                    hash: '000000000000000011c5e064ac6295bb1c1e1c306019e591b9c79290c24c33ff',
                    timestamp: '1663091856',
                },
                timeFirstSeen: '1663091668',
                size: 304,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12218055',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
                    },
                    {
                        value: '3500',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '12214100',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: '1663090626',
                },
                timeFirstSeen: '1663089642',
                size: 387,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12224078',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
                    },
                    {
                        value: '2200',
                        outputScript:
                            '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    },
                    {
                        value: '3300',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '12218055',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: '1663090626',
                },
                timeFirstSeen: '1663089621',
                size: 303,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12230101',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '3300',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '2200',
                        outputScript:
                            '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    },
                    {
                        value: '12224078',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: '1663090626',
                },
                timeFirstSeen: '1663089593',
                size: 260,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12233856',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '3300',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '12230101',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 757171,
                    hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
                    timestamp: '1663090626',
                },
                timeFirstSeen: '1663089364',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12235011',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript: '6a04007461620454657374',
                    },
                    {
                        value: '700',
                        outputScript:
                            '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
                    },
                    {
                        value: '12233856',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 755309,
                    hash: '0000000000000000115c75e7b0728b548e9f21bb9ebdcad68d36475e712ceed5',
                    timestamp: '1661972428',
                },
                timeFirstSeen: '1661972247',
                size: 245,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '12243166',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '7700',
                        outputScript:
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                        spentBy: {
                            txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                            outIdx: 3,
                        },
                    },
                    {
                        value: '12235011',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 743257,
                    hash: '000000000000000013259e217a18907ba956c55f839b6b15a11a79a2bf303d9f',
                    timestamp: '1654812393',
                },
                timeFirstSeen: '0',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '14743621',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '2500000',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                            outIdx: 0,
                        },
                    },
                    {
                        value: '12243166',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 742800,
                    hash: '000000000000000009e1ed934f027563d161d1f59a00253496b0c847c2288c38',
                    timestamp: '1654543720',
                },
                timeFirstSeen: '0',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '14746276',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
                    },
                    {
                        value: '2200',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                            outIdx: 0,
                        },
                    },
                    {
                        value: '14743621',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 741058,
                    hash: '00000000000000000bb6dc63cd48a9b0dcf37a9b722618209dc85a79e8dc7973',
                    timestamp: '1653506978',
                },
                timeFirstSeen: '0',
                size: 371,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        value: '14748931',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '2200',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                            outIdx: 1,
                        },
                    },
                    {
                        value: '14746276',
                        outputScript:
                            '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                        spentBy: {
                            txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                            outIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                block: {
                    height: 739747,
                    hash: '0000000000000000079aa77192cf335b2004788c2860be98c310a5187a588dd3',
                    timestamp: '1652722196',
                },
                timeFirstSeen: '0',
                size: 225,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '49545',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1300',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '47790',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: '1663956316',
                },
                timeFirstSeen: '1663956020',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '47562',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1200',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '45907',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: '1663956316',
                },
                timeFirstSeen: '1663956011',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '3300',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1100',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '1745',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: '1663956316',
                },
                timeFirstSeen: '1663956003',
                size: 226,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '34',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '5',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        slpToken: {
                            amount: '29',
                            isMintBaton: false,
                        },
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    },
                },
                block: {
                    height: 758570,
                    hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
                    timestamp: '1663956316',
                },
                timeFirstSeen: '1663955995',
                size: 445,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '1100',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '7700',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpToken: {
                            amount: '126',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        slpToken: {
                            amount: '125',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '6655',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                slpTxData: {
                    slpMeta: {
                        tokenType: 'FUNGIBLE',
                        txType: 'SEND',
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    },
                },
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: '1663955917',
                },
                timeFirstSeen: '1663955725',
                size: 628,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '3300',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1900',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '945',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: '1663955917',
                },
                timeFirstSeen: '1663955710',
                size: 225,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '1700',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '3300',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1800',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                    {
                        value: '2448',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: '1663955917',
                },
                timeFirstSeen: '1663955701',
                size: 372,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        value: '2200',
                        sequenceNo: 4294967295,
                    },
                ],
                outputs: [
                    {
                        value: '1700',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758569,
                    hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
                    timestamp: '1663955917',
                },
                timeFirstSeen: '1663955694',
                size: 191,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '43783281',
                        sequenceNo: 4294967295,
                    },
                    {
                        prevOut: {
                            txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '546',
                        sequenceNo: 4294967295,
                        slpBurn: {
                            token: {
                                amount: '1',
                                isMintBaton: false,
                            },
                            tokenId:
                                '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                        },
                        slpToken: {
                            amount: '100',
                            isMintBaton: false,
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
                    },
                    {
                        value: '546',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        slpToken: {
                            amount: '99',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: '43781463',
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
                            '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                    },
                },
                block: {
                    height: 758551,
                    hash: '000000000000000004ac3b44419bb5f0e0b47937b3e7e781206270da01b4a53e',
                    timestamp: '1663947923',
                },
                timeFirstSeen: '1663947876',
                size: 437,
                isCoinbase: false,
                network: 'XEC',
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
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        value: '10409988',
                        sequenceNo: 4294967295,
                        slpBurn: {
                            token: {
                                amount: '0',
                                isMintBaton: false,
                            },
                            tokenId:
                                'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
                        },
                    },
                ],
                outputs: [
                    {
                        value: '0',
                        outputScript:
                            '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
                    },
                    {
                        value: '1200',
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        value: '10408333',
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    },
                ],
                lockTime: 0,
                block: {
                    height: 758550,
                    hash: '000000000000000009f8cdae9bb21a321896126e06413a4e8af24a182edf701e',
                    timestamp: '1663947819',
                },
                timeFirstSeen: '1663946739',
                size: 404,
                isCoinbase: false,
                network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12214100',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010747454e4553495303434b410d4368726f6e696b20416c7068611468747470733a2f2f636173687461622e636f6d2f4c0001084c000800000014b230ce38',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '88888888888',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'a83257b2facf7c6d4f8df9a307dee9cc79af9323b8bb803994d5c967bf916569',
                    outIdx: 1,
                },
            },
            {
                value: '12213031',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '5fc6f53ef0f94e66d5f6983402441cfdece1dbd35bd500b6e15881d1b37aa93f',
                    outIdx: 67,
                },
            },
        ],
        lockTime: 0,
        slpTxData: {
            slpMeta: {
                tokenType: 'FUNGIBLE',
                txType: 'GENESIS',
                tokenId:
                    '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
            },
            genesisInfo: {
                tokenTicker: 'CKA',
                tokenName: 'Chronik Alpha',
                tokenDocumentUrl: 'https://cashtab.com/',
                tokenDocumentHash: '',
                decimals: 8,
            },
        },
        block: {
            height: 757174,
            hash: '000000000000000011c5e064ac6295bb1c1e1c306019e591b9c79290c24c33ff',
            timestamp: '1663091856',
        },
        timeFirstSeen: '1663091668',
        size: 304,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12218055',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624c910458f886baf61daf6fa1909aab79e30bca8d35d634c6c5e969b2157b87e67fa010252a9fd1eebeed00075d0fb7bcc0dcb73b41cc73adacdae2be18d31643ad3f33d95f9a97e7cf00b2231fd0a7d37f36d082c86a392bde59eac693c002f861082d7d3cbc23eafd4511afe3619bfc0f0c028454038dee71a6e7796395574b9a06b9bf7aaf0cd607e59f4ad641393d746f88',
            },
            {
                value: '3500',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12214100',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089642',
        size: 387,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12224078',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04007461621c54657374696e67206d756c74692d73656e642077697468206e6f7465',
            },
            {
                value: '2200',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12218055',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd27609956b0e4313f807fd58b82cc77f9b2bba1a792eac02707462a3d6863958',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089621',
        size: 303,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12230101',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '2200',
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
            {
                value: '12224078',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'd0470ea0b1e0d5cc6a20085ca1436e8c4752415a450a981ef2dd23105bbe2550',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089593',
        size: 260,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12233856',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '3300',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12230101',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'a5f2a143eeec451c0714e430dd5553cbee26f6f05571a316dfb784b3454855d9',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 757171,
            hash: '00000000000000000518fc1d8fe67064dcaec41264773455a988c9d0c12f58ad',
            timestamp: '1663090626',
        },
        timeFirstSeen: '1663089364',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12235011',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript: '6a04007461620454657374',
            },
            {
                value: '700',
                outputScript:
                    '76a9149ee95bbfbdd2cf0eb6005bd75f717e4193b5913488ac',
            },
            {
                value: '12233856',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bdd18f49a557c57b79da4b8a3165be6202fb48809486ec04424de99f52abeee8',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 755309,
            hash: '0000000000000000115c75e7b0728b548e9f21bb9ebdcad68d36475e712ceed5',
            timestamp: '1661972428',
        },
        timeFirstSeen: '1661972247',
        size: 245,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '12243166',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '7700',
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                spentBy: {
                    txid: '04eedd3f4b4dc9727e393ad3e774f2dc0c6acf9e920dc6fcbcbf95ed9b98477c',
                    outIdx: 3,
                },
            },
            {
                value: '12235011',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '71c0f2d76c81bb91c6bf4de69693d95e8f043af9e055e949616443090f961d80',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 743257,
            hash: '000000000000000013259e217a18907ba956c55f839b6b15a11a79a2bf303d9f',
            timestamp: '1654812393',
        },
        timeFirstSeen: '0',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14743621',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2500000',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '55388f67ab1b23d2e6c146472b836c1ba1df33dd9b7685bed34c6c9ce6fe5c0e',
                    outIdx: 0,
                },
            },
            {
                value: '12243166',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '3f7cbb380b2ad014fc6e95f2d4c10eda2f37c5686f6739af562e6e855c457b3b',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 742800,
            hash: '000000000000000009e1ed934f027563d161d1f59a00253496b0c847c2288c38',
            timestamp: '1654543720',
        },
        timeFirstSeen: '0',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14746276',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04657461624c810406fe30e60d38c4408043ca5b43cd515db4b10af477007962db6d019eeb9c3f6734c495574368da107bb00b32a27d096069706a0fb91fe18d0d8281c1b826fdd862a1955dd0d28b4e0245c862085f172d3947ca202953095ed014258f069c4d3fc36706e842b6643061e4ce70b91fb5b5b206de4d3b81a621ad9d4456c3f0cf6b',
            },
            {
                value: '2200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '31e5bf25b892e173483c7b100a5b0fcda03cac9337c335fda3b3a5cf17b64759',
                    outIdx: 0,
                },
            },
            {
                value: '14743621',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: 'bd0101c9389c5e1fada4662ea9ba7c8d71f949743e42f2db563cb0ec96bd10a3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 741058,
            hash: '00000000000000000bb6dc63cd48a9b0dcf37a9b722618209dc85a79e8dc7973',
            timestamp: '1653506978',
        },
        timeFirstSeen: '0',
        size: 371,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                value: '14748931',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2200',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '46158de814d73ded1a8f91221c85d9c91c696eaf14f0bd10e6fa7215bacf7852',
                    outIdx: 1,
                },
            },
            {
                value: '14746276',
                outputScript:
                    '76a914a9f494266e4b3c823712f27dedcb83e30b2fe59f88ac',
                spentBy: {
                    txid: '20230f564987e644070e35fa4a809b8d697c725023a903c638194231ddf9cfd3',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        block: {
            height: 739747,
            hash: '0000000000000000079aa77192cf335b2004788c2860be98c310a5187a588dd3',
            timestamp: '1652722196',
        },
        timeFirstSeen: '0',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
    },
    {
        block: {
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            height: 758570,
            timestamp: '1663956316',
        },
        inputs: [
            {
                inputScript:
                    '483045022100f50735a67538602ec240725f9160bdfc96b4ae443fff2cebaf25485e8f98f5720220584ab745222cc7a0cd33d6f287885781b8009bc1e819b9b97436ecdb31abeff2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: 'c0ab154992174fc86381540dbf016d64c4e218a07aec7d5734a841ccbab93e1c',
                },
                sequenceNo: 4294967295,
                value: '49545',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '1300',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '47790',
            },
        ],
        size: 226,
        timeFirstSeen: '1663956020',
        txid: '09033290a18b5c3054dbb6df8b6ad5c3e2bc121ab4cb2a91f79cedb36f05a2ef',
        version: 2,
    },
    {
        block: {
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            height: 758570,
            timestamp: '1663956316',
        },
        inputs: [
            {
                inputScript:
                    '483045022100ac91ae0c612165e500605ae41080a30be891ef757c378733bfe5533f331d0e97022020babc7d6a267fc5fbab8ba9740968732978abf4cf63e049721c008532204bf8412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 1,
                    txid: '5b679c422abc750576c188e3ed0729fb0e452f6ae0a8ad118026755fbceb00b1',
                },
                sequenceNo: 4294967295,
                value: '47562',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '1200',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '45907',
            },
        ],
        size: 226,
        timeFirstSeen: '1663956011',
        txid: 'daf142f1f90dc81efeafb94f986b951ff3bae6fb155565d96fd091e34e61ee29',
        version: 2,
    },
    {
        block: {
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            height: 758570,
            timestamp: '1663956316',
        },
        inputs: [
            {
                inputScript:
                    '48304502210086a6072eaabb3502c73cbb6701c04edca374de60d62b888614d76b352203e9d602205721cec95da5a0ceda4cf54bf4bf8f54bec3d07b1caa75e1d65a87d8b5572f0f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: '930259a2fe4de56a15ab33d5f2b13bfd08568c3d662df6b1a3c090a19aab8104',
                },
                sequenceNo: 4294967295,
                value: '3300',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '1100',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1745',
            },
        ],
        size: 226,
        timeFirstSeen: '1663956003',
        txid: '376593dc3d3e305843fe23692e1477ae13ae1e8bfc778273c544a0c5d6285337',
        version: 2,
    },
    {
        block: {
            hash: '00000000000000000d1c7a165d8d185103ab30fb2d113334a9d8ee6cb6a9d268',
            height: 758570,
            timestamp: '1663956316',
        },
        inputs: [
            {
                inputScript:
                    '47304402207031eafbfb4f762f1eb719defa8cb890f55085c593244eecce57082b7013fd4f02205178c40c57903baa3d9ebf554d2f3892859599b6e358e10725db81c14de4c80f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: '08ac32dc47252668cd32dbe0d9af15d1ae9e282ae56c3743a258d11613105924',
                },
                sequenceNo: 4294967295,
                value: '2200',
            },
            {
                inputScript:
                    '473044022058d957ffc312b4f9eefd71fb2c708e0a82bf72e56fdb322d75b4201453e413c402200df9176569cb2523f541dcff39f27c116926b214de37109775f3e5015e050604412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 2,
                    txid: '47d4940ded21de01c62675d31e211a381cc7d866dcf292af0422cdc616d927a8',
                },
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '34',
                    isMintBaton: false,
                },
                value: '546',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000508000000000000001d',
                value: '0',
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '5',
                    isMintBaton: false,
                },
                value: '546',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '29',
                    isMintBaton: false,
                },
                value: '546',
            },
        ],
        size: 445,
        slpTxData: {
            slpMeta: {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
            },
        },
        timeFirstSeen: '1663955995',
        txid: '2faa94a50ddffc795f6044214efbca0d0190ed520e7e0fd35c4623ecd64b4e45',
        version: 2,
    },
    {
        block: {
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            height: 758569,
            timestamp: '1663955917',
        },
        inputs: [
            {
                inputScript:
                    '483045022100f4734cb1a5e7a64013b5408b9d0d6bc59560b08b9e7284f8bbba217f777f772c02204625fab8a1356f96f00a463be8aa64e90f663744554df60807d1aa1e00d19c5e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: 'a429b818424b74153b363e487a577142f4e9bd67530739ed6883d8a6d71ea947',
                },
                sequenceNo: 4294967295,
                value: '1100',
            },
            {
                inputScript:
                    '483045022100892a72b025cd5cd667bace86dfc605169018d9b46fa9ba2ef963e4dbe26a471702201283b63ebe679be3c27edc7b37aff829ba34503430147e203661d4d4ec4f14a5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: 'e9c384cc569ad83d4fc61a54cac405ff2d64a5f532d94006bc38b87296c6bf63',
                },
                sequenceNo: 4294967295,
                value: '7700',
            },
            {
                inputScript:
                    '47304402203bcfcdbd76587aaa0b525edec82a5078daef892a98ae76d39accf1d874bd526d02202e2eba394d27b82c54fd3605ebafe7d6c9d2e7fa5dc769a4dc113dfbf5025a9d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 2,
                    txid: '7a197add9eb4a57d854aaf31dd12fd71a806e4ba4fb4bf23ed7097cd281faae2',
                },
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '126',
                    isMintBaton: false,
                },
                value: '546',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000108000000000000007d',
                value: '0',
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '1',
                    isMintBaton: false,
                },
                value: '546',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '125',
                    isMintBaton: false,
                },
                value: '546',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '6655',
            },
        ],
        size: 628,
        slpTxData: {
            slpMeta: {
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
            },
        },
        timeFirstSeen: '1663955725',
        txid: '050705e14d2d27e1cb59127617d54a5cccd91c4cad6ffe8c2c6eb684e9d76042',
        version: 2,
    },
    {
        block: {
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            height: 758569,
            timestamp: '1663955917',
        },
        inputs: [
            {
                inputScript:
                    '4730440220606efba360bf0843f8c3fe9fab7d1cdc34852395b9045a4c3cf8f27b91d414f2022054fb11ce6e4fd2ee50ba467e94460c63e45fb563e330fc35c5caa8eea71e93b7412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: '43beeeeb761c401a1d121840e87c86237c98e9310e889feb0a34426e2a1ee463',
                },
                sequenceNo: 4294967295,
                value: '3300',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '1900',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '945',
            },
        ],
        size: 225,
        timeFirstSeen: '1663955710',
        txid: 'c66b09f5c6b2afa5c63ff7c2ca2cc8d9538568a18c75b0e7d900c9c1be2758f7',
        version: 2,
    },
    {
        block: {
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            height: 758569,
            timestamp: '1663955917',
        },
        inputs: [
            {
                inputScript:
                    '47304402204569cce381885918e300caef1e8a5388b86be871ff3e8f8f52917c26df9dde760220474e3ce3f6363a826d2772e347c296773ea838f493882e15fdc6a5181286a92c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: '08cb593e2b2d0a47649990591bf30eee51534f85658fc8ee4e98e12e1c5c5553',
                },
                sequenceNo: 4294967295,
                value: '1700',
            },
            {
                inputScript:
                    '47304402206355208bd3eae6d3468a062a6cc33340cd82e0e5def4dad1efa7caee652b21b40220619f05019e5014f1154659bbf5a46f4abbf93e04eecca8c509d231eb2a495f41412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: 'cb68f53c0e46ab2ec0ceb28d87aa5b8b8a059c72b3c1f977141760d8dc93c821',
                },
                sequenceNo: 4294967295,
                value: '3300',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '1800',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2448',
            },
        ],
        size: 372,
        timeFirstSeen: '1663955701',
        txid: '96c9031e30dba075dd83f622ed952ef7bb75fe12abdad962e70e9904272a7532',
        version: 2,
    },
    {
        block: {
            hash: '00000000000000000cbb0ac1fe8b1a4a87cd9bf58e7158333a1c32009c9137f0',
            height: 758569,
            timestamp: '1663955917',
        },
        inputs: [
            {
                inputScript:
                    '4730440220665f4bf3d94204649f8a1731285eb6e94940e38a3601504612374ec0a06ff27f02206276844772b498726e3e56145d42f2316da5646619d8288598f18e828426881f412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                prevOut: {
                    outIdx: 0,
                    txid: 'a737c1372586cf30d76d8bdcac8e96e2c321f667a77ec4bb9980e603e2a77b3d',
                },
                sequenceNo: 4294967295,
                value: '2200',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '1700',
            },
        ],
        size: 191,
        timeFirstSeen: '1663955694',
        txid: 'c25516f6d82e4299849edbd730ecb55b2b0e4745d95735b43bb4d16a67f50113',
        version: 2,
    },
    {
        block: {
            hash: '000000000000000004ac3b44419bb5f0e0b47937b3e7e781206270da01b4a53e',
            height: 758551,
            timestamp: '1663947923',
        },
        inputs: [
            {
                inputScript:
                    '47304402204b4de25ffee112642136a6d1ad74394c7bfb984a08703d5362500a5521d346dc022053c3e887d7bb27a2525140789a7f450b0995781787ce28750dca1421b746721f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                prevOut: {
                    outIdx: 5,
                    txid: '0c67c0b670378c6ae959172eefd099247be944cdb88108d52589731f2194d675',
                },
                sequenceNo: 4294967295,
                value: '43783281',
            },
            {
                inputScript:
                    '483045022100d4d1566db73386cd9580ff6f2c60e1536993b459fb3b199d7514fbd6fb5042ca0220590e88aa183ed6a756fbb8d8ba4bf5133f578746a917fab1e1b8e712543c5861412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                prevOut: {
                    outIdx: 1,
                    txid: '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                },
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '1',
                        isMintBaton: false,
                    },
                    tokenId:
                        '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                },
                slpToken: {
                    amount: '100',
                    isMintBaton: false,
                },
                value: '546',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '6a04534c500001010453454e44203515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9080000000000000063',
                value: '0',
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '99',
                    isMintBaton: false,
                },
                value: '546',
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '43781463',
            },
        ],
        size: 437,
        slpTxData: {
            slpMeta: {
                tokenId:
                    '3515f4a9851ad44124e0ddf6149344deb27a97720fc7e5254a9d2c86da7415a9',
                tokenType: 'FUNGIBLE',
                txType: 'SEND',
            },
        },
        timeFirstSeen: '1663947876',
        txid: 'de5c518dc2d3d52268c3aeb788134ac373553b2eb239f256fa463c728af87189',
        version: 2,
    },
    {
        block: {
            hash: '000000000000000009f8cdae9bb21a321896126e06413a4e8af24a182edf701e',
            height: 758550,
            timestamp: '1663947819',
        },
        inputs: [
            {
                inputScript:
                    '483045022100e43086bb67006f6d5140a3329001bc53dabe2da4dbe7feae34dd5f10311b15ad022045da448bc99003af6cf6d4c74ec9891c60932013dde7451abca4a6bc40b6138d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                prevOut: {
                    outIdx: 3,
                    txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                },
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
                },
                value: '10409988',
            },
        ],
        isCoinbase: false,
        lockTime: 0,
        network: 'XEC',
        outputs: [
            {
                outputScript:
                    '6a04657461624ca104acd46779fb7a9a8e24656ba7ffcbc066bb78701630b0a3fd1c36a3e2b605d78e1d995ea990096a3f76077985d2194fd1a87369921545a544992c86414ed859247ab8f9c2979ed9b8fecb2cfaa7ff74f1daf6f7c00f3d97a5b942aecba54bf155d464606b6faa6f5efcbdf3f525b3283acf6867d11cfc30623c3107a87b499f68ca00602492c9cdca9b481c7f2b65a6ecd481bfdd244954b32a45c658592182ad',
                value: '0',
            },
            {
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1200',
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                value: '10408333',
            },
        ],
        size: 404,
        timeFirstSeen: '1663946739',
        txid: 'd34f524ca0509e83718516ce697eeed5452ea0e312bab50ce0172589275fdd84',
        version: 2,
    },
];
