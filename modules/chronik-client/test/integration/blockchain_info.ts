// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChildProcess } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { ChronikClientNode } from '../../index';
import initializeTestRunner from '../setup/testRunner';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('/blockchain-info', () => {
    // Define variables used in scope of this test
    let testRunner: ChildProcess;
    let chronik_url: Promise<Array<string>>;
    const statusEvent = new EventEmitter();

    before(async function () {
        // Initialize testRunner before mocha tests
        testRunner = initializeTestRunner('chronik-client_blockchain_info');

        // Handle IPC messages from the setup script
        testRunner.on('message', function (message: any) {
            if (message && message.chronik) {
                console.log('Setting chronik url to ', message.chronik);
                chronik_url = new Promise(resolve => {
                    resolve([message.chronik]);
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

    it('gives us the blockchain info + throws expected error on bad connection', async () => {
        const chronikUrl = await chronik_url;
        const chronik = new ChronikClientNode(chronikUrl);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT);

        // Throws expected error if called on bad server

        // Create a ChronikClientNode instance with a bad server URL
        const badChronik = new ChronikClientNode([`${chronikUrl}5`]);
        await expect(badChronik.blockchainInfo()).to.be.rejectedWith(
            Error,
            'Error connecting to known Chronik instances',
        );
    });
    it('gives us the blockchain info with 10 more blocks', async () => {
        const chronik = new ChronikClientNode(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 10);
    });
    it('gives us the blockchain info with again 10 more blocks', async () => {
        const chronik = new ChronikClientNode(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 20);
    });
    it('gives us the blockchain info after parking the last block', async () => {
        const chronik = new ChronikClientNode(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 19);
    });
    it('gives us the blockchain info after unparking the last block', async () => {
        const chronik = new ChronikClientNode(await chronik_url);
        const blockchainInfo = await chronik.blockchainInfo();
        expect(blockchainInfo.tipHash.length).to.eql(64);
        expect(blockchainInfo.tipHeight).to.eql(REGTEST_CHAIN_INIT_HEIGHT + 20);
    });
});
