// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getMaxDecimalizedAlpQty,
    getAlpGenesisTargetOutputs,
    getAlpSendTargetOutputs,
    getAlpBurnTargetOutputs,
    getAlpMintTargetOutputs,
    getAlpAgoraListTargetOutputs,
} from 'token-protocols/alp';
import vectors from '../fixtures/vectors';

describe('ALP token methods', () => {
    describe('Gets max mint/send/burn SLP amount, decimalized', () => {
        const { expectedReturns } = vectors.getMaxDecimalizedAlpQty;
        expectedReturns.forEach(vector => {
            const { description, decimals, returned } = vector;
            it(`getMaxDecimalizedAlpQty: ${description}`, () => {
                expect(getMaxDecimalizedAlpQty(decimals)).toBe(returned);
            });
        });
    });
    describe('We can generate expected ALP genesis target outputs with and without a mint baton', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getAlpGenesisTargetOutputs;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                genesisInfo,
                initialQuantity,
                includeMintBaton,
                targetOutputs,
            } = expectedReturn;
            it(`getAlpGenesisTargetOutputs: ${description}`, () => {
                expect(
                    getAlpGenesisTargetOutputs(
                        genesisInfo,
                        initialQuantity,
                        includeMintBaton,
                    ),
                ).toStrictEqual(targetOutputs);
            });
        });

        // Error cases
        expectedErrors.forEach(expectedError => {
            const {
                description,
                genesisInfo,
                initialQuantity,
                includeMintBaton,
                errorMsg,
            } = expectedError;
            it(`getAlpGenesisTargetOutputs throws error for: ${description}`, () => {
                expect(() =>
                    getAlpGenesisTargetOutputs(
                        genesisInfo,
                        initialQuantity,
                        includeMintBaton,
                    ),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('We can build target outputs for a 1-recipient ALP send tx with or without change', () => {
        const { expectedReturns } = vectors.getAlpSendTargetOutputs;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                tokenInputInfo,
                destinationAddress,
                returned,
            } = expectedReturn;
            it(`getAlpSendTargetOutputs: ${description}`, () => {
                expect(
                    getAlpSendTargetOutputs(tokenInputInfo, destinationAddress),
                ).toStrictEqual(returned);
            });
        });
    });
    describe('We can build target outputs for an ALP burn tx with or without token change', () => {
        const { expectedReturns } = vectors.getAlpBurnTargetOutputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, tokenInputInfo, returned } = expectedReturn;
            it(`getAlpBurnTargetOutputs: ${description}`, () => {
                expect(getAlpBurnTargetOutputs(tokenInputInfo)).toStrictEqual(
                    returned,
                );
            });
        });
    });
    describe('We can build target outputs for an ALP mint tx', () => {
        const { expectedReturns } = vectors.getAlpMintTargetOutputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, tokenId, mintQty, returned } = expectedReturn;
            it(`getAlpMintTargetOutputs: ${description}`, () => {
                expect(getAlpMintTargetOutputs(tokenId, mintQty)).toStrictEqual(
                    returned,
                );
            });
        });
    });
    describe('We can build target outputs for an ALP Agora Listing tx with or without change', () => {
        const { expectedReturns } = vectors.getAlpAgoraListTargetOutputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, tokenInputInfo, agoraPartial, returned } =
                expectedReturn;
            it(`getAlpAgoraListTargetOutputs: ${description}`, () => {
                expect(
                    getAlpAgoraListTargetOutputs(tokenInputInfo, agoraPartial),
                ).toStrictEqual(returned);
            });
        });
    });
});
