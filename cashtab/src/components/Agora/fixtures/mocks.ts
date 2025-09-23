// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { FEE_SATS_PER_KB_CASHTAB_LEGACY } from 'constants/transactions';
import { fromHex, Script } from 'ecash-lib';
import { AgoraPartial, AgoraOffer, AgoraOneshot } from 'ecash-agora';
import CashtabCache, { CashtabCachedTokenInfo } from 'config/CashtabCache';
import { TokenType } from 'chronik-client';
import { ActiveCashtabWallet } from 'wallet';
/**
 * Mocks for the Agora screen
 * Note that these mocks must be properly typed AgoraOffer<s>
 * to accurately mock the ecash-agora lib use of the screen
 */

// Real wallet with a (trace) balance on 20241017 if anyone wants it 👀
export const agoraPartialAlphaWallet: ActiveCashtabWallet = {
    state: {
        balanceSats: 420000,
        slpUtxos: [
            {
                outpoint: {
                    txid: '9cf904c798295bfee43670162dc816e25d129ae9a0b13a41f11560cf7dbbb5b8',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                sats: 546n,
                isFinal: false,
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 100000n,
                    isMintBaton: false,
                },
            },
            {
                outpoint: {
                    txid: 'e4d6a30f647dd8f2ab91c5bdb86b5ce68430638b4ed49b46e71b055627a76078',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                sats: 546n,
                isFinal: false,
                token: {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 3000n,
                    isMintBaton: false,
                },
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '5963aebb41910aee8014cbbf2e2fb487dcbecb8b4a66b26e07f5b6542355bbf7',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                sats: 420000n,
                isFinal: false,
            },
        ],
        tokens: new Map([
            [
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '1000.00',
            ],
            [
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                '3000',
            ],
        ]),
    },
    mnemonic:
        'boat lava egg soap winter alone minute erode evoke dune mixture clump',

    name: 'Agora Partial Alpha',
    hash: '03b830e4b9dce347f3495431e1f9d1005f4b4204',
    address: 'ecash:qqpmsv8yh8wwx3lnf92rrc0e6yq97j6zqs8av8vx8h',
    sk: '0c368e6f3df4990da1a6a36435fa2f83ad399c8b2e45ff59676989c43578f431',
    pk: '0233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afd',
};

// Real wallet with a (trace) balance on 20241017 if anyone wants it 👀
export const agoraPartialBetaWallet: ActiveCashtabWallet = {
    state: {
        balanceSats: 4200,
        slpUtxos: [
            {
                outpoint: {
                    txid: '50b388cd351b7d22d82dcab8d1ea58c461a28884f856a95399ba9a161a5a1152',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                sats: 546n,
                isFinal: false,
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 30000n,
                    isMintBaton: false,
                },
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '4711d244d0f540e6fcd69c01a8095f692da2a66ae7a7da8990627ecf12f727f3',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                // Enough sats for the min buy in orderbook buy test
                sats: 39016n,
                isFinal: false,
            },
        ],
        tokens: new Map([
            [
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '300.00',
            ],
        ]),
    },
    mnemonic:
        'end object argue chalk toward blouse square primary fragile glad engine paddle',
    name: 'Agora Partial Beta',
    hash: 'f208ef75eb0dd778ea4540cbd966a830c7b94bb0',
    address: 'ecash:qreq3mm4avxaw782g4qvhktx4qcv0w2tkqj3j5jaad',
    sk: '895eab6d2f84b8d534907f209173ad9404fc796b9f5c1651dd4501acda3e1cc5',
    pk: '021e75febb8ae57a8805e80df93732ab7d5d8606377cb30c0f02444809cc085f39',
};

export const agoraPartialBetaMoreBalanceWallet: ActiveCashtabWallet = {
    state: {
        balanceSats: 10_000_000_00,
        slpUtxos: [
            {
                outpoint: {
                    txid: '50b388cd351b7d22d82dcab8d1ea58c461a28884f856a95399ba9a161a5a1152',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                sats: 546n,
                isFinal: false,
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 30000n,
                    isMintBaton: false,
                },
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '4711d244d0f540e6fcd69c01a8095f692da2a66ae7a7da8990627ecf12f727f3',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                // 10 million XEC
                sats: 10_000_000_00n,
                isFinal: false,
            },
        ],
        tokens: new Map([
            [
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '300.00',
            ],
        ]),
    },
    mnemonic:
        'end object argue chalk toward blouse square primary fragile glad engine paddle',
    hash: 'f208ef75eb0dd778ea4540cbd966a830c7b94bb0',
    address: 'ecash:qreq3mm4avxaw782g4qvhktx4qcv0w2tkqj3j5jaad',
    sk: '895eab6d2f84b8d534907f209173ad9404fc796b9f5c1651dd4501acda3e1cc5',
    pk: '021e75febb8ae57a8805e80df93732ab7d5d8606377cb30c0f02444809cc085f39',
    name: 'Agora Partial Beta Moar Balance',
};

// CACHET candle created by Agora Partial Alpha
// Created by approx params offering 100, min 0.1, 10,000 XEC per CACHET
const agoraPartialCachetAlphaOne = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1040365320,
    minAcceptedScaledTruncAtoms: 2147470n,
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 5497n,
    scriptLen: 214,
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    tokenProtocol: 'SLP',
    atomsScaleFactor: 214747n,
    tokenType: 1,
    truncAtoms: 10000n,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
export const agoraOfferCachetAlphaOne = new AgoraOffer({
    outpoint: {
        txid: '6d9f99d86c869b9ef2ca84c0c3ceb6889da6a0360b75ea0c82b7744dec8cd0bf',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        atoms: 10000n,
        isMintBaton: false,
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            number: 1,
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: '6d9f99d86c869b9ef2ca84c0c3ceb6889da6a0360b75ea0c82b7744dec8cd0bf',
        },
        signData: {
            redeemScript: agoraPartialCachetAlphaOne.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialCachetAlphaOne,
    },
});

// CACHET candle created by Agora Partial Alpha
// Created by approx params offering 200, min 0.2, 1200 XEC per CACHET
const agoraPartialCachetAlphaTwo = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1653017945,
    minAcceptedScaledTruncAtoms: 2147460n,
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 22906n,
    scriptLen: 214,
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    tokenProtocol: 'SLP',
    atomsScaleFactor: 107373n,
    tokenType: 1,
    truncAtoms: 20000n,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
export const agoraOfferCachetAlphaTwo = new AgoraOffer({
    outpoint: {
        txid: '0c93907dc9377b2c8bfb1ca8f8ce1ce24adb4ab1289cdc94511a989caea43ccc',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        atoms: 20000n,
        isMintBaton: false,
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            number: 1,
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: '0c93907dc9377b2c8bfb1ca8f8ce1ce24adb4ab1289cdc94511a989caea43ccc',
        },
        signData: {
            redeemScript: agoraPartialCachetAlphaTwo.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialCachetAlphaTwo,
    },
});

// BULL candle created by Agora Partial Alpha
// Created by approx params offering 888, min 8, 50,000 XEC per BULL
const agoraPartialBullAlphaOne = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1350463393,
    minAcceptedScaledTruncAtoms: 19346408n,
    numSatsTruncBytes: 2,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 31697n,
    scriptLen: 216,
    tokenId: '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
    tokenProtocol: 'SLP',
    atomsScaleFactor: 2418301n,
    tokenType: 1,
    truncAtoms: 888n,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
export const agoraOfferBullAlphaOne = new AgoraOffer({
    outpoint: {
        txid: '25c4d4ae16b17d7259948b2b841984c7e63756bca7f79d5cee94c7dc93dd484c',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        atoms: 888n,
        isMintBaton: false,
        tokenId:
            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
        tokenType: {
            number: 1,
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: '25c4d4ae16b17d7259948b2b841984c7e63756bca7f79d5cee94c7dc93dd484c',
        },
        signData: {
            redeemScript: agoraPartialBullAlphaOne.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialBullAlphaOne,
    },
});

// CACHET candle created by Agora Partial Beta
// Created by approx params offering 300, min 0.3, 12,000 XEC per CACHET
const agoraPartialCachetBetaOne = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1075803086,
    minAcceptedScaledTruncAtoms: 2147460n,
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 1527n,
    scriptLen: 214,
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    tokenProtocol: 'SLP',
    atomsScaleFactor: 71582n,
    tokenType: 1,
    truncAtoms: 30000n,
    makerPk: fromHex(agoraPartialBetaWallet.pk),
});
export const agoraOfferCachetBetaOne = new AgoraOffer({
    outpoint: {
        txid: '819cb562c90c0994362f753bbd0c74730a8030785fae1c5ef45fdf4f211a093f',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        atoms: 30000n,
        isMintBaton: false,
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            number: 1,
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: '819cb562c90c0994362f753bbd0c74730a8030785fae1c5ef45fdf4f211a093f',
        },
        signData: {
            // "redeemScript" key is calculated from the built AgoraPartial
            redeemScript: agoraPartialCachetBetaOne.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialCachetBetaOne,
    },
});

