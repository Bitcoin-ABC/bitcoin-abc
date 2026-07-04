// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ScriptUtxo, TokenInfo } from 'chronik-client';
import {
    CashtabTx,
    CashtabWalletState,
    ActiveCashtabWallet,
    StoredCashtabWallet,
} from 'wallet';
import { XecTxType } from 'chronik';
import { toHex } from 'ecash-lib';
import * as wif from 'wif';

export const walletWithXecAndTokensStored: StoredCashtabWallet = {
    name: 'Transaction Fixtures',
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
    hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
    sk: '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
    pk: '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
};

export const walletWithXecAndTokensState: CashtabWalletState = {
    balanceSats: 951312,
    slpUtxos: [
        {
            outpoint: {
                txid: '3b0760858b0b20ff50d0db67793892d29d2466b86a0116f7e232792da0c22330',
                outIdx: 1,
            },
            blockHeight: -1,
            isCoinbase: false,
            sats: 546n,
            isFinal: true,
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
            },
        },
    ],
    nonSlpUtxos: [
        {
            outpoint: {
                txid: '218a1e058ed0fda76573eabf43ad3ded7e7192e42621893a60aaa152ba7f66fe',
                outIdx: 2,
            },
            blockHeight: 815549,
            isCoinbase: false,
            sats: 951312n,
            isFinal: true,
        },
    ],
    tokens: new Map([
        [
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            '1',
        ],
    ]),
};

export const walletWithXecAndTokensActive: ActiveCashtabWallet = {
    ...walletWithXecAndTokensStored,
    state: {
        balanceSats: walletWithXecAndTokensState.balanceSats,
        slpUtxos: walletWithXecAndTokensState.slpUtxos,
        nonSlpUtxos: walletWithXecAndTokensState.nonSlpUtxos,
        tokens: walletWithXecAndTokensState.tokens,
    },
};

