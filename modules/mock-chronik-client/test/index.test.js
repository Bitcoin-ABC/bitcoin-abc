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
const cashaddr = require('ecashaddrjs');
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
    const { type, hash } = cashaddr.decode(P2PKH_ADDRESS, true);
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

it('We can get a tokenId().utxos() API response using tokenId().utxos()', async function () {
    // Initialize chronik mock with a utxo set
    const mockedChronik = new MockChronikClient();

    const tokenId =
        '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e';
    mockedChronik.setTokenId(tokenId);
    mockedChronik.setUtxosByTokenId(tokenId, mockP2pkhUtxos);

    // Execute the API call
    const result = await mockedChronik.tokenId(tokenId).utxos();
    assert.deepEqual(result, mockP2pkhUtxos);
});

it('Mock the script().history() API response', async function () {
    // Initialize chronik mock with history info
    const mockedChronik = new MockChronikClient();
    const { type, hash } = cashaddr.decode(P2PKH_ADDRESS, true);
    mockedChronik.setScript(type, hash);
    mockedChronik.setTxHistory(type, hash, mockTxHistory.txs);

    // Execute the API call
    const result = await mockedChronik.script(type, hash).history(0, 2);
    assert.deepEqual(result, mockTxHistory);

    // We can also call this without page size
    assert.deepEqual(
        await mockedChronik.script(type, hash).history(),
        mockTxHistory,
    );
});

it('We get the same script().history() API response using address().history()', async function () {
    // Initialize chronik mock with history info
    const mockedChronik = new MockChronikClient();
    mockedChronik.setAddress(P2PKH_ADDRESS);
    mockedChronik.setTxHistoryByAddress(P2PKH_ADDRESS, mockTxHistory.txs);

    // Execute the API call
    const result = await mockedChronik.address(P2PKH_ADDRESS).history(0, 2);
    assert.deepEqual(result, mockTxHistory);

    // We can also call this without page size
    assert.deepEqual(
        await mockedChronik.address(P2PKH_ADDRESS).history(),
        mockTxHistory,
    );
});

it('We can also set and get tx history by tokenId', async function () {
    // Initialize chronik mock with history info
    const mockedChronik = new MockChronikClient();
    const tokenId =
        '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e';
    mockedChronik.setTokenId(tokenId);
    mockedChronik.setTxHistoryByTokenId(tokenId, mockTxHistory.txs);

    // Execute the API call
    const result = await mockedChronik.tokenId(tokenId).history(0, 2);
    assert.deepEqual(result, mockTxHistory);

    // We can also call this without page size
    assert.deepEqual(
        await mockedChronik.tokenId(tokenId).history(),
        mockTxHistory,
    );
});

it('We can get blockTxs by height', async function () {
    // Initialize chronik mock with history info
    const mockedChronik = new MockChronikClient();
    const height = 800000;
    mockedChronik.setTxHistoryByBlock(height, mockTxHistory.txs);

    // Execute the API call
    const result = await mockedChronik.blockTxs(height, 0, 2);
    assert.deepEqual(result, mockTxHistory);

    // We can also call this without page size
    assert.deepEqual(await mockedChronik.blockTxs(height), mockTxHistory);
});

it('We can get blockTxs by hash', async function () {
    // Initialize chronik mock with history info
    const mockedChronik = new MockChronikClient();
    const hash =
        '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe';
    mockedChronik.setTxHistoryByBlock(hash, mockTxHistory.txs);

    // Execute the API call
    const result = await mockedChronik.blockTxs(hash, 0, 2);
    assert.deepEqual(result, mockTxHistory);

    // We can also call this without page size
    assert.deepEqual(await mockedChronik.blockTxs(hash), mockTxHistory);
});

it('We can sub and unsub to scripts with the websocket', async function () {
    // Initialize chronik mock with script info
    const mockedChronik = new MockChronikClient();
    const { type, hash } = cashaddr.decode(P2PKH_ADDRESS, true);

    // Create websocket subscription to listen to confirmations on txid
    const ws = mockedChronik.ws({
        onMessage: msg => {
            console.log(`msg`, msg);
        },
    });

    // Wait for WS to be connected:
    await ws.waitForOpen();

    // Subscribe to scripts
    ws.subscribe(type, hash);

    // The sub is in ws.subs
    assert.deepEqual(ws.subs.scripts, [
        { scriptType: type, scriptPayload: hash },
    ]);

    // We can unsubscribe from the script
    ws.unsubscribe(type, hash);

    // The sub is no longer there
    assert.deepEqual(ws.subs.scripts, []);
});

