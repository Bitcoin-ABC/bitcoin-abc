// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChildProcess, spawn } from 'node:child_process';

function initializeTestRunner(scriptName: string) {
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
    testRunner?.stdout?.pipe(process.stdout);

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
    });

    testRunner.on('spawn', function () {
        console.log(`Test runner for ${scriptName} started`);
    });

    return testRunner;
}

export default initializeTestRunner;
