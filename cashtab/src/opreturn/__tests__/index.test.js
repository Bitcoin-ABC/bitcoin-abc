// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getCashtabMsgTargetOutput,
    getAirdropTargetOutput,
    getAliasTargetOutput,
    getAliasByteCount,
    getCashtabMsgByteCount,
    getOpreturnParamTargetOutput,
} from 'opreturn';
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

describe('Alias registration target output building functions', () => {
    const { expectedReturns, expectedErrors } =
        opReturnVectors.aliasRegistrations;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, alias, address, outputScriptHex } = expectedReturn;
        it(`getAliasTargetOutput: ${description}`, () => {
            const targetOutput = getAliasTargetOutput(alias, address);
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
        const { description, alias, address, errorMsg } = expectedError;
        it(`getAliasTargetOutput throws error for: ${description}`, () => {
            expect(() => getAliasTargetOutput(alias, address)).toThrow(
                errorMsg,
            );
        });
    });
});

describe('Determines byte count of user input alias registrations', () => {
    const { expectedReturns, expectedErrors } = opReturnVectors.aliasByteCounts;

    // Successfully calculates alias bytecounts
    expectedReturns.forEach(expectedReturn => {
        const { description, alias, byteCount } = expectedReturn;
        it(`getAliasByteCount: ${description}`, () => {
            expect(getAliasByteCount(alias)).toBe(byteCount);
        });
    });
    // Error cases
    expectedErrors.forEach(expectedError => {
        const { description, alias, errorMsg } = expectedError;
        it(`getAliasByteCount throws error for: ${description}`, () => {
            expect(() => getAliasByteCount(alias)).toThrow(errorMsg);
        });
    });
});

describe('Determines bytecount of user input Cashtab Msg', () => {
    const { expectedReturns, expectedErrors } =
        opReturnVectors.cashtabMsgByteCounts;

    // Successfully calculates Cashtab Msg bytecounts
    expectedReturns.forEach(expectedReturn => {
        const { description, cashtabMsg, byteCount } = expectedReturn;
        it(`getCashtabMsgByteCount: ${description}`, () => {
            expect(getCashtabMsgByteCount(cashtabMsg)).toBe(byteCount);
        });
    });
    // Error cases
    expectedErrors.forEach(expectedError => {
        const { description, cashtabMsg, errorMsg } = expectedError;
        it(`getCashtabMsgByteCount throws error for: ${description}`, () => {
            expect(() => getCashtabMsgByteCount(cashtabMsg)).toThrow(errorMsg);
        });
    });
});

describe('Build target output for opreturn as bip21 param', () => {
    const { expectedReturns, expectedErrors } =
        opReturnVectors.opreturnsAsParam;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, opreturnParam, outputScriptHex } = expectedReturn;
        it(`getOpreturnParamTargetOutput: ${description}`, () => {
            const targetOutput = getOpreturnParamTargetOutput(opreturnParam);
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
        const { description, opreturnParam, errorMsg } = expectedError;
        it(`getOpreturnParamTargetOutput throws error for: ${description}`, () => {
            expect(() => getOpreturnParamTargetOutput(opreturnParam)).toThrow(
                errorMsg,
            );
        });
    });
});