// Unacceptable CACHET offer
// CACHET candle created by Agora Partial Alpha
// Created by approx params offering 100, min 0.1, 10,000 XEC per CACHET
const agoraPartialCachetAlphaUnacceptable = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1022658985,
    minAcceptedScaledTruncAtoms: 2225600000n,
    numSatsTruncBytes: 0,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 214n,
    scriptLen: 212,
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    tokenProtocol: 'SLP',
    atomsScaleFactor: 214n,
    tokenType: 1,
    truncAtoms: 10000000n,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
export const agoraOfferCachetAlphaUnacceptable = new AgoraOffer({
    outpoint: {
        txid: 'b59e70f3ea5d582d09d977240cc7b7c984a13f35778d594b1b4e420b80f1936d',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        atoms: 10000000n,
        isMintBaton: false,
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            number: 1,
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: 'b59e70f3ea5d582d09d977240cc7b7c984a13f35778d594b1b4e420b80f1936d',
        },
        signData: {
            redeemScript: agoraPartialCachetAlphaUnacceptable.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialCachetAlphaUnacceptable,
    },
});

// XECX candle created by Agora Partial Alpha
// Copied from real offer, min accept 96k XECX, lots of partial accepts already in
const agoraPartialXecxAlphaOne = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1385162239,
    minAcceptedScaledTruncAtoms: 1875000n,
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 1,
    scaledTruncAtomsPerTruncSat: 5n,
    scriptLen: 194,
    tokenId: 'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
    tokenProtocol: 'ALP',
    atomsScaleFactor: 5n,
    tokenType: 0,
    truncAtoms: 175289017n,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
