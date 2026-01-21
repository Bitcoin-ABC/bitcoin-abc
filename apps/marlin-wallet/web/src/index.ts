// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// ============================================================================
// IMPORTS
// ============================================================================

import { Wallet } from 'ecash-wallet';
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { DEFAULT_DUST_SATS } from 'ecash-lib';
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
import {
    calculateTransactionAmountSats,
    satsToXec,
    calculateMaxSpendableAmount,
    estimateTransactionFee,
} from './amount';
import { getAddress, WalletData, buildAction } from './wallet';
import {
    getMnemonic,
    storeMnemonic,
    loadMnemonic,
    generateMnemonic,
    validateMnemonic,
} from './mnemonic';
import { copyAddress, isValidECashAddress } from './address';
import {
    generateQRCode,
    hideNoCameraFallback,
    stopQRScanner,
    startQRScanner,
} from './qrcode';
import { config } from './config';
import { parseBip21Uri, createBip21Uri } from './bip21';
import { isPayButtonTransaction } from './paybutton';
import { AppSettings, loadSettings, saveSettings } from './settings';

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

// Get DOM elements
const mainScreen = document.getElementById('main-screen') as HTMLElement;
const sendScreen = document.getElementById('send-screen') as HTMLElement;
const settingsScreen = document.getElementById(
    'settings-screen',
) as HTMLElement;
const historyScreen = document.getElementById('history-screen') as HTMLElement;

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

// Settings state
let appSettings: AppSettings = {
    requireHoldToSend: true,
    primaryBalanceType: 'XEC',
};

// OP_RETURN data for the current send transaction (for PayButton support)
let sendOpReturnRaw: string | undefined = undefined;

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

function showMainScreen() {
    if (mainScreen) {
        mainScreen.classList.remove('hidden');
    }
    if (sendScreen) {
        sendScreen.classList.add('hidden');
    }
    if (settingsScreen) {
        settingsScreen.classList.add('hidden');
    }
    if (historyScreen) {
        historyScreen.classList.add('hidden');
    }

    // Reset the recipient address field to readonly for QR scans
    const recipientAddressInput = document.getElementById(
        'recipient-address',
    ) as HTMLInputElement;
    if (recipientAddressInput) {
        recipientAddressInput.setAttribute('readonly', 'readonly');
    }
}

async function showSendScreen() {
    // Always refresh the available utxos before showing the send screen
    await syncWallet();

    if (mainScreen) {
        mainScreen.classList.add('hidden');
    }
    if (sendScreen) {
        sendScreen.classList.remove('hidden');
    }

    // Reset all form fields and validation states
    const recipientInput = document.getElementById(
        'recipient-address',
    ) as HTMLInputElement;
    const sendAmountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    const amountSlider = document.getElementById(
        'amount-slider',
    ) as HTMLInputElement;
    const feeDisplay = document.getElementById('fee-display');

    // Clear recipient address field and validation states
    if (recipientInput) {
        recipientInput.value = '';
        recipientInput.classList.remove('valid', 'invalid');
        recipientInput.removeAttribute('readonly'); // Allow editing for manual entry
    }

    // Reset amount field and validation states
    if (sendAmountInput) {
        sendAmountInput.value = '5.46'; // Prefill with minimum valid amount
        sendAmountInput.classList.remove('valid', 'invalid');
        sendAmountInput.removeAttribute('readonly'); // Allow editing for manual entry
    }

    // Reset slider
    if (amountSlider) {
        amountSlider.value = '5.46';
        amountSlider.disabled = false; // Enable slider for manual entry
    }

    // Clear opReturnRaw when resetting the screen
    sendOpReturnRaw = undefined;

    // Hide PayButton logo
    updatePayButtonLogoVisibility();

    // Hide fee display
    if (feeDisplay) {
        feeDisplay.style.display = 'none';
    }

    // Re-setup send button behavior based on current setting
    const confirmSendBtn = document.getElementById(
        'confirm-send',
    ) as HTMLButtonElement;
    if (confirmSendBtn) {
        // Remove all existing event listeners by cloning and replacing
        const newButton = confirmSendBtn.cloneNode(true) as HTMLButtonElement;
        confirmSendBtn.parentNode?.replaceChild(newButton, confirmSendBtn);

        // Setup with current behavior
        setupHoldToSend(newButton);
    }

    // Update send screen limits based on current wallet state
    updateSendScreenLimits();

    // Validate amount field after reset
    validateAmountField();

    // Initialize slider and marks
    updateSliderFromInput();
    const maxSpendable = calculateMaxSpendableAmount(ecashWallet);
    updateSliderMarks(5.46, maxSpendable);
}

