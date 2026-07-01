// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewLog, webViewError } from './common';
import { calculateTransactionAmountAtomsFromTx, atomsToUnit } from './amount';
import { Wallet } from 'ecash-wallet';
import { ChronikClient, type Tx } from 'chronik-client';
import { AddressManager } from './address-manager';
import { AppSettings } from './settings';
import { formatPrice } from 'ecash-price';
import type { MarlinPriceFetcher } from './price';
import {
    activeAssetDecimals,
    activeTokenId,
    allowFiatForActiveAsset,
    activeQuoteCurrency,
    formatActiveAssetAmount,
} from './active-asset';

// ============================================================================
// TRANSACTION HISTORY MANAGER
// ============================================================================

/** Visible rows to collect per initial load or scroll (token-filtered). */
export const VISIBLE_BATCH_TARGET = 25;
/** Chronik max page size for address history fetches. */
const HISTORY_FETCH_PAGE_SIZE = 200;

/** Head of a sorted tx stream for k-way merge. */
export interface HistoryMergeStream {
    txs: Tx[];
    index: number;
}

/** Per-address Chronik history stream (pages are merged newest-first). */
export interface AddressHistoryStream {
    address: string;
    page: number;
    exhausted: boolean;
    merge: HistoryMergeStream;
}

/** Newest first; lower txid first when timeFirstSeen and block timestamp tie. */
export function compareHistoryTransactions(a: Tx, b: Tx): number {
    const timeFirstSeenDiff = b.timeFirstSeen - a.timeFirstSeen;
    if (timeFirstSeenDiff !== 0) {
        return timeFirstSeenDiff;
    }

    const blockTimestampDiff =
        (b.block?.timestamp ?? 0) - (a.block?.timestamp ?? 0);
    if (blockTimestampDiff !== 0) {
        return blockTimestampDiff;
    }

    return a.txid.localeCompare(b.txid);
}

export function createHistoryStreams(
    addresses: string[],
): AddressHistoryStream[] {
    return addresses.map(address => ({
        address,
        page: 0,
        exhausted: false,
        merge: { txs: [], index: 0 },
    }));
}

export function createHistoryCursors(
    addresses: string[],
): Pick<AddressHistoryStream, 'address' | 'page' | 'exhausted'>[] {
    return createHistoryStreams(addresses);
}

export function hasMoreHistoryPages(
    streams: Pick<AddressHistoryStream, 'exhausted'>[],
): boolean {
    return streams.some(stream => !stream.exhausted);
}

/**
 * Pop the globally newest tx from k sorted stream heads, skipping seen txids.
 * Advances the winning stream past duplicates at its head.
 */
export function popNextKWayMergedTx(
    streams: HistoryMergeStream[],
    seenTxids: Set<string>,
): Tx | null {
    let bestStreamIndex = -1;
    let bestTx: Tx | null = null;

    for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        while (stream.index < stream.txs.length) {
            const tx = stream.txs[stream.index];
            if (seenTxids.has(tx.txid)) {
                stream.index++;
                continue;
            }
            if (bestTx === null || compareHistoryTransactions(tx, bestTx) < 0) {
                bestTx = tx;
                bestStreamIndex = i;
            }
            break;
        }
    }

    if (bestTx === null || bestStreamIndex < 0) {
        return null;
    }

    streams[bestStreamIndex].index++;
    seenTxids.add(bestTx.txid);
    return bestTx;
}

/**
 * K-way merge sorted per-address streams, stopping after `targetCount` txs
 * that satisfy `isCounted` (default: every merged tx).
 */
export function kWayMergeWithEarlyStop(
    streamTxLists: Tx[][],
    targetCount: number,
    isCounted: (tx: Tx) => boolean = () => true,
): Tx[] {
    const streams: HistoryMergeStream[] = streamTxLists.map(txs => ({
        txs,
        index: 0,
    }));
    const seenTxids = new Set<string>();
    const merged: Tx[] = [];
    let counted = 0;

    while (counted < targetCount) {
        const tx = popNextKWayMergedTx(streams, seenTxids);
        if (tx === null) {
            break;
        }
        merged.push(tx);
        if (isCounted(tx)) {
            counted++;
        }
    }

    return merged;
}

export function advanceHistoryCursors(
    activeCursors: Pick<AddressHistoryStream, 'page' | 'exhausted'>[],
    responses: { txs: Tx[]; numPages: number }[],
): void {
    for (let i = 0; i < activeCursors.length; i++) {
        const cursor = activeCursors[i];
        const response = responses[i];
        const txs = response.txs ?? [];
        if (txs.length === 0 || cursor.page >= response.numPages - 1) {
            cursor.exhausted = true;
        } else {
            cursor.page++;
        }
    }
}

