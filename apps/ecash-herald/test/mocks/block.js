// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

module.exports = {
    blockTxs: [
        {
            txid: '0bf6e9cd974cd5fc6fbbf739a42447d41a301890e2db242295c64df63dc3ee7e',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000000',
                        outIdx: 4294967295,
                    },
                    inputScript:
                        '0392800c04904c5d650cfabe6d6d2a5055cb96fc034feb64a6533f9ba428768f019b0efc92797bb1eeae3bda05e410000000000000000800002bed8efca61700000015643839366564326466356633353334353432323837',
                    value: 0,
                    sequenceNo: 0,
                },
            ],
            outputs: [
                {
                    value: 362500000,
                    outputScript:
                        '76a914ce8c8cf69a922a607e8e03e27ec014fbc24882e088ac',
                    spentBy: {
                        txid: '2e3399f02280def3908afc561157cbaa159bbacee47dbcdebac15a668d009fc0',
                        outIdx: 1,
                    },
                },
                {
                    value: 200000000,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    spentBy: {
                        txid: '2df7650a9ebebd998d0dc756650144c21d84722c60fe6389c538d272f134d365',
                        outIdx: 226,
                    },
                },
                {
                    value: 62500000,
                    outputScript:
                        '76a914c36941af4c8cdf6e3156f7fe1426d05d6177890e88ac',
                    spentBy: {
                        txid: '6da0fa092de6c985365eb40ebe8a9112a62e48a1375dc348b2f2fc9fc27664d1',
                        outIdx: 27,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 239,
            isCoinbase: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 819346,
                hash: '00000000000000001d985578bc11edf9bbfee8daad0f39500e3f429c72fcf282',
                timestamp: 1700613264,
            },
        },
        {
            txid: '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '74bc6dd34b94ff3f0e398ef88e0df3b8c04457db274f9f8d098c9471f35593c6',
                        outIdx: 456,
                    },
                    inputScript:
                        '48304502210086860e8ee3721d2ebc919dca21e44ff96a2adc287528e46e12665dc1a5af75ec02206dd0c593becad3d4055ed011f9d61468a378090e1fe4246eeb34b68744ec5e93412103bc01efabf76dafe666a98c88fe72915c4cceb26cacf6772904b3fa1fa5629765',
                    value: 5285,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914104e67d912a7aab2a159bba141477e5867c04bfd88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010747454e45534953054c6f6c6c79054c4f4c4c591468747470733a2f2f636173687461622e636f6d2f4c0001084c00080162ea854d0fc000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914104e67d912a7aab2a159bba141477e5867c04bfd88ac',
                    token: {
                        tokenId:
                            '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '99900000000000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 4284,
                    outputScript:
                        '76a914104e67d912a7aab2a159bba141477e5867c04bfd88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 299,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f',
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
                height: 784969,
                hash: '0000000000000000071b57edd35439249dce297842995f4940eaefc6e88d0a9d',
                timestamp: 1679836351,
            },
        },
        {
            txid: '004e018dd98520aa722ee76c608771dd578a044f38103a8298f25e6ffbc7c3ba',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '825bd04c60b27ef652a5ec706cecaf9cec4dc10ce0010f468f8f3bbef6e1539a',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402202edcaf6fad2b7789b54ae9283db93f8028249dab78455653f4a1765aae29ca48022060f44bb9fcc82233ba64b4ba1725bfd1d451babb7f96d13c2ef8d833e972946941210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '92940000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                },
                {
                    prevOut: {
                        txid: '825bd04c60b27ef652a5ec706cecaf9cec4dc10ce0010f468f8f3bbef6e1539a',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100917c49035cd87aea0c004121561ec5c7488badbfc9ee51e9c7684c0717306bea02206a197976706fc6d6d05590f14482264e90ca080e561978257ba7df451debffd541210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                    value: 14274406,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000271008000000000589ffd0',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914dcc535261a43835ca12352d0926ba06cf07cbe8388ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '92930000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '4852929bc3809bb1b6fa5b607f4856df1d0cf13816e01c93a3b32f6a59647f73',
                        outIdx: 0,
                    },
                },
                {
                    value: 14273379,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    spentBy: {
                        txid: '4852929bc3809bb1b6fa5b607f4856df1d0cf13816e01c93a3b32f6a59647f73',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1713483767,
            size: 480,
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
                    actualBurnAmount: '0',
                    intentionalBurn: '0',
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 840667,
                hash: '00000000000000000292a87c1b0a07399bbeceec747e15b63b3d4b44837d0e3f',
                timestamp: 1713484694,
            },
        },
        {
            txid: '0110cd886ecd2d9570e98b7501cd039f4e5352d69659a46f1a49cc19c1869701',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '76cf25e029ad119042f956605f9386d82b640b2786fd19a8be22383e71c63066',
                        outIdx: 2,
                    },
                    inputScript:
                        '4830450221008295a1f9391cdcd4b6ce64e3667e50fbd4c2ce37abc15840cc686bb2ad9970bf022006a16801d509b6f72eca4393731604ee0f28ba0d6ce55dcd4c3b706c374eca8341210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '92640000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                },
                {
                    prevOut: {
                        txid: '76cf25e029ad119042f956605f9386d82b640b2786fd19a8be22383e71c63066',
                        outIdx: 3,
                    },
                    inputScript:
                        '47304402204fd42db620084ff54f32c60fb5cded7040255fdef7b6ba80a1a5a3b9f7c4fef1022042acf826a81e39c4224de432e92a24c1ee11c2a85d6f6f45f8e88cdbb081f4c441210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                    value: 14243596,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710080000000005856bf0',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91469724b96df46096cc95b1a6d408a4240ea80d85588ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '92630000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'a998c6bdd2d4755b4be7537a5ba064cc19428ce3a47d0c069ee4241a1a83058e',
                        outIdx: 0,
                    },
                },
                {
                    value: 14242569,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    spentBy: {
                        txid: 'a998c6bdd2d4755b4be7537a5ba064cc19428ce3a47d0c069ee4241a1a83058e',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1713484515,
            size: 480,
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
                    actualBurnAmount: '0',
                    intentionalBurn: '0',
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 840667,
                hash: '00000000000000000292a87c1b0a07399bbeceec747e15b63b3d4b44837d0e3f',
                timestamp: 1713484694,
            },
        },
        {
            txid: '327101f6f3b740280a6e9fbd8edc41f4f0500633672975a5974a4147c94016a5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'ddb98796d80acad3a291913e015cfbe30612be00d921533c67513e5d61e8bda5',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402207223b7e969380eb1c83569a6c217f2d6350f2b3f241d30af9446c04bc36d109f022049bcc4d0a9327f839618a8174af837ac61d6cea1d30962f2866c1dfb4a9d3e8041210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '92560000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                },
                {
                    prevOut: {
                        txid: 'ddb98796d80acad3a291913e015cfbe30612be00d921533c67513e5d61e8bda5',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100f5b0ca73d4d81cba5abf91d9d3531085768ef71b173b1a1701bbefc6cefad65202201540deb6e8c7c3ca96889ef6965abcc61c9c1e3e3ada3d70be1bed146f48bfe341210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                    value: 14235380,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710080000000005843370',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91458cddba2449285814dae43d4ed4a1c9998f3693e88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '92550000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '0a77eb6a5b08bc91a60a8ed8752ac2d3dc477e0c94624c486fcef7429be47d0d',
                        outIdx: 0,
                    },
                },
                {
                    value: 14234353,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    spentBy: {
                        txid: '0a77eb6a5b08bc91a60a8ed8752ac2d3dc477e0c94624c486fcef7429be47d0d',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1713484590,
            size: 480,
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
                    actualBurnAmount: '0',
                    intentionalBurn: '0',
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 840667,
                hash: '00000000000000000292a87c1b0a07399bbeceec747e15b63b3d4b44837d0e3f',
                timestamp: 1713484694,
            },
        },
        {
            txid: 'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100f7f2eac186605f5d37a038b17367a4b6fc5458ca7485ce6b77baf19b4160bcd8022029b5ef41a2ebb4642e9802d32a1649d84c7daf2e978c32ebc7342b90e9427cc1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '10000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: 'd8a081bed886b085194410fd879286393734f428c9f64d9ece1c0afffb2695a2',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100b0404d5d553867df9ed190ce52ec13565aaf6e3c8986b712c150acac6d3853f70220727abe6d27a333f72249a08f3b40cd15346c6096466b6118248f92279201b5f7412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 3899,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710080000000000986f70',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
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
                        txid: '80baab3dc64a3922c8d3ca11bacc6af4f05b103e15e18e9ea7592d926612c829',
                        outIdx: 0,
                    },
                },
                {
                    value: 546,
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
                        amount: '9990000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                        outIdx: 3,
                    },
                },
                {
                    value: 2872,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'fb6086e1e98f88fdef7abab312dfb68449d1b43d511e1f15c488a8cb804f1c51',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1713384505,
            size: 481,
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
                    actualBurnAmount: '0',
                    intentionalBurn: '0',
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 840499,
                hash: '000000000000000035b621834b4408d0b1a8da7d975cb14c0b9330d1e2398d8b',
                timestamp: 1713384866,
            },
        },
        {
            txid: '6ffcc83e76226bd32821cc6862ce9b363b22594247a4e73ccf3701b0023592b2',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'b07e3e6a696b7de3c4474107c5a5691d759713060832b2489c353a0718cf8a78',
                        outIdx: 2,
                    },
                    inputScript:
                        '48304502210081ba28d95e619fbc5997299a03a0ae2ffa0bf0af66277b6d57087ac45a1a300502202c8cac931e6e58aac9c318f59e31df3b149d240244f6d74fc1b5aa19fad742c6412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 15177819,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: '07ad02a4477d02ee5007e32fdc576769aa3a0e501f978549eb746c83e41fe52f',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100d117557506158821beb623a0a9c6ecbc88011a1eca397afe910067a994ad35fd022003355bd201f7f21edeedc2a4f3991530043ee9981021887702152418c2b28b7d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
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
                        amount: '999977691',
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
                        '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000003708000000003b9a72a4',
                },
                {
                    value: 546,
                    outputScript:
                        '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                    token: {
                        tokenId:
                            '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '55',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
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
                        amount: '999977636',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 15176136,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '5f06207dea4762524dbe2d84900cc78711d079f2b2e909867ec5e9abdeb850aa',
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
            block: {
                height: 800716,
                hash: '0000000000000000140fb9e3f5ba1d76a1902ede29aec1b6c93edf9a4e11e44b',
                timestamp: 1689261128,
            },
        },
        {
            txid: 'fb70df00c07749082756054522d3f08691fd9caccd0e0abf736df23d22845a6e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'b8ed29af5e165f26062bc553406fe642a5a8e9e52dec1f281112f4f16af717b9',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402206f260f779e10e44d290d7092b4a4f627c5387e30c2e2080e1ac3a726adb33f850220562e7e32bba69f4dad19bf267f1721b9d80e7504135edbb50ff5f1ec1ebf99e8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    value: 17421473,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: '9c0c01c1e8cc3c6d816a3b41d09d65fda69de082b74b6ede7832ed05527ec744',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402204f6ed41e291f0ad846be2516e7626ed0adbcf64f8a13a05897f61f7ce7f7afba0220559546ea121ad78ae6b2ff91f33e0a083299c0657fb3122a251eb6d05e2a6269412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
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
                        amount: '5235120638765433',
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
                        '6a04534c500001010453454e44207443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d0800000000068c953f08001299507b7b143a',
                },
                {
                    value: 546,
                    outputScript:
                        '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                    token: {
                        tokenId:
                            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '109876543',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
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
                        amount: '5235120528888890',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 17419790,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '8f6676b602a9f074f10a7561fb7256bbce3b103a119f809a05485e42489d2233',
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
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
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
                height: 800716,
                hash: '0000000000000000140fb9e3f5ba1d76a1902ede29aec1b6c93edf9a4e11e44b',
                timestamp: 1689261128,
            },
        },
        {
            txid: '25345b0bf921a2a9080c647768ba440bbe84499f4c7773fba8a1b03e88ae7fe7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1f5f4350b93708ca60b94c51ce3135dcaeef5ce64bb7dbc2934a442917ccad1a',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100889c5bc4aac2b8fba02f2414c596f5458d47acc3f21f8893a8fc5c367ca2559702205fe45c504ed024740df74811f8a75b40831cbdbfdad72aa332112fe0f759f0f2412103632f603f43ae61afece65288d7d92e55188783edb74e205be974b8cd1cd36a1e',
                    value: 1528001,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                },
                {
                    prevOut: {
                        txid: '5ca2cb70c3c351da6fff27d06dec6271449e52e37c38bbf1a5cfb64dd6dde161',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022016f9ad02f956cb7160099c80a5899bca83e92965665c9b75f2719f4432ab8dcf02206d7b8f1e29eb2761798cb76f96efc623ec72764f79f8d85320c1c4566fbc08b9412103632f603f43ae61afece65288d7d92e55188783edb74e205be974b8cd1cd36a1e',
                    value: 546,
                    sequenceNo: 4294967294,
                    token: {
                        tokenId:
                            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '34443689000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010453454e4420fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa08000000001dcd65000800000007e7339728',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                    token: {
                        tokenId:
                            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '500000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '9b4cad218d7743f1610d73577e2c3c4bcd97a2e70a61e69aea67088277dad936',
                        outIdx: 2,
                    },
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
                        amount: '33943689000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'd28244a5f79ed2323c543294d901fc0fe6ecc3c08f2ab4224ac141289daa4da9',
                        outIdx: 1,
                    },
                },
                {
                    value: 1526318,
                    outputScript:
                        '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                    spentBy: {
                        txid: '660d23a32becd5fbca89e87a15981953c1ad092ec148f2f04661b3c54d8b5e25',
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
                        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
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
                height: 782571,
                hash: '000000000000000003a43161c1d963b1df57f639a4621f56d3dbf69d5a8d0561',
                timestamp: 1678358652,
            },
        },
        {
            txid: '0167e881fcb359cdfc82af5fc6c0821daf55f40767694eea2f23c0d42a9b1c17',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '581464b01626d7ad867f93970338ec2840ce1c97aed658884474e6cb16a02807',
                        outIdx: 1,
                    },
                    inputScript:
                        '4153405b57f5a1969c45891448e99bb69376490bea5ce29240a1152168c72dee5adfb09b84c90b0d4f0e590ba1127b94e2f3ff36877224c1779e04743f2b64d308c121039764908e0122ca735c3470ff3c805b265e54589901fcee0d610f0d31b356f7f3',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '526349',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                },
                {
                    prevOut: {
                        txid: 'afd08abc17c78d3f0449f2393e0db9e5266099fca21c141b67879bd7c9330708',
                        outIdx: 1,
                    },
                    inputScript:
                        '41e3558233c98f31574ac950c322f43e45f3fd7c4e5462aeeaf034e7263115ddad77cd37e834a1c5c942e552028e17077ef9ea146fdc18986ccf8449efe8ac9d44c121039764908e0122ca735c3470ff3c805b265e54589901fcee0d610f0d31b356f7f3',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '420181',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                },
                {
                    prevOut: {
                        txid: 'f94fc719a8d037cf2df3d8aac753d9b606ca2a60c60dbb80c21a7ae7a6281508',
                        outIdx: 1,
                    },
                    inputScript:
                        '4102b9d0890ef77f2078e1b6899210039480d66bdef4fdc91c740ecaeec5583f55a731717a32e0dd9252d5bdef096b337ad3ecd57636f6bac8067fc3a78d3c0a94c121039764908e0122ca735c3470ff3c805b265e54589901fcee0d610f0d31b356f7f3',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '312605',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                },
                {
                    prevOut: {
                        txid: '8d2a0286607ee744c8890c161da4dd083049fff20e23d721702a47a5b139410e',
                        outIdx: 1,
                    },
                    inputScript:
                        '41a81656ffe952c34a011aa55653846abe1db05de068f2e6a6b91de7b5500d72762a8d37b041c2f9a451f58196e7045aaf0a4bb957768395b37b4f4759c823d1e1c121039764908e0122ca735c3470ff3c805b265e54589901fcee0d610f0d31b356f7f3',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '526877',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                },
                {
                    prevOut: {
                        txid: 'b4ba6aea60657f80fbf86c73389ea49c5c95817ac2468a2600635bdcb6143310',
                        outIdx: 1,
                    },
                    inputScript:
                        '4112461349af15cabe257ef0290f2a8e923e33cbfcd7f8d34923e95d5afacfff2407a2549f5819760e3c1ece84b20d3276893638ef8636f366338c8c4a0e2b0841c121039764908e0122ca735c3470ff3c805b265e54589901fcee0d610f0d31b356f7f3',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '1780906',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50800000000002737100800000000000f3636',
                },
                {
                    value: 546,
                    outputScript:
                        '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '2570000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'ea54f221be5c17dafc852f581f0e20dea0e72d7f0b3c691b4333fc1577bf0724',
                        outIdx: 0,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '996918',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'f490c4dd2b2a7cf14a04af6efaba9851cd233e753e239ff021296aae4b71ad88',
                        outIdx: 3,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 856,
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
                    actualBurnAmount: '0',
                    intentionalBurn: '0',
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 782571,
                hash: '000000000000000003a43161c1d963b1df57f639a4621f56d3dbf69d5a8d0561',
                timestamp: 1678358652,
            },
        },
        {
            txid: '6b139007a0649f99a1a099c7c924716ee1920f74ea83111f6426854d4c3c3c79',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'b8c9089f0991676d768920225c8614eabdb8c715e79b22411fe69d1916dcf3a7',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a7e929b6748902fe6896d21d6f542994f594c96b50f33963ee967011d6bcae9e02203e11d0cd2ac4c4f5efb56e1b2f86ed53d995164e08e3ca65a0b60118a7dd6b114121032f047c5282b9f24806f6bae65d1505ad60b555c2456004301f6253f14240b0ce',
                    value: 5000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144bb6f659b8dafd99527e0c0a3289f121b0a0209f88ac',
                },
                {
                    prevOut: {
                        txid: '794c366a60d864ffc5fddf1ffeedf11091b5845657d433a03f4fedd302bd2a3b',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100ae739cec070e17a943aea0b59b74aa2320e6223a90191e598a0695fde4300bab02207889e7530838df5fa792bcbe062cc3b3c6f5378dff4723bf0ee80755af6c82964121032f047c5282b9f24806f6bae65d1505ad60b555c2456004301f6253f14240b0ce',
                    value: 546,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '205000000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9144bb6f659b8dafd99527e0c0a3289f121b0a0209f88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04534c500001010453454e4420fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa08000000000c380cdc',
                },
                {
                    value: 546,
                    outputScript:
                        '76a9144bb6f659b8dafd99527e0c0a3289f121b0a0209f88ac',
                    token: {
                        tokenId:
                            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        amount: '204999900',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a9144bb6f659b8dafd99527e0c0a3289f121b0a0209f88ac',
                },
                {
                    value: 3317,
                    outputScript:
                        '76a9144bb6f659b8dafd99527e0c0a3289f121b0a0209f88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 472,
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
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: 'Unexpected burn: Burns 100 base tokens',
                    failedColorings: [],
                    actualBurnAmount: '100',
                    intentionalBurn: '0',
                    burnsMintBatons: false,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
            block: {
                height: 800162,
                hash: '0000000000000000135015e9513693999b669e5b024c83a4cc3b4db5dea7e414',
                timestamp: 1688933698,
            },
        },
        {
            txid: 'd5be7a4b483f9fdbbe3bf46cfafdd0100d5dbeee0b972f4dabc8ae9d9962fa55',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '025e232886adbd347cdbbfbe53ab8291aca66b3e0fec35e13367260572b1b14a',
                        outIdx: 9,
                    },
                    inputScript:
                        '41976761151559c9edf23b21b314d1003ee8562bce946f3cc56261245354f4536e93320d5f01c16f3efedfd71d8a32798f16ae4ef562ff173297b95ba863bd22df412103b28690ae5178fef9a75901f6c0974e5d5554dcd62ef1962ee26b55d613f0da6b',
                    value: 789283,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91412934a7a99b69a60c3b99f991cd79d257104f5a688ac',
                },
                {
                    prevOut: {
                        txid: '025e232886adbd347cdbbfbe53ab8291aca66b3e0fec35e13367260572b1b14a',
                        outIdx: 67,
                    },
                    inputScript:
                        '41343ae6b5573d542ce7fc5c1ad9d3b3982437f9d3d29fb359ff5c725fb379d73f1e09dc0fb01a9e87ebd21f1cc7c1bf5f9605bef90603489f03845b32b851b75f412102facaf89e3fb087741aea79247dcd947765c07cc7a3b61dd1e00a108e7f09c363',
                    value: 19661976,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91415c0b62c9f73847ca9a686561216c20b487a0aad88ac',
                },
                {
                    prevOut: {
                        txid: '282e423192b69ad2fd21b07f2bbc28bd0e48659e8b76c8a7cb494e9632d7bd58',
                        outIdx: 2,
                    },
                    inputScript:
                        '419560a571383df383cc335fe89791675f9e45e00c8fc452c85698d6654822a01dfea76cde4ea4411f9a7a5e3a150c7f0f3fde46d7b2bb1f9446d27d9b911dfe32412102b74d3a97c688764abe5e77aa21784881aa98724f10a323af9e7aff6f5dbf31ef',
                    value: 236812,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914a4e299724b8e81474df916c25c7a816a43c8748888ac',
                },
                {
                    prevOut: {
                        txid: '282e423192b69ad2fd21b07f2bbc28bd0e48659e8b76c8a7cb494e9632d7bd58',
                        outIdx: 9,
                    },
                    inputScript:
                        '41c7cf7bd61687724127d21a05ae950a88570475f1433fa3a2477407700624d4785b5cf530422de3f461a009b4ac1806cf8ae2e4938613fc412253b5d8f0137435412102f54d7c16ad99d58a1c2118d71584498055247735eddf494b84f5311d1575bced',
                    value: 1481924,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147afa62562b93fecaff30190ee3a2836dcb95d42f88ac',
                },
                {
                    prevOut: {
                        txid: '282e423192b69ad2fd21b07f2bbc28bd0e48659e8b76c8a7cb494e9632d7bd58',
                        outIdx: 12,
                    },
                    inputScript:
                        '41eeeff8f9f55d7a9106346ca430cb15ab38e3ae49518a9bb0377f614f64e1679c6218a4b60cb086ce406fd0eb298a3ccb7dd09fca20d96dcbbb489acb5ec82d37412102e1065480d2c5df584ee53b6a121103c4f084d37d8932dbf04d10fa674b4d258c',
                    value: 1923633,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91468e15e8bfe2d969b7963181b976e6833e294661288ac',
                },
                {
                    prevOut: {
                        txid: '282e423192b69ad2fd21b07f2bbc28bd0e48659e8b76c8a7cb494e9632d7bd58',
                        outIdx: 47,
                    },
                    inputScript:
                        '41670d46d9042b979fdbc2ccb50df231dc8f8dfc8c9ea66180a41ca60ad498a05936b8683daa93281bcf46a18ad838f80f284cccc1de04931381d3279c93e109cb4121020be1664f1cc506d056017b7072633452b3571724560bb73dce68a160cd9182e6',
                    value: 12566124,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f941b2e03f973ce5b13766159eef190963e2393488ac',
                },
                {
                    prevOut: {
                        txid: '282e423192b69ad2fd21b07f2bbc28bd0e48659e8b76c8a7cb494e9632d7bd58',
                        outIdx: 63,
                    },
                    inputScript:
                        '412b5195fe17713edc3b58102ef3e60ef06fe50229e65dd143f23a9a6edcd7956a7148c9d038891a866b0e98627bb1f66f1c9f43ab7716bc5455ed1cf599b553f6412103da9dc1e5ff5116e6d8b4535b9e565e0c5323316b240043ede4f9bf8ae6927bf4',
                    value: 20033202,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9146e3430f87a128ac4509fb0547f07ba0e3e8cea7688ac',
                },
                {
                    prevOut: {
                        txid: '282e423192b69ad2fd21b07f2bbc28bd0e48659e8b76c8a7cb494e9632d7bd58',
                        outIdx: 69,
                    },
                    inputScript:
                        '41c07981287684a57d6dff05fe35bb9cf49682be07b51fc9bd1aecdb50dfeaf5646d6bcbf04e45d711ef229fa2564197bc7c21994180491218c063cde76f733de64121020c2f45d704ca5ef65d16520512184601411e4704da88ccaa21ae5d116dd62e27',
                    value: 30370886,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914c72166790bc8c779163e17b11939a6bd6022a7e188ac',
                },
                {
                    prevOut: {
                        txid: '282e423192b69ad2fd21b07f2bbc28bd0e48659e8b76c8a7cb494e9632d7bd58',
                        outIdx: 72,
                    },
                    inputScript:
                        '41628d99c6f5ffefb2e8b33874caa20b26a9b2b26a3a353738cbe4f82babb6800f13aa0eef1575cbda249a5488407d6f34614c610613e3e27fcb20b93316e0be2c4121021e0eda5f4d41e5388cae8ed899fcde2571a155b23e8d25199eae7b674f8a3335',
                    value: 37898355,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91483c54d6ec805f4db16c935f5bb89da791f971ac888ac',
                },
                {
                    prevOut: {
                        txid: '33160635670dab2a6e89425f2be9a1b1fb742c75ff2684a1e62a44f82c1dae6d',
                        outIdx: 10,
                    },
                    inputScript:
                        '412c5a59a5176563765df132213db2d7767112dfc45df859091d8336dc472df44809449bc9bfcdd29dca69d5784976f04401d4910483f6150b955adc08faa7adeb412102d8ba67b96c5a0371d96d5270f85ddb02b6e9fc4801bd1e85b1877edb52ffbda6',
                    value: 2489718,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914336fb64b7e98221f82aced275440c29e7e1d11b388ac',
                },
                {
                    prevOut: {
                        txid: '33160635670dab2a6e89425f2be9a1b1fb742c75ff2684a1e62a44f82c1dae6d',
                        outIdx: 18,
                    },
                    inputScript:
                        '41581270a283d4512a3ffc4179ba1c6650534740b2f8c115c6348d029850d00a5cf3acb70cdb059acf3d6dff94753f8f574acc1e3019df797275be79d912709a294121023353579f3a7d6b492db0132190e675f92564aa23d2b9c3d79654bfab0bba4830',
                    value: 5710023,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b114a9d636ac7558c04e902c3a1f7c1fd9008bcd88ac',
                },
                {
                    prevOut: {
                        txid: '33160635670dab2a6e89425f2be9a1b1fb742c75ff2684a1e62a44f82c1dae6d',
                        outIdx: 25,
                    },
                    inputScript:
                        '4181ae55a349cc2864b2839d67764c8a88d9f5f8e322d16465df763529cc56238b4ad990c617431d17607c43421030c3bb83758da3023846ff5f1a425179311d6b412102c69259026f5ad94372a1d98de97374adda25aebc6858dca8511a9ac1cb95287f',
                    value: 8237826,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91411667c453097adf3e71d08986df7766c26f3399088ac',
                },
                {
                    prevOut: {
                        txid: '33160635670dab2a6e89425f2be9a1b1fb742c75ff2684a1e62a44f82c1dae6d',
                        outIdx: 26,
                    },
                    inputScript:
                        '41d7f92d59288eff61e959f9c59cda2b33ca15dbececb2d632f08026aae5608167b401f5e39f3e35a812eca83310ec06c89606eb053eabef78b6838f3306584963412102916d2b0bedeef5c35659f8ea8e54871cf3a2241b85e696dfaea797fb3ac19d93',
                    value: 8485409,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914a125966da9024acea37f867323778641ff0e891888ac',
                },
                {
                    prevOut: {
                        txid: '33160635670dab2a6e89425f2be9a1b1fb742c75ff2684a1e62a44f82c1dae6d',
                        outIdx: 44,
                    },
                    inputScript:
                        '41b2f767347acd9142d5f0f9754a2dbf79575eaf9f29e124b15b3536d0ceade8bcdd31d04656ba63f44cd144d66ff724e602c3080b66329b29536e4f9c1fae922941210278ea288a9f62d52ac4d9301779ce177a9d8efa2c650205dd80e895c8f10bec4d',
                    value: 24067273,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914e03ba5757763a00aaa8aa9eda71da51610d5ef2788ac',
                },
                {
                    prevOut: {
                        txid: '33160635670dab2a6e89425f2be9a1b1fb742c75ff2684a1e62a44f82c1dae6d',
                        outIdx: 46,
                    },
                    inputScript:
                        '41b2c968dfd3653975ede62f15eb0925cad47d06ec2e01a597efe8aa0db73f9af79090dbc3adad9bcc11a9bdb323240ea178cbe8641907a3c9dfa5e01652bceaee412103d0d7f54b4cf2be2f19d4eceac703f445e1223a134fed95fee7d7d6fedaf7f1fe',
                    value: 25912582,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914b13b05d51174d91381b0ea6fb07a6345eea1abf788ac',
                },
                {
                    prevOut: {
                        txid: '33160635670dab2a6e89425f2be9a1b1fb742c75ff2684a1e62a44f82c1dae6d',
                        outIdx: 51,
                    },
                    inputScript:
                        '4195760d04133191dce89bf872b61ad771f9b33db8f36c249418d0cea3e1c7f73e4bcaf151103effd88f82911a831f2e552961df731f7cb4d87db42f97f9ef4d11412103dbd5c06a2afaeef2240ba22bb6c7650d51d18ec16e4ea3edf4ebd795760f96d8',
                    value: 32513005,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914349c3f91c2782b235ae0d1a2c3acf053d554170788ac',
                },
                {
                    prevOut: {
                        txid: '33160635670dab2a6e89425f2be9a1b1fb742c75ff2684a1e62a44f82c1dae6d',
                        outIdx: 56,
                    },
                    inputScript:
                        '416e3713337d09659305d797115c9281dc060d65f45a491828ae6e6676db691d4f9d0c473000806d2254303b99effab78ace1f85da921bf22c8a47fe89c465a7dd412102258cedf84db0614de15c53a92010e0bf2371c386403457385ed0c1ab8ba38e29',
                    value: 70247919,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9143afafec322ef1a4f70a6ca68dd9090182716181888ac',
                },
                {
                    prevOut: {
                        txid: '36fe871b850030281c9325d67ddc3aad32f179f2cfddbfc6f92e1923a4027587',
                        outIdx: 4,
                    },
                    inputScript:
                        '4198de475fa1ce6eaf983ea0a021ed49ef35c3a96cbd4ba88769b1db92c0455b40e50261eca6c7d7a0edf8a8f5fec1fcd405c5cc9c19c2db691ee7652866ec704541210268a9995c00a0588bada4e48264f7cd0fc1c139bc8ee1b009d1672a5700689c14',
                    value: 1199454,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914cb74cf87cd355cd01505645eaf165646a4eb1ce988ac',
                },
                {
                    prevOut: {
                        txid: '36fe871b850030281c9325d67ddc3aad32f179f2cfddbfc6f92e1923a4027587',
                        outIdx: 8,
                    },
                    inputScript:
                        '41d735894ba83cdf74b971b1ae8903ac72215378941798b3f98389c845f1092edd186648e1108632bb98ad4b85a5f3aeaaf1468498e8a61c29043f978acba2713e412102c6a66170358d332c880609845feba09445468dbca3977f8243b71f7708a38931',
                    value: 3496387,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914c42245ebeb7fea2996e5e0f65537b56fb58ea97d88ac',
                },
                {
                    prevOut: {
                        txid: '36fe871b850030281c9325d67ddc3aad32f179f2cfddbfc6f92e1923a4027587',
                        outIdx: 48,
                    },
                    inputScript:
                        '4127e265aaa3ffb1188d61c01f48597045e0b20cf03d6c0a6d261b825759c1402e8a81ed03d6b7f02dd9d433931d8d56e8c4c3c929bdfe6166864ed13fa6a14c2041210247e436fe91fd245894bdc61f01fac054f2c2a9e14e3b16584d28d0396546b208',
                    value: 30653501,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91447d7bc2240955fd18d53c67c4b814e166b152ec388ac',
                },
                {
                    prevOut: {
                        txid: '36fe871b850030281c9325d67ddc3aad32f179f2cfddbfc6f92e1923a4027587',
                        outIdx: 61,
                    },
                    inputScript:
                        '4132fab3b2ee76ff4f2a9608029ff01a499f04b048a53238d09f2ee5545667e5d76053ac9a018530aded8f06e07b096caed77d6d8b436e9325deca58ec33381f1b412102677e892b57954785abea57b508662752d134e1b85b0cf8c924c382e957b424f5',
                    value: 54383530,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91410b45d95195a71957b43bb82762e6cb48e67888f88ac',
                },
                {
                    prevOut: {
                        txid: '38aea1067bc178c13d2498b573dd13136d0bbbd59bdd4174d8323efa7925d709',
                        outIdx: 44,
                    },
                    inputScript:
                        '418c33f23f296bd45cc26514ca2acb394e76e0c0085af0f5bb72fe94192f9f81d3cb3eca750aa64d8b73c0ff11d3788b46a08b308de793789a0db203fcaae7f4334121025754d300a9c992376c28aeb2f711579e072ced8a6a9f8f6f5046e2dfb34773ef',
                    value: 48782413,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914894e84afe4b07413c99087067292aca67d286fbf88ac',
                },
                {
                    prevOut: {
                        txid: '3e6a7a945ee1141be605f62cd7a36d94532340c736a5db4e822ebca4b0548b57',
                        outIdx: 9,
                    },
                    inputScript:
                        '419585e642c12308cb16dc820f8432ca140ce85050711a2d0ddab19836248a6e8c7327c8256af217010b812593753105959f3b9d957c77f7ae81b1798cbe1322b1412103a3325e9436167659795eb6984a33b890c7e31a2d2b860300a892bd1f6d186220',
                    value: 25031767,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91473b804181c01f16cbf63fe262e9a0c8de929af1e88ac',
                },
                {
                    prevOut: {
                        txid: '47162a965a1b9baa086b90427a4dc73ed100e88aa3419fd675cc9c15d7a2264d',
                        outIdx: 50,
                    },
                    inputScript:
                        '4167257a33b15c13d334a2d69bb9b466c3dbac7a9017b1bcf461eb07a3443a6adba372908235a3262685d9d634dd2341547bc086c617ea3df0412452a67b0b291c41210248db002b83e2c614ae5b956b686961823edf5bb0db2bfa4964a24bfbcfea2c7b',
                    value: 29615068,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147b1a9441467759f8693bdac3e356ab6110bebe1c88ac',
                },
                {
                    prevOut: {
                        txid: '5646ba9af331a3d4e66ef46ae34a09be90a101fe6f94efba2a612122f3dbe057',
                        outIdx: 9,
                    },
                    inputScript:
                        '41de35e2cdc2e176b24d8f519d84a27c9b13ac3f01ecfb850c92e9a7c2969f2bb1d86d8e00572785bde21d6da669fa131c20e368ffeb0157349cd609bcde748b6e412103a302b269baec427ad945dcef291a2b9bb5f91ae1d287899a66bb34b3d4d19f95',
                    value: 3563255,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914443f7cf9987b921c10d888c3d617c54aba5e8fb088ac',
                },
                {
                    prevOut: {
                        txid: '5646ba9af331a3d4e66ef46ae34a09be90a101fe6f94efba2a612122f3dbe057',
                        outIdx: 21,
                    },
                    inputScript:
                        '41dcb57eb57157c7ae624a100e5f4c71fc2173eb81befff2f15b521105ee553f31118d2eeec770c8e43a6a2ff15e689d81128239184ae7d844a9b382a84906e446412102321799e9dc1c2dc6c9ddfae967c7bb81bb2e64d2c59d57d35c3ca8292de56291',
                    value: 11787007,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91490de1562e4aadc991dc13d28a9d112461fea9cb888ac',
                },
                {
                    prevOut: {
                        txid: '5646ba9af331a3d4e66ef46ae34a09be90a101fe6f94efba2a612122f3dbe057',
                        outIdx: 40,
                    },
                    inputScript:
                        '4157367017cd6dc848750f538e5fd32b0d7b1f69bd7b2bca0e43f772374d65b8e1558acf8544c577e2ebc4368b320f07c25f146fa004fb30e45fb8c9ae608b8afd41210360955914b784f0100bce4935f6f17c1417387598b0bebd1d7c15fc2ebb27403f',
                    value: 23443485,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914273808f74a845b9b77345d43cb679ca793c5e9e688ac',
                },
                {
                    prevOut: {
                        txid: '5646ba9af331a3d4e66ef46ae34a09be90a101fe6f94efba2a612122f3dbe057',
                        outIdx: 44,
                    },
                    inputScript:
                        '414d146e2e20940c99323f0502114c2afbad68e1d772cd20bdf8a7d7894c5775952af95dcea59dc8e91ac4cde30af03cd308e4092c5d6a0a7ccd7a131599448856412102b7f55d64e8ba20077f2c9e629c312e2da2667689cc7835d6b5f9fde0245d1cbc',
                    value: 26370841,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91402a6a02a8bbdc6a9ebeb74bf5d8b9f7d20ad386688ac',
                },
                {
                    prevOut: {
                        txid: '5932b2af9cb1226b9bc59233427afe37c9c7f88f650c5a834e343022bc40bc5b',
                        outIdx: 18,
                    },
                    inputScript:
                        '41ea0603fcf7d14ccdc4efffc0f3c651c4e3ce57c404b2bc9fc5f71fd652a7ce2ba3cb1895206ed3b59ae0d58071912b3ab3f46a1f0dd5539b254ae8b0740a0065412102b7fc7453a54a1ba3f31046d9ec78e102f640cade834efe5edd3a0d0a947844e4',
                    value: 3053762,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914fcc200903ed9167def3df599c599d0c98b2cea0588ac',
                },
                {
                    prevOut: {
                        txid: '5932b2af9cb1226b9bc59233427afe37c9c7f88f650c5a834e343022bc40bc5b',
                        outIdx: 22,
                    },
                    inputScript:
                        '41e80a5eba60db24a51c0599b6b2e721cf9a46bf818fe0e9cec40b855ea5a928e24ff25767d3bd34d6d6c184d50590f20dcf73a73f9ee56ecc7a5cdfed65e5f710412102f6553541f1d9cd9faaeaf53342ac09a2c7c6b5a598c112060a6f3f894ca50851',
                    value: 3278623,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914692a38590fe1786dca47d2cbcc0ee30d969ca0c788ac',
                },
                {
                    prevOut: {
                        txid: '5932b2af9cb1226b9bc59233427afe37c9c7f88f650c5a834e343022bc40bc5b',
                        outIdx: 26,
                    },
                    inputScript:
                        '415bea41b13af76e10f4807c43fb577363399b369b1d83bf2382fdef48235a7c32a2ef9d3a98156458ce3e85df259b5351d37bf9a144f2eb736fe562542bd0479c41210285cdb2a7fb877c0dde24ab437ae152ee7e8e32e9c850f16fc5f9ed23a95bb53c',
                    value: 3534883,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91486b2a4458787245715865c9ea5e42f8d68e8828988ac',
                },
                {
                    prevOut: {
                        txid: '5932b2af9cb1226b9bc59233427afe37c9c7f88f650c5a834e343022bc40bc5b',
                        outIdx: 48,
                    },
                    inputScript:
                        '41751e7046792b1f4961d3c6369d24fad477f0be0120a3b89afe6768d6e4dfed8b24634f020178308fc07065f1c75552277611241313aea2174e355a3a395aecbf412102051de8523c2910874441e60fb9216be126effc875a7fe94bb427fb5c6fa353d6',
                    value: 7546746,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914c472cd5ea7282180aa6a663498e98c2b781afa0488ac',
                },
                {
                    prevOut: {
                        txid: '5932b2af9cb1226b9bc59233427afe37c9c7f88f650c5a834e343022bc40bc5b',
                        outIdx: 58,
                    },
                    inputScript:
                        '415750a10a4d6d697b0e7a69c69b5ea5ebc2c382153dafed928cbe1427a9c50bee62dcb3623317b4eec2d1563eab85f8bf7b9c1bc72e981dd4e546e6588ab864b9412102d9e8928fa33d190ff0dad48989804494016914fa7ace7461793a95b4ea4b7928',
                    value: 11875440,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914457a8a10ca1b8ab373c7e5e9ea7d784e8ce2efd188ac',
                },
                {
                    prevOut: {
                        txid: '5932b2af9cb1226b9bc59233427afe37c9c7f88f650c5a834e343022bc40bc5b',
                        outIdx: 60,
                    },
                    inputScript:
                        '412dbd961304300e86d8589586f5553757ff2ad49ad7f5f044c4f4b73a95a81d6b853d35f21de4b058743be38b0d3f239690088897006658591294a875f5400f2841210203553bdf5e4c0406661b10b9bba39ae1920144eec88414acd18bd5ec838f31ec',
                    value: 12066672,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406cbe837f5a8b81ec8fddcf6e46c15b84b43965788ac',
                },
                {
                    prevOut: {
                        txid: '5932b2af9cb1226b9bc59233427afe37c9c7f88f650c5a834e343022bc40bc5b',
                        outIdx: 70,
                    },
                    inputScript:
                        '41d6eb014368a0f5afc239a5524ba482f04fbf9f93e5604a60fbf8de342f02f6af70433dd065b9d6c879442d32a1370de5c623796f492f62f703a502f0723bf36f4121029007d7023dd0a6b7bcd1c9ca995d0b707ee727ddf4fa035e93d245554f9dea34',
                    value: 31042739,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9145ab8a85ea3f6bf3a69b15b9f7570aeb021df77b488ac',
                },
                {
                    prevOut: {
                        txid: '5932b2af9cb1226b9bc59233427afe37c9c7f88f650c5a834e343022bc40bc5b',
                        outIdx: 71,
                    },
                    inputScript:
                        '41bb8e694016dfb2b475a93fd6478ba4d97ce55b4753b4552e0ce46bf477a66d28f7f8bf63ef1fe770acc281c8305b7579648c60de4b1f4cf7d2ac783f09af5e1341210217c675b14a2e262379af4407533eb2ffb11df17394feb380be4f272b2c3c9b63',
                    value: 34725141,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9149704c9d13afb31a9b84ea5cb56140499e54743bd88ac',
                },
                {
                    prevOut: {
                        txid: '5ba0d328f4e845887fab783234db98aa1c4a73cb5cdd14a2503af78f520cba8b',
                        outIdx: 21,
                    },
                    inputScript:
                        '4157fa15e1e46502edabc7a33472cfafd75fd88ff75331cdd6e1cdb28384e69cac7b4529ae34cf37f3e68699d7921da7354bbd9ade45c2487a81b7935d9a46817c4121036e3cf1f1fe4d0be25ab9cfd2acaa0617ad06a6ab6cbffd2ee01380fed51db99f',
                    value: 4898437,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91423dab92affaa336ae18cab2669d116fbfa55b0bf88ac',
                },
                {
                    prevOut: {
                        txid: '5ba0d328f4e845887fab783234db98aa1c4a73cb5cdd14a2503af78f520cba8b',
                        outIdx: 24,
                    },
                    inputScript:
                        '4160979fb8cb7cdb2ebf7e3fe9f8d9cd0d287cd574c0192b10d795c9e57f69135250e8bca7cc024c6d3392e6f6e5445d78bfbade6d84633fa88e3bb404a3ec3767412103bf8958e3824e6ef7710b8a212ccf1ad13488ec8951d4efba45e836e921b15da2',
                    value: 5379161,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914c6a520edfedb88ae478c1fdb309739d62d47dbd088ac',
                },
                {
                    prevOut: {
                        txid: '5ba0d328f4e845887fab783234db98aa1c4a73cb5cdd14a2503af78f520cba8b',
                        outIdx: 32,
                    },
                    inputScript:
                        '41b79dfb5bf4c291742010c1e0b8972665c1a8e583bff07c26bb2f35125a43f9362fc88f7713547c3b19085eeb3b9933aaeb1820168fb7fb9a1173dd6d9ca011cb4121039060518676dea799bc646eaf5a86e2c6e38e6a48d8c809e125e6ddb29ed63941',
                    value: 8316321,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914388d048805daa142def4833f5cb1e02db7013a6f88ac',
                },
                {
                    prevOut: {
                        txid: '5ba0d328f4e845887fab783234db98aa1c4a73cb5cdd14a2503af78f520cba8b',
                        outIdx: 60,
                    },
                    inputScript:
                        '41c2793e60ee18ac376d860fe3a6abbe5e1c8b562c661a5888c24ccb5def8f9fd56b1db4cd28ffd2becba4acce97061cd85432ee7482ba239200a929ada7acf960412103f2e23426245b7e8a64af3b3dfceb9dd6459467b72a58ff7f2fa7f3d885b3861e',
                    value: 35352936,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914cf55018839d8ab8b93de655551357d081f8120c788ac',
                },
                {
                    prevOut: {
                        txid: '5ba0d328f4e845887fab783234db98aa1c4a73cb5cdd14a2503af78f520cba8b',
                        outIdx: 62,
                    },
                    inputScript:
                        '414b06e85ca333742e179aa5f2088b44bd40cd403625e6cb5cf8f0e80afe13fa058890656c653a6d6f2a9aa1b22af346928424330e9f701f8214c4409bc2e25495412103efddc9a5ddb955265e7006ddac64c2eb46bafdd882dc65dcaf276c1d0def176a',
                    value: 40175305,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147eb48844af0ceae69879fd66456a5afffed24cb788ac',
                },
                {
                    prevOut: {
                        txid: '5ba0d328f4e845887fab783234db98aa1c4a73cb5cdd14a2503af78f520cba8b',
                        outIdx: 64,
                    },
                    inputScript:
                        '41b0949073aa877f7fa76933c4fd68f9c8b482a844cd6362cfa10fefd782ec74a00a9cb268faa693aeb6861ca8a74a842f1b5b58279314421fa4714688883e94f8412103f0ba973ac5827cfb13ff7015ad2bdc5fbf322e369c71fd1798a9ee3c1faea606',
                    value: 40956943,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914e94c40d02b7860a76057a48b826ef847372eb74388ac',
                },
                {
                    prevOut: {
                        txid: '62234103fb01e526293bb3b88696a62dedcc830eac4118265980937471197b11',
                        outIdx: 11,
                    },
                    inputScript:
                        '410e57d52ac09032c8d9b78973af542c65301d16c7c9af11d7e8c5a5ef600bbde36dfa545c88490ce88ddc300658263541132a765895d51deab392f31c95fc2d21412103ec54521d0f77db84614164b9f294e8db801fcbf5c5681192d9b1479cf88287c2',
                    value: 4594328,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148fddf18aecb230772dec7d9fa6ec5c2eae1303bf88ac',
                },
                {
                    prevOut: {
                        txid: '62234103fb01e526293bb3b88696a62dedcc830eac4118265980937471197b11',
                        outIdx: 22,
                    },
                    inputScript:
                        '415a307caf8836205fb11e2464b77ae02919ac3a9dcfcfdc18d9d79860a4c495301389fecf65ea97723717b38d489d71e4db3e53bca9f1c6bd5fdba3204e5421d54121025b736a838ac5bceb5b40988e49c32902d5989f3fbc9051ec98ba0b6808ef073c',
                    value: 7254551,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914687b26740360cae141c61c9e5dcb03b6100dc42b88ac',
                },
                {
                    prevOut: {
                        txid: '62234103fb01e526293bb3b88696a62dedcc830eac4118265980937471197b11',
                        outIdx: 30,
                    },
                    inputScript:
                        '415088aa133d722e072f1a090eb676c025de7154a2d2e2bdd6812b58b1101ceb53e6c0b27e24412045044dcdb06e88276f4f4a63e28f98c39b3d67453e5dde9d5741210271ba59b7662f1f7a346065cfa4738cf05521933841761b9cfa31f5e72349f494',
                    value: 9563229,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914c9fd6f67f21b1970264ba239e82d4a3c40e2063188ac',
                },
                {
                    prevOut: {
                        txid: '62234103fb01e526293bb3b88696a62dedcc830eac4118265980937471197b11',
                        outIdx: 31,
                    },
                    inputScript:
                        '415a220e9c760930cfceec2c3d60958e313cb5cecf99ef7fb70c6e26dca5c5b13fe4a64db7fbc2cb26b9b619964fd76f35a2f35f0c4c78c68d8b1705737141e26c412102d190001af9db94b3de57d023ac2d17d0d62d7b5b6c351fd25b77ba2be0223539',
                    value: 9731469,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914cfbdaf0aaed19c7fc5e2a39e77cc780db5e333b588ac',
                },
                {
                    prevOut: {
                        txid: '62234103fb01e526293bb3b88696a62dedcc830eac4118265980937471197b11',
                        outIdx: 40,
                    },
                    inputScript:
                        '415bd5dd0c5198a32c904eeaf61bcc02e473895b5e7e2f5f8e86486eb9a53f7608981be475a2dd42964d4fca04bca1e29d5b18fe6ebf0d4ebaebd7687b8327e8a4412102822ab05d098e4f0f455263f970104eeb0942ccd5f3e36415af2b202b5ace86f9',
                    value: 15786585,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914a17017d5f758fcc1372746bce8509c3d23f218a788ac',
                },
                {
                    prevOut: {
                        txid: '62234103fb01e526293bb3b88696a62dedcc830eac4118265980937471197b11',
                        outIdx: 49,
                    },
                    inputScript:
                        '415f3acedc835b8fceec445222063ca869d4260d89746c16746f237ea244c4412011ede5b644040ecd62e0761216924226b985217ce56cec35054fdf20ab288b6d412103d6fdcf7626fe46d001e5bb777d92423a056054084d61a2c0ffc91a0c0cef8df1',
                    value: 21867579,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914d179b30a22db1d4aa04c163f7c1474fc1fbb5c5588ac',
                },
                {
                    prevOut: {
                        txid: '62234103fb01e526293bb3b88696a62dedcc830eac4118265980937471197b11',
                        outIdx: 58,
                    },
                    inputScript:
                        '41fed29d22902a017b75ec8e04c708f964145e791f5c368c318951f9f23b063c4c4777fbfc07c0107fef490fc4d6495a64de759a384f478bf1c12b84d26d21986c41210351b5cbd17fddc51a2add3d88a1d9fabc29c56ca6d3e912bccc71e69a6342728b',
                    value: 71746009,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f3f590529240d25b82fe10c18efbb64a64f9625988ac',
                },
                {
                    prevOut: {
                        txid: '65dbfe80fdf94e042b0e775a66baf02d0ee4e2148fea4b8388500847bb5c982f',
                        outIdx: 0,
                    },
                    inputScript:
                        '41dd8c68989718bf445ab5d7809b6516cdec095eab8acfc2e34d8ca9670c1502b8d1a677ede2d4000f4588a82b78282912aa27f83338f69cbf3fad727e81b80da141210300570f3c1121d37167795f36dbe7bf4bfbfbea4b04507f5ca42d2dfdaa85983b',
                    value: 1688043,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9143856ed1d33df771934e14e0446518fa21c8ef6f188ac',
                },
                {
                    prevOut: {
                        txid: '754f2405fe479549e4c51ab41811f5a864fa39e5a9f877265dd0e74d6dad47ec',
                        outIdx: 2,
                    },
                    inputScript:
                        '41319c8dff13ebeec17d74d83a8c728c8ce913e10f4b2291d2a99457b404833558f591d3c174aef7e5c637e0aaf6d2ab3a250af3549ddd6b52d4232ade8aed48b4412103387c765fda65b283de425b4fa1388727056c325bd22fa698a4ace6df5ba6fe91',
                    value: 8049989,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914d26a1fac6b5c02e98e839956f3a7547d0c1b5c0088ac',
                },
                {
                    prevOut: {
                        txid: '7fe346109f69368dea5581448d6bd0046bfcb57892ce8757534c05113c7cab3f',
                        outIdx: 45,
                    },
                    inputScript:
                        '41260777d685ff3b0552995d998880509ef6af55383d352cedc88854c40e243832a2dbdd86b1503b93ebb5e2e3f1f6da1dae27a0cefca73d40a8995ad69ee5d033412103ca8f1e6ef5fa63f97fd1b05a6421c1d768df37c2b6b28764c1ecd73bab20a13a',
                    value: 15469696,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147cf1203b978724009018c3a5e6a605590f6e9fed88ac',
                },
                {
                    prevOut: {
                        txid: '961956635297554fd150048a6e2adaf1441caeb8a8f7cb824fdb79329e7915ce',
                        outIdx: 8,
                    },
                    inputScript:
                        '41d50570bf2a07db56c2e28faaa9299ea251b66a0388d0c816c7591c7c8c3b90e013560d12266b45c589e2badcd1753e35bc7caf88db1e80d119c9ad77c73044184121036abcc7db8ffa1dc62c2c0ee5f87011e819e4f15f40d70186cd7acc9e2b705f2f',
                    value: 3192502,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9146e56ad4a85fa5e2d03f3bc16b52cfcab65c5e74188ac',
                },
                {
                    prevOut: {
                        txid: '961956635297554fd150048a6e2adaf1441caeb8a8f7cb824fdb79329e7915ce',
                        outIdx: 48,
                    },
                    inputScript:
                        '4149623ef1ee7ace2c8f33db67c9b2ba5d720e47b95242afb1aef62c9d7e4bf7de91cb4236daaced175a55f2946e13b76b7a403c90f77082ed74c922058c2826494121026292302c75da128dfdf92827bad355bb00f677176e630c2fc7f4b8e8e4144177',
                    value: 93002901,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914d17e89b26be59dfdbbd2582afdbf785cc11ad56388ac',
                },
                {
                    prevOut: {
                        txid: '9da7a74dd4066e8444630cb3d4557ca8a7f786098733b4ec6d39ade509c6a947',
                        outIdx: 23,
                    },
                    inputScript:
                        '4136f2d23997838269068038af56408bea30e58d2aaa24eac9798cd7fbd544fd2afbb021178360ec86383f54ea6de1c6e32ea83e96acbbbbb87319614e4aed04ce412102d1dad4b5d20dca9c748452c3a3d64e8d589fe31edc8cdef66c6b083a34733af3',
                    value: 2523800,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914888bdff661832d406351713b49c683776b90e7b088ac',
                },
                {
                    prevOut: {
                        txid: '9da7a74dd4066e8444630cb3d4557ca8a7f786098733b4ec6d39ade509c6a947',
                        outIdx: 31,
                    },
                    inputScript:
                        '41dce1809ca31e4db35d4406f14d1f7da2810a2c662e281342f64e68315f400428c9d7d574faca017044f616b82c63a5c00016212e85cdf1ed4298a2c8db3d8eea41210279aca93bb100bdc842f277f032c8854d089381350609cf5980f904e994201c52',
                    value: 4330481,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914e58661c82c66669cbaa2d1e813009d0b5d2fafb888ac',
                },
                {
                    prevOut: {
                        txid: '9da7a74dd4066e8444630cb3d4557ca8a7f786098733b4ec6d39ade509c6a947',
                        outIdx: 46,
                    },
                    inputScript:
                        '4178d0f9b72584bf409e1c72aa30ef0cbf4449e5d8ecb74d730045bc8397cc870c64af6918f62ce39b4b51f01b56c24c9bbaed750649625ec3eb5383738fb0b5ca4121027ed4bb82bd6ac94dc17035738a21565115f92b842682c9c7fcd6108b767ead7c',
                    value: 7600077,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463b5940d2fd7d998b343a54986ca375ff8cd2bbd88ac',
                },
                {
                    prevOut: {
                        txid: 'b41a4d09e492f66f611bba3ca2cf2c3eaedce811e9cca9a1706ede3b4ae594f1',
                        outIdx: 0,
                    },
                    inputScript:
                        '41569f9dbdf60f88d56bebbc24ebc8a48ffc3e504af9a4fc8d027d2aa30da0113f30a042028a631ed87333b10f988c49af8db233812019e63f0d4892674de2c3d8412102128780d9d337449c3b2b9cd1008a25acf895fedb6f2706e74916943e3c2d33c2',
                    value: 66688896,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91490b66329b172fd43feacbbb461c54183eed1bd5d88ac',
                },
                {
                    prevOut: {
                        txid: 'b9a5cb585cba98a1b13d698e0c19d332e8532119de7e1410e9ff1dfd26ac0516',
                        outIdx: 0,
                    },
                    inputScript:
                        '417c5e22211868b30521f5421a1ccaf00e0ae2bbf393f9b33de9e126b4481575eb2baaa6f47bd74c204bdebf8a0c0a522c3f500c92f3df2fcc539dfa2fde91a605412102128780d9d337449c3b2b9cd1008a25acf895fedb6f2706e74916943e3c2d33c2',
                    value: 5668556,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91490b66329b172fd43feacbbb461c54183eed1bd5d88ac',
                },
                {
                    prevOut: {
                        txid: 'c76711c1bdeae356b492ed630b0e8044d28458581171e1bccbfb92f2960974c8',
                        outIdx: 33,
                    },
                    inputScript:
                        '413803bd25ba0ff5cd0414441dfc96cf7efaa7b6b944b4611845c4c60e075cf212c57706830e19b4007c7f7ae17c4be3ab20210662bfeb3102ba844ff22f1259c04121020f29f7a7d46ee6c29de9dec33226b4600a83a00a44ac085278c9b7ff3c8fb3b5',
                    value: 9521209,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142fd4bdafad85abcb999c4bab8a2901f92caf487988ac',
                },
                {
                    prevOut: {
                        txid: 'c76711c1bdeae356b492ed630b0e8044d28458581171e1bccbfb92f2960974c8',
                        outIdx: 39,
                    },
                    inputScript:
                        '41f9f621a78ec30bdd9ef8502039d4a6f97732b31f39b591d96b1c2562f951e41cc89f0aebddc39b532a1255951556fbf5bf28544a7f9c85620303bc620dfa99d1412103d3c212b78eeaa67599c99479c11259100f8d44f5e93a2620b1e7264ab4cd222f',
                    value: 13527166,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914979d66b56061bc4b7ac2118f54aecbf86ae5773888ac',
                },
                {
                    prevOut: {
                        txid: 'cb3d57f259b0cab6c9a40a8f19b659a96809bafb7fbbf87bea6e9fc10e2c12e9',
                        outIdx: 16,
                    },
                    inputScript:
                        '4154b81b0cad31762ded80ab3f5e159fe0245553e1b6e69d153b8c3cb1d4f9064b89d9d8f29b09be3c8191e93ddc7f45c42c016d9b41859a8da851087e1a73a0be4121032870664b4cf912df5171a4a76b0c7c89bc3f9422070e380bc6ce93e02018d886',
                    value: 76789054,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144724b6e46690d083ece0390ced609aeb0488486988ac',
                },
                {
                    prevOut: {
                        txid: 'cfe05ee47ffbb2a60d93c94d1b2f1cb055e3503f43838d6cbc5565dccb5f1a19',
                        outIdx: 15,
                    },
                    inputScript:
                        '413f34f797ec73f8fc8579008566f790a95da2c02311f1da1f6bfc4a21c72e8bd56bf8b134d2d1e409a53e372825b9c5267d23a87a8599b56129694f25c24a1cf44121030d1c53703449c09a10a12ad03997d2874052f53746f4436d1a108cc20f528407',
                    value: 35013098,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142342542a4947b9bfcedffa803b369ec8c108b0b488ac',
                },
                {
                    prevOut: {
                        txid: 'dbc28e87b613c97c6cdb9c646a257a27a7a5c9ac663d4a049ddfc34163cccbbe',
                        outIdx: 10,
                    },
                    inputScript:
                        '41f6107a78455d9b3db251d5c3e2478ab346c0876c66c96378a05c38eceec88263098b0f704881d6cf3456aa7be47a6894bfcd121c26742e765cc037f37744b2664121036033a99e5fd9bfe41940c466ab043eb27ce45d2f28753559894f84114c34c51d',
                    value: 4158314,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140f18bea6bafd89a55997c72703006ec7a83d6e6988ac',
                },
                {
                    prevOut: {
                        txid: 'dbc28e87b613c97c6cdb9c646a257a27a7a5c9ac663d4a049ddfc34163cccbbe',
                        outIdx: 42,
                    },
                    inputScript:
                        '418b6fcd73acbaaef9a063d64fcd86597e490315edfe709aa302d429c6438b52dcc6e7d324b59612b202d4239bef09d8dff1e42363a0ca4716bf1329d8441b01714121020238ff720ccd27a92f0bb0ea63d0c08b73291cf283bb422fdcb63bd9b0a5254f',
                    value: 17803274,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914a7bf09e5099224ead64cb27cc9eb38283c3cde4288ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a0446555a0020ab3267b0b667ea2252d414b3714d6f08b5fbf16c0026ce454c903dc6ff002255',
                },
                {
                    value: 506531,
                    outputScript:
                        '76a914d7fc1d156d8ec4384623bb8ceb135df93f2bd93188ac',
                    spentBy: {
                        txid: 'c5f288c020ec4e8701d2114d0f4d7970e9e01e4396abd10ddaebd6e4b44c3d5f',
                        outIdx: 0,
                    },
                },
                {
                    value: 1175076,
                    outputScript:
                        '76a91447da14cfad47a7971dd345821ac7a81e194e474588ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 39,
                    },
                },
                {
                    value: 1557619,
                    outputScript:
                        '76a914d6b7baf14352dd9769a9a8bdb1f69cf700766aca88ac',
                    spentBy: {
                        txid: '021b600e1425c69c1977daf2e72a13b83fe40414061641011573eef88834dec1',
                        outIdx: 46,
                    },
                },
                {
                    value: 1685802,
                    outputScript:
                        '76a914bc53fc8620ece064004a7bb72f0613a0045f6ae488ac',
                    spentBy: {
                        txid: '021b600e1425c69c1977daf2e72a13b83fe40414061641011573eef88834dec1',
                        outIdx: 47,
                    },
                },
                {
                    value: 1957993,
                    outputScript:
                        '76a914ea34af00f2585bddc37607af492a7d5b35d431fe88ac',
                    spentBy: {
                        txid: 'b3368d0b4495896c4e057a0be8df58cdead551057c0103f35a5e3a4dce7cf4b5',
                        outIdx: 43,
                    },
                },
                {
                    value: 2280297,
                    outputScript:
                        '76a914dab80f23ec17efe39e3167ac47575f5b102855d288ac',
                    spentBy: {
                        txid: 'b3368d0b4495896c4e057a0be8df58cdead551057c0103f35a5e3a4dce7cf4b5',
                        outIdx: 44,
                    },
                },
                {
                    value: 2804591,
                    outputScript:
                        '76a914f10147fbbff24aa9f4f9a9f3726760a4abad6a9688ac',
                    spentBy: {
                        txid: '24863ec1bc8eca7d449a37a5bd3bd85e7ccbd2d77ee51c84e1b5b8ade8bada01',
                        outIdx: 45,
                    },
                },
                {
                    value: 2810950,
                    outputScript:
                        '76a9140b8b9344a473853830f3657c7247e4834171d6fd88ac',
                    spentBy: {
                        txid: 'd3942acaefee091f6bf0a9d34282988b31458bb6b10b7cfc3fcd3471be3c2ea7',
                        outIdx: 50,
                    },
                },
                {
                    value: 2862208,
                    outputScript:
                        '76a914a0737c0938d04eff2d5074513ee5fd3fd41de38488ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 40,
                    },
                },
                {
                    value: 2880530,
                    outputScript:
                        '76a914b5d94938a3665b01fc0afee6b6179bb2b9e46b2e88ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 41,
                    },
                },
                {
                    value: 2894084,
                    outputScript:
                        '76a914dbb0e87717a034774a2435db6c9d4791f58bd43f88ac',
                    spentBy: {
                        txid: '1d385f3ca974110728849913177291fc4e303bdb03481b9bef7adba15734d18f',
                        outIdx: 0,
                    },
                },
                {
                    value: 3104218,
                    outputScript:
                        '76a9144e3bebebb3ac2785181534094eadccad4ea8dc4688ac',
                    spentBy: {
                        txid: 'ae14b96fc44c7f43c3c2fd268e484b26d8f4794afef5767392fb1c246d7d3e0f',
                        outIdx: 5,
                    },
                },
                {
                    value: 3122421,
                    outputScript:
                        '76a91458c2d76cd32e1d30d0e62b641d50bdd89200a7f188ac',
                    spentBy: {
                        txid: 'ae14b96fc44c7f43c3c2fd268e484b26d8f4794afef5767392fb1c246d7d3e0f',
                        outIdx: 7,
                    },
                },
                {
                    value: 3419974,
                    outputScript:
                        '76a9142980d02fa9a25306f3dd195ab9c82a2e2877f67e88ac',
                    spentBy: {
                        txid: 'e59775f4ca2828c87a5b31e415e657d571184891c62860acd5a23523830e38a9',
                        outIdx: 3,
                    },
                },
                {
                    value: 3594078,
                    outputScript:
                        '76a91451331eca38c944f17ee6354a3ee48193c7eb1b6b88ac',
                    spentBy: {
                        txid: '24863ec1bc8eca7d449a37a5bd3bd85e7ccbd2d77ee51c84e1b5b8ade8bada01',
                        outIdx: 46,
                    },
                },
                {
                    value: 3794311,
                    outputScript:
                        '76a914755b984555fcd6305583c21d996a8dea7faa67d488ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 42,
                    },
                },
                {
                    value: 4241488,
                    outputScript:
                        '76a914e245bab4243bd6a8f3932c9dab9df496f003eae488ac',
                    spentBy: {
                        txid: '0ec20eea27fcc5eb12211157a64eb34c58b6df3911d5158faa5824e5fd3002a0',
                        outIdx: 0,
                    },
                },
                {
                    value: 5771042,
                    outputScript:
                        '76a9147901f7c02a7fb7de87c373c143e15e87989f764b88ac',
                    spentBy: {
                        txid: '021b600e1425c69c1977daf2e72a13b83fe40414061641011573eef88834dec1',
                        outIdx: 48,
                    },
                },
                {
                    value: 5801672,
                    outputScript:
                        '76a9149db2a709e1f26df987ecd5a5dcb8db0b36a449ef88ac',
                    spentBy: {
                        txid: '493dd3339fca03c94dd0e9b53359630fa8dc2aaef404a6a2328229ae64eb8721',
                        outIdx: 4,
                    },
                },
                {
                    value: 6529646,
                    outputScript:
                        '76a9141c5dd21c29a653e6922c2058852d9f56e483170188ac',
                    spentBy: {
                        txid: '021b600e1425c69c1977daf2e72a13b83fe40414061641011573eef88834dec1',
                        outIdx: 49,
                    },
                },
                {
                    value: 6536855,
                    outputScript:
                        '76a9143510f0c92f8b26e26de575140a084773e95f439a88ac',
                    spentBy: {
                        txid: '24863ec1bc8eca7d449a37a5bd3bd85e7ccbd2d77ee51c84e1b5b8ade8bada01',
                        outIdx: 47,
                    },
                },
                {
                    value: 7742026,
                    outputScript:
                        '76a914ee542bd41bb07264cf9f6e824e45d3446a26077c88ac',
                    spentBy: {
                        txid: 'b3368d0b4495896c4e057a0be8df58cdead551057c0103f35a5e3a4dce7cf4b5',
                        outIdx: 45,
                    },
                },
                {
                    value: 8072753,
                    outputScript:
                        '76a914c4131be628403d70a62e46dfc13b576af05aa5f088ac',
                    spentBy: {
                        txid: 'dbc41978baa1e1b0d1b098a34722eadf351e19383dcc1266118333060847a8e5',
                        outIdx: 35,
                    },
                },
                {
                    value: 8820534,
                    outputScript:
                        '76a914f5ffa38db9ffac77b5a1a6c35eebf2415fedf87c88ac',
                    spentBy: {
                        txid: '24863ec1bc8eca7d449a37a5bd3bd85e7ccbd2d77ee51c84e1b5b8ade8bada01',
                        outIdx: 48,
                    },
                },
                {
                    value: 9000450,
                    outputScript:
                        '76a914b3e42f44a3dff21f72c90555d0ec62b273f0d4a588ac',
                    spentBy: {
                        txid: 'a96de5afa4eee4b098ff8b7423e90d0131673862cb79e7b02a06e084146d5dfe',
                        outIdx: 56,
                    },
                },
                {
                    value: 11771919,
                    outputScript:
                        '76a91463a7fe1eff49be76e18538f3ed380b7386af1c8f88ac',
                    spentBy: {
                        txid: 'a96de5afa4eee4b098ff8b7423e90d0131673862cb79e7b02a06e084146d5dfe',
                        outIdx: 57,
                    },
                },
                {
                    value: 13144002,
                    outputScript:
                        '76a91457f118d5f5eecebc88f711a80018bececbeb86e088ac',
                    spentBy: {
                        txid: '262832d24a3b26fd1af1b24f0a7d019579b7ed1f040777d3374c62305c5f4415',
                        outIdx: 39,
                    },
                },
                {
                    value: 13393930,
                    outputScript:
                        '76a9148d2a8ce8e95b3047b918d8bd24db8c3e39d906cc88ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 43,
                    },
                },
                {
                    value: 13691033,
                    outputScript:
                        '76a914d6a0a87a3a5ea254ed4a2665ac328a7ef769747688ac',
                    spentBy: {
                        txid: 'c2409334c0c33750529e2f9b762e7dab7ca2fb4e67883cd3244b7cbbdc9add14',
                        outIdx: 36,
                    },
                },
                {
                    value: 14490346,
                    outputScript:
                        '76a914810c66b72d769d1fefd2c5bb26d20024e25fd35088ac',
                    spentBy: {
                        txid: '493dd3339fca03c94dd0e9b53359630fa8dc2aaef404a6a2328229ae64eb8721',
                        outIdx: 10,
                    },
                },
                {
                    value: 15649462,
                    outputScript:
                        '76a914b3f036ee778de53049e0152a140bcba4952081f788ac',
                    spentBy: {
                        txid: '262832d24a3b26fd1af1b24f0a7d019579b7ed1f040777d3374c62305c5f4415',
                        outIdx: 40,
                    },
                },
                {
                    value: 16885611,
                    outputScript:
                        '76a9144dbd06c9f304601d8fe89199ee7afa0afc3e5de688ac',
                    spentBy: {
                        txid: '5beda1f52503457c3e2bd93357ad7510e16e69021c589ce91b092215eb37fce5',
                        outIdx: 2,
                    },
                },
                {
                    value: 17311755,
                    outputScript:
                        '76a91435cf783dd7fc1a919c5a92d73feedcab1d3e4dd588ac',
                    spentBy: {
                        txid: 'a96de5afa4eee4b098ff8b7423e90d0131673862cb79e7b02a06e084146d5dfe',
                        outIdx: 58,
                    },
                },
                {
                    value: 19229444,
                    outputScript:
                        '76a914c570835edbc0de4a525a9ba9501eb0b123b8ab1c88ac',
                    spentBy: {
                        txid: 'd3942acaefee091f6bf0a9d34282988b31458bb6b10b7cfc3fcd3471be3c2ea7',
                        outIdx: 51,
                    },
                },
                {
                    value: 19612475,
                    outputScript:
                        '76a9142368a5b973c7d48fa8343b71cfb51b5a4ccfcb2488ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 44,
                    },
                },
                {
                    value: 20857697,
                    outputScript:
                        '76a9149163b5cb6618d7d67562270de630da0d62896c1e88ac',
                    spentBy: {
                        txid: '021b600e1425c69c1977daf2e72a13b83fe40414061641011573eef88834dec1',
                        outIdx: 50,
                    },
                },
                {
                    value: 21475345,
                    outputScript:
                        '76a91464be00bf5c68a60ae520cfa81d051225457572a788ac',
                    spentBy: {
                        txid: '493dd3339fca03c94dd0e9b53359630fa8dc2aaef404a6a2328229ae64eb8721',
                        outIdx: 9,
                    },
                },
                {
                    value: 21879959,
                    outputScript:
                        '76a9148bc944201dec7391def49db52202a009c6a81f2088ac',
                    spentBy: {
                        txid: 'd3942acaefee091f6bf0a9d34282988b31458bb6b10b7cfc3fcd3471be3c2ea7',
                        outIdx: 52,
                    },
                },
                {
                    value: 21900743,
                    outputScript:
                        '76a914af6ae4c996d1ab51dd344b1f491c01163169053588ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 45,
                    },
                },
                {
                    value: 22276723,
                    outputScript:
                        '76a914c1f421d009c6b36b205721c064c2ae5ea3272a4688ac',
                    spentBy: {
                        txid: 'a96de5afa4eee4b098ff8b7423e90d0131673862cb79e7b02a06e084146d5dfe',
                        outIdx: 59,
                    },
                },
                {
                    value: 22828111,
                    outputScript:
                        '76a9146454f4696e5bbb5eb4d368c162b35f6fcc861e6b88ac',
                    spentBy: {
                        txid: 'd3942acaefee091f6bf0a9d34282988b31458bb6b10b7cfc3fcd3471be3c2ea7',
                        outIdx: 53,
                    },
                },
                {
                    value: 22829710,
                    outputScript:
                        '76a9142a8af09882e0b5dd047b03e61eb3630e0678325e88ac',
                    spentBy: {
                        txid: '021b600e1425c69c1977daf2e72a13b83fe40414061641011573eef88834dec1',
                        outIdx: 51,
                    },
                },
                {
                    value: 23106927,
                    outputScript:
                        '76a9147eec957f14c8c35b491f487a8d777cf3b427f47688ac',
                    spentBy: {
                        txid: 'd3942acaefee091f6bf0a9d34282988b31458bb6b10b7cfc3fcd3471be3c2ea7',
                        outIdx: 54,
                    },
                },
                {
                    value: 25043923,
                    outputScript:
                        '76a9148f41a4d08d01a574210a0d99784248d7b718a6b388ac',
                    spentBy: {
                        txid: '021b600e1425c69c1977daf2e72a13b83fe40414061641011573eef88834dec1',
                        outIdx: 52,
                    },
                },
                {
                    value: 25946731,
                    outputScript:
                        '76a9149fbf277434a5a0582ffe774693c343e95c442a8188ac',
                    spentBy: {
                        txid: 'c2409334c0c33750529e2f9b762e7dab7ca2fb4e67883cd3244b7cbbdc9add14',
                        outIdx: 37,
                    },
                },
                {
                    value: 26216189,
                    outputScript:
                        '76a914d35d6706484afdc79bbaab9ce1f84fed4939317f88ac',
                    spentBy: {
                        txid: '24863ec1bc8eca7d449a37a5bd3bd85e7ccbd2d77ee51c84e1b5b8ade8bada01',
                        outIdx: 49,
                    },
                },
                {
                    value: 27153210,
                    outputScript:
                        '76a914fc64d1ceb75ef723b8bb81f53039f239f69de25d88ac',
                    spentBy: {
                        txid: '24863ec1bc8eca7d449a37a5bd3bd85e7ccbd2d77ee51c84e1b5b8ade8bada01',
                        outIdx: 50,
                    },
                },
                {
                    value: 27888923,
                    outputScript:
                        '76a9140b395214ae8c35fd7e8bb6921fa478216fd9e41988ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 46,
                    },
                },
                {
                    value: 28283566,
                    outputScript:
                        '76a9145c9faf662be3667f760e03535c511085a2bc814488ac',
                    spentBy: {
                        txid: 'f7ffab99cca8005728105f2b93a0afd49444116bcd6131b2fcecd0fea40391ab',
                        outIdx: 53,
                    },
                },
                {
                    value: 29688615,
                    outputScript:
                        '76a914f883cd4d8e8b6e1cba5d127e24c57b45c26b46a288ac',
                    spentBy: {
                        txid: 'de39274a222922abfdd373cd373b1f71fb0e58c0c569ac6bc813d01a1dc64f8e',
                        outIdx: 1,
                    },
                },
                {
                    value: 32471718,
                    outputScript:
                        '76a9147fe1c85d201af0ab1322d5809aaa03bb7dac05fb88ac',
                    spentBy: {
                        txid: '1ed72329e29d9441dc9fb3ac828fc66d08e52c8e67a9a0b0268b5ce6bb7e0695',
                        outIdx: 4,
                    },
                },
                {
                    value: 35209256,
                    outputScript:
                        '76a9141ab1428e336477a213d18207570b5008841d24ea88ac',
                    spentBy: {
                        txid: 'de39274a222922abfdd373cd373b1f71fb0e58c0c569ac6bc813d01a1dc64f8e',
                        outIdx: 0,
                    },
                },
                {
                    value: 40404442,
                    outputScript:
                        '76a914219f01df857ef5faa2c1509b8dc958eb9425f5df88ac',
                    spentBy: {
                        txid: '697372648af8320cd2975e4ea52d9772f6f06d9610e5088f4d92ef3f69422c30',
                        outIdx: 35,
                    },
                },
                {
                    value: 48107746,
                    outputScript:
                        '76a914a4c2e50019b19c9d152b6327733033253d61efe188ac',
                    spentBy: {
                        txid: 'de39274a222922abfdd373cd373b1f71fb0e58c0c569ac6bc813d01a1dc64f8e',
                        outIdx: 16,
                    },
                },
                {
                    value: 54611567,
                    outputScript:
                        '76a91479be8c6a6fc20a9f4cd1e55d8e99fef936a5b4fb88ac',
                    spentBy: {
                        txid: 'd3942acaefee091f6bf0a9d34282988b31458bb6b10b7cfc3fcd3471be3c2ea7',
                        outIdx: 55,
                    },
                },
                {
                    value: 54872231,
                    outputScript:
                        '76a914e8f011eded020ed1605848c7b5e6704eb689b33f88ac',
                    spentBy: {
                        txid: 'de39274a222922abfdd373cd373b1f71fb0e58c0c569ac6bc813d01a1dc64f8e',
                        outIdx: 6,
                    },
                },
                {
                    value: 56164346,
                    outputScript:
                        '76a9146573038dc2d55422c20b91588f8264f9aa038d6088ac',
                    spentBy: {
                        txid: '9086ca2908df5f06b61ca2ec2040fc3e7bd39843e35b934f23f89ea7196c7036',
                        outIdx: 47,
                    },
                },
                {
                    value: 58564003,
                    outputScript:
                        '76a9147077be58e7ead7443259fe5409309edbabef41d388ac',
                    spentBy: {
                        txid: '24863ec1bc8eca7d449a37a5bd3bd85e7ccbd2d77ee51c84e1b5b8ade8bada01',
                        outIdx: 51,
                    },
                },
                {
                    value: 59817398,
                    outputScript:
                        '76a9149cf6eb2a055f3340d31d83bf5e29cfe0e9d919f288ac',
                    spentBy: {
                        txid: 'd3942acaefee091f6bf0a9d34282988b31458bb6b10b7cfc3fcd3471be3c2ea7',
                        outIdx: 56,
                    },
                },
                {
                    value: 64104923,
                    outputScript:
                        '76a914d12908c4b7be22044226856207328e20e3e1f2c288ac',
                    spentBy: {
                        txid: 'de39274a222922abfdd373cd373b1f71fb0e58c0c569ac6bc813d01a1dc64f8e',
                        outIdx: 15,
                    },
                },
                {
                    value: 87305777,
                    outputScript:
                        '76a91437a517f6174aed807cb1f9fb26ff25912c8ea4ee88ac',
                    spentBy: {
                        txid: '021b600e1425c69c1977daf2e72a13b83fe40414061641011573eef88834dec1',
                        outIdx: 53,
                    },
                },
                {
                    value: 91558238,
                    outputScript:
                        '76a914b2094f7a6f5c39a66ddff6852bfef1f6dac495fb88ac',
                    spentBy: {
                        txid: '14483f95867cb556833f90ef73485fc883a04fa31404a650c11208dfc391183e',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 11331,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 787920,
                hash: '000000000000000000ecda3dc336cd44ddf32eac28cebdee3c4a0abda75471e0',
                timestamp: 1681610827,
            },
        },
        {
            txid: 'd02d94a1a520877c60d1e3026c3e85f8995d48d7b90140f83e24ede592c30306',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '02cafc6812b1193207d9b336fd109c4044eb02a4ee7d39599d4411f0e797f08e',
                        outIdx: 2,
                    },
                    inputScript:
                        '48304502210097bb101905c26f6198cd862b64a4174e3263fa3dda571cef058e3fb6576fe1da022002c086b779f8129d6f44697e403c7607c26589659134a9468d4471da65b116774121037f36f6573744fbf433eafc2579737e041a99b242eb0fd88dfe8570b5f6a829c7',
                    value: 98396406,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147d432e8ccc646fe6c52e36c285bce2b75f0f500b88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript: '6a04007461620c49206c696b65206543617368',
                },
                {
                    value: 1000000,
                    outputScript:
                        '76a9144fb74b44c66ab529428a943131f236c80d99b82088ac',
                    spentBy: {
                        txid: 'b16ef7b4c184201dd858325c43cd67459bce352f041f7bf44f4b99972cba81bd',
                        outIdx: 5,
                    },
                },
                {
                    value: 97395927,
                    outputScript:
                        '76a9147d432e8ccc646fe6c52e36c285bce2b75f0f500b88ac',
                    spentBy: {
                        txid: '2c644fba674af09cec58af30be0a93b6ebe4f48b976e0531aaacb0b3220a1556',
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
                height: 800715,
                hash: '00000000000000000e5fdea738d0f7e1c30aec453c380b03edf7788ccc154906',
                timestamp: 1689255059,
            },
        },
        {
            txid: '1083da7ead4779fbab5c5e8291bb7a37abaf4f97f5ff99ee654759b2eaee445b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'afda16412e7b9770dd15286295d02544cdf5eec2ebe827616c6357647c31b950',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100ad2200533b3fc6cf4d06b1450a0e10cbb493933fe5927e4a9d53e7005547eeea02207f1e406d9a6a33cab711461219cd085ae33c9b605f40c479b7d072659904f35d412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
                    value: 1000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                },
                {
                    prevOut: {
                        txid: 'aff8fdde86ccf5a1afb83fe9600b0b4d598a7317a9ee2a5f799e9f5fe724ab0c',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a7e1c2bab17698871a4b5d88e15fbcb64578bf1ac525b38c73f21c8ea7e697d702201841b8459beb066fcf388b50a3b4db6a0fd8e0f525fb5353d2de40dbc314c565412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
                    value: 550,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                },
                {
                    prevOut: {
                        txid: '691bcc03b07fa12d5e54628eab24497456af57c76a13d646393ad62105a37382',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100d1e6a7051b3a641c490f6f9129903138a9a5d1f11cbdc4727d4272e1b5fc4b170220429f7d0e7e38265e8f2ced7311a6cc39868e930f6d35457164c891e2ac3e7f79412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
                    value: 64959,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04657461624c71036bdec11e461033145b5d96661e45ba2a40081aad01d34c4da4dac5e42b9961c990fc603ad5c6fed77fff016d57caa7ba8cbcebb33bd47e5eb0707628c0331e4d714054ab773ae4a555c9ea432af23a83104209e5299e86081f5fabe4a744e96eac6675149ce4e7680e342270498d0e68',
                },
                {
                    value: 2000,
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    spentBy: {
                        txid: '00dbc347e48d2d422541057f2d3d1a6c32542ec2bea9e59664edbd8613774e7d',
                        outIdx: 0,
                    },
                },
                {
                    value: 63232,
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                    spentBy: {
                        txid: 'f189376fd662b113e5da5904e318123aee5f573221e57a2545849ac556f31130',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 652,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 798057,
                hash: '00000000000000001007743cd991fa1832e391e147bf75fa6648467ee4e98410',
                timestamp: 1687751968,
            },
        },
        {
            txid: 'ad44bf5e214ab71bb60a2eee165f368c139cd49c2380c3352f0a4fffc746b36a',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: 'd5530ac59da5f357713f3294afdced768584232d2cc21e63d9e3d60f4aaeba62',
                        outIdx: 2,
                    },
                    inputScript:
                        '41176c28f0b30bbd8b985a5960a6e29c3f8cfae093349d48bc609d0957b2eab91ecaf98b5de8b13bd5df66331ae6b9ae5dd73d8a9042bb8d54ae833e826d318cd74121037b28c10168dfb8007d25638ceb6bc13a168a6e4ddcd0aec28591d14387958796',
                    value: 546,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914aed3f8a5add35a9ddaf0a07986c2b73a2202727d88ac',
                },
                {
                    prevOut: {
                        txid: 'd5530ac59da5f357713f3294afdced768584232d2cc21e63d9e3d60f4aaeba62',
                        outIdx: 3,
                    },
                    inputScript:
                        '41bf1a7934dd1c5997953a1cf500bfb2b928b66574782b1dae33546e758d278c58b9527d1ff3b2913d113924eaa3af18d059ae61d49274893af1bc7f233f7bff454121022c2394a4ed0a2d8fb9c30185ea7173a15d69adceda08b96ad408fce866bcd1f9',
                    value: 43110,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914d50ec518d64850fda86e926764ce1bce1ba01a1988ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a04535750000101010120aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c0453454c4c0831353938383335340100203dd9beaedcbb3ad90eec2214fcf71381fa89b08b899813e182a7a393e1ab06190101010012333236322e39393939393939393939393935',
                },
                {
                    value: 43190,
                    outputScript:
                        '76a914aed3f8a5add35a9ddaf0a07986c2b73a2202727d88ac',
                    spentBy: {
                        txid: '09fe3d1b848dcc23006393604811cd1e79cfb12f79c44b0d76a8822c8910ca69',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 450,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 800700,
                hash: '00000000000000000f9a3ee0a9455329c7a66830ff9fbcbc5bd7223263e4afc4',
                timestamp: 1689250180,
            },
        },
        {
            txid: 'a8c348539a1470b28b9f99693994b918b475634352994dddce80ad544e871b3a',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '0fceef4c1425e44171a26a9d089d77dc9bf68b8ab5c1020b411afa1ad253382c',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100fe0f77633de5e95397f2a0fba128e1de7c2467e6d70558c5ef632b5afd504c62022013b4704186e5934f46547212dbd2054a5c8ab08546db945b83477542c51b3b46412103a16e0df390d377ffda5195c4b06148d674a331144fab6ad08e9ec5e8a4e5a4b4',
                    value: 21944557,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148fa951904f6d0ebbc92dc29e761b9eb0a837545c88ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a026d0320eae5710aba50a0a22b266ddbb445e05b7348d15c88cbc2e012a91a09bec3861a4c9654776974746572206b65657073207475726e696e6720746865697220415049206f6e20616e64206f66662e20536f6d6574696d657320697420776f726b732c20736f6d6574696d657320697420646f65736e27742e204665617475726520746f20637265617465207477656574732066726f6d206d656d6f206d617920776f726b20616761696e20617420736f6d6520706f696e742e',
                },
                {
                    value: 21944167,
                    outputScript:
                        '76a9148fa951904f6d0ebbc92dc29e761b9eb0a837545c88ac',
                    spentBy: {
                        txid: 'ce4a58281bda100a572a1d365cb4a83b85d08874daff194179708b18e3f651cf',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 390,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 800324,
                hash: '0000000000000000017ec312fd2d03fee5e52ab163733d5f07e380d36138e58e',
                timestamp: 1689021150,
            },
        },
        {
            txid: '7a0d6ae3384e293183478f681f51a77ef4c71f29957199364bb9ba4d8e1938be',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'a3b227c732f71b8c66b5593923fb41ac19529b4f87d453082bb2289382dbb4c1',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402204b55cb0e0a458f41be000f28ac41d23b0ce7ac6184c009a08e21cde04736602a02204e2e36d24c17d174c96e0d716a0d9d51d3009bde27a37d1961cac10fe483bec3412103f1f48963ab04429f0cacf2db96ec8189598b56afd2cde8a614440c78479ae037',
                    value: 500000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                },
                {
                    prevOut: {
                        txid: 'ed234d8854c599d88304e807b04b9e41a04b6a9fdfd92b1970e7a27c89a68473',
                        outIdx: 3,
                    },
                    inputScript:
                        '47304402202ddc33dd6e31885d3ae5c8f35adce3c6af89ba4c7e6bcec60e90f9ac059eb42c022037d2fefcb1ad7e13f066b4bf336cdebf54cb90d59a7375c09f64d5340cf6ceaf412103f1f48963ab04429f0cacf2db96ec8189598b56afd2cde8a614440c78479ae037',
                    value: 28351,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                },
                {
                    prevOut: {
                        txid: '0a4e28b70b6b1e26e02ea160261edfc7e6ffdb4ee9d7a53cf5e9c50686b4c5cb',
                        outIdx: 1,
                    },
                    inputScript:
                        '4830450221009d35c5646c47be48040aaa781bce22cc287b2f54d71ea028d9c12fd11dc2115d022025cf6916dfe0c4ad695b8a948eadeafb2bcdc0304dcc701637e33cbf79a401a7412103f1f48963ab04429f0cacf2db96ec8189598b56afd2cde8a614440c78479ae037',
                    value: 200000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                },
                {
                    prevOut: {
                        txid: '5909dd3d0cf37141651b629f9ada6b8c45901889e3153e27bc0673461f67fafd',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100cf624e1a8cbc2cb9fd61f55c443490ba9eb922296bdc698c0a7db6a23b9cd33b02206f57d5f503c70a68097f0866c9b46bc7a35b130673b0b9a72b8b71b82b2d004e412103f1f48963ab04429f0cacf2db96ec8189598b56afd2cde8a614440c78479ae037',
                    value: 48995,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                },
                {
                    prevOut: {
                        txid: '8b837074b3d1f36066c9f0d880e69e3476368e905039fbeebb4bebab083c21fa',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402202b097ee4881fc57fe7a1551f8ee8bf9e0b40b6639a038d2c744e399850690e1d022063b5ff44314df2ec83b163683ff46c963a2f021f3e59caf3fa96914cc17342f1412103f1f48963ab04429f0cacf2db96ec8189598b56afd2cde8a614440c78479ae037',
                    value: 4000000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a0464726f7020b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a04007461624c525374617920776974682075732c2065436173682041667269636120697320746865206e6578742062696720636f6d6d756e69747920696e20746865204166726963616e2063727970746f7370686572652e20',
                },
                {
                    value: 264706,
                    outputScript:
                        '76a914957b59a2bfa17ea7fc234e532b263169b6d34aa988ac',
                    spentBy: {
                        txid: '33b640c3f87a5d7d148bdf8870a3cdfad4dbfdad7abfb39fa97787ca9744b912',
                        outIdx: 1,
                    },
                },
                {
                    value: 529412,
                    outputScript:
                        '76a9148f882b02e1040f83c2f73007bb334716c38dbffc88ac',
                    spentBy: {
                        txid: '54d7c32d64ac3cb94c55ae4a9ca5c0519ea2dcf65962485e668ebb0bd7b0e990',
                        outIdx: 1,
                    },
                },
                {
                    value: 529412,
                    outputScript:
                        '76a914f43ac7271cee240bee3796938203105fb54c045c88ac',
                },
                {
                    value: 264706,
                    outputScript:
                        '76a914d5a79acda6dbbe14a686a0c59466f52656330a9588ac',
                },
                {
                    value: 529412,
                    outputScript:
                        '76a91429207c3d229d6163521fbe87e52e64bbe584dbc988ac',
                    spentBy: {
                        txid: '80129555a3900a8d1084a6ecaf24f60dfb4fb25fa93ffed057536f0655d4df24',
                        outIdx: 0,
                    },
                },
                {
                    value: 264706,
                    outputScript:
                        '76a914e735901add6ea366a0964ab54ad9d9158597f50c88ac',
                },
                {
                    value: 264706,
                    outputScript:
                        '76a91407acf15b7cc6a4c18d8d1c3a5611ea30718c2a0d88ac',
                },
                {
                    value: 529412,
                    outputScript:
                        '76a9146671b4690e282cb79707b1ee696d54a6072329fa88ac',
                },
                {
                    value: 264706,
                    outputScript:
                        '76a914d4f7e7b420eb1c5410abf698c72d790f0c4cc1b388ac',
                },
                {
                    value: 264706,
                    outputScript:
                        '76a914b19e12ae2aa186102486e8348f22b87ae426eafd88ac',
                },
                {
                    value: 529412,
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    spentBy: {
                        txid: 'e58c868250f4e2949d5b72a1975d3a90247d59ea019edf4aebd214ed0d4c62b3',
                        outIdx: 0,
                    },
                },
                {
                    value: 264706,
                    outputScript:
                        '76a914cdba2655ee5abf18a5b6203da5b7d8cc28c36ca888ac',
                    spentBy: {
                        txid: 'f33e2516b93628e6f3608a2233e35af00426eb8ec3cba5836af827ba62cc0bf9',
                        outIdx: 2,
                    },
                },
                {
                    value: 274783,
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                    spentBy: {
                        txid: 'a2d019cffeb34decfe11f6135ee6aec09aeed439f34369ea9216b78a5d2040a0',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 1326,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 800392,
                hash: '00000000000000000ce15f89ed2d06604932e5ff53fceebc9a3e1dd6fdff8438',
                timestamp: 1689078229,
            },
        },
        {
            txid: '22135bb69435023a84c80b1b93b31fc8898c3507eaa70569ed038f32d59599a9',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'd5626b4441deba5ffdb52f32352726e87db432f66c183c7f1c2dc23a81080915',
                        outIdx: 0,
                    },
                    inputScript:
                        '4730440220718019bbe581cd2d505837df7c76be53f7ea3798cbe2c8e9985b32d95b4f3c9202200db9c710c07e3dc7b2e6153e6af3fc0c6d9a1e9b953a2c5812c3f6a12bcfb8c8412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
                    value: 1000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                },
                {
                    prevOut: {
                        txid: 'd5626b4441deba5ffdb52f32352726e87db432f66c183c7f1c2dc23a81080915',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a309d82c4a00ea00b2a9f11bc0a1625b4272fbf9c627c723377ee81428c9cc5a0220523f45935bbc9bb8cfa2454cd3be1c9ee3322e5c849c5f4384bb72736958a628412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e',
                    value: 28091,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a042e7865630005646f67653215000b7d35fda03544a08e65464d54cfae4257eb6db7',
                },
                {
                    value: 554,
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    spentBy: {
                        txid: '9b9bc49c18a513f04c9d05dcff2d5e1164408b837d95ef695d24524520fb9358',
                        outIdx: 196,
                    },
                },
                {
                    value: 27785,
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                    spentBy: {
                        txid: 'c3bae8350772a99d52086720d2712813f8e47313d20f5d914a728cb7a2bcd9ea',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 415,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 800458,
                hash: '00000000000000000360b4edae6ac5cf508cf728d508bd6521d4fd9495a24ac6',
                timestamp: 1689130494,
            },
        },
        {
            txid: '45ec66bc2440d2f94fa2c645e20a44f6fab7c397053ce77a95484c6053104cdc',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '979888d682e351714e6a3d6a96dedb57a0f19471a8eb7f4edc20f033f9b359b3',
                        outIdx: 3,
                    },
                    inputScript:
                        '41597c9b4eff3b012afb56e745c46d3f9cddfbd72fbec655d63d0bfd4b4a23225aa237a425a25685b54a8f767becb9109f1b0951c3ecfe7fa3d1a519a8f49ef6a9c1210363bbf8cf60612f89a8da03416a7ff0f398b315c7217b0c7a15ca52d5fcecb316',
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
                        amount: '39976',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9147276ae7693883fa1165628e298899d8ee9248e7c88ac',
                },
                {
                    prevOut: {
                        txid: '6f6da390386a97d5ce9a585422c11e60e1a4dd30ac6abecef5887ceb1632151c',
                        outIdx: 1,
                    },
                    inputScript:
                        '410dc4415d0ef25301d74f5fa770bb0b8e4f3bc1b9c87f3d9c65efdbe246468c364ad4a696c9b6491a215643807db3e3ac209e38590bbecd0185d23d045cea8c07c1210363bbf8cf60612f89a8da03416a7ff0f398b315c7217b0c7a15ca52d5fcecb316',
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
                        amount: '228263',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9147276ae7693883fa1165628e298899d8ee9248e7c88ac',
                },
                {
                    prevOut: {
                        txid: '714b40aaf824007782c0af61b0e72ad4e825446111633fbe1b7c5b4a82a1b911',
                        outIdx: 0,
                    },
                    inputScript:
                        '41d2966d687a9ad26c155c99fcf87b94b2a54b9ecbbf6caee7f6063b756aafa63113c5a16abc21495aaff02b5e558853043038de716c3adbaae2bd69356be4e3ce412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    value: 1000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                },
                {
                    prevOut: {
                        txid: '714b40aaf824007782c0af61b0e72ad4e825446111633fbe1b7c5b4a82a1b911',
                        outIdx: 1,
                    },
                    inputScript:
                        '41839e901cd8f3f8d20d99c02ffbc6268baa5f6e5d410ec3207f5a582b4a2731b4baa472afec7c78f834bb16900bbc7fb16d2db446cb895a36a18bd520524ae60c412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    value: 1000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                },
                {
                    prevOut: {
                        txid: '714b40aaf824007782c0af61b0e72ad4e825446111633fbe1b7c5b4a82a1b911',
                        outIdx: 2,
                    },
                    inputScript:
                        '413ba7dddc6fed541f666086c4db0420b03a279f3926c5acc7dbc0d8d51c95cc1f0ad28f030bc4b76d6c42b94caed9750d7f9d7274c017e04049ae64b194299c49412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    value: 1000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                },
                {
                    prevOut: {
                        txid: '714b40aaf824007782c0af61b0e72ad4e825446111633fbe1b7c5b4a82a1b911',
                        outIdx: 3,
                    },
                    inputScript:
                        '41a14fe12995bd1fbd3e53b00767121e4504a5a97be0482f936cedf3cbc3c04449a3155293522afd213bf4c6e5655c6335179eae63b94afd70a979d63ae7621c04412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    value: 1000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                },
                {
                    prevOut: {
                        txid: '714b40aaf824007782c0af61b0e72ad4e825446111633fbe1b7c5b4a82a1b911',
                        outIdx: 4,
                    },
                    inputScript:
                        '416c5a43be467820cb14fb8c82a389a80507816dae3649c28f06def267ca9de2c52089d8f7be41076bf1baea97f29538b3a8cbc6cca2e22d7227a58824a676e43f412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
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
                        '6a503d534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd03401f000000006067010000002f9102000000',
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
                        amount: '8000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    value: 2588,
                    outputScript:
                        'a914f71cf8cb91804a2205901cc0972c3f4a088a1aae87',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        amount: '92000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '73ce0b742131ace72e8598a9585971220c4ddcd4d4d13a058bbcc52c355dca2c',
                        outIdx: 0,
                    },
                },
                {
                    value: 546,
                    outputScript:
                        '76a9147276ae7693883fa1165628e298899d8ee9248e7c88ac',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        amount: '168239',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '292057e2071f8245317ff4e504a0b57ce3c841f4a9505cfbe7ecc7521d0054ff',
                        outIdx: 4,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 1170,
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
                height: 800378,
                hash: '0000000000000000089a8326edc4a36fd34ecf37fcfcdb2b7ffe9f3dd10bad2a',
                timestamp: 1689065237,
            },
        },
        {
            txid: '413b57617d2c497b137d31c53151fee595415ec273ef7a111160da8093147ed8',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: 'ff06c312bef229f6f27989326d9be7e0e142aaa84538967b104b262af69f7f00',
                        outIdx: 41,
                    },
                    inputScript:
                        '40e9025766015ff3fb2bb1a0643540589de84a6bd74799f6a5130e5f4793bb04b6614eda7d11f0e3c6edba32e8f97952f87fd0065e08d7d5700d668b72880356184730450221009aa1063132f8fe88d11d69438be0320201ec79e74b43af57ec91f6697f9eedc10220294cc6f123ef35a2a92146b3af9f19a8b84745df28ff81b0f918547c0f316aa020912cacf95b220116236c81840549456ae3cc3a537d94e9a5a7691eb609b9e1bb2102ccd325f41c9e343dcfb2b767e9fd1be0b60636c2f08c403bb72d1dc5751a1f0d2c6fbb7b01417e78ad7e21022b7c4d310cd9aee3a0256b2f6399d2d737da47f14582667ea30a159ed879f003ba',
                    value: 1000,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        amount: '0',
                        isMintBaton: true,
                        entryIdx: 0,
                    },
                    outputScript:
                        'a914ea826cc1a3a981d048cd78b66711222bece8ebf287',
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript:
                        '6a5032534c503200044d494e5445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd0160ae0a00000000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a91472a92e48c5ab72566959db1dbf1b8dce83afabb788ac',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        amount: '700000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '4307458f1952db756e959e68aacae82c73a4b86d6e996636d66bf79bca28cbbe',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 396,
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
                    txType: 'MINT',
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
                height: 800218,
                hash: '0000000000000000024133f7d5dcce943020d32452704aab90d00e7bf8c8025e',
                timestamp: 1688956131,
            },
        },
        {
            txid: '9094e1aab7ac73c680bf66e78cc8311831b3d813e608bff1e07b1854855fc0f1',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: 'c211f534b17dfe5356c7e83e16202a4621bb7720bb2efb96cfcae14a6bae49ca',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022035f1526804dbc6164f905280e1b3ff09841b14471344bb676985ac5ded00bf3602206981faee987c646a169538a8bbef38c5d0e2f377b6d6beb7a56d01a961ca65b1412102063d93675f351cb3b95e671fb2b8b20fa2e0ff624079ab7d32c49cf462286c23',
                    value: 8862751,
                    sequenceNo: 0,
                    outputScript:
                        '76a914d95a60cea21479569e6b1ad39416c8fbc97323c588ac',
                },
            ],
            outputs: [
                {
                    value: 8419613,
                    outputScript:
                        '76a914453c8c15aee05fe5a027d4bf5681cd0bc682c0b788ac',
                },
                {
                    value: 442686,
                    outputScript:
                        '76a914d95a60cea21479569e6b1ad39416c8fbc97323c588ac',
                },
                {
                    value: 0,
                    outputScript:
                        '6a403d3a4554482e4554483a3078613961614633304636353935354336396331364233333435423531443432364439423838426138373a3834313332313a74723a30',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 300,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 800383,
                hash: '000000000000000014f30e80baf015eab61fb92f62813708fe8ee38ce27a46be',
                timestamp: 1689070486,
            },
        },
        {
            txid: 'b5782d3a3b55e5ee9e4330a969c2891042ae05fafab7dc05cd14da63e7242f8e',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: 'f75274016ff26983635008c3c1500c5aa3412e37c55f82bdf2542873376cbec6',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402207dd238f4aea9210eb5e311ec38a38c079290f89ba39a436cf1d7c4b3ee10a1b002202516389f5631a67d7eb89e03598dd90a20cae966049445cb1cf82059feb1cd49412103c918521e29ff4986c49c48750d18f1f586a34578ab37f2d206ed8d25abd95d39',
                    value: 12966881,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142cc3608fe629c4f402e511878982bc01bde3445d88ac',
                },
            ],
            outputs: [
                {
                    value: 12966621,
                    outputScript:
                        'a9145aafaadba9ff909067a640e5e2a46b756aeaf71387',
                    spentBy: {
                        txid: '56f1c0813d1b44697deccdd32b5182448e8c4c1bd6db771ceed779d4a5021ab9',
                        outIdx: 0,
                    },
                },
                {
                    value: 0,
                    outputScript:
                        '6a14663ddd99990bcd969994ec2288a2a86dc532e1a8',
                },
            ],
            lockTime: 1692219709,
            timeFirstSeen: 0,
            size: 220,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 805569,
                hash: '000000000000000013999983f42bc6270ca0cb0f0247872458546c381a270d01',
                timestamp: 1692219954,
            },
        },
        {
            txid: '4f33c81d95641eb0f80e793dc96c58a2438f9bb1f18750d8fb3b56c28cd25035',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '87e03ed9f2b1690a0c32484a9084d0a5a494a084616c8a2cda2d967bf58f4758',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100d48813ecde5c1878587111e2b6a931414acfcd133af250f3b6f15363afb554570220780fc409af09dfe10b6b0bcbea7c1e588456a8fb029571363e31f3e4174f652b412103562731a08eb23e6260b516c4564f746033e9080bc9f61ad2158a63927500b8b1',
                    value: 584106362127,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                },
            ],
            outputs: [
                {
                    value: 214748364700,
                    outputScript:
                        '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                    spentBy: {
                        txid: '63edf584e527ec15d6d3ffa33db55cd6055a5d8af3dd778a8ffaad35a594a180',
                        outIdx: 0,
                    },
                },
                {
                    value: 154609632467,
                    outputScript:
                        '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                    spentBy: {
                        txid: '99eec6fec03c1c3d2043a07f38488aae9416e676f859a940e521b619f9308d6d',
                        outIdx: 0,
                    },
                },
                {
                    value: 214748364700,
                    outputScript:
                        '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                    spentBy: {
                        txid: '63edf584e527ec15d6d3ffa33db55cd6055a5d8af3dd778a8ffaad35a594a180',
                        outIdx: 1,
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
                height: 800230,
                hash: '00000000000000000684570e0d5280b19e0bda62d3a620c0f90d1d7943b17fed',
                timestamp: 1688964211,
            },
        },
        {
            txid: 'f5d4c112cfd22701226ba050cacfacc3aff570964c6196f67e326fc3224300a2',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bafb00bf336f89b3e82af6c9692fcfa9c0c485fd296f6e2d11a9aeffdf0658c9',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100b868d4ead08172bcd2dd666173f108476d6ad83536b1d669063ad48281271fa002202a1ed3f7217cf0dbc6c6114d6087a06d9d2fdcd60e3a8301f9e311be53eb91e6412102bda582a4bf42f9b5520d5023f37e53744a8f048a404d477f3187ccf3fdb0a43e',
                    value: 30426563453,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147c09e7cf1b2c40d4e08057e47bda9cabcdfd208588ac',
                },
                {
                    prevOut: {
                        txid: 'f67df2c2b0cbe6bbbf2d364305e5e5b57498bc688f5062a46ce6b273c160999b',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100d5d1c650af14f2fc58ede519385f184c81cc26ab7e49bcb81700bb4fd91a33cb02204dc0c91c915dadf5bff6bb2d54713bb338072e229a9053c557a11c8df7aedf92412102bda582a4bf42f9b5520d5023f37e53744a8f048a404d477f3187ccf3fdb0a43e',
                    value: 30225350654,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147c09e7cf1b2c40d4e08057e47bda9cabcdfd208588ac',
                },
                {
                    prevOut: {
                        txid: '28b8e29e2450dbe72f23e759de05466aad90a6a21161617ec4eddbe2f16cf0dc',
                        outIdx: 0,
                    },
                    inputScript:
                        '4730440220299867647c651e087b2362cb46cea041d1340cc9d292a747b79f60a39c5e6ed802200ce28ec8453004aed4698cc91572571c3fb6c7dcab27e5b81838ba11b7fcf47b41210347225b9b5059b0ecd55f4d3c611396893be1e4ddbc4f6fb359344d66d90603f1',
                    value: 16816891900,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9149f27f41b828019c141516179ab00e538a3f65a1788ac',
                },
                {
                    prevOut: {
                        txid: '7292db20773561ff63fdccbe0860333a2cfed8efac6077257219a9d9d0e6c7c2',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022025398b595b52b1960da327514ecfa26c764d996336b983ef8a7824082e421c93022016691118624efe4eba4c70faca860f41e36b68ee39a8d7513d170ff43c984a84412102b56ea6bd49408c797271d772223ac85b92b10237d160e5ad4ff4c44c8ed00a50',
                    value: 6908486500,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142d9c4a5a292f5fef07b8cfe76b0c66d90d15a5d688ac',
                },
                {
                    prevOut: {
                        txid: '7292db20773561ff63fdccbe0860333a2cfed8efac6077257219a9d9d0e6c7c2',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022004f43cc3b9ceb7f913ee80e128b08ecfa4b610c70e1099fa406f275b3df23dfc022061fd494601553d29396bba36c60510e8d2b8c3383144c917ef20a7c6866d13a64121037b692abf35a795b78711ef5455f47579360375d96eca666e2c48c85260f2eb4b',
                    value: 5101721000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9149d1cd75ff25c555213ab5fef4bbd6a180a5e5e7d88ac',
                },
                {
                    prevOut: {
                        txid: 'da7a6212606e606a58a933794140c6cd61766f9ba7d818d6a8c81132f2b4fa7e',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402200ffaa112a2dd2dc15616ad307375c48ca838d0ad181e0ad832e288f664d821a40220734a342dd82e175c422831ef59ae0023c01ce38589b9f1748157176533d7164f412102b56ea6bd49408c797271d772223ac85b92b10237d160e5ad4ff4c44c8ed00a50',
                    value: 4810263100,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142d9c4a5a292f5fef07b8cfe76b0c66d90d15a5d688ac',
                },
                {
                    prevOut: {
                        txid: '440e06a33ca6313a4fe046f1376940494f3eb1cd0691c72b8ee0969d76470a12',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100aaff5eb83c7bada3dd363f528ea7c8cf0e48d745d994d1d4bb2b906da832a24c02205430989a4dd0955690eb9a2e41b7c91bfefd3b79b82f27e0ac434f9cc55aca86412103dea874528abd36e4f0484357f510dd3875c8a2aec1baeac73dfaf5ea860bd510',
                    value: 4000000000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9143d1ee2681911f344e77097a8bd25576e1da1c51788ac',
                },
                {
                    prevOut: {
                        txid: 'bb1f39fc82315bac41cfe967f435c11a928c3b2a1bb6562880c04f25b8eafd29',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100f0a2b357da363c552f8ddcc9ce6e2e7554a90ea7214a80af62c0195d1df1ad0b02202847981fc03cb4f751b7640b283f722a241896e5a1b6221cb9c31ead0b44e524412102b56ea6bd49408c797271d772223ac85b92b10237d160e5ad4ff4c44c8ed00a50',
                    value: 3463133300,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142d9c4a5a292f5fef07b8cfe76b0c66d90d15a5d688ac',
                },
                {
                    prevOut: {
                        txid: 'e9c35dd14fbb770d497160a4119aefbd17d0e920ebaf91a12639d58e6f6a3fc4',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100a5df4cf238b2014f748f3ebe6c7e83cd1a32322bcea736d169b1576e0f1604c70220363170a21ae3c612dc4ef6bd4b6348ac528956e499f7c5d28a3cb40d439024d9412102b56ea6bd49408c797271d772223ac85b92b10237d160e5ad4ff4c44c8ed00a50',
                    value: 3295559900,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142d9c4a5a292f5fef07b8cfe76b0c66d90d15a5d688ac',
                },
                {
                    prevOut: {
                        txid: '76c2cd906a42adb530b9cecd184c49230786f8ccdd6c498d743c17e197c53a1f',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100dd42a76f7d99703eb5f08adbdf0a55b76ca80ba84668a181a26a0a4586e894bc0220754cd7b68540db2cd51cd599880585c6005e43953ca7af282d3929b9234703a741210297dffbcf8f417222ddadba818df5110a4b83fccdce773479c2044f25d3cb0071',
                    value: 1412324900,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91429981fd0910f0851fcb3422b37abb5de442de33188ac',
                },
                {
                    prevOut: {
                        txid: '66d8b183d7fd40dc5e8d06e16a6189b8d80b07a7615601e008ec476cb847e6be',
                        outIdx: 0,
                    },
                    inputScript:
                        '4730440220219e5b506570bc1d259d792a2ef33ed04a4a5ad01614bfab79d2f0f903b257d102205bd60750fca96273264c6f736397693198203f2047e457c3878b166d6145a46d412103020f6e4ca80517db5a8ce83bf33169e018f75aa55a399678a8a33dcf0506c3fc',
                    value: 99900000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914ef95330c2b65976c5c63b03d544207b5e55bb58b88ac',
                },
                {
                    prevOut: {
                        txid: '5acbc53048b80ce6f0caa7fe402ec8719f6b5d0a679b9a7646a099bfe4453bd0',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100f74b49fa395d8cd8d92d23e9c076e090a654ab30d0fd28dcf862fe827bb35d3c02206cd85e601f7b183934553e829e2e97c20062ecc23316fd8b033a29781e7261bf412102609d0ef47f50c17d99aa5db555e267ab2f91521c8f9c6be0301ae3e69c031176',
                    value: 8625006,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144d746dbe5864a2635376326a3995f8ada2ec339d88ac',
                },
                {
                    prevOut: {
                        txid: '434b32c3cb3583a5ce0d27dcfdf8a8c99266d5a909af28e914c62526e9cc0d60',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402205260a686c8b3d2272a92930d76fda2dae5f9a16afee43c3b2ddb2c3d2742ab930220176b484e84b26a422481e2e6fb690484c2f6cab7d1b03af31f44a8b77aa4b58a412102609d0ef47f50c17d99aa5db555e267ab2f91521c8f9c6be0301ae3e69c031176',
                    value: 8625000,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144d746dbe5864a2635376326a3995f8ada2ec339d88ac',
                },
            ],
            outputs: [
                {
                    value: 106577441836,
                    outputScript:
                        '76a914a520c86a08366941cd90d22e11ac1c7eefa2db3788ac',
                    spentBy: {
                        txid: '78bc65dce0917bf1d3c29f8a9cce02204cc85f90dfeda68356d7338e4d68be4f',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 1962,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 800383,
                hash: '000000000000000014f30e80baf015eab61fb92f62813708fe8ee38ce27a46be',
                timestamp: 1689070486,
            },
        },
        {
            txid: 'b2c9c056339d41ec59341541dda8bd6e570730beba485e14eb54d0a073700c22',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '8918611f5a0a432269a4e1dc560e9189b9423089d2dbe94d972515b7c96b214a',
                        outIdx: 1,
                    },
                    inputScript:
                        '419e644b0b2da83425baffd1d591632fb07216568e0e63c93f4794541aad34801779ce531c546bc8896086670cb59c27afe70972d7e9c058d9c6c43da43ecf6ba4c121020cd8434356c9c73fe2efb9cce867cd86e2649fb77fc28b9bd72f17cf9c4b221a',
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
                        amount: '2000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a914378c3b416e77e01198c01ad215b8afd0bb72799488ac',
                },
                {
                    prevOut: {
                        txid: '696ec00c645c715a146ad6a910295ece67d846e0e6e7f925519df07880a968e9',
                        outIdx: 14,
                    },
                    inputScript:
                        '41c865813618b58d4e6f311d70392b4f1cc15d160ef6813ea95255246b0da2ee3dbfc057138998354b81c67df5e23f75ebd39c6d5b2071b0c7ae4d8521469beef7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
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
                        '6a5031534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd01d00700000000',
                },
                {
                    value: 546,
                    outputScript:
                        '76a914acdbf937b086ddaa970072a610daa8d10f14549a88ac',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        amount: '2000',
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1715869910,
            size: 387,
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
                height: 844893,
                hash: '00000000000000001e5a53b3ee70596a3c02f847a295a01116302af25529cc68',
                timestamp: 1715871026,
            },
        },
        {
            txid: 'd8fe456c89357c23ac6d240fe9319ce9ba393c9c3833631046a265ca7c8349e6',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '00e43308683a7b97dbfa97f8e8a83dc76c0a49b36c646ef0e31410c546b1bacd',
                        outIdx: 1,
                    },
                    inputScript:
                        '415baa3f7a0f8294ec0555e1f825c43043eb229f4e2c0bf9a5a676838a881daca32346bbdee05b346f95c39cd69ef709990fd19bbf574f69bf898cd9a1cba001a341210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                    value: 2531619,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                },
            ],
            outputs: [
                {
                    value: 4200,
                    outputScript:
                        '76a91430f16ad77116a4b9e7f337743e35271323d63e0d88ac',
                    spentBy: {
                        txid: '16eb156e4b2688706f9e3da8bdcba69f363d1975ccb363b02274a7ff13d3220a',
                        outIdx: 0,
                    },
                },
                {
                    value: 2527200,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    spentBy: {
                        txid: '6f77cfe3148f28de4b982c18d34e79b8d51a368a7c94354b7399133318daf129',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1727906695,
            size: 219,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 864888,
                hash: '000000000000000004fd9bd9e95cdc1d6b6bf963c743fec7c808d407d4e52c46',
                timestamp: 1727906948,
            },
        },
        {
            txid: '083b7862bae48e78549ccf63833896f5f4f5bdef5c380a108fa99cdb64261fa3',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c7bde74f7a8ebfc57dc373036aac13277ae23f4f94593f0accf87a4317900fd4',
                        outIdx: 3,
                    },
                    inputScript:
                        '41f9e93665c2d65431ce4142cc4fb93ec0818b50732c52be2de33df3fc4d056fb923351bdef771f46bb235371b5def9fec16590484c0525f27d1179e7e32ab30d641210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                    value: 2524161,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                },
            ],
            outputs: [
                {
                    value: 4200,
                    outputScript:
                        '76a914eeae0fea781c26c93879523ba5a47c244c768ece88ac',
                    spentBy: {
                        txid: 'afde4b9345a7bdbb20eaf7a0da3c730ca28334b8ceffce0a3e7b720b0c5d5a09',
                        outIdx: 0,
                    },
                },
                {
                    value: 2519742,
                    outputScript:
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    spentBy: {
                        txid: '68d48755e671dbd6946d811dff04532ede483cee2f3c284e08dddec3d7c351d9',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1727907007,
            size: 219,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
    ],
    parsedBlock: {
        hash: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 819346,
        miner: 'unknown, ...863u',
        staker: {
            staker: 'ecash:qrpkjsd0fjxd7m332mmlu9px6pwkzaufpcn2u7jcwt',
            reward: 62500000,
        },
        numTxs: 27,
        parsedTxs: [
            {
                txid: '4f33c81d95641eb0f80e793dc96c58a2438f9bb1f18750d8fb3b56c28cd25035',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 260,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [],
                },
                totalSatsSent: 584106361867,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: 'f5d4c112cfd22701226ba050cacfacc3aff570964c6196f67e326fc3224300a2',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 2877,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9147c09e7cf1b2c40d4e08057e47bda9cabcdfd208588ac',
                        '76a9149f27f41b828019c141516179ab00e538a3f65a1788ac',
                        '76a9142d9c4a5a292f5fef07b8cfe76b0c66d90d15a5d688ac',
                        '76a9149d1cd75ff25c555213ab5fef4bbd6a180a5e5e7d88ac',
                        '76a9143d1ee2681911f344e77097a8bd25576e1da1c51788ac',
                        '76a91429981fd0910f0851fcb3422b37abb5de442de33188ac',
                        '76a914ef95330c2b65976c5c63b03d544207b5e55bb58b88ac',
                        '76a9144d746dbe5864a2635376326a3995f8ada2ec339d88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '76a914a520c86a08366941cd90d22e11ac1c7eefa2db3788ac',
                            106577441836,
                        ],
                    ],
                },
                totalSatsSent: 106577441836,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: 'd5be7a4b483f9fdbbe3bf46cfafdd0100d5dbeee0b972f4dabc8ae9d9962fa55',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'CashFusion',
                    msg: '',
                    stackArray: [
                        '46555a00',
                        'ab3267b0b667ea2252d414b3714d6f08b5fbf16c0026ce454c903dc6ff002255',
                    ],
                    tokenId: false,
                },
                txFee: 11430,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a91412934a7a99b69a60c3b99f991cd79d257104f5a688ac',
                        '76a91415c0b62c9f73847ca9a686561216c20b487a0aad88ac',
                        '76a914a4e299724b8e81474df916c25c7a816a43c8748888ac',
                        '76a9147afa62562b93fecaff30190ee3a2836dcb95d42f88ac',
                        '76a91468e15e8bfe2d969b7963181b976e6833e294661288ac',
                        '76a914f941b2e03f973ce5b13766159eef190963e2393488ac',
                        '76a9146e3430f87a128ac4509fb0547f07ba0e3e8cea7688ac',
                        '76a914c72166790bc8c779163e17b11939a6bd6022a7e188ac',
                        '76a91483c54d6ec805f4db16c935f5bb89da791f971ac888ac',
                        '76a914336fb64b7e98221f82aced275440c29e7e1d11b388ac',
                        '76a914b114a9d636ac7558c04e902c3a1f7c1fd9008bcd88ac',
                        '76a91411667c453097adf3e71d08986df7766c26f3399088ac',
                        '76a914a125966da9024acea37f867323778641ff0e891888ac',
                        '76a914e03ba5757763a00aaa8aa9eda71da51610d5ef2788ac',
                        '76a914b13b05d51174d91381b0ea6fb07a6345eea1abf788ac',
                        '76a914349c3f91c2782b235ae0d1a2c3acf053d554170788ac',
                        '76a9143afafec322ef1a4f70a6ca68dd9090182716181888ac',
                        '76a914cb74cf87cd355cd01505645eaf165646a4eb1ce988ac',
                        '76a914c42245ebeb7fea2996e5e0f65537b56fb58ea97d88ac',
                        '76a91447d7bc2240955fd18d53c67c4b814e166b152ec388ac',
                        '76a91410b45d95195a71957b43bb82762e6cb48e67888f88ac',
                        '76a914894e84afe4b07413c99087067292aca67d286fbf88ac',
                        '76a91473b804181c01f16cbf63fe262e9a0c8de929af1e88ac',
                        '76a9147b1a9441467759f8693bdac3e356ab6110bebe1c88ac',
                        '76a914443f7cf9987b921c10d888c3d617c54aba5e8fb088ac',
                        '76a91490de1562e4aadc991dc13d28a9d112461fea9cb888ac',
                        '76a914273808f74a845b9b77345d43cb679ca793c5e9e688ac',
                        '76a91402a6a02a8bbdc6a9ebeb74bf5d8b9f7d20ad386688ac',
                        '76a914fcc200903ed9167def3df599c599d0c98b2cea0588ac',
                        '76a914692a38590fe1786dca47d2cbcc0ee30d969ca0c788ac',
                        '76a91486b2a4458787245715865c9ea5e42f8d68e8828988ac',
                        '76a914c472cd5ea7282180aa6a663498e98c2b781afa0488ac',
                        '76a914457a8a10ca1b8ab373c7e5e9ea7d784e8ce2efd188ac',
                        '76a91406cbe837f5a8b81ec8fddcf6e46c15b84b43965788ac',
                        '76a9145ab8a85ea3f6bf3a69b15b9f7570aeb021df77b488ac',
                        '76a9149704c9d13afb31a9b84ea5cb56140499e54743bd88ac',
                        '76a91423dab92affaa336ae18cab2669d116fbfa55b0bf88ac',
                        '76a914c6a520edfedb88ae478c1fdb309739d62d47dbd088ac',
                        '76a914388d048805daa142def4833f5cb1e02db7013a6f88ac',
                        '76a914cf55018839d8ab8b93de655551357d081f8120c788ac',
                        '76a9147eb48844af0ceae69879fd66456a5afffed24cb788ac',
                        '76a914e94c40d02b7860a76057a48b826ef847372eb74388ac',
                        '76a9148fddf18aecb230772dec7d9fa6ec5c2eae1303bf88ac',
                        '76a914687b26740360cae141c61c9e5dcb03b6100dc42b88ac',
                        '76a914c9fd6f67f21b1970264ba239e82d4a3c40e2063188ac',
                        '76a914cfbdaf0aaed19c7fc5e2a39e77cc780db5e333b588ac',
                        '76a914a17017d5f758fcc1372746bce8509c3d23f218a788ac',
                        '76a914d179b30a22db1d4aa04c163f7c1474fc1fbb5c5588ac',
                        '76a914f3f590529240d25b82fe10c18efbb64a64f9625988ac',
                        '76a9143856ed1d33df771934e14e0446518fa21c8ef6f188ac',
                        '76a914d26a1fac6b5c02e98e839956f3a7547d0c1b5c0088ac',
                        '76a9147cf1203b978724009018c3a5e6a605590f6e9fed88ac',
                        '76a9146e56ad4a85fa5e2d03f3bc16b52cfcab65c5e74188ac',
                        '76a914d17e89b26be59dfdbbd2582afdbf785cc11ad56388ac',
                        '76a914888bdff661832d406351713b49c683776b90e7b088ac',
                        '76a914e58661c82c66669cbaa2d1e813009d0b5d2fafb888ac',
                        '76a91463b5940d2fd7d998b343a54986ca375ff8cd2bbd88ac',
                        '76a91490b66329b172fd43feacbbb461c54183eed1bd5d88ac',
                        '76a9142fd4bdafad85abcb999c4bab8a2901f92caf487988ac',
                        '76a914979d66b56061bc4b7ac2118f54aecbf86ae5773888ac',
                        '76a9144724b6e46690d083ece0390ced609aeb0488486988ac',
                        '76a9142342542a4947b9bfcedffa803b369ec8c108b0b488ac',
                        '76a9140f18bea6bafd89a55997c72703006ec7a83d6e6988ac',
                        '76a914a7bf09e5099224ead64cb27cc9eb38283c3cde4288ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a0446555a0020ab3267b0b667ea2252d414b3714d6f08b5fbf16c0026ce454c903dc6ff002255',
                            0,
                        ],
                        [
                            '76a914d7fc1d156d8ec4384623bb8ceb135df93f2bd93188ac',
                            506531,
                        ],
                        [
                            '76a91447da14cfad47a7971dd345821ac7a81e194e474588ac',
                            1175076,
                        ],
                        [
                            '76a914d6b7baf14352dd9769a9a8bdb1f69cf700766aca88ac',
                            1557619,
                        ],
                        [
                            '76a914bc53fc8620ece064004a7bb72f0613a0045f6ae488ac',
                            1685802,
                        ],
                        [
                            '76a914ea34af00f2585bddc37607af492a7d5b35d431fe88ac',
                            1957993,
                        ],
                        [
                            '76a914dab80f23ec17efe39e3167ac47575f5b102855d288ac',
                            2280297,
                        ],
                        [
                            '76a914f10147fbbff24aa9f4f9a9f3726760a4abad6a9688ac',
                            2804591,
                        ],
                        [
                            '76a9140b8b9344a473853830f3657c7247e4834171d6fd88ac',
                            2810950,
                        ],
                        [
                            '76a914a0737c0938d04eff2d5074513ee5fd3fd41de38488ac',
                            2862208,
                        ],
                        [
                            '76a914b5d94938a3665b01fc0afee6b6179bb2b9e46b2e88ac',
                            2880530,
                        ],
                        [
                            '76a914dbb0e87717a034774a2435db6c9d4791f58bd43f88ac',
                            2894084,
                        ],
                        [
                            '76a9144e3bebebb3ac2785181534094eadccad4ea8dc4688ac',
                            3104218,
                        ],
                        [
                            '76a91458c2d76cd32e1d30d0e62b641d50bdd89200a7f188ac',
                            3122421,
                        ],
                        [
                            '76a9142980d02fa9a25306f3dd195ab9c82a2e2877f67e88ac',
                            3419974,
                        ],
                        [
                            '76a91451331eca38c944f17ee6354a3ee48193c7eb1b6b88ac',
                            3594078,
                        ],
                        [
                            '76a914755b984555fcd6305583c21d996a8dea7faa67d488ac',
                            3794311,
                        ],
                        [
                            '76a914e245bab4243bd6a8f3932c9dab9df496f003eae488ac',
                            4241488,
                        ],
                        [
                            '76a9147901f7c02a7fb7de87c373c143e15e87989f764b88ac',
                            5771042,
                        ],
                        [
                            '76a9149db2a709e1f26df987ecd5a5dcb8db0b36a449ef88ac',
                            5801672,
                        ],
                        [
                            '76a9141c5dd21c29a653e6922c2058852d9f56e483170188ac',
                            6529646,
                        ],
                        [
                            '76a9143510f0c92f8b26e26de575140a084773e95f439a88ac',
                            6536855,
                        ],
                        [
                            '76a914ee542bd41bb07264cf9f6e824e45d3446a26077c88ac',
                            7742026,
                        ],
                        [
                            '76a914c4131be628403d70a62e46dfc13b576af05aa5f088ac',
                            8072753,
                        ],
                        [
                            '76a914f5ffa38db9ffac77b5a1a6c35eebf2415fedf87c88ac',
                            8820534,
                        ],
                        [
                            '76a914b3e42f44a3dff21f72c90555d0ec62b273f0d4a588ac',
                            9000450,
                        ],
                        [
                            '76a91463a7fe1eff49be76e18538f3ed380b7386af1c8f88ac',
                            11771919,
                        ],
                        [
                            '76a91457f118d5f5eecebc88f711a80018bececbeb86e088ac',
                            13144002,
                        ],
                        [
                            '76a9148d2a8ce8e95b3047b918d8bd24db8c3e39d906cc88ac',
                            13393930,
                        ],
                        [
                            '76a914d6a0a87a3a5ea254ed4a2665ac328a7ef769747688ac',
                            13691033,
                        ],
                        [
                            '76a914810c66b72d769d1fefd2c5bb26d20024e25fd35088ac',
                            14490346,
                        ],
                        [
                            '76a914b3f036ee778de53049e0152a140bcba4952081f788ac',
                            15649462,
                        ],
                        [
                            '76a9144dbd06c9f304601d8fe89199ee7afa0afc3e5de688ac',
                            16885611,
                        ],
                        [
                            '76a91435cf783dd7fc1a919c5a92d73feedcab1d3e4dd588ac',
                            17311755,
                        ],
                        [
                            '76a914c570835edbc0de4a525a9ba9501eb0b123b8ab1c88ac',
                            19229444,
                        ],
                        [
                            '76a9142368a5b973c7d48fa8343b71cfb51b5a4ccfcb2488ac',
                            19612475,
                        ],
                        [
                            '76a9149163b5cb6618d7d67562270de630da0d62896c1e88ac',
                            20857697,
                        ],
                        [
                            '76a91464be00bf5c68a60ae520cfa81d051225457572a788ac',
                            21475345,
                        ],
                        [
                            '76a9148bc944201dec7391def49db52202a009c6a81f2088ac',
                            21879959,
                        ],
                        [
                            '76a914af6ae4c996d1ab51dd344b1f491c01163169053588ac',
                            21900743,
                        ],
                        [
                            '76a914c1f421d009c6b36b205721c064c2ae5ea3272a4688ac',
                            22276723,
                        ],
                        [
                            '76a9146454f4696e5bbb5eb4d368c162b35f6fcc861e6b88ac',
                            22828111,
                        ],
                        [
                            '76a9142a8af09882e0b5dd047b03e61eb3630e0678325e88ac',
                            22829710,
                        ],
                        [
                            '76a9147eec957f14c8c35b491f487a8d777cf3b427f47688ac',
                            23106927,
                        ],
                        [
                            '76a9148f41a4d08d01a574210a0d99784248d7b718a6b388ac',
                            25043923,
                        ],
                        [
                            '76a9149fbf277434a5a0582ffe774693c343e95c442a8188ac',
                            25946731,
                        ],
                        [
                            '76a914d35d6706484afdc79bbaab9ce1f84fed4939317f88ac',
                            26216189,
                        ],
                        [
                            '76a914fc64d1ceb75ef723b8bb81f53039f239f69de25d88ac',
                            27153210,
                        ],
                        [
                            '76a9140b395214ae8c35fd7e8bb6921fa478216fd9e41988ac',
                            27888923,
                        ],
                        [
                            '76a9145c9faf662be3667f760e03535c511085a2bc814488ac',
                            28283566,
                        ],
                        [
                            '76a914f883cd4d8e8b6e1cba5d127e24c57b45c26b46a288ac',
                            29688615,
                        ],
                        [
                            '76a9147fe1c85d201af0ab1322d5809aaa03bb7dac05fb88ac',
                            32471718,
                        ],
                        [
                            '76a9141ab1428e336477a213d18207570b5008841d24ea88ac',
                            35209256,
                        ],
                        [
                            '76a914219f01df857ef5faa2c1509b8dc958eb9425f5df88ac',
                            40404442,
                        ],
                        [
                            '76a914a4c2e50019b19c9d152b6327733033253d61efe188ac',
                            48107746,
                        ],
                        [
                            '76a91479be8c6a6fc20a9f4cd1e55d8e99fef936a5b4fb88ac',
                            54611567,
                        ],
                        [
                            '76a914e8f011eded020ed1605848c7b5e6704eb689b33f88ac',
                            54872231,
                        ],
                        [
                            '76a9146573038dc2d55422c20b91588f8264f9aa038d6088ac',
                            56164346,
                        ],
                        [
                            '76a9147077be58e7ead7443259fe5409309edbabef41d388ac',
                            58564003,
                        ],
                        [
                            '76a9149cf6eb2a055f3340d31d83bf5e29cfe0e9d919f288ac',
                            59817398,
                        ],
                        [
                            '76a914d12908c4b7be22044226856207328e20e3e1f2c288ac',
                            64104923,
                        ],
                        [
                            '76a91437a517f6174aed807cb1f9fb26ff25912c8ea4ee88ac',
                            87305777,
                        ],
                        [
                            '76a914b2094f7a6f5c39a66ddff6852bfef1f6dac495fb88ac',
                            91558238,
                        ],
                    ],
                },
                totalSatsSent: 1308715143,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: 'b5782d3a3b55e5ee9e4330a969c2891042ae05fafab7dc05cd14da63e7242f8e',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'unknown',
                    msg: '0x663ddd99990bcd9699...',
                    stackArray: ['663ddd99990bcd969994ec2288a2a86dc532e1a8'],
                    tokenId: false,
                },
                txFee: 260,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9142cc3608fe629c4f402e511878982bc01bde3445d88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            'a9145aafaadba9ff909067a640e5e2a46b756aeaf71387',
                            12966621,
                        ],
                        ['6a14663ddd99990bcd969994ec2288a2a86dc532e1a8', 0],
                    ],
                },
                totalSatsSent: 12966621,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: '9094e1aab7ac73c680bf66e78cc8311831b3d813e608bff1e07b1854855fc0f1',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'unknown',
                    msg: '=:ETH.ETH:0xa9aaF30F65955C69c16B3345B51D426D9B88Ba87:841321:tr:0',
                    stackArray: [
                        '3d3a4554482e4554483a3078613961614633304636353935354336396331364233333435423531443432364439423838426138373a3834313332313a74723a30',
                    ],
                    tokenId: false,
                },
                txFee: 452,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914d95a60cea21479569e6b1ad39416c8fbc97323c588ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '76a914453c8c15aee05fe5a027d4bf5681cd0bc682c0b788ac',
                            8419613,
                        ],
                        [
                            '6a403d3a4554482e4554483a3078613961614633304636353935354336396331364233333435423531443432364439423838426138373a3834313332313a74723a30',
                            0,
                        ],
                    ],
                },
                totalSatsSent: 8419613,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: '7a0d6ae3384e293183478f681f51a77ef4c71f29957199364bb9ba4d8e1938be',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'Airdrop',
                    msg: '',
                    stackArray: [
                        '64726f70',
                        'b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a',
                        '00746162',
                        '5374617920776974682075732c2065436173682041667269636120697320746865206e6578742062696720636f6d6d756e69747920696e20746865204166726963616e2063727970746f7370686572652e20',
                    ],
                    tokenId:
                        'b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a',
                },
                txFee: 2561,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a0464726f7020b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a04007461624c525374617920776974682075732c2065436173682041667269636120697320746865206e6578742062696720636f6d6d756e69747920696e20746865204166726963616e2063727970746f7370686572652e20',
                            0,
                        ],
                        [
                            '76a914957b59a2bfa17ea7fc234e532b263169b6d34aa988ac',
                            264706,
                        ],
                        [
                            '76a9148f882b02e1040f83c2f73007bb334716c38dbffc88ac',
                            529412,
                        ],
                        [
                            '76a914f43ac7271cee240bee3796938203105fb54c045c88ac',
                            529412,
                        ],
                        [
                            '76a914d5a79acda6dbbe14a686a0c59466f52656330a9588ac',
                            264706,
                        ],
                        [
                            '76a91429207c3d229d6163521fbe87e52e64bbe584dbc988ac',
                            529412,
                        ],
                        [
                            '76a914e735901add6ea366a0964ab54ad9d9158597f50c88ac',
                            264706,
                        ],
                        [
                            '76a91407acf15b7cc6a4c18d8d1c3a5611ea30718c2a0d88ac',
                            264706,
                        ],
                        [
                            '76a9146671b4690e282cb79707b1ee696d54a6072329fa88ac',
                            529412,
                        ],
                        [
                            '76a914d4f7e7b420eb1c5410abf698c72d790f0c4cc1b388ac',
                            264706,
                        ],
                        [
                            '76a914b19e12ae2aa186102486e8348f22b87ae426eafd88ac',
                            264706,
                        ],
                        [
                            '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                            529412,
                        ],
                        [
                            '76a914cdba2655ee5abf18a5b6203da5b7d8cc28c36ca888ac',
                            264706,
                        ],
                    ],
                },
                totalSatsSent: 4500002,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: 'd02d94a1a520877c60d1e3026c3e85f8995d48d7b90140f83e24ede592c30306',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'Cashtab Msg',
                    msg: 'I like eCash',
                    stackArray: ['00746162', '49206c696b65206543617368'],
                    tokenId: false,
                },
                txFee: 479,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9147d432e8ccc646fe6c52e36c285bce2b75f0f500b88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        ['6a04007461620c49206c696b65206543617368', 0],
                        [
                            '76a9144fb74b44c66ab529428a943131f236c80d99b82088ac',
                            1000000,
                        ],
                    ],
                },
                totalSatsSent: 1000000,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: 'd8fe456c89357c23ac6d240fe9319ce9ba393c9c3833631046a265ca7c8349e6',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 219,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '76a91430f16ad77116a4b9e7f337743e35271323d63e0d88ac',
                            4200,
                        ],
                    ],
                },
                totalSatsSent: 4200,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: '083b7862bae48e78549ccf63833896f5f4f5bdef5c380a108fa99cdb64261fa3',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 219,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '76a914eeae0fea781c26c93879523ba5a47c244c768ece88ac',
                            4200,
                        ],
                    ],
                },
                totalSatsSent: 4200,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: '45ec66bc2440d2f94fa2c645e20a44f6fab7c397053ce77a95484c6053104cdc',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 2412,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9147276ae7693883fa1165628e298899d8ee9248e7c88ac',
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a503d534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd03401f000000006067010000002f9102000000',
                            0,
                        ],
                        [
                            '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                            546,
                        ],
                        [
                            'a914f71cf8cb91804a2205901cc0972c3f4a088a1aae87',
                            2588,
                        ],
                    ],
                },
                totalSatsSent: 3134,
                tokenSendInfo: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    parsedTokenType: 'ALP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a9147276ae7693883fa1165628e298899d8ee9248e7c88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '168239',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '8000',
                                },
                            ],
                            [
                                'a914f71cf8cb91804a2205901cc0972c3f4a088a1aae87',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '92000',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a9147276ae7693883fa1165628e298899d8ee9248e7c88ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: '1083da7ead4779fbab5c5e8291bb7a37abaf4f97f5ff99ee654759b2eaee445b',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'Cashtab Encrypted',
                    msg: '',
                    stackArray: [
                        '65746162',
                        '036bdec11e461033145b5d96661e45ba2a40081aad01d34c4da4dac5e42b9961c990fc603ad5c6fed77fff016d57caa7ba8cbcebb33bd47e5eb0707628c0331e4d714054ab773ae4a555c9ea432af23a83104209e5299e86081f5fabe4a744e96eac6675149ce4e7680e342270498d0e68',
                    ],
                    tokenId: false,
                },
                txFee: 1277,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04657461624c71036bdec11e461033145b5d96661e45ba2a40081aad01d34c4da4dac5e42b9961c990fc603ad5c6fed77fff016d57caa7ba8cbcebb33bd47e5eb0707628c0331e4d714054ab773ae4a555c9ea432af23a83104209e5299e86081f5fabe4a744e96eac6675149ce4e7680e342270498d0e68',
                            0,
                        ],
                        [
                            '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                            2000,
                        ],
                    ],
                },
                totalSatsSent: 2000,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: '22135bb69435023a84c80b1b93b31fc8898c3507eaa70569ed038f32d59599a9',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'Alias (beta)',
                    msg: 'doge2',
                    stackArray: [
                        '2e786563',
                        '00',
                        '646f676532',
                        '000b7d35fda03544a08e65464d54cfae4257eb6db7',
                    ],
                    tokenId: false,
                },
                txFee: 752,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a042e7865630005646f67653215000b7d35fda03544a08e65464d54cfae4257eb6db7',
                            0,
                        ],
                        ['a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087', 554],
                    ],
                },
                totalSatsSent: 554,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: '004e018dd98520aa722ee76c608771dd578a044f38103a8298f25e6ffbc7c3ba',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 481,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000271008000000000589ffd0',
                            0,
                        ],
                        [
                            '76a914dcc535261a43835ca12352d0926ba06cf07cbe8388ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    parsedTokenType: 'SLP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '92930000',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a914dcc535261a43835ca12352d0926ba06cf07cbe8388ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '10000',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: '0110cd886ecd2d9570e98b7501cd039f4e5352d69659a46f1a49cc19c1869701',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 481,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710080000000005856bf0',
                            0,
                        ],
                        [
                            '76a91469724b96df46096cc95b1a6d408a4240ea80d85588ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    parsedTokenType: 'SLP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '92630000',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a91469724b96df46096cc95b1a6d408a4240ea80d85588ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '10000',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: '327101f6f3b740280a6e9fbd8edc41f4f0500633672975a5974a4147c94016a5',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 481,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710080000000005843370',
                            0,
                        ],
                        [
                            '76a91458cddba2449285814dae43d4ed4a1c9998f3693e88ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    parsedTokenType: 'SLP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '92550000',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a91458cddba2449285814dae43d4ed4a1c9998f3693e88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '10000',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: 'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 481,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710080000000000986f70',
                            0,
                        ],
                        [
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    parsedTokenType: 'SLP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '9990000',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '10000',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: '6ffcc83e76226bd32821cc6862ce9b363b22594247a4e73ccf3701b0023592b2',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 1137,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e442098183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f4808000000000000003708000000003b9a72a4',
                            0,
                        ],
                        [
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    parsedTokenType: 'SLP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '999977636',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '55',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: 'fb70df00c07749082756054522d3f08691fd9caccd0e0abf736df23d22845a6e',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 1137,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e44207443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d0800000000068c953f08001299507b7b143a',
                            0,
                        ],
                        [
                            '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: {
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                    parsedTokenType: 'SLP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '5235120528888890',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '109876543',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: '25345b0bf921a2a9080c647768ba440bbe84499f4c7773fba8a1b03e88ae7fe7',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 1137,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e4420fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa08000000001dcd65000800000007e7339728',
                            0,
                        ],
                        [
                            '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: {
                    tokenId:
                        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                    parsedTokenType: 'SLP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '33943689000',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '500000000',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: '413b57617d2c497b137d31c53151fee595415ec273ef7a111160da8093147ed8',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 454,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: ['a914ea826cc1a3a981d048cd78b66711222bece8ebf287'],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a5032534c503200044d494e5445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd0160ae0a00000000',
                            0,
                        ],
                        [
                            '76a91472a92e48c5ab72566959db1dbf1b8dce83afabb788ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: 'b2c9c056339d41ec59341541dda8bd6e570730beba485e14eb54d0a073700c22',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 1000,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914378c3b416e77e01198c01ad215b8afd0bb72799488ac',
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a5031534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd01d00700000000',
                            0,
                        ],
                        [
                            '76a914acdbf937b086ddaa970072a610daa8d10f14549a88ac',
                            546,
                        ],
                    ],
                },
                totalSatsSent: 546,
                tokenSendInfo: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    parsedTokenType: 'ALP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a914acdbf937b086ddaa970072a610daa8d10f14549a88ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '2000',
                                },
                            ],
                        ],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a914378c3b416e77e01198c01ad215b8afd0bb72799488ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f',
                genesisInfo: {
                    tokenId:
                        '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f',
                },
                opReturnInfo: false,
                txFee: 455,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914104e67d912a7aab2a159bba141477e5867c04bfd88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010747454e45534953054c6f6c6c79054c4f4c4c591468747470733a2f2f636173687461622e636f6d2f4c0001084c00080162ea854d0fc000',
                            0,
                        ],
                    ],
                },
                totalSatsSent: 0,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: '0167e881fcb359cdfc82af5fc6c0821daf55f40767694eea2f23c0d42a9b1c17',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 1638,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50800000000002737100800000000000f3636',
                            0,
                        ],
                    ],
                },
                totalSatsSent: 0,
                tokenSendInfo: {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    parsedTokenType: 'SLP',
                    txType: 'SEND',
                    tokenChangeOutputs: {
                        dataType: 'Map',
                        value: [
                            [
                                '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                                {
                                    dataType: 'BigNumberReplacer',
                                    value: '3566918',
                                },
                            ],
                        ],
                    },
                    tokenReceivingOutputs: {
                        dataType: 'Map',
                        value: [],
                    },
                    tokenSendingOutputScripts: {
                        dataType: 'Set',
                        value: [
                            '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                        ],
                    },
                },
                tokenBurnInfo: false,
            },
            {
                txid: '6b139007a0649f99a1a099c7c924716ee1920f74ea83111f6426854d4c3c3c79',
                genesisInfo: false,
                opReturnInfo: false,
                txFee: 1137,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9144bb6f659b8dafd99527e0c0a3289f121b0a0209f88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04534c500001010453454e4420fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa08000000000c380cdc',
                            0,
                        ],
                    ],
                },
                totalSatsSent: 0,
                tokenSendInfo: false,
                tokenBurnInfo: {
                    tokenId:
                        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                    undecimalizedTokenBurnAmount: '100',
                },
            },
            {
                txid: 'ad44bf5e214ab71bb60a2eee165f368c139cd49c2380c3352f0a4fffc746b36a',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'SWaP',
                    msg: '',
                    stackArray: [
                        '53575000',
                        '01',
                        '01',
                        'aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c',
                        '53454c4c',
                        '3135393838333534',
                        '00',
                        '3dd9beaedcbb3ad90eec2214fcf71381fa89b08b899813e182a7a393e1ab0619',
                        '01',
                        '00',
                        '333236322e39393939393939393939393935',
                    ],
                    tokenId:
                        'aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c',
                },
                txFee: 466,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a914aed3f8a5add35a9ddaf0a07986c2b73a2202727d88ac',
                        '76a914d50ec518d64850fda86e926764ce1bce1ba01a1988ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a04535750000101010120aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c0453454c4c0831353938383335340100203dd9beaedcbb3ad90eec2214fcf71381fa89b08b899813e182a7a393e1ab06190101010012333236322e39393939393939393939393935',
                            0,
                        ],
                    ],
                },
                totalSatsSent: 0,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
            {
                txid: 'a8c348539a1470b28b9f99693994b918b475634352994dddce80ad544e871b3a',
                genesisInfo: false,
                opReturnInfo: {
                    app: 'memo',
                    msg: 'Reply to memo|<a href="https://explorer.e.cash/tx/eae5710aba50a0a22b266ddbb445e05b7348d15c88cbc2e012a91a09bec3861a">memo</a>|Twitter keeps turning their API on and off. Sometimes it works, sometimes it doesn\'t. Feature to create tweets from memo may work again at some point.',
                },
                txFee: 390,
                xecSendingOutputScripts: {
                    dataType: 'Set',
                    value: [
                        '76a9148fa951904f6d0ebbc92dc29e761b9eb0a837545c88ac',
                    ],
                },
                xecReceivingOutputs: {
                    dataType: 'Map',
                    value: [
                        [
                            '6a026d0320eae5710aba50a0a22b266ddbb445e05b7348d15c88cbc2e012a91a09bec3861a4c9654776974746572206b65657073207475726e696e6720746865697220415049206f6e20616e64206f66662e20536f6d6574696d657320697420776f726b732c20736f6d6574696d657320697420646f65736e27742e204665617475726520746f20637265617465207477656574732066726f6d206d656d6f206d617920776f726b20616761696e20617420736f6d6520706f696e742e',
                            0,
                        ],
                    ],
                },
                totalSatsSent: 0,
                tokenSendInfo: false,
                tokenBurnInfo: false,
            },
        ],
        tokenIds: {
            dataType: 'Set',
            value: [
                'b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a',
                'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f',
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                'aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c',
            ],
        },
        outputScripts: {
            dataType: 'Set',
            value: [
                '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                '76a9147c09e7cf1b2c40d4e08057e47bda9cabcdfd208588ac',
                '76a914a520c86a08366941cd90d22e11ac1c7eefa2db3788ac',
                '76a91412934a7a99b69a60c3b99f991cd79d257104f5a688ac',
                '76a914d7fc1d156d8ec4384623bb8ceb135df93f2bd93188ac',
                '76a9142cc3608fe629c4f402e511878982bc01bde3445d88ac',
                'a9145aafaadba9ff909067a640e5e2a46b756aeaf71387',
                '76a914d95a60cea21479569e6b1ad39416c8fbc97323c588ac',
                '76a914453c8c15aee05fe5a027d4bf5681cd0bc682c0b788ac',
                '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                '76a914957b59a2bfa17ea7fc234e532b263169b6d34aa988ac',
                '76a9147d432e8ccc646fe6c52e36c285bce2b75f0f500b88ac',
                '76a9144fb74b44c66ab529428a943131f236c80d99b82088ac',
                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                '76a91430f16ad77116a4b9e7f337743e35271323d63e0d88ac',
                '76a914eeae0fea781c26c93879523ba5a47c244c768ece88ac',
                '76a9147276ae7693883fa1165628e298899d8ee9248e7c88ac',
                '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                '76a914dcc535261a43835ca12352d0926ba06cf07cbe8388ac',
                '76a91469724b96df46096cc95b1a6d408a4240ea80d85588ac',
                '76a91458cddba2449285814dae43d4ed4a1c9998f3693e88ac',
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                'a914ea826cc1a3a981d048cd78b66711222bece8ebf287',
                '76a91472a92e48c5ab72566959db1dbf1b8dce83afabb788ac',
                '76a914378c3b416e77e01198c01ad215b8afd0bb72799488ac',
                '76a914acdbf937b086ddaa970072a610daa8d10f14549a88ac',
                '76a914104e67d912a7aab2a159bba141477e5867c04bfd88ac',
                '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                '76a9144bb6f659b8dafd99527e0c0a3289f121b0a0209f88ac',
                '76a914aed3f8a5add35a9ddaf0a07986c2b73a2202727d88ac',
                '76a9148fa951904f6d0ebbc92dc29e761b9eb0a837545c88ac',
            ],
        },
    },
    coingeckoResponse: {
        bitcoin: {
            usd: 30000,
        },
        ecash: {
            usd: 0.0001,
        },
        ethereum: {
            usd: 2000,
        },
    },
    coingeckoPrices: [
        {
            fiat: 'usd',
            price: 0.0001,
            ticker: 'XEC',
        },
        {
            fiat: 'usd',
            price: 30000,
            ticker: 'BTC',
        },
        {
            fiat: 'usd',
            price: 2000,
            ticker: 'ETH',
        },
    ],
    tokenInfoMap: {
        dataType: 'Map',
        value: [
            [
                'b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a',
                {
                    tokenTicker: 'eAfrica',
                    tokenName: 'eAfrica Token',
                    url: 'https://chat.whatsapp.com/BJDUldMxnNm23KAFRE4diq',
                    decimals: 2,
                    hash: '',
                },
            ],
            [
                'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                {
                    tokenTicker: 'CRD',
                    tokenName: 'Credo In Unum Deo',
                    url: 'https://crd.network/token',
                    decimals: 4,
                    data: {},
                    authPubkey:
                        '0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10',
                },
            ],
            [
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                {
                    tokenTicker: 'CACHET',
                    tokenName: 'Cachet',
                    url: 'https://cashtab.com/',
                    decimals: 2,
                    hash: '',
                },
            ],
            [
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                {
                    tokenTicker: 'DVV',
                    tokenName: 'Delta Variant Variants',
                    url: 'https://cashtabapp.com/',
                    decimals: 0,
                    hash: '',
                },
            ],
            [
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                {
                    tokenTicker: 'WDT',
                    tokenName:
                        'Test Token With Exceptionally Long Name For CSS And Style Revisions',
                    url: 'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
                    decimals: 7,
                    hash: '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
                },
            ],
            [
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                {
                    tokenTicker: 'GRP',
                    tokenName: 'GRUMPY',
                    url: 'https://bit.ly/GrumpyDoc',
                    decimals: 2,
                    hash: '',
                },
            ],
            [
                '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f',
                {
                    tokenTicker: 'Lolly',
                    tokenName: 'LOLLY',
                    url: 'https://cashtab.com/',
                    decimals: 8,
                    hash: '',
                },
            ],
            [
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                {
                    tokenTicker: 'BUX',
                    tokenName: 'Badger Universal Token',
                    url: 'https://bux.digital',
                    decimals: 4,
                    hash: '',
                },
            ],
            [
                'aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c',
                {
                    tokenTicker: 'GORB',
                    tokenName: 'Gorbeious',
                    url: 'gorbeious.cash',
                    decimals: 0,
                    hash: '',
                },
            ],
        ],
    },
    outputScriptInfoMap: {
        dataType: 'Map',
        value: [
            [
                '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
                {
                    emoji: '🐳',
                    balanceSats: '01000000000000',
                    utxos: [
                        {
                            value: '1000000000000',
                        },
                    ],
                },
            ],
            [
                '76a9147c09e7cf1b2c40d4e08057e47bda9cabcdfd208588ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914a520c86a08366941cd90d22e11ac1c7eefa2db3788ac',
                {
                    emoji: '🦀',
                    balanceSats: '010000000000',
                    utxos: [
                        {
                            value: '10000000000',
                        },
                    ],
                },
            ],
            [
                '76a91412934a7a99b69a60c3b99f991cd79d257104f5a688ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914d7fc1d156d8ec4384623bb8ceb135df93f2bd93188ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9142cc3608fe629c4f402e511878982bc01bde3445d88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                'a9145aafaadba9ff909067a640e5e2a46b756aeaf71387',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914d95a60cea21479569e6b1ad39416c8fbc97323c588ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914453c8c15aee05fe5a027d4bf5681cd0bc682c0b788ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914957b59a2bfa17ea7fc234e532b263169b6d34aa988ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9147d432e8ccc646fe6c52e36c285bce2b75f0f500b88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9144fb74b44c66ab529428a943131f236c80d99b82088ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a91430f16ad77116a4b9e7f337743e35271323d63e0d88ac',
                {
                    emoji: '',
                    balanceSats: 10000,
                    utxos: [
                        {
                            value: 10000,
                        },
                    ],
                },
            ],
            [
                '76a914eeae0fea781c26c93879523ba5a47c244c768ece88ac',
                {
                    emoji: '',
                    balanceSats: 10000,
                    utxos: [
                        {
                            value: 10000,
                        },
                    ],
                },
            ],
            [
                '76a9147276ae7693883fa1165628e298899d8ee9248e7c88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914dcc535261a43835ca12352d0926ba06cf07cbe8388ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a91469724b96df46096cc95b1a6d408a4240ea80d85588ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a91458cddba2449285814dae43d4ed4a1c9998f3693e88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                'a914ea826cc1a3a981d048cd78b66711222bece8ebf287',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a91472a92e48c5ab72566959db1dbf1b8dce83afabb788ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914378c3b416e77e01198c01ad215b8afd0bb72799488ac',
                {
                    emoji: '',
                    balanceSats: 10000,
                    utxos: [
                        {
                            value: 10000,
                        },
                    ],
                },
            ],
            [
                '76a914acdbf937b086ddaa970072a610daa8d10f14549a88ac',
                {
                    emoji: '',
                    balanceSats: 10000,
                    utxos: [
                        {
                            value: 10000,
                        },
                    ],
                },
            ],
            [
                '76a914104e67d912a7aab2a159bba141477e5867c04bfd88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9146d69b5cbe7c85d87628473c43620c0daa9a8102988ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9144bb6f659b8dafd99527e0c0a3289f121b0a0209f88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a914aed3f8a5add35a9ddaf0a07986c2b73a2202727d88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
            [
                '76a9148fa951904f6d0ebbc92dc29e761b9eb0a837545c88ac',
                {
                    emoji: '',
                    balanceSats: '010000',
                    utxos: [
                        {
                            value: '10000',
                        },
                    ],
                },
            ],
        ],
    },
    blockSummaryTgMsgs: [
        '📦<a href="https://explorer.e.cash/block/0000000000000000000000000000000000000000000000000000000000000000">819346</a> | 27 txs | unknown, ...863u\n⏰ 20,654 blocks until eCash halving\n💰$63 to <a href="https://explorer.e.cash/address/ecash:qrpkjsd0fjxd7m332mmlu9px6pwkzaufpcn2u7jcwt">qrp...cwt</a>\n1 XEC = $0.0001\n1 BTC = $30,000\n1 ETH = $2,000\n\n<b>1 new eToken created</b>\n🧪<a href="https://explorer.e.cash/tx/010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f">LOLLY</a> (Lolly) <a href="undefined">[doc]</a>\n\n<a href="https://cashtab.com/">Cashtab</a>\n<b>3</b> <a href="https://explorer.e.cash/tx/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">CACHET</a> rewards\n<b>2</b> new users received <b>84 XEC</b>\n\n2 txs sent 10.2000 <a href="https://explorer.e.cash/tx/cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145">Credo In Unum Deo (CRD)</a>\n1 tx sent 100.00 <a href="https://explorer.e.cash/tx/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">Cachet (CACHET)</a>\n1 tx sent 55 <a href="https://explorer.e.cash/tx/98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48">Delta Variant Variants (DVV)</a>\n1 tx sent 10.9876543 <a href="https://explorer.e.cash/tx/7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d">Test Token With Exceptionally Long Name For CSS And Style Revisions (WDT)</a>\n1 tx sent 5,000,000.00 <a href="https://explorer.e.cash/tx/fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa">GRUMPY (GRP)</a>\n1 tx sent 356.6918 <a href="https://explorer.e.cash/tx/7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5">Badger Universal Token (BUX)</a>\n\n<b>1 eToken burn tx</b>\n🔥qp9...et0 <a href="https://explorer.e.cash/tx/6b139007a0649f99a1a099c7c924716ee1920f74ea83111f6426854d4c3c3c79">burned</a> 1.00 <a href="https://explorer.e.cash/tx/fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa">GRP</a> \n\n<b>9 app txs</b>\n⚛️<a href="https://explorer.e.cash/tx/d5be7a4b483f9fdbbe3bf46cfafdd0100d5dbeee0b972f4dabc8ae9d9962fa55">CashFusion:</a> Fused $1k from 64 inputs into 63 outputs\n❓<a href="https://explorer.e.cash/tx/b5782d3a3b55e5ee9e4330a969c2891042ae05fafab7dc05cd14da63e7242f8e">unknown:</a> 0x663ddd99990bcd9699...\n❓<a href="https://explorer.e.cash/tx/9094e1aab7ac73c680bf66e78cc8311831b3d813e608bff1e07b1854855fc0f1">unknown:</a> =:ETH.ETH:0xa9aaF30F65955C69c16B3345B51D426D9B88Ba87:841321:tr:0\n🪂<a href="https://explorer.e.cash/tx/7a0d6ae3384e293183478f681f51a77ef4c71f29957199364bb9ba4d8e1938be">Airdrop:</a> qru...jys airdropped $5 to 13 holders of <a href="https://explorer.e.cash/tx/b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a">eAfrica</a>|Stay with us, eCash Africa is the next big community in the African cryptosphere. \n🖋<a href="https://explorer.e.cash/tx/d02d94a1a520877c60d1e3026c3e85f8995d48d7b90140f83e24ede592c30306">Cashtab Msg, $1 for $0.0005:</a> I like eCash\n🔏<a href="https://explorer.e.cash/tx/1083da7ead4779fbab5c5e8291bb7a37abaf4f97f5ff99ee654759b2eaee445b">Cashtab Encrypted:</a> qq9...fgx sent an encrypted message and $0.002 to qzv...fed\n👾<a href="https://explorer.e.cash/tx/22135bb69435023a84c80b1b93b31fc8898c3507eaa70569ed038f32d59599a9">Alias (beta):</a> doge2\n🤳<a href="https://explorer.e.cash/tx/ad44bf5e214ab71bb60a2eee165f368c139cd49c2380c3352f0a4fffc746b36a">SWaP:</a> Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c">GORB</a>|SELL for 159,883.54 XEC|Min trade: 0 XEC\n🗞<a href="https://explorer.e.cash/tx/a8c348539a1470b28b9f99693994b918b475634352994dddce80ad544e871b3a">memo:</a> Reply to memo|<a href="https://explorer.e.cash/tx/eae5710aba50a0a22b266ddbb445e05b7348d15c88cbc2e012a91a09bec3861a">memo</a>|Twitter keeps turning their API on and off. Sometimes it works, sometimes it doesn\'t. Feature to create tweets from memo may work again at some point.\n\n<b>3 eCash txs</b>',
        '💸<a href="https://explorer.e.cash/tx/4f33c81d95641eb0f80e793dc96c58a2438f9bb1f18750d8fb3b56c28cd25035">$584k for $0.0003</a> 🐳 Binance ➡️ itself\n💸<a href="https://explorer.e.cash/tx/f5d4c112cfd22701226ba050cacfacc3aff570964c6196f67e326fc3224300a2">$107k for $0.003</a> qp7...sr4 ➡️ 🦀qzj...ksg\n💸<a href="https://explorer.e.cash/tx/413b57617d2c497b137d31c53151fee595415ec273ef7a111160da8093147ed8">$0.0005 for $0.0005</a>',
    ],
    blockSummaryTgMsgsApiFailure: [
        '📦<a href="https://explorer.e.cash/block/0000000000000000000000000000000000000000000000000000000000000000">819346</a> | 27 txs | unknown, ...863u\n⏰ 20,654 blocks until eCash halving\n💰625k XEC to <a href="https://explorer.e.cash/address/ecash:qrpkjsd0fjxd7m332mmlu9px6pwkzaufpcn2u7jcwt">qrp...cwt</a>\n\n<b>9 app txs</b>\n⚛️<a href="https://explorer.e.cash/tx/d5be7a4b483f9fdbbe3bf46cfafdd0100d5dbeee0b972f4dabc8ae9d9962fa55">CashFusion:</a> Fused 13M XEC from 64 inputs into 63 outputs\n❓<a href="https://explorer.e.cash/tx/b5782d3a3b55e5ee9e4330a969c2891042ae05fafab7dc05cd14da63e7242f8e">unknown:</a> 0x663ddd99990bcd9699...\n❓<a href="https://explorer.e.cash/tx/9094e1aab7ac73c680bf66e78cc8311831b3d813e608bff1e07b1854855fc0f1">unknown:</a> =:ETH.ETH:0xa9aaF30F65955C69c16B3345B51D426D9B88Ba87:841321:tr:0\n🪂<a href="https://explorer.e.cash/tx/7a0d6ae3384e293183478f681f51a77ef4c71f29957199364bb9ba4d8e1938be">Airdrop:</a> qru...jys airdropped 45k XEC to 13 holders of <a href="https://explorer.e.cash/tx/b76878b29eff39c8c28aaed7d18a166c20057c43beeb90b630264470983c984a">b76...84a</a>|Stay with us, eCash Africa is the next big community in the African cryptosphere. \n🖋<a href="https://explorer.e.cash/tx/d02d94a1a520877c60d1e3026c3e85f8995d48d7b90140f83e24ede592c30306">Cashtab Msg, 10k XEC for 4.79 XEC:</a> I like eCash\n🔏<a href="https://explorer.e.cash/tx/1083da7ead4779fbab5c5e8291bb7a37abaf4f97f5ff99ee654759b2eaee445b">Cashtab Encrypted:</a> qq9...fgx sent an encrypted message and 20 XEC to qzv...fed\n👾<a href="https://explorer.e.cash/tx/22135bb69435023a84c80b1b93b31fc8898c3507eaa70569ed038f32d59599a9">Alias (beta):</a> doge2\n🤳<a href="https://explorer.e.cash/tx/ad44bf5e214ab71bb60a2eee165f368c139cd49c2380c3352f0a4fffc746b36a">SWaP:</a> Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c">Unknown Token</a>|SELL for 159,883.54 XEC|Min trade: 0 XEC\n🗞<a href="https://explorer.e.cash/tx/a8c348539a1470b28b9f99693994b918b475634352994dddce80ad544e871b3a">memo:</a> Reply to memo|<a href="https://explorer.e.cash/tx/eae5710aba50a0a22b266ddbb445e05b7348d15c88cbc2e012a91a09bec3861a">memo</a>|Twitter keeps turning their API on and off. Sometimes it works, sometimes it doesn\'t. Feature to create tweets from memo may work again at some point.\n\n<b>17 eCash txs</b>\n💸<a href="https://explorer.e.cash/tx/4f33c81d95641eb0f80e793dc96c58a2438f9bb1f18750d8fb3b56c28cd25035">6B XEC for 2.6 XEC</a>\n💸<a href="https://explorer.e.cash/tx/f5d4c112cfd22701226ba050cacfacc3aff570964c6196f67e326fc3224300a2">1B XEC for 29 XEC</a>\n💸<a href="https://explorer.e.cash/tx/d8fe456c89357c23ac6d240fe9319ce9ba393c9c3833631046a265ca7c8349e6">42 XEC for 2.19 XEC</a>\n💸<a href="https://explorer.e.cash/tx/083b7862bae48e78549ccf63833896f5f4f5bdef5c380a108fa99cdb64261fa3">42 XEC for 2.19 XEC</a>\n💸<a href="https://explorer.e.cash/tx/45ec66bc2440d2f94fa2c645e20a44f6fab7c397053ce77a95484c6053104cdc">31 XEC for 24 XEC</a>\n💸<a href="https://explorer.e.cash/tx/004e018dd98520aa722ee76c608771dd578a044f38103a8298f25e6ffbc7c3ba">5.46 XEC for 4.81 XEC</a>\n💸<a href="https://explorer.e.cash/tx/0110cd886ecd2d9570e98b7501cd039f4e5352d69659a46f1a49cc19c1869701">5.46 XEC for 4.81 XEC</a>\n💸<a href="https://explorer.e.cash/tx/327101f6f3b740280a6e9fbd8edc41f4f0500633672975a5974a4147c94016a5">5.46 XEC for 4.81 XEC</a>\n💸<a href="https://explorer.e.cash/tx/aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517">5.46 XEC for 4.81 XEC</a>\n💸<a href="https://explorer.e.cash/tx/6ffcc83e76226bd32821cc6862ce9b363b22594247a4e73ccf3701b0023592b2">5.46 XEC for 11 XEC</a>\n💸<a href="https://explorer.e.cash/tx/fb70df00c07749082756054522d3f08691fd9caccd0e0abf736df23d22845a6e">5.46 XEC for 11 XEC</a>\n💸<a href="https://explorer.e.cash/tx/25345b0bf921a2a9080c647768ba440bbe84499f4c7773fba8a1b03e88ae7fe7">5.46 XEC for 11 XEC</a>\n...and <a href="https://explorer.e.cash/block/0000000000000000000000000000000000000000000000000000000000000000">5 more</a>',
    ],
};
