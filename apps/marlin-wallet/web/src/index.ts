// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// ============================================================================
// IMPORTS
// ============================================================================

import { Wallet } from 'ecash-wallet';
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import {
    XECPrice,
    CoinGeckoProvider,
    Fiat,
    ProviderStrategy,
} from 'ecash-price';
import PullToRefresh from 'pulltorefreshjs';
import { TransactionHistoryManager } from './transaction-history';
import {
    PostConsensusFinalizationResult,
    TransactionManager,
} from './transaction-manager';
import {
    sendMessageToBackend,
    webViewLog,
    webViewError,
    isReactNativeWebView,
} from './common';
import { satsToXec } from './amount';
import { getAddress, WalletData } from './wallet';
import { storeMnemonic, loadMnemonic, generateMnemonic } from './mnemonic';
import { config } from './config';
import { parseBip21Uri } from './bip21';
import { AppSettings, loadSettings } from './settings';
import { Navigation, Screen } from './navigation';
import { SettingsScreen } from './screen/settings';
import { HistoryScreen } from './screen/history';
import { SendScreen } from './screen/send';
import { MainScreen } from './screen/main';
import { paybuttonDeepLinkToBip21Uri } from './paybutton';

// Styles
import './main.css';

// Icons
import backArrowIcon from './assets/back-arrow.svg';
import marlin from './assets/marlin.svg';
import editIcon from './assets/edit.svg';
import historyIcon from './assets/history.svg';
import noCameraIcon from './assets/camera.svg';
import qrCodeIcon from './assets/qrcode.svg';
import settingsIcon from './assets/settings.svg';
import paybuttonLogo from './assets/paybutton.svg';

// ============================================================================
// GLOBALS
// ============================================================================

// Navigation instance
let navigation: Navigation;

// Wallet state
let wallet: WalletData | null = null;
let ecashWallet: Wallet | null = null;
let wsEndpoint: any = null;

let chronik: ChronikClient;

// Price API instance for fetching real-time XEC prices
let priceFetcher: XECPrice | null = null;

// Create global instance of TransactionHistoryManager
let transactionHistory: TransactionHistoryManager | null = null;

// Create global instance of TransactionManager
let transactionManager: TransactionManager | null = null;

// Create global instance of SettingsScreen
let settingsScreen: SettingsScreen | null = null;

// Create global instance of HistoryScreen
let historyScreen: HistoryScreen | null = null;

// Create global instance of SendScreen
let sendScreen: SendScreen | null = null;

// Create global instance of MainScreen
let mainScreen: MainScreen | null = null;

// Settings state
let appSettings: AppSettings = {
    requireHoldToSend: true,
    primaryBalanceType: 'XEC',
    fiatCurrency: Fiat.USD,
};

// ============================================================================
// GENERAL UTILITY FUNCTIONS
// ============================================================================

// Show error modal with proper title
function showErrorModal(title: string, message: string) {
    const errorModalOverlay = document.getElementById('error-modal-overlay');
    const errorModalTitle = document.querySelector('.error-modal-title');
    const errorModalMessage = document.querySelector('.error-modal-message');
    const errorModalClose = document.getElementById('error-modal-close');

    errorModalTitle.textContent = title;
    errorModalMessage.textContent = message;

    errorModalClose.addEventListener('click', () => {
        errorModalOverlay.style.display = 'none';
    });

    errorModalOverlay.style.display = 'flex';
}

function showLoadingScreen(message: string) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'flex';
        const loadingText = loadingEl.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
}

function hideLoadingScreen() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

declare global {
    interface Window {
        openHistory: () => void;
        openSettings: () => void;
    }
}

// These are required for the webview html button bindings
window.openHistory = () => {
    if (historyScreen) {
        historyScreen.show();
    }
};
window.openSettings = () => navigation.showScreen(Screen.Settings);

// ============================================================================
// WALLET MANAGEMENT FUNCTIONS
// ============================================================================

