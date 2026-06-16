// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sha256, toHex, fromHex } from 'ecash-lib';
import { hashFile } from '../hashFile';

// 32x32 RGBA png from sharp (r:10, g:20, b:30, alpha:1). Keep in sync with
// apps/token-server/src/iconAuth.test.ts.
const TOKEN_ICON_HASH_TEST_PNG_HEX =
    '89504e470d0a1a0a0000000d4948445200000020000000200806000000737a7af40000000970485973000003e8000003e801b57b526b0000003749444154789cedcea10100200c03307475f5feff727c0126223e279dfde90844a00223b00211a8c008ac40042a30022b10810accf3c0055125ec3d1b4a1f170000000049454e44ae426082';
const TOKEN_ICON_HASH_TEST_SHA256 =
    'b0fd67f3ebbd2d457bf1d657dd7dc9bdca1ff7e508890c32f15da73d160e9042';

describe('hashFile', () => {
    it('hashes the canonical token icon png bytes', async () => {
        const pngBytes = fromHex(TOKEN_ICON_HASH_TEST_PNG_HEX);

        const asFile = (): File =>
            ({
                name: 'icon.png',
                arrayBuffer: async () => pngBytes.buffer,
            }) as File;

        expect(await hashFile(asFile())).toBe(TOKEN_ICON_HASH_TEST_SHA256);
    });

    it('hashes file bytes only; filename does not affect the hash', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const expected = toHex(sha256(data));

        const asFile = (name: string): File =>
            ({
                name,
                arrayBuffer: async () => data.buffer,
            }) as File;

        expect(await hashFile(asFile('a.png'))).toBe(expected);
        expect(await hashFile(asFile(`${'x'.repeat(500)}.png`))).toBe(expected);
    });
});
