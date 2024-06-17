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
    parseOpReturnRaw,
} from 'opreturn';
import { opReturnVectors } from '../fixtures/vectors';

describe('Cashtab opreturn methods', () => {
    describe('Cashtab Msg building functions', () => {
        const { expectedReturns, expectedErrors } = opReturnVectors.cashtabMsgs;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, cashtabMsg, returned } = expectedReturn;
            it(`getCashtabMsgTargetOutput: ${description}`, () => {
                expect(getCashtabMsgTargetOutput(cashtabMsg)).toStrictEqual(
                    returned,
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
            const { description, tokenId, airdropMsg, returned } =
                expectedReturn;
            it(`${description}`, () => {
                expect(
                    getAirdropTargetOutput(tokenId, airdropMsg),
                ).toStrictEqual(returned);
            });
        });
        // Error cases
        expectedErrors.forEach(expectedError => {
            const { description, tokenId, airdropMsg, errorMsg } =
                expectedError;
            it(`getAirdropTargetOutput throws error for: ${description}`, () => {
                expect(() =>
                    getAirdropTargetOutput(tokenId, airdropMsg),
                ).toThrow(errorMsg);
            });
        });
    });

    describe('Alias registration target output building functions', () => {
        const { expectedReturns, expectedErrors } =
            opReturnVectors.aliasRegistrations;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, alias, address, returned } = expectedReturn;
            it(`getAliasTargetOutput: ${description}`, () => {
                expect(getAliasTargetOutput(alias, address)).toStrictEqual(
                    returned,
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
        const { expectedReturns, expectedErrors } =
            opReturnVectors.aliasByteCounts;

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
                expect(() => getCashtabMsgByteCount(cashtabMsg)).toThrow(
                    errorMsg,
                );
            });
        });
    });

    describe('Build target output for opreturn as bip21 param', () => {
        const { expectedReturns, expectedErrors } =
            opReturnVectors.opreturnsAsParam;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, opreturnParam, returned } = expectedReturn;
            it(`getOpreturnParamTargetOutput: ${description}`, () => {
                expect(
                    getOpreturnParamTargetOutput(opreturnParam),
                ).toStrictEqual(returned);
            });
        });
        // Error cases
        expectedErrors.forEach(expectedError => {
            const { description, opreturnParam, errorMsg } = expectedError;
            it(`getOpreturnParamTargetOutput throws error for: ${description}`, () => {
                expect(() =>
                    getOpreturnParamTargetOutput(opreturnParam),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('Parse op_return_raw input for display on Send screen', () => {
        const { expectedReturns, expectedErrors } =
            opReturnVectors.parseOpReturnRaw;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, opReturnRaw, returned } = expectedReturn;
            it(`parseOpReturnRaw: ${description}`, () => {
                // Output value should be zero for OP_RETURN
                expect(parseOpReturnRaw(opReturnRaw)).toStrictEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const { description, opReturnRaw, error } = expectedError;
            it(`parseOpReturnRaw throws error for: ${description}`, () => {
                expect(() => parseOpReturnRaw(opReturnRaw)).toThrow(error);
            });
        });
    });
});
