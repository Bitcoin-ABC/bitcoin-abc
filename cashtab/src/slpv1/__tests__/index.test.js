// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getSlpGenesisTargetOutput,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutputs,
    getAllSendUtxos,
    getSendTokenInputs,
    getExplicitBurnTargetOutputs,
} from 'slpv1';
import vectors from '../fixtures/vectors';
import { SEND_DESTINATION_ADDRESS } from '../fixtures/vectors';
import appConfig from 'config/app';

describe('Generating etoken genesis tx target outputs', () => {
    const { expectedReturns, expectedErrors } =
        vectors.getSlpGenesisTargetOutput;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, genesisConfig, mintAddress, targetOutputs } =
            expectedReturn;
        it(`getSlpGenesisTargetOutput: ${description}`, () => {
            // Output value should be zero for OP_RETURN
            const calculatedTargetOutputs = getSlpGenesisTargetOutput(
                genesisConfig,
                mintAddress,
            );

            // We expect 2 outputs or 3 outputs
            expect(calculatedTargetOutputs.length >= 2).toBe(true);

            // The output at the 0-index is the OP_RETURN
            expect(calculatedTargetOutputs[0].value).toBe(0);
            expect(calculatedTargetOutputs[0].script.toString('hex')).toBe(
                targetOutputs[0].script,
            );
            // The output at the 1-index is dust to given address
            expect(calculatedTargetOutputs[1]).toStrictEqual({
                address: mintAddress,
                value: appConfig.etokenSats,
            });
            if (calculatedTargetOutputs.length > 2) {
                // If we have a mint baton

                // We will only have 3 outputs in this case
                // eslint-disable-next-line jest/no-conditional-expect
                expect(calculatedTargetOutputs.length).toBe(3);

                // The mint baton is at index 2
                // eslint-disable-next-line jest/no-conditional-expect
                expect(calculatedTargetOutputs[2]).toStrictEqual({
                    address: mintAddress,
                    value: appConfig.etokenSats,
                });
            }
        });
    });

    // Error cases
    expectedErrors.forEach(expectedError => {
        const { description, genesisConfig, mintAddress, errorMsg } =
            expectedError;
        it(`getSlpGenesisTargetOutput throws error for: ${description}`, () => {
            expect(() =>
                getSlpGenesisTargetOutput(genesisConfig, mintAddress),
            ).toThrow(errorMsg);
        });
    });
});

describe('Get all slpv1 SEND utxos from a mixed utxo set from ChronikClientNode', () => {
    const { expectedReturns } = vectors.getAllSendUtxos;
    expectedReturns.forEach(expectedReturn => {
        const { description, utxos, tokenId, tokenUtxos } = expectedReturn;
        it(`getAllSendUtxos: ${description}`, () => {
            expect(getAllSendUtxos(utxos, tokenId)).toStrictEqual(tokenUtxos);
        });
    });
});

describe('Get slpv1 send token inputs and outputs from in-node chronik-client', () => {
    const { expectedReturns, expectedErrors } = vectors.getSendTokenInputs;
    expectedReturns.forEach(expectedReturn => {
        const {
            description,
            allSendUtxos,
            sendQty,
            decimals,
            tokenId,
            tokenInputs,
            sendAmounts,
            targetOutputs,
        } = expectedReturn;
        it(`getSendTokenInputs: ${description}`, () => {
            const calcTokenInputs = getSendTokenInputs(
                allSendUtxos,
                tokenId,
                sendQty,
                decimals,
            );
            expect(calcTokenInputs.tokenInputs).toStrictEqual(tokenInputs);
            expect(calcTokenInputs.sendAmounts).toStrictEqual(sendAmounts);
        });
        it(`getSlpSendTargetOutputs with in-node inputs: ${description}`, () => {
            const calculatedTargetOutputs = getSlpSendTargetOutputs(
                { tokenInputs, sendAmounts },
                SEND_DESTINATION_ADDRESS,
            );

            // We will always have the OP_RETURN output at index 0
            expect(calculatedTargetOutputs[0].value).toBe(0);
            expect(calculatedTargetOutputs[0].script.toString('hex')).toBe(
                targetOutputs[0].script,
            );

            // We will always have the destination output at index 1
            expect(calculatedTargetOutputs[1].value).toBe(appConfig.etokenSats);
            expect(calculatedTargetOutputs[1].address).toBe(
                SEND_DESTINATION_ADDRESS,
            );

            // If there is a change output it is at index 2
            if (typeof calculatedTargetOutputs[2] !== 'undefined') {
                // If we are here, assert the length must be 3

                // eslint-disable-next-line jest/no-conditional-expect
                expect(calculatedTargetOutputs.length).toBe(3);

                // assert the expected change output
                // eslint-disable-next-line jest/no-conditional-expect
                expect(calculatedTargetOutputs[2].value).toBe(
                    appConfig.etokenSats,
                );
                // eslint-disable-next-line jest/no-conditional-expect
                expect('address' in calculatedTargetOutputs[2]).toBe(false);
            } else {
                // If we are here, assert the length must be 2

                // eslint-disable-next-line jest/no-conditional-expect
                expect(calculatedTargetOutputs.length).toBe(2);
            }
        });
    });
    expectedErrors.forEach(expectedError => {
        const {
            description,
            allSendUtxos,
            tokenId,
            sendQty,
            decimals,
            errorMsg,
        } = expectedError;
        it(`getSlpBurnTargetOutput throws error for: ${description}`, () => {
            expect(() =>
                getSendTokenInputs(allSendUtxos, tokenId, sendQty, decimals),
            ).toThrow(errorMsg);
        });
    });
});

