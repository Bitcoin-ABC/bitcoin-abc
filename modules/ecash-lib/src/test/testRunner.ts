// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { ChronikClient } from 'chronik-client';
import type { ChildProcess } from 'node:child_process';

import { shaRmd160 } from '../hash.js';
import { fromHex, toHex } from '../io/hex.js';
import { pushBytesOp } from '../op.js';
import { OP_1, OP_RETURN } from '../opcode.js';
import { Script } from '../script.js';
import { OutPoint, Tx } from '../tx.js';
import { TxBuilder } from '../txBuilder.js';

const OP_TRUE_SCRIPT = Script.fromOps([OP_1]);
const OP_TRUE_SCRIPT_SIG = Script.fromOps([
    pushBytesOp(OP_TRUE_SCRIPT.bytecode),
]);
// Like OP_TRUE_SCRIPT but much bigger to avoid undersize
const ANYONE_SCRIPT = Script.fromOps([pushBytesOp(fromHex('01'.repeat(100)))]);
const ANYONE_SCRIPT_SIG = Script.fromOps([pushBytesOp(ANYONE_SCRIPT.bytecode)]);

export class TestRunner {
    public runner: ChildProcess;
    public chronik: ChronikClient;
    private coinsTxid: string | undefined;
    private coinValue: bigint | undefined;
    private lastUsedOutIdx: number;

    private constructor(runner: ChildProcess, chronik: ChronikClient) {
        this.runner = runner;
        this.chronik = chronik;
        this.coinsTxid = undefined;
        this.lastUsedOutIdx = 0;
    }

    public static async setup(
        setupScript: string = 'setup_scripts/ecash-lib_base',
    ): Promise<TestRunner> {
        const { ChronikClient } = await import('chronik-client');
        const { spawn } = await import('node:child_process');
        const events = await import('node:events');
        const statusEvent = new events.EventEmitter();

        const runner = spawn(
            'python3',
            [
                'test/functional/test_runner.py',
                // Place the setup in the python file
                setupScript,
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

        let chronik: ChronikClient | undefined = undefined;
        runner.on('message', async function (message: any) {
            if (message && message.test_info && message.test_info.chronik) {
                console.log(
                    'Setting chronik url to ',
                    message.test_info.chronik,
                );
                chronik = new ChronikClient(message.test_info.chronik);
            }

            if (message && message.status) {
                while (!statusEvent.emit(message.status)) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        });

        // We got the coins, can fan out now
        await (events as any).once(statusEvent, 'ready');

        if (chronik === undefined) {
            throw new Event('Chronik is undefined');
        }

        return new TestRunner(runner, chronik);
    }

    public async setupCoins(
        numCoins: number,
        coinValue: bigint,
    ): Promise<void> {
        const opTrueScriptHash = shaRmd160(OP_TRUE_SCRIPT.bytecode);
        const utxos = (
            await this.chronik.script('p2sh', toHex(opTrueScriptHash)).utxos()
        ).utxos;
        const anyoneScriptHash = shaRmd160(ANYONE_SCRIPT.bytecode);
        const anyoneP2sh = Script.p2sh(anyoneScriptHash);
        const tx = new Tx({
            inputs: utxos.map(utxo => ({
                prevOut: utxo.outpoint,
                script: OP_TRUE_SCRIPT_SIG,
                sequence: 0xffffffff,
            })),
        });
        const utxosValue = utxos.reduce((a, b) => a + b.sats, 0n);
        for (let i = 0; i < numCoins; ++i) {
            tx.outputs.push({
                sats: coinValue,
                script: anyoneP2sh,
            });
        }
        tx.outputs.push({
            sats: 0n,
            script: Script.fromOps([OP_RETURN]),
        });
        tx.outputs[tx.outputs.length - 1].sats =
            utxosValue - BigInt(numCoins) * coinValue - BigInt(tx.serSize());

        this.coinsTxid = (await this.chronik.broadcastTx(tx.ser())).txid;
        this.coinValue = coinValue;
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

    public async sendToScript(
        sats: bigint | bigint[],
        script: Script,
    ): Promise<string> {
        const coinValue = this.coinValue!;
        const satsArr = Array.isArray(sats) ? sats : [sats];
        const setupTxBuilder = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: this.getOutpoint(),
                        script: ANYONE_SCRIPT_SIG,
                        sequence: 0xffffffff,
                        signData: {
                            sats: coinValue,
                        },
                    },
                },
            ],
            outputs: [
                ...satsArr.map(sats => ({ sats, script })),
                Script.fromOps([OP_RETURN]), // burn leftover
            ],
        });
        const setupTx = setupTxBuilder.sign({
            feePerKb: 1000n,
            dustSats: 546n,
        });
        return (await this.chronik.broadcastTx(setupTx.ser())).txid;
    }

    /**
     * Fund two addresses with sats
     * Specifically for assigning sats to the maker and taker
     * of an agora offer, it is not generalized for 'n' scripts
     */
    public async sendToTwoScripts(
        maker: { script: Script; sats: bigint },
        taker: { script: Script; sats: bigint },
    ): Promise<string> {
        const coinValue = this.coinValue!;
        const setupTxBuilder = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: this.getOutpoint(),
                        script: ANYONE_SCRIPT_SIG,
                        sequence: 0xffffffff,
                        signData: {
                            sats: coinValue,
                        },
                    },
                },
            ],
            outputs: [
                { sats: maker.sats, script: maker.script },
                { sats: taker.sats, script: taker.script },
                Script.fromOps([OP_RETURN]), // burn leftover
            ],
        });
        const setupTx = setupTxBuilder.sign({
            feePerKb: 1000n,
            dustSats: 546n,
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
