// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * hdDiscovery.test.ts
 *
 * Integration tests for HD address discovery with gap limit
 * (syncAndDiscoverAddresses) against regtest Chronik.
 */

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ChronikClient } from 'chronik-client';
import { Address, Script, entropyToMnemonic, payment } from 'ecash-lib';
import * as wordlist from 'ecash-lib/wordlists/english.json';
import { TestRunner } from 'ecash-lib/dist/test/testRunner.js';
import { Wallet } from '../src/wallet';
import { WatchOnlyWallet } from '../src/watchOnly';

use(chaiAsPromised);

const NUM_COINS = 50;
const COIN_VALUE = 1100000000n;

const MOCK_DESTINATION_ADDRESS = Address.p2pkh('deadbeef'.repeat(5)).toString();
const MOCK_DESTINATION_SCRIPT = Script.fromAddress(MOCK_DESTINATION_ADDRESS);

/**
 * Create an HD wallet with a unique deterministic mnemonic from a seed number.
 */
const createHDWallet = (seed: number, chronik: ChronikClient) => {
    const entropy = new Uint8Array(16);
    const seedBytes = new Uint8Array(4);
    seedBytes[0] = (seed >> 24) & 0xff;
    seedBytes[1] = (seed >> 16) & 0xff;
    seedBytes[2] = (seed >> 8) & 0xff;
    seedBytes[3] = seed & 0xff;
    for (let i = 0; i < 16; i++) {
        entropy[i] = (seedBytes[i % 4] + i * 7) % 256;
    }
    const mnemonic = entropyToMnemonic(entropy, wordlist);
    return Wallet.fromMnemonic(mnemonic, chronik, { hd: true });
};

/**
 * After gap discovery, `keypairs` retains the unused lookahead past each
 * chain's next index (intentional), and may retain extras from large Chronik
 * batches. Expect at least receive 0..(receiveIndex+gapLimit-1) and
 * change 0..(changeIndex+gapLimit-1) to be cached.
 */
const expectGapLookaheadKeypairs = (
    wallet: {
        receiveIndex: number;
        changeIndex: number;
        keypairs: Map<string, unknown>;
        getReceiveAddress: (i: number) => string;
        getChangeAddress: (i: number) => string;
    },
    gapLimit: number,
) => {
    const minCount =
        wallet.receiveIndex + gapLimit + (wallet.changeIndex + gapLimit);
    expect(wallet.keypairs.size).to.be.at.least(minCount);

    for (let i = 0; i < wallet.receiveIndex + gapLimit; i++) {
        expect(wallet.keypairs.has(wallet.getReceiveAddress(i))).to.equal(
            true,
            `missing receive keypair at index ${i}`,
        );
    }
    for (let i = 0; i < wallet.changeIndex + gapLimit; i++) {
        expect(wallet.keypairs.has(wallet.getChangeAddress(i))).to.equal(
            true,
            `missing change keypair at index ${i}`,
        );
    }
};