describe('Get slpv1 send input utxos from in-node chronik-client', () => {
    const { expectedReturns, expectedErrors } = vectors.getSendTokenInputs;
    expectedReturns.forEach(expectedReturn => {
        const {
            description,
            allSendUtxos,
            sendQty,
            tokenId,
            decimals,
            tokenInputs,
            sendAmounts,
            targetOutputs,
        } = expectedReturn;
        it(`getSendTokenInputs with in-node chronik utxos: ${description}`, () => {
            const calcTokenInputs = getSendTokenInputs(
                allSendUtxos,
                tokenId,
                sendQty,
                decimals,
            );
            expect(calcTokenInputs.tokenInputs).toStrictEqual(tokenInputs);
            expect(calcTokenInputs.sendAmounts).toStrictEqual(sendAmounts);
        });
        it(`getSlpSendTargetOutputs with in-node inputs: ${description}`, () => {
            const calculatedTargetOutputs = getSlpSendTargetOutputs(
                { tokenInputs, sendAmounts },
                SEND_DESTINATION_ADDRESS,
            );

            // We will always have the OP_RETURN output at index 0
            expect(calculatedTargetOutputs[0].value).toBe(0);
            expect(calculatedTargetOutputs[0].script.toString('hex')).toBe(
                targetOutputs[0].script,
            );

            // We will always have the destination output at index 1
            expect(calculatedTargetOutputs[1].value).toBe(appConfig.etokenSats);
            expect(calculatedTargetOutputs[1].address).toBe(
                SEND_DESTINATION_ADDRESS,
            );

            // If there is a change output it is at index 2
            if (typeof calculatedTargetOutputs[2] !== 'undefined') {
                // If we are here, assert the length must be 3

                // eslint-disable-next-line jest/no-conditional-expect
                expect(calculatedTargetOutputs.length).toBe(3);

                // assert the expected change output
                // eslint-disable-next-line jest/no-conditional-expect
                expect(calculatedTargetOutputs[2].value).toBe(
                    appConfig.etokenSats,
                );
                // eslint-disable-next-line jest/no-conditional-expect
                expect('address' in calculatedTargetOutputs[2]).toBe(false);
            } else {
                // If we are here, assert the length must be 2

                // eslint-disable-next-line jest/no-conditional-expect
                expect(calculatedTargetOutputs.length).toBe(2);
            }
        });
    });
    expectedErrors.forEach(expectedError => {
        const {
            description,
            allSendUtxos,
            sendQty,
            tokenId,
            decimals,
            errorMsg,
        } = expectedError;
        it(`getSendTokenInputs with in-node chronik utxos throws error for: ${description}`, () => {
            expect(() =>
                getSendTokenInputs(allSendUtxos, tokenId, sendQty, decimals),
            ).toThrow(errorMsg);
        });
    });
});

describe('Generating etoken burn tx target outputs', () => {
    const { expectedReturns } = vectors.burnTxs;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const {
            description,
            tokenUtxos,
            burnQty,
            tokenId,
            decimals,
            tokenInputInfo,
            outputScriptHex,
        } = expectedReturn;

        it(`getSlpBurnTargetOutputs: ${description}`, () => {
            // We get the same tokenInputInfo object for token burns that we do for token sends
            const calculatedTokenInputInfo = getSendTokenInputs(
                tokenUtxos,
                tokenId,
                burnQty,
                decimals,
            );

            expect(calculatedTokenInputInfo.sendAmounts).toStrictEqual(
                tokenInputInfo.sendAmounts,
            );

            const targetOutput = getSlpBurnTargetOutputs(
                calculatedTokenInputInfo,
            );

            // We will always have the OP_RETURN output at index 0
            expect(targetOutput[0].value).toBe(0);
            expect(targetOutput[0].script.toString('hex')).toBe(
                outputScriptHex,
            );

            // BURN txs always have 2 outputs
            expect(targetOutput.length).toBe(2);
            // assert the expected change output
            expect(targetOutput[1].value).toBe(appConfig.etokenSats);
            expect('address' in targetOutput[1]).toBe(false);
        });
    });
});

describe('Generating explicit etoken burn tx target output from in-node utxos', () => {
    const { expectedReturns } = vectors.explicitBurns;

    expectedReturns.forEach(expectedReturn => {
        const { description, burnUtxos, decimals, outputScriptHex } =
            expectedReturn;
        it(`getExplicitBurnTargetOutputs: ${description}`, () => {
            const targetOutputs = getExplicitBurnTargetOutputs(
                burnUtxos,
                decimals,
            );
            // We get an array of length 1
            expect(targetOutputs.length).toBe(1);
            // Output value should be zero for OP_RETURN
            expect(targetOutputs[0].value).toBe(0);
            // Test vs hex string as cannot store buffer type in vectors
            expect(targetOutputs[0].script.toString('hex')).toBe(
                outputScriptHex,
            );
        });
    });

    // We expect an error if in-node utxos are used in a call without specifying the decimals param
    it(`getExplicitBurnTargetOutputs throws error if called with in-node utxos and no specified decimals`, () => {
        expect(() =>
            getExplicitBurnTargetOutputs([
                {
                    value: 546,
                    token: {
                        tokenId:
                            '3333333333333333333333333333333333333333333333333333333333333333',
                        amount: '100',
                    },
                },
            ]),
        ).toThrow(
            'Invalid decimals -1 for tokenId 3333333333333333333333333333333333333333333333333333333333333333. Decimals must be an integer 0-9.',
        );
    });
});