async function openSendScreenWithAddress(
    address: string,
    sats?: number,
    opReturnRaw?: string,
) {
    // First show the send screen (this will reset everything)
    await showSendScreen();

    // Store opReturnRaw for use when sending transaction, only for paybutton transactions
    sendOpReturnRaw =
        opReturnRaw && isPayButtonTransaction(opReturnRaw)
            ? opReturnRaw
            : undefined;
    updatePayButtonLogoVisibility();

    // Then set the address and make it readonly
    const recipientAddressInput = document.getElementById(
        'recipient-address',
    ) as HTMLInputElement;
    if (recipientAddressInput) {
        // Set readonly BEFORE setting value to prevent input event from triggering BIP21 parsing
        recipientAddressInput.setAttribute('readonly', 'readonly');
        recipientAddressInput.value = address;
        // Mark as valid (we already validated it before calling this function)
        recipientAddressInput.classList.add('valid');
    }

    // If an amount was provided (in satoshis), convert to XEC and set it
    if (sats !== undefined && sats > 0) {
        const sendAmountInput = document.getElementById(
            'send-amount',
        ) as HTMLInputElement;
        const amountSlider = document.getElementById(
            'amount-slider',
        ) as HTMLInputElement;

        // Convert satoshis to XEC for display
        const amountXec = satsToXec(sats);

        if (sendAmountInput) {
            // Format to 2 decimal places
            sendAmountInput.value = amountXec.toFixed(2);
            // Make amount field readonly when amount is provided from BIP21 URI
            sendAmountInput.setAttribute('readonly', 'readonly');
            // Validate the amount
            validateAmountField();
        }

        if (amountSlider) {
            amountSlider.value = amountXec.toString();
            // Disable slider when amount is provided from BIP21 URI
            amountSlider.disabled = true;
        }
    }

    // Trigger fee calculation since address is now valid
    updateFeeDisplay();
}

async function openSendScreenForManualEntry() {
    stopQRScanner(true); // Force close the modal
    hideNoCameraFallback();
    // First show the send screen (this will reset everything)
    await showSendScreen();

    // The form is already reset by showSendScreen(), no additional action needed
    // The address field is already cleared and editable
}

// Open transaction in block explorer
function openTransactionInExplorer(txid: string) {
    const explorerUrl = config.explorerUrl + txid;

    // On mobile (iOS/Android WebView), send message to native layer to open in system browser
    // On web, use window.open
    if (!sendMessageToBackend('OPEN_URL', explorerUrl)) {
        window.open(explorerUrl, '_blank');
    }
}

// History screen functions
function showHistoryScreen() {
    if (mainScreen) {
        mainScreen.classList.add('hidden');
    }
    if (sendScreen) {
        sendScreen.classList.add('hidden');
    }
    if (settingsScreen) {
        settingsScreen.classList.add('hidden');
    }
    if (historyScreen) {
        historyScreen.classList.remove('hidden');
    }

    // Load transaction history when showing the screen (reset to first page)
    const address = getAddress(ecashWallet);
    if (address) {
        transactionHistory.loadTransactionHistory(true);
    }

    // Setup scroll detection for infinite loading and click handlers for transaction IDs
    setTimeout(() => {
        const transactionList = document.getElementById('transaction-list');
        if (transactionList) {
            transactionList.addEventListener('scroll', () =>
                transactionHistory.handleScroll(),
            );

            // Event delegation for transaction ID clicks
            transactionList.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('transaction-txid')) {
                    const txid = target.getAttribute('data-txid');
                    if (txid) {
                        openTransactionInExplorer(txid);
                    }
                }
            });
        }
    }, 100); // Small delay to ensure DOM is ready
}

// Settings screen functions
function showSettingsScreen() {
    if (mainScreen) {
        mainScreen.classList.add('hidden');
    }
    if (sendScreen) {
        sendScreen.classList.add('hidden');
    }
    if (settingsScreen) {
        settingsScreen.classList.remove('hidden');
    }
    if (historyScreen) {
        historyScreen.classList.add('hidden');
    }

    // Always update the mnemonic display when showing settings
    updateMnemonicDisplay();
}

// These are required for the webview html button bindings
(window as any).openHistory = showHistoryScreen;
(window as any).openSettings = showSettingsScreen;

// ============================================================================
// SEND SCREEN FUNCTIONS
// ============================================================================

