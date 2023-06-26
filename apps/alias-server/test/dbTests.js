// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const config = require('../config');
const aliasConstants = require('../constants/alias');
const {
    initializeDb,
    getServerState,
    updateServerState,
    addOneAliasToDb,
    addAliasesToDb,
    getAliasesFromDb,
    getAliasInfoFromAlias,
    getAliasInfoFromAddress,
} = require('../src/db');
// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { generated } = require('./mocks/aliasMocks');

describe('alias-server db.js', async function () {
    let mongoServer, testMongoClient;
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

    let testDb;
    beforeEach(async () => {
        // Initialize db before each unit test
        testDb = await initializeDb(testMongoClient);
    });
    afterEach(async () => {
        // Wipe the database after each unit test
        await testDb.dropDatabase();
    });
    it('initializeDb returns a mongo db instance of the expected schema', async function () {
        const { namespace } = testDb;
        assert.strictEqual(namespace, 'ecashAliases');
    });
    it('getServerState returns expected initial server state on initialized database', async function () {
        // Check that serverState was initialized properly
        const initialServerState = await getServerState(testDb);
        assert.deepEqual(initialServerState, config.initialServerState);
    });
    it('updateServerState modifies serverState correctly', async function () {
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
        // Change serverState
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
    it('addAliasesToDb successfully adds new valid aliases to an empty collection', async function () {
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        await addAliasesToDb(testDb, newValidAliases);
        // Get the newly added valid aliases
        // Note we return valid aliases without the database _id field
        const addedValidAliases = await getAliasesFromDb(testDb);

        // Verify addedValidAliases match the added mock
        assert.deepEqual(addedValidAliases, generated.validAliasRegistrations);
    });
    it('addOneAliasToDb successfully adds a new valid alias to an empty collection', async function () {
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        const aliasAddedSuccess = await addOneAliasToDb(
            testDb,
            newValidAliases[0],
        );
        // Get the newly added valid aliases
        // Note we return valid aliases without the database _id field
        const addedValidAliases = await getAliasesFromDb(testDb);

        // Verify the function returns true on alias add success
        assert.strictEqual(aliasAddedSuccess, true);
        // Verify the database has the expected alias
        assert.deepEqual(addedValidAliases, [
            generated.validAliasRegistrations[0],
        ]);
    });
    it('addOneAliasToDb successfully adds a new valid alias to an existing collection', async function () {
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        // Pre-populate the aliases collection
        await addAliasesToDb(testDb, newValidAliases);

        const newMockAlias = {
            address: 'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48',
            alias: 'rico',
            txid: '3ff9c28fa07cb88c87000ef0f5ee61953d874ffade154cd3f88fd60b88ea2879',
            blockheight: 1787674, // Note, blockheight is purposefully set to be higher than mocks
        };

        // clone to check unit test result as _id will be added to newMockAlias
        const newMockAliasClone = JSON.parse(JSON.stringify(newMockAlias));

        // Add an alias tx that does not exist
        const aliasAddedSuccess = await addOneAliasToDb(testDb, newMockAlias);
        // Get the newly added valid aliases
        // Note we return valid aliases without the database _id field
        const addedValidAliases = await getAliasesFromDb(testDb);

        // Verify the function returns true on alias add success
        assert.strictEqual(aliasAddedSuccess, true);
        // Verify the database has the expected alias
        assert.deepEqual(
            addedValidAliases,
            generated.validAliasRegistrations.concat(newMockAliasClone),
        );
    });
    it('addOneAliasToDb returns false and fails to add an alias if it is already in the database', async function () {
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        // Pre-populate the aliases collection
        await addAliasesToDb(testDb, newValidAliases);

        const newMockAliasTxRegisteringExistingAlias = newValidAliases[0];

        // Add an alias tx that does not exist
        const aliasAddedSuccess = await addOneAliasToDb(
            testDb,
            newMockAliasTxRegisteringExistingAlias,
        );
        // Get the newly added valid aliases
        // Note we return valid aliases without the database _id field
        const addedValidAliases = await getAliasesFromDb(testDb);

        // Verify the function returns true on alias add success
        assert.strictEqual(aliasAddedSuccess, false);
        // Verify the database has the expected aliases (without the failed add)
        assert.deepEqual(addedValidAliases, generated.validAliasRegistrations);
    });
    it('getAliasesFromDb returns an empty array if no aliases have been added to the collection', async function () {
        const validAliases = await getAliasesFromDb(testDb);
        assert.deepEqual(validAliases, []);
    });
    it('addAliasesToDb returns false if you attempt to add aliases whose alias already exists in the database', async function () {
        // Startup the app and initialize serverState
        const testDb = await initializeDb(testMongoClient);

        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        await addAliasesToDb(testDb, newValidAliases);

        // Try to add three aliases that already exists in the database
        const newValidAliasAlreadyInDb = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations.slice(0, 3)),
        );
        const failedResult = await addAliasesToDb(
            testDb,
            newValidAliasAlreadyInDb,
        );
        // Verify addAliasesToDb returned false on attempt to add duplicate aliases to the db
        assert.deepEqual(failedResult, false);
    });
    it('getAliasInfoFromAlias returns null if alias does not exist in the database', async function () {
        const aliasInfo = await getAliasInfoFromAlias(testDb, 'nope');
        assert.deepEqual(aliasInfo, null);
    });
    it('getAliasInfoFromAlias returns expected alias object if alias does exist in the database', async function () {
        const newMockAlias = {
            address: 'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48',
            alias: 'rico',
            txid: '3ff9c28fa07cb88c87000ef0f5ee61953d874ffade154cd3f88fd60b88ea2879',
            blockheight: 1787674, // Note, blockheight is purposefully set to be higher than mocks
        };
        // Clone newMockAlias to get object without added _id field
        const newMockAliasClone = JSON.parse(JSON.stringify(newMockAlias));
        // Add alias
        await addOneAliasToDb(testDb, newMockAlias);
        const aliasInfo = await getAliasInfoFromAlias(
            testDb,
            newMockAlias.alias,
        );
        assert.deepEqual(aliasInfo, newMockAliasClone);
    });
    it('getAliasInfoFromAlias throws an error if called with a type other than string', async function () {
        const aliasWrongType = ['alias'];
        await assert.rejects(
            async () => {
                await getAliasInfoFromAlias(testDb, aliasWrongType);
            },
            {
                name: 'Error',
                message: 'alias param must be a string',
            },
        );
    });
    it('getAliasInfoFromAlias throws an error if called with a string shorter than 1 character', async function () {
        const aliasTooShort = '';
        await assert.rejects(
            async () => {
                await getAliasInfoFromAlias(testDb, aliasTooShort);
            },
            {
                name: 'Error',
                message: `alias param must be between ${aliasConstants.minLength} and ${aliasConstants.maxLength} characters in length`,
            },
        );
    });
    it('getAliasInfoFromAlias throws an error if called with a string longer than 21 characters', async function () {
        const aliasTooLong = 'twentyfourcharacteralias';
        await assert.rejects(
            async () => {
                await getAliasInfoFromAlias(testDb, aliasTooLong);
            },
            {
                name: 'Error',
                message: `alias param must be between 1 and ${aliasConstants.maxLength} characters in length`,
            },
        );
    });
    it('getAliasInfoFromAlias throws an error if called with a string that is not alphanumeric', async function () {
        const invalidAlias = 'invalid_alias';
        await assert.rejects(
            async () => {
                await getAliasInfoFromAlias(testDb, invalidAlias);
            },
            {
                name: 'Error',
                message:
                    'alias param cannot contain non-alphanumeric characters',
            },
        );
    });
    it('getAliasInfoFromAddress returns an empty array if no aliases are registered to the given address', async function () {
        const testAddress = 'ecash:qphpmfj0qn7znklqhrfn5dq7qh36l3vxav9up3h67g';
        assert.deepEqual(
            await getAliasInfoFromAddress(testDb, testAddress),
            [],
        );
        // Same result if queried with prefixless address
        assert.deepEqual(
            await getAliasInfoFromAddress(
                testDb,
                testAddress.slice('ecash:'.length),
            ),
            [],
        );
    });
    it('getAliasInfoFromAddress returns expected alias array if multiple aliases are registered to the queried address', async function () {
        const testAddress = 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';

        // Add aliases
        // newValidAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const newValidAliases = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );
        // Pre-populate the aliases collection
        await addAliasesToDb(testDb, newValidAliases);

        // Get the expected array using array filtering
        // This way, if the mocks change, the expected result updates appropriately
        const expectedResult = generated.validAliasRegistrations.filter(
            aliasObj => {
                if (aliasObj.address === testAddress) {
                    return aliasObj;
                }
            },
        );

        assert.deepEqual(
            await getAliasInfoFromAddress(testDb, testAddress),
            expectedResult,
        );

        // Same result if queried with prefixless address
        assert.deepEqual(
            await getAliasInfoFromAddress(
                testDb,
                testAddress.slice('ecash:'.length),
            ),
            expectedResult,
        );
    });
    it('getAliasInfoFromAddress returns expected alias array if a single alias is registered to the queried address', async function () {
        const testAddress = 'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48';

        const newMockAlias = {
            address: 'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48',
            alias: 'rico',
            txid: '3ff9c28fa07cb88c87000ef0f5ee61953d874ffade154cd3f88fd60b88ea2879',
            blockheight: 1787674, // Note, blockheight is purposefully set to be higher than mocks
        };

        // Add a clone of newMockAlias to the db so that newMockAlias is unmodified
        await addOneAliasToDb(testDb, JSON.parse(JSON.stringify(newMockAlias)));

        assert.deepEqual(await getAliasInfoFromAddress(testDb, testAddress), [
            newMockAlias,
        ]);

        // Same result if queried with prefixless address
        assert.deepEqual(
            await getAliasInfoFromAddress(
                testDb,
                testAddress.slice('ecash:'.length),
            ),
            [newMockAlias],
        );
    });
    it('getAliasInfoFromAddress throws an error if queried with an invalid ecash address', async function () {
        // Delete the last char, '8'
        const invalidAddress =
            'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r4';
        await assert.rejects(
            async () => {
                await getAliasInfoFromAddress(testDb, invalidAddress);
            },
            {
                name: 'Error',
                message: 'Input must be a valid eCash address',
            },
        );
    });
    it('getAliasInfoFromAddress throws an error if queried with an valid ecash address checksummed to a prefix other than ecash', async function () {
        // etoken addr
        const invalidAddress = 'qrmz0egsqxj35x5jmzf8szrszdeu72fx0ugk858y3s';
        await assert.rejects(
            async () => {
                await getAliasInfoFromAddress(testDb, invalidAddress);
            },
            {
                name: 'Error',
                message: 'Input must be a valid eCash address',
            },
        );
    });
});
