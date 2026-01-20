// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * hdWatchOnly.test.ts
 *
 * End-to-end tests for HD WatchOnlyWallet
 * Tests that a WatchOnlyWallet can track the same HD wallet as a regular HD Wallet
 * and maintain the same balance and UTXO set across multiple addresses
 */

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import {
    Address,
    DEFAULT_DUST_SATS,
    Script,
    toHex,
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

// Standard test mnemonic from BIP39
const TEST_MNEMONIC =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('HD WatchOnlyWallet e2e tests', () => {
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

    it('HD WatchOnlyWallet can track the same HD wallet and maintain same balance', async () => {
        // Step 1: Create an HD Wallet with the test mnemonic
        const wallet = Wallet.fromMnemonic(TEST_MNEMONIC, chronik, {
            hd: true,
            accountNumber: 0,
        });

        // Step 2: Get the xpub from the base HD node
        // An xpub contains the public key (from node.pubkey()) PLUS the chain code
        // and other metadata needed for HD derivation. The xpub should use the same
        // public key that is exposed by the HdNode's pubkey() method.
        if (!wallet.baseHdNode) {
            throw new Error('Wallet should have baseHdNode for HD wallet');
        }

        // Get xpub directly from the HdNode
        // The xpub() method uses the same public key exposed by node.pubkey()
        // and includes the chain code and metadata needed for HD derivation
        const xpub = wallet.baseHdNode.xpub();

        // Verify that addresses derived from the xpub match addresses derived from the HdNode
        // This confirms the xpub was constructed using the same public key
        const testWatchOnlyWallet = WatchOnlyWallet.fromXpub(xpub, chronik, {
            accountNumber: 0,
        });

        // Verify addresses match - this proves the xpub uses the same pubkey as the HdNode
        const receiveAddr0FromWallet = wallet.getReceiveAddress(0);
        const receiveAddr0FromXpub = testWatchOnlyWallet.getReceiveAddress(0);
        expect(receiveAddr0FromXpub).to.equal(receiveAddr0FromWallet);

        const receiveAddr1FromWallet = wallet.getReceiveAddress(1);
        const receiveAddr1FromXpub = testWatchOnlyWallet.getReceiveAddress(1);
        expect(receiveAddr1FromXpub).to.equal(receiveAddr1FromWallet);

        const changeAddr0FromWallet = wallet.getChangeAddress(0);
        const changeAddr0FromXpub = testWatchOnlyWallet.getChangeAddress(0);
        expect(changeAddr0FromXpub).to.equal(changeAddr0FromWallet);

        // Step 3: Send XEC to multiple receive addresses
        const receiveAddress0 = wallet.getNextReceiveAddress();
        const receiveAddress1 = wallet.getNextReceiveAddress();
        const receiveAddress2 = wallet.getNextReceiveAddress();

        const satsToReceive0 = 2_000_000_00n; // 2M XEC
        const satsToReceive1 = 1_500_000_00n; // 1.5M XEC
        const satsToReceive2 = 1_000_000_00n; // 1M XEC

        await runner.sendToScript(
            satsToReceive0,
            Script.fromAddress(receiveAddress0),
        );
        await runner.sendToScript(
            satsToReceive1,
            Script.fromAddress(receiveAddress1),
        );
        await runner.sendToScript(
            satsToReceive2,
            Script.fromAddress(receiveAddress2),
        );

        // Step 4: Sync the wallet
        await wallet.sync();

        // Verify wallet has XEC across multiple addresses
        expect(wallet.balanceSats > 0n).to.equal(true);
        expect(wallet.utxos.length).to.be.greaterThan(0);

        // Step 5: Create ALP genesis transaction
        const alpGenesisInfo = {
            tokenTicker: 'HDWATCH',
            tokenName: 'HD Watch Only Test Token',
            url: 'cashtab.com',
            decimals: 0,
            authPubkey: toHex(wallet.pk),
        };

        const genesisMintQty = 200_000n;

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

        // Step 6: Send some XEC transactions (this will use change addresses)
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

        // Step 7: Send a token transaction
        const tokenSendAtoms = 20_000n;
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

        // Step 8: Sync wallet to get updated indices
        await wallet.sync();

        // Get the current indices from the wallet
        const receiveIndex = wallet.receiveIndex;
        const changeIndex = wallet.changeIndex;

        // We never generated a receive address
        expect(receiveIndex).to.equal(3);

        // We generated 5 change addresses (4 txs; 1 genesis tx has 2 for mint baton and qty output)
        expect(changeIndex).to.equal(5);

        // Step 9: Create WatchOnlyWallet from xpub with known indices
        const watchOnlyWallet = WatchOnlyWallet.fromXpub(xpub, chronik, {
            accountNumber: 0,
            receiveIndex,
            changeIndex,
        });

        // Step 10: Sync the watch-only wallet
        // Before sync, verify the wallet has the expected number of addresses
        // The watch-only wallet should derive all addresses from 0 to receiveIndex and 0 to changeIndex
        const expectedAddressCount = receiveIndex + 1 + changeIndex + 1;

        // Before sync, it should only have receive 0 (cached in constructor)
        expect(watchOnlyWallet.keypairs.size).to.equal(1);

        await watchOnlyWallet.sync();

        // After sync, it should have all addresses from 0 to the indices
        expect(watchOnlyWallet.keypairs.size).to.equal(expectedAddressCount);

        // Step 11: Verify balances match
        expect(watchOnlyWallet.balanceSats).to.equal(wallet.balanceSats);

        // Step 12: Verify UTXO counts match
        expect(watchOnlyWallet.utxos.length).to.equal(wallet.utxos.length);

        // Step 13: Verify all UTXOs match
        expect(watchOnlyWallet.utxos).to.deep.equal(wallet.utxos);

        // Step 14: Exhaustive methods test
        // Test that it's HD
        expect(watchOnlyWallet.isHD).to.equal(true);
        expect(watchOnlyWallet.baseHdNode).to.not.equal(undefined);
        expect(watchOnlyWallet.accountNumber).to.equal(0);
        expect(watchOnlyWallet.receiveIndex).to.equal(receiveIndex);
        expect(watchOnlyWallet.changeIndex).to.equal(changeIndex);

        // Test getAllAddresses
        // The watch-only wallet should have derived all addresses from 0 to receiveIndex and 0 to changeIndex
        const watchOnlyAllAddresses = watchOnlyWallet.getAllAddresses();
        const walletAllAddresses = wallet.getAllAddresses();
        expect(watchOnlyAllAddresses.sort()).to.deep.equal(
            walletAllAddresses.sort(),
        );

        // The watch-only wallet should have exactly the expected count of addresses
        // (receive addresses 0 to receiveIndex, change addresses 0 to changeIndex)
        expect(watchOnlyAllAddresses.length).to.equal(expectedAddressCount);

        // The wallet may have more addresses cached from transaction building
        // (e.g., if it accessed receive address 1 or 2 during building, even though receiveIndex=0)
        // So walletAllAddresses.length may be >= expectedAddressCount
        expect(walletAllAddresses.length).to.be.at.least(expectedAddressCount);

        // Test getReceiveAddress
        const testReceiveAddress0 = watchOnlyWallet.getReceiveAddress(0);
        const testReceiveAddress1 = watchOnlyWallet.getReceiveAddress(1);
        expect(testReceiveAddress0).to.equal(receiveAddress0);
        expect(testReceiveAddress1).to.equal(receiveAddress1);

        // Test getChangeAddress
        const testChangeAddress0 = watchOnlyWallet.getChangeAddress(0);
        const testChangeAddress1 = watchOnlyWallet.getChangeAddress(1);
        expect(testChangeAddress0).to.not.equal(testChangeAddress1);
        expect(testChangeAddress0).to.not.equal(testReceiveAddress0);

        // Test getNextReceiveAddress
        const initialReceiveIndex = watchOnlyWallet.receiveIndex;
        const nextReceiveAddress = watchOnlyWallet.getNextReceiveAddress();
        expect(watchOnlyWallet.receiveIndex).to.equal(initialReceiveIndex + 1);
        expect(nextReceiveAddress).to.not.equal(receiveAddress0);
        expect(nextReceiveAddress).to.not.equal(receiveAddress1);

        // Test getNextChangeAddress
        const initialChangeIndex = watchOnlyWallet.changeIndex;
        const nextChangeAddress = watchOnlyWallet.getNextChangeAddress();
        expect(watchOnlyWallet.changeIndex).to.equal(initialChangeIndex + 1);
        expect(nextChangeAddress).to.not.equal(testChangeAddress0);

        // Test that addresses are cached
        const addressCountBefore = watchOnlyWallet.keypairs.size;
        watchOnlyWallet.getReceiveAddress(5); // Should cache
        watchOnlyWallet.getChangeAddress(5); // Should cache
        expect(watchOnlyWallet.keypairs.size).to.be.greaterThan(
            addressCountBefore,
        );

        // Test updateBalance
        const balanceBefore = watchOnlyWallet.balanceSats;
        watchOnlyWallet.updateBalance();
        expect(watchOnlyWallet.balanceSats).to.equal(balanceBefore);

        // Test sumUtxosSats static method
        const sum = WatchOnlyWallet.sumUtxosSats(watchOnlyWallet.utxos);
        expect(sum).to.equal(Wallet.sumUtxosSats(watchOnlyWallet.utxos));

        // Test that addresses match between wallet and watch-only wallet
        const walletReceive0 = wallet.getReceiveAddress(0);
        const watchOnlyReceive0 = watchOnlyWallet.getReceiveAddress(0);
        expect(watchOnlyReceive0).to.equal(walletReceive0);

        const walletChange0 = wallet.getChangeAddress(0);
        const watchOnlyChange0 = watchOnlyWallet.getChangeAddress(0);
        expect(watchOnlyChange0).to.equal(walletChange0);

        // Step 16: Send more transactions and verify sync still works
        const send3Resp = await wallet
            .action({
                outputs: [
                    {
                        script: MOCK_DESTINATION_SCRIPT,
                        sats: 25_000n,
                    },
                ],
            })
            .build()
            .broadcast();

        expect(send3Resp.success).to.equal(true);

        // Sync both wallets
        await wallet.sync();
        await watchOnlyWallet.sync();

        // Verify balances still match
        expect(watchOnlyWallet.balanceSats).to.equal(wallet.balanceSats);
        expect(watchOnlyWallet.utxos.length).to.equal(wallet.utxos.length);

        // Step 17: Test that watch-only wallet can track new addresses
        // Get next receive address and send to it
        const nextReceiveAddr = wallet.getNextReceiveAddress();
        await runner.sendToScript(
            500_000_00n,
            Script.fromAddress(nextReceiveAddr),
        );

        // Update watch-only wallet's receive index to match
        watchOnlyWallet.receiveIndex = wallet.receiveIndex;

        // Sync both
        await wallet.sync();
        await watchOnlyWallet.sync();

        // Verify balances still match
        expect(watchOnlyWallet.balanceSats).to.equal(wallet.balanceSats);
    });
});
