// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { parseTx } from './parseTx';
import { parseFixtures } from './fixtures/vectors';

describe('parseTx', () => {
    for (const fixture of parseFixtures) {
        it(fixture.description, () => {
            assert.deepStrictEqual(
                parseTx(fixture.tx, fixture.walletHashes),
                fixture.parsed,
            );
        });
    }
});
