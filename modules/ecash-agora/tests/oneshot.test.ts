// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClientNode } from 'chronik-client';
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
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { parseAgoraTx } from '../src/ad.js';
import { AGORA_LOKAD_ID } from '../src/consts.js';
import {
    AgoraOneshot,
    AgoraOneshotAdSignatory,
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
        await initWasm();
        runner = await TestRunner.setup();
        chronik = runner.chronik;
        ecc = runner.ecc;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('SLP NFT1 Agora Oneshot', async () => {
        // Tests the Agora Oneshot Script using SLP NFT1 tokens:
        // 1. Seller creates an NFT1 GROUP token
        // 2. Seller creates an NFT1 CHILD token using the group token
        // 3. Seller sends the NFT to an ad setup output for an Agora Oneshot
        //    covenant that asks for 80000 sats
        // 4. Seller finishes offer setup + sends NFT to the advertised P2SH
        // 5. Buyer searches for NFT trades, finds the advertised one
        // 6. Buyer attempts to buy the NFT using 79999 sats, which is rejected
        // 7. Seller cancels the trade and changes the price to 70000 sats,
        //    with a new advertisement
        // 8. Buyer searches for NFT trades again, finding both, one spent
        // 9. Buyer successfully accepts advertized NFT offer for 70000 sats

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

        // 3. Seller sends the NFT to an ad setup output for an Agora Oneshot
        //    covenant that asks for 80000 sats
        const enforcedOutputs: TxOutput[] = [
            {
                value: BigInt(0),
                script: slpSend(childTokenId, SLP_NFT1_CHILD, [0, 1]),
            },
            { value: BigInt(80000), script: sellerP2pkh },
        ];
        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs,
            cancelPk: sellerPk,
        });
        const agoraAdScript = agoraOneshot.adScript();
        const agoraAdP2sh = Script.p2sh(shaRmd160(agoraAdScript.bytecode));
        const txBuildAdSetup = new TxBuilder({
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
                { value: 7000, script: agoraAdP2sh },
            ],
        });
        const adSetupTx = txBuildAdSetup.sign(ecc);
        const adSetupTxid = (await chronik.broadcastTx(adSetupTx.ser())).txid;

        // 4. Seller finishes offer setup + sends NFT to the advertised P2SH
        const agoraScript = agoraOneshot.script();
        const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));
        const txBuildOffer = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: adSetupTxid,
                            outIdx: 1,
                        },
                        signData: {
                            value: 7000,
                            redeemScript: agoraAdScript,
                        },
                    },
                    signatory: AgoraOneshotAdSignatory(sellerSk),
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

        // 5. Buyer searches for NFT trades, finds the advertised one
        const agoraTxs = (
            await chronik.lokadId(toHex(AGORA_LOKAD_ID)).history()
        ).txs;
        expect(agoraTxs.length).to.be.equal(1);
        const agoraTx = agoraTxs[0];
        expect(agoraTx.inputs.length).to.be.equal(1);
        const parsedAd = parseAgoraTx(agoraTx);
        if (parsedAd === undefined) {
            throw 'Parsing agora tx failed';
        }
        if (parsedAd.type !== 'ONESHOT') {
            throw 'Expected ONESHOT offer in this test';
        }
        expect(parsedAd).to.be.deep.equal({
            type: 'ONESHOT',
            params: agoraOneshot,
            outpoint: {
                txid: offerTxid,
                outIdx: 1,
            },
            spentBy: undefined,
            txBuilderInput: {
                prevOut: {
                    txid: offerTxid,
                    outIdx: 1,
                },
                signData: {
                    redeemScript: agoraScript,
                    value: 546,
                },
            },
        });

        // 6. Buyer attempts to buy the NFT using 79999 sats, which is rejected
        const buyerSatsTxid = await runner.sendToScript(90000, buyerP2pkh);
        const txBuildAcceptFail = new TxBuilder({
            version: 2,
            inputs: [
                {
                    input: parsedAd.txBuilderInput,
                    signatory: AgoraOneshotSignatory(
                        buyerSk,
                        buyerPk,
                        parsedAd.params.enforcedOutputs.length,
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

        // 7. Seller cancels the trade and changes the price to 70000 sats,
        //    with a new advertisement
        const newEnforcedOutputs: TxOutput[] = [
            {
                value: BigInt(0),
                script: slpSend(childTokenId, SLP_NFT1_CHILD, [0, 1]),
            },
            { value: BigInt(70000), script: sellerP2pkh },
        ];
        const newAgoraOneshot = new AgoraOneshot({
            enforcedOutputs: newEnforcedOutputs,
            cancelPk: sellerPk,
        });
        const newAgoraScript = newAgoraOneshot.script();
        const newAgoraP2sh = Script.p2sh(shaRmd160(newAgoraScript.bytecode));
        const newAgoraAdScript = newAgoraOneshot.adScript();
        const newAdSetupTxid = await runner.sendToScript(
            2000,
            Script.p2sh(shaRmd160(newAgoraAdScript.bytecode)),
        );
        const txBuildCancel = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: newAdSetupTxid,
                            outIdx: 0,
                        },
                        signData: {
                            value: 2000,
                            redeemScript: newAgoraAdScript,
                        },
                    },
                    signatory: AgoraOneshotAdSignatory(sellerSk),
                },
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

        // 8. Buyer searches for NFT trades again, finding both, one spent
        const newAgoraTxs = (
            await chronik.lokadId(toHex(AGORA_LOKAD_ID)).history()
        ).txs;
        expect(newAgoraTxs.length).to.equal(2);
        const parsedAds = newAgoraTxs.map(parseAgoraTx);
        parsedAds.sort((a, b) => +!a?.spentBy - +!b?.spentBy);
        expect(parsedAds).to.deep.equal([
            {
                type: 'ONESHOT',
                params: agoraOneshot,
                outpoint: {
                    txid: offerTxid,
                    outIdx: 1,
                },
                txBuilderInput: {
                    prevOut: {
                        txid: offerTxid,
                        outIdx: 1,
                    },
                    signData: {
                        redeemScript: agoraScript,
                        value: 546,
                    },
                },
                spentBy: {
                    txid: newOfferTxid,
                    outIdx: 1,
                },
            },
            {
                type: 'ONESHOT',
                params: newAgoraOneshot,
                outpoint: {
                    txid: newOfferTxid,
                    outIdx: 1,
                },
                txBuilderInput: {
                    prevOut: {
                        txid: newOfferTxid,
                        outIdx: 1,
                    },
                    signData: {
                        redeemScript: newAgoraScript,
                        value: 546,
                    },
                },
                spentBy: undefined,
            },
        ]);
        const newParsedAd = parsedAds[1]!;

        // 9. Buyer successfully accepts advertized NFT offer for 70000 sats
        const txBuildAcceptSuccess = new TxBuilder({
            version: 2,
            inputs: [
                {
                    input: newParsedAd.txBuilderInput,
                    signatory: AgoraOneshotSignatory(
                        buyerSk,
                        buyerPk,
                        newParsedAd.params.enforcedOutputs.length,
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
                ...newParsedAd.params.enforcedOutputs,
                { value: 546, script: buyerP2pkh },
            ],
        });
        const acceptSuccessTx = txBuildAcceptSuccess.sign(ecc);
        await chronik.broadcastTx(acceptSuccessTx.ser());
    });
});
