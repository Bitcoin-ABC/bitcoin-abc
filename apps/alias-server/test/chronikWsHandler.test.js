// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const aliasConstants = require('../constants/alias');
const cashaddr = require('ecashaddrjs');
const {
    initializeWebsocket,
    parseWebsocketMessage,
} = require('../src/chronikWsHandler');
const { MockChronikClient } = require('../../mock-chronik-client');
const { mockBlock } = require('./mocks/chronikResponses');
const mockSecrets = require('../secrets.sample');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');
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

describe('alias-server chronikWsHandler.js', async function () {
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
    it('initializeWebsocket returns expected websocket object for a p2pkh address', async function () {
        const wsTestAddress =
            'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient(wsTestAddress, []);
        const db = null;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called
        assert.deepEqual(mockedChronik.wsSubscribeCalled, true);
        // Confirm ws is subscribed to expected type and hash
        assert.deepEqual(result.subs, [
            { scriptType: type, scriptPayload: hash },
        ]);
    });
    it('initializeWebsocket returns expected websocket object for a p2sh address', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const db = null;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called
        assert.deepEqual(mockedChronik.wsSubscribeCalled, true);
        // Confirm ws is subscribed to expected type and hash
        assert.deepEqual(result.subs, [
            { scriptType: type, scriptPayload: hash },
        ]);
    });
    it('parseWebsocketMessage correctly processes a chronik websocket BlockConnected message if block is avalanche finalized', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const db = testDb;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;
        const wsMsg = {
            type: 'BlockConnected',
            blockHash:
                '00000000000000000c36528b468fac70aa50c15cea9b7017ff7df53f7d0786c8',
        };
        const mockBlock = {
            blockInfo: {
                height: 792598,
            },
        };
        // Tell mockedChronik what response we expect
        mockedChronik.setMock('block', {
            input: wsMsg.blockHash,
            output: mockBlock,
        });

        // Add tx history to mockedChronik
        // Set the script
        const { type, hash } = cashaddr.decode(
            aliasConstants.registrationAddress,
            true,
        );
        mockedChronik.setScript(type, hash);
        // Set the mock tx history
        mockedChronik.setTxHistory(type, hash, generated.txHistory);

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: true,
            error: null,
            id: 'isfinalblock',
        });
        const result = await parseWebsocketMessage(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
            wsMsg,
        );

        assert.strictEqual(
            result,
            `Alias registrations updated to block ${wsMsg.blockHash} at height ${mockBlock.blockInfo.height}`,
        );
        // Verify that all expected valid aliases have been added to the database
        assert.deepEqual(
            await getAliasesFromDb(testDb),
            generated.validAliasRegistrations,
        );
    });
    it('parseWebsocketMessage calls handleBlockConnected, which exits if block is not avalanche finalized', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const db = null;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;
        const wsMsg = {
            type: 'BlockConnected',
            blockHash:
                '000000000000000015713b0407590ab1481fd7b8430f87e19cf768bec285ad55',
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('block', {
            input: wsMsg.blockHash,
            output: mockBlock,
        });

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: false,
            error: null,
            id: 'isfinalblock',
        });
        const result = await parseWebsocketMessage(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
            wsMsg,
        );

        assert.deepEqual(result, false);
        // Verify that no aliases have been added to the database
        assert.deepEqual(await getAliasesFromDb(testDb), []);
    });
    it('If parseWebsocketMessage is called before a previous call to handleBlockConnected has completed, the next call to handleBlockConnected will not enter until the first is completed', async function () {
        // Initialize mocks for the first call to parseWebsocketMessage
        const mockedChronik = new MockChronikClient();
        const db = testDb;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;
        const wsMsg = {
            type: 'BlockConnected',
            blockHash:
                '00000000000000000c36528b468fac70aa50c15cea9b7017ff7df53f7d0786c8',
        };
        const mockBlock = {
            blockInfo: {
                height: 792598,
            },
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('block', {
            input: wsMsg.blockHash,
            output: mockBlock,
        });

        // Add tx history to mockedChronik
        // Set the script
        const { type, hash } = cashaddr.decode(
            aliasConstants.registrationAddress,
            true,
        );
        mockedChronik.setScript(type, hash);
        // Set the mock tx history
        mockedChronik.setTxHistory(type, hash, generated.txHistory);

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: true,
            error: null,
            id: 'isfinalblock',
        });

        // Initialize mocks for second call to parseWebsocketMessage
        const nextMockedChronik = new MockChronikClient();
        const nextWsMsg = {
            type: 'BlockConnected',
            blockHash:
                '000000000000000007b5922b3e385d6d3408b61ef25af41bcc9e665462fcaf49',
        };
        const nextMockBlock = {
            blockInfo: {
                height: 792599,
            },
        };

        // Tell mockedChronik what response we expect
        nextMockedChronik.setMock('block', {
            input: nextWsMsg.blockHash,
            output: nextMockBlock,
        });

        // Add tx history to nextMockedChronik
        // Set the script
        nextMockedChronik.setScript(type, hash);
        // Set the mock tx history
        // For now, assume it's the same as before, i.e. no new txs found
        nextMockedChronik.setTxHistory(type, hash, generated.txHistory);

        const firstCallPromise = parseWebsocketMessage(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
            wsMsg,
        );
        const secondCallPromise = parseWebsocketMessage(
            nextMockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
            nextWsMsg,
        );

        // Call the functions concurrently
        const results = await Promise.all([
            firstCallPromise,
            secondCallPromise,
        ]);

        assert.deepEqual(results, [
            `Alias registrations updated to block ${wsMsg.blockHash} at height ${mockBlock.blockInfo.height}`,
            `Alias registrations updated to block ${nextWsMsg.blockHash} at height ${nextMockBlock.blockInfo.height}`,
        ]);
        // Verify that all expected valid aliases have been added to the database
        assert.deepEqual(
            await getAliasesFromDb(testDb),
            generated.validAliasRegistrations,
        );
    });
    it('parseWebsocketMessage returns true for a chronik websocket AddedToMempool message of a pending alias tx', async function () {
        const incomingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const db = testDb;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;
        const wsMsg = {
            type: 'AddedToMempool',
            txid: incomingTxid,
        };

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
        mockedChronik.setMock('tx', {
            input: incomingTxid,
            output: pendingTxObject,
        });
        const result = await parseWebsocketMessage(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
            wsMsg,
        );

        assert.strictEqual(result, true);
    });
    it('parseWebsocketMessage returns false for a chronik websocket AddedToMempool message of a tx that is not a pending alias tx', async function () {
        // Invalid alias tx
        const incomingTxid =
            'aabfacbd3f10a79a9a246eb91d1b4016df254ae6763e8edd4193d50caca479ea';
        const db = testDb;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;
        const wsMsg = {
            type: 'AddedToMempool',
            txid: incomingTxid,
        };

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
        mockedChronik.setMock('tx', {
            input: incomingTxid,
            output: pendingTxObject,
        });
        const result = await parseWebsocketMessage(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
            wsMsg,
        );

        assert.strictEqual(result, false);
    });
    it('parseWebsocketMessage removes a txid from pendingAliases if RemovedFromMempool message includes that txid', async function () {
        const incomingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const db = testDb;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;
        const wsMsg = {
            type: 'RemovedFromMempool',
            txid: incomingTxid,
        };

        const txObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === incomingTxid)
            ];

        // Make it unconfirmed
        const pendingTxObject = JSON.parse(JSON.stringify(txObject));
        delete pendingTxObject.block;

        // Add it to pendingAliases
        // Add a clone of newPendingAliasTx because this process will add an _id key to the object
        const addedResult = await addOneAliasToPending(
            db,
            JSON.parse(JSON.stringify(pendingTxObject)),
        );

        // Confirm it's there
        assert.deepEqual(addedResult.acknowledged, true);
        assert.deepEqual(Object.keys(addedResult).includes('insertedId'), true);

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        await parseWebsocketMessage(
            mockedChronik,
            db,
            testCache,
            telegramBot,
            channelId,
            avalancheRpc,
            wsMsg,
        );

        // Confirm txid is removed from pendingAliases collection
        // Verify the alias has been deleted
        assert.deepEqual(await getPendingAliases(testDb), []);
    });
});
