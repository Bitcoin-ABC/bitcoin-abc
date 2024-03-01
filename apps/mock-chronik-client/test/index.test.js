// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { MockChronikClient } = require('../index');
const {
    mockBlockInfo,
    mockTxInfo,
    mockTokenInfo,
    mockTxHistory,
    mockP2pkhUtxos,
    mockBlockchainInfo,
    mockRawTxHex,
} = require('../mocks/mockChronikResponses');
const ecashaddr = require('ecashaddrjs');
const P2PKH_ADDRESS = 'ecash:qzth8qvakhr6y8zcefdrvx30zrdmt2z2gvp7zc5vj8';

it('Mock the block() API response', async function () {
    // Initialize chronik mock with block info
    const blockHash = mockBlockInfo.blockInfo.hash;
    const mockedChronik = new MockChronikClient();
    mockedChronik.setMock('block', {
        input: blockHash,
        output: mockBlockInfo,
    });

    // Execute the API call
    const result = await mockedChronik.block(blockHash);
    assert.deepEqual(result, mockBlockInfo);
});

it('Mock the tx() API response', async function () {
    // Initialize chronik mock with tx info
    const txid = mockTxInfo.txid;
    const mockedChronik = new MockChronikClient();
    mockedChronik.setMock('tx', {
        input: txid,
        output: mockTxInfo,
    });

    // Execute the API call
    const result = await mockedChronik.tx(txid);
    assert.deepEqual(result, mockTxInfo);
});

it('Mock the token() API response', async function () {
    // Initialize chronik mock with token info
    const tokenId = mockTokenInfo.slpTxData.slpMeta.tokenId;
    const mockedChronik = new MockChronikClient();
    mockedChronik.setMock('token', {
        input: tokenId,
        output: mockTokenInfo,
    });

    // Execute the API call
    const result = await mockedChronik.token(tokenId);
    assert.deepEqual(result, mockTokenInfo);
});

it('Mock the blockchainInfo() API response', async function () {
    // Initialize chronik mock with blockchain info
    const mockedChronik = new MockChronikClient();
    mockedChronik.setMock('blockchainInfo', {
        output: mockBlockchainInfo,
    });

    // Execute the API call
    const result = await mockedChronik.blockchainInfo();
    assert.deepEqual(result, mockBlockchainInfo);
});

it('Mock the broadcastTx() API response', async function () {
    // Initialize chronik mock with tx broadcast info
    const mockedChronik = new MockChronikClient();
    const txid =
        '0075130c9ecb342b5162bb1a8a870e69c935ea0c9b2353a967cda404401acf19';
    mockedChronik.setMock('broadcastTx', {
        input: mockRawTxHex,
        output: { txid: txid },
    });

    // Execute the API call
    const result = await mockedChronik.broadcastTx(mockRawTxHex);
    assert.deepEqual(result, { txid: txid });
});

it('Mock the script().utxos() API response', async function () {
    // Initialize chronik mock with a utxo set
    const mockedChronik = new MockChronikClient();
    const { type, hash } = ecashaddr.decode(P2PKH_ADDRESS, true);
    mockedChronik.setScript(type, hash);
    mockedChronik.setUtxos(type, hash, mockP2pkhUtxos);

    // Execute the API call
    const result = await mockedChronik.script(type, hash).utxos();
    assert.deepEqual(result, mockP2pkhUtxos);
});

it('We get the same script().utxos() API response using address().utxos()', async function () {
    // Initialize chronik mock with a utxo set
    const mockedChronik = new MockChronikClient();
    mockedChronik.setAddress(P2PKH_ADDRESS);
    mockedChronik.setUtxosByAddress(P2PKH_ADDRESS, mockP2pkhUtxos);

    // Execute the API call
    const result = await mockedChronik.address(P2PKH_ADDRESS).utxos();
    assert.deepEqual(result, mockP2pkhUtxos);
});

it('Mock the script().history() API response', async function () {
    // Initialize chronik mock with history info
    const mockedChronik = new MockChronikClient();
    const { type, hash } = ecashaddr.decode(P2PKH_ADDRESS, true);
    mockedChronik.setScript(type, hash);
    mockedChronik.setTxHistory(type, hash, mockTxHistory.txs);

    // Execute the API call
    const result = await mockedChronik.script(type, hash).history(0, 2);
    assert.deepEqual(result, mockTxHistory);
});

it('We get the same script().history() API response using address().history()', async function () {
    // Initialize chronik mock with history info
    const mockedChronik = new MockChronikClient();
    mockedChronik.setAddress(P2PKH_ADDRESS);
    mockedChronik.setTxHistoryByAddress(P2PKH_ADDRESS, mockTxHistory.txs);

    // Execute the API call
    const result = await mockedChronik.address(P2PKH_ADDRESS).history(0, 2);
    assert.deepEqual(result, mockTxHistory);
});