// Load existing wallet from stored mnemonic
async function loadWalletFromMnemonic(mnemonic: string) {
    // Create wallet using ecash-wallet library
    ecashWallet = Wallet.fromMnemonic(mnemonic, chronik);

    const address = getAddress(ecashWallet);
    if (!address) {
        // This should never happen
        webViewError('Cannot get address from wallet');
        return;
    }

    await syncWallet();

    // Create or update the wallet data object. This is passed by reference
    // around so it should not be recreated.
    if (!wallet) {
        wallet = {
            mnemonic: mnemonic,
        };
    } else {
        wallet.mnemonic = mnemonic;
    }

    // Create or update the transaction history instance with new wallet. This
    // is passed by reference to the HistoryScreen so it can be updated when the
    // wallet is changed.
    if (transactionHistory) {
        transactionHistory.updateWallet(ecashWallet);
    } else {
        transactionHistory = new TransactionHistoryManager(
            ecashWallet,
            chronik,
            appSettings,
            priceFetcher,
        );
    }

    // Update send screen with new wallet
    if (sendScreen) {
        sendScreen.updateWallet(ecashWallet);
    } else {
        sendScreen = new SendScreen({
            ecashWallet,
            navigation,
            appSettings,
            priceFetcher,
            syncWallet,
        });
    }

    // Update transaction manager with new wallet
    if (transactionManager) {
        transactionManager.updateWallet(ecashWallet);
    }

    // Update main screen with new wallet
    if (mainScreen && transactionManager) {
        await mainScreen.updateWallet(
            ecashWallet,
            transactionManager.getAvailableBalanceSats(),
            transactionManager.getTransitionalBalanceSats(),
        );
    }

    subscribeToAddress(address);

    // Send address and BIP21 prefix to watch
    sendMessageToBackend('SEND_ADDRESS_TO_WATCH', {
        address: address,
        bip21Prefix: config.bip21Prefix,
    });

    // Notify React Native that wallet is ready (for pending NFC payments)
    sendMessageToBackend('WALLET_READY', true);
}

// Load the wallet. Use the mnemonic from storage if it exists, otherwise create
// a new wallet.
async function loadWallet(forceReload: boolean = false) {
    // Prevent duplicate wallet creation unless force reload is requested
    if (ecashWallet && !forceReload) {
        return;
    }

    // If force reloading, reset the existing wallet
    if (forceReload && ecashWallet) {
        ecashWallet = null;
    }

    webViewLog('Loading the wallet...');

    let mnemonic: string | null = null;
    try {
        // Load existing mnemonic from storage
        mnemonic = await loadMnemonic();
    } catch (error) {
        // We failed to load the mnemonic, most likely because the user did not
        // complete the authentication. Close the app.
        webViewLog('Failed to load existing wallet:', error);
        sendMessageToBackend('CLOSE_APP', undefined);
        return;
    }

    // Loading the mnemonic succeeded, but the mnemonic is null. This means that
    // the user does not have a wallet yet. Create a new wallet.
    if (!mnemonic) {
        try {
            webViewLog('Starting wallet creation (first run)...');

            // Generate and store a new mnemonic for first run
            mnemonic = generateMnemonic();
            storeMnemonic(mnemonic);
        } catch (error) {
            webViewError('Failed to create mnemonic:', error);
            return;
        }
    }

    await loadWalletFromMnemonic(mnemonic);
}

// ============================================================================
// PULL-TO-REFRESH FUNCTIONS
// ============================================================================

// Pull-to-refresh functions using PullToRefresh.js library
function initPullToRefresh() {
    PullToRefresh.init({
        mainElement: '.container',
        onRefresh: async () => {
            try {
                await syncWallet();
            } catch (error) {
                webViewError('Failed pull-to-refresh sync:', error);
                throw error;
            }
        },
        shouldPullToRefresh: () => {
            // Only allow pull-to-refresh on the main screen
            return navigation.getCurrentScreen() === Screen.Main;
        },
    });
}

// ============================================================================
// SYNC AND SUBSCRIPTION FUNCTIONS
// ============================================================================