export const agoraOfferXecxAlphaOne = new AgoraOffer({
    outpoint: {
        txid: '7d67527f2c6d0748a5ab94983110ec35d2f39c626dd592558e583a4544ac3913',
        outIdx: 2,
    },
    status: 'OPEN',
    token: {
        atoms: 44873988352n,
        isMintBaton: false,
        tokenId:
            'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
        tokenType: {
            number: 0,
            protocol: 'ALP',
            type: 'ALP_TOKEN_TYPE_STANDARD',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 2,
            txid: '7d67527f2c6d0748a5ab94983110ec35d2f39c626dd592558e583a4544ac3913',
        },
        signData: {
            redeemScript: agoraPartialXecxAlphaOne.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialXecxAlphaOne,
    },
});

export const scamAgoraPartial = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1174486988,
    minAcceptedScaledTruncAtoms: 260100n,
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 26n,
    scriptLen: 209,
    tokenId: '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
    tokenProtocol: 'SLP',
    atomsScaleFactor: 2601n,
    tokenType: 1,
    truncAtoms: 825472n,
    // Does not correspond with real offer but do this for testing
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
export const scamAgoraOffer = new AgoraOffer({
    outpoint: {
        txid: '0c063e07319536f2ae46103f77c171b64ede1a64c3994f6e45531ee6d3daad0d',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        atoms: 825472n,
        isMintBaton: false,
        tokenId:
            '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        } as const,
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: '0c063e07319536f2ae46103f77c171b64ede1a64c3994f6e45531ee6d3daad0d',
        },
        signData: {
            // "redeemScript" key is calculated from the built AgoraPartial
            redeemScript: scamAgoraPartial.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: scamAgoraPartial,
    },
});

const mockFirmaPartial = new AgoraPartial({
    truncAtoms: 1526n,
    numAtomsTruncBytes: 2,
    atomsScaleFactor: 1407261n,
    scaledTruncAtomsPerTruncSat: 3112n,
    numSatsTruncBytes: 2,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
    minAcceptedScaledTruncAtoms: 21108915n,
    tokenId: '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
    tokenType: 0,
    tokenProtocol: 'ALP',
    scriptLen: 209,
    enforcedLockTime: 1647103223,
    dustSats: 546n,
});
export const mockFirmaOffer = new AgoraOffer({
    outpoint: {
        txid: '290986f00f48a2eefda8bebb86f585fa2df765ebdae0a1b4a886500ec3ddfe26',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        tokenId:
            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
        tokenType: {
            protocol: 'ALP',
            type: 'ALP_TOKEN_TYPE_STANDARD',
            number: 0,
        },
        atoms: 100007936n,
        isMintBaton: false,
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: '290986f00f48a2eefda8bebb86f585fa2df765ebdae0a1b4a886500ec3ddfe26',
        },
        signData: {
            // "redeemScript" key is calculated from the built AgoraPartial
            redeemScript: mockFirmaPartial.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: mockFirmaPartial,
    },
});

// Affordable CACHET offer for testing auto-selection
// Created by approx params offering 100, min 0.1, 1,000 XEC per CACHET (affordable)
const agoraPartialCachetAffordable = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1040365320,
    minAcceptedScaledTruncAtoms: 1000n, // Small min accepted
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 1000n, // Much smaller scaling factor
    scriptLen: 214,
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    tokenProtocol: 'SLP',
    atomsScaleFactor: 1000n, // Much smaller scale factor
    tokenType: 1,
    truncAtoms: 10000n,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
export const agoraOfferCachetAffordable = new AgoraOffer({
    outpoint: {
        txid: 'affordable123456789abcdef123456789abcdef123456789abcdef123456789abc',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        atoms: 10000n,
        isMintBaton: false,
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            number: 1,
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: 'affordable123456789abcdef123456789abcdef123456789abcdef123456789abc',
        },
        signData: {
            redeemScript: agoraPartialCachetAffordable.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialCachetAffordable,
    },
});

// Unaffordable CACHET offer for testing auto-selection
// Created by approx params offering 100, min 50, 50,000 XEC per CACHET (unaffordable)
const agoraPartialCachetUnaffordable = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1040365320,
    minAcceptedScaledTruncAtoms: 1073735000n, // Much higher min accepted
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 5497n,
    scriptLen: 214,
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    tokenProtocol: 'SLP',
    atomsScaleFactor: 214747n,
    tokenType: 1,
    truncAtoms: 10000n,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
export const agoraOfferCachetUnaffordable = new AgoraOffer({
    outpoint: {
        txid: 'unaffordable123456789abcdef123456789abcdef123456789abcdef123456789abc',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        atoms: 10000n,
        isMintBaton: false,
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            number: 1,
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 1,
            txid: 'unaffordable123456789abcdef123456789abcdef123456789abcdef123456789abc',
        },
        signData: {
            redeemScript: agoraPartialCachetUnaffordable.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialCachetUnaffordable,
    },
});

export const cachetCacheMocks = {
    token: {
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 0,
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
        timeFirstSeen: 0,
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
                txType: 'GENESIS' as const,
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL' as const,
        block: {
            height: 838192,
            hash: '0000000000000000132232769161d6211f7e6e20cf63b26e5148890aacd26962',
            timestamp: 1711779364,
        },
    },
};
export const bullCacheMocks = {
    token: {
        tokenId:
            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 0,
        genesisInfo: {
            tokenTicker: 'BULL',
            tokenName: 'Bull',
            url: 'https://cashtab.com/',
            decimals: 0,
            hash: '',
        },
        block: {
            height: 835482,
            hash: '0000000000000000133bf16cb7fdab5c6ff64a874632eb2fe80265e34a6ad99f',
            timestamp: 1710174132,
        },
    },
    tx: {
        txid: '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'f211007def30735a245bdaa6f9efe429c999e02713f6ce6328478da3444b7248',
                    outIdx: 1,
                },
                inputScript:
                    '47304402207801a307548c5ecccd6e37043bda5e96cb9d27c93e4e60deaff4344605f138b202201a7fd155a42171c4b3331425b3e708df4e9606edfd221b2e500e3fb6bb541f2b412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 981921n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010747454e455349530442554c4c0442756c6c1468747470733a2f2f636173687461622e636f6d2f4c0001004c00080000000001406f40',
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 21000000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '3dff51c3a8a78dcd56ef77dcf041aa5167e719ebd6d8c4f6cacb6e06d0b851f4',
                    outIdx: 0,
                },
            },
            {
                sats: 981078n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '4d8c8d06b724493f5ab172a18d9bf9f4d8419c09bc5a93fe780902b21dab75ba',
                    outIdx: 0,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 296,
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
                txType: 'GENESIS' as const,
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL' as const,
        block: {
            height: 835482,
            hash: '0000000000000000133bf16cb7fdab5c6ff64a874632eb2fe80265e34a6ad99f',
            timestamp: 1710174132,
        },
    },
};
export const scamCacheMocks = {
    token: {
        tokenId:
            '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        } as const,
        timeFirstSeen: 1729800176,
        genesisInfo: {
            tokenTicker: 'BUX',
            tokenName: 'Badger Universal Token',
            url: 'https://bux.digital',
            decimals: 2,
            hash: '',
        },
        block: {
            height: 867981,
            hash: '00000000000000001d559ee486061f5157292d0409643b530945824b29f4efe7',
            timestamp: 1729801148,
        },
    },
    tx: {
        txid: '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'cf7204ea08d44df721df0a1174bb089f70fa702e48522e10c4109dcf6e22ba99',
                    outIdx: 0,
                },
                inputScript:
                    '41c49a217049062d517dbf6884fc4d34c1e29b39e387782de7be7214fb3aefdea3f875e70cab2aacf570084a8332c89cf3c2fe01b43007cd35991a4d4f0dd403f9412103e8f234ebcc6d04a7046f53b2fae4c2dd2904de5da609632f50277b90af57a9d5',
                sats: 4200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914a774587b6a06e40bfe1731f1aa85f8e1f6771a1188ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010747454e45534953034255581642616467657220556e6976657273616c20546f6b656e1368747470733a2f2f6275782e6469676974616c4c0001020102080000000000989680',
            },
            {
                sats: 546n,
                outputScript:
                    '76a914a774587b6a06e40bfe1731f1aa85f8e1f6771a1188ac',
                token: {
                    tokenId:
                        '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    } as const,
                    atoms: 10000000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '982e300279bc9e626ad726f71e44733335ab91789aff1f650a5197c75bb19228',
                    outIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914a774587b6a06e40bfe1731f1aa85f8e1f6771a1188ac',
                token: {
                    tokenId:
                        '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    } as const,
                    atoms: 0n,
                    isMintBaton: true,
                    entryIdx: 0,
                },
            },
            {
                sats: 2424n,
                outputScript:
                    '76a914a774587b6a06e40bfe1731f1aa85f8e1f6771a1188ac',
                spentBy: {
                    txid: '982e300279bc9e626ad726f71e44733335ab91789aff1f650a5197c75bb19228',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1729800176,
        size: 340,
        isCoinbase: false,
        isFinal: false,
        tokenEntries: [
            {
                tokenId:
                    '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                } as const,
                txType: 'GENESIS' as const,
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL' as const,
        block: {
            height: 867981,
            hash: '00000000000000001d559ee486061f5157292d0409643b530945824b29f4efe7',
            timestamp: 1729801148,
        },
    },
};

export const CachedCachet = {
    tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE', number: 1 },
    genesisInfo: {
        tokenTicker: 'CACHET',
        tokenName: 'Cachet',
        url: 'https://cashtab.com/',
        decimals: 2,
        hash: '',
    },
    timeFirstSeen: 1711776546,
    genesisSupply: '100000.00',
    genesisOutputScripts: [
        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    ],
    genesisMintBatons: 1,
    block: {
        height: 838192,
        hash: '0000000000000000132232769161d6211f7e6e20cf63b26e5148890aacd26962',
        timestamp: 1711779364,
    },
};

export const tokenMockXecx = {
    tokenId: 'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
    tx: {
        txid: 'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '9ed5901319cad00e59099d09d8bbf51e2fdf99355652328a28958f2a39679866',
                    outIdx: 3,
                },
                inputScript:
                    '417c385fcf803ce611628beaf13449e1781116dff0a822d7798fe63ead1c15076d9557e3ff45eee3861e0d7569430a5a12a0a1002ee41860572ade51e078139c4c412103e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
                sats: 12544610190n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a504c57534c5032000747454e4553495304584543580a5374616b6564205845430d7374616b65645865632e636f6d002103e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f65002010e21fdc39e0101',
            },
            {
                sats: 546n,
                outputScript:
                    '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
                token: {
                    tokenId:
                        'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    } as const,
                    atoms: 1781404606734n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '84164e7fa1b0372a0391dd3ac7651ce9f06e5e8dbf7aece2ba2cdddf8b72b239',
                    outIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
                token: {
                    tokenId:
                        'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    } as const,
                    atoms: 0n,
                    isMintBaton: true,
                    entryIdx: 0,
                },
            },
            {
                sats: 12544608388n,
                outputScript:
                    '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
                spentBy: {
                    txid: 'fe482e5ca71a4bbabd2a1a38838a306fe18e24d4b68ac3e6ec1a8972c155f8c1',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 353,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                tokenType: {
                    protocol: 'ALP' as const,
                    type: 'ALP_TOKEN_TYPE_STANDARD' as const,
                    number: 0,
                },
                txType: 'GENESIS' as const,
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL' as const,
        isFinal: true,
        block: {
            height: 875217,
            hash: '00000000000000000c8c86590db96c636fc46ccc2860b78606f7d91c28f578be',
            timestamp: 1734136719,
        },
    },
    tokenInfo: {
        tokenId:
            'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
        tokenType: {
            protocol: 'ALP',
            type: 'ALP_TOKEN_TYPE_STANDARD',
            number: 0,
        } as const,
        timeFirstSeen: 0,
        genesisInfo: {
            tokenTicker: 'XECX',
            tokenName: 'Staked XEC',
            url: 'stakedXec.com',
            decimals: 2,
            data: '',
            authPubkey:
                '03e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
        },
        block: {
            height: 875217,
            hash: '00000000000000000c8c86590db96c636fc46ccc2860b78606f7d91c28f578be',
            timestamp: 1734136719,
        },
    },
};

export const CachedXecx = {
    tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD', number: 0 },
    genesisInfo: {
        tokenTicker: 'XECX',
        tokenName: 'Staked XEC',
        url: 'stakedXec.com',
        decimals: 2,
        data: '',
        authPubkey:
            '03e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
    },
    timeFirstSeen: 1734135899,
    genesisSupply: '17814046067.34',
    genesisOutputScripts: [
        '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
    ],
    genesisMintBatons: 1,
    block: {
        height: 875217,
        hash: '00000000000000000c8c86590db96c636fc46ccc2860b78606f7d91c28f578be',
        timestamp: 1734136719,
    },
};

export const SettingsUsd = {
    autoCameraOff: false,
    autoCameraOn: false,
    balanceVisible: true,
    fiatCurrency: 'usd',
    hideMessagesFromUnknownSenders: false,
    sendModal: false,
    satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate to match hardcoded transaction hexes
    showMessages: false,
    toggleHideBalance: false,
};

/** Mocks for Collections */
export const heismanCollectionGroupTokenId =
    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a';
export const cachedHeisman: CashtabCachedTokenInfo = {
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
        number: 129,
    },
    genesisInfo: {
        tokenTicker: 'HSM',
        tokenName: 'The Heisman',
        url: 'https://en.wikipedia.org/wiki/Heisman_Trophy',
        decimals: 0,
        hash: '73229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb976',
    },
    timeFirstSeen: 1714048251,
    genesisSupply: '89',
    genesisOutputScripts: [
        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    ],
    genesisMintBatons: 0,
    block: {
        height: 841852,
        hash: '00000000000000000cea344b4130a2de214200266ad0d67253eea01eeb34a48d',
        timestamp: 1714048284,
    },
};

/** Oneshot mocks */
const heismanNftOne = new AgoraOneshot({
    enforcedOutputs: [
        {
            sats: 0n,
            script: new Script(
                fromHex(
                    '6a04534c500001410453454e4420be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c080000000000000000080000000000000001',
                ),
            ),
        },
        {
            sats: 5000000000n,
            script: new Script(
                fromHex('76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'),
            ),
        },
    ],
    cancelPk: fromHex(agoraPartialAlphaWallet.pk),
});
const heismanNftOneUtxo = {
    outpoint: {
        outIdx: 1,
        txid: 'd30e55d27ec479d5b683be75321fa6fca2a3b10e8527d6828d30e0ddf67b4b40',
    },
    token: {
        tokenId:
            'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        } as TokenType,
        atoms: 1n,
        isMintBaton: false,
    },
    sats: 546n,
};
export const heismanNftOneOffer = new AgoraOffer({
    variant: {
        type: 'ONESHOT',
        params: heismanNftOne,
    },
    status: 'OPEN',
    outpoint: heismanNftOneUtxo.outpoint,
    txBuilderInput: {
        prevOut: heismanNftOneUtxo.outpoint,
        signData: {
            sats: heismanNftOneUtxo.sats,
            redeemScript: heismanNftOne.script(),
        },
    },
    token: heismanNftOneUtxo.token,
});

export const heismanNftOneCache = {
    tx: {
        txid: 'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100b485b532b1d5532791292d8168cba3549cf3f32df32436f0131d550c1187a77b02206898f4e113acbbdbab5ff3045b2e62624f5f66017caecb472c01b8fa83c35bcb412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    atoms: 1n,
                    isMintBaton: false,
                    entryIdx: 1,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '34059324553d4e71c96718a4eb1958d8b4d9613decd860cd714d5812a1612954',
                    outIdx: 2,
                },
                inputScript:
                    '47304402203be48792b013d852678f15c2e2980cca23345a99c5681b976a070cc9d3be1964022030f3f3ddc7bf3034cacb32925787fd925b1c978252db009cb74d03ac201bd404412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 32751479n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001410747454e45534953024c4b0c4c61727279204b656c6c65792a68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f4c617272795f4b656c6c657920b90001b24f54d893a15d61e84eacaec86a025abf4da6b7f02f60a439a013dc2401004c00080000000000000001',
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    atoms: 1n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '9c6c1c84379f4253736952bf5bc320b553952542d9ccb4c43976857e3c215c04',
                    outIdx: 0,
                },
            },
            {
                sats: 32750465n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '56a2fee6edc3e451166ff1c943b691102741bd8fd66b5199f72777fbe2612d23',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1714048520,
        size: 503,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'GENESIS' as const,
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
                groupTokenId:
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
            },
            {
                tokenId:
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'NONE',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL' as const,
        block: {
            height: 841857,
            hash: '0000000000000000017ea24ea1849cee3d33c33e641de3c4527186ac77a84085',
            timestamp: 1714049079,
        },
    },
    token: {
        tokenId:
            'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        },
        timeFirstSeen: 1714048520,
        genesisInfo: {
            tokenTicker: 'LK',
            tokenName: 'Larry Kelley',
            url: 'https://en.wikipedia.org/wiki/Larry_Kelley',
            decimals: 0,
            hash: 'b90001b24f54d893a15d61e84eacaec86a025abf4da6b7f02f60a439a013dc24',
        },
        block: {
            height: 841857,
            hash: '0000000000000000017ea24ea1849cee3d33c33e641de3c4527186ac77a84085',
            timestamp: 1714049079,
        },
    },
};

export const cachedHeismanNftOne: CashtabCachedTokenInfo = {
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
        number: 65,
    },
    genesisInfo: {
        tokenTicker: 'LK',
        tokenName: 'Larry Kelley',
        url: 'https://en.wikipedia.org/wiki/Larry_Kelley',
        decimals: 0,
        hash: 'b90001b24f54d893a15d61e84eacaec86a025abf4da6b7f02f60a439a013dc24',
    },
    timeFirstSeen: 1714048520,
    genesisSupply: '1',
    genesisOutputScripts: [
        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
    ],
    genesisMintBatons: 0,
    block: {
        height: 841857,
        hash: '0000000000000000017ea24ea1849cee3d33c33e641de3c4527186ac77a84085',
        timestamp: 1714049079,
    },
    groupTokenId:
        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
};

