// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { initWasm, Script, fromHex } from 'ecash-lib';
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
    dustAmount: 546,
    enforcedLockTime: 1040365320,
    minAcceptedScaledTruncTokens: 2147470n,
    numSatsTruncBytes: 1,
    numTokenTruncBytes: 0,
    scaledTruncTokensPerTruncSat: 5497n,
    scriptLen: 214,
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    tokenProtocol: 'SLP',
    tokenScaleFactor: 214747n,
    tokenType: 1,
    truncTokens: 10000n,
    makerPk: DUMMY_KEYPAIR.pk,
});
const agoraOfferCachetAlphaOne = new AgoraOffer({
    outpoint: {
        txid: '6d9f99d86c869b9ef2ca84c0c3ceb6889da6a0360b75ea0c82b7744dec8cd0bf',
        outIdx: 1,
    },
    status: 'OPEN',
    token: {
        amount: '10000',
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
            value: 546,
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
            value: 0n,
            script: new Script(
                fromHex(
                    '6a04534c500001410453454e4420be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c080000000000000000080000000000000001',
                ),
            ),
        },
        {
            value: 5000000000n,
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
        amount: '1',
        isMintBaton: false,
    },
    value: 546,
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
            value: heismanNftOneUtxo.value,
            redeemScript: heismanNftOne.script(),
        },
    },
    token: heismanNftOneUtxo.token,
});