it('Mock the ws() API response', async function () {
    // Initialize chronik mock with script info
    const mockedChronik = new MockChronikClient();
    const { type, hash } = ecashaddr.decode(P2PKH_ADDRESS, true);
    const txid =
        'f7d71433af9a4e0081ea60349becf2a60efed8890df7c3e8e079b3427f51d5ea';

    // Create websocket subscription to listen to confirmations on txid
    const ws = mockedChronik.ws({
        onMessage: msg => {
            if (msg.type === 'Confirmed' && msg.txid === txid) {
                // Confirmation received, unsubscribe and close websocket
                ws.unsubscribe(type, hash);
                ws.close();
            }
        },
    });
    // Wait for WS to be connected:
    await ws.waitForOpen();

    // Subscribe to scripts
    ws.subscribe(type, hash);

    // Tell mockedChronik what response we expect
    mockedChronik.setMock('ws', {
        output: {
            type: 'Confirmed',
            txid: txid,
        },
    });
    mockedChronik.wsClose();

    // We can subscribe to blocks (in-node chronik-client)
    ws.subscribeToBlocks();

    // Verify subscription functions were called
    assert.strictEqual(ws.isSubscribedBlocks, true);
    assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
    assert.strictEqual(mockedChronik.wsSubscribeCalled, true);
    assert.strictEqual(mockedChronik.manuallyClosed, true);

    // Verify websocket subscription is as expected
    assert.deepEqual(ws.subs, [{ scriptType: type, scriptPayload: hash }]);

    // Verify ws confirmation event on the given txid
    assert.strictEqual(mockedChronik.mockedResponses.ws.type, 'Confirmed');
    assert.strictEqual(mockedChronik.mockedResponses.ws.txid, txid);
});

it('Mock an error returned from the block() API', async function () {
    const mockedChronik = new MockChronikClient();
    const blockHash = 'some block hash';
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setMock('block', {
        input: blockHash,
        output: expectedError,
    });

    // Execute the API call
    await assert.rejects(
        async () => mockedChronik.block(blockHash),
        expectedError,
    );
});

it('Mock an error returned from the tx() API', async function () {
    const mockedChronik = new MockChronikClient();
    const txid = 'some txid';
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setMock('tx', {
        input: txid,
        output: expectedError,
    });

    // Execute the API call
    await assert.rejects(mockedChronik.tx(txid), expectedError);
});

it('Mock an error returned from the token() API', async function () {
    const mockedChronik = new MockChronikClient();
    const tokenId = 'some token id';
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setMock('token', {
        input: tokenId,
        output: expectedError,
    });

    // Execute the API call
    await assert.rejects(mockedChronik.token(tokenId), expectedError);
});

it('Mock an error returned from the blockchainInfo() API', async function () {
    const mockedChronik = new MockChronikClient();
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setMock('blockchainInfo', {
        output: expectedError,
    });

    // Execute the API call
    await assert.rejects(mockedChronik.blockchainInfo(), expectedError);
});

it('Mock an error returned from the broadcastTx() API', async function () {
    const mockedChronik = new MockChronikClient();
    const rawTxHex = 'some raw tx hex';
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setMock('broadcastTx', {
        input: rawTxHex,
        output: expectedError,
    });

    // Execute the API call
    await assert.rejects(mockedChronik.broadcastTx(rawTxHex), expectedError);
});

it('Mock an error returned from the script().utxos() API', async function () {
    const mockedChronik = new MockChronikClient();
    const { type, hash } = ecashaddr.decode(P2PKH_ADDRESS, true);
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setScript(type, hash);
    mockedChronik.setUtxos(type, hash, expectedError);

    // Execute the API call
    await assert.rejects(
        mockedChronik.script(type, hash).utxos(),
        expectedError,
    );
});

it('Mock an error returned from the address().utxos() API', async function () {
    const mockedChronik = new MockChronikClient();
    const { type, hash } = ecashaddr.decode(P2PKH_ADDRESS, true);
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setAddress(P2PKH_ADDRESS);
    mockedChronik.setUtxosByAddress(P2PKH_ADDRESS, expectedError);

    await assert.rejects(
        mockedChronik.address(P2PKH_ADDRESS).utxos(),
        expectedError,
    );
});

it('Mock an error returned from the script().history() API', async function () {
    const mockedChronik = new MockChronikClient();
    const { type, hash } = ecashaddr.decode(P2PKH_ADDRESS, true);
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setScript(type, hash);
    mockedChronik.setTxHistory(type, hash, expectedError);

    // Execute the API call
    await assert.rejects(
        mockedChronik.script(type, hash).history(0, 2),
        expectedError,
    );
});

it('Mock an error returned from the address().history() API', async function () {
    const mockedChronik = new MockChronikClient();
    const expectedError = new Error('Bad response from Chronik');
    mockedChronik.setAddress(P2PKH_ADDRESS);
    mockedChronik.setTxHistoryByAddress(P2PKH_ADDRESS, expectedError);

    // Execute the API call
    await assert.rejects(
        async () => mockedChronik.address(P2PKH_ADDRESS).history(0, 2),
        expectedError,
    );
});