// Validate address field and update UI
function validateAddressField() {
    const recipientInput = document.getElementById(
        'recipient-address',
    ) as HTMLInputElement;
    if (!recipientInput) {
        return;
    }

    const input = recipientInput.value.trim();

    // Clear previous validation states
    recipientInput.classList.remove('invalid');
    recipientInput.classList.remove('valid');

    if (input === '') {
        // Empty field - no validation state
        return;
    }

    // Try to parse as BIP21 URI first (this also handles plain addresses)
    const bip21Result = parseBip21Uri(input);
    if (bip21Result) {
        // Valid BIP21 URI or plain address
        // If field is readonly (set programmatically from QR/NFC), only validate the address
        // If field is editable (user paste), populate all fields from the URI
        if (recipientInput.hasAttribute('readonly')) {
            // Just mark as valid, don't populate (already set by QR/NFC scan)
            recipientInput.classList.add('valid');
            return;
        }

        // User pasted a BIP21 URI - populate all fields
        handleBip21Paste(bip21Result);
        return;
    }

    // Otherwise validate as a plain address.
    // This is only used for testnet where then BIP21 prefix differs from the address prefix.
    // This implies that a valid address is also a valid BIP21 URI.
    if (isValidECashAddress(input)) {
        recipientInput.classList.add('valid');
        return;
    }

    recipientInput.classList.add('invalid');
}

function handleBip21Paste(bip21Result: ReturnType<typeof parseBip21Uri>) {
    if (!bip21Result) {
        return;
    }

    const recipientInput = document.getElementById(
        'recipient-address',
    ) as HTMLInputElement;
    const sendAmountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    const amountSlider = document.getElementById(
        'amount-slider',
    ) as HTMLInputElement;

    // Set the address (plain address, not the full URI)
    if (recipientInput) {
        recipientInput.value = bip21Result.address;
        recipientInput.setAttribute('readonly', 'readonly');
        recipientInput.classList.add('valid');
    }

    // Store opReturnRaw for use when sending transaction, only for paybutton transactions
    sendOpReturnRaw =
        bip21Result.opReturnRaw &&
        isPayButtonTransaction(bip21Result.opReturnRaw)
            ? bip21Result.opReturnRaw
            : undefined;
    updatePayButtonLogoVisibility();

    // Set amount if provided
    if (
        bip21Result.sats !== undefined &&
        bip21Result.sats >= DEFAULT_DUST_SATS
    ) {
        const amountXec = satsToXec(bip21Result.sats);

        if (sendAmountInput) {
            sendAmountInput.value = amountXec.toFixed(2);
            sendAmountInput.setAttribute('readonly', 'readonly');
            validateAmountField();
        }

        if (amountSlider) {
            amountSlider.value = amountXec.toString();
            amountSlider.disabled = true;
        }
    }

    // Trigger fee calculation
    updateFeeDisplay();
}

// Update send screen with maximum spendable amount
function updateSendScreenLimits() {
    const maxSpendable = calculateMaxSpendableAmount(ecashWallet);

    // Update amount input max attribute
    const amountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    if (amountInput) {
        amountInput.max = maxSpendable.toString();
    }

    // Update slider max value and label
    const amountSlider = document.getElementById(
        'amount-slider',
    ) as HTMLInputElement;
    if (amountSlider) {
        amountSlider.max = maxSpendable.toString();
    }

    // Update slider max label
    const sliderMaxLabel = document.getElementById('slider-max-label');
    if (sliderMaxLabel) {
        sliderMaxLabel.textContent = `${maxSpendable.toFixed(2)} ${
            config.ticker
        }`;
    }
}

// Update fee display
function updatePayButtonLogoVisibility() {
    const logoContainer = document.getElementById('paybutton-logo-container');
    if (logoContainer) {
        if (sendOpReturnRaw && isPayButtonTransaction(sendOpReturnRaw)) {
            logoContainer.style.display = 'flex';
        } else {
            logoContainer.style.display = 'none';
        }
    }
}

