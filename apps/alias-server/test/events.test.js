// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const aliasConstants = require('../constants/alias');
const assert = require('assert');
const { decodeCashAddress } = require('ecashaddrjs');
const {
    handleAppStartup,
    handleBlockFinalized,
    handleAddedToMempool,
} = require('../src/events');
const {
    MockChronikClient,
} = require('../../../modules/mock-chronik-client/dist');
// Mock mongodb
const {
    initializeDb,
    updateServerState,
    getAliasesFromDb,
    addOneAliasToPending,
    getPendingAliases,
} = require('../src/db');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const NodeCache = require('node-cache');
const { generated } = require('./mocks/aliasMocks');

describe('alias-server events.js', async function () {
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

    let testDb, testCache;
    beforeEach(async () => {
        // Initialize db before each unit test
        testDb = await initializeDb(testMongoClient);

        testCache = new NodeCache();
        const tipHeight = 800000;
        testCache.set('tipHeight', tipHeight);

        /* 
        Because the actual number of pages of txHistory of the IFP address is high and always rising
        (12,011 as of 20230703)
        And it's impractical to save thousands of pages of tx history before alias txs started being registered
        Reset server state to 0,0 for this unit test
        Only 8 pages of tx history are saved at generated.txHistory, enough to cover all test cases
        To use default server state of 
        {
            processedConfirmedTxs: 45587,
            processedBlockheight: 785000,
        }
        We would need to save 1000s of pages of txHistory to allow getUnprocessedTxHistory to get the correct
        number of pages to fetch

        So, we either save 100 meg of mocks, or we run the unit tests at server state of 0

         */
        await updateServerState(testDb, {
            processedBlockheight: 0,
            processedConfirmedTxs: 0,
        });
    });
    afterEach(async () => {
        // Wipe the database after each unit test
        await testDb.dropDatabase();
        // Close test cache
        testCache.flushAll();
        testCache.close();
    });
    it('handleAppStartup calls handleBlockFinalized with tipHeight and completes function if block is avalanche finalized, and also removes pendingAliases that are in the avalanche confirmed block', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const mockBlockchaininfoResponse = {
            tipHash:
                '00000000000000000c36528b468fac70aa50c15cea9b7017ff7df53f7d0786c8',
            tipHeight: 792598,
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setBlockchainInfo(mockBlockchaininfoResponse);

        // Add tx history to mockedChronik
        // Set the script
        const { type, hash } = decodeCashAddress(
            aliasConstants.registrationAddress,
        );
        // Set the mock tx history
        mockedChronik.setTxHistoryByScript(type, hash, generated.txHistory);

        // Mock chronik block call for a finalized chaintip
        mockedChronik.setBlock(
            mockBlockchaininfoResponse.tipHash,

            { blockInfo: { isFinal: true } },
        );

        const db = testDb;
        const telegramBot = null;
        const channelId = null;

        // Add some pending aliases to the pendingAliases collection
        let pendingAliases = [];
        for (let i in generated.validAliasRegistrations) {
            // Clone to avoid altering mock object
            const pendingTxObject = JSON.parse(
                JSON.stringify(generated.validAliasRegistrations[i]),
            );

            // Provide a tipHeight
            pendingTxObject.tipHeight =
                config.initialServerState.processedBlockheight;

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

        const result = await handleAppStartup(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
        );

        // Verify that pendingAliases have been cleared
        // Verify you have these aliases in the pending collection
        assert.deepEqual(await getPendingAliases(testDb), []);

        assert.deepEqual(
            result,
            `Alias registrations updated to block ${mockBlockchaininfoResponse.tipHash} at height ${mockBlockchaininfoResponse.tipHeight}`,
        );

        // Verify that all expected valid aliases have been added to the database
        assert.deepEqual(
            await getAliasesFromDb(testDb),
            generated.validAliasRegistrations,
        );
    });
    it('handleAppStartup returns false on chronik error', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Tell mockedChronik what response we expect
        mockedChronik.setBlockchainInfo(new Error('some chronik error'));

        const db = null;
        const telegramBot = null;
        const channelId = null;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
        );

        assert.deepEqual(result, false);
        // Verify that no aliases have been added to the database
        assert.deepEqual(await getAliasesFromDb(testDb), []);
    });
    it('handleAppStartup returns false if the chaintip is not avalanche finalized', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Response of bad format
        const mockBlockchaininfoResponse = {
            tipHash:
                '00000000000000000ce690f27bc92c46863337cc9bd5b7c20aec094854db26e3',
            tipHeight: 786878,
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setBlockchainInfo(mockBlockchaininfoResponse);

        // Mock chronik block call for unfinalized chaintip
        mockedChronik.setBlock(mockBlockchaininfoResponse.tipHash, {
            blockInfo: { isFinal: false },
        });

        const db = null;
        const telegramBot = null;
        const channelId = null;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
        );

        assert.deepEqual(result, false);
        // Verify that no aliases have been added to the database
        assert.deepEqual(await getAliasesFromDb(testDb), []);
    });
    it('handleBlockFinalized returns false if the function fails to obtain serverState', async function () {
        // tipHash called with
        const tipHash =
            '00000000000000000b0519ddbffcf6dbab212b95207e398ae3ed2ba312fa561d';
        const tipHeight = 783136;

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Add tx history to mockedChronik
        // Set the script
        const { type, hash } = decodeCashAddress(
            aliasConstants.registrationAddress,
        );
        // Set the mock tx history
        mockedChronik.setTxHistoryByScript(type, hash, generated.txHistory);

        const telegramBot = null;
        const channelId = null;

        // Rename the serverState collection
        await testDb
            .collection(config.database.collections.serverState)
            .rename('notTheSameName');

        const result = await handleBlockFinalized(
            mockedChronik,
            testDb,
            testCache,
            telegramBot,
            channelId,
            tipHash,
            tipHeight,
        );

        assert.deepEqual(result, false);
        // Verify that no aliases have been added to the database
        assert.deepEqual(await getAliasesFromDb(testDb), []);
    });
    it('handleBlockFinalized returns false if called with a block of height lower than serverState', async function () {
        // tipHash called with
        const tipHash =
            '00000000000000000b0519ddbffcf6dbab212b95207e398ae3ed2ba312fa561d';
        const tipHeight = 783136;

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Add tx history to mockedChronik
        // Set the script
        const { type, hash } = decodeCashAddress(
            aliasConstants.registrationAddress,
        );
        // Set the mock tx history
        mockedChronik.setTxHistoryByScript(type, hash, generated.txHistory);

        const telegramBot = null;
        const channelId = null;

        // Give the app a serverState in the future of the calling block
        const mockServerState = {
            processedBlockheight: 783137,
            processedConfirmedTxs: 100,
        };
        await updateServerState(testDb, mockServerState);

        const result = await handleBlockFinalized(
            mockedChronik,
            testDb,
            testCache,
            telegramBot,
            channelId,
            tipHash,
            tipHeight,
        );

        assert.deepEqual(result, false);
        // Verify that no aliases have been added to the database
        assert.deepEqual(await getAliasesFromDb(testDb), []);
    });
    it('handleBlockFinalized returns false if called with a block of height equal to serverState', async function () {
        // tipHash called with
        const tipHash =
            '00000000000000000b0519ddbffcf6dbab212b95207e398ae3ed2ba312fa561d';
        const tipHeight = 783136;

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Add tx history to mockedChronik
        // Set the script
        const { type, hash } = decodeCashAddress(
            aliasConstants.registrationAddress,
        );
        // Set the mock tx history
        mockedChronik.setTxHistoryByScript(type, hash, generated.txHistory);

        const telegramBot = null;
        const channelId = null;

        // Give the app a serverState in the future of the calling block
        const mockServerState = {
            processedBlockheight: 783136,
            processedConfirmedTxs: 100,
        };
        await updateServerState(testDb, mockServerState);

        const result = await handleBlockFinalized(
            mockedChronik,
            testDb,
            testCache,
            telegramBot,
            channelId,
            tipHash,
            tipHeight,
        );

        assert.deepEqual(result, false);
        // Verify that no aliases have been added to the database
        assert.deepEqual(await getAliasesFromDb(testDb), []);
    });
    it('handleAddedToMempool throws error on chronik error', async function () {
        const incomingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Mock an error from the chronik.tx call
        mockedChronik.setTx(incomingTxid, new Error('Some chronik error'));

        await assert.rejects(
            async () => {
                await handleAddedToMempool(
                    mockedChronik,
                    testDb,
                    testCache,
                    incomingTxid,
                );
            },
            {
                name: 'Error',
                message: 'Some chronik error',
            },
        );

        // Verify that no pending aliases have been added to the pending alias collection
        assert.deepEqual(await getPendingAliases(testDb), []);
    });
    it('handleAddedToMempool calls parseTxForPendingAliases if no chronik error', async function () {
        // Invalid alias tx
        const incomingTxid =
            'aabfacbd3f10a79a9a246eb91d1b4016df254ae6763e8edd4193d50caca479ea';
        const txObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === incomingTxid)
            ];

        // Make it unconfirmed
        const pendingTxObject = JSON.parse(JSON.stringify(txObject));
        delete pendingTxObject.block;

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Mock chronik response
        mockedChronik.setTx(incomingTxid, pendingTxObject);

        assert.strictEqual(
            await handleAddedToMempool(
                mockedChronik,
                testDb,
                testCache,
                incomingTxid,
            ),
            false,
        );
        // Verify that no pending aliases have been added to the pending alias collection
        assert.deepEqual(await getPendingAliases(testDb), []);
    });
});
