// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    isTokenImageRequest,
    isValidPngBuffer,
    isValidTokenId,
} from '../src/validation';
import vectors from '../test/vectors';
import { fromHex } from 'ecash-lib';

// Keep in sync with cashtab hashFile.test.ts / iconAuth.test.ts canonical png.
const TOKEN_ICON_HASH_TEST_PNG_HEX =
    '89504e470d0a1a0a0000000d4948445200000020000000200806000000737a7af40000000970485973000003e8000003e801b57b526b0000003749444154789cedcea10100200c03307475f5feff727c0126223e279dfde90844a00223b00211a8c008ac40042a30022b10810accf3c0055125ec3d1b4a1f170000000049454e44ae426082';

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
    describe('We can validate png upload bytes', function () {
        it('accepts a valid png by magic bytes', function () {
            assert.equal(
                isValidPngBuffer(fromHex(TOKEN_ICON_HASH_TEST_PNG_HEX)),
                true,
            );
        });
        it('rejects data that is too short', function () {
            assert.equal(isValidPngBuffer(Buffer.from([0x89, 0x50])), false);
        });
        it('rejects non-png bytes', function () {
            assert.equal(
                isValidPngBuffer(Buffer.from([0xff, 0xd8, 0xff, 0x00])),
                false,
            );
        });
    });
});
