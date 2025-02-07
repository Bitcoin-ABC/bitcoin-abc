// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClient, WsEndpoint, WsMsgClient } from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    expectWsMsgs,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('chronik-client presentation of plugin entries in tx inputs, outputs and in utxos', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;

    // Collect websocket msgs in an array for analysis in each step
    let msgCollectorWs1: Array<WsMsgClient> = [];
    let msgCollectorWs2: Array<WsMsgClient> = [];

    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let chronik: ChronikClient;
    let setupScriptTermination: ReturnType<typeof setTimeout>;

    before(async function () {
        // Initialize testRunner before mocha tests
        testRunner = initializeTestRunner(testName, statusEvent);

        // Handle IPC messages from the setup script
        testRunner.on('message', function (message: any) {
            if (message && message.test_info) {
                get_test_info = new Promise(resolve => {
                    resolve(message.test_info);
                });
            }
        });

        await once(statusEvent, 'ready');

        const testInfo = await get_test_info;

        chronikUrl = [testInfo.chronik];
        chronik = new ChronikClient(chronikUrl);
        console.info(`chronikUrl set to ${JSON.stringify(chronikUrl)}`);

        setupScriptTermination = setMochaTimeout(
            this,
            testName,
            testInfo,
            testRunner,
        );

        testRunner.send('next');
    });

    after(async () => {
        await cleanupMochaRegtest(
            testName,
            testRunner,
            setupScriptTermination,
            statusEvent,
        );
    });

    beforeEach(async () => {
        await once(statusEvent, 'ready');
    });

    afterEach(() => {
        // Reset msgCollectors after each step
        msgCollectorWs1 = [];
        msgCollectorWs2 = [];

        testRunner.send('next');
    });

    let ws1: WsEndpoint;
    let ws2: WsEndpoint;

    const BASE_ADDEDTOMEMPOOL_WSMSG: WsMsgClient = {
        type: 'Tx',
        msgType: 'TX_ADDED_TO_MEMPOOL',
        txid: '1111111111111111111111111111111111111111111111111111111111111111',
    };
    const BASE_CONFIRMED_WSMSG: WsMsgClient = {
        type: 'Tx',
        msgType: 'TX_CONFIRMED',
        txid: '1111111111111111111111111111111111111111111111111111111111111111',
    };

    const PLUGIN_NAME = 'my_plugin';
    const BYTES_a = Buffer.from('a').toString('hex');
    const BYTES_argo = Buffer.from('argo').toString('hex');
    const BYTES_alef = Buffer.from('alef').toString('hex');
    const BYTES_abc = Buffer.from('abc').toString('hex');

    const BYTES_b = Buffer.from('b').toString('hex');
    const BYTES_blub = Buffer.from('blub').toString('hex');
    const BYTES_borg = Buffer.from('borg').toString('hex');
    const BYTES_bjork = Buffer.from('bjork').toString('hex');

    const BYTES_c = Buffer.from('c').toString('hex');
    const BYTES_carp = Buffer.from('carp').toString('hex');

    let group_c_utxo = {};

    const TEST_UTXO_OUTPUTSCRIPT =
        'a914da1745e9b549bd0bfa1a569971c77eba30cd5a4b87';

    const FIRST_PLUGIN_TXID =
        'de0975bfc6ddeb7ef76b6cc1d04e1f66b6993fe508e99c54f536ca1cdbc31788';
    const SECOND_PLUGIN_TXID =
        '2c4d75c55b33e121fa91efeb62b60bbad7bb97a2959b1a30731764057f32df7e';
    const THIRD_PLUGIN_TXID =
        'cdc4a279f7474254e93a6df3730fc600c86849d5fefa63d6774ba1246feefc4d';
    const BASE_OUTPOINT = { outIdx: 1, txid: FIRST_PLUGIN_TXID };

    const BASE_UTXO = {
        blockHeight: -1,
        isCoinbase: false,
        isFinal: false,
        outpoint: BASE_OUTPOINT,
        script: TEST_UTXO_OUTPUTSCRIPT,
        sats: 1000n,
    };

    const FIRST_PLUGIN_OPRETURN = '6a0454455354046172676f04616c656603616263';
    const SECOND_PLUGIN_OPRETURN =
        '6a045445535404626c756204626f726705626a6f726b';

    const THIRD_PLUGIN_OPRETURN = '6a04544553540463617270';

    it('New regtest chain', async () => {
        // We get an empty utxo set if no txs exist for a plugin
        const emptyPluginsUtxos = await chronik
            .plugin(PLUGIN_NAME)
            .utxos(BYTES_a);

        expect(emptyPluginsUtxos).to.deep.equal({
            utxos: [],
            groupHex: BYTES_a,
            pluginName: PLUGIN_NAME,
        });

        // We get empty history if no txs exist for a plugin
        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_a),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });
        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_a),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });
        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_a),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        // We throw an error if the endpoint is called with plugin name that does not exist
        const nonExistentPlugin = 'doesnotexist';
        await expect(
            chronik.plugin(nonExistentPlugin).utxos(BYTES_a),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${nonExistentPlugin}/${BYTES_a}/utxos: 404: Plugin "${nonExistentPlugin}" not loaded`,
        );
        await expect(
            chronik.plugin(nonExistentPlugin).history(BYTES_a),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${nonExistentPlugin}/${BYTES_a}/history?page=0&page_size=25: 404: Plugin "${nonExistentPlugin}" not loaded`,
        );
        await expect(
            chronik.plugin(nonExistentPlugin).confirmedTxs(BYTES_a),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${nonExistentPlugin}/${BYTES_a}/confirmed-txs?page=0&page_size=25: 404: Plugin "${nonExistentPlugin}" not loaded`,
        );
        await expect(
            chronik.plugin(nonExistentPlugin).unconfirmedTxs(BYTES_a),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${nonExistentPlugin}/${BYTES_a}/unconfirmed-txs?page=0&page_size=25: 404: Plugin "${nonExistentPlugin}" not loaded`,
        );

        // We throw an error if the endpoint is called with an invalid plugin group hex
        const badPluginName = 'not a hex string';
        await expect(
            chronik.plugin(PLUGIN_NAME).utxos(badPluginName),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/${badPluginName}/utxos: 400: Invalid hex: Invalid character 'n' at position 0`,
        );
        await expect(
            chronik.plugin(PLUGIN_NAME).history(badPluginName),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/${badPluginName}/history?page=0&page_size=25: 400: Invalid hex: Invalid character 'n' at position 0`,
        );
        await expect(
            chronik.plugin(PLUGIN_NAME).confirmedTxs(badPluginName),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/${badPluginName}/confirmed-txs?page=0&page_size=25: 400: Invalid hex: Invalid character 'n' at position 0`,
        );
        await expect(
            chronik.plugin(PLUGIN_NAME).unconfirmedTxs(badPluginName),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/${badPluginName}/unconfirmed-txs?page=0&page_size=25: 400: Invalid hex: Invalid character 'n' at position 0`,
        );

        // Connect to the websocket with a testable onMessage handler
        ws1 = chronik.ws({
            onMessage: msg => {
                msgCollectorWs1.push(msg);
            },
        });
        await ws1.waitForOpen();

        // We can subscribe to a plugin
        ws1.subscribeToPlugin(PLUGIN_NAME, BYTES_a);
        expect(ws1.subs.plugins).to.deep.equal([
            { pluginName: PLUGIN_NAME, group: BYTES_a },
        ]);

        // We can subscribe to multiple plugins
        ws1.subscribeToPlugin(PLUGIN_NAME, BYTES_b);
        expect(ws1.subs.plugins).to.deep.equal([
            { pluginName: PLUGIN_NAME, group: BYTES_a },
            { pluginName: PLUGIN_NAME, group: BYTES_b },
        ]);

        // We can unsubscribe from a plugin we are subscribed to
        ws1.unsubscribeFromPlugin(PLUGIN_NAME, BYTES_b);
        expect(ws1.subs.plugins).to.deep.equal([
            { pluginName: PLUGIN_NAME, group: BYTES_a },
        ]);

        // We cannot unsubscribe from a plugin if we are not currently subscribed to it
        expect(() => ws1.unsubscribeFromPlugin(PLUGIN_NAME, BYTES_b)).to.throw(
            `No existing sub at pluginName="${PLUGIN_NAME}", group="${BYTES_b}"`,
        );

        // We cannot subscribe to an invalid plugin
        expect(() =>
            ws1.subscribeToPlugin(undefined as unknown as string, BYTES_a),
        ).to.throw(`pluginName must be a string`);
        expect(() =>
            ws1.subscribeToPlugin(PLUGIN_NAME, undefined as unknown as string),
        ).to.throw(`group must be a string`);
        expect(() => ws1.subscribeToPlugin(PLUGIN_NAME, 'aaa')).to.throw(
            `group must have even length (complete bytes): "aaa"`,
        );
        expect(() =>
            ws1.subscribeToPlugin(PLUGIN_NAME, 'not a hex string'),
        ).to.throw(
            `group must be a valid lowercase hex string: "not a hex string"`,
        );

        // Initialize a second websocket to confirm we match the behavior of the chronik test script
        ws2 = chronik.ws({
            onMessage: msg => {
                msgCollectorWs2.push(msg);
            },
        });
        await ws2.waitForOpen();
        ws2.subscribeToPlugin(PLUGIN_NAME, BYTES_b);
        expect(ws2.subs.plugins).to.deep.equal([
            { pluginName: PLUGIN_NAME, group: BYTES_b },
        ]);
    });
    it('After broadcasting a tx with plugin utxos in group "a"', async () => {
        // Wait for expected msg
        await expectWsMsgs(1, msgCollectorWs1);

        // We get ADDED_TO_MEMPOOL websocket msg at ws1
        expect(msgCollectorWs1).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: FIRST_PLUGIN_TXID },
        ]);
        // We get no websocket msg at ws2
        expect(msgCollectorWs2).to.deep.equal([]);

        const firstTx = await chronik.tx(FIRST_PLUGIN_TXID);
        const { inputs, outputs } = firstTx;

        // As we have no plugins in this tx's inputs, we have no plugins key in tx inputs
        expect(typeof inputs[0].plugins).to.eql('undefined');

        // We get plugin info in expected shape for outputs
        expect(outputs[0]).to.deep.equal({
            sats: 0n,
            outputScript: FIRST_PLUGIN_OPRETURN,
            // No plugins key here as no associated plugin data for this output
        });
        expect(outputs[1].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_a],
                data: [BYTES_argo],
            },
        });
        expect(outputs[2].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_a],
                data: [BYTES_alef],
            },
        });
        expect(outputs[3].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_a],
                data: [BYTES_abc],
            },
        });

        // We can get utxos associated with this plugin and specified bytes
        const thesePluginUtxos = await chronik
            .plugin(PLUGIN_NAME)
            .utxos(BYTES_a);
        expect(thesePluginUtxos).to.deep.equal({
            groupHex: BYTES_a,
            pluginName: PLUGIN_NAME,
            utxos: [
                {
                    ...BASE_UTXO,
                    plugins: {
                        [PLUGIN_NAME]: {
                            data: [BYTES_argo],
                            groups: [BYTES_a],
                        },
                    },
                },
                {
                    ...BASE_UTXO,
                    outpoint: { ...BASE_OUTPOINT, outIdx: 2 },
                    plugins: {
                        [PLUGIN_NAME]: {
                            data: [BYTES_alef],
                            groups: [BYTES_a],
                        },
                    },
                },
                {
                    ...BASE_UTXO,
                    outpoint: { ...BASE_OUTPOINT, outIdx: 3 },
                    plugins: {
                        [PLUGIN_NAME]: {
                            data: [BYTES_abc],
                            groups: [BYTES_a],
                        },
                    },
                    sats: 4999990000n,
                },
            ],
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_a),
        ).to.deep.equal({
            txs: [firstTx],
            numPages: 1,
            numTxs: 1,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_a),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_a),
        ).to.deep.equal({
            txs: [firstTx],
            numPages: 1,
            numTxs: 1,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_b),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });
    });
    it('After broadcasting a tx with plugin utxos in group "b"', async () => {
        // Wait for expected msg at ws1
        await expectWsMsgs(1, msgCollectorWs1);
        // We get ADDED_TO_MEMPOOL websocket msg at ws1
        expect(msgCollectorWs1).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: SECOND_PLUGIN_TXID },
        ]);
        // Wait for expected msg a ws2
        await expectWsMsgs(1, msgCollectorWs2);
        // We get ADDED_TO_MEMPOOL websocket msg at ws2
        expect(msgCollectorWs2).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: SECOND_PLUGIN_TXID },
        ]);

        const secondTx = await chronik.tx(SECOND_PLUGIN_TXID);

        const { inputs, outputs } = secondTx;

        // We have plugins in this tx's inputs, so we get an inputs key with their information
        expect(inputs[0].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_a],
                data: [BYTES_abc],
            },
        });

        // We get plugin info in expected shape for outputs
        expect(outputs[0]).to.deep.equal({
            sats: 0n,
            outputScript: SECOND_PLUGIN_OPRETURN,
            // No plugins key here as no associated plugin data for this output
        });
        expect(outputs[1].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_b],
                data: [BYTES_blub, BYTES_abc],
            },
        });
        expect(outputs[2].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_b],
                data: [BYTES_borg],
            },
        });
        expect(outputs[3].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_b],
                data: [BYTES_bjork],
            },
        });

        // We can get utxos associated with this plugin and specified bytes
        const thesePluginUtxos = await chronik
            .plugin(PLUGIN_NAME)
            .utxos(BYTES_b);
        expect(thesePluginUtxos).to.deep.equal({
            groupHex: BYTES_b,
            pluginName: PLUGIN_NAME,
            utxos: [
                {
                    ...BASE_UTXO,
                    outpoint: { txid: SECOND_PLUGIN_TXID, outIdx: 1 },
                    plugins: {
                        [PLUGIN_NAME]: {
                            data: [BYTES_blub, BYTES_abc],
                            groups: [BYTES_b],
                        },
                    },
                },
                {
                    ...BASE_UTXO,
                    outpoint: { txid: SECOND_PLUGIN_TXID, outIdx: 2 },
                    plugins: {
                        [PLUGIN_NAME]: {
                            data: [BYTES_borg],
                            groups: [BYTES_b],
                        },
                    },
                },
                {
                    ...BASE_UTXO,
                    outpoint: { txid: SECOND_PLUGIN_TXID, outIdx: 3 },
                    plugins: {
                        [PLUGIN_NAME]: {
                            data: [BYTES_bjork],
                            groups: [BYTES_b],
                        },
                    },
                    sats: 4999980000n,
                },
            ],
        });

        // Update firstTx, as now it has a spent output
        const firstTx = await chronik.tx(FIRST_PLUGIN_TXID);

        // unconfirmed txs are sorted by timeFirstSeen
        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_a),
        ).to.deep.equal({
            txs: [secondTx, firstTx],
            numPages: 1,
            numTxs: 2,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_a),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        // Note that the history endpoint keeps unconfirmed txs in reverse-chronological order
        // Opposite order of unconfirmedTxs
        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_a),
        ).to.deep.equal({
            txs: [firstTx, secondTx],
            numPages: 1,
            numTxs: 2,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [secondTx],
            numPages: 1,
            numTxs: 1,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_b),
        ).to.deep.equal({
            txs: [secondTx],
            numPages: 1,
            numTxs: 1,
        });
    });
    it('After mining a block with these first 2 txs', async () => {
        await expectWsMsgs(2, msgCollectorWs1);
        // We get ADDED_TO_MEMPOOL websocket msg at ws1
        expect(msgCollectorWs1).to.deep.equal([
            { ...BASE_CONFIRMED_WSMSG, txid: SECOND_PLUGIN_TXID },
            { ...BASE_CONFIRMED_WSMSG, txid: FIRST_PLUGIN_TXID },
        ]);
        await expectWsMsgs(1, msgCollectorWs2);
        // We get ADDED_TO_MEMPOOL websocket msg at ws2
        expect(msgCollectorWs2).to.deep.equal([
            { ...BASE_CONFIRMED_WSMSG, txid: SECOND_PLUGIN_TXID },
        ]);
        // The plugin info in a tx returned by chronik-client is not changed by a block confirming
        const firstTx = await chronik.tx(FIRST_PLUGIN_TXID);
        const { inputs, outputs } = firstTx;

        // As we have no plugins in this tx's inputs, we have no plugins key in tx inputs
        expect(typeof inputs[0].plugins).to.eql('undefined');

        // We get plugin info in expected shape for outputs
        expect(outputs[0]).to.deep.equal({
            sats: 0n,
            outputScript: FIRST_PLUGIN_OPRETURN,
            // No plugins key here as no associated plugin data for this output
        });
        expect(outputs[1].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_a],
                data: [BYTES_argo],
            },
        });
        expect(outputs[2].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_a],
                data: [BYTES_alef],
            },
        });
        expect(outputs[3].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_a],
                data: [BYTES_abc],
            },
        });

        // Update txs as they now have block keys
        // Note that firstTx was already updated above
        const secondTx = await chronik.tx(SECOND_PLUGIN_TXID);

        // Sort alphabetical by txid, as this is how confirmed txs will be sorted
        // aka lexicographic sorting
        const txsSortedByTxid = [firstTx, secondTx].sort((a, b) =>
            a.txid.localeCompare(b.txid),
        );

        // History sorting is more complicated
        // Since timeFirstSeen here is constant, we end up getting "reverse-txid" order
        // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/a18387188c0d1235eca81791919458fec2433345/chronik/chronik-indexer/src/query/group_history.rs#L171
        const txsSortedByTxidReverse = [firstTx, secondTx].sort((a, b) =>
            b.txid.localeCompare(a.txid),
        );

        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_a),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_a),
        ).to.deep.equal({
            txs: txsSortedByTxid,
            numPages: 1,
            numTxs: 2,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_a),
        ).to.deep.equal({
            txs: txsSortedByTxidReverse,
            numPages: 1,
            numTxs: 2,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [secondTx],
            numPages: 1,
            numTxs: 1,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_b),
        ).to.deep.equal({
            txs: [secondTx],
            numPages: 1,
            numTxs: 1,
        });
    });
    it('After broadcasting a tx with plugin utxos in group "c"', async () => {
        // We get no websocket msgs at ws1
        expect(msgCollectorWs1).to.deep.equal([]);
        await expectWsMsgs(1, msgCollectorWs2);
        // We get ADDED_TO_MEMPOOL websocket msg at ws2
        expect(msgCollectorWs2).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: THIRD_PLUGIN_TXID },
        ]);
        const thirdTx = await chronik.tx(THIRD_PLUGIN_TXID);

        const { inputs, outputs } = thirdTx;

        // We have plugins in this tx's inputs, so we get an inputs key with their information
        expect(inputs[0].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_b],
                data: [BYTES_blub, BYTES_abc],
            },
        });
        expect(inputs[1].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_b],
                data: [BYTES_bjork],
            },
        });

        // We get plugin info in expected shape for outputs
        expect(outputs[0]).to.deep.equal({
            sats: 0n,
            outputScript: THIRD_PLUGIN_OPRETURN,
            // No plugins key here as no associated plugin data for this output
        });
        expect(outputs[1].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_c],
                data: [BYTES_carp, BYTES_blub, BYTES_abc],
            },
        });

        // We can get utxos associated with this plugin and specified bytes
        const thesePluginUtxos = await chronik
            .plugin(PLUGIN_NAME)
            .utxos(BYTES_c);

        group_c_utxo = {
            ...BASE_UTXO,
            outpoint: { txid: THIRD_PLUGIN_TXID, outIdx: 1 },
            plugins: {
                [PLUGIN_NAME]: {
                    groups: [BYTES_c],
                    data: [BYTES_carp, BYTES_blub, BYTES_abc],
                },
            },
            sats: 4999970000n,
        };
        expect(thesePluginUtxos).to.deep.equal({
            groupHex: BYTES_c,
            pluginName: PLUGIN_NAME,
            utxos: [group_c_utxo],
        });

        // Update secondTx as now an output is spent
        const secondTx = await chronik.tx(SECOND_PLUGIN_TXID);

        // Sort alphabetical by txid, as this is how confirmed txs will be sorted
        // aka lexicographic sorting
        const txsSortedByTxid = [secondTx, thirdTx].sort((a, b) =>
            a.txid.localeCompare(b.txid),
        );

        // History sorting is more complicated
        // Since timeFirstSeen here is constant, we end up getting "reverse-txid" order
        // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/a18387188c0d1235eca81791919458fec2433345/chronik/chronik-indexer/src/query/group_history.rs#L171
        const txsSortedByTxidReverse = txsSortedByTxid.reverse();

        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [thirdTx],
            numPages: 1,
            numTxs: 1,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [secondTx],
            numPages: 1,
            numTxs: 1,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_b),
        ).to.deep.equal({
            txs: txsSortedByTxidReverse,
            numPages: 1,
            numTxs: 2,
        });
    });
    it('After mining a block with this third tx', async () => {
        // We get expected ws confirmed msg
        await expectWsMsgs(1, msgCollectorWs2);
        expect(msgCollectorWs2).to.deep.equal([
            { ...BASE_CONFIRMED_WSMSG, txid: THIRD_PLUGIN_TXID },
        ]);
        // Plugin output is not changed by mining the block
        const thesePluginUtxos = await chronik
            .plugin(PLUGIN_NAME)
            .utxos(BYTES_c);
        expect(thesePluginUtxos).to.deep.equal({
            groupHex: BYTES_c,
            pluginName: PLUGIN_NAME,
            utxos: [{ ...group_c_utxo, blockHeight: 103 }],
        });

        // Get the second tx for this scope
        const secondTx = await chronik.tx(SECOND_PLUGIN_TXID);
        // Update third tx as it now has a block key
        const thirdTx = await chronik.tx(THIRD_PLUGIN_TXID);

        // Sort alphabetical by txid, as this is how confirmed txs will be sorted
        // aka lexicographic sorting
        const txsSortedByTxid = [secondTx, thirdTx].sort((a, b) =>
            a.txid.localeCompare(b.txid),
        );

        // History sorting is more complicated
        // Since timeFirstSeen here is constant, we end up getting "reverse-txid" order
        // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/a18387188c0d1235eca81791919458fec2433345/chronik/chronik-indexer/src/query/group_history.rs#L171
        const txsSortedTxidReverse = [secondTx, thirdTx].sort(
            (b, a) =>
                a.timeFirstSeen - b.timeFirstSeen ||
                a.txid.localeCompare(b.txid),
        );

        expect(
            await chronik.plugin(PLUGIN_NAME).unconfirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: [],
            numPages: 0,
            numTxs: 0,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).confirmedTxs(BYTES_b),
        ).to.deep.equal({
            txs: txsSortedByTxid,
            numPages: 1,
            numTxs: 2,
        });

        expect(
            await chronik.plugin(PLUGIN_NAME).history(BYTES_b),
        ).to.deep.equal({
            txs: txsSortedTxidReverse,
            numPages: 1,
            numTxs: 2,
        });
    });
    it('After invalidating the mined block with the third tx', async () => {
        await expectWsMsgs(1, msgCollectorWs2);
        expect(msgCollectorWs2).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: THIRD_PLUGIN_TXID },
        ]);
        // Plugin output is not changed by invalidating the block
        const thesePluginUtxos = await chronik
            .plugin(PLUGIN_NAME)
            .utxos(BYTES_c);
        expect(thesePluginUtxos).to.deep.equal({
            groupHex: BYTES_c,
            pluginName: PLUGIN_NAME,
            utxos: [group_c_utxo],
        });
    });
    it('After invalidating the mined block with the first two txs', async () => {
        await expectWsMsgs(2, msgCollectorWs1);
        // We get ADDED_TO_MEMPOOL websocket msgs at ws1
        expect(msgCollectorWs1).to.deep.equal([
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: FIRST_PLUGIN_TXID },
            { ...BASE_ADDEDTOMEMPOOL_WSMSG, txid: SECOND_PLUGIN_TXID },
        ]);
        await expectWsMsgs(1, msgCollectorWs2);
        // We get websocket msgs at ws2 in lexicographic order
        expect(msgCollectorWs2).to.deep.equal([
            {
                ...BASE_ADDEDTOMEMPOOL_WSMSG,
                txid: THIRD_PLUGIN_TXID,
                msgType: 'TX_REMOVED_FROM_MEMPOOL',
            },
            {
                ...BASE_ADDEDTOMEMPOOL_WSMSG,
                txid: SECOND_PLUGIN_TXID,
            },
            {
                ...BASE_ADDEDTOMEMPOOL_WSMSG,
                txid: THIRD_PLUGIN_TXID,
            },
        ]);

        // The plugin info in a chronik tx is not changed by a block invalidating
        const secondTx = await chronik.tx(SECOND_PLUGIN_TXID);

        const { inputs, outputs } = secondTx;

        // We have plugins in this tx's inputs, so we get an inputs key with their information
        expect(inputs[0].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_a],
                data: [BYTES_abc],
            },
        });

        // We get plugin info in expected shape for outputs
        expect(outputs[0]).to.deep.equal({
            sats: 0n,
            outputScript: SECOND_PLUGIN_OPRETURN,
            // No plugins key here as no associated plugin data for this output
        });
        expect(outputs[1].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_b],
                data: [BYTES_blub, BYTES_abc],
            },
        });
        expect(outputs[2].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_b],
                data: [BYTES_borg],
            },
        });
        expect(outputs[3].plugins).to.deep.equal({
            [PLUGIN_NAME]: {
                groups: [BYTES_b],
                data: [BYTES_bjork],
            },
        });
    });
});
