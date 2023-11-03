// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { getCashtabMsgTargetOutput, getAirdropTargetOutput } from 'opreturn';
import { opReturnVectors } from '../fixtures/vectors';

describe('Cashtab Msg building functions', () => {
    const { expectedReturns, expectedErrors } = opReturnVectors.cashtabMsgs;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, cashtabMsg, outputScriptHex } = expectedReturn;
        it(`getCashtabMsgTargetOutput: ${description}`, () => {
            const targetOutput = getCashtabMsgTargetOutput(cashtabMsg);
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
        const { description, cashtabMsg, errorMsg } = expectedError;
        it(`getCashtabMsgTargetOutput throws error for: ${description}`, () => {
            expect(() => getCashtabMsgTargetOutput(cashtabMsg)).toThrow(
                errorMsg,
            );
        });
    });
});

describe('getAirdropTargetOutput', () => {
    const { expectedReturns, expectedErrors } = opReturnVectors.airdrops;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, tokenId, airdropMsg, outputScriptHex } =
            expectedReturn;
        it(`${description}`, () => {
            const targetOutput = getAirdropTargetOutput(tokenId, airdropMsg);
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
        const { description, tokenId, airdropMsg, errorMsg } = expectedError;
        it(`getAirdropTargetOutput throws error for: ${description}`, () => {
            expect(() => getAirdropTargetOutput(tokenId, airdropMsg)).toThrow(
                errorMsg,
            );
        });
    });
});
