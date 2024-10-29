// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Mock mongodb
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
    initializeDb,
    getBlacklistedTokenIds,
    initialBlacklist,
    getOneBlacklistEntry,
} from '../src/db';
import * as assert from 'assert';
import config from '../config';

// Clone initialBlacklist before initializing the database
// initializeDb(initialBlacklist) will modify the entries by adding an "_id" key
const mockBlacklist = initialBlacklist.map(entry => ({ ...entry }));

describe('db.ts, token-server database unit tests', async function () {
    let mongoServer: MongoMemoryServer, testMongoClient: MongoClient;
    before(async () => {
        // Start mongo memory server before running this suite of unit tests
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        testMongoClient = new MongoClient(mongoUri);
    });

    after(async () => {
        // Shut down mongo memory server after running this suite of unit tests
        await testMongoClient.close();
        await mongoServer.stop();
    });

    let testDb: Db;
    beforeEach(async () => {
        testDb = await initializeDb(testMongoClient, initialBlacklist);
    });

    afterEach(async () => {
        // Wipe the database after each unit test
        await testDb.dropDatabase();
    });

    it('initializeDb returns a mongo db instance of the expected schema', async function () {
        const { namespace } = testDb;
        assert.strictEqual(namespace, config.db.name);
    });
    it('getBlacklistedTokenIds can fetch an array of all blacklisted token ids', async function () {
        const tokenIds = await getBlacklistedTokenIds(testDb);
        assert.deepEqual(
            tokenIds,
            mockBlacklist.map(entry => entry.tokenId),
        );
    });
    it('getOneBlacklistEntry returns expected information for a blacklisted tokenId', async function () {
        const blacklistedTokenId = mockBlacklist[0].tokenId;
        const entry = await getOneBlacklistEntry(testDb, blacklistedTokenId);
        assert.deepEqual(entry, mockBlacklist[0]);
    });
    it('getOneBlacklistEntry returns null if tokenId cannot be found on the blacklist', async function () {
        const blacklistedTokenId =
            '0000000000000000000000000000000000000000000000000000000000000000';
        const entry = await getOneBlacklistEntry(testDb, blacklistedTokenId);
        assert.equal(entry, null);
    });
});