export const freshWalletWithOneIncomingCashtabMsgTxs: CashtabTx[] = [
    {
        txid: 'f11648484c5ac6bf65c04632208d60e809014ed288171cb96e059d0ed7678fde',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'da90c08e3d4afe2ab0446a1f72a3b60cf5308c55cdb3f57a5eaefd373f42e83f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100d8350abb126e2ff6c841dcfb3902b175d46b59f141a23c40deeb7dcac1f219e7022072ee779da16bf15a8032093f03693ea98f2bbc6557dca7b48cf1f308ffb8173a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '012eba73fbc4d0383cda231b5b0c51f802569658844ab3700eb77d4475db4c32',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100989f2cd7b8994a0af144a5033d6959779bd7466226901656a35aac231ceb53f602202606fa0f2de1d82abcfac3180c7b111529792243eff23fc6455a29c92532552e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1100n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '05415fd9f02813318f760daf5aac625b61a4f60f1e1797d24e409f674549b678',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100e09950e7c9a956dd3125f741164802ef7de74a4c8c3c617f1eacdeefd9527ae502202c0cb5f8839ddfb88bf11e5f337cb0220e0228a5a663eb10b22e5567bddb2e404121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 169505n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '4585655d04f1b1da78c3bb39f90f3ab9891b930880882e2bd6ee452b58109b40',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204d2a2e8aec45ba90295fd09661d1504a8f3f0fe2be42b450c67be34212cfacb402201a438dbee9e1da4712885558925a5d49ce600da2ec25fc55240059e65ce193494121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 5500n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '7ca455f6d19b89ae2a01159b52804d8c80c1b3f4f6f1467a71f90d2639e4dcc2',
                    outIdx: 1,
                },
                inputScript:
                    '473044022074585d51f69f3a1afd5df2de6c4d630b6d89861454274909373dfbf5f5a63bc0022010abb2dc05e79505dc054f87467a494c28320a2ae4338f30c10e8f645b06c3784121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: 'ca1083d45081872129c9e2d2f463f1537749ec9aaddcccea8fcd21c6ad78ae09',
                    outIdx: 1,
                },
                inputScript:
                    '47304402201bb538c5da8e8f4f5fbf5d98b4d8dc8f6870d05e93fed6eead7a535f6b59338302204e0b18a4136fe6842ee01a9439aa8e6b9a089e4116aa4381f0d0281bc853348f4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '60f70d556549933674bfafef147e3d921c3f446b31e1ac74c55b6e17067bbd8f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100a9c9c91b48f7fdd781cd132e36c84767541ef738e405ea04e71e2f2d4b54165f02206524b3cb82a2f738906dc91a367c994122dff98c1f187e32ec676989ab3a85874121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '5b2b00f6c5d7d3406885e047caf1dd88e9b6f56058142991c3f78fd1a9a35259',
                    outIdx: 0,
                },
                inputScript:
                    '473044022048e22c07d4f68235ca8e129c74fabbad7c9b5e17ce36d76d312f4fb08d1496c30220639024f26673e0b46247b419f1605ffea2a195eaa4123b2ab5e3360d926469164121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: 'cfd2dd5b8a43fe984782d5c548aec943425ee0d2fc09b7a262e504d77956d53b',
                    outIdx: 0,
                },
                inputScript:
                    '47304402200a629b21dbba359dfa5376bc0c64c984041389e2a64c248d4bfe06f3634143860220331d15a53b4313b19c9ad717c33d7f1a7fbb82768545fc225b9bef2d541685084121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 5500n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '563fc7eec5d7e3bd07ad2e41682afda2939ed983470464457492b23cc523d5cf',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204f6ac84bfb08b9d194c9cffaa1d28cf62d4003c4f2db08c8d9dc23cd2ba2d53b0220605658e5e00499894b74aa6de304c76a6906c66a687541f33f0205403967e04a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '0a2585f1df1bc178ceac3a62158db2a1d5d136cca67690c081402c72845f9409',
                    outIdx: 0,
                },
                inputScript:
                    '47304402205126713ba8abf10b9ef384262dc808c23b072df9051b1bd266ead92571a32c7002201a20d649eec51d1f859bd843e3afee4bd15a52c42ae497bb161c34fef6301b174121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 600n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '2eadd98c7a0bf9edbddbdaa6423e2b8b2405f38428a35de6985aba1848bcf5f7',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100a4f9b2e2175b0bbae6c3de2f89b2585ac6c82b63ac55e2bebb6d9b70a72daf1102204c00d2a9b6ced89eadde34980444ffb755b494082c9b11fc6d21c821ee8ba0b04121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '941ef3bd803f4267eecbdcb76ddb3116b3c781a2a97b6a9bde80b5573e70e205',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220009194b5caf2d28216f69c0e98b1ee106779a6de485a1ba69dd5fd635d2a23e4022002cfb688783df6b4988309c55eaf31ce346b4b5db9330335f7a3acd3b6f85f514121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '94a30a43b9e1c507121456528ef25f39c51c81e3bbf204ffd08e0c4f4a460ba9',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100c4654eada3fdde6a3a3e12c09f40ab30c587ed5daf533a550ac8adba5a3f3089022039c6d938474e81fff50f677a3444f87ef35140ce0d09e7a8ba02ee5b08c667174121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1700n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '9d30a8aa240891d966b1b16771500719e4452f1f8f60564f4276fa5305553cb5',
                    outIdx: 0,
                },
                inputScript:
                    '4830450221008d98777056f9c8b1bb4e3f2fefdbeca1ac9d65d738276e271334ead8f088de060220606388b42a5e7c3eb590ad840e6596b5e48cf5b418bdfaee47c7b2b87b4082af4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: 'f9865e9014f966e612bcc84e8c234dea9c59afbd25507934a6e2c893feff1af7',
                    outIdx: 1,
                },
                inputScript:
                    '4730440220468ea9ee32fe1400fffcb6c1a934c3789213e46d16747dc8746f4b9465b11e7c022003192f77afec1bcecf7ad46ddde813301b383b07177440786e9b1bae9946fb3c4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '470883dd586d4cea4ba5ce78379ef92eb5bb4fd4d59f6dd549da3d8692afb21c',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100ed8bdeedb7decc83d0cf71212a4fe4c21cb4ec091040b27ef15ca716aeb66957022006d12aeb15fc76f15642853dde0b35ae2a5a3efe24cfa275e049fba17690a3914121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1100n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: 'c91999a9755e5236003f4dff60f874bd0330d3cdfdf65e22f10a00ea054289e6',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100a940abcc3bfd26eff3b6d254750ac19361d734a42282164c432d66b62139e8c502207a28c61e435ee42dae5b1964cc457aeeb316717b51ec0cf1af0e1b4e0a5b5a474121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1000n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '2188f495eedfa0bfe96c7aedad66582900c2969c71f5c530e1ac8b55ca7ed326',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204dd6870b836e9482a7b68decdc9447f50a2f9df4f9c4d0b6446e28878386f2c60220654b4131261d41fb5b931a89be777c2716d32b77f0b85ce662ce2cade32ac3264121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1100n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '87c3f038d5754f6feb7f117dcb2fa85a015270025e919591a303429709da2023',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100f36c72b34d0350bf1bee5acea403981d41307e0da65a7405501c6631e24abc510220389ecf6b00d46e9af27d2e2463d74a2453d14da076ec94df83e2f63bbb430f0d4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1100n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '0e906814d55e889a97f46424497b7564cb2ce1659a03b0ac7c71d4d4b3143b75',
                    outIdx: 0,
                },
                inputScript:
                    '473044022070d354ca81b378bb1408102755ee19f112dc84e7c97dc44224ce0ec61cf9da5e02200e601eff33e36fc5e96aef74f28d6329201cb8670250fd09501221c67a5eeb034121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1100n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '221e9f39e8138c0755d8f5b4fe2445a3d645a98310773cd9afae46e4e9ce35f1',
                    outIdx: 1,
                },
                inputScript:
                    '47304402205ae9a030a48fad096f465f9a2d564d5f88a83b2207e2bcf9f96522a4eeca3927022050fb4fb6ca418b3559dde7cf0f6412f82dbcee7710de2c895b5989fdca75a8f84121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 900n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '38353c86f9765f23bbe144cdadf5edbc1f24c12212614977ef1569e60e1cfb78',
                    outIdx: 0,
                },
                inputScript:
                    '47304402207a47b86a75c91022a5f54f2f39d1d2952a8623b8cbdad40ca1d8d25e13f1027502204b5b021a65276886e4f31ce5dfab2eb7979595aecd2b244ca88047453f57e04e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1100n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: 'a29c3cc45360bbce9459d1e4b86b79ac199016b82ab3574ec380edc83d85d947',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100bf4d11242dd28d5ec4de42388d8fafc6bcaa812a20a728f0e86e5b5e51c0005e022041b6bf9034412e9e2377ebf1ea61ef358c05be1a42829b08032bf03be28c9fa04121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 497990n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: 'a78d8acd9925ee2e86a6fede4fcb7bebabacbdd92285e8d195fe86a2459a1ac1',
                    outIdx: 0,
                },
                inputScript:
                    '47304402204f6c5b9e7a8b610bce1eb32c2362fb428137f6797a0a8f463a1043eab51c3dfe02203f5f0c7816573ca5266fb4a5fddb2d29e76d8c79cde8ab8198acaab9ac206dbf4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 700n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: 'd11677c4606a8674a5bfa0e4e6f50aeaa3ff54f3e241e02fdcedde30a08a06fd',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100b13a13af99fcb0946431f7407b35d2ec513c2fc100c6ea5b9c787cd21513461b02207a6549f50789f5027fbef437d7cd74785fbc01f6976eee5b99a60b0515a325ab4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1100n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '10df437f64451165ac1eb371cef97aab8602d6d61c57eb97811fe724fe7371c3',
                    outIdx: 0,
                },
                inputScript:
                    '473044022029e166c7c52719ae6dd4b0e54102f796041c3dec3edb61a87d6cca8acb31b67302206696df121a4b71251c99c1ad9d80f4acb302d44be2ecd860e76f6241675c50264121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2500n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '1bc75da40fc86396873499114418dafec6f6541a09879c5727996fbf938feeec',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100cd99ca822e8cceedff64c67577c4ba55ae1db654c28b9982926269a7b2e1847c022020054e903352d1079c19513d990da774ab12d98860c241c50066bc4f6b37357f4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 5500n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '4ff71400743a3271151352875612d150f690ac1ab6c3d062ce22785935d92444',
                    outIdx: 0,
                },
                inputScript:
                    '47304402200b570f4c81ef54cfc9d77d1fcd615b90063243f99aa665a53a4fa1b6204fb83802200d83088d8dc9690932d4a22e33556221ad1f44dc596b3d31cbff38b2c6a29c0a4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
            {
                prevOut: {
                    txid: '58e4c28a6318d677a49d2bfc0d99fcc069a13dc95881a8403f43da65f0f1ee9f',
                    outIdx: 0,
                },
                inputScript:
                    '483045022100dc7147775fd80ccb6e75710ae2f226249d3a99017ddae7a0163900595967765f02205d84c411885d90a31b41360e8b0a8aa0a70be079c5c5a643db238a52d978835e4121024781b5971a20049fa211c364a868d2fa8f258c31bb3738e01957400067eeee0f',
                sats: 1000000n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04007461623a6865726520697320612043617368746162204d736720666f722075736520696e204361736874616220696e746567726174696f6e207465737473',
            },
            {
                sats: 1000000n,
                outputScript:
                    '76a914d32616c8f849d159b0225f36966ccb85d425e68388ac',
            },
            {
                sats: 713065n,
                outputScript:
                    '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
                spentBy: {
                    txid: '4ca77715698d7f5acab6fcd3703cc07d6a760b4cab064a87c03a755bc734e501',
                    outIdx: 41,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 4576,
        isCoinbase: false,
        isFinal: true,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        block: {
            height: 830308,
            hash: '000000000000000007f40dd57695bb3e592e9769bd74fbe0fe9c8c09db32da61',
            timestamp: 1707162498,
        },
        parsed: {
            recipients: [
                'ecash:qrfjv9kglpyazkdsyf0nd9nvewzagf0xsvv84u226e',
                'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
            ],
            satoshisSent: 0,
            stackArray: [
                '00746162',
                '6865726520697320612043617368746162204d736720666f722075736520696e204361736874616220696e746567726174696f6e207465737473',
            ],
            xecTxType: 'Received' as XecTxType,
            appActions: [
                {
                    app: 'Cashtab Msg',
                    lokadId: '00746162',
                    isValid: true,
                    action: {
                        msg: 'here is a Cashtab Msg for use in Cashtab integration tests',
                    },
                },
            ],
            parsedTokenEntries: [],
            replyAddress: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
        },
    },
];

