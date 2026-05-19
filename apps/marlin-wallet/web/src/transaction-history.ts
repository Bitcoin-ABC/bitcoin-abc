// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewLog, webViewError } from './common';
import { calculateTransactionAmountAtomsFromTx, atomsToUnit } from './amount';
import { Wallet } from 'ecash-wallet';
import { ChronikClient, type Tx } from 'chronik-client';
import { getAddress } from './wallet';
import { AppSettings } from './settings';
import { formatPrice } from 'ecash-price';
import type { MarlinPriceFetcher } from './price';
import {
    activeCryptoTicker,
    activeAssetDecimals,
    activeTokenId,
    allowFiatForActiveAsset,
    activeQuoteCurrency,
} from './active-asset';

// ============================================================================
// TRANSACTION HISTORY MANAGER
// ============================================================================

/** Visible rows to collect per initial load or scroll (token-filtered). */
export const VISIBLE_BATCH_TARGET = 25;
/** Larger fetch pages in token mode to cut round-trips (Chronik max). */
const TOKEN_HISTORY_FETCH_PAGE_SIZE = 200;

// Transaction History Manager
export class TransactionHistoryManager {
    private currentPage = 0;
    private totalPages = 0;
    private hasMoreTransactions = true;
    private isLoadingTransactions = false;
    private allTransactions: Tx[] = [];
    private ecashWallet: Wallet;
    private chronik: ChronikClient;
    private address: string;
    private appSettings: AppSettings;
    private priceFetcher: MarlinPriceFetcher | null;

    constructor(
        wallet: Wallet,
        chronik: ChronikClient,
        appSettings: AppSettings,
        priceFetcher: MarlinPriceFetcher | null,
    ) {
        this.ecashWallet = wallet;
        this.chronik = chronik;
        this.appSettings = appSettings;
        this.priceFetcher = priceFetcher;

        this.address = getAddress(this.ecashWallet);
    }

    // Update wallet reference (called when wallet is reloaded)
    updateWallet(wallet: Wallet): void {
        this.ecashWallet = wallet;
        this.address = getAddress(this.ecashWallet);
    }

    // Getters
    get isCurrentlyLoading(): boolean {
        return this.isLoadingTransactions;
    }

    get hasMoreToLoad(): boolean {
        return this.hasMoreTransactions;
    }

    get transactions(): Tx[] {
        return this.allTransactions;
    }

    get wallet(): Wallet {
        return this.ecashWallet;
    }

    // Reset state for new history load
    reset(): void {
        this.currentPage = 0;
        this.totalPages = 0;
        this.hasMoreTransactions = true;
        this.isLoadingTransactions = false;
        this.allTransactions = [];
    }

    /**
     * Counts the number of transactions that should be displayed to the user.
     *
     * In token mode, we only count transactions that moved this token.
     *
     * @param transactions The transactions to count.
     * @returns The number of visible transactions.
     */
    private countVisibleTransactions(transactions: Tx[]): number {
        const tokenId = activeTokenId();
        if (tokenId === null) {
            return transactions.length;
        }

        return transactions.reduce((count, tx) => {
            const atoms = calculateTransactionAmountAtomsFromTx(
                this.ecashWallet,
                tx,
                tokenId,
            );
            return atoms !== 0 ? count + 1 : count;
        }, 0);
    }

    /**
     * Fetches the next page of history.
     *
     * @returns true if more transactions are available.
     */
    private async fetchNextHistoryPage(): Promise<boolean> {
        // For XEC, simply fetch the first page of the target number of txs we
        // want to display. For tokens, we need to fetch until we have enough
        // relevant txs, so it makes sense to use the max page size and cache
        // the transactions to reduce the number of round-trips.
        const txHistoryResponse = await this.chronik
            .address(this.address)
            .history(
                this.currentPage,
                activeTokenId() === null
                    ? VISIBLE_BATCH_TARGET
                    : TOKEN_HISTORY_FETCH_PAGE_SIZE,
            );

        const txHistory = txHistoryResponse.txs;
        this.totalPages = txHistoryResponse.numPages;

        if (!txHistory || txHistory.length === 0) {
            return false;
        }

        this.allTransactions = [...this.allTransactions, ...txHistory];

        if (this.currentPage >= this.totalPages - 1) {
            return false;
        }

        this.currentPage++;
        return true;
    }

