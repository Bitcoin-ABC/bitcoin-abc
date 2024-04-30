// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, assert, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClientNode } from 'chronik-client';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import {
    ALL_BIP143,
    Ecc,
    P2PKHSignatory,
    SLP_NFT1_CHILD,
    SLP_NFT1_GROUP,
    Script,
    TxBuilder,
    TxOutput,
    fromHex,
    initWasm,
    shaRmd160,
    slpGenesis,
    slpSend,
    toHex,
} from 'ecash-lib';
import {
    AgoraOneshot,
    AgoraOneshotCancelSignatory,
    AgoraOneshotSignatory,
} from '../src/oneshot.js';

use(chaiAsPromised);

const NUM_COINS = 500;
const COIN_VALUE = 100000;

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

describe('SLP', () => {
    let runner: TestRunner;
    let chronik: ChronikClientNode;
    let ecc: Ecc;

    before(async () => {
        runner = await TestRunner.setup();
        chronik = runner.chronik;
        ecc = runner.ecc;
        await initWasm();
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('SLP NFT1 Agora Oneshot', async () => {
        // Tests the Agora Oneshot Script using SLP NFT1 tokens:
        // 1. Seller creates an NFT1 GROUP token
        // 2. Seller creates an NFT1 CHILD token using the group token
        // 3. Seller sends the NFT to an Agora Oneshot covenant that asks for 80000 sats
        // 4. Buyer attempts to buy the NFT using 79999 sats, which is rejected
        // 5. Seller cancels the trade and changes the price to 70000 sats
        // 6. Buyer successfully buys the NFT for 70000 sats

        const sellerSk = fromHex('11'.repeat(32));
        const sellerPk = ecc.derivePubkey(sellerSk);
        const sellerPkh = shaRmd160(sellerPk);
        const sellerP2pkh = Script.p2pkh(sellerPkh);

        const buyerSk = fromHex('22'.repeat(32));
        const buyerPk = ecc.derivePubkey(buyerSk);
        const buyerPkh = shaRmd160(buyerPk);
        const buyerP2pkh = Script.p2pkh(buyerPkh);

        await runner.sendToScript(50000, sellerP2pkh);

        const utxos = await chronik.script('p2pkh', toHex(sellerPkh)).utxos();
        expect(utxos.utxos.length).to.equal(1);
        const utxo = utxos.utxos[0];

        // 1. Seller creates an NFT1 GROUP token
        const txBuildGenesisGroup = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: utxo.outpoint,
                        signData: {
                            value: utxo.value,
                            outputScript: sellerP2pkh,
                        },
                    },
                    signatory: P2PKHSignatory(sellerSk, sellerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: slpGenesis(
                        SLP_NFT1_GROUP,
                        {
                            tokenTicker: 'SLP NFT1 GROUP TOKEN',
                            decimals: 4,
                        },
                        1,
                    ),
                },
                { value: 10000, script: sellerP2pkh },
            ],
        });
        const genesisTx = txBuildGenesisGroup.sign(ecc);
        const genesisTxid = (await chronik.broadcastTx(genesisTx.ser())).txid;
        const tokenId = genesisTxid;

        expect(await chronik.token(genesisTxid)).to.deep.equal({
            tokenId,
            tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
            genesisInfo: {
                tokenTicker: 'SLP NFT1 GROUP TOKEN',
                tokenName: '',
                url: '',
                hash: '',
                decimals: 4,
            },
            timeFirstSeen: 1300000000,
        });

        // 2. Seller creates an NFT1 CHILD token using the group token
        const txBuildGenesisChild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: genesisTxid,
                            outIdx: 1,
                        },
                        signData: {
                            value: 10000,
                            outputScript: sellerP2pkh,
                        },
                    },
                    signatory: P2PKHSignatory(sellerSk, sellerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: slpGenesis(
                        SLP_NFT1_CHILD,
                        {
                            tokenTicker: 'SLP NFT1 CHILD TOKEN',
                            decimals: 0,
                        },
                        1,
                    ),
                },
                { value: 8000, script: sellerP2pkh },
            ],
        });
        const genesisChildTx = txBuildGenesisChild.sign(ecc);
        const genesisChildTxid = (
            await chronik.broadcastTx(genesisChildTx.ser())
        ).txid;
        const childTokenId = genesisChildTxid;

        expect(await chronik.token(childTokenId)).to.deep.equal({
            tokenId: childTokenId,
            tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
            genesisInfo: {
                tokenTicker: 'SLP NFT1 CHILD TOKEN',
                tokenName: '',
                url: '',
                hash: '',
                decimals: 0,
            },
            timeFirstSeen: 1300000000,
        });

        // 3. Seller sends the NFT to an Agora Oneshot covenant that asks for 80000 sats
        const enforcedOutputs: TxOutput[] = [
            { value: 0, script: slpSend(childTokenId, SLP_NFT1_CHILD, [0, 1]) },
            { value: 80000, script: sellerP2pkh },
        ];
        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs,
            cancelPk: sellerPk,
        });
        const agoraScript = agoraOneshot.script();
        const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));
        const txBuildOffer = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: genesisChildTxid,
                            outIdx: 1,
                        },
                        signData: {
                            value: 8000,
                            outputScript: sellerP2pkh,
                        },
                    },
                    signatory: P2PKHSignatory(sellerSk, sellerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [1]),
                },
                { value: 546, script: agoraP2sh },
            ],
        });
        const offerTx = txBuildOffer.sign(ecc);
        const offerTxid = (await chronik.broadcastTx(offerTx.ser())).txid;

        // 4. Buyer attempts to buy the NFT using 79999 sats, which is rejected
        const buyerSatsTxid = await runner.sendToScript(90000, buyerP2pkh);
        const txBuildAcceptFail = new TxBuilder({
            version: 2,
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: offerTxid,
                            outIdx: 1,
                        },
                        signData: {
                            value: 546,
                            redeemScript: agoraScript,
                        },
                    },
                    signatory: AgoraOneshotSignatory(
                        buyerSk,
                        buyerPk,
                        enforcedOutputs.length,
                    ),
                },
                {
                    input: {
                        prevOut: {
                            txid: buyerSatsTxid,
                            outIdx: 0,
                        },
                        signData: {
                            value: 90000,
                            outputScript: buyerP2pkh,
                        },
                    },
                    signatory: P2PKHSignatory(buyerSk, buyerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [0, 1]),
                },
                // failure: one sat missing
                { value: 79999, script: sellerP2pkh },
                { value: 546, script: buyerP2pkh },
            ],
        });

        // Accepting trade failed, must send 80000 sats to seller, but sent 79999
        const acceptFailTx = txBuildAcceptFail.sign(ecc);
        // OP_EQUALVERIFY failed
        assert.isRejected(chronik.broadcastTx(acceptFailTx.ser()));

        // 5. Seller cancels the trade and changes the price to 70000 sats
        // Cancel offer, create new offer which asks for only 70000
        const newEnforcedOutputs: TxOutput[] = [
            { value: 0, script: slpSend(childTokenId, SLP_NFT1_CHILD, [0, 1]) },
            { value: 70000, script: sellerP2pkh },
        ];
        const newAgoraOneshot = new AgoraOneshot({
            enforcedOutputs: newEnforcedOutputs,
            cancelPk: sellerPk,
        });
        const newAgoraScript = newAgoraOneshot.script();
        const newAgoraP2sh = Script.p2sh(shaRmd160(newAgoraScript.bytecode));
        const fuelSatsTxid = await runner.sendToScript(2000, sellerP2pkh);
        const txBuildCancel = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: offerTxid,
                            outIdx: 1,
                        },
                        signData: {
                            value: 546,
                            redeemScript: agoraScript,
                        },
                    },
                    signatory: AgoraOneshotCancelSignatory(sellerSk),
                },
                {
                    input: {
                        prevOut: {
                            txid: fuelSatsTxid,
                            outIdx: 0,
                        },
                        signData: {
                            value: 2000,
                            outputScript: sellerP2pkh,
                        },
                    },
                    signatory: P2PKHSignatory(sellerSk, sellerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [1]),
                },
                // Send back with different terms, asking for 70000 now
                { value: 546, script: newAgoraP2sh },
            ],
        });
        const cancelTx = txBuildCancel.sign(ecc);
        const newOfferTxid = (await chronik.broadcastTx(cancelTx.ser())).txid;

        // 6. Buyer successfully buys the NFT for 70000 sats
        // Sending 70000 to seller allows buyer to accept the tx
        const txBuildAcceptSuccess = new TxBuilder({
            version: 2,
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: newOfferTxid,
                            outIdx: 1,
                        },
                        signData: {
                            value: 546,
                            redeemScript: newAgoraScript,
                        },
                    },
                    signatory: AgoraOneshotSignatory(
                        buyerSk,
                        buyerPk,
                        newEnforcedOutputs.length,
                    ),
                },
                {
                    input: {
                        prevOut: {
                            txid: buyerSatsTxid,
                            outIdx: 0,
                        },
                        signData: {
                            value: 90000,
                            outputScript: buyerP2pkh,
                        },
                    },
                    signatory: P2PKHSignatory(buyerSk, buyerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    value: 0,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [0, 1]),
                },
                // success: sending exactly 70000 sats
                { value: 70000, script: sellerP2pkh },
                { value: 546, script: buyerP2pkh },
            ],
        });
        const acceptSuccessTx = txBuildAcceptSuccess.sign(ecc);
        await chronik.broadcastTx(acceptSuccessTx.ser());
    });
});
