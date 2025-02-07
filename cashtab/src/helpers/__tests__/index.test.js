// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    isMobile,
    getUserLocale,
    cashtabCacheToJSON,
    storedCashtabCacheToMap,
    cashtabWalletFromJSON,
    cashtabWalletToJSON,
    cashtabWalletsFromJSON,
    cashtabWalletsToJSON,
    scriptUtxoFromJson,
    txFromJson,
} from 'helpers';
import vectors from 'helpers/fixtures/vectors';

describe('Cashtab helper functions', () => {
    describe('Detect mobile or desktop devices', () => {
        const { expectedReturns } = vectors.isMobile;

        expectedReturns.forEach(expectedReturn => {
            const { description, navigator, result } = expectedReturn;
            it(`isMobile: ${description}`, () => {
                expect(isMobile(navigator)).toBe(result);
            });
        });
    });
    describe('Get user locale', () => {
        const { expectedReturns } = vectors.getUserLocale;

        expectedReturns.forEach(expectedReturn => {
            const { description, navigator, result } = expectedReturn;
            it(`getUserLocale: ${description}`, () => {
                expect(getUserLocale(navigator)).toBe(result);
            });
        });
    });
    describe('Converts cashtabCache to and from JSON for storage and in-app use', () => {
        const { expectedReturns } = vectors.cashtabCacheToJSON;

        expectedReturns.forEach(expectedReturn => {
            const { description, cashtabCache, cashtabCacheJson } =
                expectedReturn;
            it(`cashtabCacheToJSON and storedCashtabCacheToMap: ${description}`, () => {
                expect(cashtabCacheToJSON(cashtabCache)).toEqual(
                    cashtabCacheJson,
                );
                expect(storedCashtabCacheToMap(cashtabCacheJson)).toEqual(
                    cashtabCache,
                );
            });
        });
    });
    describe('Converts cashtabWallet to and from JSON for storage and in-app use', () => {
        const { expectedReturns } = vectors.cashtabWalletToJSON;

        expectedReturns.forEach(expectedReturn => {
            const { description, cashtabWallet, cashtabWalletJSON } =
                expectedReturn;
            /**
             * Note these tests are effectively neutered due to Jest issues with bigint serialization
             * This is deemed acceptable as Cashtab will soon be migrating to an ecash typed wallet
             * class, and will need to be refactored at that point
             */
            it(`cashtabWalletToJSON and cashtabWalletFromJSON: ${description}`, () => {
                expect(
                    cashtabWalletToJSON(cashtabWallet).mnemonic,
                ).toStrictEqual(cashtabWalletJSON.mnemonic);
                expect(
                    cashtabWalletFromJSON(cashtabWalletJSON).mnemonic,
                ).toStrictEqual(cashtabWallet.mnemonic);
            });
        });
    });
    describe('Converts cashtabWallets (array) to and from JSON for storage and in-app use', () => {
        const { expectedReturns } = vectors.cashtabWalletsToJSON;

        expectedReturns.forEach(expectedReturn => {
            const { description, cashtabWallets, cashtabWalletsJSON } =
                expectedReturn;
            it(`cashtabWalletsToJSON and cashtabWalletsFromJSON: ${description}`, () => {
                expect(cashtabWalletsToJSON(cashtabWallets)).toStrictEqual(
                    cashtabWalletsJSON,
                );
                expect(
                    cashtabWalletsFromJSON(cashtabWalletsJSON),
                ).toStrictEqual(cashtabWallets);
            });
        });
    });
    describe('scriptUtxoFromJson', () => {
        it('We can revive a non-legacy JSON token utxo with value and amount keys', () => {
            const legacyUtxoJson = {
                sats: '546',
                token: {
                    atoms: '100',
                },
            };
            const newUtxo = scriptUtxoFromJson(legacyUtxoJson);
            expect(newUtxo.sats).toEqual(546n);
            expect(newUtxo.token.atoms).toEqual(100n);
        });
        it('We can revive a legacy JSON utxo with value and amount keys', () => {
            const legacyUtxoJson = {
                value: 546,
                token: {
                    amount: '100',
                },
            };
            const newUtxo = scriptUtxoFromJson(legacyUtxoJson);
            expect(Object.keys(newUtxo)).toStrictEqual(['token', 'sats']);
            expect(Object.keys(newUtxo.token)).toStrictEqual(['atoms']);
            expect(newUtxo.sats).toEqual(546n);
            expect(newUtxo.token.atoms).toEqual(100n);
        });
        it('We can revive a non-legacy JSON non-token utxo with value and amount keys', () => {
            const legacyUtxoJson = {
                sats: '546',
            };
            const newUtxo = scriptUtxoFromJson(legacyUtxoJson);
            expect(newUtxo.sats).toEqual(546n);
        });
        it('We can revive a legacy JSON non-token utxo with value and amount keys', () => {
            const legacyUtxoJson = {
                value: 546,
            };
            const newUtxo = scriptUtxoFromJson(legacyUtxoJson);
            expect(Object.keys(newUtxo)).toStrictEqual(['sats']);
            expect(newUtxo.sats).toEqual(546n);
        });
    });
    describe('txFromJson', () => {
        it('We can revive a stored legacy CashtabTx', () => {
            const legacyTx = {
                inputs: [{ value: 546, token: { amount: '100' } }],
                outputs: [{ value: 546, token: { amount: '100' } }],
                tokenEntries: [
                    {
                        actualBurnAmount: '100',
                        intentionalBurn: '100',
                    },
                ],
            };
            const revivedTx = txFromJson(legacyTx);
            expect(Object.keys(revivedTx)).toStrictEqual([
                'inputs',
                'outputs',
                'tokenEntries',
            ]);
            expect(Object.keys(revivedTx.inputs[0])).toStrictEqual([
                'token',
                'sats',
            ]);
            expect(revivedTx.inputs[0].sats).toEqual(546n);
            expect(Object.keys(revivedTx.outputs[0])).toStrictEqual([
                'token',
                'sats',
            ]);
            expect(revivedTx.outputs[0].sats).toEqual(546n);
            expect(Object.keys(revivedTx.tokenEntries[0])).toStrictEqual([
                'actualBurnAtoms',
                'intentionalBurnAtoms',
            ]);
            expect(revivedTx.inputs[0].token.atoms).toEqual(100n);
            expect(revivedTx.outputs[0].token.atoms).toEqual(100n);
            expect(revivedTx.tokenEntries[0].actualBurnAtoms).toEqual(100n);
            expect(revivedTx.tokenEntries[0].intentionalBurnAtoms).toEqual(
                100n,
            );
        });
    });
});