export const CollectionTestCache = new CashtabCache(
    new Map([
        [heismanCollectionGroupTokenId, cachedHeisman],
        [heismanNftOneUtxo.token.tokenId, cachedHeismanNftOne],
    ]),
);

export const heismanCollectionCacheMocks = {
    tokenId: heismanCollectionGroupTokenId,
    tx: {
        txid: 'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100eb2e68c7d02eda2dd64c22a079d832c5c85f34f1ced264cd3b37658d4cd0b89e02203e204cd625a05c8ba59291567bc14d0bfa193a9a37cbc00aec804a224dc910d1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 32766028n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001810747454e455349530348534d0b54686520486569736d616e2c68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f486569736d616e5f54726f7068792073229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb97601004c00080000000000000059',
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    atoms: 89n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                    outIdx: 0,
                },
            },
            {
                sats: 32764762n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1714048251,
        size: 358,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'GENESIS' as const,
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL' as const,
        block: {
            height: 841852,
            hash: '00000000000000000cea344b4130a2de214200266ad0d67253eea01eeb34a48d',
            timestamp: 1714048284,
        },
    },
    token: {
        tokenId:
            'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
            number: 129,
        },
        timeFirstSeen: 1714048251,
        genesisInfo: {
            tokenTicker: 'HSM',
            tokenName: 'The Heisman',
            url: 'https://en.wikipedia.org/wiki/Heisman_Trophy',
            decimals: 0,
            hash: '73229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb976',
        },
        block: {
            height: 841852,
            hash: '00000000000000000cea344b4130a2de214200266ad0d67253eea01eeb34a48d',
            timestamp: 1714048284,
        },
    },
};
export const lkCacheMocks = {
    tokenId: heismanNftOneUtxo.token.tokenId,
    tx: {
        txid: 'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                    outIdx: 2,
                },
                inputScript:
                    '483045022100b485b532b1d5532791292d8168cba3549cf3f32df32436f0131d550c1187a77b02206898f4e113acbbdbab5ff3045b2e62624f5f66017caecb472c01b8fa83c35bcb412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    atoms: 1n,
                    isMintBaton: false,
                    entryIdx: 1,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
            {
                prevOut: {
                    txid: '34059324553d4e71c96718a4eb1958d8b4d9613decd860cd714d5812a1612954',
                    outIdx: 2,
                },
                inputScript:
                    '47304402203be48792b013d852678f15c2e2980cca23345a99c5681b976a070cc9d3be1964022030f3f3ddc7bf3034cacb32925787fd925b1c978252db009cb74d03ac201bd404412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sats: 32751479n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001410747454e45534953024c4b0c4c61727279204b656c6c65792a68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f4c617272795f4b656c6c657920b90001b24f54d893a15d61e84eacaec86a025abf4da6b7f02f60a439a013dc2401004c00080000000000000001',
            },
            {
                sats: 546n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    atoms: 1n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '9c6c1c84379f4253736952bf5bc320b553952542d9ccb4c43976857e3c215c04',
                    outIdx: 0,
                },
            },
            {
                sats: 32750465n,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '56a2fee6edc3e451166ff1c943b691102741bd8fd66b5199f72777fbe2612d23',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1714048520,
        size: 503,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'GENESIS' as const,
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
                groupTokenId:
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
            },
            {
                tokenId:
                    'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'NONE',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL' as const,
        block: {
            height: 841857,
            hash: '0000000000000000017ea24ea1849cee3d33c33e641de3c4527186ac77a84085',
            timestamp: 1714049079,
        },
    },
    token: {
        tokenId:
            'be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        },
        timeFirstSeen: 1714048520,
        genesisInfo: {
            tokenTicker: 'LK',
            tokenName: 'Larry Kelley',
            url: 'https://en.wikipedia.org/wiki/Larry_Kelley',
            decimals: 0,
            hash: 'b90001b24f54d893a15d61e84eacaec86a025abf4da6b7f02f60a439a013dc24',
        },
        block: {
            height: 841857,
            hash: '0000000000000000017ea24ea1849cee3d33c33e641de3c4527186ac77a84085',
            timestamp: 1714049079,
        },
    },
};

export const agoraPartialAlphaHighBalanceWallet: ActiveCashtabWallet = {
    ...agoraPartialAlphaWallet,
    state: {
        ...agoraPartialAlphaWallet.state,
        balanceSats: 10_000_000,
        nonSlpUtxos: [
            {
                ...agoraPartialAlphaWallet.state.nonSlpUtxos[0],
                sats: 10_000_000n,
            },
        ],
    },
};

export const agoraPartialBetaHighBalanceWallet: ActiveCashtabWallet = {
    ...agoraPartialBetaWallet,
    state: {
        ...agoraPartialBetaWallet.state,
        balanceSats: 10_000_000,
        nonSlpUtxos: [
            {
                ...agoraPartialBetaWallet.state.nonSlpUtxos[0],
                sats: 10_000_000n,
            },
        ],
    },
};
