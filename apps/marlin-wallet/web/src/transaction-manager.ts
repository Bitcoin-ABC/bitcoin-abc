// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Wallet } from 'ecash-wallet';
import { ChronikClient } from 'chronik-client';
import { calculateTransactionAmountAtoms, atomsToUnit } from './amount';
import { activeAssetDecimals, activeAssetTicker } from './active-asset';
import { webViewError, webViewLog } from './common';

interface PendingTransaction {
    /** satoshis (XEC) or token atoms */
    amountAtoms: number;
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
    /** null = track XEC (sats); otherwise track this token's atoms */
    tokenId: string | null;
    onBalanceChange: (
        fromAvailableBalanceAtoms: number,
        toAvailableBalanceAtoms: number,
        transitionalBalanceAtoms: number,
    ) => Promise<void>;
}

export class TransactionManager {
    private params: TransactionManagerParams;
    private tokenId: string | null;

    // Balance state - separate available and transitional (not finalized yet)
    // balances (in satoshis)
    private availableBalanceAtoms = 0;
    private transitionalBalanceAtoms = 0;

    // Pending transactions - transactions that are not yet finalized
    private pendingAmounts: { [txid: string]: PendingTransaction } = {};

    constructor(params: TransactionManagerParams) {
        this.params = params;
        this.tokenId = params.tokenId;
        this.sync();
    }

    // Update wallet reference
    updateWallet(wallet: Wallet | null): void {
        this.params.ecashWallet = wallet;
        this.sync();
    }

    setTokenId(tokenId: string | null): void {
        this.tokenId = tokenId;
        this.pendingAmounts = {};
        this.sync();
    }

    getAvailableBalanceSats(): number {
        return this.availableBalanceAtoms;
    }

    getTransitionalBalanceSats(): number {
        return this.transitionalBalanceAtoms;
    }

    sync(): void {
        if (!this.params.ecashWallet) {
            return;
        }

        if (this.tokenId === null) {
            this.syncXecBalances();
        } else {
            this.syncTokenBalances(this.tokenId);
        }

        this.transitionalBalanceAtoms = this.calculateTransitionalBalance();
    }

    private syncXecBalances(): void {
        const wallet = this.params.ecashWallet!;
        const spendableUtxos = wallet.spendableSatsOnlyUtxos();
        const finalUtxos = spendableUtxos.filter(utxo => utxo.isFinal);
        this.availableBalanceAtoms = Number(
            finalUtxos.reduce((sum, utxo) => sum + utxo.sats, 0n),
        );

        const nonFinalUtxos = spendableUtxos.filter(utxo => !utxo.isFinal);
        const byTxId = new Map<string, bigint>();
        for (const utxo of nonFinalUtxos) {
            const id = utxo.outpoint.txid;
            byTxId.set(id, (byTxId.get(id) ?? 0n) + utxo.sats);
        }
        this.pendingAmounts = {};
        for (const [txid, sats] of byTxId) {
            this.pendingAmounts[txid] = {
                amountAtoms: Number(sats),
                state: 'pending_finalization',
            };
        }
    }

    private syncTokenBalances(tokenId: string): void {
        const wallet = this.params.ecashWallet!;
        const spendable = wallet
            .spendableUtxos()
            .filter(
                utxo =>
                    utxo.token?.tokenId === tokenId && !utxo.token.isMintBaton,
            );
        const finalUtxos = spendable.filter(utxo => utxo.isFinal);
        this.availableBalanceAtoms = Number(
            finalUtxos.reduce(
                (sum, utxo) => sum + (utxo.token?.atoms ?? 0n),
                0n,
            ),
        );

        const nonFinal = spendable.filter(utxo => !utxo.isFinal);
        const byTxId = new Map<string, number>();
        for (const utxo of nonFinal) {
            const id = utxo.outpoint.txid;
            const atoms = Number(utxo.token?.atoms ?? 0n);
            byTxId.set(id, (byTxId.get(id) ?? 0) + atoms);
        }
        this.pendingAmounts = {};
        for (const [txid, amt] of byTxId) {
            this.pendingAmounts[txid] = {
                amountAtoms: amt,
                state: 'pending_finalization',
            };
        }
    }

    isPendingTransaction(txid: string): boolean {
        return txid in this.pendingAmounts;
    }

    // Add a non-final transaction to the pending amounts
    async addNonFinalTransaction(
        txid: string,
        amountAtoms?: number,
    ): Promise<PendingTransaction | false> {
        const tx = await this.addPendingAmount(
            txid,
            'pending_finalization',
            amountAtoms,
        );

        if (tx !== false) {
            this.transitionalBalanceAtoms = this.calculateTransitionalBalance();
            await this.params.onBalanceChange(
                this.availableBalanceAtoms,
                this.availableBalanceAtoms,
                this.transitionalBalanceAtoms,
            );
        }

        return tx;
    }

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

        await this.finalizeTransaction(tx.amountAtoms);
        webViewLog(
            `Pre-consensus finalized transaction ${txid}: ${atomsToUnit(
                tx.amountAtoms,
                activeAssetDecimals(),
            )} ${activeAssetTicker()} moved to available balance, state set to finalized`,
        );
    }

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
            await this.finalizeTransaction(tx.amountAtoms);
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
        this.transitionalBalanceAtoms = this.calculateTransitionalBalance();
        await this.params.onBalanceChange(
            this.availableBalanceAtoms,
            this.availableBalanceAtoms,
            this.transitionalBalanceAtoms,
        );
    }

    private async addPendingAmount(
        txid: string,
        state: 'pending_finalization' | 'finalized',
        amountAtoms?: number,
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

        const txAmountAtoms =
            amountAtoms !== undefined
                ? amountAtoms
                : await calculateTransactionAmountAtoms(
                      this.params.ecashWallet,
                      this.params.chronik,
                      txid,
                      this.tokenId,
                  );
        if (txAmountAtoms === 0) {
            webViewLog(`Transaction ${txid} has no amount, ignoring`);
            return false;
        }

        this.pendingAmounts[txid] = {
            amountAtoms: txAmountAtoms,
            state,
        };
        webViewLog(
            `Added pending transaction ${txid}: ${atomsToUnit(
                txAmountAtoms,
                activeAssetDecimals(),
            )} ${activeAssetTicker()} (${txAmountAtoms} atoms, state: ${state})`,
        );

        return this.pendingAmounts[txid];
    }

    private async finalizeTransaction(amountAtoms: number): Promise<void> {
        const fromAvailable = this.availableBalanceAtoms;
        this.availableBalanceAtoms += amountAtoms;
        this.transitionalBalanceAtoms = this.calculateTransitionalBalance();
        await this.params.onBalanceChange(
            fromAvailable,
            this.availableBalanceAtoms,
            this.transitionalBalanceAtoms,
        );
    }

    private calculateTransitionalBalance(): number {
        let balance = 0;
        for (const tx of Object.values(this.pendingAmounts).filter(
            t => t.state === 'pending_finalization',
        )) {
            balance += tx.amountAtoms;
        }
        return balance;
    }
}
