// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import { isPayButtonTransaction } from '../src/paybutton';

const expect = chai.expect;

describe('paybutton.ts', function () {
    describe('isPayButtonTransaction', function () {
        it('Should identify PayButton transactions', function () {
            expect(isPayButtonTransaction('0450415900')).to.be.equal(true);
        });

        it('Should identify PayButton transactions with additional data', function () {
            expect(
                isPayButtonTransaction('04504159001234567890abcdef'),
            ).to.be.equal(true);
            expect(
                isPayButtonTransaction('04504159001234567890ABCDEF'),
            ).to.be.equal(true);
        });

        it('Should reject non-PayButton transactions', function () {
            expect(isPayButtonTransaction('0450415901')).to.be.equal(false); // Different last byte
        });

        it('Should reject empty OP_RETURN', function () {
            expect(isPayButtonTransaction('')).to.be.equal(false);
        });
    });
});
