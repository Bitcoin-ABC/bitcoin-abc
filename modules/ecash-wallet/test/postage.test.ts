// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * postage.test.ts
 *
 * Test the postage mechanism for eCash transactions
 * 1. Build a transaction with token UTXO and SIGHASH_ANYONECANPAY
 * 2. Add fuel inputs from another wallet to make it valid
 * 3. Sign the new inputs with SIGHASH_ALL
 * 4. Broadcast the complete transaction
 */

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    Address,
    Script,
    fromHex,
    payment,
    SLP_TOKEN_TYPE_FUNGIBLE,
    DEFAULT_DUST_SATS,
    ALP_TOKEN_TYPE_STANDARD,
    Tx,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet, SatsSelectionStrategy, PostageTx } from '../src/wallet';

use(chaiAsPromised);

// Configure available satoshis
const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

const MOCK_DESTINATION_ADDRESS = Address.p2pkh('deadbeef'.repeat(5)).toString();
const MOCK_DESTINATION_SCRIPT = Script.fromAddress(MOCK_DESTINATION_ADDRESS);

describe('Postage mechanism for eCash transactions', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;

    before(async () => {
        // Setup using ecash-agora_base so we have agora plugin available
        runner = await TestRunner.setup('setup_scripts/ecash-agora_base');
        chronik = runner.chronik;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('We can create a postage transaction with SIGHASH_ANYONECANPAY and add fuel inputs', async () => {
        // Step 1: Create two wallets - one for tokens, one for fuel
        const tokenWallet = Wallet.fromSk(fromHex('15'.repeat(32)), chronik);
        const fuelWallet = Wallet.fromSk(fromHex('16'.repeat(32)), chronik);

        // Send XEC to both wallets
        const tokenWalletSats = 1_000_000_00n; // 1M XEC
        const fuelWalletSats = 20_000n; // 20k sats
        await runner.sendToScript(tokenWalletSats, tokenWallet.script);
        await runner.sendToScript(fuelWalletSats, fuelWallet.script);

        // Sync both wallets
        await tokenWallet.sync();
        await fuelWallet.sync();

        // Step 2: Create a token genesis transaction
        const slpGenesisInfo = {
            tokenTicker: 'POSTAGE',
            tokenName: 'Postage Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        const slpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: tokenWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** ALP genesis action */
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

        // Build and broadcast genesis transaction
        const genesisResp = await tokenWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const tokenId = genesisResp.broadcasted[0];

        // Sync to get the new token UTXOs
        await tokenWallet.sync();

        // Step 3: Build a transaction with NO_SATS strategy
        // This transaction will have insufficient sats but valid token structure
        const postageAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send some tokens to destination */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 100n,
                },
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: tokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // Step 4: Prepare the fuel utxos of the fuel wallet
        // Because we are not using any change outputs, and we cannot change
        // any outputs after signing, we must only use discrete and small
        // fuel utxos to avoid too much of a rip-off on the fee
        // NB there could be various strategies to keep to 1sat/byte fees,
        // future optimization

        const createdFuelUtxos = [];
        let fuelWalletBalanceSats = fuelWallet
            .spendableSatsOnlyUtxos()
            .reduce((sum, utxo) => sum + utxo.sats, 0n);
        while (fuelWalletBalanceSats > 1_000n) {
            createdFuelUtxos.push({ sats: 1000n, script: fuelWallet.script });
            fuelWalletBalanceSats -= 1000n;
        }

        await fuelWallet.sync();
        await fuelWallet
            .action({ outputs: createdFuelUtxos })
            .build()
            .broadcast();
        await fuelWallet.sync();

        // Step 5: Build a postage transaction
        // This creates a transaction that's structurally valid but financially insufficient
        const postageTx = tokenWallet
            .action(postageAction, {
                satsStrategy: SatsSelectionStrategy.NO_SATS,
            })
            .buildPostage();

        // The postage tx has only 1 input
        expect(postageTx.txBuilder.inputs.length).to.equal(1);
        // It's a token input
        expect(postageTx.txBuilder.inputs[0].input?.signData?.sats).to.equal(
            DEFAULT_DUST_SATS,
        );
        // Outputs match what we want
        expect(postageTx.txBuilder.outputs.length).to.equal(3);

        // Verify that calling .build() instead of .buildPostage() would throw an error
        expect(() => {
            tokenWallet
                .action(postageAction, {
                    satsStrategy: SatsSelectionStrategy.NO_SATS,
                })
                .build();
        }).to.throw(
            'You must call buildPostage() for inputs selected with SatsSelectionStrategy.NO_SATS',
        );

        // Step 6: Add fuel inputs and create a broadcastable transaction

        // Determine prePostageInputSats by making an educated guess
        const prePostageInputSats =
            BigInt(postageTx.txBuilder.inputs.length) * DEFAULT_DUST_SATS;

        // We have already confirmed this tx has 1 input, which we know is a token input
        expect(prePostageInputSats).to.equal(DEFAULT_DUST_SATS);
        const broadcastableTx = postageTx.addFuelAndSign(
            fuelWallet,
            prePostageInputSats,
        );

        // Step 7: Broadcast the complete transaction
        const broadcastResp = await broadcastableTx.broadcast();

        // Inspect the tx from chronik
        const tx = await chronik.tx(broadcastResp.broadcasted[0]);

        // It's a valid token tx
        expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We have 2 inputs, not just the token input
        expect(tx.inputs.length).to.equal(2);
    });

    it('We can create a postage transaction with SIGHASH_ANYONECANPAY, serialize it, deserialize it,and add fuel inputs', async () => {
        // Step 1: Create two wallets - one for tokens, one for fuel
        const tokenWallet = Wallet.fromSk(fromHex('17'.repeat(32)), chronik);
        const fuelWallet = Wallet.fromSk(fromHex('18'.repeat(32)), chronik);

        // Send XEC to both wallets
        const tokenWalletSats = 1_000_000_00n; // 1M XEC
        const fuelWalletSats = 20_000n; // 20k sats
        await runner.sendToScript(tokenWalletSats, tokenWallet.script);
        await runner.sendToScript(fuelWalletSats, fuelWallet.script);

        // Sync both wallets
        await tokenWallet.sync();
        await fuelWallet.sync();

        // Step 2: Create a token genesis transaction
        const alpGenesisInfo = {
            tokenTicker: 'ALP POSTAGE',
            tokenName: 'Postage Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: tokenWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** SLP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast genesis transaction
        const genesisResp = await tokenWallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const tokenId = genesisResp.broadcasted[0];

        // Sync to get the new token UTXOs
        await tokenWallet.sync();

        // Step 3: Build a transaction with NO_SATS strategy
        // This transaction will have insufficient sats but valid token structure
        const postageAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send some tokens to destination */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 100n,
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Step 4: Prepare the fuel utxos of the fuel wallet
        // Because we are not using any change outputs, and we cannot change
        // any outputs after signing, we must only use discrete and small
        // fuel utxos to avoid too much of a rip-off on the fee
        // NB there could be various strategies to keep to 1sat/byte fees,
        // future optimization

        const createdFuelUtxos = [];
        let fuelWalletBalanceSats = fuelWallet
            .spendableSatsOnlyUtxos()
            .reduce((sum, utxo) => sum + utxo.sats, 0n);
        while (fuelWalletBalanceSats > 1_000n) {
            createdFuelUtxos.push({ sats: 1000n, script: fuelWallet.script });
            fuelWalletBalanceSats -= 1000n;
        }

        await fuelWallet.sync();
        await fuelWallet
            .action({ outputs: createdFuelUtxos })
            .build()
            .broadcast();
        await fuelWallet.sync();

        // Step 5: Build a postage transaction
        // This creates a transaction that's structurally valid but financially insufficient
        const postageTx = tokenWallet
            .action(postageAction, {
                satsStrategy: SatsSelectionStrategy.NO_SATS,
            })
            .buildPostage();

        // The postage tx has only 1 input
        expect(postageTx.txBuilder.inputs.length).to.equal(1);
        // It's a token input
        expect(postageTx.txBuilder.inputs[0].input?.signData?.sats).to.equal(
            DEFAULT_DUST_SATS,
        );
        // Outputs match what we want
        expect(postageTx.txBuilder.outputs.length).to.equal(3);

        // Verify that calling .build() instead of .buildPostage() would throw an error
        expect(() =>
            tokenWallet
                .action(postageAction, {
                    satsStrategy: SatsSelectionStrategy.NO_SATS,
                })
                .build(),
        ).to.throw(
            'You must call buildPostage() for inputs selected with SatsSelectionStrategy.NO_SATS',
        );

        // Step 6: Serialize the postage transaction, the way it would be serialized for a server pass
        const serializedTx = postageTx.partiallySignedTx.ser();
        // Step 7: Deserialize the postage transaction, the way the server would do it before adding fuel inputs
        const deserializedTx = Tx.deser(serializedTx);

        const serverConstructedPostageTx = new PostageTx(deserializedTx);

        // Step 8: Add fuel utxos and create a broadcastable transaction
        // Determine prePostageInputSats by making an educated guess
        const prePostageInputSats =
            BigInt(postageTx.txBuilder.inputs.length) * DEFAULT_DUST_SATS;

        // We have already confirmed this tx has 1 input, which we know is a token input
        expect(prePostageInputSats).to.equal(DEFAULT_DUST_SATS);
        const broadcastableTx = serverConstructedPostageTx.addFuelAndSign(
            fuelWallet,
            prePostageInputSats,
        );

        // Step 9: Broadcast the complete transaction
        const broadcastResp = await broadcastableTx.broadcast();

        // Inspect the tx from chronik
        const tx = await chronik.tx(broadcastResp.broadcasted[0]);

        // It's a valid token tx
        expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We have 2 inputs, not just the token input
        expect(tx.inputs.length).to.equal(2);
    });

    it('We can estimate fee reqs for a tx requiring multiple fuel inputs by making an educated guess at the prePostageInputSats', async () => {
        // Step 1: Create two wallets - one for tokens, one for fuel
        const tokenWallet = Wallet.fromSk(fromHex('19'.repeat(32)), chronik);
        const fuelWallet = Wallet.fromSk(fromHex('20'.repeat(32)), chronik);

        // Send XEC to both wallets
        const tokenWalletSats = 1_000_000_00n; // 1M XEC
        const fuelWalletSats = 20_000n; // 20k sats
        await runner.sendToScript(tokenWalletSats, tokenWallet.script);
        await runner.sendToScript(fuelWalletSats, fuelWallet.script);

        // Sync both wallets
        await tokenWallet.sync();
        await fuelWallet.sync();

        // Step 2: Create a token genesis transaction
        const alpGenesisInfo = {
            tokenTicker: 'ALP POSTAGE $$$',
            tokenName: 'Expensive Fees Postage Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const genesisMintQty = 1_000n;

        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Mint qty at outIdx 1, per SLP spec */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: genesisMintQty,
                },
                /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                {
                    sats: 546n,
                    script: tokenWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** ALP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast genesis transaction
        const genesisResp = await tokenWallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const tokenId = genesisResp.broadcasted[0];

        // Sync to get the new token UTXOs
        await tokenWallet.sync();

        // Step 3: Build a transaction with NO_SATS strategy. Include multiple outputs and a data output so
        //         we know that a single fuel input will not be enough

        // This transaction will have insufficient sats but valid token structure
        const postageAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send some tokens to destination */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 100n,
                },
                /** And some more y not */
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 2n,
                },
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 3n,
                },
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 4n,
                },
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 5n,
                },
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                /** ALP data action */
                {
                    type: 'DATA',
                    data: new TextEncoder().encode(
                        'we also include a message in the OP_RETURN',
                    ),
                },
            ],
        };

        // Step 4: Prepare the fuel utxos of the fuel wallet
        // Because we are not using any change outputs, and we cannot change
        // any outputs after signing, we must only use discrete and small
        // fuel utxos to avoid too much of a rip-off on the fee
        // NB there could be various strategies to keep to 1sat/byte fees,
        // future optimization

        const createdFuelUtxos = [];
        let fuelWalletBalanceSats = fuelWallet
            .spendableSatsOnlyUtxos()
            .reduce((sum, utxo) => sum + utxo.sats, 0n);
        while (fuelWalletBalanceSats > 1_000n) {
            createdFuelUtxos.push({ sats: 1000n, script: fuelWallet.script });
            fuelWalletBalanceSats -= 1000n;
        }

        await fuelWallet.sync();
        await fuelWallet
            .action({ outputs: createdFuelUtxos })
            .build()
            .broadcast();
        await fuelWallet.sync();

        // We have 19 fuel utxos
        const INITIAL_FUEL_UTXOS_COUNT = 19;
        expect(fuelWallet.utxos.length).to.equal(INITIAL_FUEL_UTXOS_COUNT);

        // Step 5: Build a postage transaction
        // This creates a transaction that's structurally valid but financially insufficient
        const postageTx = tokenWallet
            .action(postageAction, {
                satsStrategy: SatsSelectionStrategy.NO_SATS,
            })
            .buildPostage();

        // The postage tx has only 1 input
        expect(postageTx.txBuilder.inputs.length).to.equal(1);
        // It's a token input
        expect(postageTx.txBuilder.inputs[0].input?.signData?.sats).to.equal(
            DEFAULT_DUST_SATS,
        );
        // Outputs match what we want
        expect(postageTx.txBuilder.outputs.length).to.equal(8);

        // Verify that calling .build() instead of .buildPostage() would throw an error
        expect(() =>
            tokenWallet
                .action(postageAction, {
                    satsStrategy: SatsSelectionStrategy.NO_SATS,
                })
                .build(),
        ).to.throw(
            'You must call buildPostage() for inputs selected with SatsSelectionStrategy.NO_SATS',
        );

        // Step 6: Serialize the postage transaction, the way it would be serialized for a server pass
        const serializedTx = postageTx.partiallySignedTx.ser();
        // Step 7: Deserialize the postage transaction, the way the server would do it before adding fuel inputs
        const deserializedTx = Tx.deser(serializedTx);

        const serverConstructedPostageTx = new PostageTx(deserializedTx);

        // Step 8: Add fuel utxos and create a broadcastable transaction
        // Determine prePostageInputSats by making an educated guess
        const prePostageInputSats =
            BigInt(postageTx.txBuilder.inputs.length) * DEFAULT_DUST_SATS;

        // We have already confirmed this tx has 1 input, which we know is a token input
        expect(prePostageInputSats).to.equal(DEFAULT_DUST_SATS);
        const broadcastableTx = serverConstructedPostageTx.addFuelAndSign(
            fuelWallet,
            prePostageInputSats,
        );

        // The fuel wallet's utxo set has automatically removed the consumed postage utxos
        expect(fuelWallet.utxos.length).to.equal(INITIAL_FUEL_UTXOS_COUNT - 5);

        // Check how many inputs we added
        const addedInputs =
            broadcastableTx.txs[0].inputs.length -
            postageTx.txBuilder.inputs.length;
        // It's more than one
        expect(addedInputs).to.equal(5);

        // Step 9: Broadcast the complete transaction
        const broadcastResp = await broadcastableTx.broadcast();

        // Inspect the tx from chronik
        const tx = await chronik.tx(broadcastResp.broadcasted[0]);

        // It's a valid token tx
        expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We have 6 inputs, our original token input and the 5 fuel inputs we added
        expect(tx.inputs.length).to.equal(6);
    });

    it('We can broadcast a postage-built tx with no postage added if it happens to have enough sats', async () => {
        /**
         * The most common time we expect to see this case is a tx
         * combining several token input utxos to produce 1 or 2 token
         * outputs. In this case, the sats in the inputs could
         * be enough to cover sats in the outputs + fee, without
         * any postage added
         */

        // Step 1: Create one wallet for tokens, and one for fuel
        const tokenWallet = Wallet.fromSk(fromHex('21'.repeat(32)), chronik);
        const fuelWallet = Wallet.fromSk(fromHex('22'.repeat(32)), chronik);

        // Send XEC to your token wallet
        // NB we intentionally do not send XEC to the fuel wallet to show we broadcast without it
        const tokenWalletSats = 1_000_000_00n; // 1M XEC
        await runner.sendToScript(tokenWalletSats, tokenWallet.script);
        await tokenWallet.sync();

        // Step 2: Create a token genesis transaction
        const alpGenesisInfo = {
            tokenTicker: 'TSPFIPTT',
            tokenName: 'Token Sats Pay For It Postage Test Token',
            url: 'cashtab.com',
            decimals: 0,
        };

        const alpGenesisAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Create 5 mint qty outputs with 1 token apiece */
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: 1n,
                },
                {
                    sats: 546n,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    script: tokenWallet.script,
                    atoms: 1n,
                },
                /** Mint baton after qty outputs */
                {
                    sats: 546n,
                    script: tokenWallet.script,
                    tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                    isMintBaton: true,
                    atoms: 0n,
                },
            ],
            tokenActions: [
                /** ALP genesis action */
                {
                    type: 'GENESIS',
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    genesisInfo: alpGenesisInfo,
                },
            ],
        };

        // Build and broadcast genesis transaction
        const genesisResp = await tokenWallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const tokenId = genesisResp.broadcasted[0];

        // Sync to get the new token UTXOs
        await tokenWallet.sync();

        // Step 3: Build a transaction with NO_SATS strategy. Include a single output to minimize the sats needed for fee

        // We build with the NO_SATS strategy but this tx will happen to have enough sats
        // by virtue of including enough dust in the required token inputs
        const postageAction: payment.Action = {
            outputs: [
                /** Blank OP_RETURN at outIdx 0 */
                { sats: 0n },
                /** Send all tokens to destination, so token change is not expected*/
                {
                    sats: 546n,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId: tokenId,
                    atoms: 5n,
                    isMintBaton: false,
                },
            ],
            tokenActions: [
                /** ALP send action */
                {
                    type: 'SEND',
                    tokenId: tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        // Verify that calling .build() instead of .buildPostage() would throw an error
        // Even though we would have enough sats, the user has specified NO_SATS and should thus call buildPostage()
        expect(() =>
            tokenWallet
                .clone()
                .action(postageAction, {
                    satsStrategy: SatsSelectionStrategy.NO_SATS,
                })
                .build(),
        ).to.throw(
            'You must call buildPostage() for inputs selected with SatsSelectionStrategy.NO_SATS',
        );

        // Step 4: Prepare the fuel utxos of the fuel wallet
        // We intentionally skip this step here as we do not plan to need fuel

        // Step 5: Build a postage transaction
        // This creates a transaction that's structurally valid but financially insufficient
        const postageTx = tokenWallet
            .action(postageAction, {
                satsStrategy: SatsSelectionStrategy.NO_SATS,
            })
            .buildPostage();

        // The postage tx has 5 inputs, as we need all the qty-1 minted token inputs to cover the qty-5 token output
        expect(postageTx.txBuilder.inputs.length).to.equal(5);

        // We only have 2 output as there is no token change (the OP_RETURN and the token receiving output)
        expect(postageTx.txBuilder.outputs.length).to.equal(2);

        // Step 6: Serialize the postage transaction, the way it would be serialized for a server pass
        const serializedTx = postageTx.partiallySignedTx.ser();
        // Step 7: Deserialize the postage transaction, the way the server would do it before adding fuel inputs
        const deserializedTx = Tx.deser(serializedTx);

        const serverConstructedPostageTx = new PostageTx(deserializedTx);

        // Determine prePostageInputSats by making an educated guess
        // In this case, say our server knows the user is making a token tx with a wallet that uses DEFAULT_DUST_SATS for its token inputs
        const prePostageInputSats =
            BigInt(postageTx.txBuilder.inputs.length) * DEFAULT_DUST_SATS;

        // Step 8: We call addFuelAndSign, which correctly realizes we do not need to add fuel
        const broadcastableTx = serverConstructedPostageTx.addFuelAndSign(
            fuelWallet,
            prePostageInputSats,
        );

        // Check how many inputs we added
        const addedInputs =
            broadcastableTx.txs[0].inputs.length -
            postageTx.txBuilder.inputs.length;
        // It's zero
        expect(addedInputs).to.equal(0);

        // Step 9: Broadcast the complete transaction
        const broadcastResp = await broadcastableTx.broadcast();

        // Inspect the tx from chronik
        const tx = await chronik.tx(broadcastResp.broadcasted[0]);

        // It's a valid token tx
        expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We have our original 5 token inputs
        expect(tx.inputs.length).to.equal(5);
    });
});
