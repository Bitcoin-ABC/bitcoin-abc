// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * watchOnly.test.ts
 *
 * End-to-end tests for non-HD WatchOnlyWallet
 * Tests that a WatchOnlyWallet can track the same address as a regular Wallet
 * and maintain the same balance and UTXO set
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
    payment,
    ALP_TOKEN_TYPE_STANDARD,
} from 'ecash-lib';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet } from '../src/wallet';
import { WatchOnlyWallet } from '../src/watchOnly';
import { GENESIS_TOKEN_ID_PLACEHOLDER } from 'ecash-lib/dist/payment';

use(chaiAsPromised);

// Configure available satoshis
const NUM_COINS = 500;
const COIN_VALUE = 1100000000n;

const MOCK_DESTINATION_ADDRESS = Address.p2pkh('deadbeef'.repeat(5)).toString();
const MOCK_DESTINATION_SCRIPT = Script.fromAddress(MOCK_DESTINATION_ADDRESS);

describe('WatchOnlyWallet e2e tests (non-HD)', () => {
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

    it('WatchOnlyWallet can track the same address as Wallet and maintain same balance', async () => {
        // Step 1: Create a regular Wallet
        const wallet = Wallet.fromSk(fromHex('1a'.repeat(32)), chronik);
        const walletAddress = wallet.address;

        // Step 2: Send XEC to the wallet
        const initialSats = 5_000_000_00n; // 5M XEC
        await runner.sendToScript(initialSats, wallet.script);
        await wallet.sync();

        // Verify wallet has the XEC
        expect(wallet.balanceSats).to.equal(500000000n);
        expect(wallet.utxos.length).to.equal(1);

        // Step 3: Create a WatchOnlyWallet with the same address
        const watchOnlyWallet = WatchOnlyWallet.fromAddress(
            walletAddress,
            chronik,
        );

        // Step 4: Sync the watch-only wallet and verify it has the same balance
        await watchOnlyWallet.sync();
        expect(watchOnlyWallet.balanceSats).to.equal(wallet.balanceSats);
        expect(watchOnlyWallet.utxos.length).to.equal(wallet.utxos.length);

        // Step 5: Have the wallet mint an ALP token
        const alpGenesisInfo = {
            tokenTicker: 'WATCH',
            tokenName: 'Watch Only Test Token',
            url: 'cashtab.com',
            decimals: 0,
            authPubkey: toHex(wallet.pk),
        };

        const genesisMintQty = 100_000n;

        const alpGenesisAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: 546n,
                    script: wallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
                    atoms: genesisMintQty,
                },
                {
                    sats: 546n,
                    script: wallet.script,
                    tokenId: GENESIS_TOKEN_ID_PLACEHOLDER,
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

        const genesisResp = await wallet
            .action(alpGenesisAction)
            .build()
            .broadcast();

        const tokenId = genesisResp.broadcasted[0];

        // Verify it's a valid ALP genesis tx
        const tokenInfo = await chronik.token(tokenId);
        expect(tokenInfo.tokenType.type).to.equal('ALP_TOKEN_TYPE_STANDARD');

        // Step 6: Sync both wallets after genesis
        await wallet.sync();
        await watchOnlyWallet.sync();

        // Verify both wallets see the token UTXO
        const walletTokenUtxos = wallet.utxos.filter(
            utxo => utxo.token?.tokenId === tokenId,
        );
        const watchOnlyTokenUtxos = watchOnlyWallet.utxos.filter(
            utxo => utxo.token?.tokenId === tokenId,
        );

        expect(walletTokenUtxos.length).to.equal(2);
        expect(watchOnlyTokenUtxos.length).to.equal(walletTokenUtxos.length);

        // Step 7: Send some XEC transactions
        const sendSats1 = 100_000n;
        const sendSats2 = 50_000n;

        // First XEC send
        await wallet
            .action({
                outputs: [
                    {
                        script: MOCK_DESTINATION_SCRIPT,
                        sats: sendSats1,
                    },
                ],
            })
            .build()
            .broadcast();

        // Second XEC send
        await wallet
            .action({
                outputs: [
                    {
                        script: MOCK_DESTINATION_SCRIPT,
                        sats: sendSats2,
                    },
                ],
            })
            .build()
            .broadcast();

        // Step 8: Send a token transaction
        const tokenSendAtoms = 10_000n;
        const tokenSendAction: payment.Action = {
            outputs: [
                { sats: 0n },
                {
                    sats: DEFAULT_DUST_SATS,
                    script: MOCK_DESTINATION_SCRIPT,
                    tokenId,
                    atoms: tokenSendAtoms,
                    isMintBaton: false,
                },
            ],
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        await wallet.action(tokenSendAction).build().broadcast();

        // Step 9: Sync both wallets after all transactions
        await wallet.sync();
        await watchOnlyWallet.sync();

        // Step 10: Verify balances still match
        expect(watchOnlyWallet.balanceSats).to.equal(wallet.balanceSats);

        // Verify UTXO counts match
        expect(watchOnlyWallet.utxos.length).to.equal(wallet.utxos.length);

        // Verify all UTXOs match
        expect(watchOnlyWallet.utxos).to.deep.equal(wallet.utxos);

        // Step 11: Exhaustive methods test
        // Test getAllAddresses
        const allAddresses = watchOnlyWallet.getAllAddresses();
        expect(allAddresses).to.deep.equal([walletAddress]);

        // Test that it's not HD
        expect(watchOnlyWallet.isHD).to.equal(false);
        expect(watchOnlyWallet.baseHdNode).to.equal(undefined);
        expect(watchOnlyWallet.accountNumber).to.equal(0);
        expect(watchOnlyWallet.receiveIndex).to.equal(0);
        expect(watchOnlyWallet.changeIndex).to.equal(0);
        expect(watchOnlyWallet.keypairs.size).to.equal(0);

        // Test that HD methods throw errors
        expect(() => watchOnlyWallet.getReceiveAddress(0)).to.throw(
            'getReceiveAddress can only be called on HD wallets',
        );
        expect(() => watchOnlyWallet.getChangeAddress(0)).to.throw(
            'getChangeAddress can only be called on HD wallets',
        );
        expect(() => watchOnlyWallet.getNextReceiveAddress()).to.throw(
            'getNextReceiveAddress can only be called on HD wallets',
        );
        expect(() => watchOnlyWallet.getNextChangeAddress()).to.throw(
            'getNextChangeAddress can only be called on HD wallets',
        );

        // NB the watch only wallet would not have updated its utxo set when the Wallet sent txs, so we expect it to be out of sync now
        expect(wallet.balanceSats).to.equal(499847100n);
        expect(watchOnlyWallet.balanceSats).to.equal(499847100n);
        // Test updateBalance
        const balanceBefore = watchOnlyWallet.balanceSats;
        watchOnlyWallet.updateBalance();
        expect(watchOnlyWallet.balanceSats).to.equal(balanceBefore);

        // Test sumUtxosSats static method
        const sum = WatchOnlyWallet.sumUtxosSats(watchOnlyWallet.utxos);
        // NB this method includes token dust
        expect(sum).to.equal(499848192n);
        expect(sum).to.equal(Wallet.sumUtxosSats(watchOnlyWallet.utxos));

        // Verify address property
        expect(watchOnlyWallet.address).to.equal(walletAddress);
    });
});