it('We can mock a chronik websocket connection', async function () {
    // Initialize chronik mock with script info
    const mockedChronik = new MockChronikClient();
    const { type, hash } = cashaddr.decode(P2PKH_ADDRESS, true);

    // Create websocket subscription to listen to confirmations on txid
    const ws = mockedChronik.ws({
        onMessage: msg => {
            console.log(`msg`, msg);
        },
    });

    // Wait for WS to be connected:
    await ws.waitForOpen();

    // Subscribe to scripts
    ws.subscribe(type, hash);
    // We can test that ws.subscribe was called
    assert.strictEqual(mockedChronik.wsSubscribeCalled, true);

    // The sub is in ws.subs
    assert.deepEqual(ws.subs.scripts, [
        { scriptType: type, scriptPayload: hash },
    ]);

    // We can unsubscribe from the script
    ws.unsubscribe(type, hash);

    // The sub is no longer there
    assert.deepEqual(ws.subs.scripts, []);

    // We can test that waitForOpen() has been called
    await ws.waitForOpen();
    assert.equal(mockedChronik.wsWaitForOpenCalled, true);

    // We can test if a websocket was closed by calling wsClose() (aka "manually closed")
    mockedChronik.wsClose();
    assert.equal(mockedChronik.manuallyClosed, true);

    // We can subscribe to blocks (in-node chronik-client)
    ws.subscribeToBlocks();
    assert.equal(ws.subs.blocks, true);

    // We can unsubscribe from blocks (in-node chronik-client)
    ws.unsubscribeFromBlocks();
    assert.equal(ws.subs.blocks, false);
});

it('We can subscribe to and unsubscribe from addresses with the ws object', async function () {
    // Initialize chronik mock with script info
    const mockedChronik = new MockChronikClient();
    const { type, hash } = cashaddr.decode(P2PKH_ADDRESS, true);

    // Create websocket subscription to listen to confirmations on txid
    const ws = mockedChronik.ws({
        onMessage: msg => {
            console.log(msg);
        },
    });

    // Wait for WS to be connected:
    await ws.waitForOpen();

    // Subscribe to address
    ws.subscribeToAddress(P2PKH_ADDRESS);

    // Verify websocket subscription is as expected
    assert.deepEqual(ws.subs.scripts, [{ scriptType: type, payload: hash }]);

    // Unsubscribe from address
    ws.unsubscribeFromAddress(P2PKH_ADDRESS);

    // Verify websocket subscription is as expected
    assert.deepEqual(ws.subs.scripts, []);

    // We expect an error if we unsubscribe from an address and there is no existing subscription
    assert.throws(
        () => ws.unsubscribeFromAddress(P2PKH_ADDRESS),
        new Error(`No existing sub at ${type}, ${hash}`),
    );
});

it('We can subscribe to and unsubscribe from scripts with the ws object', async function () {
    // Initialize chronik mock with script info
    const mockedChronik = new MockChronikClient();
    const { type, hash } = cashaddr.decode(P2PKH_ADDRESS, true);

    // Create websocket subscription to listen to confirmations on txid
    const ws = mockedChronik.ws({
        onMessage: msg => {
            console.log(msg);
        },
    });

    // Wait for WS to be connected:
    await ws.waitForOpen();

    // Subscribe to address
    ws.subscribeToScript(type, hash);

    // Verify websocket subscription is as expected
    assert.deepEqual(ws.subs.scripts, [{ scriptType: type, payload: hash }]);

    // Unsubscribe from address
    ws.unsubscribeFromScript(type, hash);

    // Verify websocket subscription is as expected
    assert.deepEqual(ws.subs.scripts, []);

    // We expect an error if we unsubscribe from an address and there is no existing subscription
    assert.throws(
        () => ws.unsubscribeFromAddress(P2PKH_ADDRESS),
        new Error(`No existing sub at ${type}, ${hash}`),
    );
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
    const { type, hash } = cashaddr.decode(P2PKH_ADDRESS, true);
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
    const { type, hash } = cashaddr.decode(P2PKH_ADDRESS, true);
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
