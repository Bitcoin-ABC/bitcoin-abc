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
module.exports = [
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
    // CashFusion tx
    // Note, this is also an app tx
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
