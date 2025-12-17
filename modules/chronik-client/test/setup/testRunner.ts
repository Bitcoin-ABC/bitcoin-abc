// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChildProcess, spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { WsMsgClient } from '../../index';

function initializeTestRunner(testName: string, statusEvent: EventEmitter) {
    // By convention, we name the setup scripts chronik-client_${testName}
    const scriptName = `chronik-client_${testName.split('.')[0]}`;

    console.log(`Starting test_runner for ${scriptName}`);
    const testRunner: ChildProcess = spawn(
        'python3',
        [
            'test/functional/test_runner.py',
            // Place the setup in the python file
            `setup_scripts/${scriptName}`,
        ],
        {
            stdio: ['ipc'],
            // Needs to be set dynamically (by CI ?) and the Bitcoin ABC
            // node has to be built first.
            cwd: process.env.BUILD_DIR || '.',
        },
    );
    // Redirect stdout so we can see the messages from the test runner
    testRunner?.stdout?.pipe(process.stdout as any);

    testRunner.on('error', function (error) {
        console.log(`Test runner error for ${scriptName}, aborting: ` + error);
        testRunner.kill();
        process.exit(-1);
    });

    testRunner.on('exit', function (code, signal) {
        // The test runner failed, make sure to propagate the error
        if (code !== null && code !== undefined && code != 0) {
            console.log(
                `Test runner for ${scriptName} completed with code ` + code,
            );
            process.exit(code);
        }

        // The test runner was aborted by a signal, make sure to return an
        // error
        if (signal !== null && signal !== undefined) {
            console.log(
                `Test runner for ${scriptName} aborted by signal ` + signal,
            );
            process.exit(-2);
        }

        // In all other cases, let the test return its own status as
        // expected
        // Emit a done event so mocha knows we have completed the event
        if (typeof statusEvent !== 'undefined') {
            statusEvent.emit('done', true);
        }
    });

    testRunner.on('spawn', function () {
        console.log(`Test runner for ${scriptName} started`);
    });

    testRunner.on('message', async function (message: any) {
        if (message && message.status) {
            while (!statusEvent.emit(message.status)) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    });

    return testRunner;
}

export interface TestInfo {
    chronik: string;
    setup_script_timeout: number;
}

export function setMochaTimeout(
    mochaInstance: any,
    testName: string,
    testInfo: TestInfo,
    testRunner: ChildProcess,
) {
    const rpcTimeoutSeconds = testInfo.setup_script_timeout;
    // We want to make sure mocha timeout is larger than rpc timeout
    const MOCHA_TIMEOUT_FACTOR = 4;
    const mochaTimeoutSeconds = MOCHA_TIMEOUT_FACTOR * rpcTimeoutSeconds;

    mochaInstance.timeout(`${mochaTimeoutSeconds}s`);
    console.log(`Mocha timeout set to ${mochaTimeoutSeconds} seconds`);

    // In practice, we can't allow a mocha timeout, as it could prevent the child process from exiting
    const TIMEOUT_INTOLERANCE_OFFSET_SECONDS = 5;
    const terminateChildProcessTimeoutMs =
        1000 * (mochaTimeoutSeconds - TIMEOUT_INTOLERANCE_OFFSET_SECONDS);

    // Make sure you kill the child process on mocha timeout
    const setupScriptTermination = setTimeout(() => {
        testRunner.kill();
        console.log(
            `Exited ${testName} test setup after exceeding mocha timeout.`,
        );
        // Exit in error condition
        process.exit(1);
    }, terminateChildProcessTimeoutMs);

    return setupScriptTermination;
}

export async function cleanupMochaRegtest(
    testName: string,
    testRunner: ChildProcess,
    setupScriptTermination: ReturnType<typeof setTimeout>,
    statusEvent: EventEmitter,
) {
    console.log(`${testName} tests complete, shutting down child process`);
    testRunner.send('stop');

    // Cleanup the timeout so we do not hang until it runs
    clearTimeout(setupScriptTermination);

    // Do not exit the tests (to start the next file's tests) until the testRunner has shut down
    await once(statusEvent, 'done');
    console.log(`testRunner complete in ${testName}`);
}

const MSG_WAIT_MSECS = 1000;
export async function expectWsMsgs(
    expectedMsgCount: number,
    msgCollector: WsMsgClient[],
) {
    // Wait for expected ws msg(s)
    while (msgCollector.length < expectedMsgCount) {
        // If we do not receive expected number of msgs, will hit mocha timeout
        await new Promise(resolve => setTimeout(resolve, MSG_WAIT_MSECS));
    }
    return;
}

export default initializeTestRunner;
