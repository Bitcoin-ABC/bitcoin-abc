// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { Script, fromHex } from 'ecash-lib';
import { TokenType, ScriptUtxo } from 'chronik-client';

import { AgoraOneshot } from './oneshot';
import { AgoraPartial } from './partial';
import { AgoraOffer } from './agora';
import {
    DUMMY_KEYPAIR,
    getAgoraPartialAcceptFuelInputs,
    getAgoraOneshotAcceptFuelInputs,
    getAgoraCancelFuelInputs,
} from './inputs';

// Create a mock agora partial offer to use in these tests
// Modeled on existing Cashtab tests

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
    makerPk: DUMMY_KEYPAIR.pk,
});
const agoraOfferCachetAlphaOne = new AgoraOffer({
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

// Create a mock agora ONESHOT offer modeled on existing Cashtab tests
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
    cancelPk: DUMMY_KEYPAIR.pk,
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

interface GetAgoraPartialAcceptFuelInputsReturn {
    description: string;
    agoraOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    acceptedAtoms: bigint;
    feePerKb: bigint;
    returned: ScriptUtxo[];
}
interface GetAgoraPartialAcceptFuelInputsError {
    description: string;
    agoraOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    acceptedAtoms: bigint;
    feePerKb: bigint;
    error: string;
}
interface GetAgoraOneshotAcceptFuelInputsReturn {
    description: string;
    oneshotOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    feePerKb: bigint;
    returned: ScriptUtxo[];
}
interface GetAgoraOneshotAcceptFuelInputsError {
    description: string;
    oneshotOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    feePerKb: bigint;
    error: string;
}
interface GetAgoraPartialCancelFuelInputsReturn {
    description: string;
    agoraOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    feePerKb: bigint;
    returned: ScriptUtxo[];
}
interface GetAgoraPartialCancelFuelInputsError {
    description: string;
    agoraOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    feePerKb: bigint;
    error: string;
}
const vectors: {
    getAgoraPartialAcceptFuelInputs: {
        expectedReturns: GetAgoraPartialAcceptFuelInputsReturn[];
        expectedErrors: GetAgoraPartialAcceptFuelInputsError[];
    };
    getAgoraOneshotAcceptFuelInputs: {
        expectedReturns: GetAgoraOneshotAcceptFuelInputsReturn[];
        expectedErrors: GetAgoraOneshotAcceptFuelInputsError[];
    };
    getAgoraCancelFuelInputs: {
        expectedReturns: GetAgoraPartialCancelFuelInputsReturn[];
        expectedErrors: GetAgoraPartialCancelFuelInputsError[];
    };
} = {
    getAgoraPartialAcceptFuelInputs: {
        expectedReturns: [
            {
                description:
                    'We can get a single fuel input to accept the offer, if the wallet has one exactly covering the price + fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // acceptFeeSats 1182n
                // askedSats 5460736n
                // requiredSats 5461918n
                utxos: [{ sats: 5461918n }] as unknown as ScriptUtxo[],
                acceptedAtoms: 546n,
                feePerKb: 1000n,
                returned: [{ sats: 5461918n }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'We can get a single fuel input to accept the offer, if the wallet has one exactly covering the price + fee, at a higher than min fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // acceptFeeSats 2376n
                // askedSats 5460736n
                // requiredSats 5463112
                utxos: [{ sats: 5463112n }] as unknown as ScriptUtxo[],
                acceptedAtoms: 546n,
                feePerKb: 2010n,
                returned: [{ sats: 5463112n }] as unknown as ScriptUtxo[],
            },
            {
                description: 'Two inputs exactly covering the price + fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // acceptFeeSats 1323n
                // askedSats 5460736n
                // requiredSats 5462059n
                utxos: [
                    { sats: 5461917n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
                acceptedAtoms: 546n,
                feePerKb: 1000n,
                returned: [
                    { sats: 5461917n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
            },
            {
                description: 'Three inputs exactly covering the price + fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // acceptFeeSats 1464n
                // askedSats 5460736n
                // requiredSats 5462059n
                utxos: [
                    { sats: 5461917n },
                    { sats: 141n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
                acceptedAtoms: 546n,
                feePerKb: 1000n,
                returned: [
                    { sats: 5461917n },
                    { sats: 141n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
            },
        ],
        expectedErrors: [
            {
                description:
                    'We throw an error if available utxos can only cover 1 satoshi less than price + fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                utxos: [{ sats: 5461917n }] as unknown as ScriptUtxo[],
                acceptedAtoms: 546n,
                feePerKb: 1000n,
                error: 'Insufficient utxos to accept this offer',
            },
        ],
    },
    getAgoraOneshotAcceptFuelInputs: {
        expectedReturns: [
            {
                description:
                    'We can get a single fuel input to accept the offer, if the wallet has one exactly covering the price + fee',
                oneshotOffer: heismanNftOneOffer,
                // acceptFeeSats 740n
                // askedSats 5000000000n
                // requiredSats 5000000740n
                utxos: [{ sats: 5000000740n }] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [{ sats: 5000000740n }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'We can get a single fuel input to accept the offer, if the wallet has one exactly covering the price + fee, at a higher than min fee',
                oneshotOffer: heismanNftOneOffer,
                // acceptFeeSats 1488n
                // askedSats 5000000000n
                // requiredSats 5000001488n
                utxos: [{ sats: 5000001488n }] as unknown as ScriptUtxo[],
                feePerKb: 2010n,
                returned: [{ sats: 5000001488n }] as unknown as ScriptUtxo[],
            },
            {
                description: 'Two inputs exactly covering the price + fee',
                oneshotOffer: heismanNftOneOffer,
                // acceptFeeSats 740n
                // askedSats 5000000000n
                // requiredSats 5000000740n
                utxos: [
                    { sats: 5000000739n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [
                    { sats: 5000000739n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
            },
            {
                description: 'Three inputs exactly covering the price + fee',
                oneshotOffer: heismanNftOneOffer,
                // acceptFeeSats 881n
                // askedSats 5000000000n
                // requiredSats 5000000881n
                utxos: [
                    { sats: 5000000739n },
                    { sats: 141n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [
                    { sats: 5000000739n },
                    { sats: 141n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
            },
        ],
        expectedErrors: [
            {
                description:
                    'We throw an error if available utxos can only cover 1 satoshi less than price + fee',
                oneshotOffer: heismanNftOneOffer,
                utxos: [{ sats: 5000000739n }] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                error: 'Insufficient utxos to accept this offer',
            },
        ],
    },
    getAgoraCancelFuelInputs: {
        expectedReturns: [
            {
                description:
                    'We can get a single fuel input to cancel the offer, if the wallet has one exactly covering the fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // cancelFeeSats 719n
                utxos: [{ sats: 719n }] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [{ sats: 719n }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'We can get a single fuel input to cancel the offer, if the wallet has one exactly covering the fee, at a higher than min fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // cancelFeeSats 1446
                utxos: [{ sats: 1446n }] as unknown as ScriptUtxo[],
                feePerKb: 2010n,
                returned: [{ sats: 1446n }] as unknown as ScriptUtxo[],
            },
            {
                description: 'Two inputs exactly covering the fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // cancelFeeSats 860n
                utxos: [
                    { sats: 718n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [
                    { sats: 718n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
            },
            {
                description: 'Three inputs exactly covering the fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // cancelFeeSats 1001n
                utxos: [
                    { sats: 718n },
                    { sats: 141n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [
                    { sats: 718n },
                    { sats: 141n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
            },
            // ONESHOT cases
            {
                description:
                    'ONESHOT: We can get a single fuel input to cancel the offer, if the wallet has one exactly covering the price + fee',
                agoraOffer: heismanNftOneOffer,
                // cancelFeeSats 535
                utxos: [{ sats: 535n }] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [{ sats: 535n }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'ONESHOT: We can get a single fuel input to cancel the offer, if the wallet has one exactly covering the price + fee, at a higher than min fee',
                agoraOffer: heismanNftOneOffer,
                // cancelFeeSats 1076
                utxos: [{ sats: 1076n }] as unknown as ScriptUtxo[],
                feePerKb: 2010n,
                returned: [{ sats: 1076n }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'ONESHOT: Two inputs exactly covering the price + fee',
                agoraOffer: heismanNftOneOffer,
                // cancelFeeSats 676
                utxos: [
                    { sats: 534n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [
                    { sats: 534n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'ONESHOT: Three inputs exactly covering the price + fee',
                agoraOffer: heismanNftOneOffer,
                // cancelFeeSats 817
                utxos: [
                    { sats: 534n },
                    { sats: 141n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                returned: [
                    { sats: 534n },
                    { sats: 141n },
                    { sats: 142n },
                ] as unknown as ScriptUtxo[],
            },
        ],
        expectedErrors: [
            {
                description:
                    'We throw an error if available utxos can only cover 1 satoshi less than fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                utxos: [{ sats: 718n }] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                error: 'Insufficient utxos to cancel this offer',
            },
            {
                description:
                    'ONESHOT: We throw an error if available utxos can only cover 1 satoshi less than fee',
                agoraOffer: heismanNftOneOffer,
                utxos: [
                    {
                        sats: 534n,
                    },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000n,
                error: 'Insufficient utxos to cancel this offer',
            },
        ],
    },
};

describe('Functions used to get inputs required for accept or cancel txs', () => {
    context('getAgoraPartialAcceptFuelInputs', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getAgoraPartialAcceptFuelInputs;
        for (const expectedReturn of expectedReturns) {
            it(`Return: ${expectedReturn.description}`, () => {
                const { agoraOffer, utxos, acceptedAtoms, feePerKb, returned } =
                    expectedReturn;
                expect(
                    getAgoraPartialAcceptFuelInputs(
                        agoraOffer,
                        utxos,
                        acceptedAtoms,
                        feePerKb,
                    ),
                ).to.deep.equal(returned);
            });
        }
        for (const expectedError of expectedErrors) {
            it(`Error: ${expectedError.description}`, () => {
                const { agoraOffer, utxos, acceptedAtoms, feePerKb, error } =
                    expectedError;
                expect(() =>
                    getAgoraPartialAcceptFuelInputs(
                        agoraOffer,
                        utxos,
                        acceptedAtoms,
                        feePerKb,
                    ),
                ).to.throw(error);
            });
        }
    });
    context('getAgoraOneshotAcceptFuelInputs', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getAgoraOneshotAcceptFuelInputs;
        for (const expectedReturn of expectedReturns) {
            it(`Return: ${expectedReturn.description}`, () => {
                const { oneshotOffer, utxos, feePerKb, returned } =
                    expectedReturn;
                expect(
                    getAgoraOneshotAcceptFuelInputs(
                        oneshotOffer,
                        utxos,
                        feePerKb,
                    ),
                ).to.deep.equal(returned);
            });
        }
        for (const expectedError of expectedErrors) {
            it(`Error: ${expectedError.description}`, () => {
                const { oneshotOffer, utxos, feePerKb, error } = expectedError;
                expect(() =>
                    getAgoraOneshotAcceptFuelInputs(
                        oneshotOffer,
                        utxos,
                        feePerKb,
                    ),
                ).to.throw(error);
            });
        }
    });
    context('getAgoraCancelFuelInputs', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getAgoraCancelFuelInputs;
        for (const expectedReturn of expectedReturns) {
            it(`Return: ${expectedReturn.description}`, () => {
                const { agoraOffer, utxos, feePerKb, returned } =
                    expectedReturn;
                expect(
                    getAgoraCancelFuelInputs(agoraOffer, utxos, feePerKb),
                ).to.deep.equal(returned);
            });
        }
        for (const expectedError of expectedErrors) {
            it(`Error: ${expectedError.description}`, () => {
                const { agoraOffer, utxos, feePerKb, error } = expectedError;
                expect(() =>
                    getAgoraCancelFuelInputs(agoraOffer, utxos, feePerKb),
                ).to.throw(error);
            });
        }
    });
});
