// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
import { ChildProcess, spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import fs from 'node:fs/promises';

import { ChronikClientNode } from 'chronik-client';

import {
    ALL_BIP143,
    Ecc,
    EccWasm,
    OP_1,
    OP_RETURN,
    OutPoint,
    P2PKHSignatory,
    Script,
    Tx,
    TxBuilder,
    fromHex,
    initWasm,
    pushBytesOp,
    shaRmd160,
    toHex,
} from '../src/index.js';
import { emppScript } from '../src/token/empp.js';
import {
    ALP_STANDARD,
    alpGenesis,
    alpMint,
    alpSend,
} from '../src/token/alp.js';

const NUM_COINS = 500;
const COIN_VALUE = 100000;
const OP_TRUE_SCRIPT = Script.fromOps([OP_1]);
const OP_TRUE_SCRIPT_SIG = Script.fromOps([
    pushBytesOp(OP_TRUE_SCRIPT.bytecode),
]);
// Like OP_TRUE_SCRIPT but much bigger to avoid undersize
const ANYONE_SCRIPT = Script.fromOps([pushBytesOp(fromHex('01'.repeat(100)))]);
const ANYONE_SCRIPT_SIG = Script.fromOps([pushBytesOp(ANYONE_SCRIPT.bytecode)]);

const ALP_TOKEN_TYPE_STANDARD = {
    number: 0,
    protocol: 'ALP',
    type: 'ALP_TOKEN_TYPE_STANDARD',
};

describe('TxBuilder', () => {
    let testRunner: ChildProcess;
    let chronik: ChronikClientNode;
    let ecc: Ecc;
    let coinsTxid: string;
    let outputIdx: number = 0;

    function getOutpoint(): OutPoint {
        return {
            txid: coinsTxid,
            outIdx: outputIdx++, // use value, then increment
        };
    }

    async function sendToScript(
        value: number,
        script: Script,
    ): Promise<string> {
        const setupTx = new Tx({
            inputs: [
                {
                    prevOut: getOutpoint(),
                    script: ANYONE_SCRIPT_SIG,
                    sequence: 0xffffffff,
                },
            ],
            outputs: [{ value, script }],
        });
        return (await chronik.broadcastTx(setupTx.ser())).txid;
    }

    before(async () => {
        const statusEvent = new EventEmitter();

        testRunner = spawn(
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
            if (message && message.test_info && message.test_info.chronik) {
                console.log(
                    'Setting chronik url to ',
                    message.test_info.chronik,
                );
                chronik = new ChronikClientNode(message.test_info.chronik);
            }

            if (message && message.status) {
                statusEvent.emit(message.status);
            }
        });

        // Can't use `fetch` for local file so we have to read it using `fs`
        await initWasm(fs.readFile('./src/ffi/ecash_lib_wasm_bg.wasm'));
        ecc = new EccWasm();

        // We got the coins, can fan out now
        await once(statusEvent, 'ready');

        const opTrueScriptHash = shaRmd160(OP_TRUE_SCRIPT.bytecode);
        const utxo = (
            await chronik.script('p2sh', toHex(opTrueScriptHash)).utxos()
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
        for (let i = 0; i < NUM_COINS; ++i) {
            tx.outputs.push({
                value: COIN_VALUE,
                script: anyoneP2sh,
            });
        }
        tx.outputs.push({
            value: 0,
            script: Script.fromOps([OP_RETURN]),
        });
        tx.outputs[tx.outputs.length - 1].value =
            utxo.value - NUM_COINS * COIN_VALUE - tx.serSize();

        coinsTxid = (await chronik.broadcastTx(tx.ser())).txid;
    });

    after(() => {
        testRunner.send('stop');
    });

    it('TxBuilder P2PKH ALP', async () => {
        const sk1 = fromHex('11'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pkh1 = shaRmd160(pk1);
        const p2pkh1 = Script.p2pkh(pkh1);

        const sk2 = fromHex('22'.repeat(32));
        const pk2 = ecc.derivePubkey(sk2);
        const pkh2 = shaRmd160(pk2);
        const p2pkh2 = Script.p2pkh(pkh2);

        const sk3 = fromHex('33'.repeat(32));
        const pk3 = ecc.derivePubkey(sk3);
        const pkh3 = shaRmd160(pk3);
        const p2pkh3 = Script.p2pkh(pkh3);

        const sk4 = fromHex('44'.repeat(32));
        const pk4 = ecc.derivePubkey(sk4);
        const pkh4 = shaRmd160(pk4);
        const p2pkh4 = Script.p2pkh(pkh4);

        await sendToScript(50000, p2pkh1);

        const utxos = await chronik.script('p2pkh', toHex(pkh1)).utxos();
        expect(utxos.utxos.length).to.equal(1);
        const utxo = utxos.utxos[0];

        const txBuildGenesis = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: utxo.outpoint,
                        signData: {
                            value: utxo.value,
                            outputScript: p2pkh1,
                        },
                    },
                    signatory: P2PKHSignatory(sk1, pk1, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: emppScript([
                        alpGenesis(
                            ALP_STANDARD,
                            {
                                tokenTicker: 'ALP TOKEN',
                                tokenName: 'ALP Token Name',
                                url: 'https://example.com',
                                data: fromHex('01020304'),
                                authPubkey: '03040506',
                                decimals: 4,
                            },
                            {
                                amounts: [2000, 2],
                                numBatons: 1,
                            },
                        ),
                    ]),
                },
                { value: 10000, script: p2pkh2 },
                { value: 10000, script: p2pkh1 },
                { value: 10000, script: p2pkh1 },
            ],
        });
        const genesisTx = txBuildGenesis.sign(ecc);
        const genesisTxid = (await chronik.broadcastTx(genesisTx.ser())).txid;
        const tokenId = genesisTxid;

        expect(await chronik.token(genesisTxid)).to.deep.equal({
            tokenId,
            tokenType: ALP_TOKEN_TYPE_STANDARD,
            genesisInfo: {
                tokenTicker: 'ALP TOKEN',
                tokenName: 'ALP Token Name',
                url: 'https://example.com',
                data: fromHex('01020304'),
                authPubkey: '03040506',
                decimals: 4,
            },
            timeFirstSeen: 1300000000,
        });

        const utxos2 = await chronik.script('p2pkh', toHex(pkh2)).utxos();
        expect(utxos2.utxos).to.deep.equal([
            {
                outpoint: {
                    txid: genesisTxid,
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: 10000,
                isFinal: false,
                token: {
                    amount: '2000',
                    isMintBaton: false,
                    tokenId: tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            },
        ]);

        const txBuildMint = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: genesisTxid,
                            outIdx: 3,
                        },
                        signData: {
                            value: 10000,
                            outputScript: p2pkh1,
                        },
                    },
                    signatory: P2PKHSignatory(sk1, pk1, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: emppScript([
                        alpMint(tokenId, ALP_STANDARD, {
                            amounts: [500],
                            numBatons: 1,
                        }),
                    ]),
                },
                { value: 546, script: p2pkh1 },
                { value: 546, script: p2pkh3 },
            ],
        });
        const mintTx = txBuildMint.sign(ecc);
        const mintTxid = (await chronik.broadcastTx(mintTx.ser())).txid;

        const utxos3 = await chronik.script('p2pkh', toHex(pkh3)).utxos();
        expect(utxos3.utxos).to.deep.equal([
            {
                outpoint: {
                    txid: mintTxid,
                    outIdx: 2,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: 546,
                isFinal: false,
                token: {
                    amount: '0',
                    isMintBaton: true,
                    tokenId: tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            },
        ]);

        const txBuildMulti = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: mintTxid,
                            outIdx: 1,
                        },
                        signData: {
                            value: 546,
                            outputScript: p2pkh1,
                        },
                    },
                    signatory: P2PKHSignatory(sk1, pk1, ALL_BIP143),
                },
                {
                    input: {
                        prevOut: {
                            txid: genesisTxid,
                            outIdx: 1,
                        },
                        signData: {
                            value: 10000,
                            outputScript: p2pkh2,
                        },
                    },
                    signatory: P2PKHSignatory(sk2, pk2, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: emppScript([
                        alpGenesis(
                            ALP_STANDARD,
                            {},
                            {
                                amounts: [100, 0],
                                numBatons: 1,
                            },
                        ),
                        // OK to push 01 (not encoded as OP_1)
                        fromHex('01'),
                        alpSend(tokenId, ALP_STANDARD, [0, 1000, 0, 1500]),
                    ]),
                },
                { value: 546, script: p2pkh1 },
                { value: 546, script: p2pkh2 },
                { value: 546, script: p2pkh3 },
                { value: 546, script: p2pkh4 },
            ],
        });
        const multiTx = txBuildMulti.sign(ecc);
        const multiTxid = (await chronik.broadcastTx(multiTx.ser())).txid;

        const multiProtoTx = await chronik.tx(multiTxid);
        expect(multiProtoTx).to.deep.equal({
            txid: multiTxid,
            version: 1,
            inputs: [
                {
                    inputScript: toHex(multiTx.inputs[0].script!.bytecode),
                    outputScript: toHex(p2pkh1.bytecode),
                    prevOut: multiTx.inputs[0].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        amount: '500',
                        entryIdx: 1,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    value: 546,
                },
                {
                    inputScript: toHex(multiTx.inputs[1].script!.bytecode),
                    outputScript: toHex(p2pkh2.bytecode),
                    prevOut: multiTx.inputs[1].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        amount: '2000',
                        entryIdx: 1,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    value: 10000,
                },
            ],
            outputs: [
                {
                    value: 0,
                    outputScript: toHex(multiTx.outputs[0].script.bytecode),
                },
                {
                    outputScript: toHex(p2pkh1.bytecode),
                    token: {
                        amount: '100',
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: multiTxid,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    value: 546,
                },
                {
                    outputScript: toHex(p2pkh2.bytecode),
                    token: {
                        amount: '1000',
                        entryIdx: 1,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    value: 546,
                },
                {
                    outputScript: toHex(p2pkh3.bytecode),
                    token: {
                        amount: '0',
                        entryIdx: 0,
                        isMintBaton: true,
                        tokenId: multiTxid,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    value: 546,
                },
                {
                    outputScript: toHex(p2pkh4.bytecode),
                    token: {
                        amount: '1500',
                        entryIdx: 1,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    value: 546,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1300000000,
            size: multiTx.serSize(),
            isCoinbase: false,
            tokenEntries: [
                {
                    actualBurnAmount: '0',
                    burnSummary: '',
                    burnsMintBatons: false,
                    failedColorings: [],
                    intentionalBurn: '0',
                    isInvalid: false,
                    tokenId: multiTxid,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    txType: 'GENESIS',
                },
                {
                    actualBurnAmount: '0',
                    burnSummary: '',
                    burnsMintBatons: false,
                    failedColorings: [],
                    intentionalBurn: '0',
                    isInvalid: false,
                    tokenId: tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    txType: 'SEND',
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        });
    });
});
