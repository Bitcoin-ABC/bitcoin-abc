// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    hasInputsFromOutputScript,
    addressReceivedToken,
    getTxTimestamp,
} from '../../src/chronik/parse';
import vectors from '../../test/vectors';

describe('chronik/parse.ts', function () {
    describe('We can determine if a given tx contains any input from a given outputScript', function () {
        const { returns } = vectors.hasInputsFromOutputScript;
        returns.forEach(vector => {
            const { description, tx, outputScript, returned } = vector;
            it(description, function () {
                assert.equal(
                    hasInputsFromOutputScript(tx, outputScript),
                    returned,
                );
            });
        });
    });
    describe('We can determine if an address received any of a given tokenId in a given tx', function () {
        const { returns } = vectors.addressReceivedToken;
        returns.forEach(vector => {
            const { description, tx, address, tokenId, returned } = vector;
            it(description, function () {
                assert.equal(
                    addressReceivedToken(tx, address, tokenId),
                    returned,
                );
            });
        });
    });
    describe('We get a timestamp from a chronik tx', function () {
        const { returns } = vectors.getTxTimestamp;
        returns.forEach(vector => {
            const { description, tx, timestamp } = vector;
            it(description, function () {
                assert.equal(getTxTimestamp(tx), timestamp);
            });
        });
    });
});
