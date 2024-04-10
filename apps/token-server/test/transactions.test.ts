// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { getSlpInputsAndOutputs } from '../src/transactions';
import vectors from './vectors';

describe('transactions.ts', function () {
    describe('We can get slpInputs and slpOutputs for a token rewards tx to one destinationAddress', function () {
        const { returns, errors } = vectors.getSlpInputsAndOutputs;
        returns.forEach(vector => {
            const {
                description,
                rewardAmountTokenSats,
                destinationAddress,
                tokenId,
                utxos,
                returned,
            } = vector;
            it(description, function () {
                assert.deepEqual(
                    getSlpInputsAndOutputs(
                        rewardAmountTokenSats,
                        destinationAddress,
                        tokenId,
                        utxos,
                    ),
                    returned,
                );
            });
        });
        errors.forEach(vector => {
            const {
                description,
                rewardAmountTokenSats,
                destinationAddress,
                tokenId,
                utxos,
                error,
            } = vector;
            it(description, function () {
                assert.throws(
                    () =>
                        getSlpInputsAndOutputs(
                            rewardAmountTokenSats,
                            destinationAddress,
                            tokenId,
                            utxos,
                        ),
                    error,
                );
            });
        });
    });
});
