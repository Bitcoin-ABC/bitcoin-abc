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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008461ccf6961f300a0f8c7ec5526813b531aea5033cacef6d15ab7e033f50130102206d22a9a7bd0ec2f04ace2c0642f233fea3bbed7ee677e53416845a0bfd367044412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '17',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000e080000000000000003',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '14',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '3',
                    isMintBaton: false,
                },
            },
            {
                value: '1482',
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
        timeFirstSeen: '1663957661',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '4f1a2f3e24b270b57e4d6b9bc6204360cdfeb1dfeca7d92379d49a7ba55c8a5f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cff4ca28b0bd320f4aa7bd3029b0c1e48c392b42c56b7dfdca292bbb14302e5f02206bc74177a98481e49c937a6229ebd8191f653a363c95cd37b69f1300f05f6d3a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ad48dd7d1196b108e3ee0412edcbe468031dcf48244b9b4b57f6cc9e710c836602202e5a00a2c9e1e6fc8937af70fcb8018e299dd007235229e6e3d87f6af9f8761c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '228',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000d0800000000000000d7',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '13',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '215',
                    isMintBaton: false,
                },
            },
            {
                value: '1255',
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
        timeFirstSeen: '1663957652',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1700',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957640',
        size: 192,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '5500',
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
                value: '3945',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957633',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1000',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '745',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957623',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '3300',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008461ccf6961f300a0f8c7ec5526813b531aea5033cacef6d15ab7e033f50130102206d22a9a7bd0ec2f04ace2c0642f233fea3bbed7ee677e53416845a0bfd367044412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '17',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000e080000000000000003',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '14',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '3',
                    isMintBaton: false,
                },
            },
            {
                value: '1482',
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
        timeFirstSeen: '1663957661',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '4f1a2f3e24b270b57e4d6b9bc6204360cdfeb1dfeca7d92379d49a7ba55c8a5f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cff4ca28b0bd320f4aa7bd3029b0c1e48c392b42c56b7dfdca292bbb14302e5f02206bc74177a98481e49c937a6229ebd8191f653a363c95cd37b69f1300f05f6d3a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100ad48dd7d1196b108e3ee0412edcbe468031dcf48244b9b4b57f6cc9e710c836602202e5a00a2c9e1e6fc8937af70fcb8018e299dd007235229e6e3d87f6af9f8761c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '228',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000d0800000000000000d7',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '13',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '215',
                    isMintBaton: false,
                },
            },
            {
                value: '1255',
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
        timeFirstSeen: '1663957652',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1700',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957640',
        size: 192,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '5500',
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
                value: '3945',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957633',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '2200',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '1000',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '745',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663957623',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '39162',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2500',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '36207',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960417',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '42017',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2400',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '39162',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960406',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '44772',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2300',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '42017',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960398',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1825562',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1822907',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960388',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1190050',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1187495',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960377',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '46590',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200e225ab4c7d20aef968d95fbf6f881f313c9b35aef891edd4192c5320f147f2502205794732b6242c3a445ee1340ca03950e2044321b9c99bf7d5805ea36cac756dc412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8832',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000000508000000000000227b',
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
                    amount: '8827',
                    isMintBaton: false,
                },
            },
            {
                value: '44772',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960365',
        size: 480,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1827380',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200fdb134c8a13fbd1b95ef118c247a8a911e9d52ecaafc86ebb80cc179d69c1e002200bd4dc809c998a511e09f939a3270f7a2f9babae9d75919d2fef83ed66cf7dde412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8836',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000004080000000000002280',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '4',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8832',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 1,
                },
            },
            {
                value: '1825562',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960353',
        size: 479,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '45507',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c96c70b94f5386efff2a8873d35d7b4c29fafe11555cf2a3daea8f905fb0f73502203751a29b351cca9c337345388237b98312873f44976f08667ae6540423a8d012412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8839',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000003080000000000002284',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '3',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8836',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 1,
                },
            },
            {
                value: '43689',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960344',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '848',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f8df9b24dc337b5c7b0b41f454fb535a181aa95814d01e3e2246908fda3a5d800220417d4bd3c10d59f9655ddae4229813222abd9a5b148db1a456fde4719ea8dc56412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '4800',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dcc45ddcb243a56ddee5d050dd961d553f4f93704378ce517ad47a161c6f768b022000ef68375269494caa36c9f063ecd6181dfb77b8c4e0e09fdb0433d5a484974e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8841',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000002080000000000002287',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '2',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8839',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 1,
                },
            },
            {
                value: '3503',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960334',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '992',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5bb9474c4d682171091ecba6203d3365dab6f3901936122d8035098a80596e2e',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221009b897d907bda2da570c5c273ab277b73c60d8fd39ba605829d0ec4b796fb7c20022011cc67871bf5df4693904fcdee80ac1adba332b14a4cdc9113b15f28e288adad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1191203',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100be82f7c67c73ecf068905a44ca2147d89b8041e54a432386b25137f7bea0d0aa0220416607e30a8d8d8c08237032eeb7728f938650a70215f6615939cd2455569539412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8842',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000001080000000000002289',
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
                    amount: '8841',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
            },
            {
                value: '1190050',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960323',
        size: 629,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '39162',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2500',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '36207',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960417',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '42017',
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: '2400',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '39162',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960406',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '44772',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2300',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '42017',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '66ce76f8ebcd0ac83702c4a71e259cee9fceedf9cfdb2b08e8ebe15483e50f56',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960398',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1825562',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2200',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1822907',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960388',
        size: 225,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1190050',
                sequenceNo: 4294967295,
                slpBurn: {
                    token: {
                        amount: '0',
                        isMintBaton: false,
                    },
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                },
            },
        ],
        outputs: [
            {
                value: '2100',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: '1187495',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: '1663960377',
        size: 226,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '46590',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200e225ab4c7d20aef968d95fbf6f881f313c9b35aef891edd4192c5320f147f2502205794732b6242c3a445ee1340ca03950e2044321b9c99bf7d5805ea36cac756dc412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8832',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000000508000000000000227b',
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
                    amount: '8827',
                    isMintBaton: false,
                },
            },
            {
                value: '44772',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960365',
        size: 480,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1827380',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200fdb134c8a13fbd1b95ef118c247a8a911e9d52ecaafc86ebb80cc179d69c1e002200bd4dc809c998a511e09f939a3270f7a2f9babae9d75919d2fef83ed66cf7dde412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8836',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000004080000000000002280',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '4',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8832',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '6bfdfbb71b71d0b1c024c777e5cc6a6b81806dbb673d4f5e65ab30476035f269',
                    outIdx: 1,
                },
            },
            {
                value: '1825562',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960353',
        size: 479,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '45507',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100c96c70b94f5386efff2a8873d35d7b4c29fafe11555cf2a3daea8f905fb0f73502203751a29b351cca9c337345388237b98312873f44976f08667ae6540423a8d012412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8839',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000003080000000000002284',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '3',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8836',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: '5944386e40a401ff31940f9d41e7983bec3b617d83efba0033eba28926a2fb9e',
                    outIdx: 1,
                },
            },
            {
                value: '43689',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960344',
        size: 481,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '848',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: 'b24bc776a3414479f31835e26c17713cd655dd51c30351a26d3900a126b6275e',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100f8df9b24dc337b5c7b0b41f454fb535a181aa95814d01e3e2246908fda3a5d800220417d4bd3c10d59f9655ddae4229813222abd9a5b148db1a456fde4719ea8dc56412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '4800',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '384e4b305f204597f77dee4677895bee356e5e3cac07806ad28e9115faddef6c',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100dcc45ddcb243a56ddee5d050dd961d553f4f93704378ce517ad47a161c6f768b022000ef68375269494caa36c9f063ecd6181dfb77b8c4e0e09fdb0433d5a484974e412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8841',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000002080000000000002287',
            },
            {
                value: '546',
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                slpToken: {
                    amount: '2',
                    isMintBaton: false,
                },
            },
            {
                value: '546',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                slpToken: {
                    amount: '8839',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'd1a286475ac63df6ae51ffe69be5324b848ddf4a0acf8510d9ec266cb4e10454',
                    outIdx: 1,
                },
            },
            {
                value: '3503',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960334',
        size: 628,
        isCoinbase: false,
        network: 'XEC',
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
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '992',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '5bb9474c4d682171091ecba6203d3365dab6f3901936122d8035098a80596e2e',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221009b897d907bda2da570c5c273ab277b73c60d8fd39ba605829d0ec4b796fb7c20022011cc67871bf5df4693904fcdee80ac1adba332b14a4cdc9113b15f28e288adad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '1191203',
                sequenceNo: 4294967295,
            },
            {
                prevOut: {
                    txid: '487c4a2fe93806f75670fff2dc0f5906739a8bf02dcf32af1759f33c17f8dc91',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100be82f7c67c73ecf068905a44ca2147d89b8041e54a432386b25137f7bea0d0aa0220416607e30a8d8d8c08237032eeb7728f938650a70215f6615939cd2455569539412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                value: '546',
                sequenceNo: 4294967295,
                slpToken: {
                    amount: '8842',
                    isMintBaton: false,
                },
            },
        ],
        outputs: [
            {
                value: '0',
                outputScript:
                    '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48080000000000000001080000000000002289',
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
                    amount: '8841',
                    isMintBaton: false,
                },
                spentBy: {
                    txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                    outIdx: 2,
                },
            },
            {
                value: '1190050',
                outputScript:
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                spentBy: {
                    txid: 'f051b152f13004c18b5aab3b615d88af8175fa5416426fb73e3731fa530f064d',
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
                    '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            },
        },
        timeFirstSeen: '1663960323',
        size: 629,
        isCoinbase: false,
        network: 'XEC',
    },
];

