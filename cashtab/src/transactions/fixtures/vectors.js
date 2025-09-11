// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for transactions.js unit tests

import {
    wallet,
    walletWithCoinbaseUtxos,
    utxosAtManyAddressesWallet,
    allTheXecWallet,
    walletWithTokensInNode,
} from './mocks';
import { Script } from 'ecash-lib';
import { getCashtabMsgTargetOutput } from 'opreturn';
import { FEE_SATS_PER_KB_XEC_MINIMUM } from 'constants/transactions';
const OP_RETURN_CASHTAB_MSG_TEST = getCashtabMsgTargetOutput('test');

/**
 * Say we require a handful of dust utxos, like in a token tx
 */
const requiredUtxos = [
    {
        outpoint: {
            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        isFinal: true,
        path: 1899,
        sats: 546n,
    },
    {
        outpoint: {
            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        isFinal: true,
        path: 1899,
        sats: 546n,
    },
    {
        outpoint: {
            txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
            outIdx: 0,
        },
        blockHeight: -1,
        isCoinbase: false,
        isFinal: true,
        path: 1899,
        sats: 546n,
    },
];

export const sendXecVectors = {
    txs: [
        {
            description:
                'Sending a tx that we can afford but need every utxo to cover',
            wallet: {
                ...wallet,
                state: {
                    ...wallet.state,
                    slpUtxos: requiredUtxos,
                    nonSlpUtxos: [
                        {
                            outpoint: {
                                txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                                outIdx: 0,
                            },
                            blockHeight: -1,
                            isCoinbase: false,
                            isFinal: true,
                            path: 1899,
                            // More than enough to cover the tx
                            sats: 100_000_000n,
                        },
                    ],
                },
            },
            targetOutputs: [
                {
                    // We send an amount that is less than what token dust would cover
                    // but enough so that we still need a sats utxo to cover the fee
                    sats: 3n * 546n - 1n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            requiredInputs: requiredUtxos,
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: '3064f73730ddc83f96405b7e2e5c0e02b26a4893394ded8defaf7d7fc017100a',
            hex: '0200000004c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef1546800000000644105a3400dd269d1730eae6b758a07cbed1ec4285bcf96ec2628604886a5ad12b51ecc8234afe07872994709758c39dc6b1053285ded4f291bd41b8bc61e5083024121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffc31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef1546800000000644105a3400dd269d1730eae6b758a07cbed1ec4285bcf96ec2628604886a5ad12b51ecc8234afe07872994709758c39dc6b1053285ded4f291bd41b8bc61e5083024121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffc31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef1546800000000644105a3400dd269d1730eae6b758a07cbed1ec4285bcf96ec2628604886a5ad12b51ecc8234afe07872994709758c39dc6b1053285ded4f291bd41b8bc61e5083024121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffc31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441917314c6641d2bcca3f064add29adec3b0d3b84f0ed224519bd06a2880c9cbfdc693740eb497ff31c32677a76c157dfb4d4a8c026480a484cdeb5daf2ce18ef54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0265060000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7fdef505000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2pkh address',
            wallet,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: '5e72d1e46769ff1c9b8f1bcbfead4a3947a08ea30aa0f6b915cd51e75ad3b1ec',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441a3d98bb6fa7f8285ab8733623e8a9aeafeb78a4a95e8f63e8eaae4c0c56f73cf281312d3f1b49e58f93da3810bf4b8d7a6244afd67ba85ca7ebee00f7aeeab974121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ace55c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2pkh address if all utxos are mature coinbase utxos',
            wallet: walletWithCoinbaseUtxos,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800100,
            txid: '5e72d1e46769ff1c9b8f1bcbfead4a3947a08ea30aa0f6b915cd51e75ad3b1ec',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441a3d98bb6fa7f8285ab8733623e8a9aeafeb78a4a95e8f63e8eaae4c0c56f73cf281312d3f1b49e58f93da3810bf4b8d7a6244afd67ba85ca7ebee00f7aeeab974121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ace55c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2pkh address with an OP_RETURN output',
            wallet,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                OP_RETURN_CASHTAB_MSG_TEST,
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: 'c3133cad336c6c36c4efa65be65f708e199745c8a0e4d2dffe04d88e5e0d6bf0',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef154680000000064412344401941ff34548502ce5c4a68a58a2904fdf3c0098a0955b1db1b7fe61126ecafae490f57cfd4f46fa9ab69f4caa4b62ca45731c3c3106d1934e9f20b2e614121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff03e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac00000000000000000b6a04007461620474657374d15c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2pkh address with an OP_RETURN output at index 0',
            wallet,
            targetOutputs: [
                OP_RETURN_CASHTAB_MSG_TEST,
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: '6728c6beaa67701ddf0c4d22907ef2dd154abc2f2f0369de80e9aa6a725d4634',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef154680000000064413d261c7c3d123de27819765b9fc1636fc4f52d9090cddd5943f5b6e27a03ff04e45ac8064bf42b02aa54d5e84f00c758d43f3e1b5c9b14abfd9c1bd3eab0a2f74121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0300000000000000000b6a04007461620474657374e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acd15c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '1000 satoshis with 1 change output at 1 sat/byte to p2sh address',
            wallet,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: '21b5c037e12ad2222385840d43469463c56ee883ed09d630f08d18dd9a402c7d',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441e0b9c604d3a856f46c4a159dc0a98b899e0224ae3f94d8fd856a6697f57c71d4f3f314e8842c9b1e9c05468044285e3a1447d9fa4657f20d2db87648189d90a94121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e80300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087e75c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description: '1000 satoshis with 1 change output at 10 sat/byte',
            wallet,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 10000,
            chaintipBlockheight: 800000,
            txid: '6a4b7427f34ff1c392f61e20fe9d808185c8b5c653e83c005f10d976ba91edeb',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441cf16b61d32d874d07217318955e361665a234dca918fff263efeae67b114aeb53a0a02ae95708579d58f3648f041a91852f66b3197c0e0d3b455410aca55933f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac32550000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description: '1 satoshi per byte tx with no change outputs',
            wallet,
            targetOutputs: [
                {
                    sats: 24808n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: 'b597af156365293c2775c9227315fdd504fcf5685e127ceffeef3e280fbe5a08',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef154680000000064419d87399cc0165e0d882dddb66b42ed6b450d44114085207753efde09fbb3406f8343a2b20dfe9bf85ba410c9dcd615d266cc52d1f626c3bdfefb5168478a8fe64121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff01e8600000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac00000000',
        },
        {
            description:
                '1 satoshi per byte tx with no change outputs from a wallet with utxos at many addresses',
            wallet: utxosAtManyAddressesWallet,
            targetOutputs: [
                {
                    sats: 24808n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: 'a3aa4561e61c9cd134c576efa835d3cd912aa61bbe9ed1b209e4b1d3aa6db41e',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef1546800000000644181ca26c0945e7641eb8e6cf6a5e37b55784b690c18875ee44c35009c36a4257c36c131ddcb134ca129410a6613477c086ebe377e9819b0abc4c4be5fe1283f4e412103939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5ffffffff01e8600000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac00000000',
        },
        {
            description:
                '1 satoshi per byte tx broadcast actually broadcast with this function',
            wallet,
            targetOutputs: [
                {
                    sats: 88800n,
                    script: Script.fromAddress(
                        'ecash:qzr03ye2jhrxmw97g9hv4s05364qgsdqzsjre4krry',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: 'c598079e46bbd4d9aaca79762072f1d45d51603d1426bf6fa87f7fb329a139b2',
            hex: '0200000002c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef154680000000064415a67dec1ddcb824d6a3e440a24316240be134a34117e637ce777f8bb0e1c30628a91c3876674bdb0c152252b43c9ed59161f6fb60c9c7f915a1d51dda741be0b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff09fb259435ad29ff0a032d6fe5063d0e0172f68ce48a38756a3a2935ff0614900000000064414c6e8a4ad4b509bd66b32fe2ead291bfac74810b7cea68745e5bd350b6b6e0d5dce17a1a91afa78a34e61347911d941204b6033df2f36d935e5144157ba074374121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e05a0100000000001976a91486f8932a95c66db8be416ecac1f48eaa0441a01488ac008c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                'No precision error using JS Number on utxo with highest theoretically possible value',
            wallet: allTheXecWallet,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: '36bed0059f52716820614716821aac224f5b3f85b43d474bdfb3e1ade208b479',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441446ab6df166ddd7ffee75fabfba006a58ee3be394e2c53c8bad70f20df5f9a5ce612cac4269cd4122f723b64d2dc80e08dfe4feb39592f9ff7530ff16ebada964121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac3d3b075af07507001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '15000 satoshis with 1 change output at 1 sat/byte to 5 p2pkh addresses',
            wallet,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                {
                    sats: 2000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                {
                    sats: 3000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                {
                    sats: 4000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                {
                    sats: 5000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: '8941b76669444bad98499ccb8549483237c648f85c694e96c57ca80dce521d57',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef154680000000064410dc35e14f820a5870dbb791ee494f73de749b3ff8e20bf5d4d3b8a21118432eda47c4b5a6f2a92093b367402d35d31a12537de4a224e4af34d0c45259827523f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff06e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acd0070000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acb80b0000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88aca00f0000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac88130000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acad250000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                '15000 satoshis with 1 change output at 1 sat/byte to 5 p2sh outputs',
            wallet,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
                {
                    sats: 2000n,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
                {
                    sats: 3000n,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
                {
                    sats: 4000n,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
                {
                    sats: 5000n,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: 'eb3f211e3ac485fd82271ceae4ad715cb625f25560e13a00e5e7caf912d49458',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441456c92b6ce2d253d687b7a8650a9558af0a9385799754efa61a52462bb745f7e1c6965e54fc64477f04c9095ea70654193708eab23add2301bfffa782dc3861b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff06e80300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087d00700000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087b80b00000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087a00f00000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087881300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087b7250000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description:
                'Sending a tx that we can afford but need every utxo to cover',
            wallet,
            targetOutputs: [
                {
                    sats: BigInt(wallet.state.balanceSats - 467), // 467 sats is the 1 sat/byte fee of expected rawtx
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            txid: '8b06141cb254fbec10bb795f45f9055ea6e605a42070f2fee833d7e2ce1cf715',
            hex: '0200000003c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441ce2f1f62f007a45fbf056d6ed39638896623a971bbf4d3337ea2908c8bdb0093d47075a7c6e85d37ef6e265840feea9082a7467430f2c841805c0afbc5bb10f54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff09fb259435ad29ff0a032d6fe5063d0e0172f68ce48a38756a3a2935ff061490000000006441e60efa3856a20147a3626222539be2d28880297c1690d2f354ca5266cad671da2c156715c9ff8eb18fba118cdd38f55cba15546bc28f95ec8575a48b83ef518e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff50343ff586cf6bfba195ab0a982178fa077a6772d3fa46c8c886a679ce2c20bc00000000644132f2f5189ad6940c3ac3bf7abf4c501835f1e8f411005951106072eb75ebdc5885cc89ba5b140e83e71aa25dde77e15b10a50ccef0a5e4257848d5c2438908b64121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff01850d0200000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac00000000',
        },
    ],
    errors: [
        {
            description: 'Sending below dust threshold',
            wallet,
            targetOutputs: [
                {
                    sats: 545n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            msg: 'Transaction output amount must be at least the dust threshold of 546 satoshis',
            hex: undefined,
        },
        {
            description: 'Sending above wallet balance',
            wallet,
            targetOutputs: [
                {
                    sats: BigInt(wallet.state.balanceSats + 1),
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
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
                    sats: BigInt(wallet.state.balanceSats - 50),
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            msg: 'Insufficient funds',
            hex: undefined,
        },
        {
            description: 'throws broadcast error from the node',
            wallet,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            msg: 'txn-mempool-conflict (code 18)',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441a3d98bb6fa7f8285ab8733623e8a9aeafeb78a4a95e8f63e8eaae4c0c56f73cf281312d3f1b49e58f93da3810bf4b8d7a6244afd67ba85ca7ebee00f7aeeab974121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ace55c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description: 'Insufficient balance due to immature coinbase utxos',
            wallet: walletWithCoinbaseUtxos,
            targetOutputs: [
                {
                    sats: 1000n,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800099,
            msg: 'Insufficient funds',
            hex: 'deadbeef', // error is thrown before the rawtx is built
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
                    script: Script.fromAddress(
                        'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    ),
                    sats: 15000n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                    sats: 5000n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                    ),
                    sats: 15000n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    ),
                    sats: 440000n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                    ),
                    sats: 5000n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                    ),
                    sats: 20000n,
                },
            ],
        },
        {
            description:
                'Multisend format with extra space around address and value',
            userMultisendInput: `   ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr   ,   150\n   ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035 ,     50       `,
            targetOutputs: [
                {
                    script: Script.fromAddress(
                        'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    ),
                    sats: 15000n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                    sats: 5000n,
                },
            ],
        },
        {
            description: 'One address in multi format',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,150`,
            targetOutputs: [
                {
                    script: Script.fromAddress(
                        'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    ),
                    sats: 15000n,
                },
            ],
        },
        {
            description: 'Multisend including a non-integer JS result',
            userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,151.52\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6,151.52\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj,4444.44\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly,50.51\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m,202.02`,
            targetOutputs: [
                {
                    script: Script.fromAddress(
                        'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    ),
                    sats: 15152n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                    ),
                    sats: 15152n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    ),
                    sats: 444444n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                    ),
                    sats: 5051n,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                    ),
                    sats: 20202n,
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
    expectedReturns: [
        {
            description: 'SLP send and burn with token change',
            wallet: walletWithTokensInNode,
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            sendQty: '10',
            decimals: 9,
            destinationAddress:
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            tokenInputs: [
                {
                    outpoint: {
                        txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                        outIdx: 1,
                    },
                    sats: 546n,
                    token: {
                        tokenType: {
                            number: 1,
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        },
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        atoms: 1000000000n,
                        isMintBaton: false,
                    },
                    isCoinbase: false,
                    isFinal: true,
                    blockHeight: 800000,
                    path: 1899,
                },
                {
                    outpoint: {
                        txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                        outIdx: 1,
                    },
                    sats: 546n,
                    token: {
                        tokenType: {
                            number: 1,
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        },
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        atoms: 9999996998999999999n,
                        isMintBaton: false,
                    },
                    isCoinbase: false,
                    isFinal: true,
                    blockHeight: 800000,
                    path: 1899,
                },
            ],
            sendAmounts: [10000000000n, 9999996989999999999n],
            txid: 'fd805efcc2c9b8f55379593d5ca33128fb3b405277f10ed7dd01d588ecdd0e85',
            hex: '020000000399b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006441e59e2cc479d45c9c5085fc5a3eb0831cf6e7fbd1b40f6594c0069d4039ab24726e92279ebfdedf80fba65437a76a47a97a84b42b8e5f2e970392447552c8a8dd412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006441a03e2f07b7d3378cf6e37d08ae91f56012c35f390d6886abd02246fc41264d02030242a6e86005cb204dd2b8aa15fd4ab79026e136b375fd59e2c80b4981632e412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a80000000064415f3ceebfe6e1f1d1078a9ab9ef2f26238562443b1130c6df9079b0b6588234a7db667303714b21c59e6e90fca4d006ba1e0015425e4c5a59b68da79b14270734412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff040000000000000000406a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a140800000002540be400088ac72047b7ecebff22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ace03f0f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000299b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f0100000064415ad3bce6e7468bceb566c250376381a54593bad2b6b21f39638403593f27afc868cdc69d12a44d5ab7f0e79caafa3e9fe3144bd57b5578009f98f5d12c353cf7412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc5101000000644141e15512d6c6545c7caa6dfbab547d2fe184e15e9495a51b6613e5b404d597213d3291cab60d0ea0fadba1492f7de615e2e2db0bee1276fc980849c0802357f4412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff020000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac72047b7ecebff22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: 'abfcb301ee231b43482b9d2e7e7047adeb1ccfa324ebda1468dbe99db8da23bd',
            },
        },
        {
            description: 'SLP send and BURN with no token change',
            wallet: walletWithTokensInNode,
            tokenId:
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            sendQty: '1',
            decimals: 9,
            destinationAddress:
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            tokenInputs: [
                {
                    outpoint: {
                        txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                        outIdx: 1,
                    },
                    sats: 546n,
                    token: {
                        tokenType: {
                            number: 1,
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        },
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        atoms: 1000000000n,
                        isMintBaton: false,
                    },
                    isCoinbase: false,
                    isFinal: true,
                    blockHeight: 800000,
                    path: 1899,
                },
            ],
            sendAmounts: [1000000000n],
            txid: '2ec6ad3575c70465a6ed934814fcb511950584cf4878198d7378b7e1bc1b913e',
            hex: '020000000299b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f01000000644118ece94d7134fe5b0d100bb733e6d363299faeceaaf1e6317b215ca7ff5cd86d73c973c15d1d43e683e66d1103ec311d7cf4cc92abadba0c3ea74eb072ae42bb412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006441725818bfbb2d0f1ba20345b954fa954d83e7e65a329597d09cdb0cf1ba4ee45e81a0e423fc8fdcb15658570a8b6947e8ca05fda0440f25a649e284ed32383d09412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000003b9aca0022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac98400f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000299b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f0100000064411cc6629c777b6497cc231468306a97a7f354e1400636b1112e747692f61114c27a2a1f136e8f3be54e994098232ba6d8d8bc4aa21d15c0e89421d6c0d4faacaf412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006441679e9bd87943109503a7eaa80b7bdb9af58490dbf61ed4e42893a6b69d37df9d5c041124019e77689629af07cd03c9d6aa2ca6908fc0198690f0700b99888199412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000000000000022020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac98400f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: '9066479bde5034bd286b13d7d49214751146f301e47fea0173e107be8273d14a',
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
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
            chaintipBlockheight: 800000,
            tokenInputs: walletWithTokensInNode.state.slpUtxos,
            sendAmounts: [10000000000000000000n],
            txid: '02e6ed915f5e6b28517b9ec4c9f310fd9f3e3e59af6c47a8a115b94cf26165ef',
            hex: '020000000599b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f01000000644163de1e4b55495cdc8369a52758a8039d80c0cdfd5ce2bd7ea87d5a09bca99f35135d65eb36a218e021a628fe9097ada733dcbbb2e74fec09b18817895dc45a97412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc5101000000644118a052c33d9ba8aab76259aa9625e4f271dfae61e9a630e66ec177486e9b70ed2d1cab9d7ebf4b834a9aafa917f6959340338ebc3957b0d960b57e99bf568260412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff9a6659e748a666199a660d0cefa40d2d8108031269a567d79049377ab072cc560100000064412a8cbefac50e06ee88da8ace43bb9dd188bf4652ac0fc5280bc5f9793a84d0d2be54c423989a040caa8f89580d2203a05e5b367306e4334d48470d1b55e0881b412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0ddc171e6a354c0e353983bd69ab26b979007f48fb1600f0c156123334d594c201000000644155931c7c441a84de13dd8255cef198740814916f7031d9125a945a3b91479c41c8c9e493d5a9f9da7f0c3fe4323765f5dd3ca88afcae2bd41a4eb62b710c1344412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff435fd1889764268952c9c79b4bac3769797ef33075868d2ba2392d4c7194c6d80100000064419a28ad01b1f52d69c94051789978e70c5bda2c7c84182f47b8af885e52b5d8e9fc987dbff91e9e7b891f181eb10fbec2639a3e809780787e4a4b0172e81e145c412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac7230489e8000022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac39050000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000599b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006441f419740a8ee7d92609dcbcacdc81835f2477cd38222f2744bc309c47f67e64b1fd7fe57c1b9ace6120806c0fac139c493d430b1893dcc08fdc602c3c2c2ffa11412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006441e0bb5b14edfe4a6de6dd43fecbd2e2fb93eadafdb91895eb4597c459115e70e4173f03d8eee9f1ac1396901f026e612305619ff0698ff97b6bbbec3755556638412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff9a6659e748a666199a660d0cefa40d2d8108031269a567d79049377ab072cc5601000000644142e255cfebb242ef82b298664328fe4418ddddc1d243fe40e2daf84e4e00bf1187678866accef19d5fdfa782316f9d7ebcc245034c0cd2c3d658b6818924a6e1412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0ddc171e6a354c0e353983bd69ab26b979007f48fb1600f0c156123334d594c20100000064414ac46679e8e8acb04fec1d2b2555da6f56d5ec836261e94f028b8d3ad329845e06da05ba247e73110c0aca14983df07058631067b57f8d71067a7e086dedb7cf412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff435fd1889764268952c9c79b4bac3769797ef33075868d2ba2392d4c7194c6d801000000644153e20735580edf0bf754c797309fe5165b367d8814d0c52541e375d14ff6bab1122eebbf15d8afc300311c967958ef4214dc7a8ae8abd5e8095c615a611770d4412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000000000000022020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac39050000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: '48e15f31fdbbe5e8cc7fd49339114bef7b2dadbf15055ced2c0153a52570d457',
            },
        },
    ],
};

export default {
    isFinalizedInput: {
        expectedReturns: [
            {
                description: 'A finalized input',
                requiredInput: {
                    signatory: 'some signatory',
                    input: { signData: 'some signData' },
                },
                returned: true,
            },
            {
                description:
                    'A normal Cashtab XEC utxo as stored in wallet.state.nonSlpUtxos',
                requiredInput: {
                    blockHeight: 800000,
                    isCoinbase: false,
                    isFinal: true,
                    outpoint: {
                        outIdx: 1,
                        txid: '1111111111111111111111111111111111111111111111111111111111111111',
                    },
                    path: 1899,
                    sats: 10000n,
                },
                returned: false,
            },
            {
                description:
                    'A normal Cashtab token utxo as stored in wallet.state.slpUtxos',
                requiredInput: {
                    blockHeight: 800000,
                    isCoinbase: false,
                    isFinal: true,
                    outpoint: {
                        outIdx: 1,
                        txid: '1111111111111111111111111111111111111111111111111111111111111111',
                    },
                    path: 1899,
                    token: {
                        atoms: 1000n,
                        isMintBaton: false,
                        tokenId:
                            '2222222222222222222222222222222222222222222222222222222222222222',
                        tokenType: {
                            number: 1,
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        },
                    },
                    sats: 546n,
                },
                returned: false,
            },
        ],
    },
};