function compactHistoryStreamBuffer(stream: AddressHistoryStream): void {
    if (stream.merge.index > 0) {
        stream.merge.txs = stream.merge.txs.slice(stream.merge.index);
        stream.merge.index = 0;
    }
}

// Transaction History Manager
export class TransactionHistoryManager {
    private hasMoreTransactions = true;
    private isLoadingTransactions = false;
    private allTransactions: Tx[] = [];
    private seenTxids = new Set<string>();
    private addressStreams: AddressHistoryStream[] = [];
    private ecashWallet: Wallet;
    private addressManager: AddressManager;
    private chronik: ChronikClient;
    private appSettings: AppSettings;
    private priceFetcher: MarlinPriceFetcher | null;

    constructor(
        wallet: Wallet,
        addressManager: AddressManager,
        chronik: ChronikClient,
        appSettings: AppSettings,
        priceFetcher: MarlinPriceFetcher | null,
    ) {
        this.ecashWallet = wallet;
        this.addressManager = addressManager;
        this.chronik = chronik;
        this.appSettings = appSettings;
        this.priceFetcher = priceFetcher;

        this.initHistoryStreams();
    }

    // Update wallet reference (called when wallet is reloaded)
    updateWallet(wallet: Wallet): void {
        this.ecashWallet = wallet;
        this.addressManager.updateWallet(wallet);
    }

    private initHistoryStreams(): void {
        this.addressStreams = createHistoryStreams(
            this.addressManager.getHistoryAddresses(),
        );
        this.hasMoreTransactions = this.hasMergeableHistory();
    }

    private hasBufferedHistory(): boolean {
        return this.addressStreams.some(
            stream => stream.merge.index < stream.merge.txs.length,
        );
    }

    private hasMergeableHistory(): boolean {
        return (
            this.hasBufferedHistory() ||
            this.addressStreams.some(stream => !stream.exhausted)
        );
    }

    private isVisibleTransaction(tx: Tx): boolean {
        const tokenId = activeTokenId();
        if (tokenId === null) {
            return true;
        }
        return (
            calculateTransactionAmountAtomsFromTx(
                this.ecashWallet,
                tx,
                tokenId,
            ) !== 0
        );
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
        this.hasMoreTransactions = true;
        this.isLoadingTransactions = false;
        this.allTransactions = [];
        this.seenTxids.clear();
        this.initHistoryStreams();
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
     * Fetch the next Chronik page for streams whose buffers are fully consumed.
     */
    private async refillEmptyStreamBuffers(): Promise<void> {
        const streamsToFetch = this.addressStreams.filter(
            stream =>
                !stream.exhausted &&
                stream.merge.index >= stream.merge.txs.length,
        );
        if (streamsToFetch.length === 0) {
            return;
        }

        const responses = await Promise.all(
            streamsToFetch.map(stream =>
                this.chronik
                    .address(stream.address)
                    .history(stream.page, HISTORY_FETCH_PAGE_SIZE),
            ),
        );

        for (let i = 0; i < streamsToFetch.length; i++) {
            const stream = streamsToFetch[i];
            const response = responses[i];
            const txs = response.txs ?? [];
            compactHistoryStreamBuffer(stream);
            stream.merge.txs.push(...txs);
            if (txs.length === 0 || stream.page >= response.numPages - 1) {
                stream.exhausted = true;
            } else {
                stream.page++;
            }
        }
    }

    /**
     * K-way merge from address streams until `targetAdditionalVisible` more
     * displayable txs are cached or history is exhausted.
     */
    private async fetchMoreTxsToDisplay(
        targetAdditionalVisible: number,
    ): Promise<number> {
        let visibleAdded = 0;

        while (
            visibleAdded < targetAdditionalVisible &&
            this.hasMergeableHistory()
        ) {
            await this.refillEmptyStreamBuffers();

            let progressed = false;
            while (
                visibleAdded < targetAdditionalVisible &&
                this.hasBufferedHistory()
            ) {
                const mergeStreams = this.addressStreams.map(
                    stream => stream.merge,
                );
                const tx = popNextKWayMergedTx(mergeStreams, this.seenTxids);
                if (tx === null) {
                    break;
                }

                this.allTransactions.push(tx);
                progressed = true;
                if (this.isVisibleTransaction(tx)) {
                    visibleAdded++;
                }
            }

            if (!progressed) {
                break;
            }
        }

        for (const stream of this.addressStreams) {
            compactHistoryStreamBuffer(stream);
        }

        this.hasMoreTransactions = this.hasMergeableHistory();
        return this.countVisibleTransactions(this.allTransactions);
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
                    ? formatActiveAssetAmount(amountPrimary, xecFormatOptions)
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
                        : formatActiveAssetAmount(
                              amountPrimary,
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