function updateFeeDisplay() {
    const recipientInput = document.getElementById(
        'recipient-address',
    ) as HTMLInputElement;
    const amountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    const feeDisplay = document.getElementById('fee-display');

    if (!recipientInput || !amountInput || !feeDisplay) {
        return;
    }

    const recipientAddress = recipientInput.value.trim();
    let amount = parseFloat(amountInput.value);

    // Hide if address or amount is invalid
    if (
        !recipientAddress ||
        !isValidECashAddress(recipientAddress) ||
        isNaN(amount) ||
        amount <= 0
    ) {
        feeDisplay.style.display = 'none';
        return;
    }

    let errorMessage: string | null = null;

    // Check for dust threshold
    const dustXEC = satsToXec(Number(DEFAULT_DUST_SATS));
    if (amount < dustXEC) {
        errorMessage = `Amount is too small`;
    }

    // Try to estimate fee for the requested amount (include OP_RETURN if present)
    let feeEstimate = estimateTransactionFee(
        ecashWallet,
        recipientAddress,
        amount,
        sendOpReturnRaw,
    );

    // Insufficient balance - calculate for max spendable amount
    if (!feeEstimate) {
        amount = calculateMaxSpendableAmount(ecashWallet);
        feeEstimate = estimateTransactionFee(
            ecashWallet,
            recipientAddress,
            amount,
            sendOpReturnRaw,
        );
        errorMessage = `Insufficient balance`;
    }

    // Build the html fee block heading depending on the error condition
    let feeBlockHeading = 'Transaction Details';
    let feeBlockHeadingClasses = 'title';
    if (errorMessage) {
        feeDisplay.classList.add('error');
        feeBlockHeading = errorMessage;
        feeBlockHeadingClasses += ' error';
    } else {
        feeDisplay.classList.remove('error');
    }

    // Build the HTML with conditional styling
    const html = `<div class="fee-info">
            <div class="fee-item ${feeBlockHeadingClasses}">
                ${feeBlockHeading}
            </div>
            <div class="fee-item">
                <span class="fee-label">Amount:</span>
                <span class="fee-value">${amount.toFixed(2)} ${
                    config.ticker
                }</span>
            </div>
            <div class="fee-item">
                <span class="fee-label">Network Fee:</span>
                <span class="fee-value">${feeEstimate?.feeXEC.toFixed(2)} ${
                    config.ticker
                }</span>
            </div>
            <div class="fee-item total">
                <span class="fee-label">Total:</span>
                <span class="fee-value">${feeEstimate?.totalXEC.toFixed(2)} ${
                    config.ticker
                }</span>
            </div>
        </div>
    `;

    feeDisplay.innerHTML = html;
    feeDisplay.style.display = 'block';
}

// Amount input handling to prevent more than 2 decimals
function handleAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Allow only numbers and one decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
        input.value = parts[0] + '.' + parts.slice(1).join('');
        return;
    }

    // If there's a decimal point, limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
        input.value = parts[0] + '.' + parts[1].substring(0, 2);
        return;
    }

    // Update the input value if it was cleaned
    if (cleanValue !== value) {
        input.value = cleanValue;
    }

    // Update slider to match input value
    updateSliderFromInput();

    // Run validation after input is processed
    validateAmountField();
}

// Handle slider input
function handleSliderInput(event: Event) {
    const slider = event.target as HTMLInputElement;
    const value = parseFloat(slider.value);

    // Update the amount input field immediately for visual feedback
    const sendAmountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    if (sendAmountInput) {
        sendAmountInput.value = value.toFixed(2);
    }

    // Validate immediately without throttling
    validateAmountField();
}

// Update slider from input field
function updateSliderFromInput() {
    const sendAmountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    const amountSlider = document.getElementById(
        'amount-slider',
    ) as HTMLInputElement;

    if (!sendAmountInput || !amountSlider) {
        return;
    }

    const value = parseFloat(sendAmountInput.value);
    const minAmount = 5.46;
    const maxAmount = calculateMaxSpendableAmount(ecashWallet);

    // Clamp value to slider range
    const clampedValue = Math.max(minAmount, Math.min(value, maxAmount));

    // Update slider value
    amountSlider.value = clampedValue.toString();

    // Update slider max if balance changed
    if (maxAmount !== parseFloat(amountSlider.max)) {
        amountSlider.max = maxAmount.toString();
        const sliderMaxLabel = document.getElementById('slider-max-label');
        if (sliderMaxLabel) {
            sliderMaxLabel.textContent = `${maxAmount.toFixed(2)} ${
                config.ticker
            }`;
        }

        // Update slider marks for new range
        updateSliderMarks(minAmount, maxAmount);
    }
}

// Update slider marks based on current range
function updateSliderMarks(minAmount: number, maxAmount: number) {
    const marks = document.querySelectorAll('.mark');
    const range = maxAmount - minAmount;

    marks.forEach((mark, index) => {
        const percentage = (index + 1) * 10; // 10%, 20%, 30%, etc. (skipping 0% and 100%)
        const actualValue = minAmount + (range * percentage) / 100;
        const displayValue = actualValue.toFixed(2);

        // Update the mark's data attribute for reference
        mark.setAttribute('data-value', displayValue);

        // Add a subtle tooltip effect on hover
        (mark as HTMLElement).title = `${displayValue} ${config.ticker}`;
    });
}

