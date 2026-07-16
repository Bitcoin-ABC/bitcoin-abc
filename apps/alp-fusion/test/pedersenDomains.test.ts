// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { PedersenSetup, verifyCommitmentSum } from 'ecash-lib';

import {
    PEDERSEN_H_SATS,
    PEDERSEN_H_TOKEN,
} from '../src/protocol/constants.js';

describe('ALP Pedersen H domains', () => {
    it('sats and token H are distinct (cross-domain verify fails)', () => {
        const satsSetup = new PedersenSetup(PEDERSEN_H_SATS);
        const tokenSetup = new PedersenSetup(PEDERSEN_H_TOKEN);
        const c = satsSetup.commit(42n);
        expect(
            verifyCommitmentSum(satsSetup, [c.pointUncompressed], 42n, c.nonce),
        ).to.equal(true);
        expect(
            verifyCommitmentSum(
                tokenSetup,
                [c.pointUncompressed],
                42n,
                c.nonce,
            ),
        ).to.equal(false);
    });
});
