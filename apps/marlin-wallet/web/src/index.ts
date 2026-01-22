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
    formatPrice,
    ProviderStrategy,
} from 'ecash-price';
import PullToRefresh from 'pulltorefreshjs';
import { TransactionHistoryManager } from './transaction-history';
import {
    sendMessageToBackend,
    webViewLog,
    webViewError,
    isReactNativeWebView,
} from './common';
import { calculateTransactionAmountSats, satsToXec } from './amount';
import { getAddress, WalletData } from './wallet';
import { storeMnemonic, loadMnemonic, generateMnemonic } from './mnemonic';
import { copyAddress, isValidECashAddress } from './address';
import {
    generateQRCode,
    hideNoCameraFallback,
    stopQRScanner,
    startQRScanner,
} from './qrcode';
import { config } from './config';
import { parseBip21Uri, createBip21Uri } from './bip21';
import { AppSettings, loadSettings } from './settings';
import { Navigation, Screen } from './navigation';
import { SettingsScreen } from './screen/settings';
import { HistoryScreen } from './screen/history';
import { SendScreen } from './screen/send';

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

// Transaction state interface
interface PendingTransaction {
    // Positive = receive, negative = send, 0 = receive (in satoshis)
    amountSats: number;
    state: 'pending_finalization' | 'finalized';
}

// Navigation instance
let navigation: Navigation;

// Wallet state
let wallet: WalletData | null = null;
let ecashWallet: Wallet | null = null;
let wsEndpoint: any = null;

let chronik: ChronikClient;

// Balance state - separate available and transitional (not finalized yet)
// balances (in satoshis)
let availableBalanceSats = 0; // Only finalized amounts in satoshis
let transitionalBalanceSats = 0; // Only non finalized amounts in satoshis

// Price API instance for fetching real-time XEC prices
let priceFetcher: XECPrice | null = null;

// Pending transactions - transactions that are not yet finalized
let pendingAmounts: { [txid: string]: PendingTransaction } = {};

// Create global instance of TransactionHistoryManager
let transactionHistory: TransactionHistoryManager | null = null;

// Create global instance of SettingsScreen
let settingsScreen: SettingsScreen | null = null;

// Create global instance of HistoryScreen
let historyScreen: HistoryScreen | null = null;

// Create global instance of SendScreen
let sendScreen: SendScreen | null = null;

// Settings state
let appSettings: AppSettings = {
    requireHoldToSend: true,
    primaryBalanceType: 'XEC',
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

// These are required for the webview html button bindings
(window as any).openHistory = () => {
    if (historyScreen) {
        historyScreen.show();
    }
};
(window as any).openSettings = () => navigation.showScreen(Screen.Settings);

// ============================================================================
// WALLET MANAGEMENT FUNCTIONS
// ============================================================================

// Update NFC address for tag emulation (BIP21 URI)
// amountSats is optional - if provided, it will be included in the BIP21 URI
function updateNfcAddress(amountSats?: number) {
    if (!ecashWallet) {
        return;
    }

    const address = getAddress(ecashWallet);
    if (!address) {
        return;
    }

    // Create BIP21 URI using the bip21 module
    const bip21Uri = createBip21Uri(address, amountSats);

    // Send the complete BIP21 URI to native app for NFC HCE
    sendMessageToBackend('SET_NFC_URI', bip21Uri);
}

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
            syncWallet,
        });
    }

    // Update displays
    const pricePerXec = await priceFetcher?.current(Fiat.USD);
    updateWalletDisplay(pricePerXec);
    updateTransitionalBalance(pricePerXec);
    generateQRCode(address);

    subscribeToAddress(address);

    // Update NFC address for tag emulation
    updateNfcAddress();

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

// Update wallet display (address and balance)
function updateWalletDisplay(pricePerXec: number | null) {
    if (!wallet) {
        webViewError('No wallet data, cannnot update the display');
        return;
    }

    const address = getAddress(ecashWallet);
    if (!address) {
        webViewError('No address, cannot update the display');
        return;
    }

    const addressEl = document.getElementById('address') as HTMLElement;
    if (addressEl) {
        addressEl.textContent = address;
    } else {
        webViewError('addressEl not found, cannot update address display');
    }

    // Update balance display, no animation
    updateAvailableBalanceDisplay(
        0,
        satsToXec(availableBalanceSats),
        pricePerXec,
        false,
    );
}

// ============================================================================
// BALANCE AND TRANSACTION MANAGEMENT FUNCTIONS
// ============================================================================

