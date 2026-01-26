// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import * as sinon from 'sinon';
import { Wallet } from 'ecash-wallet';
import { ChronikClient, Tx } from 'chronik-client';
import { MockChronikClient } from 'mock-chronik-client';
import { Script } from 'ecash-lib';
import {
    TransactionManager,
    PostConsensusFinalizationResult,
} from '../src/transaction-manager';

const expect = chai.expect;

// Helper function to create an incoming transaction Tx object
function createIncomingTx(
    txid: string,
    amountSats: number,
    wallet: Wallet,
): Tx {
    const walletAddress = wallet.address;
    const walletScript = Script.fromAddress(walletAddress);

    return {
        txid,
        version: 1,
        // We don't care about validity of the input for the tests
        inputs: [
            {
                prevOut: {
                    txid: '00'.repeat(32),
                    outIdx: 0,
                },
                inputScript: '',
                outputScript: '00'.repeat(40), // Not from wallet
                sequenceNo: 0xffffffff,
                sats: BigInt(0),
            },
        ],
        outputs: [
            {
                sats: BigInt(amountSats),
                outputScript: walletScript.toHex(),
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1234567890,
        size: 200,
        isCoinbase: false,
        tokenEntries: [],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        isFinal: false,
    };
}

// Known mnemonic for deterministic testing
const TEST_MNEMONIC =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('transaction-manager.ts', function () {
    let mockChronik: MockChronikClient;
    let wallet: Wallet;
    let onBalanceChange: sinon.SinonStub;
    let transactionManager: TransactionManager;

    beforeEach(async function () {
        mockChronik = new MockChronikClient();
        wallet = Wallet.fromMnemonic(
            TEST_MNEMONIC,
            mockChronik as unknown as any,
        );

        // Set up UTXOs for the wallet (needed for sync() to calculate available balance)
        const walletAddress = wallet.address;
        mockChronik.setUtxosByAddress(walletAddress, [
            {
                outpoint: {
                    txid: '00'.repeat(32),
                    outIdx: 0,
                },
                blockHeight: 1000000,
                isCoinbase: false,
                sats: BigInt(1000000), // 10000 XEC
                isFinal: true,
            },
        ]);

        // Sync the wallet to load UTXOs
        await wallet.sync();

        // Mock onBalanceChange callback
        onBalanceChange = sinon.stub().resolves();

        transactionManager = new TransactionManager({
            ecashWallet: wallet,
            chronik: mockChronik as unknown as ChronikClient,
            onBalanceChange,
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('sync', function () {
        it('Should sync available balance from final UTXOs', function () {
            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(0);
        });

        it('Should add non-final UTXOs to pending amounts', async function () {
            // Create a new wallet with both final and non-final UTXOs
            const newWallet = Wallet.fromMnemonic(
                TEST_MNEMONIC,
                mockChronik as unknown as any,
            );
            const walletAddress = newWallet.address;

            // Set up UTXOs: one final, one non-final
            mockChronik.setUtxosByAddress(walletAddress, [
                {
                    outpoint: {
                        txid: 'aa'.repeat(32),
                        outIdx: 0,
                    },
                    blockHeight: 1000000,
                    isCoinbase: false,
                    sats: BigInt(500000), // 5000 XEC - final
                    isFinal: true,
                },
                {
                    outpoint: {
                        txid: 'bb'.repeat(32),
                        outIdx: 0,
                    },
                    blockHeight: 1000000,
                    isCoinbase: false,
                    sats: BigInt(300000), // 3000 XEC - non-final
                    isFinal: false,
                },
            ]);

            await newWallet.sync();

            const manager = new TransactionManager({
                ecashWallet: newWallet,
                chronik: mockChronik as unknown as ChronikClient,
                onBalanceChange,
            });

            expect(manager.getAvailableBalanceSats()).to.equal(500000);
            expect(manager.getTransitionalBalanceSats()).to.equal(300000);
            expect(manager.isPendingTransaction('bb'.repeat(32))).to.equal(
                true,
            );
            expect(manager.isPendingTransaction('aa'.repeat(32))).to.equal(
                false,
            );
        });

        it('Should handle null wallet gracefully', function () {
            const manager = new TransactionManager({
                ecashWallet: null,
                chronik: mockChronik as unknown as ChronikClient,
                onBalanceChange,
            });

            expect(manager.getAvailableBalanceSats()).to.equal(0);
            expect(manager.getTransitionalBalanceSats()).to.equal(0);
        });
    });

    describe('addNonFinalTransaction', function () {
        it('Should add a non-final transaction and update transitional balance', async function () {
            const txid = '11'.repeat(32);
            const amountSats = 50000; // 500 XEC

            mockChronik.setTx(txid, createIncomingTx(txid, amountSats, wallet));

            const result =
                await transactionManager.addNonFinalTransaction(txid);

            expect(result).to.not.equal(false);
            if (result !== false) {
                expect(result.amountSats).to.equal(amountSats);
                expect(result.state).to.equal('pending_finalization');
            }

            expect(transactionManager.isPendingTransaction(txid)).to.equal(
                true,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(
                amountSats,
            );
            expect(onBalanceChange.calledOnce).to.equal(true);
            expect(onBalanceChange.firstCall.args).to.deep.equal([
                1000000, // fromAvailableBalanceSats
                1000000, // toAvailableBalanceSats
                amountSats, // transitionalBalanceSats
            ]);
        });

        it('Should return false if transaction has no amount', async function () {
            const txid = '22'.repeat(32);

            // Create a transaction with no wallet outputs (zero amount)
            const walletAddress = wallet.address;
            const walletScript = Script.fromAddress(walletAddress);
            mockChronik.setTx(txid, {
                txid,
                version: 1,
                inputs: [],
                outputs: [
                    {
                        sats: BigInt(0),
                        outputScript: walletScript.toHex(),
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1234567890,
                size: 200,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                isFinal: false,
            });

            const result =
                await transactionManager.addNonFinalTransaction(txid);

            expect(result).to.equal(false);
            expect(transactionManager.isPendingTransaction(txid)).to.equal(
                false,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(0);
            expect(onBalanceChange.called).to.equal(false);
        });

        it('Should return false if transaction already exists', async function () {
            const txid = '33'.repeat(32);
            const amountSats = 50000;

            mockChronik.setTx(txid, createIncomingTx(txid, amountSats, wallet));

            // Add transaction first time
            await transactionManager.addNonFinalTransaction(txid);

            // Try to add again
            const result =
                await transactionManager.addNonFinalTransaction(txid);

            expect(result).to.equal(false);
            expect(onBalanceChange.calledOnce).to.equal(true); // Only called once
        });

        it('Should return false if wallet is not loaded', async function () {
            const manager = new TransactionManager({
                ecashWallet: null,
                chronik: mockChronik as unknown as ChronikClient,
                onBalanceChange,
            });

            const txid = '44'.repeat(32);
            const result = await manager.addNonFinalTransaction(txid);

            expect(result).to.equal(false);
        });
    });

    describe('finalizePreConsensus', function () {
        it('Should finalize a new transaction', async function () {
            const txid = '55'.repeat(32);
            const amountSats = 30000; // 300 XEC

            mockChronik.setTx(txid, createIncomingTx(txid, amountSats, wallet));

            await transactionManager.finalizePreConsensus(txid);

            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000 + amountSats,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(0);
            expect(onBalanceChange.calledOnce).to.equal(true);
            expect(onBalanceChange.firstCall.args).to.deep.equal([
                1000000, // fromAvailableBalanceSats
                1000000 + amountSats, // toAvailableBalanceSats
                0, // transitionalBalanceSats
            ]);
        });

        it('Should finalize an existing pending transaction', async function () {
            const txid = '66'.repeat(32);
            const amountSats = 40000; // 400 XEC

            mockChronik.setTx(txid, createIncomingTx(txid, amountSats, wallet));

            // Add as pending first
            await transactionManager.addNonFinalTransaction(txid);

            // Reset the stub call count
            onBalanceChange.resetHistory();

            // Finalize it
            await transactionManager.finalizePreConsensus(txid);

            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000 + amountSats,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(0);
            expect(onBalanceChange.calledOnce).to.equal(true);
            expect(onBalanceChange.firstCall.args).to.deep.equal([
                1000000, // fromAvailableBalanceSats
                1000000 + amountSats, // toAvailableBalanceSats
                0, // transitionalBalanceSats
            ]);
        });

        it('Should not finalize if transaction has no amount', async function () {
            const txid = '77'.repeat(32);

            // Create a transaction with no wallet outputs (zero amount)
            const walletAddress = wallet.address;
            const walletScript = Script.fromAddress(walletAddress);
            mockChronik.setTx(txid, {
                txid,
                version: 1,
                inputs: [],
                outputs: [
                    {
                        sats: BigInt(0),
                        outputScript: walletScript.toHex(),
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1234567890,
                size: 200,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                isFinal: false,
            });

            await transactionManager.finalizePreConsensus(txid);

            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000,
            );
            expect(onBalanceChange.called).to.equal(false);
        });
    });

    describe('finalizePostConsensus', function () {
        it('Should return NOT_PENDING if transaction is not pending', async function () {
            const txid = '88'.repeat(32);

            const result = await transactionManager.finalizePostConsensus(txid);

            expect(result).to.equal(
                PostConsensusFinalizationResult.NOT_PENDING,
            );
            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000,
            );
        });

        it('Should finalize a pending transaction and return NEWLY_FINALIZED', async function () {
            const txid = '99'.repeat(32);
            const amountSats = 60000; // 600 XEC

            mockChronik.setTx(txid, createIncomingTx(txid, amountSats, wallet));

            // Add as pending first
            await transactionManager.addNonFinalTransaction(txid);
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(
                amountSats,
            );

            // Reset the stub call count
            onBalanceChange.resetHistory();

            // Finalize it
            const result = await transactionManager.finalizePostConsensus(txid);

            expect(result).to.equal(
                PostConsensusFinalizationResult.NEWLY_FINALIZED,
            );
            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000 + amountSats,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(0);
            expect(transactionManager.isPendingTransaction(txid)).to.equal(
                false,
            );
            expect(onBalanceChange.calledOnce).to.equal(true);
        });

        it('Should return ALREADY_FINALIZED if transaction is already finalized', async function () {
            const txid = 'aa'.repeat(32);
            const amountSats = 70000; // 700 XEC

            mockChronik.setTx(txid, createIncomingTx(txid, amountSats, wallet));

            // Finalize pre-consensus first
            await transactionManager.finalizePreConsensus(txid);

            // Reset the stub call count
            onBalanceChange.resetHistory();

            // Try to finalize post-consensus
            const result = await transactionManager.finalizePostConsensus(txid);

            expect(result).to.equal(
                PostConsensusFinalizationResult.ALREADY_FINALIZED,
            );
            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000 + amountSats,
            );
            // Should not call onBalanceChange again since it was already finalized
            expect(onBalanceChange.called).to.equal(false);
        });
    });

    describe('invalidateTransaction', function () {
        it('Should remove a pending transaction and update transitional balance', async function () {
            const txid1 = 'bb'.repeat(32);
            const txid2 = 'cc'.repeat(32);
            const amountSats1 = 20000; // 200 XEC
            const amountSats2 = 30000; // 300 XEC

            mockChronik.setTx(
                txid1,
                createIncomingTx(txid1, amountSats1, wallet),
            );
            mockChronik.setTx(
                txid2,
                createIncomingTx(txid2, amountSats2, wallet),
            );

            // Add two pending transactions
            await transactionManager.addNonFinalTransaction(txid1);
            await transactionManager.addNonFinalTransaction(txid2);

            expect(transactionManager.getTransitionalBalanceSats()).to.equal(
                amountSats1 + amountSats2,
            );

            // Reset the stub call count
            onBalanceChange.resetHistory();

            // Invalidate one transaction
            await transactionManager.invalidateTransaction(txid1);

            expect(transactionManager.isPendingTransaction(txid1)).to.equal(
                false,
            );
            expect(transactionManager.isPendingTransaction(txid2)).to.equal(
                true,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(
                amountSats2,
            );
            expect(onBalanceChange.calledOnce).to.equal(true);
            expect(onBalanceChange.firstCall.args).to.deep.equal([
                1000000, // fromAvailableBalanceSats
                1000000, // toAvailableBalanceSats
                amountSats2, // transitionalBalanceSats
            ]);
        });

        it('Should handle invalidating non-existent transaction gracefully', async function () {
            const txid = 'dd'.repeat(32);

            // Should not throw
            await transactionManager.invalidateTransaction(txid);

            expect(transactionManager.getTransitionalBalanceSats()).to.equal(0);
            expect(onBalanceChange.calledOnce).to.equal(true);
        });
    });

    describe('getAvailableBalanceSats and getTransitionalBalanceSats', function () {
        it('Should return correct balances after multiple operations', async function () {
            const txid1 = 'ee'.repeat(32);
            const txid2 = 'ff'.repeat(32);
            const amountSats1 = 25000; // 250 XEC
            const amountSats2 = 35000; // 350 XEC

            mockChronik.setTx(
                txid1,
                createIncomingTx(txid1, amountSats1, wallet),
            );
            mockChronik.setTx(
                txid2,
                createIncomingTx(txid2, amountSats2, wallet),
            );

            // Add two pending transactions
            await transactionManager.addNonFinalTransaction(txid1);
            await transactionManager.addNonFinalTransaction(txid2);

            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(
                amountSats1 + amountSats2,
            );

            // Finalize one
            await transactionManager.finalizePreConsensus(txid1);

            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000 + amountSats1,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(
                amountSats2,
            );

            // Invalidate the other
            await transactionManager.invalidateTransaction(txid2);

            expect(transactionManager.getAvailableBalanceSats()).to.equal(
                1000000 + amountSats1,
            );
            expect(transactionManager.getTransitionalBalanceSats()).to.equal(0);
        });
    });
});
