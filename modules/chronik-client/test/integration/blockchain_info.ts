import { spawn, ChildProcess } from 'node:child_process';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from '../../index';
import { once, EventEmitter } from 'node:events';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('/blockchain-info', () => {
    let testRunner: ChildProcess;
    let chronik_url: Promise<string>;
    const statusEvent = new EventEmitter();

    before(async () => {
        console.log('Starting test_runner');

        testRunner = spawn(
            'python3',
            [
                'test/functional/test_runner.py',
                // Place the setup in the python file
                'setup_scripts/chronik-client_blockchain_info',
            ],
            {
                stdio: ['ipc'],
                // Needs to be set dynamically (by CI ?) and the Bitcoin ABC
                // node has to be built first.
                cwd: process.env.BUILD_DIR || '.',
            },
        );
        // Redirect stdout so we can see the messages from the test runner
        testRunner?.stdout?.pipe(process.stdout);

        testRunner.on('error', function (error) {
            console.log('Test runner error, aborting: ' + error);
            testRunner.kill();
            process.exit(-1);
        });

        testRunner.on('exit', function (code, signal) {
            // The test runner failed, make sure to propagate the error
            if (code !== null && code !== undefined && code != 0) {
                console.log('Test runner completed with code ' + code);
                process.exit(code);
            }

            // The test runner was aborted by a signal, make sure to return an
            // error
            if (signal !== null && signal !== undefined) {
                console.log('Test runner aborted by signal ' + signal);
                process.exit(-2);
            }

            // In all other cases, let the test return its own status as
            // expected
        });

        testRunner.on('spawn', function () {
            console.log('Test runner started');
        });

        testRunner.on('message', function (message: any) {
            if (message && message.chronik) {
                console.log('Setting chronik url to ', message.chronik);
                chronik_url = new Promise(resolve => {
                    resolve(message.chronik);
                });
            }

            if (message && message.status) {
                statusEvent.emit(message.status);
            }
        });
    });

    after(() => {
        testRunner.send('stop');
    });

    beforeEach(async () => {
        await once(statusEvent, 'ready');
    });

    afterEach(() => {
        testRunner.send('next');
    });

    const REGTEST_CHAIN_INIT_HEIGHT = 200;

    it('gives us the blockchain info', async () => {
        const chronik = new ChronikClient(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT);
    });
    it('gives us the blockchain info with 10 more blocks', async () => {
        const chronik = new ChronikClient(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 10);
    });
    it('gives us the blockchain info with again 10 more blocks', async () => {
        const chronik = new ChronikClient(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 20);
    });
    it('gives us the blockchain info after parking the last block', async () => {
        const chronik = new ChronikClient(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 19);
    });
    it('gives us the blockchain info after unparking the last block', async () => {
        const chronik = new ChronikClient(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 20);
    });
});
