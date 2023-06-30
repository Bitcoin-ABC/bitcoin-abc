// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { getUtxosFromAddress } = require('../scripts/getUtxosFromAddress');
const { mockUtxos } = require('../mocks/chronikResponses');
const ecashaddr = require('ecashaddrjs');

// Mock chronik
const { MockChronikClient } = require('../mocks/chronikMock');

describe('App dev example code: getUtxosFromAddress.js', async function () {
    it('getUtxosFromAddress() correctly returns a utxo JSON response for a valid eCash address', async function () {
        const address = 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';

        // Initialize chronik mock with a mocked utxo set
        const mockedChronik = new MockChronikClient(address, mockUtxos);

        // Set the script
        const { type, hash } = ecashaddr.decode(address, true);
        mockedChronik.setScript(type, hash);

        // Set the mock utxos
        mockedChronik.setUtxos(type, hash, mockUtxos.utxos);

        const result = await getUtxosFromAddress(mockedChronik, address);

        // Check that the utxo sets match
        assert.deepEqual(result, mockUtxos.utxos);
    });
    it('getUtxosFromAddress() correctly returns a utxo JSON response for a valid prefix-less eCash address', async function () {
        const address = 'qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';

        // Initialize chronik mock with a mocked utxo set
        const mockedChronik = new MockChronikClient(address, mockUtxos);

        // Set the script
        const { type, hash } = ecashaddr.decode(address, true);
        mockedChronik.setScript(type, hash);

        // Set the mock utxos
        mockedChronik.setUtxos(type, hash, mockUtxos.utxos);

        const result = await getUtxosFromAddress(mockedChronik, address);

        // Check that the utxo sets match
        assert.deepEqual(result, mockUtxos.utxos);
    });
    it('getUtxosFromAddress() throws error for an invalid address', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const invalidAddress = 'ecash:qq9h6d0aINVALIDDDDDDDDdku8f0gxfgx';

        await assert.rejects(
            async () => {
                await getUtxosFromAddress(mockedChronik, invalidAddress);
            },
            {
                name: 'ValidationError',
                message: `Invalid address: ${invalidAddress}.`,
            },
        );
    });
    it('getUtxosFromAddress() correctly returns an empty array for an address with no UTXOs', async function () {
        const address = 'ecash:qqpastjks9yhysmdr837zmf4ptu4ccus85ldqrq8yq';

        // Initialize chronik mock with a mocked utxo set
        const mockedChronik = new MockChronikClient(address, mockUtxos);

        // Set the script
        const { type, hash } = ecashaddr.decode(address, true);
        mockedChronik.setScript(type, hash);

        // Set the mock utxos
        mockedChronik.setUtxos(type, hash, []);

        const result = await getUtxosFromAddress(mockedChronik, address);

        // Check that the utxo sets match
        assert.deepEqual(result, []);
    });
});