export const mockParseTxWallet = {
    mnemonic: 'string',
    name: 'string',
    Path245: {
        publicKey: 'string',
        hash160: '58549b5b93428fac88e36617456cd99a411bd0eb',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path145: {
        publicKey: 'string',
        hash160: '438a162355ef683062a7fde9d08dd720397aaee8',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    Path1899: {
        publicKey: 'string',
        hash160: '76458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        cashAddress: 'string',
        slpAddress: 'string',
        fundingWif: 'string',
        fundingAddress: 'string',
        legacyAddress: 'string',
    },
    state: {
        balances: {
            totalBalanceInSatoshis: '55421422',
            totalBalance: '554214.22',
        },
        tokens: [],
        slpBalancesAndUtxos: {
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: [],
        },
        parsedTxHistory: [],
        utxos: [],
    },
};

export const lambdaIncomingXecTx = {
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
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            value: '517521',
            sequenceNo: 4294967295,
        },
    ],
    outputs: [
        {
            value: '4200',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
        },
        {
            value: '512866',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
        },
    ],
    lockTime: 0,
    timeFirstSeen: '1652811898',
    network: 'XEC',
};

export const lambdaOutgoingXecTx = {
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
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            value: '4400000',
            sequenceNo: 4294967295,
        },
    ],
    outputs: [
        {
            value: '22200',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
        },
        {
            value: '4377345',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
        },
    ],
    lockTime: 0,
    timeFirstSeen: '1652823464',
    network: 'XEC',
};

