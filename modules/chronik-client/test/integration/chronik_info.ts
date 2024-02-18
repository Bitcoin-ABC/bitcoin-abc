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

describe('/chronik-info', () => {
    let testRunner: ChildProcess;
    let chronik_url: Promise<Array<string>>;
    const statusEvent = new EventEmitter();

    before(async () => {
        testRunner = initializeTestRunner('chronik-client_chronik_info');

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

    it('gives us the chronik info and throws expected error on bad server connection', async () => {
        const chronikUrl = await chronik_url;
        const EXPECTED_CHRONIK_VERSION = '0.1.0';
        const chronik = new ChronikClientNode(await chronik_url);
        const chronikInfo = await chronik.chronikInfo();
        expect(chronikInfo.version).to.eql(EXPECTED_CHRONIK_VERSION);

        // Throws expected error if called on bad server

        // Create a ChronikClientNode instance with a bad server URL
        const badChronik = new ChronikClientNode([`${chronikUrl}5`]);
        await expect(badChronik.chronikInfo()).to.be.rejectedWith(
            Error,
            'Error connecting to known Chronik instances',
        );
    });
});
