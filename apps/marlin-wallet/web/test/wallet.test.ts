// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import { Address, OP_RETURN } from 'ecash-lib';
import { Wallet } from 'ecash-wallet';
import { MockChronikClient } from 'mock-chronik-client';
import { getAddress, buildTx } from '../src/wallet';

const expect = chai.expect;

// Known mnemonic for deterministic testing
const TEST_MNEMONIC =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_ADDRESS_ECASH = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';

describe('wallet.ts', function () {
    let mockChronik: MockChronikClient;
    let wallet: Wallet;

    beforeEach(async function () {
        mockChronik = new MockChronikClient();
        wallet = Wallet.fromMnemonic(
            TEST_MNEMONIC,
            mockChronik as unknown as any,
        );

        // Set up blockchain info
        mockChronik.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 1000000,
        });

        // Set up UTXOs for the wallet so it can build transactions
        // We need enough sats to cover the transaction amount + fees
        const walletAddress = wallet.address;
        mockChronik.setUtxosByAddress(walletAddress, [
            {
                outpoint: {
                    txid: '00'.repeat(32),
                    outIdx: 0,
                },
                blockHeight: 1000000,
                isCoinbase: false,
                sats: BigInt(1000000), // 1 million sats (10000 XEC) - enough for test transactions
                isFinal: true,
            },
        ]);

        // Sync the wallet to load UTXOs
        await wallet.sync();
    });

    describe('getAddress', function () {
        it('Should return address with correct prefix', function () {
            const address = getAddress(wallet);
            expect(address).to.be.equal(TEST_ADDRESS_ECASH);
        });

        it('Should return null for null wallet', function () {
            expect(getAddress(null as unknown as Wallet)).to.be.equal(null);
        });

        it('Should return null for wallet without address', function () {
            const walletWithoutAddress = {
                address: null,
            } as unknown as Wallet;

            expect(getAddress(walletWithoutAddress)).to.be.equal(null);
        });
    });

    describe('buildTx', function () {
        it('Should build transaction without OP_RETURN', function () {
            const recipientAddress =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
            const sats = 10000;

            const tx = buildTx(wallet, recipientAddress, sats);

            expect(tx).to.not.be.equal(null);
            expect(
                Address.fromScript(tx.tx.outputs[0].script).toString(),
            ).to.be.equal(recipientAddress);
            expect(tx.tx.outputs[0].sats).to.be.equal(BigInt(sats));
        });

        it('Should build transaction with OP_RETURN', function () {
            const recipientAddress =
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
            const sats = 10000;
            const opReturnRaw = '0450415900'; // PayButton protocol

            const tx = buildTx(wallet, recipientAddress, sats, opReturnRaw);

            expect(tx).to.not.be.equal(null);
            // First output should be OP_RETURN with 0 sats
            expect(tx.tx.outputs[0].sats).to.be.equal(BigInt(0));
            expect(tx.tx.outputs[0].script.toHex()).to.be.equal(
                OP_RETURN.toString(16) + opReturnRaw,
            );
            // Second output should be the recipient address
            expect(
                Address.fromScript(tx.tx.outputs[1].script).toString(),
            ).to.be.equal(recipientAddress);
            expect(tx.tx.outputs[1].sats).to.be.equal(BigInt(sats));
        });
    });
});
