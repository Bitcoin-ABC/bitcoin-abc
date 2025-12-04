// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewLog, webViewError } from './common';
import { calculateTransactionAmountSats, satsToXec } from './amount';
import { Wallet } from 'ecash-wallet';
import { ChronikClient } from 'chronik-client';
import { getAddress } from './wallet';
import { config } from './config';

// ============================================================================
// TRANSACTION HISTORY MANAGER
// ============================================================================

// Transaction History Manager
export class TransactionHistoryManager {
    private currentPage = 0;
    private totalPages = 0;
    private hasMoreTransactions = true;
    private isLoadingTransactions = false;
    private allTransactions: any[] = [];
    private wallet: Wallet;
    private chronik: ChronikClient;
    private address: string;

    constructor(wallet: Wallet, chronik: ChronikClient) {
        this.wallet = wallet;
        this.chronik = chronik;

        this.address = getAddress(this.wallet);
    }

    // Getters
    get isCurrentlyLoading(): boolean {
        return this.isLoadingTransactions;
    }

    get hasMoreToLoad(): boolean {
        return this.hasMoreTransactions;
    }

    get transactions(): any[] {
        return this.allTransactions;
    }

    // Reset state for new history load
    reset(): void {
        this.currentPage = 0;
        this.totalPages = 0;
        this.hasMoreTransactions = true;
        this.isLoadingTransactions = false;
        this.allTransactions = [];
    }

    // Load more transactions
    async loadMore(): Promise<void> {
        if (!this.hasMoreToLoad || this.isCurrentlyLoading) {
            return;
        }

        await this.loadTransactionHistory(false);
    }

    // Main transaction loading function
    async loadTransactionHistory(reset: boolean = true): Promise<void> {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) return;

        if (this.isLoadingTransactions) {
            return; // Prevent multiple simultaneous requests
        }

        if (reset) {
            this.reset();
            // Show loading state only on reset
            transactionList.innerHTML = `
                <div class="loading-transactions">
                    <div class="loading-spinner"></div>
                    <p>Loading transactions...</p>
                </div>
            `;
        }

        if (!this.hasMoreTransactions) {
            return; // No more transactions to load
        }

        this.isLoadingTransactions = true;

        // Show loading indicator immediately if not resetting
        if (!reset) {
            this.displayTransactions(this.allTransactions);
        }

        try {
            // Get transaction history from Chronik with pagination
            const txHistoryResponse = await (
                this.chronik.address(this.address) as any
            ).history(this.currentPage, 25);
            const txHistory = txHistoryResponse.txs;

            // Update pagination metadata
            this.totalPages = txHistoryResponse.numPages;

            if (!txHistory || txHistory.length === 0) {
                this.hasMoreTransactions = false;
                if (this.allTransactions.length === 0) {
                    this.showNoTransactions();
                }
                return;
            }

            // Add new transactions to existing list
            if (reset) {
                this.allTransactions = txHistory;
            } else {
                this.allTransactions = [...this.allTransactions, ...txHistory];
            }

            // Check if we've reached the last page
            if (this.currentPage >= this.totalPages - 1) {
                this.hasMoreTransactions = false;
            } else {
                this.currentPage++;
            }

            // Process and display all transactions
            this.displayTransactions(this.allTransactions);
        } catch (error) {
            webViewError('Failed to load transaction history:', error);
            this.showTransactionError();
        } finally {
            this.isLoadingTransactions = false;
            // Update display one more time to remove loading indicator
            if (!reset) {
                this.displayTransactions(this.allTransactions);
            }
        }
    }

    // Display transactions in the UI
    async displayTransactions(transactions: any[]): Promise<void> {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) return;

        if (transactions.length === 0) {
            this.showNoTransactions();
            return;
        }

        // Process transactions in parallel for better performance
        const transactionHTML = await Promise.all(
            transactions.map(async tx => {
                // Use timeFirstSeen field from Chronik, fallback to block timestamp if zero
                let time;
                if (tx.timeFirstSeen && tx.timeFirstSeen > 0) {
                    time = new Date(tx.timeFirstSeen * 1000).toLocaleString();
                } else if (tx.block && tx.block.timestamp) {
                    time = new Date(tx.block.timestamp * 1000).toLocaleString();
                } else {
                    time = 'Unknown Date';
                }
                const txid = String(tx.txid);
                const shortTxid =
                    txid.length > 12
                        ? `${txid.substring(0, 6)}...${txid.substring(
                              txid.length - 6,
                          )}`
                        : txid;

                // Calculate real transaction amount
                const amountSats = await calculateTransactionAmountSats(
                    this.wallet,
                    this.chronik,
                    txid,
                );
                const amountXEC = satsToXec(amountSats);

                const isReceived = amountXEC > 0;
                const amountClass = isReceived ? 'received' : 'sent';
                const amountPrefix = isReceived ? '+' : '-';
                const amountValue = Math.abs(amountXEC).toFixed(2);

                return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-time">${String(time)}</div>
                        <div class="transaction-txid" data-txid="${String(
                            txid,
                        )}">${String(shortTxid)}</div>
                    </div>
                    <div class="transaction-amount ${String(amountClass)}">
                        ${String(amountPrefix)}${String(amountValue)} ${
                    config.ticker
                }
                    </div>
                </div>
            `;
            }),
        );

        // Add loading indicator at bottom if currently loading more transactions
        let loadingIndicator = '';
        if (this.isLoadingTransactions) {
            loadingIndicator = `
                <div class="loading-more">
                    <div class="loading-spinner"></div>
                    <p>Loading more transactions...</p>
                </div>
            `;
        }

        transactionList.innerHTML = transactionHTML.join('') + loadingIndicator;
    }

    // Show no transactions message
    showNoTransactions(): void {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) {
            return;
        }

        transactionList.innerHTML = `
            <div class="no-transactions">
                <h3>No Transactions</h3>
                <p>You haven't made any transactions yet.</p>
            </div>
        `;
    }

    // Show transaction error
    showTransactionError(): void {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) {
            return;
        }

        transactionList.innerHTML = `
            <div class="no-transactions">
                <h3>Error Loading Transactions</h3>
                <p>Failed to load transaction history. Please try again later.</p>
            </div>
        `;
    }

    // Handle scroll events for infinite loading
    handleScroll(): void {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) return;

        // Check if user has scrolled near the bottom
        const scrollTop = transactionList.scrollTop;
        const scrollHeight = transactionList.scrollHeight;
        const clientHeight = transactionList.clientHeight;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

        // Load more transactions if near bottom, more pages available, and not currently loading
        if (isNearBottom && this.hasMoreToLoad && !this.isCurrentlyLoading) {
            webViewLog('Near bottom detected, loading more transactions...');
            this.loadMore();
        }
    }
}
