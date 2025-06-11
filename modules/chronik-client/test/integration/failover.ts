// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import path from 'path';
import { ChronikClient, WsEndpoint } from '../../index';
import initializeTestRunner, {
    cleanupMochaRegtest,
    setMochaTimeout,
    TestInfo,
    expectWsMsgs,
} from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Test failover functionality', () => {
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrls: string[] = [];
    let setupScriptTermination: ReturnType<typeof setTimeout>;
    let chronik: ChronikClient;
    let ws: WsEndpoint;
    const msgCollector: any[] = [];
    let get_tipHash: Promise<string>;
    let tipHash: string;

    before(async function () {
        testRunner = initializeTestRunner(testName, statusEvent);

        testRunner.on('message', function (message: any) {
            if (message && message.test_info) {
                get_test_info = new Promise(resolve => {
                    resolve(message.test_info);
                });
            }
            if (message && message.chronik_urls) {
                chronikUrls = message.chronik_urls;
                chronik = new ChronikClient(chronikUrls);
            }
            if (message && message.tipHash) {
                get_tipHash = new Promise(resolve => {
                    resolve(message.tipHash);
                });
            }
        });

        await once(statusEvent, 'ready');

        const testInfo = await get_test_info;

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

    it('New regtest chain', async () => {
        ws = chronik.ws({
            onMessage: msg => {
                return msgCollector.push(msg);
            },
        });
        await ws.waitForOpen();

        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash).to.match(/^[0-9a-f]{64}$/);

        ws.subscribeToBlocks();
        expect(ws.subs.blocks).to.eql(true);
    });

    it('should failover to second node after first node is stopped', async () => {
        const firstNodeOnly = new ChronikClient([chronikUrls[0]]);
        await expect(firstNodeOnly.blockchainInfo()).to.be.rejectedWith(
            Error,
            'Error connecting to known Chronik instances',
        );

        tipHash = await get_tipHash;

        await expectWsMsgs(1, msgCollector);

        const blockMsg = msgCollector.shift();

        expect(blockMsg).to.include({
            type: 'Block',
            msgType: 'BLK_CONNECTED',
            blockHash: tipHash,
        });

        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash).to.eql(tipHash);
    });

    it('should failover to third node after second node is stopped', async () => {
        const secondNodeOnly = new ChronikClient([chronikUrls[1]]);
        await expect(secondNodeOnly.blockchainInfo()).to.be.rejectedWith(
            Error,
            'Error connecting to known Chronik instances',
        );

        tipHash = await get_tipHash;

        await expectWsMsgs(1, msgCollector);

        const blockMsg = msgCollector.shift();

        expect(blockMsg).to.include({
            type: 'Block',
            msgType: 'BLK_CONNECTED',
            blockHash: tipHash,
        });

        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash).to.eql(tipHash);
    });

    it('all nodes should be stopped now', async () => {
        const node = new ChronikClient(chronikUrls);
        await expect(node.blockchainInfo()).to.be.rejectedWith(
            Error,
            'Error connecting to known Chronik instances',
        );
    });
});
