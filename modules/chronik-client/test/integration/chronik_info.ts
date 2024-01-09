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

    it('gives us the chronik info', async () => {
        const EXPECTED_CHRONIK_VERSION = '0.1.0';
        const chronik = new ChronikClientNode(await chronik_url);
        const chronikInfo = await chronik.chronikInfo();
        expect(chronikInfo.version).to.eql(EXPECTED_CHRONIK_VERSION);
    });
});
