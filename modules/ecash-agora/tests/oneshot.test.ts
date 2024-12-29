// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient, MsgTxClient } from 'chronik-client';
import {
    ALL_BIP143,
    Ecc,
    OutPoint,
    P2PKHSignatory,
    SLP_NFT1_CHILD,
    SLP_NFT1_GROUP,
    Script,
    TxBuilder,
    TxInput,
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
    AgoraOneshotSignatory,
} from '../src/oneshot.js';
import { Agora, AgoraOffer } from '../src/agora.js';
import { EventEmitter, once } from 'node:events';

use(chaiAsPromised);

const NUM_COINS = 500;
const COIN_VALUE = 100000;

const SLP_TOKEN_TYPE_NFT1_GROUP = {
    number: 0x81,
    protocol: 'SLP' as const,
    type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
};

const SLP_TOKEN_TYPE_NFT1_CHILD = {
    number: 0x41,
    protocol: 'SLP' as const,
    type: 'SLP_TOKEN_TYPE_NFT1_CHILD' as const,
};

describe('SLP', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
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

        // Create Agora object to access trades
        const agora = new Agora(chronik);

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
        const groupTokenId = genesisTxid;

        expect(await chronik.token(genesisTxid)).to.deep.equal({
            tokenId: groupTokenId,
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

        const emitter = new EventEmitter();
        const ws = chronik.ws({
            onMessage: async msg => {
                if (!emitter.emit('ws', msg)) {
                    console.warn('Emitted msg without any listeners', msg);
                }
            },
        });
        await ws.waitForOpen();
        agora.subscribeWs(ws, {
            type: 'TOKEN_ID',
            tokenId: childTokenId,
        });
        const listenNext = () => once(emitter, 'ws') as Promise<[MsgTxClient]>;

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
        const offerPromise = listenNext();
        const offerTxid = (await chronik.broadcastTx(offerTx.ser())).txid;
        const offerOutpoint: OutPoint = {
            txid: offerTxid,
            outIdx: 1,
        };
        const offerTxBuilderInput: TxInput = {
            prevOut: offerOutpoint,
            signData: {
                redeemScript: agoraScript,
                value: 546,
            },
        };

        // Expected created offer
        const expectedOffer = new AgoraOffer({
            variant: {
                type: 'ONESHOT',
                params: agoraOneshot,
            },
            outpoint: offerOutpoint,
            txBuilderInput: offerTxBuilderInput,
            token: {
                tokenId: childTokenId,
                tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                amount: '1',
                isMintBaton: false,
            },
            status: 'OPEN',
        });

        const [offerMsg] = await offerPromise;
        expect(offerMsg.type).to.equal('Tx');
        expect(offerMsg.msgType).to.equal('TX_ADDED_TO_MEMPOOL');
        expect(offerMsg.txid).to.equal(offerTxid);

        // 5. Buyer searches for NFT trades, finds the advertised one
        expect(await agora.allOfferedTokenIds()).to.deep.equal([childTokenId]);
        expect(await agora.offeredGroupTokenIds()).to.deep.equal([
            groupTokenId,
        ]);
        expect(await agora.offeredFungibleTokenIds()).to.deep.equal([]);

        // Query by group token ID
        expect(
            await agora.activeOffersByGroupTokenId(groupTokenId),
        ).to.deep.equal([expectedOffer]);
        // activeOffersByGroupTokenId with child token ID -> empty result
        expect(
            await agora.activeOffersByGroupTokenId(childTokenId),
        ).to.deep.equal([]);

        // Query by child token ID
        expect(await agora.activeOffersByTokenId(childTokenId)).to.deep.equal([
            expectedOffer,
        ]);
        // activeOffersByTokenId with by group token ID -> empty result
        expect(await agora.activeOffersByTokenId(groupTokenId)).to.deep.equal(
            [],
        );

        // Query by cancelPk
        expect(await agora.activeOffersByPubKey(toHex(sellerPk))).to.deep.equal(
            [expectedOffer],
        );

        // Use LOKAD ID enpoint + parseAgoraTx to find offers
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
            outpoint: offerOutpoint,
            spentBy: undefined,
            txBuilderInput: offerTxBuilderInput,
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
        const cancelFeeSats = 600;
        const newAdSetupTxid = await runner.sendToScript(
            cancelFeeSats,
            Script.p2sh(shaRmd160(newAgoraAdScript.bytecode)),
        );
        const newOfferPromise = listenNext();
        const offer1 = (await agora.activeOffersByTokenId(childTokenId))[0];
        const offer1AdInput = {
            input: {
                prevOut: {
                    txid: newAdSetupTxid,
                    outIdx: 0,
                },
                signData: {
                    value: cancelFeeSats,
                    redeemScript: newAgoraAdScript,
                },
            },
            signatory: AgoraOneshotAdSignatory(sellerSk),
        };
        expect(offer1.askedSats()).to.equal(80000n);
        expect(
            offer1.cancelFeeSats({
                recipientScript: newAgoraP2sh,
                extraInputs: [offer1AdInput],
            }),
        ).to.equal(BigInt(cancelFeeSats));
        const cancelTx = offer1.cancelTx({
            ecc,
            cancelSk: sellerSk,
            fuelInputs: [offer1AdInput],
            recipientScript: newAgoraP2sh,
        });
        expect(cancelTx.serSize()).to.equal(cancelFeeSats);
        const newOfferTxid = (await chronik.broadcastTx(cancelTx.ser())).txid;
        const newOfferOutpoint: OutPoint = {
            txid: newOfferTxid,
            outIdx: 1,
        };
        const newOfferTxBuilderInput: TxInput = {
            prevOut: newOfferOutpoint,
            signData: {
                redeemScript: newAgoraScript,
                value: 546,
            },
        };

        const [newOfferMsg] = await newOfferPromise;
        expect(newOfferMsg.type).to.equal('Tx');
        expect(newOfferMsg.msgType).to.equal('TX_ADDED_TO_MEMPOOL');
        expect(newOfferMsg.txid).to.equal(newOfferTxid);

        // 8. Buyer searches for NFT trades again, finding both, one spent
        expect(await agora.allOfferedTokenIds()).to.deep.equal([childTokenId]);
        expect(await agora.offeredGroupTokenIds()).to.deep.equal([
            groupTokenId,
        ]);
        expect(await agora.offeredFungibleTokenIds()).to.deep.equal([]);

        // Get history
        expect(
            await agora.historicOffers({
                type: 'TOKEN_ID',
                tokenId: childTokenId,
                table: 'HISTORY',
            }),
        ).to.deep.equal({
            offers: [
                {
                    ...expectedOffer,
                    status: 'CANCELED',
                },
            ],
            numTxs: 2,
            numPages: 1,
        });
        expect(
            await agora.historicOffers({
                type: 'GROUP_TOKEN_ID',
                groupTokenId,
                table: 'HISTORY',
            }),
        ).to.deep.equal({
            offers: [
                {
                    ...expectedOffer,
                    status: 'CANCELED',
                },
            ],
            numTxs: 2,
            numPages: 1,
        });
        expect(
            await agora.historicOffers({
                type: 'PUBKEY',
                pubkeyHex: toHex(sellerPk),
                table: 'HISTORY',
            }),
        ).to.deep.equal({
            offers: [
                {
                    ...expectedOffer,
                    status: 'CANCELED',
                },
            ],
            numTxs: 2,
            numPages: 1,
        });
        expect(
            await agora.historicOffers({
                type: 'TOKEN_ID',
                tokenId: childTokenId,
                table: 'UNCONFIRMED',
            }),
        ).to.deep.equal({
            offers: [
                {
                    ...expectedOffer,
                    status: 'CANCELED',
                },
            ],
            numTxs: 2,
            numPages: 1,
        });
        expect(
            await agora.historicOffers({
                type: 'TOKEN_ID',
                tokenId: childTokenId,
                table: 'CONFIRMED',
            }),
        ).to.deep.equal({
            offers: [],
            numTxs: 0,
            numPages: 0,
        });

        const newExpectedOffer = new AgoraOffer({
            variant: {
                type: 'ONESHOT',
                params: newAgoraOneshot,
            },
            outpoint: newOfferOutpoint,
            txBuilderInput: newOfferTxBuilderInput,
            token: {
                tokenId: childTokenId,
                tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                amount: '1',
                isMintBaton: false,
            },
            status: 'OPEN',
        });

        expect(
            await agora.activeOffersByGroupTokenId(groupTokenId),
        ).to.deep.equal([newExpectedOffer]);
        expect(await agora.activeOffersByTokenId(childTokenId)).to.deep.equal([
            newExpectedOffer,
        ]);
        expect(await agora.activeOffersByPubKey(toHex(sellerPk))).to.deep.equal(
            [newExpectedOffer],
        );

        // Use LOKAD ID index + parseAgoraTx to find the offers
        const newAgoraTxs = (
            await chronik.lokadId(toHex(AGORA_LOKAD_ID)).history()
        ).txs;
        expect(newAgoraTxs.length).to.equal(2);
        newAgoraTxs.sort(
            (a, b) => +!a.outputs[1].spentBy - +!b.outputs[1].spentBy,
        );
        const parsedAds = newAgoraTxs.map(parseAgoraTx);
        expect(parsedAds).to.deep.equal([
            {
                type: 'ONESHOT',
                params: agoraOneshot,
                outpoint: offerOutpoint,
                txBuilderInput: offerTxBuilderInput,
                spentBy: {
                    txid: newOfferTxid,
                    outIdx: 1,
                },
            },
            {
                type: 'ONESHOT',
                params: newAgoraOneshot,
                outpoint: newOfferOutpoint,
                txBuilderInput: newOfferTxBuilderInput,
                spentBy: undefined,
            },
        ]);

        // 9. Buyer successfully accepts advertized NFT offer for 70000 sats
        const offer2 = (await agora.activeOffersByTokenId(childTokenId))[0];
        expect(offer2.askedSats()).to.equal(70000n);
        const acceptFeeSats = 740;
        const acceptSats = acceptFeeSats + Number(offer2.askedSats());
        const acceptSatsTxid = await runner.sendToScript(
            acceptSats,
            buyerP2pkh,
        );
        const offer2AcceptInput = {
            input: {
                prevOut: {
                    txid: acceptSatsTxid,
                    outIdx: 0,
                },
                signData: {
                    value: acceptSats,
                    outputScript: buyerP2pkh,
                },
            },
            signatory: P2PKHSignatory(buyerSk, buyerPk, ALL_BIP143),
        };
        expect(
            offer2.acceptFeeSats({
                recipientScript: buyerP2pkh,
                extraInputs: [offer2AcceptInput],
            }),
        ).to.equal(BigInt(acceptFeeSats));
        const acceptSuccessTx = offer2.acceptTx({
            ecc,
            covenantSk: buyerSk,
            covenantPk: buyerPk,
            fuelInputs: [offer2AcceptInput],
            recipientScript: buyerP2pkh,
        });
        expect(acceptSuccessTx.serSize()).to.equal(acceptFeeSats);
        const acceptPromise = listenNext();
        const acceptSuccessTxid = (
            await chronik.broadcastTx(acceptSuccessTx.ser())
        ).txid;

        // No trades left anymore
        expect(await agora.allOfferedTokenIds()).to.deep.equal([]);
        expect(await agora.offeredGroupTokenIds()).to.deep.equal([]);
        expect(await agora.offeredFungibleTokenIds()).to.deep.equal([]);
        expect(
            await agora.activeOffersByGroupTokenId(groupTokenId),
        ).to.deep.equal([]);
        expect(await agora.activeOffersByTokenId(childTokenId)).to.deep.equal(
            [],
        );
        expect(await agora.activeOffersByPubKey(toHex(sellerPk))).to.deep.equal(
            [],
        );

        const [acceptMsg] = await acceptPromise;
        expect(acceptMsg.type).to.equal('Tx');
        expect(acceptMsg.msgType).to.equal('TX_ADDED_TO_MEMPOOL');
        expect(acceptMsg.txid).to.equal(acceptSuccessTxid);

        // But we have the history
        expect(
            await agora.historicOffers({
                type: 'TOKEN_ID',
                tokenId: childTokenId,
                table: 'HISTORY',
            }),
        ).to.deep.equal({
            offers: [
                {
                    ...expectedOffer,
                    status: 'CANCELED',
                },
                {
                    ...newExpectedOffer,
                    takenInfo: {
                        satoshisPaid: 70000,
                        takerScriptHex:
                            '76a914531260aa2a199e228c537dfa42c82bea2c7c1f4d88ac',
                        baseTokens: '1',
                    },
                    status: 'TAKEN',
                },
            ],
            numTxs: 3,
            numPages: 1,
        });
    });
});
