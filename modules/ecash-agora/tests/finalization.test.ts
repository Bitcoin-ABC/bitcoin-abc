// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    Ecc,
    SLP_NFT1_CHILD,
    SLP_TOKEN_TYPE_FUNGIBLE,
    SLP_TOKEN_TYPE_NFT1_CHILD,
    SLP_TOKEN_TYPE_NFT1_GROUP,
    Script,
    fromHex,
    payment,
    shaRmd160,
    slpSend,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet } from 'ecash-wallet';

import { Agora } from '../src/agora.js';
import { AgoraOneshot } from '../src/oneshot.js';

use(chaiAsPromised);

const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

const FINALIZATION_TIMEOUT_ERROR =
    'Error: Failed getting /broadcast-txs: 504: Transaction(s) failed to finalize within 1s';

const expectFinalizationTimedOut = async (
    chronikClient: ChronikClient,
    result: {
        success: boolean;
        broadcasted: string[];
        unbroadcasted?: string[];
        errors?: string[];
    },
    broadcastedCount: number,
) => {
    expect(result.success).to.equal(false);
    expect(result.broadcasted.length).to.equal(broadcastedCount);
    expect(result.unbroadcasted).to.deep.equal([]);
    expect(result.errors).to.deep.equal([FINALIZATION_TIMEOUT_ERROR]);
    for (const txid of result.broadcasted) {
        const tx = await chronikClient.tx(txid);
        expect(tx.isFinal).to.equal(false);
    }
};

