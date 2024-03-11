// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for transactions.js unit tests

import {
    wallet,
    walletWithCoinbaseUtxos,
    utxosAtManyAddressesWallet,
    walletWithInvalidPrivateKey,
    allTheXecWallet,
    walletWithTokensNNG,
    walletWithTokensInNode,
} from './mocks';
import { BN } from 'slp-mdm';

import { getCashtabMsgTargetOutput } from 'opreturn';
const OP_RETURN_CASHTAB_MSG_TEST = getCashtabMsgTargetOutput('test');

export const sendXecVectors = {
    txs: [
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2pkh address',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: '191ea0bff422cfd7bf9d717e3287e1a4f4441b7c70fac4ef270767da3917362a',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a47304402202747b4da71786b3305b39d17531824ade98db589f032a59ddd8da7166df4f6b202200c6fb9fa6a9d5da69dbfff1c1ff64fd049371ca27e3c3984723d630190c2a22e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acde5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2pkh address if all utxos are mature coinbase utxos',
            wallet: walletWithCoinbaseUtxos,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800100,
            txid: '191ea0bff422cfd7bf9d717e3287e1a4f4441b7c70fac4ef270767da3917362a',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a47304402202747b4da71786b3305b39d17531824ade98db589f032a59ddd8da7166df4f6b202200c6fb9fa6a9d5da69dbfff1c1ff64fd049371ca27e3c3984723d630190c2a22e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acde5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2pkh address with an OP_RETURN output',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
                OP_RETURN_CASHTAB_MSG_TEST,
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: '51f2a0e23b044fe0c59daab999b9c08f0d6f12f5bb04423e492c857090b8056a',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006b483045022100a5478c4caeb466f626c93a76458b230a51960d225ba5d94fecdd0b72126a0c7e0220659c227139b8487a467490328ce870e06d30c96ddf906eed05ae9cff4ffad1034121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff03e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac00000000000000000b6a04007461620474657374ca5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2pkh address with an OP_RETURN output at index 0',
            wallet,
            targetOutputs: [
                OP_RETURN_CASHTAB_MSG_TEST,
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: 'bdc08939fe6c7369fb90830c66f131027ad32ba7bf58937bf35fe7c11876c46d',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006b483045022100c10e4b2b58d7630a35d576a3ea69d2ee1525f947da3d633af04e51f5ccd89331022079840fe09cbcc0a64665e52b61933b29d7a260d838c38c0493f1f8cedd19d99f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0300000000000000000b6a04007461620474657374e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acca5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2sh address',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: '0cd47c6394d05ee5a8cd16917a0d96a72398e884c591b4a2742901719926b57e',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006b483045022100af83987031c7f4c2f1b1543231fcff3fcad9f35db6acfe2721b8dd8d3253afb9022033c35b2b5af7a579ba7b5a1abb8c73798bc0b031bd0d8fb76edea740652d839b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e80300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087de5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description: '1000 satoshis with 1 change output at 10 sat/byte',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 10,
            chaintipBlockheight: 800000,
            txid: 'b1faabda647bf8522f2ca7ce33c7ad8cbc53e25d6748d142bffb518773c324e5',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006b483045022100fb6dc48017c8cc2d9574954896f76314046edea9b0f385a8a49fa0ce9e820c5402202b717f35123dd96e04000d0e8c3bc1dbbe2ccdc79f5165d1710b78c97ec80ed44121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acec540000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description: '1 satoshi per byte tx with no change outputs',
            wallet,
            targetOutputs: [
                {
                    value: 24808,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: 'fba198e5408be4b1c94537cc56718f552bad45e2204664694dd21f714440c26b',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006b483045022100ea4fab2661d0eb1aaf56c977ed252e8b66473d6e61f9e1be2f5a6d0735f37f960220061abf94ac1e45a6123a10dc211699336e0b0561f0d82c2eea0e719750444cc64121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff01e8600000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac00000000',
        },
        {
            description:
                '1 satoshi per byte tx with no change outputs from a wallet with utxos at many addresses',
            wallet: utxosAtManyAddressesWallet,
            targetOutputs: [
                {
                    value: 24808,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: 'c202537cc6ee431ae33c45b15711bab315b371017712560827e6756959793d12',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006b483045022100c5106a03fabe0443ac10124fb8c05d5ae261a824be8a2b2c53b2f1d06a89f8d30220289574dbfada139cff50dee6d28faeaae597d484c7e7694873c00dd3a936a7c3412103939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5ffffffff01e8600000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac00000000',
        },
        {
            description:
                '1 satoshi per byte tx broadcast actually broadcast with this function',
            wallet,
            targetOutputs: [
                {
                    value: 88800,
                    address: 'ecash:qzr03ye2jhrxmw97g9hv4s05364qgsdqzsjre4krry',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: '4eb8f2270382980e1985af7aa5a63425125f8c0d72197bb430aa72815eed76b3',
            hex: '0200000002c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006b48304502210082afba29dffdb4cdeb56a9e95645a5dc2ddb3df943d865130981764eebdb9b7602202f856b32409254918fc3e5610fc49a21b5a1a3e1220663a8b342c6a05c52d8604121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff09fb259435ad29ff0a032d6fe5063d0e0172f68ce48a38756a3a2935ff061490000000006a473044022048ac572098b153e4e4655380155c20bf212478ec19e7f1d78a7131e7aa8f312f022076ec580062fa1ea949697dcb3cbd420877a541d47bc05533bfa96745578896ed4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e05a0100000000001976a91486f8932a95c66db8be416ecac1f48eaa0441a01488acf28b0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                'No precision error using JS Number on utxo with highest theoretically possible value',
            wallet: allTheXecWallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: '9452c8bf3ea076b08cc8e4406ad9e89931e8fd56a186c3748c89313672417fc6',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a47304402201a818403a778080889838fb52eaac57a699c0c8b80759cf93e368358711b6afa02207b5c34613aed786ed0a86b7a09ca53f75b6a671c1abd6d5e99655f67feb3dfec4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac363b075af07507001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '15000 satoshis with 1 change output at 1 sat/byte to 5 p2pkh addresses',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
                {
                    value: 2000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
                {
                    value: 3000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
                {
                    value: 4000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
                {
                    value: 5000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: '3d6bdd6a8046caf0cc9cbae83630c8aac3623bb880d32c868e95488fdbf91642',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a47304402205ae8715032f7e8fde77411ba3483734809af011cd04787630742aa1dc1d7af5e0220583e536bceac18e9630b76cc2cbfd2c224009425f0d879dd5bc1bc3d755ab8e14121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff06e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acd0070000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acb80b0000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88aca00f0000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac88130000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88aca6250000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '15000 satoshis with 1 change output at 1 sat/byte to 5 p2sh outputs',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                },
                {
                    value: 2000,
                    address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                },
                {
                    value: 3000,
                    address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                },
                {
                    value: 4000,
                    address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                },
                {
                    value: 5000,
                    address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            txid: 'ab1e70e690cb084a96e00b56ca490fd9fc8ece07cc0572f12a2abbd836226897',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a473044022014a4f31eded5abd7b4db4c6801e2570d3a84fbdd8de029b738bdae4f6e0a2f270220155ea2c523e000b388539d561d8ad3ed94eb2ba1c8a0cf97009dade106bb7cd84121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff06e80300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087d00700000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087b80b00000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087a00f00000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087881300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087a6250000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
    ],
    errors: [
        {
            description: 'Sending below dust threshold',
            wallet,
            targetOutputs: [
                {
                    value: 545,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            msg: 'Transaction output amount must be at least the dust threshold of 546 satoshis',
            hex: undefined,
        },
        {
            description: 'Sending above wallet balance',
            wallet,
            targetOutputs: [
                {
                    value: wallet.state.balanceSats + 1,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            msg: 'Insufficient funds',
            hex: undefined,
        },
        {
            description:
                'Sending within wallet balance but insufficient to cover fee',
            wallet,
            targetOutputs: [
                {
                    value: wallet.state.balanceSats - 50,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            msg: 'Insufficient funds',
            hex: undefined,
        },
        {
            description:
                'Attempting to create a tx with fee rate below 1 sat/byte',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 0.5,
            chaintipBlockheight: 800000,
            msg: 'feeRate must be a number >= 1',
            hex: undefined,
        },
        {
            description:
                'Tx with utxos for which the wallet has no private keys',
            wallet: walletWithInvalidPrivateKey,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            msg: 'Invalid checksum',
            hex: undefined,
        },
        {
            description: 'throws broadcast error from the node',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800000,
            msg: 'txn-mempool-conflict (code 18)',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a47304402202747b4da71786b3305b39d17531824ade98db589f032a59ddd8da7166df4f6b202200c6fb9fa6a9d5da69dbfff1c1ff64fd049371ca27e3c3984723d630190c2a22e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acde5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description: 'Insufficient balance due to immature coinbase utxos',
            wallet: walletWithCoinbaseUtxos,
            targetOutputs: [
                {
                    value: 1000,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            chaintipBlockheight: 800099,
            msg: 'Insufficient funds',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a47304402202747b4da71786b3305b39d17531824ade98db589f032a59ddd8da7166df4f6b202200c6fb9fa6a9d5da69dbfff1c1ff64fd049371ca27e3c3984723d630190c2a22e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acde5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
    ],
};

export const getMultisendTargetOutputsVectors = {
    formedOutputs: [
        {
            description: 'Airdrop',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,150\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035,50\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6,150\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj,4400\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly,50\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m,200`,
            targetOutputs: [
                {
                    address: 'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    value: 15000,
                },
                {
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    value: 5000,
                },
                {
                    address: 'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                    value: 15000,
                },
                {
                    address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    value: 440000,
                },
                {
                    address: 'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                    value: 5000,
                },
                {
                    address: 'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                    value: 20000,
                },
            ],
        },
        {
            description:
                'Multisend format with extra space around address and value',
            userMultisendInput: `   ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr   ,   150\n   ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035 ,     50       `,
            targetOutputs: [
                {
                    address: 'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    value: 15000,
                },
                {
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    value: 5000,
                },
            ],
        },
        {
            description: 'One address in multi format',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,150`,
            targetOutputs: [
                {
                    address: 'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    value: 15000,
                },
            ],
        },
        {
            description: 'Multisend including a non-integer JS result',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,151.52\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6,151.52\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj,4444.44\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly,50.51\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m,202.02`,
            targetOutputs: [
                {
                    address: 'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    value: 15152,
                },
                {
                    address: 'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                    value: 15152,
                },
                {
                    address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    value: 444444,
                },
                {
                    address: 'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                    value: 5051,
                },
                {
                    address: 'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                    value: 20202,
                },
            ],
        },
    ],
    errors: [
        {
            description: 'Invalid multisend input (dust)',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,3`,
            msg: 'Invalid input for Cashtab multisend tx',
        },
        {
            description: 'Too many decimal places',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,200.123`,
            msg: 'Invalid input for Cashtab multisend tx',
        },
        {
            description: 'Use of comma as decimal place marker',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,200,12`,
            msg: 'Invalid input for Cashtab multisend tx',
        },
        {
            description: 'Too many commas on one line',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,200.12,foobar`,
            msg: 'Invalid input for Cashtab multisend tx',
        },
    ],
};

export const ignoreUnspendableUtxosVectors = {
    expectedReturns: [
        {
            description: 'Array with no coinbase utxos returned unchanged',
            chaintipBlockheight: 800000,
            unfilteredUtxos: [
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
            ],
            spendableUtxos: [
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
            ],
        },
        {
            description:
                'Array with immature coinbase utxo returned without immature coinbase utxo',
            chaintipBlockheight: 800000,
            unfilteredUtxos: [
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: true, blockHeight: 800000 },
            ],
            spendableUtxos: [
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
            ],
        },
        {
            description:
                'Array with some immature coinbase utxos and some mature coinbase utxos returned without immature coinbase utxo',
            chaintipBlockheight: 800000,
            unfilteredUtxos: [
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: true, blockHeight: 799900 }, // just mature
                { isCoinbase: true, blockHeight: 800000 }, // immature
                { isCoinbase: true, blockHeight: 799901 }, // immature
                { isCoinbase: true, blockHeight: 799999 }, // immature
            ],
            spendableUtxos: [
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: true, blockHeight: 799900 }, // just mature
            ],
        },
        {
            description:
                'If blockheight is zero, all coinbase utxos are removed',
            chaintipBlockheight: 0,
            unfilteredUtxos: [
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: true, blockHeight: 800000 },
                { isCoinbase: true, blockHeight: 800000 },
                { isCoinbase: true, blockHeight: 800000 },
            ],
            spendableUtxos: [
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
                { isCoinbase: false, blockHeight: 800000 },
            ],
        },
    ],
};

export const sendSlp = {
    expectedReturnsNng: [
        {
            description: 'SLP send and BURN with token change, NNG utxo shape',
            wallet: walletWithTokensNNG,
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            sendQty: '10',
            destinationAddress:
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            feeRate: 1,
            chaintipBlockheight: 800000,
            tokenInputs: [
                {
                    outpoint: {
                        txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                        outIdx: 1,
                    },
                    value: '546',
                    slpToken: {
                        amount: '1000000000',
                        isMintBaton: false,
                    },
                    address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    decimals: 9,
                },
                {
                    outpoint: {
                        txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                        outIdx: 1,
                    },
                    value: '546',
                    slpToken: {
                        amount: '9999996998999999999',
                        isMintBaton: false,
                    },
                    address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    decimals: 9,
                },
            ],
            sendAmounts: [new BN('10000000000'), new BN('9999996989999999999')],
            txid: '19a6d3a3fd4a2f86e2407e5f5744c59fa83fea0cc56409349a61f74d17bd7c81',
            hex: '020000000399b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006b483045022100c1d28fbda26eceec043e2f2107fee83808ceec8a53d7638306c6c28ef7200c3b02204bf4f18db54ac6f7c1dfd75a6d6677527394a6da6d13be327f763c0bc10acfd3412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006b483045022100d2a89ff0961da6d71e60a49fb70b1d01bc1eeb6f49a161327791d51c353cccf402206a2648d4bb835af3e8880dbf2ee20db639198571e85aad92042aef18dc984646412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006b483045022100f4710ca71d3e2f2990533eeacc506efa9d310147e3fc9679736dfa6d3e0d26ec0220654cc8ed416e127d46f9f3c3ff0b20e8b103fb1676e09495fe089e57e0225855412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff040000000000000000406a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a140800000002540be400088ac72047b7ecebff22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88accb3f0f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000399b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006b4830450221008aae68b021d60569d5220a7d7ca3be936b88536a31570c8f0ca3be1f8ea6b7cd02207105fcb771741b60c79c2fb99f0b3e7449cb1c7b033318646560c9456a6670bb412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006a4730440220728466abc63c17670d333342e446f2924b2549bcb7d3d94d9f6a4aabdf72d6be02201fde6bb71a14bd801a7156c32360e3701c680105e590874a7fcd96990fa5803d412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006a47304402206babdfd43eb1027c036e50510f78921217b690af74baa32ccda8905a3dadee6202201e19871a03061e7565d588225ff8b445a69ae3ab2f540b3c9e204c1d23f508d4412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac72047b7ecebff22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac18420f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: '7bda49b43a1deec4a2ae4e4347c063fd0fe8b62f0bf2c21f2cdfd552687b2aef',
            },
        },
        {
            description:
                'SLP send and BURN with no token change, NNG utxo shape',
            wallet: walletWithTokensNNG,
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            sendQty: '1',
            destinationAddress:
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            feeRate: 1,
            chaintipBlockheight: 800000,
            tokenInputs: [
                {
                    outpoint: {
                        txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                        outIdx: 1,
                    },
                    value: 546,
                    slpToken: {
                        amount: '1000000000',
                        isMintBaton: false,
                    },
                    address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    decimals: 9,
                },
            ],
            sendAmounts: [new BN('1000000000')],
            txid: 'e1ebe5b54dc63de292b7b11f41b7193faa5ac8481ce4cf524b01d8b72ea648e8',
            hex: '020000000299b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006a47304402201eb4634f957a6843bdc222b2e1d858c7e36134dcc39372d98043fc41daff8773022070d388caa0c221c93ed8d3dd4d135b4b1ed35a216c0b508a1b3c31bd66fb2572412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006a4730440220515335beee4da1a7d7f1e84030f3e965941225b280fa844d58c2258d61151bf90220458cb0ce6772a0b63575101541c8df29c4861452183b50b788b5a07d4576c66a412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000003b9aca0022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac8a400f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000299b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006a47304402202fc92730b6b3b1d5f94933b947e4563108dbf1475f1bc3a1fe8406e96b3daaa302201bffe43e9ec26b47eb1b12cd369ac015fe05a68276e950df07e69176a943cd74412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006b483045022100d955c0e90b023e668b7bdde58f69bfe8a030f6a0a9e9fbf45d5eb34d17cc5b16022024089805115af084c91f8b69f86a1623240cfe8bf2c402e9e19779f711ef4f98412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000000000000022020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac8a400f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: '2dc2a2a417b0c46f1cbf881bad15abecb7f145f0c27f7fee1023cd4013feebc3',
            },
        },
        {
            description:
                'SLP max send and max burn txs using all available input utxos',
            wallet: walletWithTokensNNG,
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            sendQty: '10000000000',
            destinationAddress:
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            feeRate: 1,
            chaintipBlockheight: 800000,
            tokenInputs: walletWithTokensNNG.state.slpUtxos,
            sendAmounts: [new BN('10000000000000000000')],
            txid: 'a96f605eaf8b97889a73c5ee0e36597239f7fb17833a28076d2f3ca863f7ccfc',
            // https://explorer.e.cash/tx/a96f605eaf8b97889a73c5ee0e36597239f7fb17833a28076d2f3ca863f7ccfc
            hex: '020000000699b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006a473044022026403fddd895b7681984a6f7f836749ee9274a087a67dd341578e334cdacd6b302201424ee0eaa80b08dc2bd9a2b5a692aa7d907678fdca24bf1901484e1fd9d40e2412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006a47304402201f79f8aa97dcc5d6ed6832d389425506ccff9d6f533273172119df1f0558b25002207a763541ee2a3cad06d7566edeec24508e22a6f1fc954281b616e1a0ec0d87bc412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff9a6659e748a666199a660d0cefa40d2d8108031269a567d79049377ab072cc56010000006b48304502210091a289d43cff6bf6eec71eb216cd0f6c78f0167b4f9fc5557e7230cd2aadfd560220561fd06567c67026c828e4b5215f997e951ef9483d4c3077e355b2431391ce6a412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0ddc171e6a354c0e353983bd69ab26b979007f48fb1600f0c156123334d594c2010000006a473044022016e1538f26f92c23f48e66f49e22a8761481fe9d1e12a775ad538efbcb103955022061723dbfc8c93fc1b259f02d24819a527d0278eeeb2fe4c5fa9e43549756010a412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff435fd1889764268952c9c79b4bac3769797ef33075868d2ba2392d4c7194c6d8010000006b483045022100a2869c82c10fdbb0d55992f8ffffa8495300bb07b78b31a63afea10fd2a813780220596e8adb4fcdf3ad52e066c2281df1b1e757f61d6d9d85f360636e41f2d06f58412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006b483045022100b82120d70ee9bf5c4d6f52c0085218434eb2747517234e6cd1c0cc57c8700224022013d2c894199f347f780f1aabc61c9900eb90ab50e8d94b52127fb96cd9f3015d412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac7230489e8000022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acc2460f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000699b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006b483045022100c6b06353a96398bd5ca2cef5ddd8d4c796c0d3201d619a889c7c1931a0f4ddeb0220376ed64e8cec9970200b757e41aefa0efc590db6d5140b78b8059a0d75597890412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006a473044022061ad8ca80e4991e518f683886887c04b7e45e0d822ee36e361c65997cb01b96a022025fa3f8f3565c72036dc8233420c32d49bde8b99a3c3456524093e9140752925412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff9a6659e748a666199a660d0cefa40d2d8108031269a567d79049377ab072cc56010000006a47304402207a9dbfbb29e0d4b2c21910212aac90a51df76e0c933e236c678ba218318cd109022001c393faad94045ca6bc2833e15cc5560624b442769382fb61dd5560fea0e184412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0ddc171e6a354c0e353983bd69ab26b979007f48fb1600f0c156123334d594c2010000006a473044022016d2999e1547191865ea8a4bee4b4801b7d061a28d3910ec538b9353db3e917302204ab8abb1f718ac478c7ab4738103379762e828ea7d3903da848493f6420805dc412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff435fd1889764268952c9c79b4bac3769797ef33075868d2ba2392d4c7194c6d8010000006b483045022100912826655241753d68e411556cbbb24a1c73dc7a07107d013ea1a92408b8a85202204be780c3a822138731cd885e6efc571ccf97441828a18b423be529f3ef9ddfd6412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006a473044022078b5eb34362eed2fbb99f5ffbad0225365abc32a94d9c390880eefc5a884247802204fce8a2d99ff601db7e7bb7f593aaeca78d908108b79214589dd32408afd6112412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000000000000022020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88acc2460f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: 'eb7954811e6b8e13af3fa2c6c8c908ded349c437b73b8b63fffa9abfe098e68d',
            },
        },
    ],
    expectedReturnsInNode: [
        {
            description: 'SLP send and burn with token change, NNG utxo shape',
            wallet: walletWithTokensInNode,
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            sendQty: '10',
            decimals: 9,
            destinationAddress:
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            feeRate: 1,
            chaintipBlockheight: 800000,
            tokenInputs: [
                {
                    outpoint: {
                        txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                        outIdx: 1,
                    },
                    value: '546',
                    token: {
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        amount: '1000000000',
                        isMintBaton: false,
                    },
                    address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                },
                {
                    outpoint: {
                        txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                        outIdx: 1,
                    },
                    value: '546',
                    token: {
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        amount: '9999996998999999999',
                        isMintBaton: false,
                    },
                    address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                },
            ],
            sendAmounts: [new BN('10000000000'), new BN('9999996989999999999')],
            txid: '19a6d3a3fd4a2f86e2407e5f5744c59fa83fea0cc56409349a61f74d17bd7c81',
            hex: '020000000399b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006b483045022100c1d28fbda26eceec043e2f2107fee83808ceec8a53d7638306c6c28ef7200c3b02204bf4f18db54ac6f7c1dfd75a6d6677527394a6da6d13be327f763c0bc10acfd3412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006b483045022100d2a89ff0961da6d71e60a49fb70b1d01bc1eeb6f49a161327791d51c353cccf402206a2648d4bb835af3e8880dbf2ee20db639198571e85aad92042aef18dc984646412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006b483045022100f4710ca71d3e2f2990533eeacc506efa9d310147e3fc9679736dfa6d3e0d26ec0220654cc8ed416e127d46f9f3c3ff0b20e8b103fb1676e09495fe089e57e0225855412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff040000000000000000406a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a140800000002540be400088ac72047b7ecebff22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88accb3f0f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000399b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006b4830450221008aae68b021d60569d5220a7d7ca3be936b88536a31570c8f0ca3be1f8ea6b7cd02207105fcb771741b60c79c2fb99f0b3e7449cb1c7b033318646560c9456a6670bb412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006a4730440220728466abc63c17670d333342e446f2924b2549bcb7d3d94d9f6a4aabdf72d6be02201fde6bb71a14bd801a7156c32360e3701c680105e590874a7fcd96990fa5803d412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006a47304402206babdfd43eb1027c036e50510f78921217b690af74baa32ccda8905a3dadee6202201e19871a03061e7565d588225ff8b445a69ae3ab2f540b3c9e204c1d23f508d4412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac72047b7ecebff22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac18420f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: '7bda49b43a1deec4a2ae4e4347c063fd0fe8b62f0bf2c21f2cdfd552687b2aef',
            },
        },
        {
            description:
                'SLP send and BURN with no token change, NNG utxo shape',
            wallet: walletWithTokensInNode,
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            sendQty: '1',
            decimals: 9,
            destinationAddress:
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            feeRate: 1,
            chaintipBlockheight: 800000,
            tokenInputs: [
                {
                    outpoint: {
                        txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                        outIdx: 1,
                    },
                    value: 546,
                    token: {
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        amount: '1000000000',
                        isMintBaton: false,
                    },
                    address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
                },
            ],
            sendAmounts: [new BN('1000000000')],
            txid: 'e1ebe5b54dc63de292b7b11f41b7193faa5ac8481ce4cf524b01d8b72ea648e8',
            hex: '020000000299b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006a47304402201eb4634f957a6843bdc222b2e1d858c7e36134dcc39372d98043fc41daff8773022070d388caa0c221c93ed8d3dd4d135b4b1ed35a216c0b508a1b3c31bd66fb2572412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006a4730440220515335beee4da1a7d7f1e84030f3e965941225b280fa844d58c2258d61151bf90220458cb0ce6772a0b63575101541c8df29c4861452183b50b788b5a07d4576c66a412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000003b9aca0022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac8a400f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000299b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006a47304402202fc92730b6b3b1d5f94933b947e4563108dbf1475f1bc3a1fe8406e96b3daaa302201bffe43e9ec26b47eb1b12cd369ac015fe05a68276e950df07e69176a943cd74412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006b483045022100d955c0e90b023e668b7bdde58f69bfe8a030f6a0a9e9fbf45d5eb34d17cc5b16022024089805115af084c91f8b69f86a1623240cfe8bf2c402e9e19779f711ef4f98412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000000000000022020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac8a400f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: '2dc2a2a417b0c46f1cbf881bad15abecb7f145f0c27f7fee1023cd4013feebc3',
            },
        },
        {
            description: 'SLP max send tx using all available input utxos',
            wallet: walletWithTokensInNode,
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            sendQty: '10000000000',
            decimals: 9,
            destinationAddress:
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            feeRate: 1,
            chaintipBlockheight: 800000,
            tokenInputs: walletWithTokensInNode.state.slpUtxos,
            sendAmounts: [new BN('10000000000000000000')],
            txid: 'a96f605eaf8b97889a73c5ee0e36597239f7fb17833a28076d2f3ca863f7ccfc',
            // https://explorer.e.cash/tx/a96f605eaf8b97889a73c5ee0e36597239f7fb17833a28076d2f3ca863f7ccfc
            hex: '020000000699b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006a473044022026403fddd895b7681984a6f7f836749ee9274a087a67dd341578e334cdacd6b302201424ee0eaa80b08dc2bd9a2b5a692aa7d907678fdca24bf1901484e1fd9d40e2412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006a47304402201f79f8aa97dcc5d6ed6832d389425506ccff9d6f533273172119df1f0558b25002207a763541ee2a3cad06d7566edeec24508e22a6f1fc954281b616e1a0ec0d87bc412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff9a6659e748a666199a660d0cefa40d2d8108031269a567d79049377ab072cc56010000006b48304502210091a289d43cff6bf6eec71eb216cd0f6c78f0167b4f9fc5557e7230cd2aadfd560220561fd06567c67026c828e4b5215f997e951ef9483d4c3077e355b2431391ce6a412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0ddc171e6a354c0e353983bd69ab26b979007f48fb1600f0c156123334d594c2010000006a473044022016e1538f26f92c23f48e66f49e22a8761481fe9d1e12a775ad538efbcb103955022061723dbfc8c93fc1b259f02d24819a527d0278eeeb2fe4c5fa9e43549756010a412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff435fd1889764268952c9c79b4bac3769797ef33075868d2ba2392d4c7194c6d8010000006b483045022100a2869c82c10fdbb0d55992f8ffffa8495300bb07b78b31a63afea10fd2a813780220596e8adb4fcdf3ad52e066c2281df1b1e757f61d6d9d85f360636e41f2d06f58412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006b483045022100b82120d70ee9bf5c4d6f52c0085218434eb2747517234e6cd1c0cc57c8700224022013d2c894199f347f780f1aabc61c9900eb90ab50e8d94b52127fb96cd9f3015d412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac7230489e8000022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acc2460f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000699b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006b483045022100c6b06353a96398bd5ca2cef5ddd8d4c796c0d3201d619a889c7c1931a0f4ddeb0220376ed64e8cec9970200b757e41aefa0efc590db6d5140b78b8059a0d75597890412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006a473044022061ad8ca80e4991e518f683886887c04b7e45e0d822ee36e361c65997cb01b96a022025fa3f8f3565c72036dc8233420c32d49bde8b99a3c3456524093e9140752925412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff9a6659e748a666199a660d0cefa40d2d8108031269a567d79049377ab072cc56010000006a47304402207a9dbfbb29e0d4b2c21910212aac90a51df76e0c933e236c678ba218318cd109022001c393faad94045ca6bc2833e15cc5560624b442769382fb61dd5560fea0e184412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0ddc171e6a354c0e353983bd69ab26b979007f48fb1600f0c156123334d594c2010000006a473044022016d2999e1547191865ea8a4bee4b4801b7d061a28d3910ec538b9353db3e917302204ab8abb1f718ac478c7ab4738103379762e828ea7d3903da848493f6420805dc412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff435fd1889764268952c9c79b4bac3769797ef33075868d2ba2392d4c7194c6d8010000006b483045022100912826655241753d68e411556cbbb24a1c73dc7a07107d013ea1a92408b8a85202204be780c3a822138731cd885e6efc571ccf97441828a18b423be529f3ef9ddfd6412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006a473044022078b5eb34362eed2fbb99f5ffbad0225365abc32a94d9c390880eefc5a884247802204fce8a2d99ff601db7e7bb7f593aaeca78d908108b79214589dd32408afd6112412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000000000000022020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88acc2460f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: 'eb7954811e6b8e13af3fa2c6c8c908ded349c437b73b8b63fffa9abfe098e68d',
            },
        },
    ],
};