export const freshWalletWithOneIncomingCashtabMsg: ActiveCashtabWallet = {
    mnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    name: '[Burned] useWallet Mock',
    address: 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg',
    hash: 'dc224140d18053b1c27da53d73fca6f44fc87449',
    sk: '97f2d7fa9745baa45fc1b53be3ecead6c000265cc5115aa4ae4d1f452057eb0c',
    pk: '03ee1364cd7af3a9ffbbbd886388776a6f92a7b8dd986f6a8578885e4b856f7bfb',

    state: {
        balanceSats: 1000000,
        slpUtxos: [],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: 'f11648484c5ac6bf65c04632208d60e809014ed288171cb96e059d0ed7678fde',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                sats: 1000000n,
                isFinal: false,
            },
        ],
        tokens: new Map(),
    },
};

export const requiredUtxoThisToken: ScriptUtxo = {
    outpoint: {
        txid: '423e24bf0715cfb80727e5e7a6ff7b9e37cb2f555c537ab06fdc7fd9b3a0ba3a',
        outIdx: 1,
    },
    blockHeight: 833612,
    isCoinbase: false,
    sats: 546n,
    isFinal: true,
    token: {
        tokenId:
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        atoms: 10000000000n,
        isMintBaton: false,
    },
};

export const vipTokenChronikTokenMocks = {
    token: {
        tokenId:
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: '0',
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
                sats: 50000n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010747454e4553495303475250064752554d50591868747470733a2f2f6269742e6c792f4772756d7079446f634c0001024c0008000000e8d4a51000',
            },
            {
                sats: 546n,
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
                    atoms: 1000000000000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '94cc23c0a01ee35b8b9380b739f1f8d8f6d0e2c09a7785f3d63b928afd23357f',
                    outIdx: 1,
                },
            },
            {
                sats: 48931n,
                outputScript:
                    '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                spentBy: {
                    txid: '94cc23c0a01ee35b8b9380b739f1f8d8f6d0e2c09a7785f3d63b928afd23357f',
                    outIdx: 0,
                },
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
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
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
};
export const bearTokenAndTx = {
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
                sats: 6231556n,
                sequenceNo: 4294967294,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
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
                    atoms: 4444n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                    outIdx: 1,
                },
            },
            {
                sats: 6230555n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 299,
        isCoinbase: false,
        isFinal: true,
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
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
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
};

