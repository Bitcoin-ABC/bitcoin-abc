// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { ChronikClient } from 'chronik-client';
import { EventEmitter, once } from 'node:events';

import { Ecc } from '../src/ecc.js';
import { shaRmd160 } from '../src/hash.js';
import { fromHex, toHex } from '../src/io/hex.js';
import { pushBytesOp } from '../src/op.js';
import { OP_10 } from '../src/opcode.js';
import { Script } from '../src/script.js';
import { ALL_BIP143 } from '../src/sigHashType.js';
import { TestRunner } from '../src/test/testRunner.js';
import {
    SLP_FUNGIBLE,
    SLP_MINT_VAULT,
    SLP_NFT1_CHILD,
    SLP_NFT1_GROUP,
    slpBurn,
    slpGenesis,
    slpMint,
    slpMintVault,
    slpSend,
} from '../src/token/slp.js';
import { P2PKHSignatory, TxBuilder } from '../src/txBuilder.js';
import '../src/initNodeJs.js';

const NUM_COINS = 500;
const COIN_VALUE = 100000n;

const SLP_TOKEN_TYPE_FUNGIBLE = {
    number: 1,
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
};

const SLP_TOKEN_TYPE_MINT_VAULT = {
    number: 2,
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_MINT_VAULT',
};

const SLP_TOKEN_TYPE_NFT1_GROUP = {
    number: 0x81,
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
};

const SLP_TOKEN_TYPE_NFT1_CHILD = {
    number: 0x41,
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
};

