// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Wallet } from 'ecash-wallet';
import { ChronikClient } from 'chronik-client';
import { calculateTransactionAmountSats, satsToXec } from './amount';
import { config } from './config';
import { webViewError, webViewLog } from './common';

interface PendingTransaction {
    // Positive = receive, negative = send, 0 = receive (in satoshis)
    amountSats: number;
    state: 'pending_finalization' | 'finalized';
}

export enum PostConsensusFinalizationResult {
    NOT_PENDING,
    ALREADY_FINALIZED,
    NEWLY_FINALIZED,
}

export interface TransactionManagerParams {
    ecashWallet: Wallet | null;
    chronik: ChronikClient;
    onBalanceChange: (
        fromAvailableBalanceSats: number,
        toAvailableBalanceSats: number,
        transitionalBalanceSats: number,
    ) => Promise<void>;
}

export class TransactionManager {
    private params: TransactionManagerParams;

    // Balance state - separate available and transitional (not finalized yet)
    // balances (in satoshis)
    private availableBalanceSats = 0; // Only final amounts in satoshis
    private transitionalBalanceSats = 0; // Only non final amounts in satoshis

    // Pending transactions - transactions that are not yet finalized
    private pendingAmounts: { [txid: string]: PendingTransaction } = {};

    constructor(params: TransactionManagerParams) {
        this.params = params;
        this.sync();
    }

    // Update wallet reference
    updateWallet(wallet: Wallet | null): void {
        this.params.ecashWallet = wallet;
        this.sync();
    }

    // Get current balance state
    getAvailableBalanceSats(): number {
        return this.availableBalanceSats;
    }

    getTransitionalBalanceSats(): number {
        return this.transitionalBalanceSats;
    }

    sync(): void {
        if (!this.params.ecashWallet) {
            return;
        }

        const spendableUtxos = this.params.ecashWallet.spendableSatsOnlyUtxos();
        const finalUtxos = spendableUtxos.filter(utxo => utxo.isFinal);
        this.availableBalanceSats = Number(
            finalUtxos.reduce((sum, utxo) => sum + utxo.sats, 0n),
        );

        const nonFinalUtxos = spendableUtxos.filter(utxo => !utxo.isFinal);
        for (const utxo of nonFinalUtxos) {
            this.pendingAmounts[utxo.outpoint.txid] = {
                amountSats: Number(utxo.sats),
                state: 'pending_finalization',
            };
        }
        this.transitionalBalanceSats = this.calculateTransitionalBalance();
    }

    // Check if transaction is pending
    isPendingTransaction(txid: string): boolean {
        return txid in this.pendingAmounts;
    }

    // Add a non-final transaction to the pending amounts
    async addNonFinalTransaction(
        txid: string,
    ): Promise<PendingTransaction | false> {
        const tx = await this.addPendingAmount(txid, 'pending_finalization');

        if (tx !== false) {
            // Update transitional balance
            this.transitionalBalanceSats = this.calculateTransitionalBalance();

            // Notify balance change
            await this.params.onBalanceChange(
                this.availableBalanceSats,
                this.availableBalanceSats,
                this.transitionalBalanceSats,
            );
        }

        return tx;
    }

    // Finalize pre-consensus transaction
    async finalizePreConsensus(txid: string): Promise<void> {
        let tx: PendingTransaction | false;
        if (this.pendingAmounts[txid]) {
            // We already have the transaction in our pending amounts, so we can
            // just update the state
            tx = this.pendingAmounts[txid];
            tx.state = 'finalized';
        } else {
            const pending_tx = await this.addPendingAmount(txid, 'finalized');
            if (!pending_tx) {
                return;
            }
            tx = pending_tx;
        }

        await this.finalizeTransaction(tx.amountSats);
        webViewLog(
            `Pre-consensus finalized transaction ${txid}: ${satsToXec(
                tx.amountSats,
            )} ${config.ticker} moved to available balance, state set to finalized`,
        );
    }

    // Finalize post-consensus transaction
    async finalizePostConsensus(
        txid: string,
    ): Promise<PostConsensusFinalizationResult> {
        const tx = this.pendingAmounts[txid];
        if (!tx) {
            return PostConsensusFinalizationResult.NOT_PENDING;
        }

        const status =
            tx.state === 'pending_finalization'
                ? PostConsensusFinalizationResult.NEWLY_FINALIZED
                : PostConsensusFinalizationResult.ALREADY_FINALIZED;
        if (status === PostConsensusFinalizationResult.NEWLY_FINALIZED) {
            tx.state = 'finalized';
            await this.finalizeTransaction(tx.amountSats);
            webViewLog(`Post-consensus finalized pending transaction ${txid}`);
        }

        // We won't get any message for this transaction anymore.
        // We don't need to recompute the transitional balance since it is
        // either a no change or it has been done in the finalizeTransaction
        // call already.
        delete this.pendingAmounts[txid];

        return status;
    }

    // Invalidate a transaction (remove from pending)
    async invalidateTransaction(txid: string): Promise<void> {
        delete this.pendingAmounts[txid];

        // Update transitional balance
        this.transitionalBalanceSats = this.calculateTransitionalBalance();

        // Notify balance change
        await this.params.onBalanceChange(
            this.availableBalanceSats,
            this.availableBalanceSats,
            this.transitionalBalanceSats,
        );
    }

    // Add pending transaction amount
    private async addPendingAmount(
        txid: string,
        state: 'pending_finalization' | 'finalized',
    ): Promise<PendingTransaction | false> {
        if (this.pendingAmounts[txid]) {
            webViewLog(
                `Transaction ${txid} already exists in pending amounts, ignoring duplicate`,
            );
            return false;
        }

        if (!this.params.ecashWallet) {
            webViewError('Cannot add pending amount: wallet not loaded');
            return false;
        }

        const txAmountSats = await calculateTransactionAmountSats(
            this.params.ecashWallet,
            this.params.chronik,
            txid,
        );
        if (txAmountSats == 0) {
            webViewLog(`Transaction ${txid} has no amount, ignoring`);
            return false;
        }

        this.pendingAmounts[txid] = {
            amountSats: txAmountSats,
            state,
        };
        webViewLog(
            `Added pending transaction ${txid}: ${satsToXec(txAmountSats)} ${
                config.ticker
            } (${txAmountSats} sats, state: ${state})`,
        );

        return this.pendingAmounts[txid];
    }

    // Finalize a transaction
    private async finalizeTransaction(amountSats: number): Promise<void> {
        const fromAvailableBalanceSats = this.availableBalanceSats;
        this.availableBalanceSats += amountSats;

        // Calculate transitional balance
        this.transitionalBalanceSats = this.calculateTransitionalBalance();

        // Notify balance change
        await this.params.onBalanceChange(
            fromAvailableBalanceSats,
            this.availableBalanceSats,
            this.transitionalBalanceSats,
        );
    }

    // Calculate transitional balance (helper function)
    private calculateTransitionalBalance(): number {
        let balance = 0;
        for (const tx of Object.values(this.pendingAmounts).filter(
            tx => tx.state === 'pending_finalization',
        )) {
            balance += tx.amountSats;
        }
        return balance;
    }
}
