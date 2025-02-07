// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { ChronikClient } from 'chronik-client';

import { Ecc } from '../src/ecc.js';
import { shaRmd160 } from '../src/hash.js';
import { fromHex, toHex } from '../src/io/hex.js';
import { Script } from '../src/script.js';
import { ALL_BIP143 } from '../src/sigHashType.js';
import { TestRunner } from '../src/test/testRunner.js';
import {
    ALP_STANDARD,
    alpGenesis,
    alpMint,
    alpSend,
} from '../src/token/alp.js';
import { emppScript } from '../src/token/empp.js';
import { P2PKHSignatory, TxBuilder } from '../src/txBuilder.js';
import '../src/initNodeJs.js';

const NUM_COINS = 500;
const COIN_VALUE = 100000n;

const ALP_TOKEN_TYPE_STANDARD = {
    number: 0,
    protocol: 'ALP',
    type: 'ALP_TOKEN_TYPE_STANDARD',
};

describe('ALP', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    const ecc = new Ecc();

    before(async () => {
        runner = await TestRunner.setup();
        chronik = runner.chronik;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
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

        await runner.sendToScript(50000n, p2pkh1);

        const utxos = await chronik.script('p2pkh', toHex(pkh1)).utxos();
        expect(utxos.utxos.length).to.equal(1);
        const utxo = utxos.utxos[0];

        const txBuildGenesis = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: utxo.outpoint,
                        signData: {
                            sats: utxo.sats,
                            outputScript: p2pkh1,
                        },
                    },
                    signatory: P2PKHSignatory(sk1, pk1, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: emppScript([
                        alpGenesis(
                            ALP_STANDARD,
                            {
                                tokenTicker: 'ALP TOKEN',
                                tokenName: 'ALP Token Name',
                                url: 'https://example.com',
                                data: '01020304',
                                authPubkey: '03040506',
                                decimals: 4,
                            },
                            {
                                atomsArray: [2000n, 2n],
                                numBatons: 1,
                            },
                        ),
                    ]),
                },
                { sats: 10000n, script: p2pkh2 },
                { sats: 10000n, script: p2pkh1 },
                { sats: 10000n, script: p2pkh1 },
            ],
        });
        const genesisTx = txBuildGenesis.sign();
        const genesisTxid = (await chronik.broadcastTx(genesisTx.ser())).txid;
        const tokenId = genesisTxid;

        expect(await chronik.token(genesisTxid)).to.deep.equal({
            tokenId,
            tokenType: ALP_TOKEN_TYPE_STANDARD,
            genesisInfo: {
                tokenTicker: 'ALP TOKEN',
                tokenName: 'ALP Token Name',
                url: 'https://example.com',
                data: '01020304',
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
                sats: 10000n,
                isFinal: false,
                token: {
                    atoms: 2000n,
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
                            sats: 10000n,
                            outputScript: p2pkh1,
                        },
                    },
                    signatory: P2PKHSignatory(sk1, pk1, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: emppScript([
                        alpMint(tokenId, ALP_STANDARD, {
                            atomsArray: [500n],
                            numBatons: 1,
                        }),
                    ]),
                },
                { sats: 546n, script: p2pkh1 },
                { sats: 546n, script: p2pkh3 },
            ],
        });
        const mintTx = txBuildMint.sign();
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
                sats: 546n,
                isFinal: false,
                token: {
                    atoms: 0n,
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
                            sats: 546n,
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
                            sats: 10000n,
                            outputScript: p2pkh2,
                        },
                    },
                    signatory: P2PKHSignatory(sk2, pk2, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: emppScript([
                        alpGenesis(
                            ALP_STANDARD,
                            {},
                            {
                                atomsArray: [100n, 0n],
                                numBatons: 1,
                            },
                        ),
                        // OK to push 01 (not encoded as OP_1)
                        fromHex('01'),
                        alpSend(tokenId, ALP_STANDARD, [0n, 1000n, 0n, 1500n]),
                    ]),
                },
                { sats: 546n, script: p2pkh1 },
                { sats: 546n, script: p2pkh2 },
                { sats: 546n, script: p2pkh3 },
                { sats: 546n, script: p2pkh4 },
            ],
        });
        const multiTx = txBuildMulti.sign();
        const multiTxid = (await chronik.broadcastTx(multiTx.ser())).txid;

        const multiProtoTx = await chronik.tx(multiTxid);
        expect(multiProtoTx).to.deep.equal({
            txid: multiTxid,
            version: 2,
            inputs: [
                {
                    inputScript: toHex(multiTx.inputs[0].script!.bytecode),
                    outputScript: toHex(p2pkh1.bytecode),
                    prevOut: multiTx.inputs[0].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 500n,
                        entryIdx: 1,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    sats: 546n,
                },
                {
                    inputScript: toHex(multiTx.inputs[1].script!.bytecode),
                    outputScript: toHex(p2pkh2.bytecode),
                    prevOut: multiTx.inputs[1].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 2000n,
                        entryIdx: 1,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: toHex(multiTx.outputs[0].script.bytecode),
                },
                {
                    outputScript: toHex(p2pkh1.bytecode),
                    token: {
                        atoms: 100n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: multiTxid,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    sats: 546n,
                },
                {
                    outputScript: toHex(p2pkh2.bytecode),
                    token: {
                        atoms: 1000n,
                        entryIdx: 1,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    sats: 546n,
                },
                {
                    outputScript: toHex(p2pkh3.bytecode),
                    token: {
                        atoms: 0n,
                        entryIdx: 0,
                        isMintBaton: true,
                        tokenId: multiTxid,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    sats: 546n,
                },
                {
                    outputScript: toHex(p2pkh4.bytecode),
                    token: {
                        atoms: 1500n,
                        entryIdx: 1,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1300000000,
            size: multiTx.serSize(),
            isCoinbase: false,
            isFinal: false,
            tokenEntries: [
                {
                    actualBurnAtoms: 0n,
                    burnSummary: '',
                    burnsMintBatons: false,
                    failedColorings: [],
                    intentionalBurnAtoms: 0n,
                    isInvalid: false,
                    tokenId: multiTxid,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    txType: 'GENESIS',
                },
                {
                    actualBurnAtoms: 0n,
                    burnSummary: '',
                    burnsMintBatons: false,
                    failedColorings: [],
                    intentionalBurnAtoms: 0n,
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
