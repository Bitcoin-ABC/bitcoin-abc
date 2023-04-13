// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const {
    initializeDb,
    getServerState,
    updateServerState,
} = require('../src/db');
// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer, testMongoClient;
before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    console.log(`mongoUri`, mongoUri);
    testMongoClient = new MongoClient(mongoUri);
});

after(async () => {
    await testMongoClient.close();
    await mongoServer.stop();
});

describe('alias-server db.js', async function () {
    it('initializeDb returns a mongo db instance of the expected schema', async function () {
        const testDb = await initializeDb(testMongoClient);
        const { namespace } = testDb;
        assert.strictEqual(namespace, 'ecashAliases');
    });
    it('getServerState returns expected initial server state on initialized database', async function () {
        const testDb = await initializeDb(testMongoClient);
        // Check that serverState was initialized properly
        const initialServerState = await getServerState(testDb);
        assert.deepEqual(initialServerState, {
            processedBlockheight: 0,
            processedConfirmedTxs: 0,
        });
    });
    it('updateServerState modifies serverState correctly', async function () {
        const testDb = await initializeDb(testMongoClient);
        const newServerState = {
            processedConfirmedTxs: 1,
            processedBlockheight: 700000,
        };
        // Modify serverState
        const serverStateModifiedSuccess = await updateServerState(
            testDb,
            newServerState,
        );
        // Fetch the now-modified serverState
        const fetchedServerState = await getServerState(testDb);
        // Confirm it has been modified
        assert.deepEqual(fetchedServerState, newServerState);
        // Confirm updateServerState returned true
        assert.strictEqual(serverStateModifiedSuccess, true);
    });
    it('updateServerState returns false if provided with improperly formatted new serverState', async function () {
        const testDb = await initializeDb(testMongoClient);
        const newServerState = {
            // typo
            processedConfirmedTx: 1,
            processedBlockheight: 700000,
        };
        // Modify serverState
        const serverStateModifiedSuccess = await updateServerState(
            testDb,
            newServerState,
        );
        // Confirm updateServerState returned false
        assert.strictEqual(serverStateModifiedSuccess, false);
    });
    it('If serverState exists on startup, initializeDb does not overwrite it', async function () {
        // Startup the app and initialize serverState
        const testDb = await initializeDb(testMongoClient);
        // Change it
        const newServerState = {
            // typo
            processedConfirmedTxs: 1,
            processedBlockheight: 700000,
        };
        await updateServerState(testDb, newServerState);
        // Start up the app again
        const testDbOnRestart = await initializeDb(testMongoClient);
        const fetchedServerStateOnRestart = await getServerState(
            testDbOnRestart,
        );
        // Verify serverState has not reverted to initial value
        assert.deepEqual(fetchedServerStateOnRestart, newServerState);
    });
});