export const lambdaIncomingEtokenTx = {
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
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            value: '3891539',
            sequenceNo: 4294967295,
        },
        {
            prevOut: {
                txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                outIdx: 2,
            },
            inputScript:
                '483045022100c45951e15402b907c419f8a80bd76d374521faf885327ba3e55021345c2eb41902204cdb84e0190a5f671dd049b6b656f6b9e8b57254ec0123308345d5a634802acd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            value: '546',
            sequenceNo: 4294967295,
            slpToken: {
                amount: '240',
                isMintBaton: false,
            },
        },
    ],
    outputs: [
        {
            value: '0',
            outputScript:
                '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000c0800000000000000e4',
        },
        {
            value: '546',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            slpToken: {
                amount: '12',
                isMintBaton: false,
            },
        },
        {
            value: '546',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            slpToken: {
                amount: '228',
                isMintBaton: false,
            },
        },
        {
            value: '3889721',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
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
    timeFirstSeen: '1652822000',
    network: 'XEC',
};

export const lambdaOutgoingEtokenTx = {
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
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            value: '450747149',
            sequenceNo: 4294967295,
        },
        {
            prevOut: {
                txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                outIdx: 1,
            },
            inputScript:
                '47304402203ba0eff663f253805a4ae75fecf5886d7dbaf6369c9e6f0bbf5c114184223fa202207992c5f1a8cb69b552b1af54a75bbab341bfcf90591e535282bd9409981d8464412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            value: '546',
            sequenceNo: 4294967295,
            slpToken: {
                amount: '69',
                isMintBaton: false,
            },
        },
    ],
    outputs: [
        {
            value: '0',
            outputScript:
                '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3080000000000000011080000000000000034',
        },
        {
            value: '546',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            slpToken: {
                amount: '17',
                isMintBaton: false,
            },
        },
        {
            value: '546',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            slpToken: {
                amount: '52',
                isMintBaton: false,
            },
        },
        {
            value: '450745331',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
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
    timeFirstSeen: '1652823534',
    network: 'XEC',
};
