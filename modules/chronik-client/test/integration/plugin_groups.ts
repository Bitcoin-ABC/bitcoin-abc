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

describe('chronik-client delivery of groups endpoint for plugins', () => {
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
    const PLUGIN_PREFIX = Buffer.from('TEST').toString('hex');
    const BYTES_a = Buffer.from('a').toString('hex');
    const BYTES_b = Buffer.from('b').toString('hex');
    const BYTES_aa = Buffer.from('aa').toString('hex');
    const BYTES_aaa = Buffer.from('aaa').toString('hex');
    const BYTES_aab = Buffer.from('aab').toString('hex');
    const BYTES_aba = Buffer.from('aba').toString('hex');
    const BYTES_abb = Buffer.from('abb').toString('hex');
    const BYTES_baa = Buffer.from('baa').toString('hex');
    const BYTES_bba = Buffer.from('bba').toString('hex');
    const BYTES_bbb = Buffer.from('bbb').toString('hex');
    const BYTES_all = Buffer.from('all').toString('hex');
    const BYTES_spent = Buffer.from('spent').toString('hex');

    const EMPTY_PLUGIN_GROUPS = {
        groups: [],
        nextStart: '',
    };

    it('New regtest chain', async () => {
        // We get an empty response if we call with no params
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal(
            EMPTY_PLUGIN_GROUPS,
        );

        // We get an empty response if we call with valid params
        expect(
            await chronik.plugin(PLUGIN_NAME).groups(PLUGIN_PREFIX, BYTES_a),
        ).to.deep.equal(EMPTY_PLUGIN_GROUPS);

        // We throw an error if the endpoint is called with plugin name that does not exist
        await expect(
            chronik.plugin('doesnotexist').groups(),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/doesnotexist/groups?: 404: Plugin "doesnotexist" not loaded`,
        );

        // We throw an error if the endpoint is called with an invalid prefix or start hex
        const badPrefixHex = 'not hex';
        const badStartHex = 'nothex';
        await expect(
            chronik.plugin(PLUGIN_NAME).groups(badPrefixHex, 'deadbeef'),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/groups?prefix=not+hex&start=deadbeef: 400: Invalid hex: Odd number of digits`,
        );
        await expect(
            chronik.plugin(PLUGIN_NAME).groups('deadbeef', badStartHex),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/groups?prefix=deadbeef&start=nothex: 400: Invalid hex: Invalid character 'n' at position 0`,
        );

        // We cannot request pageSize greater than 50
        await expect(
            chronik.plugin(PLUGIN_NAME).groups('deadbeef', 'deadbeef', 51),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/groups?prefix=deadbeef&start=deadbeef&page_size=51: 400: Requested page size 51 is too big, maximum is 50`,
        );
        // We cannot request pageSize less than 1
        await expect(
            chronik.plugin(PLUGIN_NAME).groups('deadbeef', 'deadbeef', 0),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/groups?prefix=deadbeef&start=deadbeef&page_size=0: 400: Requested page size 0 is too small, minimum is 1`,
        );
        // We cannot request pageSize of way more than 50
        await expect(
            chronik.plugin(PLUGIN_NAME).groups('deadbeef', 'deadbeef', 2 ** 32),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /plugin/${PLUGIN_NAME}/groups?prefix=deadbeef&start=deadbeef&page_size=4294967296: 400: Invalid param page_size: 4294967296, number too large to fit in target type`,
        );
    });
    it('After sending a tx to create plugin utxos in multiple groups', async () => {
        // Calling with no params, we get all available groups
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bba },
            ],
            nextStart: '',
        });

        // Specifying a page size too small to give all groups, we get expected nextStart
        // Note that param order is important here
        // Params are chronik.plugin(PLUGIN_NAME).groups(prefixHex, startHex, pageNumber)
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', '', 2),
        ).to.deep.equal({
            groups: [{ group: BYTES_aaa }, { group: BYTES_aab }],
            nextStart: BYTES_abb,
        });

        // We get expected output if we specify startHex and pageSize
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', BYTES_abb, 2),
        ).to.deep.equal({
            groups: [{ group: BYTES_abb }, { group: BYTES_baa }],
            nextStart: BYTES_bba,
        });
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', BYTES_bba, 2),
        ).to.deep.equal({
            groups: [{ group: BYTES_bba }],
            nextStart: '',
        });

        // We can call with prefixHex
        expect(
            await chronik.plugin(PLUGIN_NAME).groups(BYTES_aa),
        ).to.deep.equal({
            groups: [{ group: BYTES_aaa }, { group: BYTES_aab }],
            nextStart: '',
        });

        // We can call with prefixHex and startHex
        expect(
            await chronik.plugin(PLUGIN_NAME).groups(BYTES_a, BYTES_aab),
        ).to.deep.equal({
            groups: [{ group: BYTES_aab }, { group: BYTES_abb }],
            nextStart: '',
        });

        // We can call with just startHex
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', BYTES_aab),
        ).to.deep.equal({
            groups: [
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bba },
            ],
            nextStart: '',
        });

        // We can call with prefixHex, startHex, and page size
        expect(
            await chronik.plugin(PLUGIN_NAME).groups(BYTES_a, BYTES_aab, 1),
        ).to.deep.equal({
            groups: [{ group: BYTES_aab }],
            nextStart: BYTES_abb,
        });
    });
    it('After sending a tx to create plugin utxos in different groups', async () => {
        // Calling with no params, we get all available groups
        // Note that we have now spent BYTES_bba utxo, and it does not appear in groups()
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_aba },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bbb },
            ],
            nextStart: '',
        });
    });
    it('After mining the first two txs', async () => {
        // Tx being confirmed has no impact on returned groups data
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_aba },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bbb },
            ],
            nextStart: '',
        });

        // We call with a prefix, matching the chronik test script test
        expect(await chronik.plugin(PLUGIN_NAME).groups(BYTES_b)).to.deep.equal(
            {
                groups: [{ group: BYTES_baa }, { group: BYTES_bbb }],
                nextStart: '',
            },
        );
    });
    it('After sending a third tx consuming bbb and creating bba again', async () => {
        // bba revived, aaa still remaining, aba and bbb fully spent in mempool
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bba },
            ],
            nextStart: '',
        });
        // Various param calls matching the chronik tests
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', '', 2),
        ).to.deep.equal({
            groups: [{ group: BYTES_aaa }, { group: BYTES_aab }],
            nextStart: BYTES_aba, // next_start not guaranteed to be the next entry, same as chronik data
        });
        expect(await chronik.plugin(PLUGIN_NAME).groups(BYTES_a)).to.deep.equal(
            {
                groups: [
                    { group: BYTES_aaa },
                    { group: BYTES_aab },
                    { group: BYTES_abb },
                ],
                nextStart: '',
            },
        );
        expect(
            await chronik.plugin(PLUGIN_NAME).groups(BYTES_a, BYTES_aab),
        ).to.deep.equal({
            groups: [{ group: BYTES_aab }, { group: BYTES_abb }],
            nextStart: '',
        });
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', BYTES_aab),
        ).to.deep.equal({
            groups: [
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bba },
            ],
            nextStart: '',
        });
        expect(
            await chronik.plugin(PLUGIN_NAME).groups(BYTES_a, BYTES_aab, 1),
        ).to.deep.equal({
            groups: [{ group: BYTES_aab }],
            nextStart: BYTES_aba,
        });
    });
    it('After mining this third tx', async () => {
        // No change in groups
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bba },
            ],
            nextStart: '',
        });
    });
    it('After invalidating block with third tx', async () => {
        // No change in groups
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bba },
            ],
            nextStart: '',
        });
    });
    it('After invalidating block with first two txs', async () => {
        // No change in groups
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_bba },
            ],
            nextStart: '',
        });
    });
    it('After creating a block with more group-creating txs', async () => {
        // Moar groups
        // Note that default pageSize is 25
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [
                { group: '000000' },
                { group: '000001' },
                { group: '000002' },
                { group: '000003' },
                { group: '000004' },
                { group: '000005' },
                { group: '000006' },
                { group: '000007' },
                { group: '000008' },
                { group: '000009' },
                { group: '00000a' },
                { group: '00000b' },
                { group: '00000c' },
                { group: '00000d' },
                { group: '00000e' },
                { group: '00000f' },
                { group: '000010' },
                { group: '000011' },
                { group: '000012' },
                { group: '000013' },
                { group: '000014' },
                { group: '000015' },
                { group: '000016' },
                { group: '000017' },
                { group: '000018' },
            ],
            nextStart: '000019',
        });
    });
    it('After sending a tx that spends all "all" utxos', async () => {
        // We do not see any utxos in the 'all' group
        expect(
            await chronik.plugin(PLUGIN_NAME).utxos(BYTES_all),
        ).to.deep.equal({
            utxos: [],
            groupHex: BYTES_all,
            pluginName: PLUGIN_NAME,
        });
        // But, because the tx is not yet confirmed, we do still see the group
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', BYTES_all, 1),
        ).to.deep.equal({
            groups: [{ group: BYTES_all }],
            nextStart: BYTES_baa,
        });
    });
    it('After mining the tx that spends all "all" utxos', async () => {
        // After the tx is confirmed, we no longer see the gruop
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', BYTES_all, 1),
        ).to.deep.equal({
            groups: [{ group: BYTES_baa }],
            nextStart: BYTES_spent,
        });
    });
    it('After sending a tx that spends all utxos that have an integer as group', async () => {
        // We skipped 1000 groups, Chronik refuses to skip more
        // It returns us the 1000th UTXO so we can make progress
        expect(await chronik.plugin(PLUGIN_NAME).groups()).to.deep.equal({
            groups: [],
            nextStart: '0003e8', // (1000).to_bytes(3, "big"))
        });

        // Skipped 1000 groups again
        // Starting from the 1st UTXO gives us "aaa" as next start
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', '000001'),
        ).to.deep.equal({
            groups: [],
            nextStart: BYTES_aaa,
        });

        // Only skipped 999 groups, so we get all unspent groups as normal
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', '000002'),
        ).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_spent },
            ],
            nextStart: '',
        });

        // Same if we use the suggested next_start of 1000
        expect(
            await chronik.plugin(PLUGIN_NAME).groups('', '0003e8'),
        ).to.deep.equal({
            groups: [
                { group: BYTES_aaa },
                { group: BYTES_aab },
                { group: BYTES_abb },
                { group: BYTES_baa },
                { group: BYTES_spent },
            ],
            nextStart: '',
        });
    });
});
