// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const mockSecrets = require('../secrets.sample');
const { avalancheRpc } = mockSecrets;
const { isFinalBlock } = require('../src/rpc');

describe('alias-server rpc.js', async function () {
    it('Returns true for a valid blockhash that has been finalized by avalanche', async function () {
        // This sets the mock adapter on the default instance
        const blockhash =
            '00000000000000000753144f1e8d9f02bd7539543d73dc9fd45355de5b99f504';

        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: true,
            error: null,
            id: 'isfinalblock',
        });
        assert.strictEqual(await isFinalBlock(avalancheRpc, blockhash), true);
    });
    it('Returns false for a valid blockhash that is not yet finalized by avalanche', async function () {
        // This sets the mock adapter on the default instance
        const blockhash =
            '00000000000000000d92510871d9677ea0cb8341f06e8fae9a5e0c365ce81fa6';

        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: false,
            error: null,
            id: 'isfinalblock',
        });
        assert.strictEqual(await isFinalBlock(avalancheRpc, blockhash), false);
    });
    it('Returns false on error from bad blockhash input', async function () {
        // This sets the mock adapter on the default instance
        const blockhash = 'not_a_blockhash';

        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(500, {
            result: null,
            error: {
                code: -8,
                message: `blockhash must be of length 64 (not ${blockhash.length}, for '${blockhash}')`,
            },
            id: 'isfinalblock',
        });
        assert.strictEqual(await isFinalBlock(avalancheRpc, blockhash), false);
    });
    it('Returns false on a request timeout', async function () {
        // This sets the mock adapter on the default instance
        const blockhash =
            '00000000000000000753144f1e8d9f02bd7539543d73dc9fd45355de5b99f504';

        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        // Mock response timeout
        mock.onPost().timeoutOnce();
        assert.strictEqual(await isFinalBlock(avalancheRpc, blockhash), false);
    });
});