// Add pending transaction amount
async function addPendingAmount(
    txid: string,
    state: 'pending_finalization' | 'finalized',
) {
    if (pendingAmounts[txid]) {
        webViewLog(
            `Transaction ${txid} already exists in pending amounts, ignoring duplicate`,
        );
        return false;
    }

    const txAmountSats = await calculateTransactionAmountSats(
        ecashWallet,
        chronik,
        txid,
    );
    if (txAmountSats == 0) {
        webViewLog(`Transaction ${txid} has no amount, ignoring`);
        return false;
    }

    pendingAmounts[txid] = {
        amountSats: txAmountSats,
        state,
    };
    webViewLog(
        `Added pending transaction ${txid}: ${satsToXec(txAmountSats)} ${
            config.ticker
        } (${txAmountSats} sats, state: ${state})`,
    );

    return pendingAmounts[txid];
}

async function finalizeTransaction(amountSats: number) {
    const fromXec = satsToXec(availableBalanceSats);
    availableBalanceSats += amountSats;
    const toXec = satsToXec(availableBalanceSats);

    const pricePerXec = await priceFetcher?.current(Fiat.USD);

    updateTransitionalBalance(pricePerXec);
    updateAvailableBalanceDisplay(fromXec, toXec, pricePerXec, true); // Animate when finalizing transactions
    triggerShakeAnimation();

    // Trigger haptic feedback for transaction finalization
    sendMessageToBackend('TX_FINALIZED', undefined);
}

async function finalizePreConsensus(txid: string) {
    let tx;
    if (pendingAmounts[txid]) {
        // We already have the transaction in our pending amounts, so we can
        // just update the state
        tx = pendingAmounts[txid];
        tx.state = 'finalized';
    } else {
        const pending_tx = await addPendingAmount(txid, 'finalized');
        if (!pending_tx) {
            return;
        }
        tx = pending_tx;
    }

    finalizeTransaction(tx.amountSats);
    webViewLog(
        `Pre-consensus finalized transaction ${txid}: ${satsToXec(
            tx.amountSats,
        )} ${config.ticker} moved to available balance, state set to finalized`,
    );
}

async function finalizePostConsensus(txid: string) {
    if (!pendingAmounts[txid]) {
        // We're lost, just resync
        webViewLog(
            `Post-consensus finalized transaction ${txid} but it's not pending, resyncing`,
        );
        await syncWallet();
        return;
    }

    const tx = pendingAmounts[txid];

    if (tx.state === 'pending_finalization') {
        finalizeTransaction(tx.amountSats);
        webViewLog(
            `Post-consensus finalized transaction ${txid} which is pending finalization, moving to available balance`,
        );
    }

    // We won't get any message for this transaction anymore
    delete pendingAmounts[txid];
}

// Update transitional balance display
function updateTransitionalBalance(pricePerXec: number | null) {
    // Calculate total pending amounts
    transitionalBalanceSats = 0;

    for (const tx of Object.values(pendingAmounts).filter(
        tx => tx.state === 'pending_finalization',
    )) {
        // Amount sign determines type: positive = receive, negative = send, 0 = receive
        transitionalBalanceSats += tx.amountSats;
    }

    webViewLog(
        'Updated transitional balance:',
        satsToXec(transitionalBalanceSats),
        config.ticker,
        '(',
        transitionalBalanceSats,
        'sats)',
    );

    // Update transitional balance display
    const transitionalBalanceEl = document.getElementById(
        'transitional-balance',
    ) as HTMLElement;
    if (transitionalBalanceEl) {
        if (transitionalBalanceSats !== 0) {
            const sign = transitionalBalanceSats > 0 ? '+' : '';
            const type = transitionalBalanceSats > 0 ? 'receive' : 'spend';
            const transitionalXec = satsToXec(transitionalBalanceSats);

            const displayText =
                appSettings.primaryBalanceType === 'Fiat' &&
                pricePerXec !== null
                    ? `${sign}${formatPrice(transitionalXec * pricePerXec, Fiat.USD)}`
                    : `${sign}${transitionalXec.toFixed(2)} ${config.ticker}`;

            transitionalBalanceEl.textContent = displayText;
            transitionalBalanceEl.className = `transitional-balance ${type}`;
            transitionalBalanceEl.classList.remove('hidden');
        } else {
            transitionalBalanceEl.classList.add('hidden');
        }
    } else {
        webViewError(
            'transitionalBalanceEl not found, cannot update transitional balance display',
        );
    }
}

