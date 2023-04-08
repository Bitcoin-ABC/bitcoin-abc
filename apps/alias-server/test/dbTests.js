// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { initializeDb } = require('../src/db');
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
});
