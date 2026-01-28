// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getAllSendUtxos,
    getMaxDecimalizedQty,
    getRenderedTokenType,
} from 'token-protocols';
import vectors from '../fixtures/vectors';

describe('Cashtab supported token protocol methods', () => {
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
    describe('We can get a human readable token type from TokenType', () => {
        const { expectedReturns } = vectors.getRenderedTokenType;
        expectedReturns.forEach(expectedReturn => {
            const { description, tokenType, returned } = expectedReturn;
            it(`getRenderedTokenType: ${description}`, () => {
                expect(getRenderedTokenType(tokenType)).toBe(returned);
            });
        });
    });
});
