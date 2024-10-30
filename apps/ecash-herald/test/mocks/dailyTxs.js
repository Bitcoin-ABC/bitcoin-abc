// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

/**
 * Instead of mocking 144 blocks of txs, we create an array
 * including all tx types covered in the summary
 *
 * This is NOT a generated file
 * However it does not really need to be reviewed
 * Txs to be tested are fetched from chronik.tx and manually added here
 */
const dailyTxs = [
    // Coinbase tx 1, miner solopool and staker 0cd
    // d86e57cc7caacd61ffa742b13ca4d51177d3e4c8dd619124af79dedf0ac51ea1
    {
        txid: 'd86e57cc7caacd61ffa742b13ca4d51177d3e4c8dd619124af79dedf0ac51ea1',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '0000000000000000000000000000000000000000000000000000000000000000',
                    outIdx: 4294967295,
                },
                inputScript:
                    '0372390d04d8440e6708bd41863a64000000736f6c6f706f6f6c2e6f7267',
                value: 0,
                sequenceNo: 0,
            },
        ],
        outputs: [
            {
                value: 181272025,
                outputScript:
                    '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
            },
            {
                value: 100012151,
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
            },
            {
                value: 31253797,
                outputScript:
                    '76a914197eaf9b9f4b4f038f967c76cf050e3d8f5f872e88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 181,
        isCoinbase: true,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 866674,
            hash: '00000000000000000d628341dc623fd7f11136558594ec9a39c271c0ac4922e8',
            timestamp: 1728988376,
        },
    },
    // Coinbase tx 2, ViaBTC and staker gyg
    // 4e70941e1500315302e2262eb86ac11db879eae5f3ff1964a939bdbf9947cfe9
    {
        txid: '4e70941e1500315302e2262eb86ac11db879eae5f3ff1964a939bdbf9947cfe9',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '0000000000000000000000000000000000000000000000000000000000000000',
                    outIdx: 4294967295,
                },
                inputScript:
                    '0370390d192f5669614254432f4d696e6564206279206d6f6f72646f632f1003e0a10ffd4bebde9cbcad5d8cb90200',
                value: 0,
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                value: 181291465,
                outputScript:
                    '76a914f1c075a01882ae0972f95d3a4177c86c852b7d9188ac',
            },
            {
                value: 100022876,
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
            },
            {
                value: 31257149,
                outputScript:
                    '76a914eaac1f0faac136c3091b67f78c4bc8d0f037b94188ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 198,
        isCoinbase: true,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 866672,
            hash: '00000000000000000f43f2da867ec399fe7c2ff3c7406c1f1a16f2d726771009',
            timestamp: 1728985449,
        },
    },
    // Coinbase tx 3, Mining-Dutch and staker 2nu
    // defa7547931ac9226e387b9fa803e12b632109bec77552d4994def3879fd0297
    {
        txid: 'defa7547931ac9226e387b9fa803e12b632109bec77552d4994def3879fd0297',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '0000000000000000000000000000000000000000000000000000000000000000',
                    outIdx: 4294967295,
                },
                inputScript:
                    '0367390d04f0150e6708fabe6d6d25608bc631bda8933fe554bb7a50befe9e4139bda920ac0ee937769cec2ffde7000100000000000001b65911900403003201112f4d696e696e672d44757463682f2d3335',
                value: 0,
                sequenceNo: 0,
            },
        ],
        outputs: [
            {
                value: 181255884,
                outputScript:
                    '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
            },
            {
                value: 100003246,
                outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
            },
            {
                value: 31251014,
                outputScript:
                    '76a914a07b8141956fca49e54b474e5efd894fabab6bbb88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 233,
        isCoinbase: true,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 866663,
            hash: '00000000000000001ee721175cdcd42f3bcd5f87589757a56ff8c61af8c9442a',
            timestamp: 1728976362,
        },
    },
    // Cashtab XEC reward
    // cc385ebf5863ca757b441df009d01d773f3d1031d3b3d7af92a7662fbe6b71f6
    {
        txid: 'cc385ebf5863ca757b441df009d01d773f3d1031d3b3d7af92a7662fbe6b71f6',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '2b8415239c61e9a2c7c90612ed94b5833f661f1ad44a5ae875f6896575b00c98',
                    outIdx: 1,
                },
                inputScript:
                    '41c61f3e6506b6e66be785e1bd91c934252f36ef1345dbeaeeed82cbbc95279ad570c0aa68646e9908e559ebc5306ad323c8fcdd17286564a92f5f03656c32a7a041210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                value: 94297394,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
            },
        ],
        outputs: [
            {
                value: 4200,
                outputScript:
                    '76a914e54253a422ad52174e6ad25762c318a2aaa921db88ac',
            },
            {
                value: 94292975,
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                spentBy: {
                    txid: 'd1ae00e81ca781765bf09f12fc8aefbd6a2d950781be04558ad6a1f92b1e0d26',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1728987043,
        size: 219,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 866674,
            hash: '00000000000000000d628341dc623fd7f11136558594ec9a39c271c0ac4922e8',
            timestamp: 1728988376,
        },
    },
    // Cashtab CACHET reward
    // d391c3ce3e562195fced70b2e75be699e9ea85fcdb742986e5d588f8558670e9
    {
        txid: 'd391c3ce3e562195fced70b2e75be699e9ea85fcdb742986e5d588f8558670e9',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd1ae00e81ca781765bf09f12fc8aefbd6a2d950781be04558ad6a1f92b1e0d26',
                    outIdx: 2,
                },
                inputScript:
                    '416492cfb9939f8d08ce8063069242682bfc62832f5a30a8f9cf427a9d1618ca0c72d53a803667e7fc8de07c393d40a58146b34bc0f0a09f36da5cfa32c45456df41210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
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
                    amount: '454260000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
            },
            {
                prevOut: {
                    txid: 'd1ae00e81ca781765bf09f12fc8aefbd6a2d950781be04558ad6a1f92b1e0d26',
                    outIdx: 3,
                },
                inputScript:
                    '41128001cde47289dda3455e0c28b85bfd18775ff44b6effee197f7f4c09b9418d1cab4719dc4e3ace8c28a79e3ced43b82b7d8088f949ad1d69f0228048f3046141210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                value: 94291962,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000271008000000001b134e10',
            },
            {
                value: 546,
                outputScript:
                    '76a914e54253a422ad52174e6ad25762c318a2aaa921db88ac',
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
                    amount: '454250000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '34039dcccf1366aa9b40265f6c22268a567fafe6812cf3f436cc079a24a85e95',
                    outIdx: 0,
                },
            },
            {
                value: 94290949,
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                spentBy: {
                    txid: '34039dcccf1366aa9b40265f6c22268a567fafe6812cf3f436cc079a24a85e95',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1728987164,
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 866674,
            hash: '00000000000000000d628341dc623fd7f11136558594ec9a39c271c0ac4922e8',
            timestamp: 1728988376,
        },
    },
    // Agora txs
    // SLP1 partial list
    // 20469a4316506e0fea99ad0673d6663f2f546c0aad84b741e08c4d0f9248b18c
    {
        txid: '20469a4316506e0fea99ad0673d6663f2f546c0aad84b741e08c4d0f9248b18c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'd84e49d7396553f8931e7ecebf1717ced0ba962d3f4be7ce672d418a9f3a107d',
                    outIdx: 1,
                },
                inputScript:
                    '0441475230075041525449414c4180f1bfdb06735c27ffe75627fa1fecd46844334f6686dd5e64b01d4e68de28d98b6ed87ac5bf86ce27af78b06944beae25e2f0084433d563d6bd19c6616a5a62414c8c4c766a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f89608000000000000000000013b62100000000000298f0000000000006de4ff1700000000f3282c4e03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba601557f77ad075041525449414c88044147523087',
                value: 914,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '2000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript: 'a9142ee1060eafaafbad92d2d5420120d40c0394a84e87',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f8960800000000000007d0',
            },
            {
                value: 546,
                outputScript: 'a914563178ea073228709397a2c98baf10677e683e6687',
                token: {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '2000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729929435,
        size: 368,
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 868211,
            hash: '0000000000000000297b2e66c61c87a7b77c9f49c1033e0db146272ea150d2cc',
            timestamp: 1729931891,
        },
    },
    // SLP1 partial buy
    // f4b2bd7fc77975103223f41f588751eedf16cfb4ee8dd44ebcb44191fd0d2eff
    {
        txid: 'f4b2bd7fc77975103223f41f588751eedf16cfb4ee8dd44ebcb44191fd0d2eff',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '4822a0ccc510ddb0ce3ba423e3de49c12993a607c4c108345be9f6eef84767f5',
                    outIdx: 2,
                },
                inputScript:
                    '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1407996448a8c0b89e341453ba9726eb40a2e8c07401808b82dc3623a2ab2c353c9115cbdbcd738b01d01a718c9c10336823231f7f16cdcc3ac43001c4c0c11e3764422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac89680000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac4d2c01f56747f8eef6e95b3408c1c407a69329c149dee323a43bceb0dd10c5cca0224802000000d37b63817b6ea2697604d0aa4701a2697602e2539700887d94527901377f75789263587e7802e253965880bc007e7e68587e527902e253965880bc007e7e825980bc7c7e007e7b02e1539302e2539658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d3007f5c7f7701207f547f750440aef137886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffdc591bfcfc4bbdd22709d6be93a5c9f25c9be52771a079ed51a1bd8767c4fa5d40aef137c100000004d0aa4701514d55014c766a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10800000000000000000000e253000000000000e253000000000000d0aa47010000000040aef13703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba60860b8507800000000ab7b63817b6ea2697604d0aa4701a2697602e2539700887d94527901377f75789263587e7802e253965880bc007e7e68587e527902e253965880bc007e7e825980bc7c7e007e7b02e1539302e2539658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d3007f5c7f7701207f547f750440aef137886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
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
                    amount: '94000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript: 'a914bdda81ba1d3bf0598d24d77b461bafbed0ba7af987',
            },
            {
                prevOut: {
                    txid: '4822a0ccc510ddb0ce3ba423e3de49c12993a607c4c108345be9f6eef84767f5',
                    outIdx: 4,
                },
                inputScript:
                    '4171aa357cf2a1e41d819440432b05557bd24da15319e714e6084330496e63f4cce9d8b3e77c86b9ae4a1ebd078a6ed8cbef34347b2d5a99643443c44d350e2ff0412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                value: 30808,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000000000080000000000016b480800000000000003e8',
            },
            {
                value: 1000,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                value: 546,
                outputScript: 'a914366be7e1eee2040519012d19fbfc3002456aede487',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '93000',
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
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
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
                value: 26761,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            },
        ],
        lockTime: 938585664,
        timeFirstSeen: 1729985270,
        size: 1244,
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
            height: 868307,
            hash: '000000000000000010c9f9bdb9446aac244e19ad0ae3936d73507964ed544e36',
            timestamp: 1729986430,
        },
    },
    // SLP1 partial cancel
    // e9d594e054bf9a7cead11cdc31953f0e45782c97c6298513f41b70eb408aa1a8
    {
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
                value: 975251,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
            },
            {
                prevOut: {
                    txid: '0c580a7dbfb7f160f0e4623faa24eb0475b2220704c8c46f279a479a477433f8',
                    outIdx: 1,
                },
                inputScript:
                    '0441475230075041525449414c4113bb98283dc7a2f69957940bb3a45f4ec6050b61bcc1b1134d786727e379c8793107bf0d0b0e051665ab3eed2cca34901646cf564a1ab52cb32668da229eef0b41004d5f014c766a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8080000000000000000030276a4000000000000e815000000000000a24a2600000000004b4a343a024f624d04900c2e3b7ea6014cb257f525b6d229db274bceeadbb1f06c07776e8208948eff7f00000000ab7b63817b6ea2697603a24a26a269760376a4009700887d94527901377f75789263587e780376a400965580bc030000007e7e68587e52790376a400965580bc030000007e7e825980bc7c7e0200007e7b02e7159302e8159656807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702dd007f5c7f7701207f547f75044b4a343a886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
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
                    amount: '855738679296',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript: 'a914cb61d733f8e99b1b40d40a53a59aca8a08368a6f87',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f808000000c73e000000',
            },
            {
                value: 546,
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
                    amount: '855738679296',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 973723,
                outputScript:
                    '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
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
    // Token txs
    // SLP1 fungible txs
    // Genesis tx
    // 04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103
    {
        txid: '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5fce5832b76001fb1436ab76e98db1d4f8a45330357685fd7913d18860c76e49',
                    outIdx: 1,
                },
                inputScript:
                    '4830450221008ac252ef989af11e2c5cb9b5fc0de854f7522d3950146090c90ab79f3db693f502202a07a121ff673ffbc863be66525035e067850b804572035125672bd7dc7e43464121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 44095814,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e45534953035052500850657270657475611468747470733a2f2f636173687461622e636f6d2f4c0001000102080000000000002710',
            },
            {
                value: 546,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
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
                    txid: '1357faa89d30193042fad9954ed9623044010fc1335fb323cb82b05778fd31e8',
                    outIdx: 0,
                },
            },
            {
                value: 546,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
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
                    txid: 'fc8310e19fe7d471d64c7c7c2c14f0021aa7a196e26f6a50126ecc1301711b4d',
                    outIdx: 0,
                },
            },
            {
                value: 44094050,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                spentBy: {
                    txid: 'd9cab6a796be28a0a888605af98c3113b94ef82bd72a3355dd59cc9e33cb0c13',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 334,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
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
            height: 838362,
            hash: '000000000000000017b493cf30d901a9b720f8ba65ad8383e0e69aae76a9a2a5',
            timestamp: 1711892148,
        },
    },
    // Send tx
    // c1801dafec97f1e67e8966c1910717ccbf13f2307286167cce61289a351190ea
    {
        txid: 'c1801dafec97f1e67e8966c1910717ccbf13f2307286167cce61289a351190ea',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0c006c7bc5095310327da78a613fa5a928ff4033e705c3afee84a134137beff7',
                    outIdx: 1,
                },
                inputScript:
                    '4196b2976df5c8b5a52a02a4cfe29c79e69379d2c431b716ce8cafc173127b831e96e01730893d5fe538cd4919f61932c3720fe21edc3c0f8578cd67ee839c3e924121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '18446744073709551615',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
            {
                prevOut: {
                    txid: 'df956d36c9a7c3540eeee22955e1d95c450dd931939a9d54fcd21e56c40e8a38',
                    outIdx: 3,
                },
                inputScript:
                    '41c451d43dfbe0cf1a89b6894c1eb54250683569656945f984a1cc9e35c5bc8e6f6822d8a7837ee5cc820647dced5e959fc6245dfcf9981efe9e8309e9ed9c82b24121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 2815,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e442004009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a246610308000000000000006408ffffffffffffff9b',
            },
            {
                value: 546,
                outputScript:
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
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
                value: 546,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '18446744073709551515',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 1330,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729797314,
        size: 467,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
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
        // not the actual block
        block: {
            height: 838362,
            hash: '000000000000000017b493cf30d901a9b720f8ba65ad8383e0e69aae76a9a2a5',
            timestamp: 1711892148,
        },
    },
    // Mint tx
    // 94726171bf522089663c3ee758d7934c5c691a6b3428971a483f33d2b9266cac
    {
        txid: '94726171bf522089663c3ee758d7934c5c691a6b3428971a483f33d2b9266cac',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'db40ce5331a4b513d55a46f1635630e112884bb5677486652cf290b6f73fb17f',
                    outIdx: 2,
                },
                inputScript:
                    '412a4090cd915b2d5838574c4ba7267264f9f35e3924865f45c3315d2398555f392aaea28f9de19c7f8115797396cb95793a8e1cb1449359c73ea0dd6b765332e44121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '0',
                    isMintBaton: true,
                    entryIdx: 0,
                },
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
            {
                prevOut: {
                    txid: '4711d244d0f540e6fcd69c01a8095f692da2a66ae7a7da8990627ecf12f727f3',
                    outIdx: 1,
                },
                inputScript:
                    '41827f9d3b4b972bd7ac87900120b54e51b21002bdf525a10ac38a7306d73a3f03c2b307b6eb0f332b4170762a0cb510cb0e2e385bc2de0f231b53ecc6de6b4e234121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 2492,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c50000101044d494e542004009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a24661030102080000000000000021',
            },
            {
                value: 546,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '33',
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
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
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
                value: 1021,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729797516,
        size: 460,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
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
        // Not the actual block
        block: {
            height: 838362,
            hash: '000000000000000017b493cf30d901a9b720f8ba65ad8383e0e69aae76a9a2a5',
            timestamp: 1711892148,
        },
    },
    // Burn tx
    // 40312e2085274c1c206aa71fd41d1ee6b43a6f3934154db3ff433f427950400a
    {
        txid: '40312e2085274c1c206aa71fd41d1ee6b43a6f3934154db3ff433f427950400a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '17c2265fb6f635e0bdd4a2d57794959d8bad065c1c3f82705a8d2ed88ac7dbae',
                    outIdx: 1,
                },
                inputScript:
                    '41ebf71b0f30e6518961fba9c0bc17cdbed3ad3c4026c7157cc32e2e898b13c15dea3a5346e8fc8feb31616a9f58a76614490f27e834a6b96abe0007dc4a4174c54121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '18446744073709551615',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
            {
                prevOut: {
                    txid: 'e6ce13109323c27a0c6abb5d5de3f68aa68a6c4434cbebb5d5f7a0207ce56d60',
                    outIdx: 1,
                },
                inputScript:
                    '41af685f59477f62587d266c15c8a99fb2e12970ba626eb8c63b73c2dd99e63a0616f873079fa0acfaef869b3ab90bb14f90653c576971ea26a67788c8be26e6724121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 34919953,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e442004009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a246610308ffffffffffffffc8',
            },
            {
                value: 546,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '18446744073709551560',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 34919100,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729797635,
        size: 424,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: 'Unexpected burn: Burns 55 base tokens',
                failedColorings: [],
                actualBurnAmount: '55',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
        // Not the actual block
        block: {
            height: 838362,
            hash: '000000000000000017b493cf30d901a9b720f8ba65ad8383e0e69aae76a9a2a5',
            timestamp: 1711892148,
        },
    },
    // Mint Vault tx, genesis
    // 52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6
    {
        txid: '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '8586a0e6dc08653dc5b88afe751efbb97d78246482985d01802c98b75f873fba',
                    outIdx: 10,
                },
                inputScript:
                    '473044022040b7bb9093b092003b5c41090f4b7560a7bcfed35278fd05d2f1083653529ea902205a11af8aea5d16a01dc7648397eb6b04369dda9e3e9ecc4a9efe3f5b4a41a1dd412102fafcdb1f5f0d2e49909fbafc18f339bcfc2b765b3def934d501eb798e626c7b3',
                value: 3851630,
                sequenceNo: 4294967294,
                outputScript:
                    '76a91452558a0640aae72592c3b336a3a4959ce97906b488ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001020747454e45534953034255581642616467657220556e6976657273616c20546f6b656e1368747470733a2f2f6275782e6469676974616c4c0001041408d6edf91c7b93d18306d3b8244587e43f11df4b080000000000000000',
            },
            {
                value: 546,
                outputScript:
                    '76a91452558a0640aae72592c3b336a3a4959ce97906b488ac',
                spentBy: {
                    txid: '2b136e2d437d56caa9c5e0269639b9484801534dc9e7018687a281ebb1532c03',
                    outIdx: 1,
                },
            },
            {
                value: 3850752,
                outputScript:
                    '76a914f4592a09e8da1a2157916963bc0fb7fe682df73e88ac',
                spentBy: {
                    txid: '69ace394fd9fc9850c4627d61b5dae760004dc26a88d59da3dc823199b0809b5',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 811407,
        timeFirstSeen: 0,
        size: 331,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                    number: 2,
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
            height: 811408,
            hash: '000000000000000016d3b567884f11f44592ce7cd2642e74014b1c65bc6a5c81',
            timestamp: 1695700586,
        },
    },
    // SLP NFT 1 Child txs
    // Agora ONESHOT
    // List
    // f8007b19d0c2b800c83dac35f408f14c14c6b17790065803b799219f645fa6de
    {
        txid: 'f8007b19d0c2b800c83dac35f408f14c14c6b17790065803b799219f645fa6de',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '236d3b4872c542d442fdf6d698f08d8d5397f592a52060640cb636743f75ad12',
                    outIdx: 1,
                },
                inputScript:
                    '0441475230074f4e4553484f5441f726092967ef8ec3ec48829c2beefa8feab1bbddd59d699f39f5a17a5958071ca662d1894cbcdec7496a01dae278180fdf042df9dacc479377c1ba32fe01340b414c562210270000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac752103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6ad074f4e4553484f5488044147523087',
                value: 860,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript: 'a914574a5e8cbd85abc1e7b011bf255d83201e62039587',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001410453454e44204902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec080000000000000001',
            },
            {
                value: 546,
                outputScript: 'a914e4d13a656429fafb1dbf0cb14b0385b97b1692ef87',
                plugins: {
                    agora: {
                        groups: [
                            '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            '544902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
                            '470fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                        ],
                        data: [
                            '4f4e4553484f54',
                            '10270000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        ],
                    },
                },
                token: {
                    tokenId:
                        '4902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '6cd7c9f33d1c9bb7a51a5278ba006c3105d8b03485caceadebfe810c1b466208',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1730305221,
        size: 314,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
                groupTokenId:
                    '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 868837,
            hash: '0000000000000000179baabf53b38ccd47a9dc0c6e154fe47b8aa66f100ec6fd',
            timestamp: 1730305964,
        },
    },
    // Cancel
    // 6cd7c9f33d1c9bb7a51a5278ba006c3105d8b03485caceadebfe810c1b466208
    {
        txid: '6cd7c9f33d1c9bb7a51a5278ba006c3105d8b03485caceadebfe810c1b466208',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'f8007b19d0c2b800c83dac35f408f14c14c6b17790065803b799219f645fa6de',
                    outIdx: 1,
                },
                inputScript:
                    '41c2ac670257fe9cb6ca0c3fdab8ef461e40fbbdd068c0cc41994be9d87082c8b3017c296296b21d30b76c5e2b855baf53a3ae4831c98c4848479d720eccfb646141004cb0634c6b0000000000000000406a04534c500001410453454e44204902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec08000000000000000008000000000000000110270000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba668abac',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '4902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                plugins: {
                    agora: {
                        groups: [
                            '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            '544902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
                            '470fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                        ],
                        data: [
                            '4f4e4553484f54',
                            '10270000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        ],
                    },
                },
                outputScript: 'a914e4d13a656429fafb1dbf0cb14b0385b97b1692ef87',
            },
            {
                prevOut: {
                    txid: '066b48d4c8eee59cc268c0e96be15dab4ce43362f646f07d1848841793f4d0f5',
                    outIdx: 3,
                },
                inputScript:
                    '41958e12ca0bdf2c998c6f54381804d103d452aa67d0b94e3f61964bc3be4eb3a43bdb5d51b0ed2f7ffe978394b84eb5a0da25bc7c818d10b109d12f57d248cc91412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 651735486,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001410453454e44204902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec080000000000000001',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '4902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 651734917,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1730305668,
        size: 569,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '4902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
                groupTokenId:
                    '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 868837,
            hash: '0000000000000000179baabf53b38ccd47a9dc0c6e154fe47b8aa66f100ec6fd',
            timestamp: 1730305964,
        },
    },
    // Buy
    // ce9fd1a15fb20339f04d6b474d0bc454b1031734f92b8a9a2af5eaba47280e34
    {
        txid: 'ce9fd1a15fb20339f04d6b474d0bc454b1031734f92b8a9a2af5eaba47280e34',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6cc73e737c2a6ed1a889941b36f7dca9961e15f75f1c9877b435cdd1921105e9',
                    outIdx: 1,
                },
                inputScript:
                    '2103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba640694b6878134fc8f5d56a5feb78413c80cfb1b81802774f557d026de210045317e7648c3e52646cff9fdad7326739814e35db3fa824a4890734d820e8b4db33ce4c5ae9051192d1cd35b477981c5ff7151e96a9dcf7361b9489a8d16e2a7c733ec76c0100000001ac2202000000000000ffffffff207bf382a50097a3db0754db5a4feb2d448f69a26cffea3ec0d17120411ed14300000000c10000004422020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac60ff0d00000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac514cb0634c6b0000000000000000406a04534c500001410453454e4420de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a08000000000000000008000000000000000134581400000000001976a9147fb54ae2e2f36f98b3e838272725f2cd1b9f3caa88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672102ce5232f2873c0c7b832bb74d08d904239cb7802b2e3b1ab11cf9d922289e70b668abac',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                plugins: {
                    agora: {
                        groups: [
                            '5002ce5232f2873c0c7b832bb74d08d904239cb7802b2e3b1ab11cf9d922289e70b6',
                            '54de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a',
                            '4778efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c',
                        ],
                        data: [
                            '4f4e4553484f54',
                            '34581400000000001976a9147fb54ae2e2f36f98b3e838272725f2cd1b9f3caa88ac',
                        ],
                    },
                },
                outputScript: 'a914214904003361d8083938a64c9cf5d761cba30d3187',
            },
            {
                prevOut: {
                    txid: 'd84e49d7396553f8931e7ecebf1717ced0ba962d3f4be7ce672d418a9f3a107d',
                    outIdx: 3,
                },
                inputScript:
                    '4131b686ad2a4c8da3588a488a9f27dddb341a26248f343a90d54a03251a96653fdd5dff15b739e43bde02bc5c9e062f003e8b756802f0bcd2f884111561362ca1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 1953,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '016c2bae4b0c1dd2f6805231a397c207b2102f149063374a10cb889f757ad815',
                    outIdx: 1,
                },
                inputScript:
                    '41dba2adaabd2860975a36fc1eaf95c8e0313dc74be0d4388fe87d11718fc8a211b817d25c4f9efd695638eabf2f9bca1c8aa67de277b8e7ab06a577deecb2ad21412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 1000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '8878a456854831684ec51ad56d68fb3f7d067ed697d65dfbe0b3be9fcf2df8b7',
                    outIdx: 3,
                },
                inputScript:
                    '41e6d980e95d18f97ea1a99108dc86149f3f21a2be2d8a68786cd0b3a4cf7281c35f339440d85dfe999d9e294fed0d7b51e13d316096a90b307f26f9f2fe7eb1d8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 821854,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: 'a27aa0243ba53d57eb009144f7cd025c7926544eb6fd12499b9e853527fcbadf',
                    outIdx: 4,
                },
                inputScript:
                    '4177d441e7f1c6b16ffe13dc880e66f15fa70943c823fa221e8250c840f856720676d160e21d648d2ed4a349567b89795a1f44bbb38afe317a7506789d7cbd054c412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 1427068,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001410453454e4420de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a080000000000000000080000000000000001',
            },
            {
                value: 1333300,
                outputScript:
                    '76a9147fb54ae2e2f36f98b3e838272725f2cd1b9f3caa88ac',
            },
            {
                value: 546,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 917344,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1730310914,
        size: 1231,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
                groupTokenId:
                    '78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c',
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 868837,
            hash: '0000000000000000179baabf53b38ccd47a9dc0c6e154fe47b8aa66f100ec6fd',
            timestamp: 1730305964,
        },
    },
    // NFT 1 Child actions
    // NFT tx (genesis)
    // 1862df58210237873e05d76d9cd5a73c32611860fce9ad1784e688a08e481747
    {
        txid: '1862df58210237873e05d76d9cd5a73c32611860fce9ad1784e688a08e481747',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '95ab0a32364ea260695e850f609ef8d285bffd23ad326e534eb5d6d93af3a921',
                    outIdx: 10,
                },
                inputScript:
                    '417e7167fe4f0b007e566c28646aa109b20d6489476a3bc70e12f25dc76ff81f875cd7d0432b5f5906d67dba505dedb078247133c3901c5336f8c43aff97aa2885412102ce5232f2873c0c7b832bb74d08d904239cb7802b2e3b1ab11cf9d922289e70b6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '8fd3f14abd2b176a1d4bd5136542cd2a7ba3df0e11947dd19326c9d1cd81ae09',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 1,
                },
                outputScript:
                    '76a9147fb54ae2e2f36f98b3e838272725f2cd1b9f3caa88ac',
            },
            {
                prevOut: {
                    txid: '40a2acc1f3a6e6d8c42eb74bd7fab92155dc2d2be17565b453d97b492972afe0',
                    outIdx: 20,
                },
                inputScript:
                    '41f46f82426d8d7402565b6f2f9913edc182fca96830841db667b755a909297c19f9c8fcedead5617db5bce127151cd6959a97bc1b66ac6df920f899ea90f62ba5412102ce5232f2873c0c7b832bb74d08d904239cb7802b2e3b1ab11cf9d922289e70b6',
                value: 67750,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9147fb54ae2e2f36f98b3e838272725f2cd1b9f3caa88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001410747454e4553495308524d5a736d6f6b6524586f6c6f69747a6375696e746c69204e465420436967617220436f6c6c656374696f6e2e1568747470733a2f2f786f6c6f7361726d792e78797a2031dd442b9e47cf7224f78f8fce5ca940e34a6c0674100ebc426aa63d9c81e33c01004c00080000000000000001',
            },
            {
                value: 546,
                outputScript:
                    '76a9147fb54ae2e2f36f98b3e838272725f2cd1b9f3caa88ac',
                token: {
                    tokenId:
                        '1862df58210237873e05d76d9cd5a73c32611860fce9ad1784e688a08e481747',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '5243b779c1815248f6f46ba4e844c7d53503e728637f84c039287c2540451d62',
                    outIdx: 0,
                },
            },
            {
                value: 67251,
                outputScript:
                    '76a9147fb54ae2e2f36f98b3e838272725f2cd1b9f3caa88ac',
                spentBy: {
                    txid: 'd670b5f4b3035105b35af49a98193813bcdfe0fcaed5147f9b9b424ae40d7dfe',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1727365040,
        size: 499,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '1862df58210237873e05d76d9cd5a73c32611860fce9ad1784e688a08e481747',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
                groupTokenId:
                    '8fd3f14abd2b176a1d4bd5136542cd2a7ba3df0e11947dd19326c9d1cd81ae09',
            },
            {
                tokenId:
                    '8fd3f14abd2b176a1d4bd5136542cd2a7ba3df0e11947dd19326c9d1cd81ae09',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'NONE',
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
            height: 863963,
            hash: '000000000000000016dfeff393c3df7d7f0448ed724095d43a43bd75bbb4185d',
            timestamp: 1727365618,
        },
    },
    // Send
    //
    // b7b45fef7e78e6408f99a61991a0b6f4b6a98d33fb1112e39ad4bfb65e28b3ae
    {
        txid: 'b7b45fef7e78e6408f99a61991a0b6f4b6a98d33fb1112e39ad4bfb65e28b3ae',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'ce9fd1a15fb20339f04d6b474d0bc454b1031734f92b8a9a2af5eaba47280e34',
                    outIdx: 2,
                },
                inputScript:
                    '41d3bb8bb4478a86819fdff03619b170bfb7a8f5c58c859b676560f51cde0ebc779ac9cf42f8b9ee5dc501d165579bbe9107c378eba5daa487ae874ea382c92c6f412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 546,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: 'c1b4075ceabd6b92787e5dac7e70f232e1b23f61da639d9335e8661db09325e4',
                    outIdx: 1,
                },
                inputScript:
                    '411e324d5198508f8f86bd44ed1c73711cbdbdaa5215194e009d1c6060d669b57c1bb37b5cb273a269ad2b890a01290e8003ca03cf981f913a9f76a2aea0d969b0412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                value: 1000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001410453454e4420de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a080000000000000001',
            },
            {
                value: 546,
                outputScript:
                    '76a91445cdbfeb4ed47211afeeae8b3e045c9ab3d90b1188ac',
                token: {
                    tokenId:
                        'de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    amount: '1',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 576,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1730312333,
        size: 424,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'SEND',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
                groupTokenId:
                    '78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c',
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 868837,
            hash: '0000000000000000179baabf53b38ccd47a9dc0c6e154fe47b8aa66f100ec6fd',
            timestamp: 1730305964,
        },
    },
    // Note Cashtab does not support Burn or Mint actions here, unexpected
    // ALP tx, SEND
    // 791c460c6d5b513283b98b92b83f0e6fa662fc279f39fd00bd27047370ba4647
    {
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
                spentBy: {
                    txid: '04119a7b429f0e2e8b99414e25b8478bb8812dfb9b57767fd28a5142e50ed681',
                    outIdx: 0,
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
                spentBy: {
                    txid: '88b7774a3f9798ec57899d9d641d80c61a539af4fed1c8137e45f842d0517ab4',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
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
    // Invalid tx
    // ALP ALP_TOKEN_TYPE_UNKNOWN
    // 74a8598eed00672e211553a69e22334128199883fe79eb4ad64f9c0b7909735c
    {
        txid: '74a8598eed00672e211553a69e22334128199883fe79eb4ad64f9c0b7909735c',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: 'a65c0a7258fc9d9087351d77eacbad882e851d11ea7c11a238dc4c8360cb3ffa',
                    outIdx: 2,
                },
                inputScript:
                    '41c9594e4dd7338ad9ec44a81ab75db2ccb737b961b00f2f8a51e0f581158b5c25ff41b26357f432821917a642cad0fd68371a75686bd3b7847dc6daae26e3eb6a4121037bc7f6ca0474be3edf7a2ce4e753855998273e9db618b135c20ee0e4b5e9fce8',
                value: 546,
                sequenceNo: 4294967294,
                token: {
                    tokenId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_UNKNOWN',
                        number: 200,
                    },
                    amount: '0',
                    isMintBaton: false,
                    entryIdx: 1,
                },
                outputScript:
                    '76a914915132f6d7b707123b66ce4ac0a04a135c07a39988ac',
            },
            {
                prevOut: {
                    txid: 'a65c0a7258fc9d9087351d77eacbad882e851d11ea7c11a238dc4c8360cb3ffa',
                    outIdx: 3,
                },
                inputScript:
                    '418aafb5e789fbc194ed7ecbad3bea728d00d9c089d3005bd6cf3487a8f196b2444e1552c5079805a790ab7339b4ef1932749f19ded730852cbc993dd80a04189d4121033b5a78b9d86813dd402f05cf0627dc4273090c70a9e52109204da0f272980633',
                value: 546,
                sequenceNo: 4294967294,
                token: {
                    tokenId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_UNKNOWN',
                        number: 200,
                    },
                    amount: '0',
                    isMintBaton: false,
                    entryIdx: 1,
                },
                outputScript:
                    '76a914bd19517f5aa2f2286922d4c28f5dc4c89c49798488ac',
            },
            {
                prevOut: {
                    txid: 'f5c37336316d0b08eacf0791000c13e87182ef87188c55693dfb65218db08cb4',
                    outIdx: 0,
                },
                inputScript:
                    '414d72085dfe8b9deb741c15e83822d778f5825e35c44dbd3753937b697538e502d71aae0215881f07bd8c66112abfe466b95cb8ebc0d7e9ca0c4fd063853ad73e412102637953859a84e61e87df221c91ac3a38c59fa7e652e43894adc4443a373bcd10',
                value: 600,
                sequenceNo: 4294967294,
                outputScript:
                    '76a91496345bfc72a63d798a7f1deace0be9edf209a24b88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript: '6a5005534c5032ff',
            },
            {
                value: 1000,
                outputScript:
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                token: {
                    tokenId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_UNKNOWN',
                        number: 255,
                    },
                    amount: '0',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
        ],
        lockTime: 821417,
        timeFirstSeen: 0,
        size: 484,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_UNKNOWN',
                    number: 255,
                },
                txType: 'UNKNOWN',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
            {
                tokenId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_UNKNOWN',
                    number: 200,
                },
                txType: 'NONE',
                isInvalid: true,
                burnSummary: 'Unexpected burn: ',
                failedColorings: [],
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
        block: {
            height: 836457,
            hash: '000000000000000017739c96aa947a25e7ff176eb1a669095f950cefade4f255',
            timestamp: 1710794047,
        },
    },
    // App txs
    // eCashChat
    // e40fec30e3e9854553b3c9e5b68cd431722e45ff00366136e77c8f457ebd7d90
    {
        txid: 'e40fec30e3e9854553b3c9e5b68cd431722e45ff00366136e77c8f457ebd7d90',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '8db67429be0cd65c002e8898bae4712b3098bb68a9cd578e18660fad07a784b2',
                    outIdx: 1,
                },
                inputScript:
                    '4194fe416801d0ae6f2ed87fcf3e66e74de77ca425040678df43971201f264c7cf01414e773a53be4f36b230fc4c5ee07be6c85073551f5bf3c9a1ae93e85d6c3f41210290b50035060622db41171ef7f9704efd881d4beed12222f807bcc627c94570da',
                value: 550,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91481a14c64a81f0a9c35b17499b355de9856fe1c5c88ac',
            },
            {
                prevOut: {
                    txid: '8db67429be0cd65c002e8898bae4712b3098bb68a9cd578e18660fad07a784b2',
                    outIdx: 2,
                },
                inputScript:
                    '41a59a9d4eb3449ef6ef8c3a99256711022b4cf24aec72e8ce7a132ba01428a27d2e671f0c38adfe36a9011556b2859fb7dd5bcf3518eab66474f633c079de1e5a41210290b50035060622db41171ef7f9704efd881d4beed12222f807bcc627c94570da',
                value: 49493,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91481a14c64a81f0a9c35b17499b355de9856fe1c5c88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04636861740468617368203130294bfa5ba853cc17d90afe4ae7a2df7de011ed8713ed7eb90bf016cbb6083065636173683a717a71367a6e727934713073343870346b3936666e7636346d367639646c737574736536686d65783765',
            },
            {
                value: 550,
                outputScript:
                    '76a91470a784633e942b7e1c9947255910c8132623225c88ac',
            },
            {
                value: 48564,
                outputScript:
                    '76a91481a14c64a81f0a9c35b17499b355de9856fe1c5c88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729617077,
        size: 462,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 867696,
            hash: '00000000000000001bb60e61a63510639c0a7117cef60589f1cbb591b2ac8bd4',
            timestamp: 1729618823,
        },
    },
    // Articles and Replies (eCashChat)
    // cff787e0134a39f79378fcdd67b6b0145a630a432ee70758fc74b10fdffe5b39
    {
        txid: 'cff787e0134a39f79378fcdd67b6b0145a630a432ee70758fc74b10fdffe5b39',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '80661ce76d82ece424ffc25804735000d39365a9075dfdc69d4573ff99b22faa',
                    outIdx: 1,
                },
                inputScript:
                    '4148e8628c19bd048ba199221ead5dc7f43fb50385cc4190bc556f2a0229b153945e653cfe49072566bc13d1f5b77ef9aa6ef8dcc70f112e57ca1ab0ad6d2273f44121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                value: 25000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04626c6f674c6c3938383164646139616530613065623038373238323236303638663231353138653530623630636453756e204f637420313320323032342032313a31343a303220474d542b3131303020284175737472616c69616e204561737465726e204461796c696768742054696d6529',
            },
            {
                value: 550,
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                spentBy: {
                    txid: 'd8372db66496105919611a623c211cd39032f312222c075c086e7d90d98dca92',
                    outIdx: 3,
                },
            },
            {
                value: 23758,
                outputScript:
                    '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                spentBy: {
                    txid: 'd8372db66496105919611a623c211cd39032f312222c075c086e7d90d98dca92',
                    outIdx: 4,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1728814492,
        size: 344,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 866388,
            hash: '00000000000000001ff6bdcfc2d78ea092a8dcfddfb41122f10c5473eaedb34b',
            timestamp: 1728814777,
        },
    },
    // Airdrop
    // 75f29368afe079e58ff950e384249190359137464261065fd8fc329b38051f55
    {
        txid: '75f29368afe079e58ff950e384249190359137464261065fd8fc329b38051f55',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '9cd18a4852a8e900514cfae551f34f441270c484bbb64aab7adbca1c5e9bf42a',
                    outIdx: 0,
                },
                inputScript:
                    '41d1e05374149017f7a14f8cb6978350035aaaba5d24723b959cd44c214796964540cdfce6b593ff850f2eb4336174b038b17e7fe8d5e2a3c7b92c6e78d5625b08412103643c1ca0e8480cf7b8be96ea475714c0122f92e4f9a0b22fbbd3bcf0e302d58c',
                value: 10000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914c8080b00b32aba4977c9a9af56b9d9226f147e1688ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a0464726f702009c53c9a9fe0df2cb729dd6f99f2b836c59b842d6652becd85658e277caab611',
            },
            {
                value: 1000,
                outputScript:
                    '76a9143d1a781059c9915716091c90f0be3e77e02b6bba88ac',
            },
            {
                value: 8463,
                outputScript:
                    '76a914c8080b00b32aba4977c9a9af56b9d9226f147e1688ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729568158,
        size: 267,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 867624,
            hash: '00000000000000000ce7ec8b675b84c722675df33c48979375a0c652abda52e5',
            timestamp: 1729570217,
        },
    },
    // Cashtab msg
    // b4faa2df37c8802a3998df635e28dccd327a04c39502954acf06d56bfd2d0e9f
    {
        txid: 'b4faa2df37c8802a3998df635e28dccd327a04c39502954acf06d56bfd2d0e9f',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'c5b54449a8881c833ace3511e44fae405f7e6386a24bf74a88e4697fc78be3c6',
                    outIdx: 0,
                },
                inputScript:
                    '414979186503256f02393cbf767fa533f7bfabb35ab14114842807bb7bc9e52a0a0ba0d87806449ae35f23c0b6fdb2e2ddf19e7c5594ccaa0ba74bfbcaba28d2d0412102cbce237226bd8bba1a02def66085cfff2427042a98d8bf9590ccced8207d233b',
                value: 4628,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140f81c58578bd5ecc95a82ed0a89bc7061f0c04b488ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04007461621a5468616e6b732062726f2e200a49206170707265636961746520',
            },
            {
                value: 546,
                outputScript:
                    '76a914a805a320360fa685f83605d8e56de6f9d8a7a99988ac',
            },
            {
                value: 3557,
                outputScript:
                    '76a9140f81c58578bd5ecc95a82ed0a89bc7061f0c04b488ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729582375,
        size: 261,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 867641,
            hash: '00000000000000000e5aaa59d2a19e420be897014fc9e03343273e85fdf295a3',
            timestamp: 1729587484,
        },
    },
    // eCashChat Auth
    // 27517286f1b7f159da4db93ed96e6be9bb01dad94179ea889211ef32ebb1a3b4
    {
        txid: '27517286f1b7f159da4db93ed96e6be9bb01dad94179ea889211ef32ebb1a3b4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '2733f060666ce21d0eff1080a71cf168074a8284e2e6fd36ddfae95868dc942b',
                    outIdx: 0,
                },
                inputScript:
                    '411f507db40c8fb326008146f0e4d95e172e3e32c817f74e891b357e8a8ba6e21ac6ff0e3a391cf2395dfa8d5168fee9cb8b8d03812d47f29f76482dac8c7175f341210349c0d5569a0a43c4473bdcd11889de00327303007e24972941ccbf3a3dc61ccc',
                value: 50000,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9148b48669ce8873c71698151db0453e6285aeb07c588ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a046175746814619e0bb30cc23b2879f7b1131a858ea9f0d3d873',
            },
            {
                value: 550,
                outputScript:
                    '76a914b20298c1b5d6a82a61f6c8cd708fa87a1ce1a97a88ac',
            },
            {
                value: 48937,
                outputScript:
                    '76a9148b48669ce8873c71698151db0453e6285aeb07c588ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729618002,
        size: 255,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 867696,
            hash: '00000000000000001bb60e61a63510639c0a7117cef60589f1cbb591b2ac8bd4',
            timestamp: 1729618823,
        },
    },
    // PayButton
    // bfce47f2403031f5465982b821e8e14c78deff2dd5986ca0c21cebb5ed946b4d
    {
        txid: 'bfce47f2403031f5465982b821e8e14c78deff2dd5986ca0c21cebb5ed946b4d',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'b7f22481b53c0c0eb46a61640324c0ef872acc6cb0d5a62a33364d7036995004',
                    outIdx: 2,
                },
                inputScript:
                    '41c4a70b96af0dc94bb5cafd6d847ea6b8d7c509b0914a90fbffb35dcabe119c0a61e5cd376baab1128c44c89d09ca98c84ed2e695d706329f170b3a18c6bc08cf4121039f0061726e4fed07061f705d34707b7f9c2f175bfa2ca7fe7df0a81e9efe1e8b',
                value: 2903745,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript: '6a045041590000000863a9892c7792fbfd',
            },
            {
                value: 5000,
                outputScript:
                    '76a914631dde3df001e09c9cfde6c72c8ae02849f2c0c388ac',
            },
            {
                value: 2898252,
                outputScript:
                    '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729364288,
        size: 245,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 867294,
            hash: '00000000000000001635b16e32855d303e148a18c3cd8abf76fe4abbdbf3771b',
            timestamp: 1729364661,
        },
    },
    // Paywall
    // 77502089ae5f89ef941a3f71360da13efa8e1c8aedf79a637a505ca09065e5e2
    {
        txid: '77502089ae5f89ef941a3f71360da13efa8e1c8aedf79a637a505ca09065e5e2',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '01a8723ddb110adc71c38f236099a28ebc6cfae48fb0db7134fc41a97aed8c96',
                    outIdx: 0,
                },
                inputScript:
                    '41fe808a1d825c384785d0e3e37be0f3af10670e075f61be1c12cd14ed89ae7f01a3af3a21ff1931326058df7cb530b84a430ac9dc65ee73734494b2010f682bc14121031febf12ea22d33cb6da0599c3fcb29b80c88efaf16c1c024192f9c2e03ce4675',
                value: 18500,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914c2b4edba79887da00c8022187195caf7da6ef03788ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a0470617977204999ccb611ae9d9c28b06215d42e8695cf5230db8c21707b0d36268bc68ffc76',
            },
            {
                value: 550,
                outputScript:
                    '76a914c4d76949bd98d3a2f7d0b63322c1d4a5c2139a8b88ac',
            },
            {
                value: 17413,
                outputScript:
                    '76a914c2b4edba79887da00c8022187195caf7da6ef03788ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729623047,
        size: 267,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 867718,
            hash: '000000000000000008e954e690fa6b69077938de8bc0c22997830c8fcfb8028d',
            timestamp: 1729623297,
        },
    },
    // CashFusion tx
    // cae3e4bffeddbea25e74115a69e63bcf36e23d22b30bd30487e5e5a732d9ec78
    {
        txid: 'cae3e4bffeddbea25e74115a69e63bcf36e23d22b30bd30487e5e5a732d9ec78',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '0249db0d483b46e0cd6a54372a6bd3e1f899147e8d4f454075ba370effdefa00',
                    outIdx: 43,
                },
                inputScript:
                    '41df3bbe84dcbcf9efb6fcbab59878055178d29ea98b1156a8ac2c6f54e4fbd7482a38e34a7a7ea41388362272db9b7ada93109a3e058d004c80fdec75db506de7412102b1a4d65f26afe16fba3760459ffeba454a023da32e618fce929a5531292085ab',
                value: 19044530,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140a797a01e2673b24a02fb80b5f46a70cb7b5a4d888ac',
            },
            {
                prevOut: {
                    txid: '0249db0d483b46e0cd6a54372a6bd3e1f899147e8d4f454075ba370effdefa00',
                    outIdx: 49,
                },
                inputScript:
                    '41995ba8a2c1c789a7b0a23e6a956c61beedc5c47c20b16eb90a03c2dda683caaa6c38101df05adbdd12eb17cbc1445f9c6b922ebee33873409da201eb021afe8c412103d0f243652691c1244f5c77624fec85bf4bed316126bc9bb39ca1154f89017a2a',
                value: 21813626,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144fc1984258f87c3bc0900156fe926436a78c12df88ac',
            },
            {
                prevOut: {
                    txid: '0d0787c6d65a2251eb3e7356302ad98f1e5d1ce6e0ffab4037ed9320a86eff76',
                    outIdx: 4,
                },
                inputScript:
                    '419f2360309485fbb734f4494f30e084204712d829baa2f4a4f05cc4ace0424e9cff4110c6b0997462d9adb30be7565c7cac3897c43ad378797dde20b6d8d896fc41210278f666cae97366d63b06b9e1e7b4cb6d69aa625805ea32862872d8d930c5d50c',
                value: 394728,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91450c67b8481300a093b5501a6903e8ed98381f53988ac',
            },
            {
                prevOut: {
                    txid: '0d0787c6d65a2251eb3e7356302ad98f1e5d1ce6e0ffab4037ed9320a86eff76',
                    outIdx: 5,
                },
                inputScript:
                    '410c585f2b3753202282bb590e452a5a955cda78ae6dd7bfc7475734be384cbb0930d92abcb9e0c5a03c7fc8fe5347170f83055ee1db213d47382839a9ddc6dd544121021684217e7f6b9b9fca552a01ca6215f52646a388e986df2c468bea7c42a80f6c',
                value: 414991,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914799b9c14ebc56fd5ba2a3801ba64743242f1af5e88ac',
            },
            {
                prevOut: {
                    txid: '0d0787c6d65a2251eb3e7356302ad98f1e5d1ce6e0ffab4037ed9320a86eff76',
                    outIdx: 42,
                },
                inputScript:
                    '4146244f76308483868efe3e04146ef7d8be8b972d17b92124f9f2b833de1acdfa0a0311c359f0e114fd780876e96d3376939cdb8496671bf64b8141ccec9f4b22412102dfbb426682c141297c626c0bbb4eda4d1805a41ec6a5f9046e7431818523d60e',
                value: 7028571,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914ff4b390e072bdaff1985435509fcc80eb717e6dd88ac',
            },
            {
                prevOut: {
                    txid: '0d0787c6d65a2251eb3e7356302ad98f1e5d1ce6e0ffab4037ed9320a86eff76',
                    outIdx: 51,
                },
                inputScript:
                    '412dd0e8f66411bd6e637139475b0c48d00493f24c6fee5eb90a4316af61734020bb0b316b8d2dc198c5a8541691e4162121ad307cbb74d33993fb009b2fa81f9841210339f66ba9e96d8e117d1354f3a3e1547efbba247bf6e3cadf25e6b78e6bd119ba',
                value: 9302929,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91450e0c8c98359095cafb50fb11c40956ff0d4fbf588ac',
            },
            {
                prevOut: {
                    txid: '0d0787c6d65a2251eb3e7356302ad98f1e5d1ce6e0ffab4037ed9320a86eff76',
                    outIdx: 62,
                },
                inputScript:
                    '4129126ada21287ed43fe7e1644c7eb4fe1bd165941c264c99794c736b38171223ef59816a6d7ad956ea7ea09603d18f8de57fb225f76fe0215e22968230ab53db4121028115cb253822364f3fda454be0fc930ddf7ade935ce836a3fef1946b0b306d7f',
                value: 12522752,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9149314d58e27f38fb043b9a5aa7a8ae61d2617390688ac',
            },
            {
                prevOut: {
                    txid: '0d0787c6d65a2251eb3e7356302ad98f1e5d1ce6e0ffab4037ed9320a86eff76',
                    outIdx: 70,
                },
                inputScript:
                    '41e39a6d0e85a2c4513ddaa878b5ed59a6dc995fff3afcda72fbd686b64ce44949c111c71e34f4464efe823dd558b807eefb4524ad9e6cd38c150a13857623cff04121025b46687783b420affaac912c62cc08df3f600a4a61e689621c1a5dc7ac636433',
                value: 20061909,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914dc82a51a0c936d0d102ec2cbd4d225e8057cec3f88ac',
            },
            {
                prevOut: {
                    txid: '0d0787c6d65a2251eb3e7356302ad98f1e5d1ce6e0ffab4037ed9320a86eff76',
                    outIdx: 80,
                },
                inputScript:
                    '41880eaf18e82a6367228cb6a710072725ad6bb4521a250745967d431275dc25e5985093dd92de4d83cf5b2af4b86db070f6400d274afc68252e251079e216d3cf412103eb0f7de9e1e9cdcab35ea59e7dec29fc738ac42e9c2f76889ee7a9cafe88c39d',
                value: 56109568,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914493d17051df0b8e38a08084192b5a38cc493d3c988ac',
            },
            {
                prevOut: {
                    txid: '1576f259e40e960d6b82d8fd7a2ea2def2482ac2820d87173a3400f78a969f77',
                    outIdx: 9,
                },
                inputScript:
                    '41932b38a6267156ba04423f0ed3a3004844ead66c1240df89769b0a401300f2d084e69ae26712b73e37264ef06b6349f2943ea07b718b84026bf46a9cf29a9d54412102dba5cafe198f94787aac78c77feb3334745f983fbcdd0c523a9e44890410d0e0',
                value: 723423,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914356f56b50c33cda30907ed5a280adda2c201943b88ac',
            },
            {
                prevOut: {
                    txid: '1576f259e40e960d6b82d8fd7a2ea2def2482ac2820d87173a3400f78a969f77',
                    outIdx: 14,
                },
                inputScript:
                    '41b5a0fae4c5e44a344663206d2159fde79e93a55d7948b2073f373dffbc28012b43d83896813db3829235e5a0c769c0293e62cb97e771da22c97a22e4eb2b29a54121031cb5f7a8937279d887cde5749cabfc0dbab5bcd0f07269ccd9a136aeeb0ae873',
                value: 1574168,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91433e10aae895a2ee756b6c9d23ca7e0cd38c62d9988ac',
            },
            {
                prevOut: {
                    txid: '1576f259e40e960d6b82d8fd7a2ea2def2482ac2820d87173a3400f78a969f77',
                    outIdx: 34,
                },
                inputScript:
                    '41538aa46dea3cb55bc28fdca8d9b912865ce6c42f2a31348d3088b88c8571ac95c9d68d65cfcb3ab4f15a37a13f5a2f00702219cf6a4b3047e56c4e590b963fc9412102be5c732ffd14a71bbc48fc1968137b9718bc12469844123acceecb317a88acb7',
                value: 5347523,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914e62f1eee7b4e6877dedf7b5aea40f87297467be688ac',
            },
            {
                prevOut: {
                    txid: '1576f259e40e960d6b82d8fd7a2ea2def2482ac2820d87173a3400f78a969f77',
                    outIdx: 37,
                },
                inputScript:
                    '4102e53a109e468484c2f736b69466cd170ca387275df314a8add14317103b5cbe9c7f032eca20fda1ef15381d015a12b33f6c68591aa912f7852ccc7f96ead1ff412103422e3bbe0e1d4966b0df5e60bd27fac28b8008722c2b06719ca1d8c66e827393',
                value: 5709247,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914c3c0b825fe2f6a44c745eccb0f47367f7ddbc8d188ac',
            },
            {
                prevOut: {
                    txid: '1576f259e40e960d6b82d8fd7a2ea2def2482ac2820d87173a3400f78a969f77',
                    outIdx: 60,
                },
                inputScript:
                    '41fe8583171c7b0f9fa661f7e19983eaa04bada5244d5696aa7a47e4d16a8811c231c4cf70d10dedd72745b07a0971781a1cf18fef8405bf9f43f0052654c780b4412102e263921e2c0cc86e5eb011aec807b330afacca37d4709950011efc288edd9e35',
                value: 12202011,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914e9f60021f56e16676ecad578abb1346db5e30d8888ac',
            },
            {
                prevOut: {
                    txid: '1576f259e40e960d6b82d8fd7a2ea2def2482ac2820d87173a3400f78a969f77',
                    outIdx: 66,
                },
                inputScript:
                    '41fb8b372ec7450923d58f117401af1da185be2e23c4ec67e0c39a2e2fc51a1732805aac25dbf7d6023b5605e8b23d654a86676e1270a0c7027327c451d094ab9241210388abbae310cc1e415e49375f4a9205a1e48a62be5623f684700aee65f62ba506',
                value: 15785620,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9149817f6012414b1da0846093b7bdca256b26cbe4388ac',
            },
            {
                prevOut: {
                    txid: '1a341e639aefe5f2b39b4b3979143eaf09fbd2a4418be47ea938777847be7fcd',
                    outIdx: 23,
                },
                inputScript:
                    '418354b6ce1e067e299e50c749a2582bf2af1340c1b9b0bbc167bc76a90076e9d5bf3226c856342d3e95d89c06bd0172fae0b2a1ab746474e63b3b673db7423ff0412103c96315e98c33ca47add711d1f8d3f18ca9cfa7632353d3fd26eb47fbc83a0eb9',
                value: 6027875,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91414018c2de14ba872dc49a0b1dbf1b4fad6f5baad88ac',
            },
            {
                prevOut: {
                    txid: '201ef4c9c25e1e68a2e0e03bbeceb79232467de73e00d98de1fe411a62d93e5c',
                    outIdx: 9,
                },
                inputScript:
                    '415fa716ae82dd29033e38310a38ffa92731bffc4be413dd344270249a0f7743e39180988b42f0cc0af21669b067bbcaa919eb75d27f4c0365a084eec24f462edd412103152fd9fe4d3e7932067de80cc9108427c3dc2c5846fbe90a89bcadf2960fcb62',
                value: 3368231,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9149f7e0f97d488acaa7e22e7b897bb8b0af442207488ac',
            },
            {
                prevOut: {
                    txid: '201ef4c9c25e1e68a2e0e03bbeceb79232467de73e00d98de1fe411a62d93e5c',
                    outIdx: 37,
                },
                inputScript:
                    '41471802e2bdb2e81a0404bec557885551d64f68c46144a2f1d30a76a8f46d9f52e8224ecbe0461f6689846a69b7754e3c71a2c06e0936db9b0d9af26dba6782c8412102999cc772ab81937c263a7e16003ecf1a7d66dc2b0e03824adea22eb569f67e38',
                value: 29633909,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9145c98423dd06247796fd7d15bf6142df6dd65dfb788ac',
            },
            {
                prevOut: {
                    txid: '20671f9143db94f4c5f46687e174c0aef33b856bbb5b6476d39222a5efa8c413',
                    outIdx: 14,
                },
                inputScript:
                    '41098b8fc3e6357011795c444e0ff9665413380ef7a006ff133f4599f18dcbd476b41272db3a51c254389fe71d1d1d72832467b85e8826729da1538d0c79514a4e41210227c3905f79aacb942750876c92525d0606a60d67479549f30f15727346c391c7',
                value: 9883971,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91466a8ce404edf535033a47377130e8f1a16dec66888ac',
            },
            {
                prevOut: {
                    txid: '26649dfccf538d6417ba64f51ffbfb22b1c25d39fb45659a95bfd86f4215744e',
                    outIdx: 54,
                },
                inputScript:
                    '41760d8aeb07e7ca65b4e108d262765da3623e5c8bdec061c3e4d7739af9674a7cab39aa9084334ebf4e93ca92a56a304691c2068d7cc08f4139c72943323495654121022a15b004a007154b8ea8cbfca2b2b1deb7486bd637e3289d52ced0b17c24ba9b',
                value: 16806623,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914f89793e870c57d76572d3d51eeda078f910b206388ac',
            },
            {
                prevOut: {
                    txid: '2d4df9aa46ede7349de21ddda85495d4fa31314a046c24278722be59beaeeeba',
                    outIdx: 7,
                },
                inputScript:
                    '41ed99a385474633a98f857089f0dc019c214d155031f871f5018f93d0b5071324faf9f3c01b08bcd4209fbec188da6bffeb50a4c469479cd4f0fbdb71b59c4cbe412103dccb27bc84af3b5dcdfed5f08df935e168051ad32c242e698d0c1f464c2e9832',
                value: 186916,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914dca716d5af6b1288acd17ee88fb20a2829ab2ec588ac',
            },
            {
                prevOut: {
                    txid: '2d4df9aa46ede7349de21ddda85495d4fa31314a046c24278722be59beaeeeba',
                    outIdx: 22,
                },
                inputScript:
                    '41821e4c860943978ee09812f333d1b80cc219b3f1e48b60036c3072a1c811f806f28eecb34fc1ffa1c3165be97c1906744e51c8a2900f2d59112635112ddc47144121038b04a447c830a862d06b3ec4ebafd1be3d9ee1c149630616a4a27fed46cea362',
                value: 614009,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914dd92844bcba0daa04127dd0ff9581741af1feb8288ac',
            },
            {
                prevOut: {
                    txid: '2d4df9aa46ede7349de21ddda85495d4fa31314a046c24278722be59beaeeeba',
                    outIdx: 91,
                },
                inputScript:
                    '418a9b080fc4cc5b6284578bba95d9152f492a67a70e5ba93a01a40070223bb19f45018032b728edf4f7fbd4168658043ef7ede5aef8122ba1feb7002d714486544121020b4049376b0d37186240f2c834bc8579de9a8e3ad2370a0ad565eb455e1caa0d',
                value: 9846080,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914489371d01d4633920176d556d614b1df7e3c4c6c88ac',
            },
            {
                prevOut: {
                    txid: '2e0d7986d8d8a1ee9e133802d6e900af87f1bac46dc72a3bb7887ddbaf1612ed',
                    outIdx: 9,
                },
                inputScript:
                    '41190cb88f905718c97ce7624f518be0895a7ac3dff36b909ad3c4a65f69fd7d5247b7d11f4e578c97be3277b66d355dd02cc0149fefa839a2117a840bdda3ae63412103e74e4014d3a5524029c160af6d3cbfddddedb906b71436c4f8b74ed0f21c0673',
                value: 1014962,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140820720277dd2e4c117d7d601957ee8b98719daa88ac',
            },
            {
                prevOut: {
                    txid: '2e0d7986d8d8a1ee9e133802d6e900af87f1bac46dc72a3bb7887ddbaf1612ed',
                    outIdx: 28,
                },
                inputScript:
                    '41f41af2c300d637d1dc76be1c22d41db11d5dcb96e6c9bf38a436e7c1985dcedce1f27ef0d4d220cc78f3becf5d1ca4ce4d4c3cfb74c86330b6dc5bf444c40591412103f9c5d3255a762234e5fe3b00744dcfdb8824344bc424a6e3de12d4e36b386851',
                value: 3195908,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9141b4ec15252b9beadd55e564588efd9c58412f08688ac',
            },
            {
                prevOut: {
                    txid: '2e0d7986d8d8a1ee9e133802d6e900af87f1bac46dc72a3bb7887ddbaf1612ed',
                    outIdx: 32,
                },
                inputScript:
                    '419cdb4446c3b8ad1230193c299f1d22697ee02473acd74436e7690e5a8d8e2635a98e21e5709339b701bb68f2e82fb52c66619acb0c93bdd688ad9bfb6dccc14841210258f27cebaa7be00e2bce38a0462154fb36c066f5338097f5492290a036e4468e',
                value: 3547312,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914ebabc065b7548d0a97488addb928bfd0bb5ffd9f88ac',
            },
            {
                prevOut: {
                    txid: '2e0d7986d8d8a1ee9e133802d6e900af87f1bac46dc72a3bb7887ddbaf1612ed',
                    outIdx: 56,
                },
                inputScript:
                    '412c51435daa98770fa841f30c56f57a28e55542b9d38c0958dc54ae9adec71f8b88da708d9f48df308587768f78ba9fa1de813a38f985d568248c2203253d279f4121037816e3882a1bb7d211f279d80514924a67821da755fb975e6b1da22f20d00a3d',
                value: 7845327,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91410b4904640491d3760f3c6021ecee661621d315788ac',
            },
            {
                prevOut: {
                    txid: '2e0d7986d8d8a1ee9e133802d6e900af87f1bac46dc72a3bb7887ddbaf1612ed',
                    outIdx: 60,
                },
                inputScript:
                    '41c4d3e5bcac9b4bccba9836816eb92d7e1f2fa8c756c52e16245add08a02f441944a9ef716fe12646f800a63120eb2d045ddfe9bf8e40ab47115a04042fdf71114121030531127dac1724380ead04e01d060d2561db071dc0bca09826109a4dfcc969b2',
                value: 8867513,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914da4c46bb1853086cdf8ee66e07896d273982696388ac',
            },
            {
                prevOut: {
                    txid: '2e0d7986d8d8a1ee9e133802d6e900af87f1bac46dc72a3bb7887ddbaf1612ed',
                    outIdx: 78,
                },
                inputScript:
                    '41de89262a098ff147bb603154f923f925b31ff1998b95441b39880421498627c2cbaa595a1920cbedff8fa4402fd8e85b517f82f044cd7b09d6f1e4d89a4712a24121025a31dd35e3dcb26bd847036dcbe581d3890904799d527b490234fdb4008aa60b',
                value: 15639927,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91497d20588c573a9845baacf6f0b8163e20ece5d7b88ac',
            },
            {
                prevOut: {
                    txid: '5a5a63d9ac47570d0d1282143d634ae0bcc521524031cd4cd6de78dd99dad913',
                    outIdx: 40,
                },
                inputScript:
                    '413c94e9367505680d3f5e6695b79661da5dcb2effc1fbbf2b6411e26516e9347bb50b79607b691c4199eba64f2efc536512d45cc0bfb650948f8f45f689defeb141210221432af3ad2ce61807769c17528d7bd057cbd870c71fe660bf784d3b9ad2b4d8',
                value: 8534104,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91441b9b10ab1727cb4d16a94131511ff4376113d2288ac',
            },
            {
                prevOut: {
                    txid: '6c47f3872ec33345a47b326f0adf1796158f027e61aa508a6fa7fcba8294432a',
                    outIdx: 15,
                },
                inputScript:
                    '419a17384c24d95cfab02e7bb27ec592b35bc98bbfac6109cdf999f7808e613a3795924b484b2be1c3ebddc2fe1564d9092a244309aff78d3bc71d95797184b59441210391ec904754962bfe2138ca65ebd66956d9d1c572bbba41896dddf744b9d20cf8',
                value: 11857272,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914cde9bc0f8ee4bc5bde25c2e3763186389e9d82eb88ac',
            },
            {
                prevOut: {
                    txid: '8742d58eab0f68f4bf9138469790ad871f612a2469d5409abf219b05d922b369',
                    outIdx: 51,
                },
                inputScript:
                    '410c5743e207476e6dd36c076ebece2681568de8855581305e350ad8caf54c2cb043230b8ac3b5ddb3e4cc8ee1b1519f95178f19d521b1a4072f3638bcd164cf1341210316c3301c214cf5700a35bc0a5d0c41e7c4a48acff8da61d7ae66e79d8ef68026',
                value: 6300897,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9147a9abbe29cb7fcf541b68981840dc4c2c672504b88ac',
            },
            {
                prevOut: {
                    txid: '8742d58eab0f68f4bf9138469790ad871f612a2469d5409abf219b05d922b369',
                    outIdx: 55,
                },
                inputScript:
                    '41b10fc4389ec67240720117d5140fba2a564095314220f5e2fafd7654da1e43fee3bf0df9464a99edc0687c8f86b552f8439c8b5908786ac9aae643c1e8c22fe94121027caaf5c02a2270a282cdb719fc22191fe86df130b98bc2f59c7881c8cd9d8e62',
                value: 6765543,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91468bf52bfab795729eb8bf2d067507068909c0b3688ac',
            },
            {
                prevOut: {
                    txid: '9207e96a3e2af57a05d428c2a24bbb3a3a350eb84933ab8948a365209241d2ba',
                    outIdx: 5,
                },
                inputScript:
                    '4179f63f6c2b66cfffcf83f7c4ba49591bc5dad419a75c8e15e46811d0337399abbcab7f6e0655059727d345bf83139d287e8e93232dc75319672135bc9927d9e3412103ed359db19ec76388c224eb7f631a1411939fbcc01da55d5a01d1f6130d214a22',
                value: 2129682,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914ff119315f056f5a79ad69bc514ccd98fe325cc1288ac',
            },
            {
                prevOut: {
                    txid: '9207e96a3e2af57a05d428c2a24bbb3a3a350eb84933ab8948a365209241d2ba',
                    outIdx: 7,
                },
                inputScript:
                    '410ad92695b50884c07014a1e7c6cb3126da5cb3ce44c2bc05ae9f2039a156ff958f7198c47f2621eee11a5289fd83d126afbc5a185a4ebf3fbfd6db274aebe94a412103b7f3e5aa641ce8be9ea9268ae50b3561d7b70e6bb7add4ed3805f9a51bfaa3f1',
                value: 3175212,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144f78f400b6ea94bcc152fd86a3a342392a0d393088ac',
            },
            {
                prevOut: {
                    txid: '9207e96a3e2af57a05d428c2a24bbb3a3a350eb84933ab8948a365209241d2ba',
                    outIdx: 41,
                },
                inputScript:
                    '414305bfa6ef186ddd3f4b8b97a4ebeff87161d67b2dec4408ea4a6f91cdf7db47382e96351a33dc49ebe02be37b14e5bc990cad04eaddc90f21a8060dee2e2b24412102b982e67fe423b3dd45e38bb2457f0bf66d94a7d559d32d70319cf4dbddf66c9c',
                value: 30314073,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914905cf8c762e3027b5562fb4dc949225999b7561a88ac',
            },
            {
                prevOut: {
                    txid: '9207e96a3e2af57a05d428c2a24bbb3a3a350eb84933ab8948a365209241d2ba',
                    outIdx: 49,
                },
                inputScript:
                    '4192783667e913c048b56c041fc3fcfba6f4eb7f123deca342a2e6b461a66c11178db5082c2e6158b61518de5725970c71199cc2736aa789888d62ab9b290c8ec94121026799d87f335bb8a8705e9a5ecc3098073b988315806b2b0c38fd6d76352474f2',
                value: 62502527,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914cf53e1bbbb20d10464328fb25ea22ce9c23348cc88ac',
            },
            {
                prevOut: {
                    txid: '991487316b19383d90be7e23a62720727a1d8781d8257bed99c38805c0789af3',
                    outIdx: 18,
                },
                inputScript:
                    '415ccd55e0a38970dff3a6fbddb96de79199b6e3949997fda69a6daf021b74964570d9a0ec0cedfc31ceed0c0a8f78a4c97a4ad2b372880cc2b5e73190f7e9a59341210208a31c990c4c0e0e5ae7d795d74ecbe782a5798f358ee70607f240b6a62fd925',
                value: 12975492,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9147ba0a29a0d139dcfcfc37bf44fa3c0b07eb4b08488ac',
            },
            {
                prevOut: {
                    txid: '991487316b19383d90be7e23a62720727a1d8781d8257bed99c38805c0789af3',
                    outIdx: 35,
                },
                inputScript:
                    '41539175855a3e0ad5babfbc685ba9dcf8b515cbc9b109d016bba34b07ab502c7cf0e0c21be2f5e9320d51a4f33f9b2c46e57c7be56bf893afd4048b8b7863f4e54121036d7c1368ecb38e607c3a4905d4831d0d1b7a0452da451a87524eb585f68c5845',
                value: 52978008,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914ba83a81ec8cb0e5c4c3d4f0584fcc778a08a431088ac',
            },
            {
                prevOut: {
                    txid: 'b130d197258b93961683184a7ea738a47b6b077142bf2f58dac31e26b56f9139',
                    outIdx: 12,
                },
                inputScript:
                    '41afd3ae1e1909d2b01a09e4be777857e7340d7b5aac524c4b0f258dcb3c91a80332f9a4c7f3bf1b21646362d5507a7725006c1815de581945ee4808c8e36e8f52412102966e2bc7578c25d70d601d404051d3880327ea8b742a754f19e234397ba67187',
                value: 2926809,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914e8a84faf2151752cce5b1a90c149cee3de8a175e88ac',
            },
            {
                prevOut: {
                    txid: 'b130d197258b93961683184a7ea738a47b6b077142bf2f58dac31e26b56f9139',
                    outIdx: 22,
                },
                inputScript:
                    '41400258c69411e26ba097394882ae6b83837103a30b36b224348574375b070c40ae445ccb3301ef95b08215fbabea7fa92392506aa5a8420dd90669e00bbb9cae41210301bd439789b92005e5994ca61c073e91c75265a9ae7d66510a80601e0e46a8ec',
                value: 6374291,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914e1cf05100ed4381378604695ac6a695dc6cbd59c88ac',
            },
            {
                prevOut: {
                    txid: 'b130d197258b93961683184a7ea738a47b6b077142bf2f58dac31e26b56f9139',
                    outIdx: 52,
                },
                inputScript:
                    '41178c840dfeddc76f7c8801a8e6625896c2afafe3bf02224b34b5f55576c7ec1e487e39eb04c5da64ad7a1006e939084d6d0c167d2bc5275ded4aa88f91ee2a314121027fab9d61001eba328d64a41394ff6c7d20111cfe6125603b3a402a8a392e2333',
                value: 19205093,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91412da0c1ee9d0e3ae99bc0d03c0389f82e5d55eb288ac',
            },
            {
                prevOut: {
                    txid: 'b130d197258b93961683184a7ea738a47b6b077142bf2f58dac31e26b56f9139',
                    outIdx: 63,
                },
                inputScript:
                    '41afd33612b059e08d9137d1c52153a4293d63e06c29ed82fd234e453748b3dc2d887a87567cfa0e71c173cd1afccfbb4d67073b13f51e3aafb8904378366a2e7f412103812b9b680b5621d0e5a4493bcaf1e6d73c5f2141b193fa7740a5df1bf5c3d2e5',
                value: 30781733,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9145d85e859e9d4e8feb5a618ea903ebf377b54d75e88ac',
            },
            {
                prevOut: {
                    txid: 'e5da66d1a79d4a3377a2a4f17f3d2c57f896a43654e4d4cd04813bc375465df2',
                    outIdx: 49,
                },
                inputScript:
                    '411b68176b5719f9192ad5f36e40ec03d86bc37af85f7fe1b184e12bc49ce03851a61bd1faae069c73ac471a997938640331edfacfd86f01ab65314900ccc93b20412102af2c8eb8dfd66767d20a2afdd600f75112d820737d8bf5147f5d6a11a94689e1',
                value: 7563155,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914d35af95bb47672ead30711dea85ac05bb8a854ac88ac',
            },
            {
                prevOut: {
                    txid: 'e5da66d1a79d4a3377a2a4f17f3d2c57f896a43654e4d4cd04813bc375465df2',
                    outIdx: 62,
                },
                inputScript:
                    '41509fac1d23154ca52bbbed8287f20b81316af0ed83da37383671ef804251e81952c9fdede17a30b8197340f83256f367ed308bb2d26ae9620ea6a117fb634d464121036679c1faac5d79d3292634693cf8aa5de6313859a30a8e024ff03a0ca27756e8',
                value: 11318359,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914b0dec1ba4c6efb18f91167342c3c2988f5dfa75888ac',
            },
            {
                prevOut: {
                    txid: 'e5da66d1a79d4a3377a2a4f17f3d2c57f896a43654e4d4cd04813bc375465df2',
                    outIdx: 68,
                },
                inputScript:
                    '41cdb6a6ee3b61ddd9f46b2dda0658f1ce7d5510401e6be6843dbbbc603fbcad46142176090c2c295967287a6a81cf1c9a27fdc5d1b8c9ea5267e9be4aa91b2bc0412103f2a000ceebf0dcc71b78c2076ceb5298d821f186344ef4ed9752ebfd206d3692',
                value: 14100332,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914e9d34d084b11e4ce88cc9d0869c90c207379f9c988ac',
            },
            {
                prevOut: {
                    txid: 'e5da66d1a79d4a3377a2a4f17f3d2c57f896a43654e4d4cd04813bc375465df2',
                    outIdx: 69,
                },
                inputScript:
                    '4132a8a9642523289a520a19e325820db0a1b1e64d15b1cf122454c59d2960985e6e9fba429d26a759185220f3f9a5a6bfe915d217443bb134af4483f54815441a4121039fbfbb5269555db15811a1160c4b367ea144661791e4590f3c2214d543dad64e',
                value: 14378379,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914cd6a09b5535b40ff022140a471cdc16d0e66da4288ac',
            },
            {
                prevOut: {
                    txid: 'e5da66d1a79d4a3377a2a4f17f3d2c57f896a43654e4d4cd04813bc375465df2',
                    outIdx: 84,
                },
                inputScript:
                    '41acf4a95bd83fbe0c0b853bd82d93bec1333554a4132c7e036175923aa7bf1a96c6aaa5ae6c5347040ca365c1aa24f41eba8ec9154822fac9530d0bef707b93e34121027edf78be3a7f824b1813b82aba7f7be1048817ca5148e9d130e424be56b47730',
                value: 65926662,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914208e9de659ed7c1d4bdff00eda7cd0ffd4b6ceca88ac',
            },
            {
                prevOut: {
                    txid: 'e6356400b1994c772ce0968d3e8ffcc989a2970e87103d0096f4b859721d36f7',
                    outIdx: 20,
                },
                inputScript:
                    '4119da1345166c8694db830101e9608dfe7308c1991768cb65291eea3bc0074f7fc71c7e7995570a0fb93f45cb82738efaa036bfce189f1b6388456b987a965d8d4121038d89d5e03a0d7589d3d6c1c5058ad796be4e4f52baa709f10617de8f9f33690e',
                value: 3472995,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914e10383617cf53b7e9dca0f42e868e2e3dc82502d88ac',
            },
            {
                prevOut: {
                    txid: 'e6356400b1994c772ce0968d3e8ffcc989a2970e87103d0096f4b859721d36f7',
                    outIdx: 24,
                },
                inputScript:
                    '4115e468dc353553fcc0000d682370329814fa7ca2eecac4c84382d799fc471f46d192874bbaca09168742cefbf8ff400cf3dc48d03454ca15bfe8a6608a5a94be41210309a4885102f697f07d003cbb066a93c68446ccf0a1afacec1b40eb2fe5582ee5',
                value: 3836272,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91492c4ba6ddd7501ab82286a9e9615364535e2f3f888ac',
            },
            {
                prevOut: {
                    txid: 'e6356400b1994c772ce0968d3e8ffcc989a2970e87103d0096f4b859721d36f7',
                    outIdx: 26,
                },
                inputScript:
                    '4187e8db9862eed3a1caa1277cb5ad7b98dd35a005e4873b7438a7bf9977c739a68428a630503f46c6298621e5cb5a0390d49e806497e7f00f82ec5504549d948c4121038e774c9432e144b196f92122e67f291cd1bebc704a448bf4d7e156725a1df4d5',
                value: 4277798,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9144e44c948de92c030bb0626208295d73315b8c5e988ac',
            },
            {
                prevOut: {
                    txid: 'e6356400b1994c772ce0968d3e8ffcc989a2970e87103d0096f4b859721d36f7',
                    outIdx: 30,
                },
                inputScript:
                    '4131a686c7274fa77c615ba8bfcb2d7430054f0e81c7302e2c1761b80f0bc5291f0dda9c814297799d79c9866391c7614e677d56ab8c376fc40ca97d3082b5c32b412102a69bbd2a7b05ed30d06be79231078b8054266c141123b9614b3e0e0131ec7805',
                value: 6063080,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914f73e9cf52eb1748d21fcab670fc3e567085685f488ac',
            },
            {
                prevOut: {
                    txid: 'e6356400b1994c772ce0968d3e8ffcc989a2970e87103d0096f4b859721d36f7',
                    outIdx: 57,
                },
                inputScript:
                    '4130a61428674676161422657ae38362f7d71131efe99725bcb59d49dffb976e3739802b0050d3c462c8742eda191f81340273f045b6edbf49956364003c28712e4121032a1b09b6bff6cd9e7a24fe362c2c2601c21987e3cebadae381d8ced9a7f53ea1',
                value: 23507881,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9142cc2ac6f08c48193fbbc5eb69a4540c98f434d9688ac',
            },
            {
                prevOut: {
                    txid: 'e6356400b1994c772ce0968d3e8ffcc989a2970e87103d0096f4b859721d36f7',
                    outIdx: 58,
                },
                inputScript:
                    '41ef5090a88edc015d00612b69ef7185039b94ef6832bcb377cabb8def1ae2d4eeea58b5349591e346ec4947583fff76e79182ee9008e3cfa7a90a864e33678724412103222133f854bc03ddba9e33bf2a835e48cb7104945677912cbb4ed577643fa4aa',
                value: 24929079,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9142cc23fe84f3b64ff7b24c1a0cf354ea583072a0388ac',
            },
            {
                prevOut: {
                    txid: 'e6356400b1994c772ce0968d3e8ffcc989a2970e87103d0096f4b859721d36f7',
                    outIdx: 65,
                },
                inputScript:
                    '417febf2d756ce0e52854d180ee6a4f6face48786ce1cac18cd915de9dcd2d981ac94e2501e15167d707e5a8067cc5efe0a3b17a9cdc27850a0191453bf52d416541210208fd87bf70ab65ac9ebbe050a5c7e3bb8dd31edb21e2aea47d7a146e0ae3f8d2',
                value: 44828158,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9142656de90609eb0cbdd7c4244b3d55d71ceda667b88ac',
            },
            {
                prevOut: {
                    txid: 'ebd049fda7294f2fe0890cda4b37aa76392b1cad9e159ed5e91bf25daa73552b',
                    outIdx: 27,
                },
                inputScript:
                    '41b93878fb3a450cae4ba3d51076b002cd8f57aca1e3571bef90ab66f94bd05396d7b25e2e46a664f5c17c4fc5ad27f02d5bf5406d588e02b54a774ec627e4e698412103067a6da11957d765e831d47e6dee1a45e59aa28f60500a39bb158157c3eb1509',
                value: 15070744,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914f7c311ddfc0ed8a87d8a699df9c9acbb98720d2b88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a0446555a0020194246d7e7a3e1c8b88559ee210b390ceb8b9ab82f860d9c9d6f9daa01f6c82f',
            },
            {
                value: 165265,
                outputScript:
                    '76a914d0a105a83b6c44147cf2b4c5b5c8a3c75de1163e88ac',
            },
            {
                value: 415331,
                outputScript:
                    '76a914ca82960460fd35b5a59b2c6bf6372f3ad171bcb988ac',
                spentBy: {
                    txid: '1edc89d04563375cb42b3a7f20f29154669b74409a553a220a132bc5279bf69f',
                    outIdx: 41,
                },
            },
            {
                value: 513772,
                outputScript:
                    '76a9143505593cb0094cece0165201c1b5320e8e0e88cb88ac',
            },
            {
                value: 620346,
                outputScript:
                    '76a9144523d89bee4b8481f9111865bfabcedf70d5f73488ac',
                spentBy: {
                    txid: '4ec1e8ee8b8d543856747abf5d6f1bc0886eebb327ae8d1903fbc109a56b5c69',
                    outIdx: 47,
                },
            },
            {
                value: 745522,
                outputScript:
                    '76a914e0577e495872e411ec85bb2db60c08bd41d970c788ac',
            },
            {
                value: 951733,
                outputScript:
                    '76a9142884eb394c83672e40e24eed0d9f2532def1df2488ac',
            },
            {
                value: 977317,
                outputScript:
                    '76a9143cdaf26959fe02da6dd9b1ecf57fdc8e70f80def88ac',
            },
            {
                value: 1637364,
                outputScript:
                    '76a9149f30bd564d189088a41af3298dc5e87b33482d6188ac',
                spentBy: {
                    txid: '32d48f0606578ff1789ab579f2e733d9d5b7504aa42fc20a76a23cbfa93af57e',
                    outIdx: 51,
                },
            },
            {
                value: 1709164,
                outputScript:
                    '76a91456341f200e54c76f06fff1e610603d489e87e2ed88ac',
                spentBy: {
                    txid: 'dd5fa01b7aea079e5898968e4dcb89a54d2feab880805f9a49878ec038849685',
                    outIdx: 43,
                },
            },
            {
                value: 1734037,
                outputScript:
                    '76a914deda3755e569aa7ad431b679376465e234c1ab0e88ac',
            },
            {
                value: 1787574,
                outputScript:
                    '76a914e577b97b63b684ff4bce76638b39e9bf7337391a88ac',
            },
            {
                value: 1794906,
                outputScript:
                    '76a914122e9d948f848e322accc989c63b68b1f1f4a27e88ac',
            },
            {
                value: 1809132,
                outputScript:
                    '76a914d2d288f72d59325aa7a93f378456416b35c1089488ac',
            },
            {
                value: 1830109,
                outputScript:
                    '76a91437ff7ce27ff184efda22c428d870713d7071531788ac',
            },
            {
                value: 2048566,
                outputScript:
                    '76a91471a3f02e0e7c1bd4b6c06a72aeeb9aef3c84226888ac',
            },
            {
                value: 2179080,
                outputScript:
                    '76a9147133b978e3d9c4004ef8c8e288395f86a4ca64fc88ac',
                spentBy: {
                    txid: '4ec1e8ee8b8d543856747abf5d6f1bc0886eebb327ae8d1903fbc109a56b5c69',
                    outIdx: 48,
                },
            },
            {
                value: 2390444,
                outputScript:
                    '76a914f974ac8c5784b78316c66ee06720d6694b6a454288ac',
                spentBy: {
                    txid: 'dd5fa01b7aea079e5898968e4dcb89a54d2feab880805f9a49878ec038849685',
                    outIdx: 44,
                },
            },
            {
                value: 2911412,
                outputScript:
                    '76a914f2a178204a2efeaa652ed11df741ff13c715014388ac',
            },
            {
                value: 2966953,
                outputScript:
                    '76a9144b8bcd98ebee333f0018b11071e8308fbe95554e88ac',
            },
            {
                value: 3004755,
                outputScript:
                    '76a914d68020a4bb2d9f6cdb6516938c1b1f4c4b6a4efd88ac',
                spentBy: {
                    txid: 'dd5fa01b7aea079e5898968e4dcb89a54d2feab880805f9a49878ec038849685',
                    outIdx: 45,
                },
            },
            {
                value: 3143178,
                outputScript:
                    '76a91413fe018b9d729cb23e86628d04365ea77e8d443888ac',
            },
            {
                value: 3199496,
                outputScript:
                    '76a914a72c7bf5b4661af684c4990af751bdc9cdb871cf88ac',
            },
            {
                value: 3258788,
                outputScript:
                    '76a914f339d9aff74cb1bd22d600e38d09b0649225317d88ac',
                spentBy: {
                    txid: '1edc89d04563375cb42b3a7f20f29154669b74409a553a220a132bc5279bf69f',
                    outIdx: 42,
                },
            },
            {
                value: 3270709,
                outputScript:
                    '76a914ea8762d67b8ba330a86703abfb4a0eed28719f1b88ac',
                spentBy: {
                    txid: '4ec1e8ee8b8d543856747abf5d6f1bc0886eebb327ae8d1903fbc109a56b5c69',
                    outIdx: 49,
                },
            },
            {
                value: 3428216,
                outputScript:
                    '76a9141021bc93de524c2b76c8ff770f1db96a11dd07eb88ac',
                spentBy: {
                    txid: '32d48f0606578ff1789ab579f2e733d9d5b7504aa42fc20a76a23cbfa93af57e',
                    outIdx: 52,
                },
            },
            {
                value: 3634054,
                outputScript:
                    '76a9146a224d728e90a9796fdb2dde295788453a0121c788ac',
            },
            {
                value: 3806325,
                outputScript:
                    '76a914b0f96288a5544986d45a5d67992b52534e61585a88ac',
                spentBy: {
                    txid: '4ec1e8ee8b8d543856747abf5d6f1bc0886eebb327ae8d1903fbc109a56b5c69',
                    outIdx: 50,
                },
            },
            {
                value: 3961600,
                outputScript:
                    '76a914581217d2826ef7cdfe158da53797752d1b1a84fa88ac',
            },
            {
                value: 4188894,
                outputScript:
                    '76a914dae3359f7056323a08cfb480334a8b4543cc7caf88ac',
            },
            {
                value: 4417013,
                outputScript:
                    '76a914d6dcbb2c33b936e7f4e2d38b9782ee9c4bcc370d88ac',
            },
            {
                value: 4496101,
                outputScript:
                    '76a91487f03b804d802f3ee5357149c4d192d6150c254088ac',
            },
            {
                value: 5142036,
                outputScript:
                    '76a9142c5c4f436e1e0adc06592e188dff7731600b9c3a88ac',
            },
            {
                value: 5192325,
                outputScript:
                    '76a9140817b0b24e07482730af2f30b5b5811a905071b388ac',
            },
            {
                value: 5219666,
                outputScript:
                    '76a914cfa9bc00c9d7fa1932b786986f10082af9c6b48f88ac',
            },
            {
                value: 5350325,
                outputScript:
                    '76a914d34f5216d288ab84cf5ef3e2675fac013c82408b88ac',
            },
            {
                value: 5525456,
                outputScript:
                    '76a914a046783da29e24286e887bec2be51e776e56ec6f88ac',
                spentBy: {
                    txid: 'dd5fa01b7aea079e5898968e4dcb89a54d2feab880805f9a49878ec038849685',
                    outIdx: 46,
                },
            },
            {
                value: 5576379,
                outputScript:
                    '76a914bfc31c471ae0929046880f56977bce04bafce82a88ac',
            },
            {
                value: 5882456,
                outputScript:
                    '76a914633e45a98df30365d95b560a5dece001d40da15788ac',
            },
            {
                value: 6227395,
                outputScript:
                    '76a91474615b2ba0fb2c37106aa0ff42f6213af036d45788ac',
            },
            {
                value: 6337179,
                outputScript:
                    '76a914764ca1c4108ecb20e0daad7b8e3ecf64da8a546a88ac',
                spentBy: {
                    txid: '1edc89d04563375cb42b3a7f20f29154669b74409a553a220a132bc5279bf69f',
                    outIdx: 43,
                },
            },
            {
                value: 6464974,
                outputScript:
                    '76a914e32dd21a1b04ffcfb3b4d6a2a78c1bf1c1e1c63d88ac',
            },
            {
                value: 6529342,
                outputScript:
                    '76a914c4eefae07113114399c503d5663154c1563aae8288ac',
            },
            {
                value: 6560940,
                outputScript:
                    '76a91454ecb17cfe67b65105f09c5ee7d1fe066d5340ae88ac',
            },
            {
                value: 6622255,
                outputScript:
                    '76a91426e17f7957ac242c076351839cb02ae879c9412e88ac',
            },
            {
                value: 6649523,
                outputScript:
                    '76a914ad2d233aad04cc481b19ead6a15b37ae865c33d588ac',
            },
            {
                value: 6966573,
                outputScript:
                    '76a914294aa90705c956c74700c97a92d7ce219bc8088088ac',
                spentBy: {
                    txid: '4ec1e8ee8b8d543856747abf5d6f1bc0886eebb327ae8d1903fbc109a56b5c69',
                    outIdx: 51,
                },
            },
            {
                value: 7237077,
                outputScript:
                    '76a914b55a3f80593d1ef2b85dc25e20335347871b28c488ac',
                spentBy: {
                    txid: '1edc89d04563375cb42b3a7f20f29154669b74409a553a220a132bc5279bf69f',
                    outIdx: 44,
                },
            },
            {
                value: 7247037,
                outputScript:
                    '76a91409360004e44bb8b116cfd70301cb3e58c85bdc6e88ac',
            },
            {
                value: 7571632,
                outputScript:
                    '76a914b746811bdaf55f875770cd78b068209ed987323788ac',
            },
            {
                value: 7936466,
                outputScript:
                    '76a9147eadf036427bcf114711bd09f1c6cd71f7d99a5988ac',
                spentBy: {
                    txid: '32d48f0606578ff1789ab579f2e733d9d5b7504aa42fc20a76a23cbfa93af57e',
                    outIdx: 53,
                },
            },
            {
                value: 9483487,
                outputScript:
                    '76a91471308336e8b5e92ac1e57414e9f0a025b2a5019888ac',
            },
            {
                value: 9577280,
                outputScript:
                    '76a914e85d5b1a53a128308e326aad645027b2c8c4ac2788ac',
                spentBy: {
                    txid: 'dd5fa01b7aea079e5898968e4dcb89a54d2feab880805f9a49878ec038849685',
                    outIdx: 47,
                },
            },
            {
                value: 9828407,
                outputScript:
                    '76a91488528685bbe4c696b58c8b6d5411606bcb3cc63888ac',
            },
            {
                value: 10210178,
                outputScript:
                    '76a914d1ac9f7674d3881fa7675a552691d4a433aeb38e88ac',
                spentBy: {
                    txid: 'dd5fa01b7aea079e5898968e4dcb89a54d2feab880805f9a49878ec038849685',
                    outIdx: 48,
                },
            },
            {
                value: 10402019,
                outputScript:
                    '76a9146674b3bdf74ae56d356815b40821385e23b88cdc88ac',
            },
            {
                value: 10651856,
                outputScript:
                    '76a914269454c951ad997703c868cab35a8a80a87dc54e88ac',
            },
            {
                value: 11003947,
                outputScript:
                    '76a9147b8c09c622dcfca426b5b9c46680b80265ee9c5c88ac',
                spentBy: {
                    txid: '32d48f0606578ff1789ab579f2e733d9d5b7504aa42fc20a76a23cbfa93af57e',
                    outIdx: 54,
                },
            },
            {
                value: 11036265,
                outputScript:
                    '76a914fd793cd1790bcc882cdd531f085353bd9cceee7088ac',
            },
            {
                value: 11983981,
                outputScript:
                    '76a914f3983d2e5ce9a94f386c17f4526665ed8fc776bf88ac',
            },
            {
                value: 12224144,
                outputScript:
                    '76a914f4f21ca1c5cdc979bc0d88de0e6a4faaae77affe88ac',
            },
            {
                value: 12434515,
                outputScript:
                    '76a914047e120012f39c07127dc9dcce6490c1b3af613288ac',
            },
            {
                value: 12544565,
                outputScript:
                    '76a91498884aa69b0213b32dd58f4bcf9d76edde2f796a88ac',
            },
            {
                value: 13856128,
                outputScript:
                    '76a9146a1d4ac47decfd68e4223e6932d2d27797429a2f88ac',
                spentBy: {
                    txid: '32d48f0606578ff1789ab579f2e733d9d5b7504aa42fc20a76a23cbfa93af57e',
                    outIdx: 55,
                },
            },
            {
                value: 13926555,
                outputScript:
                    '76a9147c8467c80862216ceed083263064dee5a285eff088ac',
            },
            {
                value: 13953640,
                outputScript:
                    '76a914e815252fbb0c8649aa03851e828e6d6ce554ca8188ac',
            },
            {
                value: 14604288,
                outputScript:
                    '76a914c6f3e86c0b5be88b5dea5c5f97f8898d83dde84b88ac',
            },
            {
                value: 14796850,
                outputScript:
                    '76a914f18a494b498b8893efac9877c58259f9f956df3488ac',
            },
            {
                value: 15003691,
                outputScript:
                    '76a9144b8093c3ddf67df71ad3a55d6a1f786f07c6e9f388ac',
            },
            {
                value: 15069088,
                outputScript:
                    '76a914e7b2d4e1a0269e16e506b9532e8d0fcd6146f38988ac',
                spentBy: {
                    txid: 'dd5fa01b7aea079e5898968e4dcb89a54d2feab880805f9a49878ec038849685',
                    outIdx: 49,
                },
            },
            {
                value: 15542738,
                outputScript:
                    '76a9148f2abbbc1531b363b250cd45748ab017230d971d88ac',
                spentBy: {
                    txid: '1edc89d04563375cb42b3a7f20f29154669b74409a553a220a132bc5279bf69f',
                    outIdx: 45,
                },
            },
            {
                value: 16694191,
                outputScript:
                    '76a914158f31b3ec66a43d8115e4711cfe2a8623ca513688ac',
            },
            {
                value: 16936236,
                outputScript:
                    '76a914d0b8bee8deb1e0c45128d6da73bb3a88f583cf5188ac',
            },
            {
                value: 17419891,
                outputScript:
                    '76a914496bfb89eeaf405b4cabb03705c65246414f8f9088ac',
            },
            {
                value: 17878439,
                outputScript:
                    '76a914320a5c0c0c17172aa799df5e9f01fcfe34cc8acc88ac',
            },
            {
                value: 18203996,
                outputScript:
                    '76a9149c532629e3bbd6b5df9fa7b2a3a8cc447a9c96b088ac',
            },
            {
                value: 18343505,
                outputScript:
                    '76a9140c15e03cb7db4f39a4c5dc5318a1e8a5b3c6c9ce88ac',
                spentBy: {
                    txid: '1edc89d04563375cb42b3a7f20f29154669b74409a553a220a132bc5279bf69f',
                    outIdx: 46,
                },
            },
            {
                value: 20055678,
                outputScript:
                    '76a914d82b642270c662ad12ba298b677d543deb27b4bf88ac',
            },
            {
                value: 21519776,
                outputScript:
                    '76a914da876799bf44f7eee7c17a0628223caa24b9dd6e88ac',
            },
            {
                value: 22638667,
                outputScript:
                    '76a9140f6308b30e5406711fe10ff4d091c35168d83b0388ac',
            },
            {
                value: 23648127,
                outputScript:
                    '76a914283acdf34fe0b72b8c668057ef09e68de883f1dc88ac',
                spentBy: {
                    txid: '4ec1e8ee8b8d543856747abf5d6f1bc0886eebb327ae8d1903fbc109a56b5c69',
                    outIdx: 52,
                },
            },
            {
                value: 24750932,
                outputScript:
                    '76a9149213d8dfdafe9925f3c3005ab195c0b9dec4b94888ac',
            },
            {
                value: 33183717,
                outputScript:
                    '76a91495d307ac4c97d450c8e8520a40478cfdb7631cf988ac',
                spentBy: {
                    txid: '1edc89d04563375cb42b3a7f20f29154669b74409a553a220a132bc5279bf69f',
                    outIdx: 47,
                },
            },
            {
                value: 38734503,
                outputScript:
                    '76a9143a6425c522cbfee2ee3892d77734ff4170bae1fe88ac',
            },
            {
                value: 69219464,
                outputScript:
                    '76a9140f20b1267a5ab07ba65f860285c5f8c4a726ee2288ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1728974402,
        size: 10810,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 866659,
            hash: '0000000000000000108f9dce76f6ee3060c72c0f5643febcf9eaf6bcb40704f2',
            timestamp: 1728974999,
        },
    },
    // Token tx
    // df956d36c9a7c3540eeee22955e1d95c450dd931939a9d54fcd21e56c40e8a38
    {
        txid: 'df956d36c9a7c3540eeee22955e1d95c450dd931939a9d54fcd21e56c40e8a38',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'da3c897eb6d4e5299cb3ae2d8235d46632647303eab61236a1072885d5e56d66',
                    outIdx: 2,
                },
                inputScript:
                    '41d3e2a6b3b740a0b79fcf437b4a4bf5a8d7b97d9295236aef0de5d08f3b757e7386328ae2b702bf469b69d115eada9c2f4871075bcabee76e59635321056e802a4121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
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
                    amount: '999756000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
            {
                prevOut: {
                    txid: 'b90c07e196fa5c18d9f4ba056a962732254c2f6bd7ec63e579f4990160c894ed',
                    outIdx: 301,
                },
                inputScript:
                    '41d6b0dc3a7426777555d9f824c5c508c2c7b46d5a8d3f30864bb7377aa17f5c2fda0ba3951559cef4100b79b9070a32faa31e8047825dc47889f7cffca8fd028b4121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                value: 4300,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000002540be4000800038d4381321400',
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
                    amount: '10000000000',
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
                    amount: '999746000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 2815,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1728941100,
        size: 467,
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
            height: 866601,
            hash: '000000000000000004cf8ec8f13467a6469b2647702928767d70fac936f64494',
            timestamp: 1728941119,
        },
    },
    // Binance hot wallet withdrawal
    {
        txid: '8d096fac948cbd65eea8c399182f169bdff891f5a8fd799c5e495c82f62a5dce',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '695e60f49e8959f740468dbc9273ceef7d0c1e33d50c03364890e9d8582a2441',
                    outIdx: 1,
                },
                inputScript:
                    '47304402202be54e9bb516220fd0bc48755e50374ca274b10325b896657d898849b3abc0b902201eb90668fdac9fb3133810b645f1b95ac5c8a2d410727eea355bcb07c13d48bd412103562731a08eb23e6260b516c4564f746033e9080bc9f61ad2158a63927500b8b1',
                value: 2016227,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
            },
        ],
        outputs: [
            {
                value: 1972000,
                outputScript:
                    '76a9145f41a47e1a4a86143ea999604cc504a3f19dc67088ac',
            },
            {
                value: 44001,
                outputScript:
                    '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1728985099,
        size: 225,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 866672,
            hash: '00000000000000000f43f2da867ec399fe7c2ff3c7406c1f1a16f2d726771009',
            timestamp: 1728985449,
        },
    },
];

