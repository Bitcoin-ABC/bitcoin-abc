// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { createFsFromVolume, vol, IFs } from 'memfs';
import config from '../config';
import { denyTokenIcon, restoreTokenIcon } from '../src/iconModeration';
import { getOneBlacklistEntry } from '../src/db';
import { createTestPool } from '../test/testDb';
import { Pool } from 'pg';

const TEST_TOKEN_ID =
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const writeIconFiles = (fs: IFs, baseDir: string, tokenId: string): void => {
    for (const size of config.iconSizes) {
        const dir = `${baseDir}/${size}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(`${dir}/${tokenId}.png`, 'png-data');
    }
};

describe('iconModeration.ts', function () {
    let testPool: Pool;
    let fs: IFs;

    const ensureIconDirs = (baseDir: string): void => {
        for (const size of config.iconSizes) {
            const dir = `${baseDir}/${size}`;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    };

    beforeEach(async () => {
        testPool = await createTestPool();
        vol.reset();
        fs = createFsFromVolume(vol);
        ensureIconDirs(config.imageDir);
        ensureIconDirs(config.rejectedDir);
    });

    afterEach(async () => {
        vol.reset();
        await testPool.end();
    });

    it('denyTokenIcon returns false when no served icon exists', async function () {
        const denied = await denyTokenIcon(
            testPool,
            fs,
            TEST_TOKEN_ID,
            'test-mod',
        );

        assert.equal(denied, false);
        assert.equal(await getOneBlacklistEntry(testPool, TEST_TOKEN_ID), null);
    });

    it('restoreTokenIcon returns false when no rejected icon exists', async function () {
        const restored = await restoreTokenIcon(testPool, fs, TEST_TOKEN_ID);

        assert.equal(restored, false);
    });

    it('denyTokenIcon returns true when icon files exist', async function () {
        writeIconFiles(fs, config.imageDir, TEST_TOKEN_ID);

        const denied = await denyTokenIcon(
            testPool,
            fs,
            TEST_TOKEN_ID,
            'test-mod',
        );

        assert.equal(denied, true);
        assert.ok(await getOneBlacklistEntry(testPool, TEST_TOKEN_ID));
    });
});
