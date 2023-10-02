// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for transactions.js unit tests

import {
    wallet,
    utxosAtManyAddressesWallet,
    walletWithInvalidPrivateKey,
    allTheXecWallet,
} from './mocks';

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
            txid: '191ea0bff422cfd7bf9d717e3287e1a4f4441b7c70fac4ef270767da3917362a',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a47304402202747b4da71786b3305b39d17531824ade98db589f032a59ddd8da7166df4f6b202200c6fb9fa6a9d5da69dbfff1c1ff64fd049371ca27e3c3984723d630190c2a22e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acde5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
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
            msg: 'Transaction must send more than dust threshold of 546 satoshis',
            hex: undefined,
        },
        {
            description: 'Sending above wallet balance',
            wallet,
            targetOutputs: [
                {
                    value:
                        parseInt(wallet.state.balances.totalBalanceInSatoshis) +
                        1,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
            msg: 'Insufficient funds',
            hex: undefined,
        },
        {
            description:
                'Sending within wallet balance but insufficient to cover fee',
            wallet,
            targetOutputs: [
                {
                    value:
                        parseInt(wallet.state.balances.totalBalanceInSatoshis) -
                        50,
                    address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                },
            ],
            feeRate: 1,
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
            msg: 'txn-mempool-conflict (code 18)',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006a47304402202747b4da71786b3305b39d17531824ade98db589f032a59ddd8da7166df4f6b202200c6fb9fa6a9d5da69dbfff1c1ff64fd049371ca27e3c3984723d630190c2a22e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acde5c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
    ],
};