// Update available balance display with optional animation
function updateAvailableBalanceDisplay(
    fromXec: number,
    toXec: number,
    pricePerXec: number | null,
    animate: boolean = true,
) {
    webViewLog(
        `Available balance updated from ${fromXec} ${config.ticker} to ${toXec} ${config.ticker}`,
    );

    updateBalanceElement({
        elementId: 'primary-balance',
        fromXec,
        toXec,
        // If primary balance type is XEC or price is not available, show as
        // XEC, otherwise show as Fiat
        pricePerXec:
            appSettings.primaryBalanceType === 'XEC' ? null : pricePerXec,
        animate,
    });
    updateBalanceElement({
        elementId: 'secondary-balance',
        fromXec,
        // If price is not available, hide the secondary balance element
        toXec: pricePerXec === null ? null : toXec,
        // If primary balance type is XEC show as Fiat, otherwise show as XEC
        pricePerXec:
            appSettings.primaryBalanceType === 'XEC' ? pricePerXec : null,
        animate,
    });
}

interface UpdateBalanceElementParams {
    elementId: string;
    fromXec: number;
    // null means hide the balance element
    toXec: number | null;
    // null means show as XEC, otherwise show as Fiat
    pricePerXec: number | null;
    animate: boolean;
}

function updateBalanceElement(params: UpdateBalanceElementParams) {
    const { elementId, fromXec, toXec, pricePerXec, animate } = params;
    const balanceEl = document.getElementById(elementId) as HTMLElement;

    if (balanceEl) {
        // If toXec is null, hide the balance element
        if (toXec === null) {
            balanceEl.textContent = '';
            return;
        }

        // If pricePerXec is null show as XEC, otherwise show as Fiat
        const fromValue =
            pricePerXec === null ? fromXec : fromXec * pricePerXec;
        const toValue = pricePerXec === null ? toXec : toXec * pricePerXec;
        const formatValue =
            pricePerXec === null
                ? (value: number) => {
                      return `${value.toFixed(2)} ${config.ticker}`;
                  }
                : (value: number) => {
                      return formatPrice(value, Fiat.USD);
                  };

        if (animate) {
            animateBalanceChange(balanceEl, fromValue, toValue, formatValue);
        } else {
            balanceEl.textContent = formatValue(toValue);
        }
    } else {
        webViewError(`${elementId} not found, cannot update balance display`);
    }
}

// Animate balance change with counting effect
// formatValue: function to format the numeric value for display
// startValue: starting value for the animation
function animateBalanceChange(
    balanceEl: HTMLElement,
    startValue: number,
    targetBalance: number,
    formatValue: (value: number) => string,
) {
    const difference = targetBalance - startValue;
    const duration = 1000; // 1 second animation
    const startTime = Date.now();

    // Add highlight effect for balance changes
    if (Math.abs(difference) > 0.01) {
        // Only highlight if there's a meaningful change
        balanceEl.style.transition = 'all 0.3s ease';
        balanceEl.style.transform = 'scale(1.05)';
        balanceEl.style.color = difference > 0 ? '#4ade80' : '#f87171'; // Green for increase, red for decrease

        setTimeout(() => {
            balanceEl.style.transform = 'scale(1)';
            balanceEl.style.color = '';
        }, 300);
    }

    function updateBalance() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Use easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentBalance = startValue + difference * easeOutCubic;

        balanceEl.textContent = formatValue(currentBalance);

        if (progress < 1) {
            requestAnimationFrame(updateBalance);
        } else {
            // Reset color after animation completes
            setTimeout(() => {
                balanceEl.style.color = '';
            }, 200);
        }
    }

    requestAnimationFrame(updateBalance);
}

