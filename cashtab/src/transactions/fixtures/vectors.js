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
    walletWithTokensInNode,
} from './mocks';
import { Script } from 'ecash-lib';
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
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                OP_RETURN_CASHTAB_MSG_TEST,
            ],
            satsPerKb: 1000,
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
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
            ],
            satsPerKb: 1000,
            chaintipBlockheight: 800000,
            txid: '21b5c037e12ad2222385840d43469463c56ee883ed09d630f08d18dd9a402c7d',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441e0b9c604d3a856f46c4a159dc0a98b899e0224ae3f94d8fd856a6697f57c71d4f3f314e8842c9b1e9c05468044285e3a1447d9fa4657f20d2db87648189d90a94121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e80300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087e75c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description: '1000 satoshis with 1 change output at 10 sat/byte',
            wallet,
            targetOutputs: [
                {
                    value: 1000,
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
                    value: 24808,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 24808,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 88800,
                    script: Script.fromAddress(
                        'ecash:qzr03ye2jhrxmw97g9hv4s05364qgsdqzsjre4krry',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                {
                    value: 2000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                {
                    value: 3000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                {
                    value: 4000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
                {
                    value: 5000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
                {
                    value: 2000,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
                {
                    value: 3000,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
                {
                    value: 4000,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
                {
                    value: 5000,
                    script: Script.fromAddress(
                        'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
                    ),
                },
            ],
            satsPerKb: 1000,
            chaintipBlockheight: 800000,
            txid: 'eb3f211e3ac485fd82271ceae4ad715cb625f25560e13a00e5e7caf912d49458',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441456c92b6ce2d253d687b7a8650a9558af0a9385799754efa61a52462bb745f7e1c6965e54fc64477f04c9095ea70654193708eab23add2301bfffa782dc3861b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff06e80300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087d00700000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087b80b00000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087a00f00000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087881300000000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087b7250000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
    ],
    errors: [
        {
            description: 'Sending below dust threshold',
            wallet,
            targetOutputs: [
                {
                    value: 545,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
            chaintipBlockheight: 800000,
            msg: 'Insufficient funds',
            hex: undefined,
        },
        {
            description:
                'Tx with utxos for which the wallet has no private keys',
            wallet: walletWithInvalidPrivateKey,
            targetOutputs: [
                {
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
            chaintipBlockheight: 800000,
            msg: 'txn-mempool-conflict (code 18)',
            hex: '0200000001c31d0b990c5a707dca806648fe5036dbb3f9590b3e22e026392912edeef15468000000006441a3d98bb6fa7f8285ab8733623e8a9aeafeb78a4a95e8f63e8eaae4c0c56f73cf281312d3f1b49e58f93da3810bf4b8d7a6244afd67ba85ca7ebee00f7aeeab974121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff02e8030000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ace55c0000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000',
        },
        {
            description: 'Insufficient balance due to immature coinbase utxos',
            wallet: walletWithCoinbaseUtxos,
            targetOutputs: [
                {
                    value: 1000,
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                },
            ],
            satsPerKb: 1000,
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
                    value: 15000,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                    value: 5000,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                    ),
                    value: 15000,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    ),
                    value: 440000,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                    ),
                    value: 5000,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                    ),
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
                    script: Script.fromAddress(
                        'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    ),
                    value: 15000,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    ),
                    value: 5000,
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
                    value: 15000,
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
                    value: 15152,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                    ),
                    value: 15152,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    ),
                    value: 444444,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                    ),
                    value: 5051,
                },
                {
                    script: Script.fromAddress(
                        'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                    ),
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
            satsPerKb: 1000,
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
                    path: 1899,
                },
                {
                    outpoint: {
                        txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                        outIdx: 1,
                    },
                    value: 546,
                    token: {
                        tokenId:
                            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                        amount: '9999996998999999999',
                        isMintBaton: false,
                    },
                    path: 1899,
                },
            ],
            sendAmounts: [10000000000n, 9999996989999999999n],
            txid: 'fd805efcc2c9b8f55379593d5ca33128fb3b405277f10ed7dd01d588ecdd0e85',
            hex: '020000000399b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006441e59e2cc479d45c9c5085fc5a3eb0831cf6e7fbd1b40f6594c0069d4039ab24726e92279ebfdedf80fba65437a76a47a97a84b42b8e5f2e970392447552c8a8dd412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006441a03e2f07b7d3378cf6e37d08ae91f56012c35f390d6886abd02246fc41264d02030242a6e86005cb204dd2b8aa15fd4ab79026e136b375fd59e2c80b4981632e412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a80000000064415f3ceebfe6e1f1d1078a9ab9ef2f26238562443b1130c6df9079b0b6588234a7db667303714b21c59e6e90fca4d006ba1e0015425e4c5a59b68da79b14270734412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff040000000000000000406a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a140800000002540be400088ac72047b7ecebff22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ace03f0f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000399b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006441754849d896fce8c66aeea79e3b943a63c12f952c4fc8f2e0d6f5c7365401d0c0fe1b39de6cb21ad023af0eacd3dfc0cb8601b4c91e63472efdfa11e121f8d812412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006441a897a385cf117d2c00f818f08772467eb197612a21ed17517f05e4286b44b1a0eb06607b1810f4bf5ad166469c9980fbff450fcbbdcbdf887f29eed65d095a8b412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006441ba0e14b0fac75733ec6572dadab3f2c8678a22c125f52e343a7b92f609f106262f87a119dbdac0278e0ba2481380aa1d983eabb71b1f6f7e2677181560105219412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac72047b7ecebff22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac2d420f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: 'f8a50cbec88ce38c0276acaab0e18da60a704373f617278d57426e3adf7df34d',
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
            satsPerKb: 1000,
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
            satsPerKb: 1000,
            chaintipBlockheight: 800000,
            tokenInputs: walletWithTokensInNode.state.slpUtxos,
            sendAmounts: [10000000000000000000n],
            txid: 'f96da2247f5f0273a3296420c8dad90f2eedfa7748f69d9d12849b2b4d278e89',
            hex: '020000000699b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f01000000644187b7356e4c09450db84f80ec87ae22c1128b9b83d73a335b98900948b7c2e27a7c73ed17ba73a88e67d6ad0ebdfdc5ad254cdcb49d9f5dd58fcade71d6bdacce412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006441948e7ab023ff5a33568629d97dfeb2d5a73da2d34f0cd834366dc6a8fb0aa35764ebff499ac694b174f3211732923ceee34dbb5414256484c3849705bc6c7347412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff9a6659e748a666199a660d0cefa40d2d8108031269a567d79049377ab072cc56010000006441dfbb3f59253c8c18be70674da03d9dd090db2e86809dad0078082b4ee358c4864c815e82bf04d79d022fd0505582e9ddffd60184d9d1dc7b2d105f1e29fae296412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0ddc171e6a354c0e353983bd69ab26b979007f48fb1600f0c156123334d594c20100000064416c3f50020f2c4b5a52908c1c5fd3eac38fb98aaff4379f731f73f937c7eb4afbb2cbef80302efd08bc182ce7b2b32b21837f4739742cd9c7dffaef4e0574b383412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff435fd1889764268952c9c79b4bac3769797ef33075868d2ba2392d4c7194c6d8010000006441dc13babb868973fd2b65528f9f362ddd3aa4c301c642bd44b0cbfee32127df4b77aa21050708ee453b718379632734806a2d61256300d7e4fd5949455b43a052412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006441bab98a9434bb0503950de9c349029d4551d0a9f5c8d7a50d9b8137b6a02ff53cfabb3db53fdf586039d276afb67c6f4cb134f2afd0e192475cdc6a0f5118dd9b412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14088ac7230489e8000022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acec460f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
            burn: {
                hex: '020000000699b1e27a8b5d7754171e6667931a1d7c8d4c1c28deee2325ee1146ac3684a04f010000006441253409e138112a105863aa67c9dd1cff8a3773b060d96513d30e50b9a391c22aae8722a25126c81435b91ecd35cf4c9b88302a13dcc26a7a1a00094544b1324e412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffffc194875af33c23992fb9c192d91ac17b0b22c0d3c4f1376b485bc866a55dbc51010000006441c285ea58bb9ef701e4c396d3513840f80f5c6b0d1ddcc96643fef02a59631effe5d78a4cbde150b5645b42bf05f02b9a0c2f47d64b4df71f20fab5f77fa848f0412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff9a6659e748a666199a660d0cefa40d2d8108031269a567d79049377ab072cc56010000006441d14402bc91e4036cf5a9a93502cb1852dfb3ea0ab35b91a734a5ac1a1e2653f554be2713310c87e8dcc3458eb6ab16fcfaba1df2a5476e63c17206fb19c094bd412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0ddc171e6a354c0e353983bd69ab26b979007f48fb1600f0c156123334d594c2010000006441d5ca3a3073f1dad4f5d7c00b3036c756775035197ac140a66e3329d7081975f96a1fae9e2aa760818a9e0b4767fc4d9941c981891a5100ed74c77fd25c273994412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff435fd1889764268952c9c79b4bac3769797ef33075868d2ba2392d4c7194c6d80100000064414b3d9bf77e2d7707fcf63620e3dcc559d2fecd1e5f8c0bdecf8042f7036ce024cb98e5c626162d4a3e58b6c91389f64aa1215e48107a5ecd514ee11c1d5d9e67412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a80000000064411524b5240ac394c6204710988066c77f67347a6dfacb7bc45da06b84251163e3d25e638394d9d1f128e19cc7b0b36e29d998d01fce74fd7a9f64d72089e3a0b5412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff030000000000000000376a04534c500001010453454e4420b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a1408000000000000000022020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88acec460f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                txid: '2d785c5141373a33e78356b682df5ea6a3f3d2195b43cd704388c89aac1138a2',
            },
        },
    ],
};
