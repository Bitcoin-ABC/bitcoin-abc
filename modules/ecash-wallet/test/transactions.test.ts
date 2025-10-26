// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * transactions.test.ts
 *
 * Build and broadcast eCash txs using the ecash-wallet lib and regtest
 * Confirm validity of txs using chronik and chronik-client
 */

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    Address,
    DEFAULT_DUST_SATS,
    Script,
    toHex,
    fromHex,
    TxOutput,
    SLP_MAX_SEND_OUTPUTS,
    ALP_POLICY_MAX_OUTPUTS,
    OP_RETURN_MAX_BYTES,
    payment,
    SLP_TOKEN_TYPE_FUNGIBLE,
    ALP_TOKEN_TYPE_STANDARD,
    SLP_TOKEN_TYPE_MINT_VAULT,
    SLP_TOKEN_TYPE_NFT1_GROUP,
    SLP_TOKEN_TYPE_NFT1_CHILD,
    ALL_BIP143,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet } from '../src/wallet';
import { GENESIS_TOKEN_ID_PLACEHOLDER } from 'ecash-lib/dist/payment';

use(chaiAsPromised);

// Configure available satoshis
const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

const MOCK_DESTINATION_ADDRESS = Address.p2pkh('deadbeef'.repeat(5)).toString();
const MOCK_DESTINATION_SCRIPT = Script.fromAddress(MOCK_DESTINATION_ADDRESS);

// Helper function
const getDustOutputs = (count: number) => {
    const outputs: TxOutput[] = [];
    for (let i = 0; i < count; i++) {
        // Convert integer to hex string (without '0x' prefix)
        let hex = i.toString(16);

        // Pad with leading zeros to 40 characters (20 bytes)
        // NB we assume the number is less than 40 bytes, i.e. < 0xffffffffffffffffffffffffffffffffffffffff
        hex = hex.padStart(40, '0');

        const script = Script.p2pkh(fromHex(hex));
        outputs.push({ script, sats: DEFAULT_DUST_SATS });
    }
    return outputs;
};