// Amount validation functions
function validateAmountField() {
    const sendAmountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    const confirmSendBtn = document.getElementById(
        'confirm-send',
    ) as HTMLButtonElement;

    if (!sendAmountInput || !confirmSendBtn) {
        return;
    }

    const amount = parseFloat(sendAmountInput.value);
    const minAmount = satsToXec(Number(DEFAULT_DUST_SATS));
    const maxAmount = calculateMaxSpendableAmount(ecashWallet);

    // Clear previous validation states
    sendAmountInput.classList.remove('invalid');
    sendAmountInput.classList.remove('valid');

    // Check if amount is valid
    if (isNaN(amount) || amount <= 0) {
        sendAmountInput.classList.add('invalid');
        confirmSendBtn.disabled = true;
        const btnSpan = confirmSendBtn.querySelector('span');
        if (btnSpan) {
            btnSpan.textContent = 'Enter Amount';
        }
        return;
    }

    if (amount < minAmount) {
        sendAmountInput.classList.add('invalid');
        confirmSendBtn.disabled = true;
        const btnSpan = confirmSendBtn.querySelector('span');
        if (btnSpan) {
            btnSpan.textContent = `Min: ${minAmount} ${config.ticker}`;
        }
        return;
    }

    if (amount > maxAmount) {
        sendAmountInput.classList.add('invalid');
        confirmSendBtn.disabled = true;
        const btnSpan = confirmSendBtn.querySelector('span');
        if (btnSpan) {
            btnSpan.textContent = `Max: ${maxAmount.toFixed(2)} ${
                config.ticker
            }`;
        }
        return;
    }

    // Amount is valid
    sendAmountInput.classList.add('valid');
    confirmSendBtn.disabled = false;
    const btnSpan = confirmSendBtn.querySelector('span');
    if (btnSpan) {
        btnSpan.textContent = appSettings.requireHoldToSend
            ? 'Hold to send'
            : 'Send';
    }
}

// Send button setup - either hold-to-send or simple click based on settings
function setupHoldToSend(button: HTMLButtonElement) {
    // If hold-to-send is disabled, use simple click behavior
    if (!appSettings.requireHoldToSend) {
        button.addEventListener('click', async () => {
            await validateAndSend();
        });
        return;
    }

    // Hold-to-send behavior with progressive haptic feedback
    let holdTimer: number | null = null;
    let hapticInterval: number | null = null;
    let startTime = 0;
    const HOLD_DURATION = 1000; // 1 second
    const HAPTIC_INTERVAL = 50; // Haptic every 50ms for smoother continuous feel

    // Progressive haptic feedback based on elapsed time
    const triggerProgressiveHaptic = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / HOLD_DURATION, 1);

        // Use selection haptic for smoother rapid feedback, transitioning to impacts
        let hapticType:
            | 'selection'
            | 'impactLight'
            | 'impactMedium'
            | 'impactHeavy' = 'selection';

        if (progress > 0.8) {
            hapticType = 'impactHeavy';
        } else if (progress > 0.5) {
            hapticType = 'impactMedium';
        } else if (progress > 0.2) {
            hapticType = 'impactLight';
        }

        sendMessageToBackend('HAPTIC_FEEDBACK', hapticType);
    };

    const startHold = (e: Event) => {
        e.preventDefault();

        // Check if button is disabled
        if (button.disabled) {
            return;
        }

        // Validate before starting the hold animation
        const sendAmountInput = document.getElementById(
            'send-amount',
        ) as HTMLInputElement;
        const recipientAddressInput = document.getElementById(
            'recipient-address',
        ) as HTMLInputElement;

        if (!sendAmountInput || !recipientAddressInput) {
            return;
        }

        const amount = parseFloat(sendAmountInput.value);
        const address = recipientAddressInput.value.trim();

        // Validate address
        if (!address || !isValidECashAddress(address)) {
            // Play warning haptic immediately
            sendMessageToBackend('HAPTIC_FEEDBACK', 'notificationWarning');
            recipientAddressInput.focus();
            return;
        }

        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            // Play warning haptic immediately
            sendMessageToBackend('HAPTIC_FEEDBACK', 'notificationWarning');
            return;
        }

        startTime = Date.now();
        button.classList.add('holding');

        // Trigger initial haptic
        triggerProgressiveHaptic();

        // Set up continuous haptic feedback during hold
        hapticInterval = window.setInterval(() => {
            triggerProgressiveHaptic();
        }, HAPTIC_INTERVAL);

        // Set timer for successful hold
        holdTimer = window.setTimeout(async () => {
            // Success haptic
            sendMessageToBackend('HAPTIC_FEEDBACK', 'notificationSuccess');
            await validateAndSend();
            cleanup();
        }, HOLD_DURATION);
    };

    const cancelHold = () => {
        if (holdTimer === null) {
            return;
        }

        cleanup();

        // Give feedback that hold was cancelled
        const holdDuration = Date.now() - startTime;
        if (holdDuration > 300) {
            // User held for a bit but released early - give warning haptic
            sendMessageToBackend('HAPTIC_FEEDBACK', 'notificationWarning');
        }
    };

    const cleanup = () => {
        if (holdTimer !== null) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }

        // Clear haptic interval
        if (hapticInterval !== null) {
            clearInterval(hapticInterval);
            hapticInterval = null;
        }

        button.classList.remove('holding');
    };

    // Mouse events
    button.addEventListener('mousedown', startHold);
    button.addEventListener('mouseup', cancelHold);
    button.addEventListener('mouseleave', cancelHold);

    // Touch events for mobile
    button.addEventListener('touchstart', startHold, { passive: false });
    button.addEventListener('touchend', cancelHold);
    button.addEventListener('touchcancel', cancelHold);
}