interface GetAgoraPartialAcceptFuelInputsReturn {
    description: string;
    agoraOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    acceptedTokens: bigint;
    feePerKb: number;
    returned: ScriptUtxo[];
}
interface GetAgoraPartialAcceptFuelInputsError {
    description: string;
    agoraOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    acceptedTokens: bigint;
    feePerKb: number;
    error: string;
}
interface GetAgoraOneshotAcceptFuelInputsReturn {
    description: string;
    oneshotOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    feePerKb: number;
    returned: ScriptUtxo[];
}
interface GetAgoraOneshotAcceptFuelInputsError {
    description: string;
    oneshotOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    feePerKb: number;
    error: string;
}
interface GetAgoraPartialCancelFuelInputsReturn {
    description: string;
    agoraOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    feePerKb: number;
    returned: ScriptUtxo[];
}
interface GetAgoraPartialCancelFuelInputsError {
    description: string;
    agoraOffer: AgoraOffer;
    utxos: ScriptUtxo[];
    feePerKb: number;
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
                utxos: [{ value: 5461918 }] as unknown as ScriptUtxo[],
                acceptedTokens: 546n,
                feePerKb: 1000,
                returned: [{ value: 5461918 }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'We can get a single fuel input to accept the offer, if the wallet has one exactly covering the price + fee, at a higher than min fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // acceptFeeSats 2376n
                // askedSats 5460736n
                // requiredSats 5463112
                utxos: [{ value: 5463112 }] as unknown as ScriptUtxo[],
                acceptedTokens: 546n,
                feePerKb: 2010,
                returned: [{ value: 5463112 }] as unknown as ScriptUtxo[],
            },
            {
                description: 'Two inputs exactly covering the price + fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // acceptFeeSats 1323n
                // askedSats 5460736n
                // requiredSats 5462059n
                utxos: [
                    { value: 5461917 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
                acceptedTokens: 546n,
                feePerKb: 1000,
                returned: [
                    { value: 5461917 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
            },
            {
                description: 'Three inputs exactly covering the price + fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // acceptFeeSats 1464n
                // askedSats 5460736n
                // requiredSats 5462059n
                utxos: [
                    { value: 5461917 },
                    { value: 141 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
                acceptedTokens: 546n,
                feePerKb: 1000,
                returned: [
                    { value: 5461917 },
                    { value: 141 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
            },
        ],
        expectedErrors: [
            {
                description:
                    'We throw an error if available utxos can only cover 1 satoshi less than price + fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                utxos: [{ value: 5461917 }] as unknown as ScriptUtxo[],
                acceptedTokens: 546n,
                feePerKb: 1000,
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
                utxos: [{ value: 5000000740 }] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [{ value: 5000000740 }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'We can get a single fuel input to accept the offer, if the wallet has one exactly covering the price + fee, at a higher than min fee',
                oneshotOffer: heismanNftOneOffer,
                // acceptFeeSats 1488n
                // askedSats 5000000000n
                // requiredSats 5000001488n
                utxos: [{ value: 5000001488 }] as unknown as ScriptUtxo[],
                feePerKb: 2010,
                returned: [{ value: 5000001488 }] as unknown as ScriptUtxo[],
            },
            {
                description: 'Two inputs exactly covering the price + fee',
                oneshotOffer: heismanNftOneOffer,
                // acceptFeeSats 740n
                // askedSats 5000000000n
                // requiredSats 5000000740n
                utxos: [
                    { value: 5000000739 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [
                    { value: 5000000739 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
            },
            {
                description: 'Three inputs exactly covering the price + fee',
                oneshotOffer: heismanNftOneOffer,
                // acceptFeeSats 881n
                // askedSats 5000000000n
                // requiredSats 5000000881n
                utxos: [
                    { value: 5000000739 },
                    { value: 141 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [
                    { value: 5000000739 },
                    { value: 141 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
            },
        ],
        expectedErrors: [
            {
                description:
                    'We throw an error if available utxos can only cover 1 satoshi less than price + fee',
                oneshotOffer: heismanNftOneOffer,
                utxos: [{ value: 5000000739 }] as unknown as ScriptUtxo[],
                feePerKb: 1000,
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
                utxos: [{ value: 719 }] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [{ value: 719 }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'We can get a single fuel input to cancel the offer, if the wallet has one exactly covering the fee, at a higher than min fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // cancelFeeSats 1446
                utxos: [{ value: 1446 }] as unknown as ScriptUtxo[],
                feePerKb: 2010,
                returned: [{ value: 1446 }] as unknown as ScriptUtxo[],
            },
            {
                description: 'Two inputs exactly covering the fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // cancelFeeSats 860n
                utxos: [
                    { value: 718 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [
                    { value: 718 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
            },
            {
                description: 'Three inputs exactly covering the fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                // cancelFeeSats 1001n
                utxos: [
                    { value: 718 },
                    { value: 141 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [
                    { value: 718 },
                    { value: 141 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
            },
            // ONESHOT cases
            {
                description:
                    'ONESHOT: We can get a single fuel input to cancel the offer, if the wallet has one exactly covering the price + fee',
                agoraOffer: heismanNftOneOffer,
                // cancelFeeSats 535
                utxos: [{ value: 535 }] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [{ value: 535 }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'ONESHOT: We can get a single fuel input to cancel the offer, if the wallet has one exactly covering the price + fee, at a higher than min fee',
                agoraOffer: heismanNftOneOffer,
                // cancelFeeSats 1076
                utxos: [{ value: 1076 }] as unknown as ScriptUtxo[],
                feePerKb: 2010,
                returned: [{ value: 1076 }] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'ONESHOT: Two inputs exactly covering the price + fee',
                agoraOffer: heismanNftOneOffer,
                // cancelFeeSats 676
                utxos: [
                    { value: 534 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [
                    { value: 534 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
            },
            {
                description:
                    'ONESHOT: Three inputs exactly covering the price + fee',
                agoraOffer: heismanNftOneOffer,
                // cancelFeeSats 817
                utxos: [
                    { value: 534 },
                    { value: 141 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                returned: [
                    { value: 534 },
                    { value: 141 },
                    { value: 142 },
                ] as unknown as ScriptUtxo[],
            },
        ],
        expectedErrors: [
            {
                description:
                    'We throw an error if available utxos can only cover 1 satoshi less than fee',
                agoraOffer: agoraOfferCachetAlphaOne,
                utxos: [{ value: 718 }] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                error: 'Insufficient utxos to cancel this offer',
            },
            {
                description:
                    'ONESHOT: We throw an error if available utxos can only cover 1 satoshi less than fee',
                agoraOffer: heismanNftOneOffer,
                utxos: [
                    {
                        value: 534,
                    },
                ] as unknown as ScriptUtxo[],
                feePerKb: 1000,
                error: 'Insufficient utxos to cancel this offer',
            },
        ],
    },
};

describe('Functions used to get inputs required for accept or cancel txs', () => {
    before(async () => {
        await initWasm();
    });
    context('getAgoraPartialAcceptFuelInputs', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getAgoraPartialAcceptFuelInputs;
        for (const expectedReturn of expectedReturns) {
            it(`Return: ${expectedReturn.description}`, () => {
                const {
                    agoraOffer,
                    utxos,
                    acceptedTokens,
                    feePerKb,
                    returned,
                } = expectedReturn;
                expect(
                    getAgoraPartialAcceptFuelInputs(
                        agoraOffer,
                        utxos,
                        acceptedTokens,
                        feePerKb,
                    ),
                ).to.deep.equal(returned);
            });
        }
        for (const expectedError of expectedErrors) {
            it(`Error: ${expectedError.description}`, () => {
                const { agoraOffer, utxos, acceptedTokens, feePerKb, error } =
                    expectedError;
                expect(() =>
                    getAgoraPartialAcceptFuelInputs(
                        agoraOffer,
                        utxos,
                        acceptedTokens,
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