describe('HD wallet address discovery (gap limit)', () => {
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

    it('syncAndDiscoverAddresses restores balance with unknown indices', async () => {
        const funded = createHDWallet(9001, chronik);

        // Fund receive indices 0, 2, 5 and change index 3
        const receive0 = funded.getReceiveAddress(0);
        const receive2 = funded.getReceiveAddress(2);
        const receive5 = funded.getReceiveAddress(5);
        const change3 = funded.getChangeAddress(3);

        const sats0 = 1_000_000_00n;
        const sats2 = 2_000_000_00n;
        const sats5 = 3_000_000_00n;
        const satsChange = 500_000_00n;

        await runner.sendToScript(sats0, Script.fromAddress(receive0));
        await runner.sendToScript(sats2, Script.fromAddress(receive2));
        await runner.sendToScript(sats5, Script.fromAddress(receive5));
        await runner.sendToScript(satsChange, Script.fromAddress(change3));

        // Same mnemonic, default indices (0, 0) — no prior knowledge
        const restored = createHDWallet(9001, chronik);
        expect(restored.receiveIndex).to.equal(0);
        expect(restored.changeIndex).to.equal(0);

        // Plain sync misses funds beyond index 0
        await restored.sync();
        expect(restored.balanceSats).to.equal(sats0);

        // Discovery finds all funded addresses
        const gapLimit = 10;
        await restored.syncAndDiscoverAddresses({ gapLimit });

        expect(restored.receiveIndex).to.equal(6); // next after highest used (5)
        expect(restored.changeIndex).to.equal(4); // next after highest used (3)
        expect(restored.balanceSats).to.equal(
            sats0 + sats2 + sats5 + satsChange,
        );
        expect(restored.utxos.length).to.equal(4);
        // Gap lookahead keypairs are retained (extra beyond active indices)
        expectGapLookaheadKeypairs(restored, gapLimit);
    });

    it('syncAndDiscoverAddresses finds spent-empty receive addresses via history', async () => {
        const wallet = createHDWallet(9002, chronik);

        // Fund receive index 4, then spend it so the address has history but no UTXOs
        const receive4 = wallet.getReceiveAddress(4);
        const fundSats = 1_000_000_00n;
        await runner.sendToScript(fundSats, Script.fromAddress(receive4));

        wallet.receiveIndex = 5;
        wallet.changeIndex = 0;
        await wallet.sync();
        expect(wallet.balanceSats).to.equal(fundSats);

        // Spend the UTXO; change (if any) goes to change/0 — receive4 becomes empty
        const sendAction: payment.Action = {
            outputs: [
                {
                    sats: 500_000_00n,
                    script: MOCK_DESTINATION_SCRIPT,
                },
            ],
        };
        await wallet.action(sendAction).build().broadcast();

        const receive4Utxos = await chronik.address(receive4).utxos();
        expect(receive4Utxos.utxos.length).to.equal(0);
        const receive4History = await chronik.address(receive4).history();
        expect(receive4History.numTxs).to.be.greaterThan(0);

        // Restore with unknown indices
        const restored = createHDWallet(9002, chronik);
        const gapLimit = 10;
        await restored.syncAndDiscoverAddresses({ gapLimit });

        // Discovery must advance past the spent receive address
        expect(restored.receiveIndex).to.be.at.least(5);
        // Change from the spend should also be discovered
        expect(restored.changeIndex).to.be.at.least(1);
        expect(restored.balanceSats).to.be.greaterThan(0n);
        expectGapLookaheadKeypairs(restored, gapLimit);
    });

    it('WatchOnlyWallet.fromXpub syncAndDiscoverAddresses matches Wallet', async () => {
        const wallet = createHDWallet(9003, chronik);
        if (!wallet.baseHdNode) {
            throw new Error('Expected HD wallet');
        }
        const xpub = wallet.baseHdNode.xpub();

        const receive1 = wallet.getReceiveAddress(1);
        const receive7 = wallet.getReceiveAddress(7);
        const change0 = wallet.getChangeAddress(0);

        const sats1 = 800_000_00n;
        const sats7 = 900_000_00n;
        const satsChange = 100_000_00n;

        await runner.sendToScript(sats1, Script.fromAddress(receive1));
        await runner.sendToScript(sats7, Script.fromAddress(receive7));
        await runner.sendToScript(satsChange, Script.fromAddress(change0));

        const restoredWallet = createHDWallet(9003, chronik);
        const gapLimit = 10;
        await restoredWallet.syncAndDiscoverAddresses({ gapLimit });

        const watchOnly = WatchOnlyWallet.fromXpub(xpub, chronik);
        await watchOnly.syncAndDiscoverAddresses({ gapLimit });

        expect(watchOnly.receiveIndex).to.equal(restoredWallet.receiveIndex);
        expect(watchOnly.changeIndex).to.equal(restoredWallet.changeIndex);
        expect(watchOnly.balanceSats).to.equal(restoredWallet.balanceSats);
        expect(watchOnly.utxos.length).to.equal(restoredWallet.utxos.length);
        expect(watchOnly.receiveIndex).to.equal(8);
        expect(watchOnly.changeIndex).to.equal(1);
        expect(watchOnly.balanceSats).to.equal(sats1 + sats7 + satsChange);
        expectGapLookaheadKeypairs(restoredWallet, gapLimit);
        expectGapLookaheadKeypairs(watchOnly, gapLimit);
    });
});