// Subscribe to address notifications via Chronik WebSocket.
// This is where the main wallet update logic happens.
async function subscribeToAddress(address: string) {
    try {
        // Close existing connection if any
        unsubscribeFromAddress();

        // Create WebSocket connection using chronik-client
        wsEndpoint = chronik.ws({
            onConnect: () => {
                webViewLog('Chronik WebSocket connected');
            },
            onReconnect: e => {
                webViewLog('Chronik WebSocket reconnecting:', e);
            },
            onMessage: async msg => {
                if (!('msgType' in msg) || !('txid' in msg)) {
                    webViewError(
                        'No msgType, skipping websocket message:',
                        msg,
                    );
                    return;
                }
                if (!('txid' in msg)) {
                    webViewError('No txid, skipping websocket message:', msg);
                    return;
                }

                if (!transactionManager) {
                    return;
                }

                const txid = msg.txid;

                try {
                    switch (msg.msgType) {
                        case 'TX_ADDED_TO_MEMPOOL': {
                            // The transaction is not finalized yet, show it
                            // in the transitional balance
                            const tx =
                                await transactionManager.addNonFinalTransaction(
                                    txid,
                                );
                            if (!tx) {
                                webViewError(
                                    `Failed to add pending mempool transaction: ${txid}`,
                                );
                                break;
                            }
                            webViewLog(
                                `Added pending transaction: ${satsToXec(
                                    tx.amountSats,
                                )} ${config.ticker} for tx ${txid}`,
                            );
                            break;
                        }
                        case 'TX_CONFIRMED':
                            if (
                                !transactionManager.isPendingTransaction(txid)
                            ) {
                                // If the pending transaction doesn't exist, we
                                // need to figure out if it's been finalized by
                                // pre-consensus or not.
                                // If it's final we have no way to know whether
                                // it's already been accounted for or not (e.g.
                                // we just opened the wallet).
                                // In this case we do nothing and wait for the
                                // block to eventually finalize to resync the
                                // wallet.
                                const chronik_tx = await chronik.tx(txid);
                                if (!chronik_tx.isFinal) {
                                    const tx =
                                        await transactionManager.addNonFinalTransaction(
                                            txid,
                                        );
                                    if (!tx) {
                                        webViewError(
                                            `Failed to add pending confirmed transaction: ${txid}`,
                                        );
                                        break;
                                    }
                                    webViewLog(
                                        `Added pending confirmed transaction: ${satsToXec(
                                            tx.amountSats,
                                        )} ${config.ticker} for tx ${txid}`,
                                    );
                                }
                            }
                            break;
                        case 'TX_FINALIZED':
                            switch (msg.finalizationReasonType) {
                                case 'TX_FINALIZATION_REASON_PRE_CONSENSUS':
                                    await transactionManager.finalizePreConsensus(
                                        txid,
                                    );
                                    // Always trigger haptic feedback for
                                    // pre-consensus finalization
                                    sendMessageToBackend(
                                        'TX_FINALIZED',
                                        undefined,
                                    );
                                    break;
                                case 'TX_FINALIZATION_REASON_POST_CONSENSUS': {
                                    const status =
                                        await transactionManager.finalizePostConsensus(
                                            txid,
                                        );
                                    switch (status) {
                                        case PostConsensusFinalizationResult.NEWLY_FINALIZED:
                                            // Trigger haptic feedback only if the
                                            // transaction was pending
                                            sendMessageToBackend(
                                                'TX_FINALIZED',
                                                undefined,
                                            );
                                            break;
                                        case PostConsensusFinalizationResult.ALREADY_FINALIZED:
                                            // Nothing to do
                                            break;
                                        case PostConsensusFinalizationResult.NOT_PENDING:
                                            // We're lost, resync the wallet
                                            webViewLog(
                                                `Post-consensus finalized transaction ${txid} which is not pending, resyncing the wallet`,
                                            );
                                            await syncWallet();
                                            break;
                                    }
                                    break;
                                }
                                default:
                                    webViewError(
                                        `Unknown finalization reason for ${txid}: `,
                                        msg.finalizationReasonType,
                                    );
                                    break;
                            }
                            break;

                        case 'TX_REMOVED_FROM_MEMPOOL':
                        case 'TX_INVALIDATED':
                            await transactionManager.invalidateTransaction(
                                txid,
                            );
                            webViewLog(
                                `Removed pending transaction: ${txid}, reason: ${msg.msgType}`,
                            );
                            break;
                        default:
                            webViewError(
                                `Unknown message type: ${msg.msgType}`,
                            );
                            break;
                    }
                } catch (error) {
                    webViewError('Failed processing WebSocket message:', error);
                }
            },
        });

        // Wait for WebSocket to be connected
        await wsEndpoint.waitForOpen();

        wsEndpoint.subscribeToAddress(address);
        webViewLog('Subscribed to address notifications for:', address);
    } catch (error) {
        webViewError('Failed to subscribe to address notifications:', error);
    }
}

// Unsubscribe from address notifications
function unsubscribeFromAddress() {
    // Actually unsubscribe from all
    if (wsEndpoint) {
        wsEndpoint.close();
        wsEndpoint = null;
        webViewLog('Unsubscribed from address notifications');
    }
}

