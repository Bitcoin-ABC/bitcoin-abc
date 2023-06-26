// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

const request = require('supertest');
const { startServer } = require('../src/app');
const { initializeDb, addOneAliasToDb, addAliasesToDb } = require('../src/db');
// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { generated } = require('./mocks/aliasMocks');

describe('alias-server app.js', function () {
    let mongoServer, testMongoClient;
    before(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        testMongoClient = new MongoClient(mongoUri);
    });
    after(async () => {
        await testMongoClient.close();
        await mongoServer.stop();
    });
    let testDb, app, dbErrorApp;
    beforeEach(async () => {
        // Initialize db before each unit test
        testDb = await initializeDb(testMongoClient);
        // Start the express server
        app = startServer(testDb, 5000);
        // Start an express server with a bad db to mock errors
        dbErrorApp = startServer('not_a_database', 5001);
    });
    afterEach(async () => {
        // Wipe the database after each unit test
        await testDb.dropDatabase();
        // Stop express server
        app.close();
        dbErrorApp.close();
    });
    it('/aliases returns an empty array if no aliases are indexed', function () {
        return request(app)
            .get('/aliases')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect('[]');
    });
    it('/aliases returns an error on database error', function () {
        return request(dbErrorApp)
            .get('/aliases')
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({ error: 'db.collection is not a function' });
    });
    it('/aliases returns array of all indexed alias objects', async function () {
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        await addAliasesToDb(testDb, newValidAliases);

        return request(app)
            .get('/aliases')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(generated.validAliasRegistrations);
    });
    it('/alias/<alias> returns object with isRegistered:false for an alias not in the database', async function () {
        const testedAlias = 'test';
        return request(app)
            .get(`/alias/${testedAlias}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ alias: testedAlias, isRegistered: false });
    });
    it('/alias/<alias> returns object with isRegistered:true for an alias in the database', async function () {
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        await addOneAliasToDb(testDb, newValidAliases[0]);
        const { alias, address, blockheight, txid } = newValidAliases[0];
        return request(app)
            .get(`/alias/${alias}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ alias, address, blockheight, txid, isRegistered: true });
    });
    it('/alias/<alias> returns an error on database error', function () {
        const testAlias = 'test';
        return request(dbErrorApp)
            .get(`/alias/${testAlias}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                error: `Error fetching /alias/test: Error finding alias "${testAlias}" in database`,
            });
    });
});
