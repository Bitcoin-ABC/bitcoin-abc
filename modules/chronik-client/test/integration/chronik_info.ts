// Copyright (c) 2023-2024 The Bitcoin developers
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

describe('/chronik-info', () => {
    // Define variables used in scope of this test
    const testName = path.basename(__filename);
    let testRunner: ChildProcess;
    const statusEvent = new EventEmitter();
    let get_test_info: Promise<TestInfo>;
    let chronikUrl: string[];
    let setupScriptTermination: ReturnType<typeof setTimeout>;
    let get_chronik_version: Promise<{ [key: string]: string }>;

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

            if (message && message.chronik_version) {
                get_chronik_version = new Promise(resolve => {
                    resolve(message.chronik_version);
                });
            }
        });

        await once(statusEvent, 'ready');

        const testInfo = await get_test_info;

        chronikUrl = [testInfo.chronik];
        console.log(`chronikUrl set to ${JSON.stringify(chronikUrl)}`);

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

    it('gives us the chronik info and throws expected error on bad server connection', async () => {
        const chronikVersion = await get_chronik_version;
        const chronik = new ChronikClient(chronikUrl);
        const chronikInfo = await chronik.chronikInfo();
        expect(chronikInfo.version).to.eql(chronikVersion);

        // Throws expected error if called on bad server

        // Create a ChronikClient instance with a bad server URL
        const badChronik = new ChronikClient([`${chronikUrl}5`]);
        await expect(badChronik.chronikInfo()).to.be.rejectedWith(
            Error,
            'Error connecting to known Chronik instances',
        );
    });
});