const tokenInfoMap = new Map([
    [
        '04009a8be347f21a1122964c3226b99c36a9bd755c5a450a53848471a2466103',
        {
            tokenTicker: 'PRP',
            tokenName: 'Perpetua',
            url: 'https://cashtab.com/',
            decimals: 0,
            hash: '',
        },
    ],
    [
        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
        {
            tokenTicker: 'VSP',
            tokenName: 'Vespene Gas',
            url: 'https://simple.wikipedia.org/wiki/StarCraft#Gameplay',
            decimals: 9,
            hash: '',
        },
    ],
    [
        '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
        {
            tokenTicker: 'BUX',
            tokenName: 'Badger Universal Token',
            url: 'https://bux.digital',
            decimals: 4,
            mintVaultScripthash: '08d6edf91c7b93d18306d3b8244587e43f11df4b',
            hash: '',
        },
    ],
    [
        '1862df58210237873e05d76d9cd5a73c32611860fce9ad1784e688a08e481747',
        {
            tokenTicker: 'RMZsmoke',
            tokenName: 'Xoloitzcuintli NFT Cigar Collection.',
            url: 'https://xolosarmy.xyz',
            decimals: 0,
            hash: '31dd442b9e47cf7224f78f8fce5ca940e34a6c0674100ebc426aa63d9c81e33c',
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
        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
        {
            tokenTicker: 'BULL',
            tokenName: 'Bull',
            url: 'https://cashtab.com/',
            decimals: 0,
            hash: '',
        },
    ],
    [
        '4902178c8ed20bab8984431654501942e76cb651d680559ff83627154958bfec',
        {
            tokenTicker: 'CSA',
            tokenName: 'Confederate States of America',
            url: 'en.wikipedia.org/wiki/Flags_of_the_Confederate_States_of_America',
            decimals: 0,
            hash: 'da0c0350fd3605a1b304824f5b45e778661e298623057db4ef319c18ea0bf848',
        },
    ],
    [
        'de75efed4ef6026c52738178c71eca1dfe014d44d243ab9ae54d79cf6c96345a',
        {
            tokenTicker: 'RMZPOP',
            tokenName: 'xolosArmyPOP',
            url: 'https://xolosarmy.xyz',
            decimals: 0,
            hash: '2d72db4f217a2d3e032b80ccaad07403f21031be120135ed7f49873e86bee712',
        },
    ],
    [
        '78efa5177e99bf05b48948ac7e23e6cc2255764e52ccf7092afb979a766dee2c',
        {
            tokenTicker: 'RMZPOP',
            tokenName: 'xolosArmyPOP',
            url: 'https://www.xolosramirez.com',
            decimals: 0,
            hash: '23a364688e4037ab91e5d8d7def3617eea49868ff9b02a7040ce1a5733742f89',
        },
    ],
    [
        '8fd3f14abd2b176a1d4bd5136542cd2a7ba3df0e11947dd19326c9d1cd81ae09',
        {
            tokenTicker: 'RMZsmoke',
            tokenName: 'Xoloitzcuintli NFT Cigar Collection.',
            url: 'https://xolosarmy.xyz',
            decimals: 0,
            hash: '4d30cbe67a02b58b7e1ae1f80b362fe7e9064ae69306d0d9e4614a7dbe72420e',
        },
    ],
    [
        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
        {
            tokenTicker: 'FLAGS',
            tokenName: 'Flags',
            url: 'cashtab.com',
            decimals: 0,
            hash: '10b8a6aa2fa7b6dd9ebae9018851bf25bd84c14c80de3ee2bfd0badef668b90c',
        },
    ],
]);

module.exports = { dailyTxs, tokenInfoMap };