export const cachetTokenAndTx = {
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
                sats: 2200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010747454e4553495306434143484554064361636865741468747470733a2f2f636173687461622e636f6d2f4c0001020102080000000000989680',
            },
            {
                sats: 546n,
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
                    atoms: 10000000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',
                    outIdx: 0,
                },
            },
            {
                sats: 546n,
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
                    atoms: 0n,
                    isMintBaton: true,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                    outIdx: 0,
                },
            },
            {
                sats: 773n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '343356b9d4acd59065f90b1ace647c1f714f1fd4c411e2cf77081a0246c7416d',
                    outIdx: 3,
                },
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
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
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
};

export const easterEggTokenChronikTokenDetails: TokenInfo = {
    tokenId: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
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
};

export const easterEggTokenChronikGenesisTx = {
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
            sats: 91048n,
            sequenceNo: 4294967295,
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
        },
        {
            sats: 546n,
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 100n,
                isMintBaton: false,
                entryIdx: 0,
            },
            spentBy: {
                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                outIdx: 1,
            },
        },
        {
            sats: 546n,
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 0n,
                isMintBaton: true,
                entryIdx: 0,
            },
        },
        {
            sats: 89406n,
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            spentBy: {
                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                outIdx: 0,
            },
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
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    block: {
        height: 674143,
        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
        timestamp: 1613859311,
    },
};

