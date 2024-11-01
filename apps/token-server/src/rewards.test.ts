// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { isAddressEligibleForTokenReward } from '../src/rewards';
import vectors from '../test/vectors';

describe('rewards.js', function () {
    describe('We can evaluate if an outputScript is eligible for a reward based on its tx history', function () {
        const { returns } = vectors.isAddressEligibleForTokenReward;
        returns.forEach(vector => {
            const {
                description,
                address,
                tokenId,
                tokenServerOutputScript,
                historySinceEligibilityTimestamp,
                returned,
            } = vector;
            it(description, function () {
                assert.equal(
                    isAddressEligibleForTokenReward(
                        address,
                        tokenId,
                        tokenServerOutputScript,
                        historySinceEligibilityTimestamp,
                    ),
                    returned,
                );
            });
        });
    });
});
