// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClient } from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    setMochaTimeout,
    TestInfo,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('chronik-client presentation of plugin entries in tx inputs, outputs and in utxos', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;

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
        testRunner.send('next');
    });

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
        value: 1000,
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

        // We throw an error if the endpoint is called with plugin name that does not exist
        await expect(
            chronik.plugin('doesnotexist').utxos(BYTES_a),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/doesnotexist/${BYTES_a}/utxos: 404: Plugin "doesnotexist" not loaded`,
        );

        // We throw an error if the endpoint is called with an invalid plugin group hex
        await expect(
            chronik.plugin(PLUGIN_NAME).utxos('not a hex string'),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/not a hex string/utxos: 400: Invalid hex: Invalid character 'n' at position 0`,
        );
    });
    it('After broadcasting a tx with plugin utxos in group "a"', async () => {
        const firstTx = await chronik.tx(FIRST_PLUGIN_TXID);
        const { inputs, outputs } = firstTx;

        // As we have no plugins in this tx's inputs, we have no plugins key in tx inputs
        expect(typeof inputs[0].plugins).to.eql('undefined');

        // We get plugin info in expected shape for outputs
        expect(outputs[0]).to.deep.equal({
            value: 0,
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
                    value: 4999990000,
                },
            ],
        });
    });
    it('After broadcasting a tx with plugin utxos in group "b"', async () => {
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
            value: 0,
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
                    value: 4999980000,
                },
            ],
        });
    });
    it('After mining a block with these first 2 txs', async () => {
        // The plugin info in a tx returned by chronik-client is not changed by a block confirming
        const firstTx = await chronik.tx(FIRST_PLUGIN_TXID);
        const { inputs, outputs } = firstTx;

        // As we have no plugins in this tx's inputs, we have no plugins key in tx inputs
        expect(typeof inputs[0].plugins).to.eql('undefined');

        // We get plugin info in expected shape for outputs
        expect(outputs[0]).to.deep.equal({
            value: 0,
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
    });
    it('After broadcasting a tx with plugin utxos in group "c"', async () => {
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
            value: 0,
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
            value: 4999970000,
        };
        expect(thesePluginUtxos).to.deep.equal({
            groupHex: BYTES_c,
            pluginName: PLUGIN_NAME,
            utxos: [group_c_utxo],
        });
    });
    it('After mining a block with this third tx', async () => {
        // Plugin output is not changed by mining the block
        const thesePluginUtxos = await chronik
            .plugin(PLUGIN_NAME)
            .utxos(BYTES_c);
        expect(thesePluginUtxos).to.deep.equal({
            groupHex: BYTES_c,
            pluginName: PLUGIN_NAME,
            utxos: [{ ...group_c_utxo, blockHeight: 103 }],
        });
    });
    it('After invalidating the mined block with the third tx', async () => {
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
            value: 0,
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