async function validateAndSend() {
    const sendAmountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    const recipientAddressInput = document.getElementById(
        'recipient-address',
    ) as HTMLInputElement;

    if (!sendAmountInput || !recipientAddressInput) {
        return;
    }

    const amount = parseFloat(sendAmountInput.value);
    const address = recipientAddressInput.value.trim();

    // Validate address
    if (!address || !isValidECashAddress(address)) {
        recipientAddressInput.focus();
        return;
    }

    // Validate amount
    validateAmountField();
    const confirmSendBtn = document.getElementById(
        'confirm-send',
    ) as HTMLButtonElement;
    if (confirmSendBtn.disabled) {
        return; // Amount validation failed
    }

    // All validations passed, proceed with sending
    try {
        // Convert XEC to satoshis (1 XEC = 100 satoshis)
        const sats = Math.round(amount * 100);
        const action = buildAction(ecashWallet, address, sats, sendOpReturnRaw);
        const builtAction = action.build();

        if (sendOpReturnRaw && isPayButtonTransaction(sendOpReturnRaw)) {
            // For PayButton transactions, we broadcast to the PayButton node first
            // to reduce the latency. Then we attempt to broadcast to the main node
            // as well which may fail because the tx might have been relayed already.
            try {
                const paybuttonChronik = new ChronikClient([
                    'https://xec.paybutton.io',
                ]);
                const txsToBroadcast = builtAction.txs.map(tx => tx.toHex());
                await paybuttonChronik.broadcastTxs(txsToBroadcast);
                webViewLog(
                    `Sent ${amount} ${config.ticker} to ${address} via PayButton`,
                );
            } catch (error) {
                webViewError('PayButton broadcast failed,:', error);
            }
        }

        await builtAction.broadcast();
        webViewLog(`Sent ${amount} ${config.ticker} to ${address}`);
    } catch (error) {
        webViewError('Failed to send transaction:', error);
    } finally {
        // Return to main screen
        showMainScreen();
    }
}

// ============================================================================
// SETTINGS SCREEN FUNCTIONS
// ============================================================================