// Sync wallet (with finalization for manual sync)
async function syncWallet() {
    webViewLog('Syncing wallet...');

    try {
        // Add timeout to prevent hanging
        const syncPromise = ecashWallet.sync();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
                () =>
                    reject(
                        new Error(
                            'Network timeout - please check your internet connection',
                        ),
                    ),
                30000,
            ),
        );

        await Promise.race([syncPromise, timeoutPromise]);

        if (transactionManager) {
            transactionManager.sync();
        }
    } catch (error) {
        webViewError('Failed to sync wallet:', error);

        // Show user-friendly error message
        if (
            error.message.includes('timeout') ||
            error.message.includes('Network')
        ) {
            webViewError(
                'No internet connection - please check your network and try again',
            );
            showErrorModal(
                'Network Error',
                'No internet connection - please check your network and try again',
            );
        } else if (
            error.message.includes('fetch') ||
            error.message.includes('network')
        ) {
            webViewError('Network error - unable to connect to eCash network');
            showErrorModal(
                'Connection Error',
                'Network error - unable to connect to eCash network',
            );
        } else {
            webViewError('Failed to sync wallet - please try again');
            showErrorModal(
                'Sync Error',
                'Failed to sync wallet - please try again',
            );
        }
    }
}

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

// Initialize the app when DOM is ready
async function initializeApp() {
    webViewLog('Initializing app...');

    // Detect if running in standalone web browser (not in mobile WebView)
    // In mobile app, the WebView has transparent background and shows React Native gradient
    // In standalone web, we need to apply a CSS gradient background
    if (!isReactNativeWebView()) {
        document.body.classList.add('standalone-web');
    }

    // Initialize navigation
    navigation = new Navigation();

    // Load saved settings
    appSettings = loadSettings();

    // Initialize ticker symbols in HTML
    const tickerElements = [
        'ticker-balance',
        'ticker-label',
        'ticker-slider-min',
        'ticker-slider-max',
    ];
    for (const elementId of tickerElements) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = config.ticker;
        }
    }

    // Set the back arrow icons
    for (const iconEl of document.querySelectorAll('.back-arrow-icon')) {
        (iconEl as HTMLImageElement).src = backArrowIcon;
    }

    // Set the PayButton logo source
    const paybuttonLogoEl = document.getElementById(
        'paybutton-logo',
    ) as HTMLImageElement;
    if (paybuttonLogoEl) {
        paybuttonLogoEl.src = paybuttonLogo;
    }

    // Set the eCash logo source
    const logoEl = document.getElementById('marlin-logo') as HTMLImageElement;
    if (logoEl) {
        logoEl.src = marlin;
    }
    // Set the edit icon source
    const editIconEl = document.getElementById('edit-icon') as HTMLImageElement;
    if (editIconEl) {
        editIconEl.src = editIcon;
    }

    // Set the history icon source
    const historyIconEl = document.getElementById(
        'history-icon',
    ) as HTMLImageElement;
    if (historyIconEl) {
        historyIconEl.src = historyIcon;
    }

    // Set the no camera icon source
    const noCameraIconEl = document.getElementById(
        'no-camera-icon',
    ) as HTMLImageElement;
    if (noCameraIconEl) {
        noCameraIconEl.src = noCameraIcon;
    }

    // Set the QR code icon source
    const qrIconEl = document.getElementById('qr-icon') as HTMLImageElement;
    if (qrIconEl) {
        qrIconEl.src = qrCodeIcon;
    }

    // Set the settings icon source
    const settingsIconEl = document.getElementById(
        'settings-icon',
    ) as HTMLImageElement;
    if (settingsIconEl) {
        settingsIconEl.src = settingsIcon;
    }

    // Initialize pull-to-refresh
    initPullToRefresh();

    // Always require authentication on app launch (for security)
    // Show loading screen with an opaque background for better privacy: we want
    // to avoid anybody seeing the content of the wallet before the
    // authentication is complete.
    showLoadingScreen('Authentication required');

    chronik = await ChronikClient.useStrategy(
        ConnectionStrategy.ClosestFirst,
        config.chronikUrls,
    );

    // Initialize price API with CoinGecko provider
    // Cache prices for 60 seconds to reduce API calls
    priceFetcher = new XECPrice(
        [new CoinGeckoProvider()],
        ProviderStrategy.FALLBACK,
        60 * 1000,
    );

    try {
        await loadWallet();
    } catch (error) {
        webViewError('Failed to load the wallet:', error);
        sendMessageToBackend('CLOSE_APP', undefined);
        return;
    }

    // At this point the wallet is loaded

    mainScreen = new MainScreen({
        ecashWallet,
        navigation,
        appSettings,
        priceFetcher,
        onQRScanResult: async result => {
            if (sendScreen) {
                await sendScreen.show(result);
            }
        },
    });

    // Initialize TransactionManager
    transactionManager = new TransactionManager({
        ecashWallet,
        chronik,
        onBalanceChange: async (
            fromAvailableBalanceSats: number,
            toAvailableBalanceSats: number,
            transitionalBalanceSats: number,
        ) => {
            if (!mainScreen) {
                return;
            }

            const pricePerXec = await priceFetcher?.current(
                appSettings.fiatCurrency,
            );

            mainScreen.updateTransitionalBalance(
                transitionalBalanceSats,
                pricePerXec,
            );

            const fromXec = satsToXec(fromAvailableBalanceSats);
            const toXec = satsToXec(toAvailableBalanceSats);
            mainScreen.updateAvailableBalanceDisplay(
                fromXec,
                toXec,
                pricePerXec,
                fromXec !== toXec,
            );
        },
    });

    historyScreen = new HistoryScreen({
        transactionHistory,
        navigation,
    });

    settingsScreen = new SettingsScreen({
        appSettings,
        wallet,
        navigation,
    });

    // Register callbacks
    settingsScreen.onPrimaryBalanceChange(async () => {
        // Refresh balance display with new primary/secondary order
        if (ecashWallet && mainScreen && transactionManager) {
            const currentXec = satsToXec(
                transactionManager.getAvailableBalanceSats(),
            );
            mainScreen.updateAvailableBalanceDisplay(
                currentXec,
                currentXec,
                await priceFetcher?.current(appSettings.fiatCurrency),
                false,
            );
        }
    });

    settingsScreen.onFiatCurrencyChange(async () => {
        // Refresh balance display with new fiat currency
        if (ecashWallet && mainScreen && transactionManager) {
            const currentXec = satsToXec(
                transactionManager.getAvailableBalanceSats(),
            );
            mainScreen.updateAvailableBalanceDisplay(
                currentXec,
                currentXec,
                await priceFetcher?.current(appSettings.fiatCurrency),
                false,
            );
        }
    });

    settingsScreen.onMnemonicSaved(async (mnemonic: string) => {
        // Reload the wallet with the new mnemonic
        webViewLog('Reloading wallet with new mnemonic...');
        await loadWalletFromMnemonic(mnemonic);
    });

    sendScreen = new SendScreen({
        ecashWallet,
        navigation,
        appSettings,
        priceFetcher,
        syncWallet,
    });

    // Update main screen display if wallet is already loaded
    if (ecashWallet && mainScreen && transactionManager) {
        await mainScreen.updateWallet(
            ecashWallet,
            transactionManager.getAvailableBalanceSats(),
            transactionManager.getTransitionalBalanceSats(),
        );
    }

    // Add click listeners for Send screen
    const backBtn = document.getElementById('back-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            navigation.showScreen(Screen.Main);
        });
    }

    // Hide loading screen on success
    hideLoadingScreen();
}