describe('finalizationTimeoutSecs', () => {
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

    it('AgoraPartial.list() returns expected error when the ALP listing tx does not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const makerSk = fromHex('f6'.repeat(32));
        const makerWallet = Wallet.fromSk(makerSk, chronik);
        const makerPk = ecc.derivePubkey(makerSk);
        const makerScript = Script.p2pkh(shaRmd160(makerPk));

        await runner.sendToScript(50000n, makerScript);
        await makerWallet.sync();

        const genesisResult = await makerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 546n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        atoms: 1000000n,
                    },
                    {
                        sats: DEFAULT_DUST_SATS,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        genesisInfo: {
                            tokenTicker: 'FIN ALP',
                            decimals: 4,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const tokenId = genesisResult.broadcasted[0];
        await makerWallet.sync();

        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100000n,
                priceNanoSatsPerAtom: 1_000_000_000n,
                minAcceptedAtoms: 546n,
                makerPk,
                tokenId,
                tokenType: ALP_TOKEN_TYPE_STANDARD.number,
                tokenProtocol: 'ALP',
            },
            64n,
        );

        const listResult = await agoraPartial.list({
            wallet: makerWallet,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, listResult, 1);
    });

    it('AgoraPartial.list() returns expected error when SLP listing txs do not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const makerSk = fromHex('f7'.repeat(32));
        const makerWallet = Wallet.fromSk(makerSk, chronik);
        const makerPk = ecc.derivePubkey(makerSk);
        const makerScript = Script.p2pkh(shaRmd160(makerPk));

        await runner.sendToScript(50000n, makerScript);
        await makerWallet.sync();

        const genesisResult = await makerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 20000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        atoms: 1000000n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                        genesisInfo: {
                            tokenTicker: 'FIN SLP',
                            decimals: 4,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const tokenId = genesisResult.broadcasted[0];
        await makerWallet.sync();

        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100000n,
                priceNanoSatsPerAtom: 1_000_000_000n,
                minAcceptedAtoms: 546n,
                makerPk,
                tokenId,
                tokenType: SLP_TOKEN_TYPE_FUNGIBLE.number,
                tokenProtocol: 'SLP',
            },
            64n,
        );

        const listResult = await agoraPartial.list({
            wallet: makerWallet,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, listResult, 2);
    });

    it('AgoraOneshot.list() returns expected error when listing txs do not finalize within 1s', async () => {
        const sellerSk = fromHex('f8'.repeat(32));
        const sellerWallet = Wallet.fromSk(sellerSk, chronik);
        const sellerPk = ecc.derivePubkey(sellerSk);
        const sellerP2pkh = Script.p2pkh(shaRmd160(sellerPk));

        await runner.sendToScript(50000n, sellerP2pkh);
        await sellerWallet.sync();

        const groupGenesisResult = await sellerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 10000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: sellerWallet.script,
                        atoms: 1n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                        genesisInfo: {
                            tokenTicker: 'FIN GRP',
                            decimals: 0,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const groupTokenId = groupGenesisResult.broadcasted[0];

        await sellerWallet.sync();
        const childGenesisResult = await sellerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 8000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: sellerWallet.script,
                        atoms: 1n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                        genesisInfo: {
                            tokenTicker: 'FIN NFT',
                            decimals: 0,
                        },
                        groupTokenId,
                    },
                ],
            })
            .build()
            .broadcast();
        const childTokenId = childGenesisResult.broadcasted[0];
        await sellerWallet.sync();

        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs: [
                {
                    sats: 0n,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [0n, 1n]),
                },
                {
                    sats: 30000n,
                    script: sellerP2pkh,
                },
            ],
            cancelPk: sellerPk,
        });

        const listResult = await agoraOneshot.list({
            wallet: sellerWallet,
            tokenId: childTokenId,
            tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, listResult, 2);
    });

    it('AgoraOffer.take() returns expected error when ALP partial accept tx does not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const makerSk = fromHex('a1'.repeat(32));
        const makerWallet = Wallet.fromSk(makerSk, chronik);
        const makerPk = ecc.derivePubkey(makerSk);
        const makerScript = Script.p2pkh(shaRmd160(makerPk));

        const takerSk = fromHex('a2'.repeat(32));
        const takerWallet = Wallet.fromSk(takerSk, chronik);
        const takerPk = ecc.derivePubkey(takerSk);

        await runner.sendToScript(50000n, makerScript);
        await makerWallet.sync();

        const genesisResult = await makerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 546n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        atoms: 1000000n,
                    },
                    {
                        sats: DEFAULT_DUST_SATS,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        genesisInfo: {
                            tokenTicker: 'FIN TAKE ALP',
                            decimals: 4,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const tokenId = genesisResult.broadcasted[0];
        await makerWallet.sync();

        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100000n,
                priceNanoSatsPerAtom: 1_000_000_000n,
                minAcceptedAtoms: 546n,
                makerPk,
                tokenId,
                tokenType: ALP_TOKEN_TYPE_STANDARD.number,
                tokenProtocol: 'ALP',
            },
            64n,
        );

        const listResult = await agoraPartial.list({ wallet: makerWallet });
        expect(listResult.success).to.equal(true);

        const offers = await agora.activeOffersByTokenId(tokenId);
        expect(offers.length).to.equal(1);

        await runner.sendToScript(200000n, Script.p2pkh(shaRmd160(takerPk)));
        await takerWallet.sync();

        const takeResult = await offers[0].take({
            wallet: takerWallet,
            covenantSk: takerSk,
            covenantPk: takerPk,
            acceptedAtoms: 50000n,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, takeResult, 1);
    });

    it('AgoraOffer.take() returns expected error when SLP partial accept tx does not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const makerSk = fromHex('a3'.repeat(32));
        const makerWallet = Wallet.fromSk(makerSk, chronik);
        const makerPk = ecc.derivePubkey(makerSk);
        const makerScript = Script.p2pkh(shaRmd160(makerPk));

        const takerSk = fromHex('a4'.repeat(32));
        const takerWallet = Wallet.fromSk(takerSk, chronik);
        const takerPk = ecc.derivePubkey(takerSk);

        await runner.sendToScript(50000n, makerScript);
        await makerWallet.sync();

        const genesisResult = await makerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 20000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        atoms: 1000000n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                        genesisInfo: {
                            tokenTicker: 'FIN TAKE SLP',
                            decimals: 4,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const tokenId = genesisResult.broadcasted[0];
        await makerWallet.sync();

        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100000n,
                priceNanoSatsPerAtom: 1_000_000_000n,
                minAcceptedAtoms: 546n,
                makerPk,
                tokenId,
                tokenType: SLP_TOKEN_TYPE_FUNGIBLE.number,
                tokenProtocol: 'SLP',
            },
            64n,
        );

        const listResult = await agoraPartial.list({ wallet: makerWallet });
        expect(listResult.success).to.equal(true);

        const offers = await agora.activeOffersByTokenId(tokenId);
        expect(offers.length).to.equal(1);

        await runner.sendToScript(200000n, Script.p2pkh(shaRmd160(takerPk)));
        await takerWallet.sync();

        const takeResult = await offers[0].take({
            wallet: takerWallet,
            covenantSk: takerSk,
            covenantPk: takerPk,
            acceptedAtoms: 50000n,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, takeResult, 1);
    });

    it('AgoraOffer.take() returns expected error when oneshot accept tx does not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const sellerSk = fromHex('a5'.repeat(32));
        const sellerWallet = Wallet.fromSk(sellerSk, chronik);
        const sellerPk = ecc.derivePubkey(sellerSk);
        const sellerP2pkh = Script.p2pkh(shaRmd160(sellerPk));

        const buyerSk = fromHex('a6'.repeat(32));
        const buyerWallet = Wallet.fromSk(buyerSk, chronik);
        const buyerPk = ecc.derivePubkey(buyerSk);

        await runner.sendToScript(50000n, sellerP2pkh);
        await sellerWallet.sync();

        const groupGenesisResult = await sellerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 10000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: sellerWallet.script,
                        atoms: 1n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                        genesisInfo: {
                            tokenTicker: 'FIN TAKE GRP',
                            decimals: 0,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const groupTokenId = groupGenesisResult.broadcasted[0];

        await sellerWallet.sync();
        const childGenesisResult = await sellerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 8000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: sellerWallet.script,
                        atoms: 1n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                        genesisInfo: {
                            tokenTicker: 'FIN TAKE NFT',
                            decimals: 0,
                        },
                        groupTokenId,
                    },
                ],
            })
            .build()
            .broadcast();
        const childTokenId = childGenesisResult.broadcasted[0];
        await sellerWallet.sync();

        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs: [
                {
                    sats: 0n,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [0n, 1n]),
                },
                {
                    sats: 30000n,
                    script: sellerP2pkh,
                },
            ],
            cancelPk: sellerPk,
        });

        const listResult = await agoraOneshot.list({
            wallet: sellerWallet,
            tokenId: childTokenId,
            tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
        });
        expect(listResult.success).to.equal(true);

        const offers = await agora.activeOffersByTokenId(childTokenId);
        expect(offers.length).to.equal(1);

        await runner.sendToScript(50000n, Script.p2pkh(shaRmd160(buyerPk)));
        await buyerWallet.sync();

        const takeResult = await offers[0].take({
            wallet: buyerWallet,
            covenantSk: buyerSk,
            covenantPk: buyerPk,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, takeResult, 1);
    });

    it('AgoraOffer.cancel() returns expected error when ALP partial cancel tx does not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const makerSk = fromHex('b1'.repeat(32));
        const makerWallet = Wallet.fromSk(makerSk, chronik);
        const makerPk = ecc.derivePubkey(makerSk);
        const makerScript = Script.p2pkh(shaRmd160(makerPk));

        await runner.sendToScript(100000n, makerScript);
        await makerWallet.sync();

        const genesisResult = await makerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 546n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        atoms: 1000000n,
                    },
                    {
                        sats: DEFAULT_DUST_SATS,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        genesisInfo: {
                            tokenTicker: 'FIN CAN ALP',
                            decimals: 4,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const tokenId = genesisResult.broadcasted[0];
        await makerWallet.sync();

        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100000n,
                priceNanoSatsPerAtom: 1_000_000_000n,
                minAcceptedAtoms: 546n,
                makerPk,
                tokenId,
                tokenType: ALP_TOKEN_TYPE_STANDARD.number,
                tokenProtocol: 'ALP',
            },
            64n,
        );

        const listResult = await agoraPartial.list({ wallet: makerWallet });
        expect(listResult.success).to.equal(true);

        const offers = await agora.activeOffersByTokenId(tokenId);
        expect(offers.length).to.equal(1);

        const cancelResult = await offers[0].cancel({
            wallet: makerWallet,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, cancelResult, 1);
    });

    it('AgoraOffer.cancel() returns expected error when SLP partial cancel tx does not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const makerSk = fromHex('b2'.repeat(32));
        const makerWallet = Wallet.fromSk(makerSk, chronik);
        const makerPk = ecc.derivePubkey(makerSk);
        const makerScript = Script.p2pkh(shaRmd160(makerPk));

        await runner.sendToScript(100000n, makerScript);
        await makerWallet.sync();

        const genesisResult = await makerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 20000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        atoms: 1000000n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                        genesisInfo: {
                            tokenTicker: 'FIN CAN SLP',
                            decimals: 4,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const tokenId = genesisResult.broadcasted[0];
        await makerWallet.sync();

        const agoraPartial = await agora.selectParams(
            {
                offeredAtoms: 100000n,
                priceNanoSatsPerAtom: 1_000_000_000n,
                minAcceptedAtoms: 546n,
                makerPk,
                tokenId,
                tokenType: SLP_TOKEN_TYPE_FUNGIBLE.number,
                tokenProtocol: 'SLP',
            },
            64n,
        );

        const listResult = await agoraPartial.list({ wallet: makerWallet });
        expect(listResult.success).to.equal(true);

        const offers = await agora.activeOffersByTokenId(tokenId);
        expect(offers.length).to.equal(1);

        const cancelResult = await offers[0].cancel({
            wallet: makerWallet,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, cancelResult, 1);
    });

    it('AgoraOffer.cancel() returns expected error when oneshot cancel tx does not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const sellerSk = fromHex('b3'.repeat(32));
        const sellerWallet = Wallet.fromSk(sellerSk, chronik);
        const sellerPk = ecc.derivePubkey(sellerSk);
        const sellerP2pkh = Script.p2pkh(shaRmd160(sellerPk));

        await runner.sendToScript(100000n, sellerP2pkh);
        await sellerWallet.sync();

        const groupGenesisResult = await sellerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 10000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: sellerWallet.script,
                        atoms: 1n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                        genesisInfo: {
                            tokenTicker: 'FIN CAN GRP',
                            decimals: 0,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const groupTokenId = groupGenesisResult.broadcasted[0];

        await sellerWallet.sync();
        const childGenesisResult = await sellerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 8000n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: sellerWallet.script,
                        atoms: 1n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                        genesisInfo: {
                            tokenTicker: 'FIN CAN NFT',
                            decimals: 0,
                        },
                        groupTokenId,
                    },
                ],
            })
            .build()
            .broadcast();
        const childTokenId = childGenesisResult.broadcasted[0];
        await sellerWallet.sync();

        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs: [
                {
                    sats: 0n,
                    script: slpSend(childTokenId, SLP_NFT1_CHILD, [0n, 1n]),
                },
                {
                    sats: 30000n,
                    script: sellerP2pkh,
                },
            ],
            cancelPk: sellerPk,
        });

        const listResult = await agoraOneshot.list({
            wallet: sellerWallet,
            tokenId: childTokenId,
            tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
        });
        expect(listResult.success).to.equal(true);

        const offers = await agora.activeOffersByTokenId(childTokenId);
        expect(offers.length).to.equal(1);

        const cancelResult = await offers[0].cancel({
            wallet: sellerWallet,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, cancelResult, 1);
    });

    it('AgoraOffer.relist() returns expected error when ALP relist tx does not finalize within 1s', async () => {
        const agora = new Agora(chronik);

        const makerSk = fromHex('c1'.repeat(32));
        const makerWallet = Wallet.fromSk(makerSk, chronik);
        const makerPk = ecc.derivePubkey(makerSk);
        const makerScript = Script.p2pkh(shaRmd160(makerPk));

        await runner.sendToScript(450000n, makerScript);
        await makerWallet.sync();

        const genesisResult = await makerWallet
            .action({
                outputs: [
                    { sats: 0n },
                    {
                        sats: 546n,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        atoms: 1000000n,
                    },
                    {
                        sats: DEFAULT_DUST_SATS,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        script: makerWallet.script,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        genesisInfo: {
                            tokenTicker: 'FIN RELIST',
                            decimals: 4,
                        },
                    },
                ],
            })
            .build()
            .broadcast();
        const tokenId = genesisResult.broadcasted[0];
        await makerWallet.sync();

        const agoraPartialInitial = await agora.selectParams(
            {
                offeredAtoms: 100000n,
                priceNanoSatsPerAtom: 1_000_000_000n,
                minAcceptedAtoms: 546n,
                makerPk,
                tokenId,
                tokenType: ALP_TOKEN_TYPE_STANDARD.number,
                tokenProtocol: 'ALP',
            },
            64n,
        );

        const listResult = await agoraPartialInitial.list({
            wallet: makerWallet,
        });
        expect(listResult.success).to.equal(true);

        const offers = await agora.activeOffersByTokenId(tokenId);
        expect(offers.length).to.equal(1);

        const updatedPartial = await agora.selectParams(
            {
                offeredAtoms: 80000n,
                priceNanoSatsPerAtom: 2_000_000_000n,
                minAcceptedAtoms: 546n,
                makerPk,
                tokenId,
                tokenType: ALP_TOKEN_TYPE_STANDARD.number,
                tokenProtocol: 'ALP',
            },
            64n,
        );

        const relistResult = await offers[0].relist({
            wallet: makerWallet,
            updatedPartial,
            finalizationTimeoutSecs: 1,
        });

        await expectFinalizationTimedOut(chronik, relistResult, 1);
    });
});