// Initialize settings UI and event listeners
function initializeSettings() {
    // Setup hold-to-send toggle and apply saved setting
    const holdToSendToggle = document.getElementById(
        'hold-to-send-toggle',
    ) as HTMLInputElement;
    if (holdToSendToggle) {
        // Apply saved setting to toggle UI
        holdToSendToggle.checked = appSettings.requireHoldToSend;

        // Add change listener
        holdToSendToggle.addEventListener('change', () => {
            appSettings.requireHoldToSend = holdToSendToggle.checked;
            webViewLog(
                `Hold to send ${appSettings.requireHoldToSend ? 'enabled' : 'disabled'}`,
            );

            // Save settings to localStorage
            saveSettings(appSettings);
        });
    }

    // Setup primary balance toggle and apply saved setting
    const primaryBalanceToggle = document.getElementById(
        'primary-balance-toggle',
    ) as HTMLInputElement;
    if (primaryBalanceToggle) {
        // Apply saved setting to toggle UI
        // Toggle is checked when primary balance is Fiat
        primaryBalanceToggle.checked =
            appSettings.primaryBalanceType === 'Fiat';

        // Add change listener
        primaryBalanceToggle.addEventListener('change', async () => {
            appSettings.primaryBalanceType = primaryBalanceToggle.checked
                ? 'Fiat'
                : 'XEC';
            webViewLog(
                `Primary balance set to ${appSettings.primaryBalanceType}`,
            );

            // Save settings to localStorage
            saveSettings(appSettings);

            // Refresh balance display with new primary/secondary order
            if (ecashWallet) {
                const currentXec = satsToXec(availableBalanceSats);
                updateAvailableBalanceDisplay(
                    currentXec,
                    currentXec,
                    await priceFetcher?.current(Fiat.USD),
                    false,
                );
            }

            // Recreate transaction history instance with new settings
            transactionHistory = new TransactionHistoryManager(
                ecashWallet,
                chronik,
                appSettings,
                priceFetcher,
            );
        });
    }
}

// Mnemonic management functions
function updateMnemonicDisplay() {
    const mnemonicText = document.getElementById(
        'mnemonic-text',
    ) as HTMLTextAreaElement;
    const walletMnemonic = getMnemonic(wallet);
    if (mnemonicText && walletMnemonic) {
        // mnemonicText.value = wallet.mnemonic;
        mnemonicText.value = walletMnemonic;
    }
}

function showMnemonicEditModal() {
    const modal = document.getElementById('mnemonic-edit-modal');
    if (modal) {
        const editText = document.getElementById(
            'mnemonic-edit-text',
        ) as HTMLTextAreaElement;
        const validation = document.getElementById('mnemonic-validation');

        if (editText) {
            const walletMnemonic = getMnemonic(wallet);
            editText.value = walletMnemonic ? walletMnemonic : '';
        }

        if (validation) {
            validation.style.display = 'none';
        }

        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }
}

