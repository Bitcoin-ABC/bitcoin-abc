// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import {
    getSlpGenesisTargetOutput,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutput,
} from 'slpv1';
import { slpv1Vectors } from '../fixtures/vectors';
import appConfig from 'config/app';

describe('Generating etoken genesis tx target outputs', () => {
    const { expectedReturns, expectedErrors } = slpv1Vectors.genesisTxs;

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

describe('Generating etoken send tx target output(s)', () => {
    const { expectedReturns, expectedErrors } = slpv1Vectors.sendTxs;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, tokenUtxos, sendQty, outputScriptHex } =
            expectedReturn;
        it(`getSlpSendTargetOutputs: ${description}`, () => {
            const targetOutputs = getSlpSendTargetOutputs(tokenUtxos, sendQty);

            // A note on the use of eslint-disable-next-line jest/no-conditional-expect
            // We can't deepEqual these targetOutputs to mocks that store Buffers
            // So, we need to conditionally test against each output
            // To avoid tests "succeeding" if these conditions are not met, we include
            // unconditional test for a script output -- and conditional tests are if/else, can't miss them both

            let hasScriptOutput = false;
            for (let i = 0; i < targetOutputs.length; i += 1) {
                if ('address' in targetOutputs[i]) {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(targetOutputs[i].value).toStrictEqual(
                        appConfig.etokenSats,
                    );
                    // If you have a change output, you need 2 outputs
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(targetOutputs.length).toBe(2);
                } else {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(targetOutputs[i].value).toStrictEqual(0);

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(
                        targetOutputs[i].script.toString('hex'),
                    ).toStrictEqual(outputScriptHex);

                    hasScriptOutput = true;
                }
            }
            expect(hasScriptOutput).toBe(true);
        });
    });
    // Error cases
    expectedErrors.forEach(expectedError => {
        const { description, tokenUtxos, sendQty, errorMsg } = expectedError;
        it(`getSlpSendTargetOutputs throws error for: ${description}`, () => {
            expect(() => getSlpSendTargetOutputs(tokenUtxos, sendQty)).toThrow(
                errorMsg,
            );
        });
    });
});

describe('Generating etoken burn tx target output', () => {
    const { expectedReturns, expectedErrors } = slpv1Vectors.burnTxs;

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
