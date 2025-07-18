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
    ALL_ANYONECANPAY_BIP143,
    payment,
    SLP_TOKEN_TYPE_FUNGIBLE,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet, SatsSelectionStrategy } from '../src/wallet';

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
        const fuelWalletSats = 2_000_000_00n; // 2M XEC
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

        // Build and broadcast genesis transaction
        const genesisResp = await tokenWallet
            .action(slpGenesisAction)
            .build()
            .broadcast();

        const tokenId = genesisResp.txid;

        // Sync to get the new token UTXOs
        await tokenWallet.sync();

        // Step 3: Pick a token UTXO with dust sats for postage transaction
        const tokenUtxos = tokenWallet.utxos.filter(
            utxo =>
                utxo.token &&
                utxo.token.tokenId === tokenId &&
                !utxo.token.isMintBaton,
        );

        // We only expect 1 non-mintbaton utxo for this token based on our genesis tx
        expect(tokenUtxos.length).to.equal(1);
        const tokenUtxo = tokenUtxos[0];

        // Step 4: Build a transaction with the token UTXO as input
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
                /** Send remaining tokens back to wallet */
                {
                    sats: 546n,
                    script: tokenWallet.script,
                    tokenId: tokenId,
                    atoms: tokenUtxo.token!.atoms - 100n,
                },
            ],
            tokenActions: [
                /** SLP send action */
                {
                    type: 'SEND',
                    tokenId: tokenId,
                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                },
            ],
        };

        // Step 5: Build a postage transaction with SIGHASH_ANYONECANPAY
        // This creates a transaction that's structurally valid but financially insufficient
        const postageTx = tokenWallet
            .action(postageAction, SatsSelectionStrategy.NO_SATS)
            .buildPostage(ALL_ANYONECANPAY_BIP143);

        // The postage tx has only 1 input
        expect(postageTx.inputs.length).to.equal(1);
        // Outputs match what we want
        expect(postageTx.outputs.length).to.equal(3);

        // Verify that calling .build() instead of .buildPostage() would throw an error
        try {
            await tokenWallet
                .action(postageAction, SatsSelectionStrategy.NO_SATS)
                .build();
            // If we get here, the test should fail
            expect.fail(
                'Expected build() to throw an error due to insufficient funds',
            );
        } catch (error) {
            expect((error as Error).message).to.include(
                'Insufficient sats to complete tx',
            );
        }

        // Step 6: Add fuel inputs and create a broadcastable transaction
        const broadcastableTx = postageTx.addFuelAndSign(fuelWallet);

        // Step 7: Broadcast the complete transaction
        const broadcastResp = await broadcastableTx.broadcast();

        // Inspect the tx from chronik
        const tx = await chronik.tx(broadcastResp.txid);

        // It's a valid token tx
        expect(tx.tokenStatus).to.equal('TOKEN_STATUS_NORMAL');

        // We have 2 inputs, not just the token input
        expect(tx.inputs.length).to.equal(2);
    });
});
