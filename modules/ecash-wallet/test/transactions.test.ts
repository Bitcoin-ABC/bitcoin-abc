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
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet } from '../src/wallet';

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

        const firstTxid = resp.txid;

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

        // Sync again
        await testWallet.sync();

        const respTwo = await testWallet
            .action({
                outputs: dozenOutputs,
            })
            .build()
            .broadcast();

        const secondTxid = respTwo.txid;

        expect(secondTxid).to.equal(
            'a62b0564fcefa5e3fc857e8ad90a408c00421608d7fdc3d13f335a52f29b3fc8',
        );

        // We see expected error if we try to broadcast a tx above the size limit
        // Load up some more sats to build too many outputs (10M XEC)
        await runner.sendToScript(10_000_000_00n, testWallet.script);

        const threeThousandOutputs = getDustOutputs(3_000);

        await testWallet.sync();

        await expect(
            testWallet
                .action({
                    outputs: threeThousandOutputs,
                })
                .build()
                .broadcast(),
        ).to.be.rejectedWith(
            Error,
            `Failed getting /broadcast-tx: 400: Broadcast failed: Transaction rejected by mempool: tx-size`,
        );
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

        const slpGenesisTokenId = resp.txid;

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

        // NB we must sync() again for the mint baton to be an available utxo
        await slpWallet.sync();

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

        // NB we must sync() again for minted qty to be an available utxo
        await slpWallet.sync();

        // For SLP, we can't build a tx that needs token change if that token change would be the 20th output
        expect(() =>
            slpWallet.action(slpSendActionTooManyOutputs).build(),
        ).to.throw(
            Error,
            `Tx needs a token change output to avoid burning atoms of ${slpGenesisTokenId}, but the token change output would be at outIdx 20 which is greater than the maximum allowed outIdx of 19 for SLP_TOKEN_TYPE_FUNGIBLE.`,
        );

        // Build and broadcast
        const sendResponse = await slpWallet
            .action(slpSendAction)
            .build()
            .broadcast();

        const slpSendTxid = sendResponse.txid;

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
                 * We don't specify any token SEND outputs
                 * We could, but let's just let the wallet
                 * figure them out to complete our BURN
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

        // Sync to get latest utxo set
        await slpWallet.sync();

        // We can't burn this amount of atoms because we do not have a utxo of this size
        expect(() => slpWallet.action(slpCannotBurnAction).build()).to.throw(
            Error,
            `Unable to find UTXOs for ${slpGenesisTokenId} with exactly ${burnAtomsThatDoNotMatchUtxos} atoms. Create a UTXO with ${burnAtomsThatDoNotMatchUtxos} atoms to burn without a SEND action.`,
        );

        const burnAtoms = 333n;
        const slpBurnAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /**
                 * We don't specify any token SEND outputs
                 * We could, but let's just let the wallet
                 * figure them out to complete our BURN
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

        const burnTx = await chronik.tx(burnResponse.txid);
        expect(burnTx.tokenEntries).to.have.length(1);
        expect(burnTx.tokenEntries[0].txType).to.equal('BURN');
        expect(burnTx.tokenEntries[0].actualBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].intentionalBurnAtoms).to.equal(burnAtoms);
        expect(burnTx.tokenEntries[0].burnSummary).to.equal(``);
        expect(burnTx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');
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

        const alpGenesisTokenId = resp.txid;

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

        // NB we must sync() again for the mint baton to be an available utxo
        await alpWallet.sync();

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

        // NB we must sync() again for the mint baton to be an available utxo
        await alpWallet.sync();

        // Build and broadcast the MINT tx
        const mintBurn = await alpWallet
            .action(alpMintandBurnAction)
            .build()
            .broadcast();

        const mintAndBurnTx = await chronik.tx(mintBurn.txid);

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

        // NB we must sync() again to get the updated utxo set
        await alpWallet.sync();

        // Build and broadcast
        const genesisAndMintResp = await alpWallet
            .action(alpGenesisAndMintAction)
            .build()
            .broadcast();

        const alpGenesisTokenIdBeta = genesisAndMintResp.txid;

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

        // NB we must sync() again to get the updated utxo set
        await alpWallet.sync();

        // Build and broadcast
        // Looks like this should work. After all, we will have 29 outputs.
        // But it won't, because we still have to push the 0 atoms into two atomsArrays
        // So we exceed the OP_RETURN
        expect(() => alpWallet.action(alpSendAction).build()).to.throw(
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

        const alpSendTxid = alpSendResponse.txid;

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

        // Sync to get latest utxo set
        await alpWallet.sync();

        // We cannot burn this quantity of the beta token without specifying a SEND action because we do not have a utxo of this size
        expect(() => alpWallet.action(alpDoubleBurnError).build()).to.throw(
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

        const burnTx = await chronik.tx(burnResponse.txid);
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

        await alpWallet.sync();

        expect(() => alpWallet.action(outOfReachAlpAction).build()).to.throw(
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
});
