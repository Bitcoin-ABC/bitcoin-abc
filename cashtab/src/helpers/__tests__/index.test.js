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
    scriptUtxoFromJson,
    txFromJson,
    previewAddress,
    previewTokenId,
    previewSolAddr,
    getMultisendTargetOutputs,
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
        it('We can revive a non-legacy JSON non-token utxo with value and amount keys', () => {
            const legacyUtxoJson = {
                sats: '546',
            };
            const newUtxo = scriptUtxoFromJson(legacyUtxoJson);
            expect(newUtxo.sats).toEqual(546n);
        });
    });
    describe('txFromJson', () => {
        it('We can revive a stored CashtabTx', () => {
            const legacyTx = {
                inputs: [{ sats: 546n, token: { atoms: 100n } }],
                outputs: [{ sats: 546n, token: { atoms: 100n } }],
                tokenEntries: [
                    {
                        actualBurnAtoms: 100n,
                        intentionalBurnAtoms: 100n,
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
                'sats',
                'token',
            ]);
            expect(revivedTx.inputs[0].sats).toEqual(546n);
            expect(Object.keys(revivedTx.outputs[0])).toStrictEqual([
                'sats',
                'token',
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
    describe('Address and token ID preview functions', () => {
        it('previewAddress: should format ecash addresses correctly', () => {
            const address = 'ecash:qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep';
            expect(previewAddress(address)).toBe('qzs...jep');
        });

        it('previewAddress: should handle addresses without prefix', () => {
            const address = 'qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep';
            expect(previewAddress(address)).toBe('qzs...jep');
        });

        it('previewTokenId: should format token IDs correctly', () => {
            const tokenId =
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e';
            expect(previewTokenId(tokenId)).toBe('50d...10e');
        });

        it('previewTokenId: should handle short token IDs', () => {
            const tokenId = 'abc123';
            expect(previewTokenId(tokenId)).toBe('abc...123');
        });

        it('previewSolAddr: should format Sol addresses correctly', () => {
            const solAddr = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            expect(previewSolAddr(solAddr)).toBe('9Wz...WWM');
        });

        it('previewSolAddr: should handle short Sol addresses', () => {
            const solAddr = 'abc123';
            expect(previewSolAddr(solAddr)).toBe('abc...123');
        });
    });

    describe('getMultisendTargetOutputs', () => {
        // Unit test for each vector in fixtures for the getMultisendTargetOutputs case
        const { expectedReturns } = vectors.getMultisendTargetOutputs;

        // Successfully built and broadcast txs
        expectedReturns.forEach(expectedReturn => {
            const { description, userMultisendInput, targetOutputs } =
                expectedReturn;
            it(`getMultisendTargetOutputs: ${description}`, () => {
                expect(
                    getMultisendTargetOutputs(userMultisendInput),
                ).toStrictEqual(targetOutputs);
            });
        });
    });
});