const savedWalletData = [
    {
        mnemonic:
            'giggle release model music congress choice library bottom story hole tiger document',
        name: 'alpha',
        address: 'ecash:qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep',
        hash: 'a15108d07a1891e35953817b6d92ab77bbc62ac3',
        fundingWif: 'L4PMeJxHDWMJurbU4yhWtEn4qy3kYcPJKpG9f5yrqJcJzCY8cKnU',
        publicKey:
            '03504b4c2eb4f41b554dbbc7c734a9c59849a346b7d8d1cc0e98666ad71538d5eb',
    },
    {
        mnemonic:
            'guilt cricket congress vessel tumble tennis off rapid parade eyebrow loop young',
        name: 'bravo',
        address: 'ecash:qzj4u2pl2nv3kampdnnjc2c30f9lwl50uvvg4nfkfz',
        hash: 'a55e283f54d91b77616ce72c2b117a4bf77e8fe3',
        fundingWif: 'KwyN1LbHeWS2XfP7E7V4kEJmgwhB13VUfDidtpkwzSD77KBKaRpi',
        publicKey:
            '03a63f0a273fb25370866bc4554a4d0e6b63fb4df7e11ddbd0885d194a474d8ee7',
    },
    {
        mnemonic:
            'level render host glory brand hip multiply token pigeon vintage word term',
        name: 'charlie',
        address: 'ecash:qractnfu5p8ms4uesd3yg52p8a0al5d7hvpnus5vsy',
        hash: 'fb85cd3ca04fb8579983624451413f5fdfd1bebb',
        fundingWif: 'Kwjipw1HNsv5o7xcGPL6oBpYudCgFfKt44fC49r87n924acnoytj',
        publicKey:
            '03be84e190407f1549da4863ebcc4a9f2ae27d8484d404d1286034d94677ce3d12',
    },
    {
        mnemonic:
            'quality pretty cricket item tail avocado sound north salute era stool island',
        name: 'delta',
        address: 'ecash:qpf22n5u50kh7wh6zc7ljj9kc2s7xsx85sdsjvxeyf',
        hash: '52a54e9ca3ed7f3afa163df948b6c2a1e340c7a4',
        fundingWif: 'L5eyTTvwEsJPHCr6hmNt2c1PRwjiyu7wLkdKw5X2prduRdzSQhTV',
        publicKey:
            '02d54b79e41b60e8c0e4e2315843e4707e9905486e5b8df4fe45dd5331a4e5c80c',
    },
    {
        mnemonic:
            'forest spike doctor harsh dutch trash powder wool topple tortoise file that',
        name: 'echo',
        address: 'ecash:qpspjncs79we4rlaypscusvdd26853h68s2ach6ket',
        hash: '60194f10f15d9a8ffd20618e418d6ab47a46fa3c',
        fundingWif: 'KwVChvBpEjmY1Yqt7fkeb5ZqzWW6QDn7CWDCkcnNizVi3CVCPTKK',
        publicKey:
            '02e1323cc997925c0dd119700e37c12f2a8c608724b814216ee1d30d911a298c91',
    },
];

