// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import {
    getSlpGenesisTargetOutput,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutput,
    getAllSendUtxos,
    getSendTokenInputs,
} from 'slpv1';
import vectors from '../fixtures/vectors';
import { SEND_DESTINATION_ADDRESS } from '../fixtures/vectors';
import appConfig from 'config/app';

describe('Generating etoken genesis tx target outputs', () => {
    const { expectedReturns, expectedErrors } = vectors.genesisTxs;

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
            // We expect 2 outputs
            expect(calculatedTargetOutputs.length).toBe(2);
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

describe('Get slpv1 send token inputs and outputs from NNG chronik-client', () => {
    const { expectedReturns, expectedErrors } = vectors.getSendTokenInputs;
    expectedReturns.forEach(expectedReturn => {
        const {
            description,
            allSendUtxos,
            sendQty,
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
            );
            expect(calcTokenInputs.tokenInputs).toStrictEqual(tokenInputs);
            expect(calcTokenInputs.sendAmounts).toStrictEqual(sendAmounts);
        });
        it(`getSlpSendTargetOutputs with NNG inputs: ${description}`, () => {
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
        const { description, allSendUtxos, tokenId, sendQty, errorMsg } =
            expectedError;
        it(`getSlpBurnTargetOutput throws error for: ${description}`, () => {
            expect(() =>
                getSendTokenInputs(allSendUtxos, tokenId, sendQty),
            ).toThrow(errorMsg);
        });
    });
});

describe('Get slpv1 send input utxos from in-node chronik-client', () => {
    const { expectedReturns, expectedErrors } =
        vectors.getSendTokenInputsInNode;
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

describe('Generating etoken burn tx target output', () => {
    const { expectedReturns, expectedErrors } = vectors.burnTxs;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, tokenUtxos, burnQty, outputScriptHex } =
            expectedReturn;
        it(`getSlpBurnTargetOutput: ${description}`, () => {
            const targetOutput = getSlpBurnTargetOutput(tokenUtxos, burnQty);
            // Output value should be zero for OP_RETURN
            expect(targetOutput.value).toBe(0);
            // Test vs hex string as cannot store buffer type in vectors
            expect(targetOutput.script.toString('hex')).toStrictEqual(
                outputScriptHex,
            );
        });
    });
    // Error cases
    expectedErrors.forEach(expectedError => {
        const { description, tokenUtxos, burnQty, errorMsg } = expectedError;
        it(`getSlpBurnTargetOutput throws error for: ${description}`, () => {
            expect(() => getSlpBurnTargetOutput(tokenUtxos, burnQty)).toThrow(
                errorMsg,
            );
        });
    });
});