// Listen for payment requests from React Native
async function handlePaymentRequest(event: any) {
    try {
        const message = JSON.parse(event.data);

        if (message.type === 'PAYMENT_REQUEST') {
            const { bip21Uri, returnToBrowser } = paybuttonDeepLinkToBip21Uri(
                message.data,
            );

            // Parse the BIP21 URI
            const parsed = parseBip21Uri(bip21Uri);
            if (parsed && sendScreen) {
                // Open send screen with prefilled address and amount
                await sendScreen.show(parsed, returnToBrowser);
            } else {
                webViewError('Invalid BIP21 URI:', bip21Uri);
            }
        } else if (message.type === 'SYNC_WALLET') {
            // Sync wallet and reconnect WebSocket when app comes to foreground
            webViewLog('Received sync request from app foreground');
            if (ecashWallet) {
                // Sync wallet first to update balance
                await syncWallet();
                // Then reconnect WebSocket and resubscribe to address
                const address = getAddress(ecashWallet);
                if (address) {
                    await subscribeToAddress(address);
                }
            }
        }
    } catch {
        // Ignore parse errors from non-JSON messages
    }
}

document.addEventListener('message', handlePaymentRequest);
window.addEventListener('message', handlePaymentRequest);

// Add click listener to address element
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready
    initializeApp();
}

// Cleanup WebSocket connection when page is unloaded
window.addEventListener('beforeunload', () => {
    unsubscribeFromAddress();
});