export const validSavedWallets: StoredCashtabWallet[] = savedWalletData.map(
    w => ({
        mnemonic: w.mnemonic,
        name: w.name,
        address: w.address,
        hash: w.hash,
        sk: toHex(wif.decode(w.fundingWif).privateKey),
        pk: w.publicKey,
    }),
);

export const validActiveWallets: ActiveCashtabWallet[] = savedWalletData.map(
    w => ({
        mnemonic: w.mnemonic,
        name: w.name,
        address: w.address,
        hash: w.hash,
        sk: toHex(wif.decode(w.fundingWif).privateKey),
        pk: w.publicKey,
        state: {
            balanceSats: 0,
            slpUtxos: [],
            nonSlpUtxos: [],
            tokens: new Map(),
        },
    }),
);

export const mockCacheWalletWithXecAndTokens = {
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    genesisInfo: {
        tokenTicker: 'BEAR',
        tokenName: 'BearNip',
        url: 'https://cashtab.com/',
        decimals: 0,
        hash: '',
    },
    timeFirstSeen: 0,
    genesisSupply: '4444',
    genesisOutputScripts: [
        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    ],
    genesisMintBatons: 0,
    block: {
        height: 782665,
        hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
        timestamp: 1678408305,
    },
};

// tokenId b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc
export const mockCachedInfoCashtabDark = {
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
    genesisSupply: '10000',
    genesisMintBatons: 0,
    genesisOutputScripts: [
        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    ],
};

export const populatedContactList = [
    {
        address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        name: 'alpha',
    },
    {
        address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        name: 'beta',
    },
    {
        address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
        name: 'gamma',
    },
];

export const MOCK_CHRONIK_TOKEN_CALL = {
    tokenId: '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
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
};

export const MOCK_CHRONIK_GENESIS_TX_CALL = {
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
            sats: 1497156989n,
            sequenceNo: 4294967295,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a04534c500001010747454e45534953044347454e0f436173687461622047656e657369731868747470733a2f2f626f6f6d657274616b65732e636f6d2f4c0001094c000800038d7ea4c68000',
        },
        {
            sats: 546n,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            token: {
                tokenId:
                    '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1000000000000000n,
                isMintBaton: false,
                entryIdx: 0,
            },
            spentBy: {
                txid: '4f5af8d3dc9d1fb3dc803a80589cab62c78235264aa90e4f8066b7960804cd74',
                outIdx: 1,
            },
        },
        {
            sats: 1497155685n,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            spentBy: {
                txid: '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
                outIdx: 0,
            },
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
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    block: {
        height: 684837,
        hash: '00000000000000001d065fdd22416c4e8e99803964f4fb9c91af6feb5ead5ff3',
        timestamp: 1620082584,
    },
};