// Trigger shake animation
function triggerShakeAnimation() {
    const transitionalBalanceEl = document.getElementById(
        'transitional-balance',
    ) as HTMLElement;
    if (transitionalBalanceEl) {
        transitionalBalanceEl.classList.add('shake');
        setTimeout(() => {
            transitionalBalanceEl.classList.remove('shake');
        }, 500);
    } else {
        webViewError(
            'transitionalBalanceEl not found, cannot trigger shake animation',
        );
    }
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
// QR SCANNER FUNCTIONS
// ============================================================================

function handleScanButtonClick() {
    stopQRScanner();
    startQRScanner(handleQRScanResult);
}

function handleCloseCamera() {
    stopQRScanner(true); // Force close the modal
    hideNoCameraFallback();
}

async function handleQRScanResult(result: string) {
    if (!sendScreen) {
        webViewError('Send screen not initialized');
        return;
    }

    // First, try to parse as BIP21 URI
    const bip21Result = parseBip21Uri(result);

    if (bip21Result) {
        webViewLog('BIP21 URI scanned:', result);
        stopQRScanner();
        await sendScreen.show(bip21Result);
        return;
    }

    // Fallback: validate if the scanned data is a plain valid eCash address
    if (isValidECashAddress(result)) {
        webViewLog('eCash address scanned:', result);
        stopQRScanner();
        await sendScreen.show({
            address: result,
        });
    }
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

                const txid = msg.txid;

                try {
                    switch (msg.msgType) {
                        case 'TX_ADDED_TO_MEMPOOL': {
                            // The transaction is not finalized yet, show it
                            // in the transitional balance
                            const tx = await addPendingAmount(
                                txid,
                                'pending_finalization',
                            );
                            if (!tx) {
                                webViewError(
                                    `Failed to add pending mempool transaction: ${txid}`,
                                );
                                break;
                            }
                            updateTransitionalBalance(
                                await priceFetcher?.current(Fiat.USD),
                            );
                            triggerShakeAnimation();
                            webViewLog(
                                `Added pending transaction: ${satsToXec(
                                    tx.amountSats,
                                )} ${config.ticker} for tx ${txid}`,
                            );
                            break;
                        }
                        case 'TX_CONFIRMED':
                            if (pendingAmounts[txid]) {
                                // This is the most common scenario
                                webViewLog(
                                    `Confirmed transaction ${txid} is already pending with state ${pendingAmounts[txid].state}, skipping`,
                                );
                            } else {
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
                                    const tx = await addPendingAmount(
                                        txid,
                                        'pending_finalization',
                                    );
                                    if (!tx) {
                                        webViewError(
                                            `Failed to add pending confirmed transaction: ${txid}`,
                                        );
                                        break;
                                    }
                                    updateTransitionalBalance(
                                        await priceFetcher?.current(Fiat.USD),
                                    );
                                    triggerShakeAnimation();
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
                                    finalizePreConsensus(txid);
                                    break;
                                case 'TX_FINALIZATION_REASON_POST_CONSENSUS':
                                    finalizePostConsensus(txid);
                                    break;
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
                            delete pendingAmounts[txid];
                            updateTransitionalBalance(
                                await priceFetcher?.current(Fiat.USD),
                            );
                            triggerShakeAnimation();
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

        const spendableUtxos = ecashWallet.spendableSatsOnlyUtxos();
        const finalUtxos = spendableUtxos.filter(utxo => utxo.isFinal);

        availableBalanceSats = Number(
            finalUtxos.reduce((sum, utxo) => sum + utxo.sats, 0n),
        );

        // Clear all pending transactions. They will be re-added as needed if we
        // get a message for them.
        pendingAmounts = {};
        transitionalBalanceSats = 0;

        // Update the display
        updateAvailableBalanceDisplay(
            0,
            satsToXec(availableBalanceSats),
            await priceFetcher?.current(Fiat.USD),
            false,
        );
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
        if (ecashWallet) {
            const currentXec = satsToXec(availableBalanceSats);
            await updateAvailableBalanceDisplay(
                currentXec,
                currentXec,
                await priceFetcher?.current(Fiat.USD),
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
        syncWallet,
    });

    // Hide loading screen on success
    hideLoadingScreen();

    // Add click listener to address element for copying
    const addressEl = document.getElementById('address') as HTMLElement;
    if (addressEl) {
        addressEl.addEventListener('click', () => copyAddress(ecashWallet));
    } else {
        webViewLog(
            'Error: addressEl not found, cannot add click listener for copying address',
        );
    }

    // Add click listeners for QR scanner
    const scanBtn = document.getElementById('scan-btn');
    const closeCameraBtn = document.getElementById('close-camera');

    if (scanBtn) {
        scanBtn.addEventListener('click', handleScanButtonClick);
    }

    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', handleCloseCamera);
    }

    // Add click listener for manual entry button
    const manualEntryBtn = document.getElementById('manual-entry-btn');
    if (manualEntryBtn) {
        manualEntryBtn.addEventListener('click', async () => {
            if (sendScreen) {
                stopQRScanner(true); // Force close the modal
                hideNoCameraFallback();
                await sendScreen.show();
            }
        });
    }

    // Add click listeners for Send screen
    const backBtn = document.getElementById('back-btn');
    const cancelSendBtn = document.getElementById('cancel-send');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            navigation.showScreen(Screen.Main);
        });
    }

    if (cancelSendBtn) {
        cancelSendBtn.addEventListener('click', () => {
            navigation.showScreen(Screen.Main);
        });
    }

    // Ensure camera modal starts hidden
    const cameraModal = document.getElementById('camera-modal');
    if (cameraModal) {
        cameraModal.classList.add('hidden');
        webViewLog('Camera modal initialized as hidden');
    }
}

// Listen for payment requests from React Native
async function handlePaymentRequest(event: any) {
    try {
        const message = JSON.parse(event.data);

        if (message.type === 'PAYMENT_REQUEST') {
            const bip21Uri = message.data;

            // Parse the BIP21 URI
            const parsed = parseBip21Uri(bip21Uri);
            if (parsed && sendScreen) {
                // Open send screen with prefilled address and amount
                await sendScreen.show(parsed);
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
