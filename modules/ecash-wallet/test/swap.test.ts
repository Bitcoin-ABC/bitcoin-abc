// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    fromHex,
    payment,
    ALP_TOKEN_TYPE_STANDARD,
    Tx,
    toHex,
    TxBuilder,
    TxBuilderInput,
    TxBuilderOutput,
    emppScript,
    alpSend,
    ALL_ANYONECANPAY_BIP143,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet, SatsSelectionStrategy, PostageTx } from '../src/wallet';

use(chaiAsPromised);

// Configure available satoshis
const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

describe('Atomic swap mechanism using ignoredTokenIds', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('We can create an atomic swap where buyer provides TokenGamma and seller provides TokenTheta', async () => {
        // Step 1: Create two wallets - buyer and seller
        const testWalletBuyer = Wallet.fromSk(
            fromHex('30'.repeat(32)),
            chronik,
        );
        const testWalletSeller = Wallet.fromSk(
            fromHex('31'.repeat(32)),
            chronik,
        );

        // Send XEC to buyer wallet only (seller will get XEC + tokens in one tx later)
        const buyerWalletSats = 1_000_000_00n; // 1M XEC
        await runner.sendToScript(buyerWalletSats, testWalletBuyer.script);

        // Sync buyer wallet
        await testWalletBuyer.sync();

        // Step 2: Buyer mints TokenGamma
        const tokenGammaGenesisInfo = {
            tokenTicker: 'GAMMA',
            tokenName: 'Token Gamma',
            url: 'gamma.token',
            decimals: 0,
        };

        const tokenGammaGenesisAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: testWalletBuyer.script,
                    atoms: 100n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo: tokenGammaGenesisInfo,
                },
            ],
        };

        const tokenGammaGenesisResp = await testWalletBuyer
            .action(tokenGammaGenesisAction)
            .build()
            .broadcast();

        const tokenGammaId = tokenGammaGenesisResp.broadcasted[0];

        // No need to sync after genesis; the wallet's utxo set updates on build

        // Step 3: Buyer mints TokenTheta
        const tokenThetaGenesisInfo = {
            tokenTicker: 'THETA',
            tokenName: 'Token Theta',
            url: 'theta.token',
            decimals: 0,
        };

        // Create multiple qty-1 outputs for TokenTheta, all of them at the Seller wallet
        const tokenThetaGenesisAction: payment.Action = {
            outputs: [
                { sats: 0n },
                // Create 10 qty-1 outputs
                ...Array.from({ length: 10 }, () => ({
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: testWalletSeller.script,
                    atoms: 1n,
                })),
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo: tokenThetaGenesisInfo,
                },
            ],
        };

        const tokenThetaGenesisResp = await testWalletBuyer
            .action(tokenThetaGenesisAction)
            .build()
            .broadcast();

        const tokenThetaId = tokenThetaGenesisResp.broadcasted[0];

        // No need to sync after genesis; the wallet's utxo set updates on build

        // Step 4: Send 20 fuel UTXOs to seller of 1000 sats each
        // We could do this kind of swap as ... token only postage. But we are already adding the token utxo. A token swap server could also provide fuel sats.
        const sendThetaToSellerAction: payment.Action = {
            outputs: [
                // Send 20 fuel UTXOs of 1000 sats (10 XEC) each to seller
                ...Array.from({ length: 20 }, () => ({
                    sats: 1000n,
                    script: testWalletSeller.script,
                })),
            ],
            tokenActions: [
                // No token action; the seller already has qty-1 utxos of the to-be-sold token from its genesis tx
            ],
        };

        await testWalletBuyer
            .action(sendThetaToSellerAction)
            .build()
            .broadcast();

        // No need to sync testWalletBuyer after sending; the wallet's utxo set updates on build

        // But we do need to sync the seller wallet which has not yet been synced
        await testWalletSeller.sync();

        // Verify seller has TokenTheta
        const sellerThetaUtxos = testWalletSeller.utxos.filter(
            utxo => utxo.token?.tokenId === tokenThetaId,
        );
        expect(sellerThetaUtxos.length).to.equal(10);

        // Verify buyer has TokenGamma but no TokenTheta
        const buyerGammaUtxos = testWalletBuyer.utxos.filter(
            utxo => utxo.token?.tokenId === tokenGammaId,
        );
        expect(buyerGammaUtxos.length).to.equal(1);
        expect(buyerGammaUtxos[0].token?.atoms).to.equal(100n);

        const buyerThetaUtxos = testWalletBuyer.utxos.filter(
            utxo => utxo.token?.tokenId === tokenThetaId,
        );
        expect(buyerThetaUtxos.length).to.equal(0);

        // Step 5: Buyer creates swap action
        // Buyer sends 1 TokenGamma to seller, expects 1 TokenTheta in return
        // Re-fetch seller's theta utxos after fuel prep
        const sellerThetaUtxosForSwap = testWalletSeller.utxos.filter(
            utxo => utxo.token?.tokenId === tokenThetaId,
        );
        const swapAction: payment.Action = {
            outputs: [
                { sats: 0n },
                // Buyer sends 1 TokenGamma to seller
                {
                    sats: 546n,
                    script: testWalletSeller.script,
                    tokenId: tokenGammaId,
                    atoms: 1n,
                },
                // Buyer receives 1 TokenTheta (seller will provide input)
                {
                    sats: 546n,
                    script: testWalletBuyer.script,
                    tokenId: tokenThetaId,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: tokenGammaId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'SEND',
                    tokenId: tokenThetaId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Step 6: Build postage tx with ignoredTokenIds for TokenTheta
        // This allows buyer to create the tx without having TokenTheta inputs
        const postageTx = testWalletBuyer
            .action(swapAction, {
                satsStrategy: SatsSelectionStrategy.NO_SATS,
                ignoredTokenIds: [tokenThetaId],
            })
            .buildPostage();

        // The postage tx has only the buyer's TokenGamma input
        expect(postageTx.txBuilder.inputs.length).to.equal(1);

        // Outputs include: OP_RETURN, TokenGamma to seller, TokenTheta to buyer, TokenGamma change
        expect(postageTx.txBuilder.outputs.length).to.equal(4);

        // Step 7: Get the serialized hex of this tx
        const serializedTx = postageTx.partiallySignedTx.ser();
        const serializedHex = toHex(serializedTx);

        // Verify we can get the hex
        expect(serializedHex).to.equal(
            '0200000001e2e105128adc4622a1f239a9e553d82a3fee2b91cdbad5ddc1a76cfa6812a1870100000064418275ad54059373de44eb2df7ab1d2085f0fb9763c6a99dada35d01d7a39a59cae675e32b7d561e55ad37cb49bcde6397f1f0d2b37459801b1b2cb7cac86d1a3fc121022ed557f5ad336b31a49857e4e9664954ac33385aa20a93e2d64bfe7f08f51277ffffffff040000000000000000786a503d534c5032000453454e44e2e105128adc4622a1f239a9e553d82a3fee2b91cdbad5ddc1a76cfa6812a1870301000000000000000000000063000000000037534c5032000453454e4453b05bd1a432d216152c68f6249b582a9ca9609c6a220ae09704dc787800a9a00200000000000001000000000022020000000000001976a9148320611ff032223c1f4bb1fbbd2291fd2b3f43d988ac22020000000000001976a914df01eaac7d4f3e28cf3b8929590766d3559e7a6988ac22020000000000001976a914df01eaac7d4f3e28cf3b8929590766d3559e7a6988ac00000000',
        );

        // Step 8: Deserialize the tx (as seller would receive it)
        const deserializedTx = Tx.deser(serializedTx);
        // 1 input, the gamma utxo used to buy theta
        expect(deserializedTx.inputs).to.have.length(1);
        // OP_RETURN, Gamma token to the buyer, Theta token to the seller, Gamma token change to the buyer
        expect(deserializedTx.outputs).to.have.length(4);

        // Step 9: Seller adds TokenTheta input and completes the tx
        const sellerConstructedPostageTx = new PostageTx(deserializedTx);

        // Get the input sats from existing inputs
        // We know this as we are writing the test, but a production app would need to trust the sender or inspect the utxo by its script using chronik
        const preSwapInputSats = 546n; // Buyer's TokenGamma input

        // Seller adds their TokenTheta utxo and fuel, then signs
        const broadcastableTx = sellerConstructedPostageTx.addFuelAndSign(
            testWalletSeller,
            preSwapInputSats,
            // We need to add a TokenTheta utxo as a required input
            // Note in this test, we know all the utxos are qty 1, and we know the buyer wants qty 1
            // However for a production setup, we would have to parse the EMPP OP_RETURN and check the outputs to be sure of the requested quantity
            // We may also need to validate the buyer's token input utxo to ensure it is properly indexed.
            [sellerThetaUtxosForSwap[0]],
        );

        // Step 10: Broadcast the complete transaction
        const broadcastResp = await broadcastableTx.broadcast();

        // Inspect the tx from chronik
        const tx = await chronik.tx(broadcastResp.broadcasted[0]);

        // We have added inputs
        expect(tx.inputs).to.have.length(4);

        // 1st input is Gamma token input from the buyer
        expect(tx.inputs[0].token).to.deep.equal({
            atoms: 100n,
            entryIdx: 0,
            isMintBaton: false,
            tokenId: tokenGammaId,
            tokenType: ALP_TOKEN_TYPE_STANDARD,
        });

        // 2nd input is added token from the Seller
        expect(tx.inputs[1].token).to.deep.equal({
            atoms: 1n,
            entryIdx: 1,
            isMintBaton: false,
            tokenId: tokenThetaId,
            tokenType: ALP_TOKEN_TYPE_STANDARD,
        });

        // 3rd and 4th inputs are sats only; postage stamps
        expect(tx.inputs[2].sats).to.equal(1000n);
        expect(tx.inputs[3].sats).to.equal(1000n);

        // No outputs were modified
        expect(tx.outputs).to.have.length(4);
        // 1st output is OP_RETURN, EMPP for 2 token sends
        expect(tx.outputs[0].outputScript).to.equal(
            '6a503d534c5032000453454e44e2e105128adc4622a1f239a9e553d82a3fee2b91cdbad5ddc1a76cfa6812a1870301000000000000000000000063000000000037534c5032000453454e4453b05bd1a432d216152c68f6249b582a9ca9609c6a220ae09704dc787800a9a002000000000000010000000000',
        );

        // 2nd output is Gamma to Seller
        expect(tx.outputs[1]).to.deep.equal({
            sats: 546n,
            outputScript: testWalletSeller.script.toHex(),
            token: {
                tokenId: tokenGammaId,
                entryIdx: 0,
                isMintBaton: false,
                atoms: 1n,
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        });

        // 3rd output is Theta to Buyer
        expect(tx.outputs[2]).to.deep.equal({
            sats: 546n,
            outputScript: testWalletBuyer.script.toHex(),
            token: {
                tokenId: tokenThetaId,
                entryIdx: 1,
                isMintBaton: false,
                atoms: 1n,
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        });

        // 4th output is Gamma change to Buyer
        expect(tx.outputs[3]).to.deep.equal({
            sats: 546n,
            outputScript: testWalletBuyer.script.toHex(),
            token: {
                tokenId: tokenGammaId,
                entryIdx: 0,
                isMintBaton: false,
                atoms: 99n,
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        });

        // It's a valid token tx
        expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We have at least 2 inputs (buyer's gamma + seller's theta + possible fuel)
        expect(tx.inputs.length).to.be.greaterThanOrEqual(2);

        // Sync wallets to verify final state
        // Note that we DO NOT expect either wallet to be synced after this swap tx
        // The buyer wallet should have adjusted for its spent utxo, but not its received utxo, as
        // the buyer cannot know if and when the seller will complete and broadcast the tx
        // Instead of a full sync, we can use the addReceivedTx method for a surgical utxo update
        testWalletBuyer.addReceivedTx(tx);
        testWalletSeller.addReceivedTx(tx);

        // Confirm this is the same as syncing
        const testWalletBuyerUtxosAfterCatch = testWalletBuyer.utxos;
        const testWalletSellerUtxosAfterCatch = testWalletSeller.utxos;

        // Sync to show that addReceivedTx is the same as syncing, even for a tx with inputs and outputs across wallets, for each wallet
        await testWalletBuyer.sync();
        await testWalletSeller.sync();
        expect(testWalletBuyerUtxosAfterCatch.length).to.equal(
            testWalletBuyer.utxos.length,
        );
        expect(testWalletSellerUtxosAfterCatch.length).to.equal(
            testWalletSeller.utxos.length,
        );

        // Sort UTXOs by outpoint (txid, then outIdx) for comparison
        const sortUtxosByOutpoint = (utxos: typeof testWalletBuyer.utxos) => {
            return [...utxos].sort((a, b) => {
                const txidCompare = a.outpoint.txid.localeCompare(
                    b.outpoint.txid,
                );
                if (txidCompare !== 0) return txidCompare;
                return a.outpoint.outIdx - b.outpoint.outIdx;
            });
        };

        expect(
            sortUtxosByOutpoint(testWalletBuyerUtxosAfterCatch),
        ).to.deep.equal(sortUtxosByOutpoint(testWalletBuyer.utxos));
        expect(
            sortUtxosByOutpoint(testWalletSellerUtxosAfterCatch),
        ).to.deep.equal(sortUtxosByOutpoint(testWalletSeller.utxos));

        // Verify buyer now has TokenTheta
        const buyerThetaUtxosAfter = testWalletBuyer.utxos.filter(
            utxo => utxo.token?.tokenId === tokenThetaId,
        );
        expect(buyerThetaUtxosAfter.length).to.equal(1);
        expect(buyerThetaUtxosAfter[0].token?.atoms).to.equal(1n);

        // Verify seller now has TokenGamma
        const sellerGammaUtxosAfter = testWalletSeller.utxos.filter(
            utxo => utxo.token?.tokenId === tokenGammaId,
        );
        expect(sellerGammaUtxosAfter.length).to.equal(1);
        expect(sellerGammaUtxosAfter[0].token?.atoms).to.equal(1n);
    });
    it('We can trust chronik token preflight check to validate token inputs of swap txs', async () => {
        /**
         * Note this does not necessarily "cover" all potential counterfeit swap scenarios
         * Buyers must construct only a tx they are willing to finalize before it broadcasts
         * Sellers must validate incoming txs and only sign and broadcast if they are satisfied with the inputs and outputs
         */

        // Step 1: Create two wallets - buyer and seller
        const testWalletBuyerAttacker = Wallet.fromSk(
            fromHex('33'.repeat(32)),
            chronik,
        );
        const testWalletLazySeller = Wallet.fromSk(
            fromHex('34'.repeat(32)),
            chronik,
        );

        // Send XEC to buyerAttacker wallet only (seller will get XEC + tokens in one tx later)
        const buyerWalletSats = 1_000_000_00n; // 1M XEC
        await runner.sendToScript(
            buyerWalletSats,
            testWalletBuyerAttacker.script,
        );

        // Sync buyer wallet
        await testWalletBuyerAttacker.sync();

        // Step 2: Buyer mints TokenPsi
        const tokenPsiGenesisInfo = {
            tokenTicker: 'PSI',
            tokenName: 'Token Psi',
            url: 'psi.token',
            decimals: 0,
        };

        const tokenPsiGenesisAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: testWalletBuyerAttacker.script,
                    atoms: 100n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo: tokenPsiGenesisInfo,
                },
            ],
        };

        const tokenPsiGenesisResp = await testWalletBuyerAttacker
            .action(tokenPsiGenesisAction)
            .build()
            .broadcast();

        const tokenPsiId = tokenPsiGenesisResp.broadcasted[0];

        // No need to sync after genesis; the wallet's utxo set updates on build

        // Step 3: Buyer mints TokenEpsilon
        const tokenEpsilonGenesisInfo = {
            tokenTicker: 'EPSILON',
            tokenName: 'Token Epsilon',
            url: 'epsilon.token',
            decimals: 0,
        };

        // Create multiple qty-1 outputs for TokenEpsilon, all of them at the Seller wallet
        const tokenEpsilonGenesisAction: payment.Action = {
            outputs: [
                { sats: 0n },
                // Create 10 qty-1 outputs
                ...Array.from({ length: 10 }, () => ({
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: testWalletLazySeller.script,
                    atoms: 1n,
                })),
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo: tokenEpsilonGenesisInfo,
                },
            ],
        };

        const tokenEpsilonGenesisResp = await testWalletBuyerAttacker
            .action(tokenEpsilonGenesisAction)
            .build()
            .broadcast();

        const tokenEpsilonId = tokenEpsilonGenesisResp.broadcasted[0];

        // No need to sync after genesis; the wallet's utxo set updates on build

        // Step 4: Send 20 fuel UTXOs to seller of 1000 sats each
        // We could do this kind of swap as ... token only postage. But we are already adding the token utxo. A token swap server could also provide fuel sats.
        const sendEpsilonToLazySellerAction: payment.Action = {
            outputs: [
                // Send 20 fuel UTXOs of 1000 sats (10 XEC) each to seller
                ...Array.from({ length: 20 }, () => ({
                    sats: 1000n,
                    script: testWalletLazySeller.script,
                })),
            ],
            tokenActions: [
                // No token action; the seller already has qty-1 utxos of the to-be-sold token from its genesis tx
            ],
        };

        await testWalletBuyerAttacker
            .action(sendEpsilonToLazySellerAction)
            .build()
            .broadcast();

        // No need to sync testWalletBuyerAttacker after sending; the wallet's utxo set updates on build

        // But we have not yet synced the lazy seller wallet, so sync that one
        await testWalletLazySeller.sync();

        // Verify seller has TokenEpsilon
        const sellerEpsilonUtxos = testWalletLazySeller.utxos.filter(
            utxo => utxo.token?.tokenId === tokenEpsilonId,
        );
        expect(sellerEpsilonUtxos.length).to.equal(10);

        // Verify buyer has TokenPsi but no TokenEpsilon
        const buyerPsiUtxos = testWalletBuyerAttacker.utxos.filter(
            utxo => utxo.token?.tokenId === tokenPsiId,
        );
        expect(buyerPsiUtxos.length).to.equal(1);
        expect(buyerPsiUtxos[0].token?.atoms).to.equal(100n);

        const buyerEpsilonUtxos = testWalletBuyerAttacker.utxos.filter(
            utxo => utxo.token?.tokenId === tokenEpsilonId,
        );
        expect(buyerEpsilonUtxos.length).to.equal(0);

        // Step 5: Buyer creates a fake token utxo to support later construction of a counterfeit swap tx

        // Create a fake XEC-only utxo (not a token utxo) that the attacker will try to use
        // as if it were a TokenPsi utxo
        const fakeTokenUTxoResp = await testWalletBuyerAttacker
            .action({
                outputs: [
                    // Fake token utxo (actually just XEC)
                    {
                        sats: 546n,
                        script: testWalletBuyerAttacker.script,
                    },
                ],
            })
            .build()
            .broadcast();

        // No need to sync testWalletBuyerAttacker after building; the wallet's utxo set updates on build

        // Get the fake UTXO from the wallet
        const fakeTokenUtxoTx = await chronik.tx(
            fakeTokenUTxoResp.broadcasted[0],
        );
        const fakeUtxo = testWalletBuyerAttacker.utxos.find(
            utxo =>
                utxo.outpoint.txid === fakeTokenUtxoTx.txid &&
                utxo.outpoint.outIdx === 0,
        );

        if (!fakeUtxo) {
            throw new Error('Fake UTXO not found in wallet');
        }

        // Step 6: Manually build a fake postage tx using the fake XEC-only UTXO
        // pretending it's a TokenPsi UTXO
        // This simulates an attack where the buyer tries to use a non-token UTXO
        // as if it were a token UTXO

        // Convert fake UTXO to TxBuilderInput with ANYONECANPAY sighash
        const fakeInput: TxBuilderInput =
            testWalletBuyerAttacker.p2pkhUtxoToBuilderInput(
                fakeUtxo,
                ALL_ANYONECANPAY_BIP143,
            );

        // Manually build the OP_RETURN with two SEND sections:
        // 1. TokenPsi SEND: [1 atom to seller, 99 atoms change to buyer]
        // 2. TokenEpsilon SEND: [1 atom to buyer]
        const opReturnScript = emppScript([
            alpSend(tokenPsiId, ALP_TOKEN_TYPE_STANDARD.number, [1n, 99n]),
            alpSend(tokenEpsilonId, ALP_TOKEN_TYPE_STANDARD.number, [1n]),
        ]);

        // Build the outputs manually
        const fakeOutputs: TxBuilderOutput[] = [
            // OP_RETURN
            { sats: 0n, script: opReturnScript },
            // TokenPsi to seller (1 atom)
            {
                sats: DEFAULT_DUST_SATS,
                script: testWalletLazySeller.script,
            },
            // TokenEpsilon to buyer (1 atom)
            {
                sats: DEFAULT_DUST_SATS,
                script: testWalletBuyerAttacker.script,
            },
            // TokenPsi change to buyer (99 atoms)
            {
                sats: DEFAULT_DUST_SATS,
                script: testWalletBuyerAttacker.script,
            },
        ];

        // Create and sign the fake transaction
        const fakeTxBuilder = new TxBuilder({
            inputs: [fakeInput],
            outputs: fakeOutputs,
        });

        const fakePartiallySignedTx = fakeTxBuilder.sign({
            feePerKb: DEFAULT_FEE_SATS_PER_KB,
            dustSats: DEFAULT_DUST_SATS,
        });

        // Create a PostageTx from the fake transaction
        const postageTx = new PostageTx(fakePartiallySignedTx);

        // The postage tx has only the buyer's TokenPsi input
        expect(postageTx.txBuilder.inputs.length).to.equal(1);

        // Outputs include: OP_RETURN, TokenPsi to seller, TokenEpsilon to buyer, TokenPsi change
        expect(postageTx.txBuilder.outputs.length).to.equal(4);

        // Step 7: Get the serialized hex of this fake tx
        const serializedTx = postageTx.partiallySignedTx.ser();

        // Step 8: Deserialize the tx (as seller would receive it)
        const deserializedTx = Tx.deser(serializedTx);
        // 1 input, the fake XEC-only utxo (not actually a TokenPsi utxo)
        expect(deserializedTx.inputs).to.have.length(1);
        // OP_RETURN, Psi token to the seller, Epsilon token to the buyer, Psi token change to the buyer
        expect(deserializedTx.outputs).to.have.length(4);

        // Step 9: Seller adds TokenEpsilon input and completes the tx
        const sellerConstructedPostageTx = new PostageTx(deserializedTx);

        // Get the input sats from existing inputs
        // We know this as we are writing the test, but a production app would need to trust the sender or inspect the utxo by its script using chronik
        const preSwapInputSats = 546n; // Buyer's fake "TokenPsi" input (actually just XEC)

        // Seller adds their TokenEpsilon utxo and fuel, then signs
        const broadcastableTx = sellerConstructedPostageTx.addFuelAndSign(
            testWalletLazySeller,
            preSwapInputSats,
            [sellerEpsilonUtxos[0]],
        );

        // Step 10: Broadcast the spoof swap; it fails because the token inputs do not match the outputs
        const attackingSwapResp = await broadcastableTx.broadcast();

        expect(attackingSwapResp.success).to.equal(false);
        expect(attackingSwapResp.errors).to.have.length(1);
        expect(attackingSwapResp.errors?.[0]).to.equal(
            `Error: Failed getting /broadcast-tx: 400: Tx ${broadcastableTx.txs[0].txid()} failed token checks: Validation error: Insufficient token input output sum: 0 < 100. Unexpected burn: Burns 1 atoms. Reason(s): Invalid coloring at pushdata idx 1: Overlapping atoms when trying to color 1 at index 1, output is already colored with 1 of ${tokenPsiId} (ALP STANDARD (V0))..`,
        );
    });
});
