// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { hashTokenIcon, verifyTokenIconUploadSignature } from '../src/iconAuth';
import { signMsg, Ecc, Address, shaRmd160, toHex, fromHex } from 'ecash-lib';

// 32x32 RGBA png from sharp (r:10, g:20, b:30, alpha:1). Keep in sync with
// cashtab/src/components/Etokens/icons/__tests__/hashFile.test.ts.
const TOKEN_ICON_HASH_TEST_PNG_HEX =
    '89504e470d0a1a0a0000000d4948445200000020000000200806000000737a7af40000000970485973000003e8000003e801b57b526b0000003749444154789cedcea10100200c03307475f5feff727c0126223e279dfde90844a00223b00211a8c008ac40042a30022b10810accf3c0055125ec3d1b4a1f170000000049454e44ae426082';
const TOKEN_ICON_HASH_TEST_SHA256 =
    'b0fd67f3ebbd2d457bf1d657dd7dc9bdca1ff7e508890c32f15da73d160e9042';

const TEST_SECRET_KEY = fromHex(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
);
const TEST_MINTER_ADDRESS = Address.p2pkh(
    toHex(shaRmd160(new Ecc().derivePubkey(TEST_SECRET_KEY))),
).toString();
const TEST_ICON_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe('iconAuth.ts', function () {
    it('hashes the canonical token icon png bytes', function () {
        const pngBytes = fromHex(TOKEN_ICON_HASH_TEST_PNG_HEX);
        assert.equal(hashTokenIcon(pngBytes), TOKEN_ICON_HASH_TEST_SHA256);
    });
    it('hashTokenIcon returns sha256 hex of the icon bytes', function () {
        assert.equal(
            hashTokenIcon(new Uint8Array([0x00])),
            '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d',
        );
    });
    it('verifyTokenIconUploadSignature accepts a valid signature', function () {
        const iconHashHex = hashTokenIcon(TEST_ICON_BYTES);
        const signature = signMsg(iconHashHex, TEST_SECRET_KEY);
        assert.equal(
            verifyTokenIconUploadSignature(
                TEST_ICON_BYTES,
                TEST_MINTER_ADDRESS,
                signature,
            ),
            true,
        );
    });
    it('verifyTokenIconUploadSignature rejects different icon bytes', function () {
        const iconHashHex = hashTokenIcon(TEST_ICON_BYTES);
        const signature = signMsg(iconHashHex, TEST_SECRET_KEY);
        const otherIconBytes = new Uint8Array([0x00, 0x01]);
        assert.equal(
            verifyTokenIconUploadSignature(
                otherIconBytes,
                TEST_MINTER_ADDRESS,
                signature,
            ),
            false,
        );
    });
    it('verifyTokenIconUploadSignature rejects an empty signature', function () {
        assert.equal(
            verifyTokenIconUploadSignature(
                TEST_ICON_BYTES,
                TEST_MINTER_ADDRESS,
                '',
            ),
            false,
        );
    });
    it('Cashtab signing flow verifies for the canonical token icon png bytes', function () {
        const pngBytes = fromHex(TOKEN_ICON_HASH_TEST_PNG_HEX);

        const signature = signMsg(TOKEN_ICON_HASH_TEST_SHA256, TEST_SECRET_KEY);

        assert.equal(
            verifyTokenIconUploadSignature(
                pngBytes,
                TEST_MINTER_ADDRESS,
                signature,
            ),
            true,
        );
    });
});
