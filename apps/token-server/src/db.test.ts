// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';
import {
    seedBlacklist,
    getBlacklistedTokenIds,
    initialBlacklist,
    getOneBlacklistEntry,
    removeBlacklistEntry,
    insertBlacklistEntry,
    resetBlacklist,
} from '../src/db';
import * as assert from 'assert';
import { createTestPool } from '../test/testDb';

const mockBlacklist = initialBlacklist.map(entry => ({ ...entry }));
const sortedMockTokenIds = mockBlacklist.map(entry => entry.tokenId).sort();

describe('db.ts, token-server database unit tests', function () {
    let testPool: Pool;

    beforeEach(async () => {
        testPool = await createTestPool();
        await seedBlacklist(testPool, initialBlacklist);
    });

    afterEach(async () => {
        await resetBlacklist(testPool);
        await testPool.end();
    });

    it('seedBlacklist seeds the blacklist when the table is empty', async function () {
        const countResult = await testPool.query<{ count: string }>(
            'SELECT COUNT(*)::text AS count FROM blacklist',
        );
        assert.strictEqual(
            Number.parseInt(countResult.rows[0].count, 10),
            mockBlacklist.length,
        );
    });
    it('getBlacklistedTokenIds can fetch an array of all blacklisted token ids', async function () {
        const tokenIds = await getBlacklistedTokenIds(testPool);
        assert.deepEqual(tokenIds.sort(), sortedMockTokenIds);
    });
    it('getOneBlacklistEntry returns expected information for a blacklisted tokenId', async function () {
        const blacklistedTokenId = mockBlacklist[0].tokenId;
        const entry = await getOneBlacklistEntry(testPool, blacklistedTokenId);
        assert.deepEqual(entry, mockBlacklist[0]);
    });
    it('getOneBlacklistEntry returns null if tokenId cannot be found on the blacklist', async function () {
        const blacklistedTokenId =
            '0000000000000000000000000000000000000000000000000000000000000000';
        const entry = await getOneBlacklistEntry(testPool, blacklistedTokenId);
        assert.equal(entry, null);
    });
    it('removeBlacklistEntry successfully removes an entry from the database', async function () {
        const tokenIdToBeUnblacklisted = mockBlacklist[0].tokenId;
        assert.deepEqual(
            await getOneBlacklistEntry(testPool, tokenIdToBeUnblacklisted),
            mockBlacklist[0],
        );

        assert.deepEqual(
            await removeBlacklistEntry(testPool, tokenIdToBeUnblacklisted),
            { rowCount: 1 },
        );

        assert.equal(
            await getOneBlacklistEntry(testPool, tokenIdToBeUnblacklisted),
            null,
        );
    });
    it('insertBlacklistEntry successfully inserts an entry onto the blacklist', async function () {
        const tokenIdToBeBlacklisted =
            'b5fd908eb70768d7b780ebacfdcc5af64aa5bc7a53274fb3e6010baa71840b83';
        assert.deepEqual(
            await getOneBlacklistEntry(testPool, tokenIdToBeBlacklisted),
            null,
        );
        const blacklistMetadata = {
            reason: 'Impersonates Metamask',
            timestamp: Math.round(new Date(1730090292122).getTime() / 1000),
            addedBy: 'Integration test',
        };

        await insertBlacklistEntry(
            testPool,
            tokenIdToBeBlacklisted,
            blacklistMetadata,
        );

        assert.deepEqual(
            await getOneBlacklistEntry(testPool, tokenIdToBeBlacklisted),
            {
                tokenId: tokenIdToBeBlacklisted,
                ...blacklistMetadata,
            },
        );
    });
});
