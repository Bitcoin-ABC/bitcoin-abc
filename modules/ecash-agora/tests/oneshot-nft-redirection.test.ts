// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    ALL_BIP143,
    Ecc,
    P2PKHSignatory,
    Script,
    SLP_NFT1_CHILD,
    SLP_NFT1_GROUP,
    SLP_TOKEN_TYPE_NFT1_CHILD,
    TxBuilder,
    TxOutput,
    fromHex,
    shaRmd160,
    slpGenesis,
    slpSend,
    toHex,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Agora, AgoraOffer } from '../src/agora.js';
import { AgoraOneshot, AgoraOneshotAdSignatory } from '../src/oneshot.js';
import { UNSAFE_ONESHOT_ENFORCED_OUTPUTS_MSG } from '../src/oneshotValidate.js';
import { Wallet } from 'ecash-wallet/src/wallet.js';

use(chaiAsPromised);

const NUM_COINS = 25;
const COIN_VALUE = 200000n;

describe('Agora ONESHOT NFT enforced-output redirection hardening', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    const ecc = new Ecc();

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('Refuses list/take for ONESHOT offers that redirect the NFT', async () => {
        const agora = new Agora(chronik);

        const makerSk = fromHex('11'.repeat(32));
        const makerWallet = Wallet.fromSk(makerSk, chronik);
        const makerPk = ecc.derivePubkey(makerSk);
        const makerPkh = shaRmd160(makerPk);
        const makerScript = Script.p2pkh(makerPkh);

        const makerNftSk = fromHex('33'.repeat(32));
        const makerNftPk = ecc.derivePubkey(makerNftSk);
        const makerNftScript = Script.p2pkh(shaRmd160(makerNftPk));

        const buyerSk = fromHex('22'.repeat(32));
        const buyerWallet = Wallet.fromSk(buyerSk, chronik);
        const buyerPk = ecc.derivePubkey(buyerSk);
        const buyerScript = Script.p2pkh(shaRmd160(buyerPk));

        await runner.sendToScript(50000n, makerScript);
        const makerUtxos = await chronik
            .script('p2pkh', toHex(makerPkh))
            .utxos();

        const genesisGroupTx = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: makerUtxos.utxos[0].outpoint,
                        signData: {
                            sats: makerUtxos.utxos[0].sats,
                            outputScript: makerScript,
                        },
                    },
                    signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: slpGenesis(
                        SLP_NFT1_GROUP,
                        { tokenTicker: 'REDIRECT GROUP', decimals: 0 },
                        1n,
                    ),
                },
                { sats: 10000n, script: makerScript },
            ],
        }).sign();
        const groupTokenId = (await chronik.broadcastTx(genesisGroupTx.ser()))
            .txid;

        const genesisChildTx = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: groupTokenId,
                            outIdx: 1,
                        },
                        signData: {
                            sats: 10000n,
                            outputScript: makerScript,
                        },
                    },
                    signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: slpGenesis(
                        SLP_NFT1_CHILD,
                        { tokenTicker: 'REDIRECT NFT', decimals: 0 },
                        1n,
                    ),
                },
                { sats: 8000n, script: makerScript },
            ],
        }).sign();
        const childTokenId = (await chronik.broadcastTx(genesisChildTx.ser()))
            .txid;
        await makerWallet.sync();

        const maliciousEnforcedOutputs: TxOutput[] = [
            {
                sats: 0n,
                script: slpSend(childTokenId, SLP_NFT1_CHILD, [0n, 1n]),
            },
            { sats: 99454n, script: makerScript },
            { sats: 546n, script: makerNftScript },
        ];
        const maliciousOneshot = new AgoraOneshot({
            enforcedOutputs: maliciousEnforcedOutputs,
            cancelPk: makerPk,
        });

        // High-level list() must refuse before broadcasting
        await expect(
            maliciousOneshot.list({
                wallet: makerWallet,
                tokenId: childTokenId,
                tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
            }),
        ).to.be.rejectedWith(UNSAFE_ONESHOT_ENFORCED_OUTPUTS_MSG);

        // Even if a maker broadcasts a raw ad+offer with the malicious shape,
        // offer parsing must refuse to surface it as an active AgoraOffer.
        const agoraAdScript = maliciousOneshot.adScript();
        const agoraAdP2sh = Script.p2sh(shaRmd160(agoraAdScript.bytecode));
        const adSetupTx = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: childTokenId,
                            outIdx: 1,
                        },
                        signData: {
                            sats: 8000n,
                            outputScript: makerScript,
                        },
                    },
                    signatory: P2PKHSignatory(makerSk, makerPk, ALL_BIP143),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [1n]),
                },
                { sats: 7000n, script: agoraAdP2sh },
            ],
        }).sign();
        const adSetupTxid = (await chronik.broadcastTx(adSetupTx.ser())).txid;

        const agoraScript = maliciousOneshot.script();
        const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));
        const offerTx = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: adSetupTxid,
                            outIdx: 1,
                        },
                        signData: {
                            sats: 7000n,
                            redeemScript: agoraAdScript,
                        },
                    },
                    signatory: AgoraOneshotAdSignatory(makerSk),
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [1n]),
                },
                { sats: 546n, script: agoraP2sh },
            ],
        }).sign();
        const offerTxid = (await chronik.broadcastTx(offerTx.ser())).txid;

        expect(await agora.activeOffersByTokenId(childTokenId)).to.deep.equal(
            [],
        );

        // Defense in depth: a manually constructed AgoraOffer still cannot
        // be taken through the public accept/take builders.
        const maliciousOffer = new AgoraOffer({
            variant: {
                type: 'ONESHOT',
                params: maliciousOneshot,
            },
            outpoint: { txid: offerTxid, outIdx: 1 },
            txBuilderInput: {
                prevOut: { txid: offerTxid, outIdx: 1 },
                signData: {
                    sats: 546n,
                    redeemScript: agoraScript,
                },
            },
            token: {
                tokenId: childTokenId,
                tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                atoms: 1n,
                isMintBaton: false,
            },
            status: 'OPEN',
        });

        expect(() =>
            maliciousOffer.acceptTx({
                covenantSk: buyerSk,
                covenantPk: buyerPk,
                fuelInputs: [],
                recipientScript: buyerScript,
            }),
        ).to.throw(UNSAFE_ONESHOT_ENFORCED_OUTPUTS_MSG);

        await runner.sendToScript(120000n, buyerScript);
        await buyerWallet.sync();
        await expect(
            maliciousOffer.take({
                wallet: buyerWallet,
                covenantSk: buyerSk,
                covenantPk: buyerPk,
            }),
        ).to.be.rejectedWith(UNSAFE_ONESHOT_ENFORCED_OUTPUTS_MSG);
    });
});
