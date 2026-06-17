// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sha256, toHex } from 'ecash-lib';
import { hashFile } from '../hashFile';

describe('hashFile', () => {
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
