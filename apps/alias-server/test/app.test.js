// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

const request = require('supertest');
const { startServer } = require('../src/app');
const {
    initializeDb,
    addOneAliasToDb,
    addAliasesToDb,
    updateServerState,
    addOneAliasToPending,
} = require('../src/db');
// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { generated } = require('./mocks/aliasMocks');
const aliasConstants = require('../constants/alias');

describe('alias-server app.js', async function () {
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
    it('/prices returns aliasConstants.prices', function () {
        let pricesResponse = {
            note: 'alias-server is in beta and these prices are not finalized.',
            prices: aliasConstants.prices,
        };
        return request(app)
            .get('/prices')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(pricesResponse);
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
    it('/alias/<alias> returns expected object for an alias not in the database and with no pending registrations', async function () {
        const testedAlias = 'test';

        // Set serverState
        updateServerState(testDb, {
            processedConfirmedTxs: 45587,
            processedBlockheight: 800000,
        });

        return request(app)
            .get(`/alias/${testedAlias}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                alias: testedAlias,
                isRegistered: false,
                pending: [],
                registrationFeeSats: 555,
                processedBlockheight: 800000,
            });
    });
    it('/alias/<alias> returns expected object for an alias not in the database with pending registrations', async function () {
        const testedAlias = 'test';

        // Set serverState
        updateServerState(testDb, {
            processedConfirmedTxs: 45587,
            processedBlockheight: 800000,
        });

        // Set pending registrations for test
        const testPendingAlias = {
            alias: 'test',
            address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            txid: '218a1e058ed0fda76573eabf43ad3ded7e7192e42621893a60aaa152ba7f66fe',
        };
        // Add a clone so you can still check against pendingAliases
        await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(testPendingAlias)),
        );

        return request(app)
            .get(`/alias/${testedAlias}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                alias: testedAlias,
                isRegistered: false,
                pending: [
                    {
                        address:
                            'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                        txid: '218a1e058ed0fda76573eabf43ad3ded7e7192e42621893a60aaa152ba7f66fe',
                    },
                ],
                registrationFeeSats: 555,
                processedBlockheight: 800000,
            });
    });
    it('/alias/<alias> returns expected object for an alias in the database', async function () {
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
            .expect({ alias, address, blockheight, txid });
    });
    it('/alias/<alias> returns an error on database error', function () {
        const testAlias = 'test';
        return request(dbErrorApp)
            .get(`/alias/${testAlias}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                error: `Error fetching /alias/${testAlias}: alias-server was unable to fetch server state`,
            });
    });
    it('/address/:address returns an empty object of expected shape if there are no registered aliases for the given address', function () {
        const validAddress = 'ecash:qphpmfj0qn7znklqhrfn5dq7qh36l3vxav9up3h67g';
        return request(app)
            .get(`/address/${validAddress}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ registered: [], pending: [] });
    });
    it('/address/:address returns an empty object of expected shape if there are no registered aliases for the given address and input is prefixless but has valid checksum', function () {
        const validAddress = 'qphpmfj0qn7znklqhrfn5dq7qh36l3vxav9up3h67g';
        return request(app)
            .get(`/address/${validAddress}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ registered: [], pending: [] });
    });
    it('/address/:address returns an array of length 1 at the registered key if there is one registered alias for the given address', async function () {
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        await addOneAliasToDb(testDb, newValidAliases[0]);
        const { address } = newValidAliases[0];
        return request(app)
            .get(`/address/${address}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                registered: [generated.validAliasRegistrations[0]],
                pending: [],
            });
    });
    it('/address/:address returns an array of length 1 at registered key if there is one registered alias for the given address and given address is prefixless but valid checksum', async function () {
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        await addOneAliasToDb(testDb, newValidAliases[0]);
        const { address } = newValidAliases[0];
        return request(app)
            .get(`/address/${address.slice('ecash:'.length)}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                registered: [generated.validAliasRegistrations[0]],
                pending: [],
            });
    });
    it('/address/:address returns an array of multiple alias registrations at registered key if there are multiple registered aliases for the given address', async function () {
        // Add aliases
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        const { address } = newValidAliases[0];
        // Pre-populate the aliases collection
        await addAliasesToDb(testDb, newValidAliases);

        // Get the expected array using array filtering
        // This way, if the mocks change, the expected result updates appropriately
        const registered = generated.validAliasRegistrations.filter(
            aliasObj => {
                if (aliasObj.address === address) {
                    return aliasObj;
                }
            },
        );
        const expectedResult = { registered, pending: [] };
        return request(app)
            .get(`/address/${address}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(expectedResult);
    });
    it('/address/:address returns an array of multiple alias registrations at registered key if there are multiple registered aliases for the given address and input is prefixless with valid checksum', async function () {
        // Add aliases
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        const { address } = newValidAliases[0];
        // Pre-populate the aliases collection
        await addAliasesToDb(testDb, newValidAliases);

        // Get the expected array using array filtering
        // This way, if the mocks change, the expected result updates appropriately
        const registered = generated.validAliasRegistrations.filter(
            aliasObj => {
                if (aliasObj.address === address) {
                    return aliasObj;
                }
            },
        );
        const expectedResult = { registered, pending: [] };
        return request(app)
            .get(`/address/${address.slice('ecash:'.length)}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(expectedResult);
    });
    it('/address/:address returns an array of multiple alias registrations at registered key and multiple aliases for pending key if there are multiple registered aliases for the given address and input is prefixless with valid checksum', async function () {
        // Add aliases
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        const { address } = newValidAliases[0];
        // Let's make this first entry pending
        // Get the first entry of newValidAliases (and remove it from newValidAliases)
        const pendingAlias = newValidAliases.shift();

        // Add a clone so you can still check against pendingAliases
        await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(pendingAlias)),
        );

        // Modify pendingAlias to be expected result
        delete pendingAlias.blockheight;
        delete pendingAlias.address;

        // Pre-populate the aliases collection
        await addAliasesToDb(
            testDb,
            JSON.parse(JSON.stringify(newValidAliases)),
        );

        // Get the expected array using array filtering
        // This way, if the mocks change, the expected result updates appropriately
        const registered = newValidAliases.filter(aliasObj => {
            if (aliasObj.address === address) {
                return aliasObj;
            }
        });
        const pending = [pendingAlias];
        const expectedResult = { registered, pending };
        return request(app)
            .get(`/address/${address.slice('ecash:'.length)}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(expectedResult);
    });
    it('/address/:address returns an error on valid address that is not ecash: prefixed', function () {
        const etokenAddress =
            'etoken:qphpmfj0qn7znklqhrfn5dq7qh36l3vxavtzgnpa6l';
        return request(app)
            .get(`/address/${etokenAddress}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                error: `Error fetching /address/${etokenAddress}: Input must be a valid eCash address`,
            });
    });
    it('/address/:address returns an error on a string that is not a valid ecash address', function () {
        const invalidAddress = 'justSomeString';
        return request(app)
            .get(`/address/${invalidAddress}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                error: `Error fetching /address/${invalidAddress}: Input must be a valid eCash address`,
            });
    });
    it('/address/:address returns an error on database error', function () {
        const validAddress = 'ecash:qphpmfj0qn7znklqhrfn5dq7qh36l3vxav9up3h67g';
        return request(dbErrorApp)
            .get(`/address/${validAddress}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                error: `Error fetching /address/${validAddress}: Error finding aliases for address ${validAddress} in database`,
            });
    });
});
