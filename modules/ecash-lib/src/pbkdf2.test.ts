// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { toHex } from './io/hex.js';
import { strToBytes } from './io/str.js';
import { sha256Hasher } from './hash.js';
import { pbkdf2 } from './pbkdf2.js';
import './initNodeJs.js';

// Tests are based on https://github.com/paulmillr/noble-hashes/blob/main/test/kdf.test.js

describe('pbkdf2', async () => {
    it('pbkdf2 passwd', async () => {
        expect(
            toHex(
                pbkdf2({
                    hashFactory: sha256Hasher,
                    password: strToBytes('passwd'),
                    salt: strToBytes('salt'),
                    blockLength: 64,
                    outputLength: 32,
                    dkLen: 64,
                    iterations: 1,
                }),
            ),
        ).to.equal(
            '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc' +
                '49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783',
        );
    });

    it('pbkdf2 big iter', async () => {
        expect(
            toHex(
                pbkdf2({
                    hashFactory: sha256Hasher,
                    password: strToBytes('Password'),
                    salt: strToBytes('NaCl'),
                    blockLength: 64,
                    outputLength: 32,
                    dkLen: 64,
                    iterations: 8000,
                }),
            ),
        ).to.equal(
            '7f256b9dadf7544d75a9c56b6293c7744f5de67c8f45547526eaac5917f2dcb4' +
                '167b906fb79c2f2b6146b85cb670f1afb73987a2af7cc917869b259eb469191b',
        );
    });
});