describe('SLP Integration Test', () => {
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

    it('TxBuilder P2PKH SLP FUNGIBLE', async () => {
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
                    script: slpGenesis(
                        SLP_FUNGIBLE,
                        {
                            tokenTicker: 'SLP FUNGIBLE TOKEN',
                            tokenName: 'SLP Fungible Token Name',
                            url: 'https://example.com/fungible',
                            hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
                            decimals: 4,
                        },
                        2000n,
                        2,
                    ),
                },
                { sats: 10000n, script: p2pkh2 },
                { sats: 10000n, script: p2pkh1 },
            ],
        });
        const genesisTx = txBuildGenesis.sign();
        const genesisTxid = (await chronik.broadcastTx(genesisTx.ser())).txid;
        const tokenId = genesisTxid;

        expect(await chronik.token(genesisTxid)).to.deep.equal({
            tokenId,
            tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
            genesisInfo: {
                tokenTicker: 'SLP FUNGIBLE TOKEN',
                tokenName: 'SLP Fungible Token Name',
                url: 'https://example.com/fungible',
                hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            },
        ]);

        const txBuildMint = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: genesisTxid,
                            outIdx: 2,
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
                    script: slpMint(tokenId, SLP_FUNGIBLE, 500n, 2),
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
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            },
        ]);

        const txBuildSend = new TxBuilder({
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
                    script: slpSend(tokenId, SLP_FUNGIBLE, [1000n, 1500n]),
                },
                { sats: 546n, script: p2pkh2 },
                { sats: 546n, script: p2pkh4 },
            ],
        });
        const sendTx = txBuildSend.sign();
        const sendTxid = (await chronik.broadcastTx(sendTx.ser())).txid;

        const sendProtoTx = await chronik.tx(sendTxid);
        expect(sendProtoTx).to.deep.equal({
            txid: sendTxid,
            version: 2,
            inputs: [
                {
                    inputScript: toHex(sendTx.inputs[0].script!.bytecode),
                    outputScript: toHex(p2pkh1.bytecode),
                    prevOut: sendTx.inputs[0].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 500n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                    sats: 546n,
                },
                {
                    inputScript: toHex(sendTx.inputs[1].script!.bytecode),
                    outputScript: toHex(p2pkh2.bytecode),
                    prevOut: sendTx.inputs[1].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 2000n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: toHex(sendTx.outputs[0].script.bytecode),
                },
                {
                    outputScript: toHex(p2pkh2.bytecode),
                    token: {
                        atoms: 1000n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                    sats: 546n,
                },
                {
                    outputScript: toHex(p2pkh4.bytecode),
                    token: {
                        atoms: 1500n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1300000000,
            size: sendTx.serSize(),
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
                    tokenId: tokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    txType: 'SEND',
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        });

        const txBuildBurn = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: sendTxid,
                            outIdx: 1,
                        },
                        signData: {
                            sats: 546n,
                            outputScript: p2pkh2,
                        },
                    },
                    signatory: P2PKHSignatory(sk2, pk2, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: slpBurn(tokenId, SLP_FUNGIBLE, 1000n),
                },
            ],
        });
        const burnTx = txBuildBurn.sign();
        const burnTxid = (await chronik.broadcastTx(burnTx.ser())).txid;
        const burnProtoTx = await chronik.tx(burnTxid);
        expect(burnProtoTx).to.deep.equal({
            txid: burnTxid,
            version: 2,
            inputs: [
                {
                    inputScript: toHex(burnTx.inputs[0].script!.bytecode),
                    outputScript: toHex(p2pkh2.bytecode),
                    prevOut: burnTx.inputs[0].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 1000n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: toHex(burnTx.outputs[0].script.bytecode),
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1300000000,
            size: burnTx.serSize(),
            isCoinbase: false,
            isFinal: false,
            tokenEntries: [
                {
                    actualBurnAtoms: 1000n,
                    burnSummary: '',
                    burnsMintBatons: false,
                    failedColorings: [],
                    intentionalBurnAtoms: 1000n,
                    isInvalid: false,
                    tokenId: tokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    txType: 'BURN',
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        });
    });

    it('TxBuilder P2PKH SLP MINT VAULT', async () => {
        const sk1 = fromHex('55'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pkh1 = shaRmd160(pk1);
        const p2pkh1 = Script.p2pkh(pkh1);

        const sk2 = fromHex('66'.repeat(32));
        const pk2 = ecc.derivePubkey(sk2);
        const pkh2 = shaRmd160(pk2);
        const p2pkh2 = Script.p2pkh(pkh2);

        const sk3 = fromHex('77'.repeat(32));
        const pk3 = ecc.derivePubkey(sk3);
        const pkh3 = shaRmd160(pk3);
        const p2pkh3 = Script.p2pkh(pkh3);

        const sk4 = fromHex('88'.repeat(32));
        const pk4 = ecc.derivePubkey(sk4);
        const pkh4 = shaRmd160(pk4);
        const p2pkh4 = Script.p2pkh(pkh4);

        const mintVaultScript = Script.fromOps([OP_10]);
        const mintVaultScripthash = shaRmd160(mintVaultScript.bytecode);
        const mintVaultP2sh = Script.p2sh(mintVaultScripthash);

        const wsBlocks = new EventEmitter();
        const ws = chronik.ws({
            onMessage: msg => {
                if (msg.type == 'Block') {
                    wsBlocks.emit(msg.msgType);
                }
            },
        });
        await ws.waitForOpen();
        ws.subscribeToBlocks();

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
                    script: slpGenesis(
                        SLP_MINT_VAULT,
                        {
                            tokenTicker: 'SLP MINT VAULT TOKEN',
                            tokenName: 'SLP MINT Vault Token Name',
                            url: 'https://example.com/mintvault',
                            hash: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
                            mintVaultScripthash: toHex(mintVaultScripthash),
                            decimals: 4,
                        },
                        2000n,
                    ),
                },
                { sats: 10000n, script: p2pkh2 },
            ],
        });
        const genesisTx = txBuildGenesis.sign();
        const genesisTxid = (await chronik.broadcastTx(genesisTx.ser())).txid;
        const tokenId = genesisTxid;

        expect(await chronik.token(genesisTxid)).to.deep.equal({
            tokenId,
            tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
            genesisInfo: {
                tokenTicker: 'SLP MINT VAULT TOKEN',
                tokenName: 'SLP MINT Vault Token Name',
                url: 'https://example.com/mintvault',
                hash: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
                mintVaultScripthash: toHex(mintVaultScripthash),
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
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            },
        ]);

        // MINT VAULT GENESIS has to be mined
        runner.generate();
        await once(wsBlocks, 'BLK_CONNECTED');

        const mintVaultTxid = await runner.sendToScript(50000n, mintVaultP2sh);

        const txBuildMint = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: mintVaultTxid,
                            outIdx: 0,
                        },
                        script: Script.fromOps([
                            pushBytesOp(mintVaultScript.bytecode),
                        ]),
                    },
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: slpMintVault(tokenId, [500n, 600n]),
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
                    atoms: 600n,
                    isMintBaton: false,
                    tokenId: tokenId,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            },
        ]);

        const txBuildSend = new TxBuilder({
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
                    script: slpSend(tokenId, SLP_MINT_VAULT, [1000n, 1500n]),
                },
                { sats: 546n, script: p2pkh2 },
                { sats: 546n, script: p2pkh4 },
            ],
        });
        const sendTx = txBuildSend.sign();
        const sendTxid = (await chronik.broadcastTx(sendTx.ser())).txid;

        const sendProtoTx = await chronik.tx(sendTxid);
        expect(sendProtoTx).to.deep.equal({
            txid: sendTxid,
            version: 2,
            inputs: [
                {
                    inputScript: toHex(sendTx.inputs[0].script!.bytecode),
                    outputScript: toHex(p2pkh1.bytecode),
                    prevOut: sendTx.inputs[0].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 500n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                    },
                    sats: 546n,
                },
                {
                    inputScript: toHex(sendTx.inputs[1].script!.bytecode),
                    outputScript: toHex(p2pkh2.bytecode),
                    prevOut: sendTx.inputs[1].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 2000n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                    },
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: toHex(sendTx.outputs[0].script.bytecode),
                },
                {
                    outputScript: toHex(p2pkh2.bytecode),
                    token: {
                        atoms: 1000n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                    },
                    sats: 546n,
                },
                {
                    outputScript: toHex(p2pkh4.bytecode),
                    token: {
                        atoms: 1500n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1300000000,
            size: sendTx.serSize(),
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
                    tokenId: tokenId,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                    txType: 'SEND',
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        });
    });

    it('TxBuilder P2PKH SLP NFT1', async () => {
        const sk1 = fromHex('99'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pkh1 = shaRmd160(pk1);
        const p2pkh1 = Script.p2pkh(pkh1);

        const sk2 = fromHex('aa'.repeat(32));
        const pk2 = ecc.derivePubkey(sk2);
        const pkh2 = shaRmd160(pk2);
        const p2pkh2 = Script.p2pkh(pkh2);

        const sk3 = fromHex('bb'.repeat(32));
        const pk3 = ecc.derivePubkey(sk3);
        const pkh3 = shaRmd160(pk3);
        const p2pkh3 = Script.p2pkh(pkh3);

        const sk4 = fromHex('cc'.repeat(32));
        const pk4 = ecc.derivePubkey(sk4);
        const pkh4 = shaRmd160(pk4);
        const p2pkh4 = Script.p2pkh(pkh4);

        await runner.sendToScript(50000n, p2pkh1);

        const utxos = await chronik.script('p2pkh', toHex(pkh1)).utxos();
        expect(utxos.utxos.length).to.equal(1);
        const utxo = utxos.utxos[0];

        const txBuildGenesisGroup = new TxBuilder({
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
                    script: slpGenesis(
                        SLP_NFT1_GROUP,
                        {
                            tokenTicker: 'SLP NFT1 TOKEN',
                            tokenName: 'SLP NFT1 Token Name',
                            url: 'https://example.com/nft1',
                            hash: '000111222333444555666777888999aaabbbcccdddeeefff0001112223334444',
                            decimals: 4,
                        },
                        2000n,
                        2,
                    ),
                },
                { sats: 10000n, script: p2pkh2 },
                { sats: 10000n, script: p2pkh1 },
            ],
        });
        const genesisTx = txBuildGenesisGroup.sign();
        const genesisTxid = (await chronik.broadcastTx(genesisTx.ser())).txid;
        const tokenId = genesisTxid;

        expect(await chronik.token(genesisTxid)).to.deep.equal({
            tokenId,
            tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
            genesisInfo: {
                tokenTicker: 'SLP NFT1 TOKEN',
                tokenName: 'SLP NFT1 Token Name',
                url: 'https://example.com/nft1',
                hash: '000111222333444555666777888999aaabbbcccdddeeefff0001112223334444',
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
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            },
        ]);

        const txBuildMint = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: genesisTxid,
                            outIdx: 2,
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
                    script: slpMint(tokenId, SLP_NFT1_GROUP, 500n, 2),
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
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            },
        ]);

        const txBuildSend = new TxBuilder({
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
                    script: slpSend(tokenId, SLP_NFT1_GROUP, [1n, 2499n]),
                },
                { sats: 8000n, script: p2pkh2 },
                { sats: 546n, script: p2pkh4 },
            ],
        });
        const sendTx = txBuildSend.sign();
        const sendTxid = (await chronik.broadcastTx(sendTx.ser())).txid;

        const sendProtoTx = await chronik.tx(sendTxid);
        expect(sendProtoTx).to.deep.equal({
            txid: sendTxid,
            version: 2,
            inputs: [
                {
                    inputScript: toHex(sendTx.inputs[0].script!.bytecode),
                    outputScript: toHex(p2pkh1.bytecode),
                    prevOut: sendTx.inputs[0].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 500n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    },
                    sats: 546n,
                },
                {
                    inputScript: toHex(sendTx.inputs[1].script!.bytecode),
                    outputScript: toHex(p2pkh2.bytecode),
                    prevOut: sendTx.inputs[1].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 2000n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    },
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: toHex(sendTx.outputs[0].script.bytecode),
                },
                {
                    outputScript: toHex(p2pkh2.bytecode),
                    token: {
                        atoms: 1n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    },
                    sats: 8000n,
                },
                {
                    outputScript: toHex(p2pkh4.bytecode),
                    token: {
                        atoms: 2499n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: tokenId,
                        tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1300000000,
            size: sendTx.serSize(),
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
                    tokenId: tokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    txType: 'SEND',
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        });

        const txBuildGenesisChild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: sendTxid,
                            outIdx: 1,
                        },
                        signData: {
                            sats: 8000n,
                            outputScript: p2pkh2,
                        },
                    },
                    signatory: P2PKHSignatory(sk2, pk2, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: slpGenesis(
                        SLP_NFT1_CHILD,
                        {
                            tokenTicker: 'SLP NFT1 CHILD TOKEN',
                            tokenName: 'SLP NFT1 Child Token Name',
                            url: 'https://example.com/nft1child',
                            hash: '0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff',
                            decimals: 0,
                        },
                        1n,
                    ),
                },
                { sats: 6000n, script: p2pkh1 },
            ],
        });
        const genesisChildTx = txBuildGenesisChild.sign();
        const genesisChildTxid = (
            await chronik.broadcastTx(genesisChildTx.ser())
        ).txid;
        const childTokenId = genesisChildTxid;

        expect(await chronik.token(childTokenId)).to.deep.equal({
            tokenId: childTokenId,
            tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
            genesisInfo: {
                tokenTicker: 'SLP NFT1 CHILD TOKEN',
                tokenName: 'SLP NFT1 Child Token Name',
                url: 'https://example.com/nft1child',
                hash: '0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff',
                decimals: 0,
            },
            timeFirstSeen: 1300000000,
        });

        const txBuildChildSend = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: genesisChildTxid,
                            outIdx: 1,
                        },
                        signData: {
                            sats: 6000n,
                            outputScript: p2pkh1,
                        },
                    },
                    signatory: P2PKHSignatory(sk1, pk1, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [0n, 1n]),
                },
                { sats: 546n, script: p2pkh2 },
                { sats: 546n, script: p2pkh4 },
            ],
        });
        const childSendTx = txBuildChildSend.sign();
        const childSendTxid = (await chronik.broadcastTx(childSendTx.ser()))
            .txid;

        const childSendProtoTx = await chronik.tx(childSendTxid);
        expect(childSendProtoTx).to.deep.equal({
            txid: childSendTxid,
            version: 2,
            inputs: [
                {
                    inputScript: toHex(childSendTx.inputs[0].script!.bytecode),
                    outputScript: toHex(p2pkh1.bytecode),
                    prevOut: childSendTx.inputs[0].prevOut,
                    sequenceNo: 0xffffffff,
                    token: {
                        atoms: 1n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: childTokenId,
                        tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    },
                    sats: 6000n,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: toHex(childSendTx.outputs[0].script.bytecode),
                },
                {
                    outputScript: toHex(p2pkh2.bytecode),
                    sats: 546n,
                },
                {
                    outputScript: toHex(p2pkh4.bytecode),
                    token: {
                        atoms: 1n,
                        entryIdx: 0,
                        isMintBaton: false,
                        tokenId: childTokenId,
                        tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1300000000,
            size: childSendTx.serSize(),
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
                    tokenId: childTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    groupTokenId: tokenId,
                    txType: 'SEND',
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        });
    });
});
