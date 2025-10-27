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
            .action(postageAction, SatsSelectionStrategy.NO_SATS)
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
                .action(postageAction, SatsSelectionStrategy.NO_SATS)
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
            .action(postageAction, SatsSelectionStrategy.NO_SATS)
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
                .action(postageAction, SatsSelectionStrategy.NO_SATS)
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
                /** And somre more y not */
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

        // Step 5: Build a postage transaction
        // This creates a transaction that's structurally valid but financially insufficient
        const postageTx = tokenWallet
            .action(postageAction, SatsSelectionStrategy.NO_SATS)
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
                .action(postageAction, SatsSelectionStrategy.NO_SATS)
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
});
