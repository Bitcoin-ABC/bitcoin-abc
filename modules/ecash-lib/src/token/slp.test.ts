// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { slpBurn, slpGenesis, slpMint, slpMintVault, slpSend } from './slp.js';

describe('SLP', () => {
    it('SLP invalid usage', () => {
        expect(() => slpGenesis(99, {}, 0)).to.throw('Unknown token type 99');
        expect(() => slpMint('', 77, 0)).to.throw('Unknown token type 77');
        expect(() => slpMint('', 1, 0)).to.throw(
            'Token ID must be 64 hex characters in length, but got 0',
        );
        expect(() => slpMint('1'.repeat(64), 1, -1)).to.throw(
            'Amount out of range: -1',
        );
        expect(() => slpMint('1'.repeat(64), 1, 0x10000000000000000n)).to.throw(
            'Amount out of range: 18446744073709551616',
        );
        expect(() => slpMintVault('', [])).to.throw(
            'Token ID must be 64 hex characters in length, but got 0',
        );
        expect(() => slpMintVault('1'.repeat(64), [])).to.throw(
            'Send amount cannot be empty',
        );
        expect(() => slpMintVault('1'.repeat(64), new Array(20))).to.throw(
            'Cannot use more than 19 amounts, but got 20',
        );
        expect(() => slpMintVault('1'.repeat(64), [-1])).to.throw(
            'Amount out of range: -1',
        );
        expect(() =>
            slpMintVault('1'.repeat(64), [0x10000000000000000n]),
        ).to.throw('Amount out of range: 18446744073709551616');
        expect(() => slpSend('', 66, [])).to.throw('Unknown token type 66');
        expect(() => slpSend('', 1, [])).to.throw(
            'Token ID must be 64 hex characters in length, but got 0',
        );
        expect(() => slpSend('1'.repeat(64), 1, [])).to.throw(
            'Send amount cannot be empty',
        );
        expect(() => slpSend('1'.repeat(64), 1, new Array(20))).to.throw(
            'Cannot use more than 19 amounts, but got 20',
        );
        expect(() => slpSend('1'.repeat(64), 1, [-1])).to.throw(
            'Amount out of range: -1',
        );
        expect(() =>
            slpSend('1'.repeat(64), 1, [0x10000000000000000n]),
        ).to.throw('Amount out of range: 18446744073709551616');
        expect(() => slpBurn('', 55, 0)).to.throw('Unknown token type 55');
        expect(() => slpBurn('', 1, 0)).to.throw(
            'Token ID must be 64 hex characters in length, but got 0',
        );
        expect(() => slpBurn('1'.repeat(64), 1, -1)).to.throw(
            'Amount out of range: -1',
        );
        expect(() => slpBurn('1'.repeat(64), 1, 0x10000000000000000n)).to.throw(
            'Amount out of range: 18446744073709551616',
        );
    });
});
