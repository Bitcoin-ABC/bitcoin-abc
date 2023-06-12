// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const cashaddr = require('ecashaddrjs');
const aliasConstants = require('../constants/alias');
const {
    parseAliasTx,
    getAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    registerAliases,
} = require('../src/alias');
const { removeUnconfirmedTxsFromTxHistory } = require('../src/utils');
const {
    testAddressAliases,
    testAddressAliasesWithUnconfirmedTxs,
    aliases_fake_data,
} = require('./mocks/aliasMocks');
// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { initializeDb, addAliasesToDb } = require('../src/db');

describe('alias-server alias.js', async function () {
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
    it('Correctly parses a 5-character alias transaction', function () {
        const registrationOutputScript = cashaddr.getOutputScriptFromAddress(
            aliasConstants.registrationAddress,
        );
        assert.deepEqual(
            parseAliasTx(
                testAddressAliases.txHistory[
                    testAddressAliases.txHistory.findIndex(
                        i =>
                            i.txid ===
                            '9d9fd465f56a7946c48b2e214386b51d7968a3a40d46cc697036e4fc1cc644df',
                    )
                ],
                aliasConstants,
                registrationOutputScript,
            ),
            testAddressAliases.allAliasTxs[
                testAddressAliases.allAliasTxs.findIndex(
                    i =>
                        i.txid ===
                        '9d9fd465f56a7946c48b2e214386b51d7968a3a40d46cc697036e4fc1cc644df',
                )
            ],
        );
    });
    it('Correctly parses a 6-character alias transaction', function () {
        const registrationOutputScript = cashaddr.getOutputScriptFromAddress(
            aliasConstants.registrationAddress,
        );
        assert.deepEqual(
            parseAliasTx(
                testAddressAliases.txHistory[
                    testAddressAliases.txHistory.findIndex(
                        i =>
                            i.txid ===
                            '36fdab59d25625b6ff3661aa5ab22a4893698fa5618e5e958e1d75bf921e6107',
                    )
                ],
                aliasConstants,
                registrationOutputScript,
            ),
            testAddressAliases.allAliasTxs[
                testAddressAliases.allAliasTxs.findIndex(
                    i =>
                        i.txid ===
                        '36fdab59d25625b6ff3661aa5ab22a4893698fa5618e5e958e1d75bf921e6107',
                )
            ],
        );
    });
    it('Returns false for an eToken transaction', function () {
        const registrationOutputScript = cashaddr.getOutputScriptFromAddress(
            aliasConstants.registrationAddress,
        );
        assert.deepEqual(
            parseAliasTx(
                testAddressAliases.txHistory[
                    testAddressAliases.txHistory.findIndex(
                        i =>
                            i.txid ===
                            'feafd053d4166601d42949a768b9c3e8ee1f27912fc84b6190aeb022fba7fa39',
                    )
                ],
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('Returns false for a standard tx without an OP_RETURN', function () {
        const registrationOutputScript = cashaddr.getOutputScriptFromAddress(
            aliasConstants.registrationAddress,
        );
        assert.deepEqual(
            parseAliasTx(
                testAddressAliases.txHistory[
                    testAddressAliases.txHistory.findIndex(
                        i =>
                            i.txid ===
                            '7440fb8810610f29197701c53f4a29479a9aede8c66feabb44b049232f990791',
                    )
                ],
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('Correctly parses all aliases through transactions at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8', function () {
        assert.deepEqual(
            getAliasTxs(testAddressAliases.txHistory, aliasConstants),
            testAddressAliases.allAliasTxs,
        );
    });
    it('Correctly parses all aliases through transactions at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8 including unconfirmed txs', function () {
        assert.deepEqual(
            getAliasTxs(
                testAddressAliasesWithUnconfirmedTxs.txHistory,
                aliasConstants,
            ),
            testAddressAliasesWithUnconfirmedTxs.allAliasTxs,
        );
    });
    it('Correctly sorts simple template alias txs including unconfirmed alias txs by blockheight and txid', function () {
        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(aliases_fake_data.unsortedSimple),
            aliases_fake_data.sortedSimple,
        );
    });
    it('Correctly sorts template alias txs including unconfirmed alias txs by blockheight and txid', function () {
        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(aliases_fake_data.allAliasTxs),
            aliases_fake_data.allAliasTxsSortedByTxidAndBlockheight,
        );
    });
    it('Correctly sorts alias txs including unconfirmed alias txs by blockheight and txid', function () {
        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(
                testAddressAliasesWithUnconfirmedTxs.allAliasTxs,
            ),
            testAddressAliasesWithUnconfirmedTxs.allAliasTxsSortedByTxidAndBlockheight,
        );
    });
    it('Correctly returns only valid alias registrations at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8 starting with an empty database', async function () {
        // Initialize db before each unit test
        let testDb = await initializeDb(testMongoClient);

        // Clone unprocessedAliasTxs since the act of adding to db gives it an _id field
        const mockAllAliasTxs = JSON.parse(
            JSON.stringify(testAddressAliases.allAliasTxs),
        );

        assert.deepEqual(
            await registerAliases(testDb, mockAllAliasTxs),
            testAddressAliases.validAliasTxs,
        );

        // Wipe the database after this unit test
        await testDb.dropDatabase();
    });
    it('Correctly returns only new valid alias registrations at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8 given partial txHistory and list of registered aliases', async function () {
        // Take only txs after registration of alias 'bytesofman'
        // Note: allAliasTxs are sorted with most recent txs first
        const unprocessedAliasTxs = testAddressAliases.allAliasTxs.slice(
            0,
            testAddressAliases.allAliasTxs.findIndex(
                i => i.alias === 'bytesofman',
            ),
        );

        // Clone unprocessedAliasTxs since the act of adding to db gives it an _id field
        const mockUnprocessedAliasTxs = JSON.parse(
            JSON.stringify(unprocessedAliasTxs),
        );

        // Get list of all valid alias registrations before 'bytesofman'
        // Note: validAliasTxs are sorted with most recent txs last
        // Note: you want to include bytesofman here
        const registeredAliases = testAddressAliases.validAliasTxs.slice(
            0,
            testAddressAliases.validAliasTxs.findIndex(
                i => i.alias === 'bytesofman',
            ) + 1,
        );

        // newlyValidAliases will be all the valid alias txs registered after 'bytesofman'
        // Note: you do not want bytesofman in this set
        const newlyValidAliases = testAddressAliases.validAliasTxs.slice(
            testAddressAliases.validAliasTxs.findIndex(
                i => i.alias === 'bytesofman',
            ) + 1,
        );
        // Initialize db before each unit test
        let testDb = await initializeDb(testMongoClient);

        // mockRegisteredAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const mockRegisteredAliases = JSON.parse(
            JSON.stringify(registeredAliases),
        );
        // Add expected registered aliases to the db
        await addAliasesToDb(testDb, mockRegisteredAliases);

        assert.deepEqual(
            await registerAliases(testDb, mockUnprocessedAliasTxs),
            newlyValidAliases,
        );
        // Wipe the database after this unit test
        await testDb.dropDatabase();
    });
    it('Correctly returns valid alias registrations at test address ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8 given some unconfirmed txs in history', async function () {
        // Initialize db before each unit test
        let testDb = await initializeDb(testMongoClient);

        // Start with the raw tx history

        // First, remove the unconfirmed txs, following the logic used in events.js
        const confirmedUnsortedTxs = removeUnconfirmedTxsFromTxHistory(
            testAddressAliasesWithUnconfirmedTxs.txHistory,
        );
        // Get the alias txs
        const confirmedUnsortedAliasTxs = getAliasTxs(
            confirmedUnsortedTxs,
            aliasConstants,
        );

        // This tests startup condition, so add no aliases to the database
        assert.deepEqual(
            await registerAliases(testDb, confirmedUnsortedAliasTxs),
            testAddressAliasesWithUnconfirmedTxs.validAliasTxs,
        );
        // Wipe the database after this unit test
        await testDb.dropDatabase();
    });
});
