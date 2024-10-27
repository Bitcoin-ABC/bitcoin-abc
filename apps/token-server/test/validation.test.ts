// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { isTokenImageRequest, isValidTokenId } from '../src/validation';
import vectors from './vectors';

describe('validation.ts', function () {
    describe('We can tell if an API request was for a token icon', function () {
        const { returns } = vectors.isTokenImageRequest;
        returns.forEach(vector => {
            const { description, req, returned } = vector;
            it(description, function () {
                assert.equal(isTokenImageRequest(req), returned);
            });
        });
    });
    describe('We can validate a tokenId', function () {
        const { returns } = vectors.isValidTokenId;
        returns.forEach(vector => {
            const { description, string, returned } = vector;
            it(description, function () {
                assert.equal(isValidTokenId(string), returned);
            });
        });
    });
});