describe('Wallet can build and broadcast on regtest', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        // Setup using ecash-agora_base so we have agora plugin available
        // ecash-wallet will support agora txs
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('We can send an eCash tx to a single recipient', async () => {
        // Init the wallet
        const testWallet = Wallet.fromSk(fromHex('12'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, testWallet.script);

        // Sync the wallet
        await testWallet.sync();

        // We can send a tx to a single recipient
        const sendSats = 546n;
        const resp = await testWallet
            .action({
                outputs: [
                    {
                        script: MOCK_DESTINATION_SCRIPT,
                        sats: sendSats,
                    },
                ],
            })
            .build()
            .broadcast();

        const firstTxid = resp.broadcasted[0];

        expect(firstTxid).to.equal(
            'c979983f62cb14ea449dec2982fd34ab2cac522634f38ce4b0cd32601ef05047',
        );

        // We can check chronik and see that the tx had change added automatically
        const firstTx = await chronik.tx(firstTxid);
        expect(firstTx.size).to.equal(219);

        // The tx was sent with default params so fee expected to be 1000 sats per kb
        // inputSats = outputSats + fee
        // inputSats = (sendSats + changeSats) + fee
        // changeSats = inputSats - sendSats - fee
        const expectedChange = inputSats - sendSats - BigInt(firstTx.size);
        expect(firstTx.outputs[1].sats).to.equal(expectedChange);

        // We can send to multiple recipients
        const OUTPUTS_TO_TEST = 12;
        const dozenOutputs = getDustOutputs(OUTPUTS_TO_TEST);

        const respTwo = await testWallet
            .action({
                outputs: dozenOutputs,
            })
            .build()
            .broadcast();

        const secondTxid = respTwo.broadcasted[0];

        expect(secondTxid).to.equal(
            'a62b0564fcefa5e3fc857e8ad90a408c00421608d7fdc3d13f335a52f29b3fc8',
        );

        // We see expected error if we try to broadcast a tx above the size limit
        // Load up some more sats to build too many outputs (10M XEC)
        await runner.sendToScript(10_000_000_00n, testWallet.script);

        const threeThousandOutputs = getDustOutputs(3_000);

        const tooBigFailure = await testWallet
            .action({
                outputs: threeThousandOutputs,
            })
            .build()
            .broadcast();
        expect(tooBigFailure.success).to.equal(false);
        expect(tooBigFailure.broadcasted).to.have.length(0);
        expect(tooBigFailure.unbroadcasted).to.have.length(1);
        expect(tooBigFailure.errors).to.deep.equal([
            `Error: Failed getting /broadcast-tx: 400: Broadcast failed: Transaction rejected by mempool: tx-size`,
        ]);
    });
    it('We can handle SLP SLP_TOKEN_TYPE_FUNGIBLE token actions', async () => {
        // Init the wallet
        const slpWallet = Wallet.fromSk(fromHex('13'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, slpWallet.script);

        // Sync the wallet
        await slpWallet.sync();

        // We can mint a fungible token with a mint baton
        const slpGenesisInfo = {
            tokenTicker: 'SLP',
            tokenName: 'SLP Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for this tx
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: slpWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    genesisInfo: slpGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await slpWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpGenesisTokenId = resp.broadcasted[0];

        // It's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_FUNGIBLE');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(slpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQty);

        // We can mint more of our test token
        const extendedMintQuantity = 333n;

        // Construct the Action for this tx
        const slpMintAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 (same as GENESIS) per SLP spec */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: extendedMintQuantity,
                },
                /** Some normal outputs to show we can have a mint baton at an outIdx > 2 */
                { sats: 1000n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1001n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1002n, script: MOCK_DESTINATION_SCRIPT },
                /** Mint baton at outIdx 5, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'MINT',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // Build and broadcast the MINT tx
        await slpWallet.action(slpMintAction).build().broadcast();

        // Token supply has increased by the mint amount
        const updatedSupply = (
            await chronik.tokenId(slpGenesisTokenId).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);

        expect(updatedSupply).to.equal(genesisMintQty + extendedMintQuantity);

        // Include SLP_MAX_SEND_OUTPUTS-1 outputs so we can (just) fit token change AND a leftover output
        const tokenSendOutputs: payment.PaymentOutput[] = [];
        for (let i = 1; i <= SLP_MAX_SEND_OUTPUTS - 1; i++) {
            tokenSendOutputs.push({
                sats: 546n,
                script: slpWallet.script,
                tokenId: slpGenesisTokenId,
                atoms: BigInt(i),
            });
        }

        // We can SEND our test token
        const slpSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-18
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        const slpSendActionTooManyOutputs: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-17
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
                // Add a single additional token output
                // We will try to add a token change output and this will be an output too far for spec
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: BigInt(1n),
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // For SLP, we can't build a tx that needs token change if that token change would be the 20th output
        expect(() =>
            slpWallet
                .clone()
                .action(slpSendActionTooManyOutputs)
                .build(ALL_BIP143),
        ).to.throw(
            Error,
            `Tx needs a token change output to avoid burning atoms of ${slpGenesisTokenId}, but the token change output would be at outIdx 20 which is greater than the maximum allowed outIdx of 19 for SLP_TOKEN_TYPE_FUNGIBLE.`,
        );

        // Build and broadcast
        const sendResponse = await slpWallet
            .action(slpSendAction)
            .build()
            .broadcast();

        const slpSendTxid = sendResponse.broadcasted[0];

        const sendTx = await chronik.tx(slpSendTxid);
        expect(sendTx.tokenEntries).to.have.length(1);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We cannot burn an SLP amount that we do not have exact utxos for
        const burnAtomsThatDoNotMatchUtxos = 300n;
        const slpCannotBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms: burnAtomsThatDoNotMatchUtxos,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        const burnAtoms = 333n;
        const slpBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // Build and broadcast
        const burnResponse = await slpWallet
            .action(slpBurnAction)
            .build()
            .broadcast();

        const burnTx = await chronik.tx(burnResponse.broadcasted[0]);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We can burn exact atoms that do not match an existing utxo with a chained tx
        const chainedBurn = await slpWallet
            .action(slpCannotBurnAction)
            .build()
            .broadcast();
        expect(chainedBurn.success).to.equal(true);
        expect(chainedBurn.broadcasted).to.have.length(2);

        const burnUtxoPrepTxid = chainedBurn.broadcasted[0];
        const chainedBurnTxid = chainedBurn.broadcasted[1];

        const burnUtxoPrepTx = await chronik.tx(burnUtxoPrepTxid);
        const chainedBurnTx = await chronik.tx(chainedBurnTxid);

        expect(burnUtxoPrepTx.tokenEntries).to.have.length(1);
        expect(burnUtxoPrepTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnUtxoPrepTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(burnUtxoPrepTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        expect(chainedBurnTx.tokenEntries).to.have.length(1);
        expect(chainedBurnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(chainedBurnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(chainedBurnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');
    });
    it('We can handle ALP ALP_TOKEN_TYPE_STANDARD token actions', async () => {
        // Init the wallet
        const alpWallet = Wallet.fromSk(fromHex('14'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, alpWallet.script);

        // Sync the wallet
        await alpWallet.sync();

        // We can GENESIS a fungible token with multiple mint quantities and multiple mint batons
        const alpGenesisInfo = {
            tokenTicker: 'ALP',
            tokenName: 'ALP Test Token',
            url: 'cashtab.com',
            decimals: 0,
            /** ALP allows arbitrary data in genesis */
            data: 'deadbeef',
            authPubkey: toHex(alpWallet.pk),
        };

        const genesisMintQtyAlpha = 1_000n;
        const genesisMintQtyBeta = 2_000n;

        // Construct the Action for this tx
        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Misc XEC output at outIdx 1, there is no spec req in ALP for genesis qty at outIdx 1 */
                { sats: 5_555n, script: alpWallet.script },
                /** Mint qty at outIdx 2 for a token we do not have */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQtyAlpha,
                },
                /** Another misc XEC output at outIdx 2, to show we support non-consecutive mint quantities */
                { sats: 3_333n, script: alpWallet.script },
                /** Mint qty at outIdx 3 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQtyBeta,
                },
                /**
                 * Another misc XEC output at outIdx 4, to show
                 * that mintBaton outIdx does not necessarily
                 * immediately follow mint qty */
                { sats: 5_555n, script: alpWallet.script },
                /** Mint baton at outIdx 5 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
                /** Another mint baton at outIdx 6 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await alpWallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const alpGenesisTokenId = resp.broadcasted[0];

        // It's a valid ALP genesis tx
        const tokenInfo = await chronik.token(alpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('ALP_TOKEN_TYPE_STANDARD');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(alpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQtyAlpha + genesisMintQtyBeta);

        // We get the expected number of mint batons
        const alpTokenUtxos = await chronik.tokenId(alpGenesisTokenId).utxos();
        let numBatons = 0;
        alpTokenUtxos.utxos.forEach(tokenUtxo => {
            if (tokenUtxo.token?.isMintBaton) {
                numBatons += 1;
            }
        });
        expect(numBatons).to.equal(2);

        // We can mint more of our ALP test token
        // NB we cannot combine MINT with SEND for ALP txs
        // NB it would be on-spec to combine MINT with BURN for ALP,
        // but this is NOT supported by ecash-wallet as we would have to
        // provide exact-quantity utxos

        const extendedMintQuantityAlpha = 3_000n;
        const extendedMintQuantityBeta = 5_000n;

        // Construct the Action for this tx
        const alpMintAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: extendedMintQuantityAlpha,
                },
                /** A non-token output at outIdx 2 */
                { sats: 1000n, script: MOCK_DESTINATION_SCRIPT },
                /** Another mint qty at outIdx 3 as ALP supports multiple non-consecutive mint quantities */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: extendedMintQuantityBeta,
                },
                /** Some normal outputs to show we can have a mint baton anywhere later */
                { sats: 1001n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1002n, script: MOCK_DESTINATION_SCRIPT },
                /** Mint baton at outIdx 6 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
                /** Another mint baton at outIdx 7 because ALP lets you mint multiple mint batons */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** ALP mint action */ {
                    type: 'MINT',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast the MINT tx
        await alpWallet.action(alpMintAction).build().broadcast();

        // Token supply has increased by the mint amount
        const updatedSupply = (
            await chronik.tokenId(alpGenesisTokenId).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(updatedSupply).to.equal(
            genesisMintQtyAlpha +
                genesisMintQtyBeta +
                extendedMintQuantityAlpha +
                extendedMintQuantityBeta,
        );

        // Now we expect an additional mint baton
        const alpTokenUtxosAfterMint = await chronik
            .tokenId(alpGenesisTokenId)
            .utxos();
        let numBatonsNow = 0;
        alpTokenUtxosAfterMint.utxos.forEach(tokenUtxo => {
            if (tokenUtxo.token?.isMintBaton) {
                numBatonsNow += 1;
            }
        });
        expect(numBatonsNow).to.equal(numBatons + 1);

        // We can MINT and BURN the same tokenId ... if we want to for some reason
        const extendedMintQuantityDelta = 1n;

        // NB the burn qty must be exactly summable by inputs for a MINT + BURN, as we can not also have SEND for the same tokenId
        const burnAtomsWithMint = 1000n;

        // Construct the Action for this tx
        const alpMintandBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: extendedMintQuantityDelta,
                },
                /** Mint baton at outIdx 2 */
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: 0n,
                    isMintBaton: true,
                },
            ],
            tokenActions: [
                {
                    type: 'MINT',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'BURN',
                    tokenId: alpGenesisTokenId,
                    burnAtoms: burnAtomsWithMint,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast the MINT tx
        const mintBurn = await alpWallet
            .action(alpMintandBurnAction)
            .build()
            .broadcast();

        const mintAndBurnTx = await chronik.tx(mintBurn.broadcasted[0]);

        // This is a valid MINT and BURN tx
        expect(mintAndBurnTx.tokenEntries).to.have.length(1);
        expect(mintAndBurnTx.tokenEntries[0].txType).to.equal('MINT');
        expect(mintAndBurnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            burnAtomsWithMint,
        );
        expect(mintAndBurnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            burnAtomsWithMint,
        );
        expect(mintAndBurnTx.tokenEntries[0].burnsMintBatons).to.equal(false);
        // I dunno if I would call this normal but I don't have a better idea
        expect(mintAndBurnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Token supply has increased by the mint amount AND decreased by the burn amount 🤯
        const latestSupply = (
            await chronik.tokenId(alpGenesisTokenId).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(latestSupply).to.equal(
            updatedSupply + extendedMintQuantityDelta - burnAtomsWithMint,
        );

        // We can mint more, and also include a second genesis tx
        /**
         * TODO
         * [] Perhaps we should make minting 1 mint baton the DEFAULT
         *    condition. Could see it being pretty easy to accidentally
         *    NOT mint another baton, thereby burning (mb the only) baton
         */

        const extendedMintQuantityGamma = 5n;
        const alpGenesisBetaMintQty = 1000n;

        const alpGenesisInfoBeta = {
            tokenTicker: 'BETA',
            tokenName: 'ALP Test Token Beta',
            url: 'cashtab.com',
            decimals: 9,
            /** ALP allows arbitrary data in genesis */
            data: 'abadcafe',
            authPubkey: toHex(alpWallet.pk),
        };

        // Construct the Action for this tx
        const alpGenesisAndMintAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Genesis mint qty at outIdx 1*/
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: alpGenesisBetaMintQty,
                },
                /** NB no mint baton for this genesis */
                /** Mint qty for slpGenesisAlpha at outIdx 1*/
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: alpGenesisTokenId,
                    atoms: extendedMintQuantityGamma,
                },
                /** NB no mint baton for alpGenesisTokenId, so impact is we burn a mint baton */
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfoBeta,
                },
                {
                    type: 'MINT',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast
        const genesisAndMintResp = await alpWallet
            .action(alpGenesisAndMintAction)
            .build()
            .broadcast();

        const alpGenesisTokenIdBeta = genesisAndMintResp.broadcasted[0];

        // It's a valid ALP genesis tx
        const tokenInfoBeta = await chronik.token(alpGenesisTokenIdBeta);
        expect(tokenInfoBeta.tokenType.type).to.equal(
            'ALP_TOKEN_TYPE_STANDARD',
        );

        // We can get token supply from checking utxos
        const tokenBetaSupply = (
            await chronik.tokenId(alpGenesisTokenIdBeta).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(tokenBetaSupply).to.equal(alpGenesisBetaMintQty);

        // We get the expected number of mint batons for the new token, 0
        // NB we burned a mint baton with this tx without specifying any burn instructions
        // [] TODO, we should throw an error for this condition
        const alpTokenUtxosBeta = await chronik
            .tokenId(alpGenesisTokenIdBeta)
            .utxos();
        let numBatonsBeta = 0;
        alpTokenUtxosBeta.utxos.forEach(tokenUtxo => {
            if (tokenUtxo.token?.isMintBaton) {
                numBatonsBeta += 1;
            }
        });
        expect(numBatonsBeta).to.equal(0);

        // We burned a mint baton for the first token
        const alpTokenUtxosAfterSecondMint = await chronik
            .tokenId(alpGenesisTokenId)
            .utxos();
        let numBatonsAfterBurn = 0;
        alpTokenUtxosAfterSecondMint.utxos.forEach(tokenUtxo => {
            if (tokenUtxo.token?.isMintBaton) {
                numBatonsAfterBurn += 1;
            }
        });
        expect(numBatonsAfterBurn).to.equal(numBatonsNow - 1);

        // We can send multiple tokens in the same tx

        // Note that we expect a change output for BOTH tokens
        // So lets only include TWO fewer outputs than ALP_POLICY_MAX_OUTPUTS
        const alpSendOutputs: payment.PaymentOutput[] = [];
        const EXPECTED_CHANGE_OUTPUTS = 2;
        for (
            let i = 1;
            i <= ALP_POLICY_MAX_OUTPUTS - EXPECTED_CHANGE_OUTPUTS;
            i++
        ) {
            alpSendOutputs.push({
                sats: 546n,
                script: MOCK_DESTINATION_SCRIPT,
                // mix of outputs for each token
                tokenId:
                    i % 2 === 0 ? alpGenesisTokenId : alpGenesisTokenIdBeta,
                atoms: BigInt(i),
            });
        }

        // We can SEND our test token
        const alpSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-27
                 * In this way, we expect token change
                 * at outIdx 29, the higest available outIdx
                 * for ALP token outputs
                 */
                ...alpSendOutputs,
            ],
            tokenActions: [
                /** ALP send action for first token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** ALP send action for 2nd token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenIdBeta,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast
        // Looks like this should work. After all, we will have 29 outputs.
        // But it won't, because we still have to push the 0 atoms into two atomsArrays
        // So we exceed the OP_RETURN
        expect(() =>
            alpWallet.clone().action(alpSendAction).build(ALL_BIP143),
        ).to.throw(
            Error,
            `Specified action results in OP_RETURN of 434 bytes, vs max allowed of ${OP_RETURN_MAX_BYTES}.`,
        );

        // Ok let's cull some outputs
        // Take the first 9 outputs. NB this will give us an OP_RETURN of 218 bytes
        const alpSendOutputsThatFit = alpSendOutputs.slice(0, 9);

        const alpSendActionThatWorks: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-9
                 * In this way, we expect token change
                 * at outIdx 10 and outIdx 11
                 *
                 * Not the highest available outIdx for ALP,
                 * but the highest available given a 223-byte
                 * OP_RETURN constraint
                 */
                ...alpSendOutputsThatFit,
            ],
            tokenActions: [
                /** ALP send action for first token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** ALP send action for 2nd token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenIdBeta,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        const alpSendResponse = await alpWallet
            .action(alpSendActionThatWorks)
            .build()
            .broadcast();

        const alpSendTxid = alpSendResponse.broadcasted[0];

        const sendTx = await chronik.tx(alpSendTxid);
        // We sent two tokens
        expect(sendTx.tokenEntries).to.have.length(2);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Burn all of token 2 and some of token 1
        // We can build and broadcast an ALP BURN
        const alpGenesisTokenIdBurnAtoms = 10n;
        const alpGenesisTokenIdBetaBurnAtomsCannotBurnAll = 100n;
        const alpDoubleBurnError: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Specify a send for alpGenesisTokenId */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpGenesisTokenId,
                    atoms: 111n,
                },
                /**
                 * We don't specify any token SEND outputs
                 * for alpGenesisTokenIdBeta, since we
                 * want to just burn it
                 */
            ],
            tokenActions: [
                /** ALP send action for first token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** ALP burn action for 2nd token */
                {
                    type: 'BURN',
                    tokenId: alpGenesisTokenIdBeta,
                    burnAtoms: alpGenesisTokenIdBetaBurnAtomsCannotBurnAll,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'BURN',
                    tokenId: alpGenesisTokenId,
                    burnAtoms: alpGenesisTokenIdBurnAtoms,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // We cannot burn this quantity of the beta token without specifying a SEND action because we do not have a utxo of this size
        expect(() =>
            alpWallet.clone().action(alpDoubleBurnError).build(ALL_BIP143),
        ).to.throw(
            Error,
            `Unable to find UTXOs for ${alpGenesisTokenIdBeta} with exactly ${alpGenesisTokenIdBetaBurnAtomsCannotBurnAll} atoms. Create a UTXO with ${alpGenesisTokenIdBetaBurnAtomsCannotBurnAll} atoms to burn without a SEND action.`,
        );

        // We can resolve the issue by adding a SEND action for change or by changing the burn amount
        const alpDoubleBurn: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Specify a send for alpGenesisTokenId */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpGenesisTokenId,
                    atoms: 111n,
                },
                /**
                 * We don't specify any token SEND outputs
                 * for alpGenesisTokenIdBeta, since we
                 * want to just burn it
                 */
            ],
            tokenActions: [
                /** ALP send action for first token */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** ALP burn action for 2nd token */
                {
                    type: 'BURN',
                    tokenId: alpGenesisTokenIdBeta,
                    burnAtoms: alpGenesisTokenIdBetaBurnAtomsCannotBurnAll,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /**
                 * NB we have no specified SEND outputs for this
                 * build() will automatically add one to return change
                 * for burnAtoms
                 */
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenIdBeta,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'BURN',
                    tokenId: alpGenesisTokenId,
                    burnAtoms: alpGenesisTokenIdBurnAtoms,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Build and broadcast
        const burnResponse = await alpWallet
            .action(alpDoubleBurn)
            .build()
            .broadcast();

        const burnTx = await chronik.tx(burnResponse.broadcasted[0]);
        expect(burnTx.tokenEntries).to.have.length(2);
        expect(burnTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            alpGenesisTokenIdBurnAtoms,
        );
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            alpGenesisTokenIdBurnAtoms,
        );
        expect(burnTx.tokenEntries[1].actualBurnAtoms).to.equal(
            alpGenesisTokenIdBetaBurnAtomsCannotBurnAll,
        );
        expect(burnTx.tokenEntries[1].intentionalBurnAtoms).to.equal(
            alpGenesisTokenIdBetaBurnAtomsCannotBurnAll,
        );
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We can get an error msg explaining token utxos we are missing, including mint batons
        const tokenWeDoNotHave = '11'.repeat(32);
        const outOfReachAlpAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Specify a send for alpGenesisTokenId, but more than we have */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpGenesisTokenId,
                    atoms: 1_000_000_000_000n,
                },
                /** Mint qty at outIdx 1, but no mint baton*/
                {
                    sats: 546n,
                    script: alpWallet.script,
                    tokenId: tokenWeDoNotHave,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: alpGenesisTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'MINT',
                    tokenId: tokenWeDoNotHave,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        expect(() =>
            alpWallet.clone().action(outOfReachAlpAction).build(ALL_BIP143),
        ).to.throw(
            Error,
            `Missing required token utxos: ${tokenWeDoNotHave} => Missing mint baton, ${alpGenesisTokenId} => Missing 999999990135 atoms`,
        );

        /**
         * Punchlist for regtest cases
         *
         * [] ALP burn mint baton - do we need to change the UX here?
         *    i.e. should we require the user to specify a burned mint baton?
         * [] SLP burn  mint baton
         */
    });
    it('We can handle SLP SLP_TOKEN_TYPE_MINT_VAULT token actions (GENESIS, SEND, and BURN, but not MINT)', async () => {
        // Ref https://github.com/badger-cash/slp-specifications/blob/master/slp-token-type-2.md

        // Init the wallet
        const slpMintVaultWallet = Wallet.fromSk(
            fromHex('15'.repeat(32)),
            chronik,
        );

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, slpMintVaultWallet.script);

        // Sync the wallet
        await slpMintVaultWallet.sync();

        // We can mint an SLP_TOKEN_TYPE_MINT_VAULT token
        // Note that this GenesisInfo is distinct from SLP_TOKEN_TYPE_FUNGIBLE
        // Note that this token does not have mint batons
        const slpMintVaultGenesisInfo = {
            tokenTicker: 'SLP',
            tokenName: 'SLP_TOKEN_TYPE_MINT_VAULT Test Token',
            url: 'cashtab.com',
            decimals: 0,
            /** To mint this token, a tx must include utxos with this outputScript */
            mintVaultScripthash: toHex(slpMintVaultWallet.pkh),
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for this tx
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: slpMintVaultWallet.script,
                    atoms: genesisMintQty,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                    genesisInfo: slpMintVaultGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await slpMintVaultWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpGenesisTokenId = resp.broadcasted[0];

        // It's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_MINT_VAULT');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(slpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQty);

        // Include SLP_MAX_SEND_OUTPUTS-1 outputs so we can (just) fit token change AND a leftover output
        const tokenSendOutputs: payment.PaymentOutput[] = [];
        for (let i = 1; i <= SLP_MAX_SEND_OUTPUTS - 1; i++) {
            tokenSendOutputs.push({
                sats: 546n,
                script: slpMintVaultWallet.script,
                tokenId: slpGenesisTokenId,
                atoms: BigInt(i),
            });
        }

        // We can SEND our test token
        const slpSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-18
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            ],
        };

        const slpSendActionTooManyOutputs: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-17
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
                // Add a single additional token output
                // We will try to add a token change output and this will be an output too far for spec
                {
                    sats: 546n,
                    script: slpMintVaultWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: BigInt(1n),
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            ],
        };

        // For SLP, we can't build a tx that needs token change if that token change would be the 20th output
        expect(() =>
            slpMintVaultWallet
                .clone()
                .action(slpSendActionTooManyOutputs)
                .build(ALL_BIP143),
        ).to.throw(
            Error,
            `Tx needs a token change output to avoid burning atoms of ${slpGenesisTokenId}, but the token change output would be at outIdx 20 which is greater than the maximum allowed outIdx of 19 for SLP_TOKEN_TYPE_MINT_VAULT.`,
        );

        // Build and broadcast
        const sendResponse = await slpMintVaultWallet
            .action(slpSendAction)
            .build()
            .broadcast();

        const slpSendTxid = sendResponse.broadcasted[0];

        const sendTx = await chronik.tx(slpSendTxid);
        expect(sendTx.tokenEntries).to.have.length(1);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We cannot burn an SLP amount that we do not have exact utxos for
        const burnAtomsThatDoNotMatchUtxos = 300n;
        const slpCannotBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms: burnAtomsThatDoNotMatchUtxos,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            ],
        };

        // We can burn an SLP amount that we do not have exact utxos for with a chained tx
        const chainedBurn = await slpMintVaultWallet
            .action(slpCannotBurnAction)
            .build()
            .broadcast();
        expect(chainedBurn.success).to.equal(true);
        expect(chainedBurn.broadcasted).to.have.length(2);

        const burnUtxoPrepTxid = chainedBurn.broadcasted[0];
        const chainedBurnTxid = chainedBurn.broadcasted[1];

        const burnUtxoPrepTx = await chronik.tx(burnUtxoPrepTxid);
        const chainedBurnTx = await chronik.tx(chainedBurnTxid);

        expect(burnUtxoPrepTx.tokenEntries).to.have.length(1);
        expect(burnUtxoPrepTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnUtxoPrepTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(burnUtxoPrepTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        expect(chainedBurnTx.tokenEntries).to.have.length(1);
        expect(chainedBurnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(chainedBurnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(chainedBurnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        const burnAtoms = 700n;
        const slpBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms,
                    tokenType: SLP_TOKEN_TYPE_MINT_VAULT,
                },
            ],
        };

        // Build and broadcast
        const burnResponse = await slpMintVaultWallet
            .action(slpBurnAction)
            .build()
            .broadcast();

        const burnTx = await chronik.tx(burnResponse.broadcasted[0]);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');
    });
    it('We can handle SLP SLP_TOKEN_TYPE_NFT1_GROUP token actions', async () => {
        // NB these tests are functionally identical to the SLP_TOKEN_TYPE_FUNGIBLE tests, except for token type
        // This is in line with spec matches

        // However, when we add support for minting SLP_TOKEN_TYPE_NFT1_CHILD tokens, we will add tests for that
        // unique feature, and will probably also need to test "input prep" txs for SLP_TOKEN_TYPE_NFT1_CHILD tokens,
        // though in a wallet lib it could make sense to do that automatically in a chained tx when minting

        // Init the wallet
        const slpWallet = Wallet.fromSk(fromHex('16'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, slpWallet.script);

        // Sync the wallet
        await slpWallet.sync();

        // We can mint a fungible token with a mint baton
        const slpGenesisInfo = {
            tokenTicker: 'SLP',
            tokenName: 'SLP Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for this tx
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: slpWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    genesisInfo: slpGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await slpWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpGenesisTokenId = resp.broadcasted[0];

        // It's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_NFT1_GROUP');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(slpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQty);

        // We can mint more of our test token
        const extendedMintQuantity = 333n;

        // Construct the Action for this tx
        const slpMintAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 (same as GENESIS) per SLP spec */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: extendedMintQuantity,
                },
                /** Some normal outputs to show we can have a mint baton at an outIdx > 2 */
                { sats: 1000n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1001n, script: MOCK_DESTINATION_SCRIPT },
                { sats: 1002n, script: MOCK_DESTINATION_SCRIPT },
                /** Mint baton at outIdx 5, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'MINT',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // Build and broadcast the MINT tx
        await slpWallet.action(slpMintAction).build().broadcast();

        // Token supply has increased by the mint amount
        const updatedSupply = (
            await chronik.tokenId(slpGenesisTokenId).utxos()
        ).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);

        expect(updatedSupply).to.equal(genesisMintQty + extendedMintQuantity);

        // Include SLP_MAX_SEND_OUTPUTS-1 outputs so we can (just) fit token change AND a leftover output
        const tokenSendOutputs: payment.PaymentOutput[] = [];
        for (let i = 1; i <= SLP_MAX_SEND_OUTPUTS - 1; i++) {
            tokenSendOutputs.push({
                sats: 546n,
                script: slpWallet.script,
                tokenId: slpGenesisTokenId,
                atoms: BigInt(i),
            });
        }

        // We can SEND our test token
        const slpSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-18
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        const slpSendActionTooManyOutputs: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-17
                 * In this way, we expect token change
                 * at outIdx 19, the higest available outIdx
                 * for SLP token outputs
                 */
                ...tokenSendOutputs,
                // Add a single additional token output
                // We will try to add a token change output and this will be an output too far for spec
                {
                    sats: 546n,
                    script: slpWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: BigInt(1n),
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // For SLP, we can't build a tx that needs token change if that token change would be the 20th output
        expect(() =>
            slpWallet
                .clone()
                .action(slpSendActionTooManyOutputs)
                .build(ALL_BIP143),
        ).to.throw(
            Error,
            `Tx needs a token change output to avoid burning atoms of ${slpGenesisTokenId}, but the token change output would be at outIdx 20 which is greater than the maximum allowed outIdx of 19 for SLP_TOKEN_TYPE_NFT1_GROUP.`,
        );

        // Build and broadcast
        const sendResponse = await slpWallet
            .action(slpSendAction)
            .build()
            .broadcast();

        const slpSendTxid = sendResponse.broadcasted[0];

        const sendTx = await chronik.tx(slpSendTxid);
        expect(sendTx.tokenEntries).to.have.length(1);
        expect(sendTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        const burnAtoms = 333n;
        const slpBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // Build and broadcast
        const burnResponse = await slpWallet
            .action(slpBurnAction)
            .build()
            .broadcast();

        const burnTx = await chronik.tx(burnResponse.broadcasted[0]);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We can burn an SLP amount that we do not have exact utxos for
        const burnAtomsThatDoNotMatchUtxos = 300n;
        const slpCannotBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We do not specify any token outputs
                 * for an SLP burn action
                 */
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: slpGenesisTokenId,
                    burnAtoms: burnAtomsThatDoNotMatchUtxos,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // We can intentionally burn an SLP amount that we do not have exact utxos for
        const chainedBurn = await slpWallet
            .action(slpCannotBurnAction)
            .build()
            .broadcast();
        expect(chainedBurn.success).to.equal(true);
        expect(chainedBurn.broadcasted).to.have.length(2);

        const burnUtxoPrepTxid = chainedBurn.broadcasted[0];
        const chainedBurnTxid = chainedBurn.broadcasted[1];

        const burnUtxoPrepTx = await chronik.tx(burnUtxoPrepTxid);
        const chainedBurnTx = await chronik.tx(chainedBurnTxid);

        expect(burnUtxoPrepTx.tokenEntries).to.have.length(1);
        expect(burnUtxoPrepTx.tokenEntries[0].txType).to.equal('SEND');
        expect(burnUtxoPrepTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(burnUtxoPrepTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        expect(chainedBurnTx.tokenEntries).to.have.length(1);
        expect(chainedBurnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(chainedBurnTx.tokenEntries[0].actualBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(
            burnAtomsThatDoNotMatchUtxos,
        );
        expect(chainedBurnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(chainedBurnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');
    });
    it('We can handle SLP SLP_TOKEN_TYPE_NFT1_CHILD token actions', async () => {
        // Init the wallet
        const slpNftWallet = Wallet.fromSk(fromHex('17'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, slpNftWallet.script);

        // Sync the wallet
        await slpNftWallet.sync();

        // Genesis SLP_TOKEN_TYPE_NFT1_GROUP tokens to support minting NFTs
        const slpGenesisInfo = {
            tokenTicker: 'SLP GROUP',
            tokenName: 'SLP Test GROUP',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for this tx
        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: slpNftWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                    genesisInfo: slpGenesisInfo,
                },
            ],
        };

        // Build and broadcast
        const resp = await slpNftWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const slpGenesisTokenId = resp.broadcasted[0];

        // It's a valid SLP genesis tx
        const tokenInfo = await chronik.token(slpGenesisTokenId);
        expect(tokenInfo.tokenType.type).to.equal('SLP_TOKEN_TYPE_NFT1_GROUP');

        // We can get token supply from checking utxos
        const supply = (await chronik.tokenId(slpGenesisTokenId).utxos()).utxos
            .map(utxo => utxo.token!.atoms)
            .reduce((prev, curr) => prev + curr, 0n);
        expect(supply).to.equal(genesisMintQty);

        // We get expected error if we try to mint an NFT without fanning out the inputs
        const nftAlphaGenesisInfo = {
            tokenTicker: 'A',
            tokenName: 'ALPHA',
            url: 'cashtab.com',
            decimals: 0,
            hash: '',
        };
        const nftMintAlpha: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** The NFT */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'GENESIS',
                    groupTokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    genesisInfo: nftAlphaGenesisInfo,
                },
            ],
        };

        // We can immediately mint an NFT without a fan-out tx by using a chained tx
        const alphaNftResp = await slpNftWallet
            .action(nftMintAlpha)
            .build()
            .broadcast();

        // NB the genesis tx here is the SECOND of the broadcasted txs, at index 1
        const nftMintAlphaTxid = alphaNftResp.broadcasted[1];

        // It's a valid SLP genesis tx
        const alphaTokenInfo = await chronik.token(nftMintAlphaTxid);
        expect(alphaTokenInfo.genesisInfo).to.deep.equal(nftAlphaGenesisInfo);

        // We conduct a fan-out tx to mint a SLP_TOKEN_TYPE_NFT1_CHILD token
        const slpFanoutAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send qty at outIdxs 1, 2, and 3 */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: slpGenesisTokenId,
                    atoms: 1n,
                },
                /** ecash-wallet will automatically send itself the token change */
            ],
            tokenActions: [
                /** SLP fanout action */
                {
                    type: 'SEND',
                    tokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_GROUP,
                },
            ],
        };

        // Broadcast the fanout tx
        await slpNftWallet.action(slpFanoutAction).build().broadcast();

        const nftBetaGenesisInfo = {
            tokenTicker: 'B',
            tokenName: 'BETA',
            url: 'cashtab.com',
            decimals: 0,
            hash: '',
        };
        const nftMintBeta: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** The NFT */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'GENESIS',
                    groupTokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    genesisInfo: nftBetaGenesisInfo,
                },
            ],
        };

        // Now we can mint the NFT
        const betaNftResp = await slpNftWallet
            .action(nftMintBeta)
            .build()
            .broadcast();
        const nftMintBetaTxid = betaNftResp.broadcasted[0];

        // It's a valid SLP genesis tx
        const betaTokenInfo = await chronik.token(nftMintBetaTxid);
        expect(betaTokenInfo.genesisInfo).to.deep.equal(nftBetaGenesisInfo);

        // We can send an NFT
        const nftSendAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send qty at outIdx 1 */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: nftMintAlphaTxid,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: nftMintAlphaTxid,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                },
            ],
        };

        await slpNftWallet.action(nftSendAction).build().broadcast();

        // This NFT now belongs to MOCK_DESTINATION_ADDRESS
        const utxosAtMockDestination = await chronik
            .address(MOCK_DESTINATION_ADDRESS)
            .utxos();
        const utxoAtMockDestination = utxosAtMockDestination.utxos.find(
            utxo => utxo.token?.tokenId === nftMintAlphaTxid,
        );
        expect(utxoAtMockDestination?.token?.atoms).to.equal(1n);

        // We can mint another NFT
        const nftGammaGenesisInfo = {
            tokenTicker: 'G',
            tokenName: 'GAMMA',
            url: 'cashtab.com',
            decimals: 0,
            hash: '',
        };
        const nftMintGamma: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** The NFT */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: 1n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'GENESIS',
                    groupTokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    genesisInfo: nftGammaGenesisInfo,
                },
            ],
        };

        const gammaNftResp = await slpNftWallet
            .action(nftMintGamma)
            .build()
            .broadcast();
        const nftMintGammaTxid = gammaNftResp.broadcasted[0];

        // It's a valid SLP genesis tx
        const gammaTokenInfo = await chronik.token(nftMintGammaTxid);
        expect(gammaTokenInfo.genesisInfo).to.deep.equal(nftGammaGenesisInfo);

        // We can burn an NFT
        const nftBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
            ],
            tokenActions: [
                /** SLP burn action */
                {
                    type: 'BURN',
                    tokenId: nftMintBetaTxid,
                    burnAtoms: 1n,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                },
            ],
        };

        const burnResp = await slpNftWallet
            .action(nftBurnAction)
            .build()
            .broadcast();
        const nftBurnTxid = burnResp.broadcasted[0];

        // It's a valid SLP burn tx
        const burnTx = await chronik.tx(nftBurnTxid);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(1n);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(1n);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // No more supply of this NFT
        const utxosThisNft = await chronik.tokenId(nftMintBetaTxid).utxos();
        expect(utxosThisNft.utxos.length).to.equal(0);

        // We cannot mint an NFT with atoms of > 1n
        const nftDeltaGenesisInfo = {
            tokenTicker: 'D',
            tokenName: 'DELTA',
            url: 'cashtab.com',
            decimals: 0,
            hash: '',
        };
        const nftDeltaBeta: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** The NFT, but we attempt to mint with 2n atoms */
                {
                    sats: 546n,
                    script: slpNftWallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: 2n,
                },
            ],
            tokenActions: [
                /** SLP mint action */
                {
                    type: 'GENESIS',
                    groupTokenId: slpGenesisTokenId,
                    tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    genesisInfo: nftDeltaGenesisInfo,
                },
            ],
        };

        expect(() =>
            slpNftWallet.clone().action(nftDeltaBeta).build(ALL_BIP143),
        ).to.throw(
            Error,
            `An SLP_TOKEN_TYPE_NFT1_CHILD GENESIS tx must have 1 atom at outIdx 1. Found 2 atoms.`,
        );

        /**
         * NB if we do attempt to broadcast this tx, chronik will catch and throw this:
         *  Error: Failed getting /broadcast-tx: 400: Tx <txid> failed token checks:
         *  Parsing failed: SLP error: Invalid NFT1 Child GENESIS initial quantity,
         *  expected 1 but got 2. Unexpected burn: Burns 1 atoms.
         */
    });
    it('We can send an ALP tx with DataAction(s)', async () => {
        // Init the wallet
        const alpDataWallet = Wallet.fromSk(fromHex('18'.repeat(32)), chronik);

        // Send 1M XEC to the wallet
        const inputSats = 1_000_000_00n;
        await runner.sendToScript(inputSats, alpDataWallet.script);

        // Sync the wallet
        await alpDataWallet.sync();

        // First, create an ALP token
        const alpGenesisInfo = {
            tokenTicker: 'DATA',
            tokenName: 'ALP Data Test Token',
            url: 'cashtab.com',
            decimals: 0,
            data: 'deadbeef',
            authPubkey: toHex(alpDataWallet.pk),
        };

        const genesisMintQty = 1_000n;

        // Construct the Action for genesis
        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1 */
                {
                    sats: 546n,
                    script: alpDataWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2 */
                {
                    sats: 546n,
                    script: alpDataWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                {
                    type: 'GENESIS',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast genesis
        const genesisResp = await alpDataWallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const alpTokenId = genesisResp.broadcasted[0];

        // Verify it's a valid ALP genesis tx
        const tokenInfo = await chronik.token(alpTokenId);
        expect(tokenInfo.tokenType.type).to.equal('ALP_TOKEN_TYPE_STANDARD');

        // Now send the token with DataAction containing "test" (ASCII encoded)
        const testData = new TextEncoder().encode('test');

        const alpSendWithDataAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send some tokens */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpTokenId,
                    atoms: 100n,
                },
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** DataAction with "test" ASCII encoded */
                {
                    type: 'DATA',
                    data: testData,
                },
            ],
        };

        // Build and broadcast the transaction with DataAction
        const sendWithDataResp = await alpDataWallet
            .action(alpSendWithDataAction)
            .build()
            .broadcast();

        const sendWithDataTxid = sendWithDataResp.broadcasted[0];

        // Verify the transaction was successful
        const sendWithDataTx = await chronik.tx(sendWithDataTxid);
        expect(sendWithDataTx.tokenEntries).to.have.length(1);
        expect(sendWithDataTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendWithDataTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendWithDataTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Verify the data was included in the OP_RETURN
        // The OP_RETURN should contain the ALP SEND pushdata followed by the "test" data

        // The "test" data (74657374 in hex) should be present in the OP_RETURN
        // We can verify this by checking that the transaction was successful and
        // the token was sent correctly, which confirms the DataAction was processed

        // Verify the token was sent correctly (so, the ALP tx was valid)
        const utxosAtDestination = await chronik
            .address(MOCK_DESTINATION_ADDRESS)
            .utxos();
        const tokenUtxoAtDestination = utxosAtDestination.utxos.find(
            utxo => utxo.token?.tokenId === alpTokenId,
        );
        expect(tokenUtxoAtDestination?.token?.atoms).to.equal(100n);

        // Verify we find the data in the OP_RETURN (so, the DataAction was processed)
        const opReturn = sendWithDataTx.outputs[0].outputScript;
        const testDataHex = toHex(testData);

        expect(opReturn).to.include(testDataHex); // "test" in hex: 74657374

        // Test that we get an error when trying to send max ALP outputs with DataAction
        // This should exceed the OP_RETURN size limit
        const maxAlpOutputs: payment.PaymentOutput[] = [];
        for (let i = 1; i <= ALP_POLICY_MAX_OUTPUTS - 1; i++) {
            maxAlpOutputs.push({
                sats: 546n,
                script: MOCK_DESTINATION_SCRIPT,
                tokenId: alpTokenId,
                atoms: BigInt(i),
            });
        }

        const alpMaxOutputsWithDataAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * SEND qtys at outIdx 1-28
                 * This will be the maximum number of outputs before hitting ALP_POLICY_MAX_OUTPUTS
                 * Adding DataAction should push us over the OP_RETURN size limit
                 */
                ...maxAlpOutputs,
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** DataAction with "test" ASCII encoded - this should cause OP_RETURN to exceed size limit */
                {
                    type: 'DATA',
                    data: testData,
                },
            ],
        };

        // This should throw an error because the OP_RETURN would exceed the size limit
        expect(() =>
            alpDataWallet
                .clone()
                .action(alpMaxOutputsWithDataAction)
                .build(ALL_BIP143),
        ).to.throw(
            Error,
            `Specified action results in OP_RETURN of 226 bytes, vs max allowed of 223.`,
        );

        // Test sending ALP transaction with two DataActions: "alpha" and "beta"
        const alphaData = new TextEncoder().encode('alpha');
        const betaData = new TextEncoder().encode('beta');

        const alpSendWithTwoDataActions: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send some tokens */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: alpTokenId,
                    atoms: 50n,
                },
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: alpTokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** First DataAction with "alpha" */
                {
                    type: 'DATA',
                    data: alphaData,
                },
                /** Second DataAction with "beta" */
                {
                    type: 'DATA',
                    data: betaData,
                },
            ],
        };

        // Build and broadcast the transaction with two DataActions
        const sendWithTwoDataResp = await alpDataWallet
            .action(alpSendWithTwoDataActions)
            .build()
            .broadcast();

        const sendWithTwoDataTxid = sendWithTwoDataResp.broadcasted[0];

        // Verify the transaction was successful
        const sendWithTwoDataTx = await chronik.tx(sendWithTwoDataTxid);
        expect(sendWithTwoDataTx.tokenEntries).to.have.length(1);
        expect(sendWithTwoDataTx.tokenEntries[0].txType).to.equal('SEND');
        expect(sendWithTwoDataTx.tokenEntries[0].actualBurnAtoms).to.equal(0n);
        expect(sendWithTwoDataTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // Verify both data actions are included in the OP_RETURN
        const opReturnWithTwoData = sendWithTwoDataTx.outputs[0].outputScript;
        const alphaDataHex = toHex(alphaData);
        const betaDataHex = toHex(betaData);

        expect(opReturnWithTwoData).to.include(alphaDataHex); // "alpha" in hex: 616c706861
        expect(opReturnWithTwoData).to.include(betaDataHex); // "beta" in hex: 62657461

        // Verify the token was sent correctly
        const utxosAtDestinationAfterTwoData = await chronik
            .address(MOCK_DESTINATION_ADDRESS)
            .utxos();
        const tokenUtxosAtDestinationAfterTwoData =
            utxosAtDestinationAfterTwoData.utxos.filter(
                utxo => utxo.token?.tokenId === alpTokenId,
            );

        // We should have 2 UTXOs: one from the first transaction (100 atoms) and one from the second (50 atoms)
        expect(tokenUtxosAtDestinationAfterTwoData).to.have.length(2);

        // Calculate total atoms across all UTXOs
        const totalAtoms = tokenUtxosAtDestinationAfterTwoData.reduce(
            (sum, utxo) => sum + (utxo.token?.atoms || 0n),
            0n,
        );
        expect(totalAtoms).to.equal(150n); // 100 + 50
    });
});
