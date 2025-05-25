// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getCashtabMsgTargetOutput,
    getAirdropTargetOutput,
    getCashtabMsgByteCount,
    getOpreturnParamTargetOutput,
    parseOpReturnRaw,
    parseFirma,
    getXecxAppAction,
    getEmppAppAction,
    getEmppAppActions,
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
    describe('Parse firma input for display on Send screen', () => {
        const { expectedReturns } = opReturnVectors.parseFirma;

        // Successfully created targetOutputs
        expectedReturns.forEach(expectedReturn => {
            const { description, firma, returned } = expectedReturn;
            it(`parseFirma: ${description}`, () => {
                expect(parseFirma(firma)).toStrictEqual(returned);
            });
        });
    });
    describe('getXecxAppAction', () => {
        const { expectedReturns } = opReturnVectors.getXecxAppAction;

        expectedReturns.forEach(expectedReturn => {
            const { description, push, returned } = expectedReturn;
            it(`getXecxAppAction: ${description}`, () => {
                expect(getXecxAppAction(push)).toStrictEqual(returned);
            });
        });
    });
    describe('getEmppAppAction', () => {
        const { expectedReturns } = opReturnVectors.getEmppAppAction;

        expectedReturns.forEach(expectedReturn => {
            const { description, push, returned } = expectedReturn;
            it(`getEmppAppAction: ${description}`, () => {
                expect(getEmppAppAction(push)).toStrictEqual(returned);
            });
        });
    });
    describe('getEmppAppActions', () => {
        const { expectedReturns, expectedErrors } =
            opReturnVectors.getEmppAppActions;

        expectedReturns.forEach(expectedReturn => {
            const { description, stackArray, returned } = expectedReturn;
            it(`getEmppAppActions: ${description}`, () => {
                expect(getEmppAppActions(stackArray)).toStrictEqual(returned);
            });
        });

        // Error cases
        expectedErrors.forEach(expectedError => {
            const { description, stackArray, error } = expectedError;
            it(`getEmppAppActions throws error for: ${description}`, () => {
                expect(() => getEmppAppActions(stackArray)).toThrow(error);
            });
        });
    });
});
