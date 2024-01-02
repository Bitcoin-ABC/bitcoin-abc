// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { getSlpGenesisTargetOutput } from 'slpv1';
import { slpv1Vectors } from '../fixtures/vectors';

describe('Generating etoken genesis tx target outputs', () => {
    const { expectedReturns, expectedErrors } = slpv1Vectors.genesisTxs;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, genesisConfig, outputScriptHex } = expectedReturn;
        it(`getSlpGenesisTargetOutput: ${description}`, () => {
            const targetOutput = getSlpGenesisTargetOutput(genesisConfig);
            // Output value should be zero for OP_RETURN
            expect(targetOutput.value).toStrictEqual(0);
            // Test vs hex string as cannot store buffer type in vectors
            expect(targetOutput.script.toString('hex')).toStrictEqual(
                outputScriptHex,
            );
        });
    });
    // Error cases
    expectedErrors.forEach(expectedError => {
        const { description, genesisConfig, errorMsg } = expectedError;
        it(`getSlpGenesisTargetOutput throws error for: ${description}`, () => {
            expect(() => getSlpGenesisTargetOutput(genesisConfig)).toThrow(
                errorMsg,
            );
        });
    });
});