    /**
     * Address history mixes all assets. In token mode, keep fetching pages
     * until enough visible rows exist or history is exhausted.
     */
    private async fetchMoreTxsToDisplay(
        targetAdditionalVisible: number,
    ): Promise<number> {
        const visibleBefore = this.countVisibleTransactions(
            this.allTransactions,
        );
        let visibleNow = visibleBefore;

        // fetchNextHistoryPage() updates this.allTransactions
        do {
            this.hasMoreTransactions = await this.fetchNextHistoryPage();
            visibleNow = this.countVisibleTransactions(this.allTransactions);
            if (visibleNow - visibleBefore >= targetAdditionalVisible) {
                // We have enough transactions to display, so stop fetching.
                break;
            }
        } while (this.hasMoreTransactions);

        return visibleNow;
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
            // Prevent multiple simultaneous requests
            return;
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
            return;
        }

        this.isLoadingTransactions = true;

        // Show loading indicator immediately if not resetting
        if (!reset) {
            this.displayTransactions(this.allTransactions);
        }

        try {
            const visibleCount =
                await this.fetchMoreTxsToDisplay(VISIBLE_BATCH_TARGET);

            this.isLoadingTransactions = false;
            if (visibleCount === 0) {
                this.showNoTransactions();
                return;
            }

            await this.displayTransactions(this.allTransactions);
        } catch (error) {
            webViewError('Failed to load transaction history:', error);
            this.showTransactionError();
        } finally {
            this.isLoadingTransactions = false;
        }
    }

    // Display transactions in the UI
    async displayTransactions(transactions: Tx[]): Promise<void> {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) return;

        if (transactions.length === 0) {
            this.showNoTransactions();
            return;
        }

        const pricePerXec = allowFiatForActiveAsset()
            ? await this.priceFetcher?.current({
                  source: activeQuoteCurrency(),
                  quote: this.appSettings.fiatCurrency,
              })
            : null;

        const tokenId = activeTokenId();
        const primaryTicker = activeCryptoTicker();
        const tokenDecimals = activeAssetDecimals();

        const xecFormatOptions = {
            locale: this.appSettings.locale,
            decimals: tokenDecimals,
            alwaysShowSign: true,
        };
        const fiatFormatOptions = {
            locale: this.appSettings.locale,
            alwaysShowSign: true,
        };

        const transactionHTML = transactions.map(tx => {
            // Use timeFirstSeen field from Chronik, fallback to block timestamp if zero
            let time;
            if (tx.timeFirstSeen && tx.timeFirstSeen > 0) {
                time = new Date(tx.timeFirstSeen * 1000).toLocaleString(
                    this.appSettings.locale,
                );
            } else if (tx.block && tx.block.timestamp) {
                time = new Date(tx.block.timestamp * 1000).toLocaleString(
                    this.appSettings.locale,
                );
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

            const atoms = calculateTransactionAmountAtomsFromTx(
                this.ecashWallet,
                tx,
                tokenId,
            );

            if (tokenId !== null && atoms === 0) {
                return null;
            }

            const amountPrimary = atomsToUnit(atoms, activeAssetDecimals());

            const isReceived = amountPrimary >= 0;
            const amountClass = isReceived ? 'received' : 'sent';

            const primaryAmount =
                this.appSettings.primaryBalanceType === 'XEC' ||
                pricePerXec === null
                    ? formatPrice(
                          amountPrimary,
                          primaryTicker,
                          xecFormatOptions,
                      )
                    : formatPrice(
                          amountPrimary * pricePerXec,
                          this.appSettings.fiatCurrency,
                          fiatFormatOptions,
                      );

            let secondaryAmount: string = '';
            if (pricePerXec !== null) {
                secondaryAmount =
                    this.appSettings.primaryBalanceType === 'XEC'
                        ? formatPrice(
                              amountPrimary * pricePerXec,
                              this.appSettings.fiatCurrency,
                              fiatFormatOptions,
                          )
                        : formatPrice(
                              amountPrimary,
                              primaryTicker,
                              xecFormatOptions,
                          );
            }

            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-time">${String(time)}</div>
                        <div class="transaction-txid" data-txid="${String(
                            txid,
                        )}">${String(shortTxid)}</div>
                    </div>
                    <div class="transaction-amount ${String(amountClass)}">
                        <div class="transaction-amount-primary">
                           ${primaryAmount}
                        </div>
                        ${secondaryAmount ? `<div class="transaction-amount-secondary">${secondaryAmount}</div>` : ''}
                    </div>
                </div>
            `;
        });

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

        transactionList.innerHTML =
            transactionHTML.filter(t => t !== null).join('') + loadingIndicator;
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
