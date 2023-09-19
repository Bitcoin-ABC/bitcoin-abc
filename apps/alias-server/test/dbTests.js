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
    addOneAliasToPending,
    deletePendingAliases,
    getPendingAliases,
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
    });
    it('addOneAliasToPending successfully adds a new pending alias to an empty collection, and getPendingAliases reads one alias', async function () {
        const newPendingAliasTx = {
            address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            alias: 'pending',
            txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
            tipHeight: config.initialServerState.processedBlockheight,
        };
        // Add to db
        // Add a clone of newPendingAliasTx because this process will add an _id key to the object
        const addedResult = await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(newPendingAliasTx)),
        );
        assert.deepEqual(addedResult.acknowledged, true);
        assert.deepEqual(Object.keys(addedResult).includes('insertedId'), true);

        const addedPendingAliases = await getPendingAliases(testDb);

        // Verify the database has the expected alias
        assert.deepEqual(addedPendingAliases, [newPendingAliasTx]);
    });
    it('addOneAliasToPending returns false if the same alias + address + txid combo is added a second time', async function () {
        const newPendingAliasTx = {
            address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            alias: 'pending',
            txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
            tipHeight: config.initialServerState.processedBlockheight,
        };
        // Add to db
        // Add a clone of newPendingAliasTx because this process will add an _id key to the object
        const addedResult = await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(newPendingAliasTx)),
        );
        assert.deepEqual(addedResult.acknowledged, true);
        assert.deepEqual(Object.keys(addedResult).includes('insertedId'), true);

        const addedPendingAliases = await getPendingAliases(testDb);

        // Verify the database has the expected alias
        assert.deepEqual(addedPendingAliases, [newPendingAliasTx]);

        // Verify duplicate key error is thrown if you try to add it again
        assert.deepEqual(
            await addOneAliasToPending(
                testDb,
                JSON.parse(JSON.stringify(newPendingAliasTx)),
            ),
            false,
        );
        // Verify the repeat entry was not added
        assert.deepEqual(addedPendingAliases, [newPendingAliasTx]);
    });
    it('addOneAliasToPending successfully adds a new pending alias to a collection with existing entry of the same alias, and getPendingAliases fetches both', async function () {
        const duplicatedPendingAlias = 'pending';
        const firstPendingAliasTx = {
            address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            alias: duplicatedPendingAlias,
            txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
            tipHeight: config.initialServerState.processedBlockheight,
        };
        // Add to db
        // Add a clone of firstPendingAliasTx because this process will add an _id key to the object
        await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(firstPendingAliasTx)),
        );

        // Second pending tx has identical alias as first but different address
        const secondPendingAliasTx = {
            address: 'ecash:ppmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            alias: duplicatedPendingAlias,
            txid: '0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2',
            tipHeight: config.initialServerState.processedBlockheight,
        };

        // Add to db
        // Add a clone of secondPendingAliasTx because this process will add an _id key to the object
        await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(secondPendingAliasTx)),
        );

        const addedPendingAliases = await getPendingAliases(testDb);

        // Verify the database has the expected alias
        assert.deepEqual(addedPendingAliases, [
            firstPendingAliasTx,
            secondPendingAliasTx,
        ]);
    });
    it('addOneAliasToPending will add a new pending alias if the txid is already in the collection', async function () {
        const duplicatedPendingAlias = 'pending';
        const duplicatedPendingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const firstPendingAliasTx = {
            address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            alias: duplicatedPendingAlias,
            txid: duplicatedPendingTxid,
            tipHeight: config.initialServerState.processedBlockheight,
        };
        // Add to db
        // Add a clone of firstPendingAliasTx because this process will add an _id key to the object
        const firstAddedPending = await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(firstPendingAliasTx)),
        );
        assert.deepEqual(firstAddedPending.acknowledged, true);

        // Second pending tx has identical txid as first
        const secondPendingAliasTx = {
            address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            alias: duplicatedPendingAlias + '2',
            txid: duplicatedPendingTxid,
            tipHeight: config.initialServerState.processedBlockheight,
        };

        // Add to db
        // Add a clone of secondPendingAliasTx because this process will add an _id key to the object
        const secondAddedPending = await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(secondPendingAliasTx)),
        );
        assert.deepEqual(secondAddedPending.acknowledged, true);

        const addedPendingAliases = await getPendingAliases(testDb);

        // Verify the database has both pending aliases
        assert.deepEqual(addedPendingAliases, [
            firstPendingAliasTx,
            secondPendingAliasTx,
        ]);
    });
    it('addOneAliasToPending will add a new pending alias if the alias and address are already in the collection (only txid changed)', async function () {
        const duplicatedAddress =
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';
        const duplicatedPendingAlias = 'pending';
        const firstPendingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const secondPendingTxid =
            'fc92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const firstPendingAliasTx = {
            address: duplicatedAddress,
            alias: duplicatedPendingAlias,
            txid: firstPendingTxid,
            tipHeight: config.initialServerState.processedBlockheight,
        };
        // Add to db
        // Add a clone of firstPendingAliasTx because this process will add an _id key to the object
        const firstAddedPending = await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(firstPendingAliasTx)),
        );
        assert.deepEqual(firstAddedPending.acknowledged, true);

        // Second pending tx has identical address and alias as first
        const secondPendingAliasTx = {
            address: duplicatedAddress,
            alias: duplicatedPendingAlias,
            txid: secondPendingTxid,
            tipHeight: config.initialServerState.processedBlockheight,
        };

        // Add to db
        // Add a clone of secondPendingAliasTx because this process will add an _id key to the object
        const secondAddedPending = await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(secondPendingAliasTx)),
        );
        assert.deepEqual(secondAddedPending.acknowledged, true);

        const addedPendingAliases = await getPendingAliases(testDb);

        // Verify the database has both aliases
        assert.deepEqual(addedPendingAliases, [
            firstPendingAliasTx,
            secondPendingAliasTx,
        ]);
    });
    it('deletePendingAliases successfully deletes a pending alias, and getPendingAliases returns an empty array if no pending aliases in db', async function () {
        const thisTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const newPendingAliasTx = {
            address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            alias: 'pending',
            txid: thisTxid,
            tipHeight: config.initialServerState.processedBlockheight,
        };
        // Add to db
        // Add a clone of newPendingAliasTx because this process will add an _id key to the object
        await addOneAliasToPending(
            testDb,
            JSON.parse(JSON.stringify(newPendingAliasTx)),
        );
        // Verify the database has the expected alias
        assert.deepEqual(await getPendingAliases(testDb), [newPendingAliasTx]);

        // Now delete it
        const deleteResult = await deletePendingAliases(testDb, {
            txid: thisTxid,
        });

        // Verify the db says one alias is deleted
        assert.deepEqual(deleteResult, { acknowledged: true, deletedCount: 1 });

        // Verify the alias has been deleted
        assert.deepEqual(await getPendingAliases(testDb), []);
    });
    it('deletePendingAliases successfully deletes multiple entries with the same txid', async function () {
        // Add some pending aliases to the pendingAliases collection
        let pendingAliases = [];
        let sameTxid;
        for (let i in generated.validAliasRegistrations) {
            // Clone to avoid altering mock object
            const pendingTxObject = JSON.parse(
                JSON.stringify(generated.validAliasRegistrations[i]),
            );
            // Get txid
            if (i === 0) {
                sameTxid = pendingTxObject.txid;
            } else {
                // Give all these registrations the same txid
                pendingTxObject.txid = sameTxid;
            }

            pendingAliases.push(pendingTxObject);

            // Add a clone so you can still check against pendingAliases
            await addOneAliasToPending(
                testDb,
                JSON.parse(JSON.stringify(pendingTxObject)),
            );
        }

        // Verify you have these aliases in the pending collection
        const pendingAliasesAddedToDb = await getPendingAliases(testDb);
        assert.deepEqual(pendingAliasesAddedToDb.length, pendingAliases.length);

        const expectedDeletedCount = pendingAliases.length;

        // Delete them all
        const deleteResult = await deletePendingAliases(testDb, {
            txid: sameTxid,
        });

        // Verify the db says all aliases were deleted
        assert.deepEqual(deleteResult, {
            acknowledged: true,
            deletedCount: expectedDeletedCount,
        });

        // Verify the database is now empty
        assert.deepEqual(await getPendingAliases(testDb), []);
    });
    it('deletePendingAliases successfully deletes multiple entries based on tipHeight', async function () {
        // Set tipHeight
        const tipHeightPendingAdded = 800000;

        // Add some pending aliases to the pendingAliases collection
        let pendingAliases = [];
        for (let pendingAlias of generated.validAliasRegistrations) {
            // Clone to avoid altering mock object
            const clonedPendingAlias = JSON.parse(JSON.stringify(pendingAlias));

            clonedPendingAlias.tipHeight = tipHeightPendingAdded;

            pendingAliases.push(clonedPendingAlias);

            // Clone again so you can still check against clonedPendingAlias
            await addOneAliasToPending(
                testDb,
                JSON.parse(JSON.stringify(clonedPendingAlias)),
            );
        }

        // Verify you have these aliases in the pending collection
        const pendingAliasesAddedToDb = await getPendingAliases(testDb);
        assert.deepEqual(pendingAliasesAddedToDb.length, pendingAliases.length);

        const expectedDeletedCount = pendingAliases.length;

        // Delete all pending aliases by tipHeight
        const deleteResult = await deletePendingAliases(testDb, {
            tipHeight: { $lt: tipHeightPendingAdded + 1 },
        });

        // Verify the db says all aliases were deleted
        assert.deepEqual(deleteResult, {
            acknowledged: true,
            deletedCount: expectedDeletedCount,
        });

        // Verify the database is now empty
        assert.deepEqual(await getPendingAliases(testDb), []);
    });
    it('deletePendingAliases returns expected value (and does not crash or thrown an error) if asked to delete something that is not in the pendingAliases collection', async function () {
        const thisTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';

        assert.deepEqual(
            await deletePendingAliases(testDb, { txid: thisTxid }),
            {
                acknowledged: true,
                deletedCount: 0,
            },
        );
    });
    it('getPendingAliases returns only pending aliases with specified address, if called with { address } filter', async function () {
        // Add some pending aliases to the pendingAliases collection
        let pendingAliases = [];
        for (let i in generated.validAliasRegistrations) {
            // Clone to avoid altering mock object
            const pendingTxObject = JSON.parse(
                JSON.stringify(generated.validAliasRegistrations[i]),
            );

            // Delete blockheight
            delete pendingTxObject.blockheight;
            // Add tipheight
            pendingTxObject.tipHeight = null;

            pendingAliases.push(pendingTxObject);

            // Add a clone so you can still check against pendingAliases
            await addOneAliasToPending(
                testDb,
                JSON.parse(JSON.stringify(pendingTxObject)),
            );
        }

        // Sort pendingAliases alphabetically as this is how getPendingAliases returns them
        pendingAliases.sort((a, b) => a.alias.localeCompare(b.alias));

        // Verify you have these aliases in the pending collection
        const pendingAliasesAddedToDb = await getPendingAliases(testDb);
        assert.deepEqual(pendingAliasesAddedToDb.length, pendingAliases.length);

        // Call with address filter
        const testAddressOne =
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';
        // Determine how many you expect to have this address
        const pendingAliasesWithAddressOne = pendingAliases.filter(
            pendingAlias => pendingAlias.address === testAddressOne,
        );
        assert.deepEqual(
            await getPendingAliases(testDb, { address: testAddressOne }),
            pendingAliasesWithAddressOne,
        );

        const testAddressTwo =
            'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr';
        // Determine how many you expect to have this address
        const pendingAliasesWithAddressTwo = pendingAliases.filter(
            pendingAlias => pendingAlias.address === testAddressTwo,
        );
        assert.deepEqual(
            await getPendingAliases(testDb, { address: testAddressTwo }),
            pendingAliasesWithAddressTwo,
        );
    });
    it('getPendingAliases returns only pending aliases with specified address and without tipHeight, if called with { _tipHeight: 0 } projection', async function () {
        // Add some pending aliases to the pendingAliases collection
        let pendingAliases = [];
        for (let i in generated.validAliasRegistrations) {
            // Clone to avoid altering mock object
            const pendingTxObject = JSON.parse(
                JSON.stringify(generated.validAliasRegistrations[i]),
            );

            // Delete blockheight
            delete pendingTxObject.blockheight;

            pendingAliases.push(pendingTxObject);

            // Add a clone so you can still check against pendingAliases
            await addOneAliasToPending(
                testDb,
                JSON.parse(JSON.stringify(pendingTxObject)),
            );
        }

        // Sort pendingAliases alphabetically as this is how getPendingAliases returns them
        pendingAliases.sort((a, b) => a.alias.localeCompare(b.alias));

        // Verify you have these aliases in the pending collection
        const pendingAliasesAddedToDb = await getPendingAliases(testDb);
        assert.deepEqual(pendingAliasesAddedToDb.length, pendingAliases.length);

        // Call with address filter
        const testAddressOne =
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';
        // Determine how many you expect to have this address
        const pendingAliasesWithAddressOne = pendingAliases.filter(
            pendingAlias => pendingAlias.address === testAddressOne,
        );
        assert.deepEqual(
            await getPendingAliases(
                testDb,
                { address: testAddressOne },
                { _id: 0, tipHeight: 0 },
            ),
            pendingAliasesWithAddressOne,
        );

        const testAddressTwo =
            'ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr';
        // Determine how many you expect to have this address
        const pendingAliasesWithAddressTwo = pendingAliases.filter(
            pendingAlias => pendingAlias.address === testAddressTwo,
        );
        assert.deepEqual(
            await getPendingAliases(
                testDb,
                { address: testAddressTwo },
                { _id: 0, tipHeight: 0 },
            ),
            pendingAliasesWithAddressTwo,
        );
    });
});
