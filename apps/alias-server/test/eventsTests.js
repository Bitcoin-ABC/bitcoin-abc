// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const aliasConstants = require('../constants/alias');
const assert = require('assert');
const cashaddr = require('ecashaddrjs');
const mockSecrets = require('../secrets.sample');
const { handleAppStartup, handleBlockConnected } = require('../src/events');
const { MockChronikClient } = require('./mocks/chronikMock');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');
// Mock mongodb
const { initializeDb, updateServerState } = require('../src/db');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
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

    let testDb;
    beforeEach(async () => {
        // Initialize db before each unit test
        testDb = await initializeDb(testMongoClient);
    });
    afterEach(async () => {
        // Wipe the database after each unit test
        await testDb.dropDatabase();
    });
    it('handleAppStartup calls handleBlockConnected with tipHeight and completes function if block is avalanche finalized', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const mockBlockchaininfoResponse = {
            tipHash:
                '00000000000000000ce690f27bc92c46863337cc9bd5b7c20aec094854db26e3',
            tipHeight: 786878,
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('blockchainInfo', {
            input: null,
            output: mockBlockchaininfoResponse,
        });

        // Add tx history to mockedChronik
        // Set the script
        const { type, hash } = cashaddr.decode(
            aliasConstants.registrationAddress,
            true,
        );
        mockedChronik.setScript(type, hash);
        // Set the mock tx history
        mockedChronik.setTxHistory(generated.txHistory);

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: true,
            error: null,
            id: 'isfinalblock',
        });

        const db = testDb;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        assert.deepEqual(
            result,
            `Alias registrations updated to block ${mockBlockchaininfoResponse.tipHash} at height ${mockBlockchaininfoResponse.tipHeight}`,
        );
    });
    it('handleAppStartup calls handleBlockConnected with tipHeight and returns false if block is not avalanche finalized', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const mockBlockchaininfoResponse = {
            tipHash:
                '00000000000000000ce690f27bc92c46863337cc9bd5b7c20aec094854db26e3',
            tipHeight: 786878,
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('blockchainInfo', {
            input: null,
            output: mockBlockchaininfoResponse,
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

        const db = null;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        assert.deepEqual(result, false);
    });
    it('handleAppStartup returns false on chronik error', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Response of bad format
        const mockBlockchaininfoResponse = {
            tipHashNotHere:
                '00000000000000000ce690f27bc92c46863337cc9bd5b7c20aec094854db26e3',
            tipHeightNotHere: 786878,
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('blockchainInfo', {
            input: null,
            output: mockBlockchaininfoResponse,
        });

        // Function will not get to RPC call, no need for axios mock

        const db = null;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        assert.deepEqual(result, false);
    });
    it('handleBlockConnected returns false if the function fails to obtain serverState', async function () {
        // tipHash called with
        const tipHash =
            '00000000000000000b0519ddbffcf6dbab212b95207e398ae3ed2ba312fa561d';

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const mockBlock = {
            blockInfo: {
                height: 783136,
            },
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('block', {
            input: tipHash,
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
        mockedChronik.setTxHistory(generated.txHistory);

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: true,
            error: null,
            id: 'isfinalblock',
        });

        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        // Rename the serverState collection
        await testDb
            .collection(config.database.collections.serverState)
            .rename('notTheSameName');

        const result = await handleBlockConnected(
            mockedChronik,
            testDb,
            telegramBot,
            channelId,
            avalancheRpc,
            tipHash,
        );

        assert.deepEqual(result, false);
    });
    it('handleBlockConnected returns false if called with a block of height lower than serverState', async function () {
        // tipHash called with
        const tipHash =
            '00000000000000000b0519ddbffcf6dbab212b95207e398ae3ed2ba312fa561d';

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const mockBlock = {
            blockInfo: {
                height: 783136,
            },
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('block', {
            input: tipHash,
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
        mockedChronik.setTxHistory(generated.txHistory);

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: true,
            error: null,
            id: 'isfinalblock',
        });

        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        // Give the app a serverState in the future of the calling block
        const mockServerState = {
            processedBlockheight: 783137,
            processedConfirmedTxs: 100,
        };
        await updateServerState(testDb, mockServerState);

        const result = await handleBlockConnected(
            mockedChronik,
            testDb,
            telegramBot,
            channelId,
            avalancheRpc,
            tipHash,
        );

        assert.deepEqual(result, false);
    });
    it('handleBlockConnected returns false if called with a block of height equal to serverState', async function () {
        // tipHash called with
        const tipHash =
            '00000000000000000b0519ddbffcf6dbab212b95207e398ae3ed2ba312fa561d';

        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const mockBlock = {
            blockInfo: {
                height: 783136,
            },
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('block', {
            input: tipHash,
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
        mockedChronik.setTxHistory(generated.txHistory);

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: true,
            error: null,
            id: 'isfinalblock',
        });

        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        // Give the app a serverState in the future of the calling block
        const mockServerState = {
            processedBlockheight: 783136,
            processedConfirmedTxs: 100,
        };
        await updateServerState(testDb, mockServerState);

        const result = await handleBlockConnected(
            mockedChronik,
            testDb,
            telegramBot,
            channelId,
            avalancheRpc,
            tipHash,
        );

        assert.deepEqual(result, false);
    });
});