function hideMnemonicEditModal() {
    const modal = document.getElementById('mnemonic-edit-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function showValidationMessage(message: string, isError: boolean = true) {
    const validation = document.getElementById('mnemonic-validation');
    if (validation) {
        validation.textContent = message;
        validation.className = `validation-message ${
            isError ? 'error' : 'success'
        }`;
        validation.style.display = 'block';
    }
}

function hideValidationMessage() {
    const validation = document.getElementById('mnemonic-validation');
    if (validation) {
        validation.style.display = 'none';
    }
}

async function saveMnemonic(newMnemonic: string) {
    try {
        // Validate the mnemonic
        if (!validateMnemonic(newMnemonic)) {
            showValidationMessage(
                'Invalid mnemonic. Please enter a valid 12-word recovery phrase.',
            );
            return false;
        }

        // Store the new mnemonic
        await storeMnemonic(newMnemonic.trim());

        // Update the wallet with the new mnemonic
        if (wallet) {
            wallet.mnemonic = newMnemonic.trim();
        }

        // Reload the wallet with the new mnemonic
        webViewLog('Reloading wallet with new mnemonic...');
        await loadWalletFromMnemonic(wallet.mnemonic);

        // Ensure main screen is visible and wallet is displayed
        showMainScreen();

        // Update the display
        updateMnemonicDisplay();

        // Show success message
        showValidationMessage(
            'Mnemonic updated successfully! Wallet reloaded.',
            false,
        );

        // Disable the save button
        const saveMnemonicEditBtn = document.getElementById(
            'save-mnemonic-edit',
        ) as HTMLButtonElement;
        if (saveMnemonicEditBtn) {
            saveMnemonicEditBtn.disabled = true;
        }

        // Hide modal after a short delay
        setTimeout(() => {
            hideMnemonicEditModal();
            hideValidationMessage();
            // Re-enable the save button
            if (saveMnemonicEditBtn) {
                saveMnemonicEditBtn.disabled = false;
            }
        }, 2000);

        return true;
    } catch (error) {
        webViewError('Error saving mnemonic:', error);
        showValidationMessage('Failed to save mnemonic. Please try again.');
        return false;
    }
}

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

    // Create wallet data object - balance in satoshis
    wallet = {
        mnemonic: mnemonic,
    };

    const pricePerXec = await priceFetcher?.current(Fiat.USD);

    // Update displays
    updateWalletDisplay(pricePerXec);
    updateTransitionalBalance(pricePerXec);
    generateQRCode(address);

    subscribeToAddress(address);

    transactionHistory = new TransactionHistoryManager(
        ecashWallet,
        chronik,
        appSettings,
        priceFetcher,
    );

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

// Helper function to check if main screen is visible
function isMainScreenVisible(): boolean {
    const sendScreen = document.getElementById('send-screen');
    const settingsScreen = document.getElementById('settings-screen');

    // Main screen is visible if both send and settings screens are hidden
    return (
        (!sendScreen || sendScreen.classList.contains('hidden')) &&
        (!settingsScreen || settingsScreen.classList.contains('hidden'))
    );
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
            return isMainScreenVisible();
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
    // First, try to parse as BIP21 URI
    const bip21Result = parseBip21Uri(result);

    if (bip21Result) {
        webViewLog('BIP21 URI scanned:', result);
        stopQRScanner();
        await openSendScreenWithAddress(
            bip21Result.address,
            bip21Result.sats,
            bip21Result.opReturnRaw,
        );
        return;
    }

    // Fallback: validate if the scanned data is a plain valid eCash address
    if (isValidECashAddress(result)) {
        webViewLog('eCash address scanned:', result);
        stopQRScanner();
        await openSendScreenWithAddress(result);
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
            await openSendScreenForManualEntry();
        });
    }

    // Add click listeners for Send screen
    const backBtn = document.getElementById('back-btn');
    const cancelSendBtn = document.getElementById('cancel-send');
    const confirmSendBtn = document.getElementById(
        'confirm-send',
    ) as HTMLButtonElement;

    if (backBtn) {
        backBtn.addEventListener('click', showMainScreen);
    }

    if (cancelSendBtn) {
        cancelSendBtn.addEventListener('click', showMainScreen);
    }

    if (confirmSendBtn) {
        setupHoldToSend(confirmSendBtn);
    }

    // Add click listeners for History screen
    const historyBackBtn = document.getElementById('history-back-btn');
    if (historyBackBtn) {
        historyBackBtn.addEventListener('click', showMainScreen);
    }

    // Add click listeners for Settings screen
    const settingsBackBtn = document.getElementById('settings-back-btn');
    const editMnemonicBtn = document.getElementById('edit-mnemonic-btn');
    const cancelMnemonicEditBtn = document.getElementById(
        'cancel-mnemonic-edit',
    );
    const saveMnemonicEditBtn = document.getElementById('save-mnemonic-edit');
    const closeMnemonicModalBtn = document.getElementById(
        'close-mnemonic-modal',
    );

    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', showMainScreen);
    }

    // Initialize settings UI
    initializeSettings();

    if (editMnemonicBtn) {
        editMnemonicBtn.addEventListener('click', showMnemonicEditModal);
    }

    if (cancelMnemonicEditBtn) {
        cancelMnemonicEditBtn.addEventListener('click', () => {
            hideMnemonicEditModal();
            hideValidationMessage();
        });
    }

    if (closeMnemonicModalBtn) {
        closeMnemonicModalBtn.addEventListener('click', () => {
            hideMnemonicEditModal();
            hideValidationMessage();
        });
    }

    if (saveMnemonicEditBtn) {
        saveMnemonicEditBtn.addEventListener('click', async () => {
            const editText = document.getElementById(
                'mnemonic-edit-text',
            ) as HTMLTextAreaElement;
            if (editText) {
                await saveMnemonic(editText.value);
            }
        });
    }

    // Add validation to amount input
    const sendAmountInput = document.getElementById(
        'send-amount',
    ) as HTMLInputElement;
    if (sendAmountInput) {
        sendAmountInput.addEventListener('input', event => {
            handleAmountInput(event);
            updateFeeDisplay();
        });
        sendAmountInput.addEventListener('blur', validateAmountField);
    }

    // Add slider functionality
    const amountSlider = document.getElementById(
        'amount-slider',
    ) as HTMLInputElement;
    if (amountSlider) {
        amountSlider.addEventListener('input', event => {
            handleSliderInput(event);
            updateFeeDisplay();
        });
    }

    // Add recipient address input listener for fee updates and validation
    const recipientAddressInput = document.getElementById(
        'recipient-address',
    ) as HTMLInputElement;
    if (recipientAddressInput) {
        recipientAddressInput.addEventListener('input', () => {
            validateAddressField();
            updateFeeDisplay();
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
            if (parsed) {
                // Open send screen with prefilled address and amount
                openSendScreenWithAddress(
                    parsed.address,
                    parsed.sats,
                    parsed.opReturnRaw,
                );
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
