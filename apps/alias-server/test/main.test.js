// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const cashaddr = require('ecashaddrjs');
const { main } = require('../src/main');
const aliasConstants = require('../constants/alias');
const mockSecrets = require('../secrets.sample');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');
const { generated } = require('./mocks/aliasMocks');
const {
    initializeDb,
    updateServerState,
    getAliasesFromDb,
} = require('../src/db');

// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
// Mock chronik
const { MockChronikClient } = require('../../../modules/mock-chronik-client');
const NodeCache = require('node-cache');

describe('alias-server main.js', async function () {
    let mongoServer, testMongoClient, db, testCache;
    before(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        testMongoClient = new MongoClient(mongoUri);
        db = await initializeDb(testMongoClient);
        testCache = new NodeCache();
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
        await updateServerState(db, {
            processedBlockheight: 0,
            processedConfirmedTxs: 0,
        });
    });

    after(async () => {
        await testMongoClient.close();
        await mongoServer.stop();
        testCache.flushAll();
        testCache.close();
    });

    it('main() connects to a websocket, and runs handleAppStartup() correctly', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const mockBlockchaininfoResponse = {
            tipHash:
                '00000000000000000c36528b468fac70aa50c15cea9b7017ff7df53f7d0786c8',
            tipHeight: 792598,
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

        // Define params
        const chronik = mockedChronik;
        const address = aliasConstants.registrationAddress;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;
        const returnMocks = true;
        const result = await main(
            db,
            testCache,
            chronik,
            address,
            telegramBot,
            channelId,
            avalancheRpc,
            returnMocks,
        );
        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Check that startup was called
        assert.deepEqual(
            result.appStartup,
            `Alias registrations updated to block ${mockBlockchaininfoResponse.tipHash} at height ${mockBlockchaininfoResponse.tipHeight}`,
        );
        // Verify that all expected valid aliases have been added to the database
        assert.deepEqual(
            await getAliasesFromDb(db),
            generated.validAliasRegistrations,
        );
    });
});
