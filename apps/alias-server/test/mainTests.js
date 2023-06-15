// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const cashaddr = require('ecashaddrjs');
const { main } = require('../src/main');
const config = require('../config');
const aliasConstants = require('../constants/alias');
const mockSecrets = require('../secrets.sample');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');
const { generated } = require('./mocks/aliasMocks');

// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
// Mock chronik
const { MockChronikClient } = require('./mocks/chronikMock');

describe('alias-server main.js', async function () {
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

    it('main() intializes database correctly, connects to a websocket, and runs handleAppStartup() correctly', async function () {
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

        // Define params
        const mongoClient = testMongoClient;
        const chronik = mockedChronik;
        const address = aliasConstants.registrationAddress;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;
        const returnMocks = true;
        const result = await main(
            mongoClient,
            chronik,
            address,
            telegramBot,
            channelId,
            avalancheRpc,
            returnMocks,
        );
        // Check that the database was initialized properly
        assert.strictEqual(result.db.namespace, config.database.name);
        // Check that websocket is connected
        assert.deepEqual(result.aliasWebsocket._subs, [
            { scriptPayload: hash, scriptType: type },
        ]);
        // Check that startup was called
        assert.deepEqual(
            result.appStartup,
            `Alias registrations updated to block ${mockBlockchaininfoResponse.tipHash} at height ${mockBlockchaininfoResponse.tipHeight}`,
        );
    });
});
