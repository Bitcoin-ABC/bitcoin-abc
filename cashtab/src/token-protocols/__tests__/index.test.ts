// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getAllSendUtxos,
    getSendTokenInputs,
    getMaxDecimalizedQty,
} from 'token-protocols';
import vectors from '../fixtures/vectors';
import { initWasm } from 'ecash-lib';

describe('Cashtab supported token protocol methods', () => {
    beforeAll(async () => {
        // Initialize web assembly
        await initWasm();
    });
    describe('Get all non-mintbaton token utxos from a mixed utxo set from ChronikClient', () => {
        const { expectedReturns } = vectors.getAllSendUtxos;
        expectedReturns.forEach(expectedReturn => {
            const { description, utxos, tokenId, tokenUtxos } = expectedReturn;
            it(`getAllSendUtxos: ${description}`, () => {
                expect(getAllSendUtxos(utxos, tokenId)).toStrictEqual(
                    tokenUtxos,
                );
            });
        });
    });
    describe('Get slpv1 send token inputs and outputs', () => {
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
                    getSendTokenInputs(
                        allSendUtxos,
                        tokenId,
                        sendQty,
                        decimals,
                    ),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('We can get max output token qty for different token protocols', () => {
        const { expectedReturns } = vectors.getMaxDecimalizedQty;
        expectedReturns.forEach(expectedReturn => {
            const { description, protocol, decimals, returned } =
                expectedReturn;
            it(`getMaxDecimalizedQty: ${description}`, () => {
                expect(getMaxDecimalizedQty(decimals, protocol)).toBe(returned);
            });
        });
    });
});
