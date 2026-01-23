// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Navigation, Screen } from '../navigation';
import { TransactionHistoryManager } from '../transaction-history';
import { getAddress } from '../wallet';
import { config } from '../config';
import { sendMessageToBackend, webViewError } from '../common';

export interface HistoryScreenParams {
    transactionHistory: TransactionHistoryManager;
    navigation: Navigation;
}

export class HistoryScreen {
    private params: HistoryScreenParams;
    private scrollHandlerAttached = false;
    private clickHandlerAttached = false;
    private ui: {
        historyBackBtn: HTMLButtonElement;
        transactionList: HTMLElement;
    };

    constructor(params: HistoryScreenParams) {
        this.params = params;
        this.assertUIElements();
        this.initializeEventListeners();
    }

    private assertUIElements(): void {
        this.ui = {
            historyBackBtn: document.getElementById(
                'history-back-btn',
            ) as HTMLButtonElement,
            transactionList: document.getElementById(
                'transaction-list',
            ) as HTMLElement,
        };

        if (!this.ui.historyBackBtn || !this.ui.transactionList) {
            webViewError('Missing required UI elements for history screen');
            throw new Error('Missing required UI elements for history screen');
        }
    }

    // Show the history screen
    show(): void {
        this.params.navigation.showScreen(Screen.History);

        // Load transaction history when showing the screen (reset to first page)
        const address = getAddress(this.params.transactionHistory.wallet);
        if (address) {
            this.params.transactionHistory.loadTransactionHistory(true);
        }

        // Only attach scroll handler once
        if (!this.scrollHandlerAttached) {
            this.ui.transactionList.addEventListener('scroll', () =>
                this.params.transactionHistory.handleScroll(),
            );
            this.scrollHandlerAttached = true;
        }

        // Only attach click handler once (event delegation)
        if (!this.clickHandlerAttached) {
            this.ui.transactionList.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('transaction-txid')) {
                    const txid = target.getAttribute('data-txid');
                    if (txid) {
                        this.openTransactionInExplorer(txid);
                    }
                }
            });
            this.clickHandlerAttached = true;
        }
    }

    // Initialize event listeners
    private initializeEventListeners(): void {
        // Setup history back button
        this.ui.historyBackBtn.addEventListener('click', () => {
            this.params.navigation.showScreen(Screen.Main);
        });
    }

    // Open transaction in block explorer
    private openTransactionInExplorer(txid: string): void {
        const explorerUrl = config.explorerUrl + txid;

        // On mobile (iOS/Android WebView), send message to native layer to open in system browser
        // On web, use window.open
        if (!sendMessageToBackend('OPEN_URL', explorerUrl)) {
            window.open(explorerUrl, '_blank');
        }
    }
}
