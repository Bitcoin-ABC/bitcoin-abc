// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { hasInputsFromOutputScript } from '../../src/chronik/parse';
import vectors from '../vectors';

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
});
