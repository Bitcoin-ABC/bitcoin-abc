// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex, toHexRev } from './io/hex.js';
import { initWasm } from './init.js';
import { sha256, sha256d, shaRmd160 } from './hash.js';

const GENESIS_HEADER_HEX =
    '01000000' +
    '0000000000000000000000000000000000000000000000000000000000000000' +
    '3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a' +
    '29ab5f49ffff001d1dac2b7c';

describe('Ecc', async () => {
    // Can't use `fetch` for local file so we have to read it using `fs`
    await initWasm();

    it('sha256', () => {
        expect(toHex(sha256(new Uint8Array()))).to.equal(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );
    });
    it('shaRmd160', () => {
        expect(toHex(shaRmd160(new Uint8Array()))).to.equal(
            'b472a266d0bd89c13706a4132ccfb16f7c3b9fcb',
        );
    });
    it('sha256d', () => {
        expect(toHex(sha256d(new Uint8Array()))).to.equal(
            '5df6e0e2761359d30a8275058e299fcc0381534545f55cf43e41983f5d4c9456',
        );
        expect(toHexRev(sha256d(fromHex(GENESIS_HEADER_HEX)))).to.equal(
            '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        );
    });
});
