// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { ChronikClientNode } from 'chronik-client';
import type { ChildProcess } from 'node:child_process';

import { Ecc, EccWasm } from '../ecc.js';
import { shaRmd160 } from '../hash.js';
import { initWasm } from '../init.js';
import { fromHex, toHex } from '../io/hex.js';
import { pushBytesOp } from '../op.js';
import { OP_1, OP_RETURN } from '../opcode.js';
import { Script } from '../script.js';
import { OutPoint, Tx } from '../tx.js';

const OP_TRUE_SCRIPT = Script.fromOps([OP_1]);
const OP_TRUE_SCRIPT_SIG = Script.fromOps([
    pushBytesOp(OP_TRUE_SCRIPT.bytecode),
]);
// Like OP_TRUE_SCRIPT but much bigger to avoid undersize
const ANYONE_SCRIPT = Script.fromOps([pushBytesOp(fromHex('01'.repeat(100)))]);
const ANYONE_SCRIPT_SIG = Script.fromOps([pushBytesOp(ANYONE_SCRIPT.bytecode)]);

export class TestRunner {
    public ecc: Ecc;
    public runner: ChildProcess;
    public chronik: ChronikClientNode;
    private coinsTxid: string | undefined;
    private lastUsedOutIdx: number;

    private constructor(
        ecc: Ecc,
        runner: ChildProcess,
        chronik: ChronikClientNode,
    ) {
        this.ecc = ecc;
        this.runner = runner;
        this.chronik = chronik;
        this.coinsTxid = undefined;
        this.lastUsedOutIdx = 0;
    }

    public static async setup(): Promise<TestRunner> {
        const { ChronikClientNode } = await import('chronik-client');
        const { spawn } = await import('node:child_process');
        const events = await import('node:events');
        const statusEvent = new events.EventEmitter();

        const runner = spawn(
            'python3',
            [
                'test/functional/test_runner.py',
                // Place the setup in the python file
                'setup_scripts/ecash-lib_base',
            ],
            {
                stdio: ['ipc'],
                // Needs to be set dynamically and the Bitcoin ABC
                // node has to be built first.
                cwd: process.env.BUILD_DIR || '.',
            },
        );

        // Redirect stdout so we can see the messages from the test runner
        runner.stdout?.pipe(process.stdout);
        runner.stderr?.pipe(process.stderr);

        runner.on('error', function (error) {
            console.log('Test runner error, aborting: ' + error);
            runner.kill();
            process.exit(-1);
        });

        runner.on('exit', function (code, signal) {
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

        runner.on('spawn', function () {
            console.log('Test runner started');
        });

        let chronik: ChronikClientNode | undefined = undefined;
        runner.on('message', async function (message: any) {
            if (message && message.test_info && message.test_info.chronik) {
                console.log(
                    'Setting chronik url to ',
                    message.test_info.chronik,
                );
                chronik = new ChronikClientNode(message.test_info.chronik);
            }

            if (message && message.status) {
                while (!statusEvent.emit(message.status)) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        });

        await initWasm();
        const ecc = new EccWasm();

        // We got the coins, can fan out now
        await (events as any).once(statusEvent, 'ready');

        if (chronik === undefined) {
            throw new Event('Chronik is undefined');
        }

        return new TestRunner(ecc, runner, chronik);
    }

    public async setupCoins(
        numCoins: number,
        coinValue: number,
    ): Promise<void> {
        const opTrueScriptHash = shaRmd160(OP_TRUE_SCRIPT.bytecode);
        const utxo = (
            await this.chronik.script('p2sh', toHex(opTrueScriptHash)).utxos()
        ).utxos[0];
        const anyoneScriptHash = shaRmd160(ANYONE_SCRIPT.bytecode);
        const anyoneP2sh = Script.p2sh(anyoneScriptHash);
        const tx = new Tx({
            inputs: [
                {
                    prevOut: utxo.outpoint,
                    script: OP_TRUE_SCRIPT_SIG,
                    sequence: 0xffffffff,
                },
            ],
        });
        for (let i = 0; i < numCoins; ++i) {
            tx.outputs.push({
                value: coinValue,
                script: anyoneP2sh,
            });
        }
        tx.outputs.push({
            value: 0,
            script: Script.fromOps([OP_RETURN]),
        });
        tx.outputs[tx.outputs.length - 1].value =
            utxo.value - numCoins * coinValue - tx.serSize();

        this.coinsTxid = (await this.chronik.broadcastTx(tx.ser())).txid;
    }

    public getOutpoint(): OutPoint {
        if (this.coinsTxid === undefined) {
            throw new Error('TestRunner.coinsTxid undefined, call setupCoins');
        }
        return {
            txid: this.coinsTxid,
            outIdx: this.lastUsedOutIdx++, // use value, then increment
        };
    }

    public async sendToScript(value: number, script: Script): Promise<string> {
        const setupTx = new Tx({
            inputs: [
                {
                    prevOut: this.getOutpoint(),
                    script: ANYONE_SCRIPT_SIG,
                    sequence: 0xffffffff,
                },
            ],
            outputs: [{ value, script }],
        });
        return (await this.chronik.broadcastTx(setupTx.ser())).txid;
    }

    public generate() {
        this.runner.send('generate');
    }

    public stop() {
        this.runner.send('stop');
    }
}
